import jsPDF from 'jspdf';
import autoTable, { CellHookData } from 'jspdf-autotable';
import { Product, Sale } from '../types';
import { DEFAULT_SIZES } from '../constants';

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

interface LoadedImage {
  dataUrl: string;
  width: number;
  height: number;
  format: 'JPEG' | 'PNG' | 'WEBP';
}

const IMAGE_COL_WIDTH = 16;
const IMAGE_MAX_SIZE = 12;

function getImageFormat(dataUrl: string): LoadedImage['format'] {
  if (dataUrl.startsWith('data:image/png')) return 'PNG';
  if (dataUrl.startsWith('data:image/webp')) return 'WEBP';
  return 'JPEG';
}

async function loadImageAsDataUrl(url: string): Promise<LoadedImage | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
      const img = new window.Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = reject;
      img.src = dataUrl;
    });
    return { dataUrl, ...dimensions, format: getImageFormat(dataUrl) };
  } catch {
    return null;
  }
}

function drawImageCell(doc: jsPDF, data: CellHookData, image: LoadedImage | null | undefined) {
  const { x, y, width, height } = data.cell;
  if (image) {
    const ratio = Math.min(IMAGE_MAX_SIZE / image.width, IMAGE_MAX_SIZE / image.height);
    const w = image.width * ratio;
    const h = image.height * ratio;
    doc.addImage(image.dataUrl, image.format, x + (width - w) / 2, y + (height - h) / 2, w, h);
  } else {
    doc.setFillColor(241, 245, 249);
    const size = IMAGE_MAX_SIZE * 0.8;
    doc.roundedRect(x + (width - size) / 2, y + (height - size) / 2, size, size, 1, 1, 'F');
  }
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

  const images = await Promise.all(
    filtered.map((p) => (p.images[0] ? loadImageAsDataUrl(p.images[0]) : Promise.resolve(null)))
  );

  const head = [
    ['', 'Prodotto', 'SKU', 'Categoria', ...(options.includePrices ? ['Prezzo'] : []), 'Quantità', ...(options.includeVariants ? ['Varianti'] : [])],
  ];
  const body = filtered.map((p) => {
    const row = ['', p.name, p.sku, p.category];
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
    styles: { fontSize: 8, cellPadding: 3, minCellHeight: IMAGE_MAX_SIZE + 4, valign: 'middle' },
    columnStyles: { 0: { cellWidth: IMAGE_COL_WIDTH } },
    headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    didDrawCell: (data) => {
      if (data.section === 'body' && data.column.index === 0) {
        drawImageCell(doc, data, images[data.row.index]);
      }
    },
    didDrawPage: () => drawFooter(doc),
  });

  const totalValue = filtered.reduce((sum, p) => sum + p.quantity * p.purchasePrice, 0);
  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY || 40;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Valore totale magazzino: €${totalValue.toFixed(2)}`, 14, finalY + 10);

  doc.save(`report-inventario-${new Date().toISOString().slice(0, 10)}.pdf`);
}

interface VariantSubRow {
  colore: string;
  taglia: string;
  quantity: number;
  totalPrice: number;
}

interface SkuGroup {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  totalPrice: number;
  variants: VariantSubRow[];
}

function splitVariantKey(variantKey: string | null): [string, string] {
  if (!variantKey) return ['-', '-'];
  const idx = variantKey.indexOf('-');
  if (idx === -1) return [variantKey, '-'];
  return [variantKey.slice(0, idx) || '-', variantKey.slice(idx + 1) || '-'];
}

function sizeSortIndex(taglia: string): number {
  const idx = DEFAULT_SIZES.indexOf(taglia);
  return idx === -1 ? DEFAULT_SIZES.length : idx;
}

export async function exportSalesToPDF(sales: Sale[], products: Product[], options: SalesExportOptions): Promise<void> {
  const filtered = sales.filter((s) => {
    const date = s.createdAt.slice(0, 10);
    if (options.from && date < options.from) return false;
    if (options.to && date > options.to) return false;
    if (options.paymentMethod !== 'all' && s.paymentMethod !== options.paymentMethod) return false;
    return true;
  });

  const productSkuMap = new Map(products.map((p) => [p.id, p.sku]));
  const productImageUrl = new Map(products.map((p) => [p.id, p.images[0] || null]));

  const bySku = new Map<string, SkuGroup>();
  filtered.forEach((s) => {
    let group = bySku.get(s.productId);
    if (!group) {
      group = {
        productId: s.productId,
        productName: s.productName,
        sku: productSkuMap.get(s.productId) || '-',
        quantity: 0,
        totalPrice: 0,
        variants: [],
      };
      bySku.set(s.productId, group);
    }
    group.quantity += s.quantity;
    group.totalPrice += s.totalPrice;

    const [colore, taglia] = splitVariantKey(s.variantKey);
    let variant = group.variants.find((v) => v.colore === colore && v.taglia === taglia);
    if (!variant) {
      variant = { colore, taglia, quantity: 0, totalPrice: 0 };
      group.variants.push(variant);
    }
    variant.quantity += s.quantity;
    variant.totalPrice += s.totalPrice;
  });

  const groups = Array.from(bySku.values()).sort((a, b) => b.quantity - a.quantity);
  groups.forEach((g) => {
    g.variants.sort((a, b) => {
      if (a.colore !== b.colore) return a.colore.localeCompare(b.colore);
      return sizeSortIndex(a.taglia) - sizeSortIndex(b.taglia) || a.taglia.localeCompare(b.taglia);
    });
  });

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const rangeLabel = options.from || options.to ? `${options.from || '...'} → ${options.to || '...'}` : 'tutte le date';
  const paymentLabel = options.paymentMethod === 'all' ? '' : ` · ${options.paymentMethod === 'contanti' ? 'Contanti' : 'Carta'}`;
  drawHeader(
    doc,
    'Report Vendite',
    `Magazzino Magliette · ${groups.length} SKU · ${filtered.length} vendite · ${rangeLabel}${paymentLabel}`
  );

  const images = await Promise.all(
    groups.map((g) => {
      const url = productImageUrl.get(g.productId);
      return url ? loadImageAsDataUrl(url) : Promise.resolve(null);
    })
  );

  const head = [['', 'Prodotto (SKU)', 'Colore', 'Taglia', 'Q.tà', 'Incasso']];
  const body: (string | { content: string; colSpan: number; styles?: Record<string, unknown> })[][] = [];
  const totalRowIndexes = new Set<number>();
  const imageByRow = new Map<number, LoadedImage | null>();

  groups.forEach((g, gi) => {
    const rowIndex = body.length;
    totalRowIndexes.add(rowIndex);
    imageByRow.set(rowIndex, images[gi]);
    body.push([
      '',
      { content: `${g.productName} (${g.sku}) — Totale`, colSpan: 3 },
      String(g.quantity),
      `€${g.totalPrice.toFixed(2)}`,
    ]);
    g.variants.forEach((v) => {
      body.push(['', '', v.colore, v.taglia, String(v.quantity), `€${v.totalPrice.toFixed(2)}`]);
    });
  });

  autoTable(doc, {
    startY: 34,
    head,
    body,
    styles: { fontSize: 8, cellPadding: 3, minCellHeight: IMAGE_MAX_SIZE + 4, valign: 'middle' },
    columnStyles: { 0: { cellWidth: IMAGE_COL_WIDTH } },
    headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    didParseCell: (data) => {
      if (data.section === 'body' && totalRowIndexes.has(data.row.index)) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [226, 232, 240];
      }
    },
    didDrawCell: (data) => {
      if (data.section === 'body' && data.column.index === 0) {
        drawImageCell(doc, data, imageByRow.get(data.row.index) ?? null);
      }
    },
    didDrawPage: () => drawFooter(doc),
  });

  const totalRevenue = filtered.reduce((sum, s) => sum + s.totalPrice, 0);
  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY || 40;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Incasso totale: €${totalRevenue.toFixed(2)}`, 14, finalY + 10);

  doc.save(`report-vendite-${new Date().toISOString().slice(0, 10)}.pdf`);
}
