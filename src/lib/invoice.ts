import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { Order } from '@/types/inventory';

export function downloadInvoice(order: Order) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE', 14, 20);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Invoice #: ${order.id.slice(0, 8).toUpperCase()}`, pageWidth - 14, 20, { align: 'right' });
  doc.text(`Date: ${format(order.date, 'MMM d, yyyy h:mm a')}`, pageWidth - 14, 26, { align: 'right' });
  doc.text(`Status: ${order.status.toUpperCase()}`, pageWidth - 14, 32, { align: 'right' });

  // Bill to
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Bill To:', 14, 42);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.text(order.shopName, 14, 49);

  // Items table
  const rows = order.items.map((it) => [
    it.itemSku,
    it.itemName,
    it.warehouseName,
    String(it.quantity),
    `$${it.unitPrice.toFixed(2)}`,
    `$${(it.unitPrice * it.quantity).toFixed(2)}`,
  ]);

  const total = order.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const totalUnits = order.items.reduce((s, i) => s + i.quantity, 0);

  autoTable(doc, {
    startY: 58,
    head: [['SKU', 'Product', 'Warehouse', 'Qty', 'Unit Price', 'Line Total']],
    body: rows,
    theme: 'striped',
    headStyles: { fillColor: [38, 138, 130], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' },
    },
  });

  const finalY = (doc as any).lastAutoTable.finalY || 70;

  doc.setFontSize(10);
  doc.text(`Total Units: ${totalUnits}`, 14, finalY + 10);

  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(`Total: $${total.toFixed(2)}`, pageWidth - 14, finalY + 10, { align: 'right' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120);
  doc.text('Thank you for your business.', 14, finalY + 25);

  doc.save(`invoice-${order.shopName.replace(/[^a-z0-9]/gi, '_')}-${order.id.slice(0, 8)}.pdf`);
}
