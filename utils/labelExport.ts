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
  nome: string;
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

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
      continue;
    }
    if (current) {
      lines.push(current);
      current = '';
    }
    if (ctx.measureText(word).width <= maxWidth) {
      current = word;
      continue;
    }
    // Parola singola troppo larga: la spezza carattere per carattere.
    let piece = '';
    for (const ch of word) {
      const test = piece + ch;
      if (ctx.measureText(test).width <= maxWidth || !piece) {
        piece = test;
      } else {
        lines.push(piece);
        piece = ch;
      }
    }
    current = piece;
  }
  if (current) lines.push(current);
  return lines;
}

function fitWrappedName(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxPx: number,
  minPx: number
): { size: number; lines: string[] } {
  let fallback: { size: number; lines: string[] } | null = null;
  for (let size = maxPx; size >= minPx; size -= 1) {
    ctx.font = `bold ${size}px Arial, sans-serif`;
    const lines = wrapText(ctx, text, maxWidth);
    if (lines.length <= 2) return { size, lines };
    fallback = { size, lines };
  }
  return fallback as { size: number; lines: string[] };
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
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  const { size: nomeSize, lines: nomeLines } = fitWrappedName(ctx, spec.nome, maxTextWidth, 15, 8);
  const varianteText = `${spec.colore} / ${spec.taglia}`;
  const varSize = fitFontSize(ctx, varianteText, maxTextWidth, 14, 8, false);
  const prezzoText = `€ ${spec.prezzo.toFixed(2)}`;
  const prezzoSize = fitFontSize(ctx, prezzoText, maxTextWidth, 18, 9, true);

  const gap = 6;
  const nomeLineHeight = nomeSize * 1.15;
  const varLineHeight = varSize * 1.15;
  const prezzoLineHeight = prezzoSize * 1.15;
  const totalHeight = nomeLines.length * nomeLineHeight + gap + varLineHeight + gap + prezzoLineHeight;
  const contentTop = 12;
  const contentAvailable = LABEL_HEIGHT - 2 * contentTop;
  let cursorY = contentTop + Math.max(0, (contentAvailable - totalHeight) / 2);

  ctx.font = `bold ${nomeSize}px Arial, sans-serif`;
  nomeLines.forEach((line) => {
    ctx.fillText(line, textX, cursorY);
    cursorY += nomeLineHeight;
  });
  cursorY += gap;

  ctx.font = `${varSize}px Arial, sans-serif`;
  ctx.fillText(varianteText, textX, cursorY);
  cursorY += varLineHeight + gap;

  ctx.font = `bold ${prezzoSize}px Arial, sans-serif`;
  ctx.fillText(prezzoText, textX, cursorY);

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
            nome: p.name,
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
        nome: p.name,
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
