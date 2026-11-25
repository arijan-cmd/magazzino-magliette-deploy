import { useEffect, useRef } from 'react';

// Le pistole lettore QR/barcode USB o Bluetooth si comportano come una tastiera:
// "digitano" il codice in pochi millisecondi e poi premono Invio.
// Distinguiamo la pistola da una persona che scrive dalla velocità dei tasti.

const MAX_GAP_MS = 60; // tra un carattere e il successivo (una persona è molto più lenta)
const MIN_LENGTH = 4;

type FormField = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

function isFormField(el: EventTarget | null): el is FormField {
  return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement;
}

function setFieldValue(el: FormField, value: string) {
  const proto =
    el instanceof HTMLSelectElement
      ? HTMLSelectElement.prototype
      : el instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value')?.set?.call(el, value);
  el.dispatchEvent(new Event(el instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }));
}

/**
 * onScan riceve il testo letto e deve restituire true se lo ha riconosciuto (e usato).
 * In quel caso l'Invio viene bloccato e il campo in cui stava "scrivendo" la pistola viene ripristinato.
 */
export function useBarcodeScanner(onScan: (code: string) => boolean, enabled: boolean) {
  const handlerRef = useRef(onScan);
  handlerRef.current = onScan;

  useEffect(() => {
    if (!enabled) return;

    let buffer = '';
    let lastTime = 0;
    let field: { el: FormField; value: string } | null = null;

    const reset = () => {
      buffer = '';
      field = null;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      if (e.key === 'Enter' || e.key === 'Tab') {
        if (buffer.length >= MIN_LENGTH) {
          const code = buffer;
          const snapshot = field;
          reset();
          if (handlerRef.current(code)) {
            e.preventDefault();
            e.stopPropagation();
            // i caratteri "digitati" dalla pistola erano finiti nel campo selezionato: li tolgo
            if (snapshot && snapshot.el.isConnected) setFieldValue(snapshot.el, snapshot.value);
          }
          return;
        }
        reset();
        return;
      }

      if (e.key.length !== 1) return; // Shift, frecce, ecc.

      const now = performance.now();
      if (buffer && now - lastTime > MAX_GAP_MS) reset(); // troppo lento: è una persona che scrive
      lastTime = now;

      if (!buffer) {
        const target = document.activeElement ?? e.target;
        field = isFormField(target) ? { el: target, value: target.value } : null;
      }
      buffer += e.key;
    };

    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [enabled]);
}
