import QRCode from 'qrcode';
import JSZip from 'jszip';
import { Product } from '../types';
import { sortSizes, variantKey } from '../constants';

// Etichetta 40x30mm alla risoluzione 203dpi della Phomemo M220 (~8 px/mm).
const LABEL_WIDTH = 320;
const LABEL_HEIGHT = 240;
const QR_SIZE = 200;
const MARGIN = 14;

interface LabelSpec {
  fileName: string;
  sku: string;
  colore: string;
  taglia: string;
  prezzo: number;
  url: string;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function fitFontSize(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxPx: number,
  minPx: number,
  bold: boolean
): number {
  for (let size = maxPx; size >= minPx; size -= 1) {
    ctx.font = `${bold ? 'bold ' : ''}${size}px Arial, sans-serif`;
    if (ctx.measureText(text).width <= maxWidth) return size;
  }
  return minPx;
}

async function renderLabelCanvas(spec: LabelSpec): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  canvas.width = LABEL_WIDTH;
  canvas.height = LABEL_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas non supportato da questo browser.');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, LABEL_WIDTH, LABEL_HEIGHT);
  ctx.fillStyle = '#000000';

  const qrDataUrl = await QRCode.toDataURL(spec.url, { margin: 0, width: QR_SIZE, color: { dark: '#000000', light: '#ffffff' } });
  const qrImg = await loadImage(qrDataUrl);
  const qrY = Math.round((LABEL_HEIGHT - QR_SIZE) / 2);
  ctx.drawImage(qrImg, MARGIN, qrY, QR_SIZE, QR_SIZE);

  const textX = MARGIN + QR_SIZE + 10;
  const maxTextWidth = LABEL_WIDTH - textX - 8;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';

  const skuSize = fitFontSize(ctx, spec.sku, maxTextWidth, 22, 9, true);
  ctx.font = `bold ${skuSize}px Arial, sans-serif`;
  ctx.fillText(spec.sku, textX, 55);

  const varianteText = `${spec.colore} / ${spec.taglia}`;
  const varSize = fitFontSize(ctx, varianteText, maxTextWidth, 17, 8, false);
  ctx.font = `${varSize}px Arial, sans-serif`;
  ctx.fillText(varianteText, textX, 115);

  const prezzoText = `€ ${spec.prezzo.toFixed(2)}`;
  const prezzoSize = fitFontSize(ctx, prezzoText, maxTextWidth, 20, 9, true);
  ctx.font = `bold ${prezzoSize}px Arial, sans-serif`;
  ctx.fillText(prezzoText, textX, 175);

  return canvas;
}

function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Impossibile generare l'immagine."))), 'image/png');
  });
}

function buildSaleUrl(sku: string, variant: string | null): string {
  const base = window.location.origin + window.location.pathname;
  const params = new URLSearchParams({ vendi: sku });
  if (variant) params.set('variante', variant);
  return `${base}?${params.toString()}`;
}

function slugify(text: string): string {
  return text.replace(/[^a-zA-Z0-9_-]+/g, '-');
}

export async function exportQrLabels(products: Product[]): Promise<void> {
  const specs: LabelSpec[] = [];

  products.forEach((p) => {
    const hasVariants = p.sizes.length > 0 && p.colors.length > 0;
    if (hasVariants) {
      p.colors.forEach((colore) =>
        sortSizes(p.sizes).forEach((taglia) => {
          const key = variantKey(colore, taglia);
          const qty = p.variants[key] || 0;
          if (qty <= 0) return;
          specs.push({
            fileName: `${slugify(p.sku)}_${slugify(colore)}_${slugify(taglia)}`,
            sku: p.sku,
            colore,
            taglia,
            prezzo: p.salePrice,
            url: buildSaleUrl(p.sku, key),
          });
        })
      );
    } else if (p.quantity > 0) {
      specs.push({
        fileName: slugify(p.sku),
        sku: p.sku,
        colore: '-',
        taglia: '-',
        prezzo: p.salePrice,
        url: buildSaleUrl(p.sku, null),
      });
    }
  });

  if (specs.length === 0) {
    throw new Error('Nessuna variante con scorta disponibile da etichettare.');
  }

  const zip = new JSZip();
  for (const spec of specs) {
    const canvas = await renderLabelCanvas(spec);
    const blob = await canvasToPngBlob(canvas);
    zip.file(`${spec.fileName}.png`, blob);
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(zipBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `etichette-qr-${new Date().toISOString().slice(0, 10)}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
