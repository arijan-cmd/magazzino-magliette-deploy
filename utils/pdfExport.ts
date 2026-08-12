import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Product, Sale } from '../types';

export interface InventoryExportOptions {
  onlyInStock: boolean;
  includePrices: boolean;
  includeVariants: boolean;
}

export interface SalesExportOptions {
  from: string | null; // ISO date (yyyy-mm-dd)
  to: string | null;
  paymentMethod: 'all' | 'contanti' | 'carta';
}

function drawHeader(doc: jsPDF, title: string, subtitle: string) {
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 14, 15);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text(subtitle, 14, 22);
  doc.setTextColor(0, 0, 0);
}

function drawFooter(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Pagina ${i} di ${pageCount} — Generato il ${new Date().toLocaleString('it-IT')}`,
      14,
      doc.internal.pageSize.getHeight() - 8
    );
  }
}

export async function exportInventoryToPDF(products: Product[], options: InventoryExportOptions): Promise<void> {
  const filtered = options.onlyInStock ? products.filter((p) => p.quantity > 0) : products;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  drawHeader(doc, 'Report Inventario', `Magazzino Magliette · ${filtered.length} prodotti`);

  const head = [
    ['Prodotto', 'SKU', 'Categoria', ...(options.includePrices ? ['Prezzo'] : []), 'Quantità', ...(options.includeVariants ? ['Varianti'] : [])],
  ];
  const body = filtered.map((p) => {
    const row = [p.name, p.sku, p.category];
    if (options.includePrices) row.push(`€${p.salePrice.toFixed(2)}`);
    row.push(String(p.quantity));
    if (options.includeVariants) {
      const variantText = Object.entries(p.variants)
        .filter(([, qty]) => qty > 0)
        .map(([key, qty]) => `${key.replace('-', '/')}: ${qty}`)
        .join(', ');
      row.push(variantText || '-');
    }
    return row;
  });

  autoTable(doc, {
    startY: 34,
    head,
    body,
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    didDrawPage: () => drawFooter(doc),
  });

  const totalValue = filtered.reduce((sum, p) => sum + p.quantity * p.purchasePrice, 0);
  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY || 40;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Valore totale magazzino: €${totalValue.toFixed(2)}`, 14, finalY + 10);

  doc.save(`report-inventario-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export async function exportSalesToPDF(sales: Sale[], options: SalesExportOptions): Promise<void> {
  const filtered = sales.filter((s) => {
    const date = s.createdAt.slice(0, 10);
    if (options.from && date < options.from) return false;
    if (options.to && date > options.to) return false;
    if (options.paymentMethod !== 'all' && s.paymentMethod !== options.paymentMethod) return false;
    return true;
  });

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const rangeLabel = options.from || options.to ? `${options.from || '...'} → ${options.to || '...'}` : 'tutte le date';
  drawHeader(doc, 'Report Vendite', `Magazzino Magliette · ${filtered.length} vendite · ${rangeLabel}`);

  const head = [['Data', 'Prodotto', 'Variante', 'Q.tà', 'Prezzo unit.', 'Pagamento', 'Totale']];
  const body = filtered.map((s) => [
    new Date(s.createdAt).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
    s.productName,
    s.variantKey ? s.variantKey.replace('-', '/') : '-',
    String(s.quantity),
    `€${s.unitPrice.toFixed(2)}`,
    s.paymentMethod === 'contanti' ? 'Contanti' : 'Carta',
    `€${s.totalPrice.toFixed(2)}`,
  ]);

  autoTable(doc, {
    startY: 34,
    head,
    body,
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    didDrawPage: () => drawFooter(doc),
  });

  const totalRevenue = filtered.reduce((sum, s) => sum + s.totalPrice, 0);
  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY || 40;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Incasso totale: €${totalRevenue.toFixed(2)}`, 14, finalY + 10);

  doc.save(`report-vendite-${new Date().toISOString().slice(0, 10)}.pdf`);
}
