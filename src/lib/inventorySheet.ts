import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { InventoryItem } from '@/types/inventory';
import logoUrl from '@/assets/mrfog-logo.png';

let logoDataUrl: string | null = null;
async function getLogoDataUrl(): Promise<string | null> {
  if (logoDataUrl) return logoDataUrl;
  try {
    const res = await fetch(logoUrl);
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        logoDataUrl = reader.result as string;
        resolve(logoDataUrl);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function downloadInventorySheet(
  allItems: InventoryItem[],
  warehouseFilter?: { id: string; name: string } | null,
  empty = false,
) {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 36;

  // Quantity per item — either for a specific warehouse, or summed across all
  const totalQty = (item: InventoryItem) => {
    if (empty) return '';
    const stock = item.stock ?? [];
    if (warehouseFilter) {
      return stock
        .filter((w) => w.warehouseId === warehouseFilter.id)
        .reduce((s, w) => s + (w.quantity || 0), 0);
    }
    return stock.reduce((s, w) => s + (w.quantity || 0), 0);
  };

  // Group by sub-category (fall back to category, then Uncategorized).
  // Include ALL items, even with 0 stock. Exclude furniture.
  const bySubCategory = new Map<string, InventoryItem[]>();
  for (const it of allItems) {
    const sub = (it.subCategory?.trim() || it.category?.trim() || 'Uncategorized');
    if (sub.toLowerCase() === 'furniture') continue;
    if (!bySubCategory.has(sub)) bySubCategory.set(sub, []);
    bySubCategory.get(sub)!.push(it);
  }
  for (const list of bySubCategory.values()) {
    list.sort((a, b) => a.sku.localeCompare(b.sku, undefined, { numeric: true }));
  }

  // ---- Header with logo ----
  const logo = await getLogoDataUrl();
  if (logo) {
    try {
      doc.addImage(logo, 'PNG', pageWidth / 2 - 45, 18, 90, 32, undefined, 'FAST');
    } catch {
      // ignore
    }
  }

  let y = 70;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  const title = warehouseFilter ? `Inventory Sheet — ${warehouseFilter.name}` : 'Inventory Sheet';
  doc.text(title, margin, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Date: ${format(new Date(), 'MMM d, yyyy')}`, pageWidth - margin, y, { align: 'right' });

  y += 18;

  // Same forced page groups as the order sheet for consistency
  const forcedGroups: string[][] = [
    ['Aura Original', 'Aura Splash'],
    ['Switch 5500', 'Switch 15000'],
    ['Switch Pod Kit', 'Switch Pod Pod'],
    ['Nova Original', 'Nova Blue Razz Steezy'],
    ['Nova New'],
  ];

  // Groups pinned to the very end (after all other categories)
  const tailGroups: string[][] = [
    ['MAX-1000'],
    ['MAX PRO-2000'],
    ['MAX AIR-3000'],
    ['NICOTINE POUCHES'],
    ['POUCHES-DRY(4mg)', 'POUCHES-DRY(8mg)'],
    ['POUCHES-MOIST(8mg)', 'POUCHES-MOIST(12mg)'],
  ];

  const norm = (s: string) => s.trim().toLowerCase();
  const allSubs = Array.from(bySubCategory.keys());
  const usedSubs = new Set<string>();

  const resolveGroups = (groups: string[][]): string[][] => {
    const out: string[][] = [];
    for (const grp of groups) {
      const resolved: string[] = [];
      for (const wanted of grp) {
        const match = allSubs.find((s) => norm(s) === norm(wanted));
        if (match && !usedSubs.has(match)) {
          resolved.push(match);
          usedSubs.add(match);
        }
      }
      if (resolved.length) out.push(resolved);
    }
    return out;
  };

  const orderedGroups: string[][] = [];
  // 1. Forced leading groups
  orderedGroups.push(...resolveGroups(forcedGroups));
  // 2. Reserve tail sub-categories so they are skipped from leftovers
  const tailReserved = new Set<string>();
  for (const grp of tailGroups) {
    for (const wanted of grp) {
      const match = allSubs.find((s) => norm(s) === norm(wanted));
      if (match) tailReserved.add(match);
    }
  }
  // 3. Alphabetical leftovers (excluding tail-reserved)
  const leftovers = allSubs.filter((s) => !usedSubs.has(s) && !tailReserved.has(s)).sort();
  for (const s of leftovers) orderedGroups.push([s]);
  // 4. Tail groups render last
  orderedGroups.push(...resolveGroups(tailGroups));


  const estimateSectionHeight = (itemCount: number) => {
    const rowCount = Math.ceil(itemCount / 2);
    const headerHeight = 18;
    const rowHeight = 14;
    const tablePadding = 8;
    return headerHeight + rowCount * rowHeight + tablePadding;
  };

  for (const group of orderedGroups) {
    const estimatedGroupHeight = group.reduce((total, sub) => {
      const list = bySubCategory.get(sub) ?? [];
      return total + estimateSectionHeight(list.length);
    }, 0) + Math.max(0, group.length - 1) * 6;

    if (y + estimatedGroupHeight > pageHeight - 60 && y > margin + 10) {
      doc.addPage();
      y = margin;
    }

    for (const sub of group) {
      const list = bySubCategory.get(sub)!;

      const rows: (string | number)[][] = [];
      const half = Math.ceil(list.length / 2);
      for (let i = 0; i < half; i++) {
        const left = list[i];
        const right = list[i + half];
        rows.push([
          left?.sku ?? '',
          left?.name ?? '',
          left ? String(totalQty(left)) : '',
          right?.sku ?? '',
          right?.name ?? '',
          right ? String(totalQty(right)) : '',
        ]);
      }

      autoTable(doc, {
        startY: y,
        pageBreak: 'avoid',
        head: [[{ content: String(sub).toUpperCase(), colSpan: 6, styles: { halign: 'center', fillColor: [225, 225, 225], textColor: 20, fontStyle: 'bold', fontSize: 10 } }]],
        body: rows,
        theme: 'grid',
        rowPageBreak: 'avoid',
        styles: {
          fontSize: 8.5,
          cellPadding: 1.6,
          valign: 'middle',
          lineColor: [60, 60, 60],
          lineWidth: 0.4,
          textColor: 20,
        },
        columnStyles: (() => {
          const tableWidth = pageWidth - margin * 2;
          const skuW = 55;
          const qtyW = 38;
          const nameW = (tableWidth - (skuW + qtyW) * 2) / 2;
          return {
            0: { cellWidth: skuW, fontStyle: 'bold' },
            1: { cellWidth: nameW },
            2: { cellWidth: qtyW, halign: 'center', fontStyle: 'bold' },
            3: { cellWidth: skuW, fontStyle: 'bold' },
            4: { cellWidth: nameW },
            5: { cellWidth: qtyW, halign: 'center', fontStyle: 'bold' },
          };
        })(),
        didParseCell: (data) => {
          if (data.section === 'body' && (data.column.index === 2 || data.column.index === 5)) {
            const v = data.cell.raw;
            const n = v === '' || v == null ? null : Number(v);
            if (n != null && n === 0) {
              data.cell.styles.fillColor = [245, 245, 245];
              data.cell.styles.textColor = [120, 120, 120];
            } else if (n != null && n > 0) {
              data.cell.styles.fillColor = [255, 245, 200];
            }
          }
        },
        margin: { left: margin, right: margin },
        tableWidth: pageWidth - margin * 2,
      });

      y = (doc as any).lastAutoTable.finalY + 6;
    }
  }

  // Footer summary (exclude furniture)
  const nonFurnitureItems = allItems.filter(
    (it) => (it.subCategory?.trim() || it.category?.trim() || 'Uncategorized').toLowerCase() !== 'furniture'
  );
  const totalUnits = nonFurnitureItems.reduce((s, it) => s + totalQty(it), 0);
  const totalLines = nonFurnitureItems.length;

  if (y > pageHeight - 60) {
    doc.addPage();
    y = margin;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`Total Cases: ${totalUnits}`, margin, y + 14);
  doc.text(`Total Products: ${totalLines}`, margin + 180, y + 14);

  const suffix = warehouseFilter ? `-${warehouseFilter.name.replace(/\s+/g, '_')}` : '';
  doc.save(`inventory${suffix}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}
