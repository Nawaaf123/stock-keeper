import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { Order, InventoryItem } from '@/types/inventory';
import logoUrl from '@/assets/mrfog-logo.png';

// Cache the logo as a data URL after first load
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

export async function downloadPickSheet(order: Order, allItems: InventoryItem[] = []) {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 36;

  // Build qty map from order
  const qtyMap = new Map<string, number>();
  for (const it of order.items) {
    qtyMap.set(it.itemId, (qtyMap.get(it.itemId) ?? 0) + it.quantity);
  }

  // Decide which items to print:
  // If we have a full inventory list, print every item grouped by category (reference style).
  // Otherwise fall back to just the order items.
  const sourceItems: InventoryItem[] = allItems.length
    ? allItems
    : order.items.map((oi) => ({
        id: oi.itemId,
        name: oi.itemName,
        sku: oi.itemSku,
        category: 'Order Items',
        subCategory: '',
        stock: [],
        minStock: 0,
        price: oi.unitPrice,
        lastUpdated: new Date(),
      }));

  // Group by category
  const byCategory = new Map<string, InventoryItem[]>();
  for (const it of sourceItems) {
    const cat = it.category?.trim() || 'Uncategorized';
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat)!.push(it);
  }
  // Sort items in each category by SKU for predictable layout
  for (const list of byCategory.values()) {
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

  // Company / Date / Order info row
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Company Name:', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.text(order.shopName, margin + 95, y);

  doc.setFont('helvetica', 'bold');
  doc.text('Date:', pageWidth / 2 + 30, y);
  doc.setFont('helvetica', 'normal');
  doc.text(format(order.date, 'MMM d, yyyy'), pageWidth / 2 + 65, y);

  y += 16;

  // Shipping / Delivery / Pickup checkboxes (decorative — print and tick)
  const drawCircle = (cx: number, cy: number) => {
    doc.setLineWidth(0.6);
    doc.circle(cx, cy, 3.5);
  };
  const labelY = y;
  let lx = margin;
  doc.setFont('helvetica', 'bold');
  drawCircle(lx + 4, labelY - 3);
  doc.text('Shipping', lx + 12, labelY);
  lx += 90;
  drawCircle(lx + 4, labelY - 3);
  doc.text('Delivery', lx + 12, labelY);
  lx += 90;
  drawCircle(lx + 4, labelY - 3);
  doc.text('Pickup', lx + 12, labelY);

  // Order number on the right
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Order #: ${order.id.slice(0, 8).toUpperCase()}`, pageWidth - margin, labelY, { align: 'right' });

  y += 14;

  // ---- Category sections ----
  const categories = Array.from(byCategory.keys()).sort();

  for (const cat of categories) {
    const list = byCategory.get(cat)!;

    // Build 2-column rows: [sku1, name1, qty1, sku2, name2, qty2]
    const rows: (string | number)[][] = [];
    const half = Math.ceil(list.length / 2);
    for (let i = 0; i < half; i++) {
      const left = list[i];
      const right = list[i + half];
      rows.push([
        left?.sku ?? '',
        left?.name ?? '',
        left ? (qtyMap.get(left.id) ? String(qtyMap.get(left.id)) : '') : '',
        right?.sku ?? '',
        right?.name ?? '',
        right ? (qtyMap.get(right.id) ? String(qtyMap.get(right.id)) : '') : '',
      ]);
    }

    autoTable(doc, {
      startY: y,
      head: [[{ content: cat.toUpperCase(), colSpan: 6, styles: { halign: 'center', fillColor: [225, 225, 225], textColor: 20, fontStyle: 'bold', fontSize: 11 } }]],
      body: rows,
      theme: 'grid',
      styles: {
        fontSize: 10,
        cellPadding: 4,
        valign: 'middle',
        lineColor: [60, 60, 60],
        lineWidth: 0.4,
        textColor: 20,
      },
      columnStyles: {
        0: { cellWidth: 50, fontStyle: 'bold' },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 40, halign: 'center', fontStyle: 'bold' },
        3: { cellWidth: 50, fontStyle: 'bold' },
        4: { cellWidth: 'auto' },
        5: { cellWidth: 40, halign: 'center', fontStyle: 'bold' },
      },
      // Highlight qty cells that are pre-filled with the ordered quantity
      didParseCell: (data) => {
        if (data.section === 'body' && (data.column.index === 2 || data.column.index === 5)) {
          const v = data.cell.raw;
          if (v && String(v).length > 0) {
            data.cell.styles.fillColor = [255, 245, 200];
          }
        }
      },
      margin: { left: margin, right: margin },
      tableWidth: pageWidth - margin * 2,
    });

    y = (doc as any).lastAutoTable.finalY + 8;

    if (y > doc.internal.pageSize.getHeight() - 80) {
      doc.addPage();
      y = margin;
    }
  }

  // ---- Footer summary + signatures ----
  const totalUnits = order.items.reduce((s, i) => s + i.quantity, 0);

  if (y > doc.internal.pageSize.getHeight() - 90) {
    doc.addPage();
    y = margin;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`Total Units: ${totalUnits}`, margin, y + 10);
  doc.text(`Total Lines: ${order.items.length}`, margin + 160, y + 10);

  const sigY = y + 40;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Picked by: ____________________________', margin, sigY);
  doc.text('Date: ______________', margin, sigY + 14);
  doc.text('Checked by: ___________________________', pageWidth / 2 + 10, sigY);
  doc.text('Date: ______________', pageWidth / 2 + 10, sigY + 14);

  doc.save(`order-sheet-${order.shopName.replace(/[^a-z0-9]/gi, '_')}-${order.id.slice(0, 8)}.pdf`);
}
