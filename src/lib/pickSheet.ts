import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { Order } from '@/types/inventory';

export function downloadPickSheet(order: Order) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('PICK SHEET', 14, 20);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Order #: ${order.id.slice(0, 8).toUpperCase()}`, pageWidth - 14, 18, { align: 'right' });
  doc.text(`Date: ${format(order.date, 'MMM d, yyyy h:mm a')}`, pageWidth - 14, 24, { align: 'right' });
  doc.text(`Status: ${order.status.toUpperCase()}`, pageWidth - 14, 30, { align: 'right' });

  // Shop
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Shop / Customer:', 14, 32);
  doc.setFontSize(14);
  doc.text(order.shopName, 14, 40);

  // Group items by warehouse
  const byWarehouse = new Map<string, typeof order.items>();
  for (const it of order.items) {
    const key = it.warehouseName || 'Unassigned';
    if (!byWarehouse.has(key)) byWarehouse.set(key, [] as any);
    byWarehouse.get(key)!.push(it);
  }

  let cursorY = 48;
  const totalUnits = order.items.reduce((s, i) => s + i.quantity, 0);

  for (const [warehouseName, list] of byWarehouse) {
    // Warehouse banner
    doc.setFillColor(30, 30, 30);
    doc.rect(14, cursorY, pageWidth - 28, 9, 'F');
    doc.setTextColor(255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`Warehouse: ${warehouseName}`, 18, cursorY + 6.2);
    const whUnits = list.reduce((s, i) => s + i.quantity, 0);
    doc.text(`${list.length} item${list.length !== 1 ? 's' : ''} · ${whUnits} units`, pageWidth - 18, cursorY + 6.2, { align: 'right' });
    doc.setTextColor(0);

    cursorY += 11;

    const rows = list.map((it) => [
      '',                 // pick checkbox
      it.itemSku,
      it.itemName,
      String(it.quantity),
    ]);

    autoTable(doc, {
      startY: cursorY,
      head: [['✓', 'SKU', 'Product', 'Qty']],
      body: rows,
      theme: 'grid',
      headStyles: { fillColor: [240, 240, 240], textColor: 30, fontStyle: 'bold', fontSize: 10 },
      styles: { fontSize: 11, cellPadding: 4, valign: 'middle' },
      columnStyles: {
        0: { halign: 'center', cellWidth: 12 },
        1: { cellWidth: 32, fontStyle: 'bold' },
        2: { cellWidth: 'auto' },
        3: { halign: 'right', cellWidth: 20, fontStyle: 'bold' },
      },
      didDrawCell: (data) => {
        // Draw checkbox square in first column body cells
        if (data.section === 'body' && data.column.index === 0) {
          const size = 5;
          const x = data.cell.x + (data.cell.width - size) / 2;
          const y = data.cell.y + (data.cell.height - size) / 2;
          doc.setDrawColor(80);
          doc.setLineWidth(0.4);
          doc.rect(x, y, size, size);
        }
      },
    });

    cursorY = (doc as any).lastAutoTable.finalY + 8;

    // Page break if low
    if (cursorY > doc.internal.pageSize.getHeight() - 30) {
      doc.addPage();
      cursorY = 20;
    }
  }

  // Footer summary
  if (cursorY > doc.internal.pageSize.getHeight() - 40) {
    doc.addPage();
    cursorY = 20;
  }

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`Total Units to Pick: ${totalUnits}`, 14, cursorY + 4);
  doc.text(`Total Lines: ${order.items.length}`, 14, cursorY + 11);

  // Signature area
  const sigY = cursorY + 25;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Picked by: ____________________________', 14, sigY);
  doc.text('Date: ______________', 14, sigY + 8);
  doc.text('Checked by: ___________________________', pageWidth / 2 + 5, sigY);
  doc.text('Date: ______________', pageWidth / 2 + 5, sigY + 8);

  doc.save(`pick-sheet-${order.shopName.replace(/[^a-z0-9]/gi, '_')}-${order.id.slice(0, 8)}.pdf`);
}
