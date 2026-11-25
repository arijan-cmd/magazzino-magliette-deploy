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

// Molte pistole inviano i tasti come una tastiera AMERICANA, anche se il computer è impostato in italiano
// (così ":" diventa "ç" e "=" diventa "ì"). Per questo oltre al testo "come lo vede il computer"
// ricostruiamo anche quello che la pistola intendeva, dal tasto fisico premuto (e.code + Maiusc).
const US_SHIFT_DIGITS = ')!@#$%^&*(';
const US_SYMBOLS: Record<string, [string, string]> = {
  Minus: ['-', '_'],
  Equal: ['=', '+'],
  BracketLeft: ['[', '{'],
  BracketRight: [']', '}'],
  Backslash: ['\\', '|'],
  Semicolon: [';', ':'],
  Quote: ["'", '"'],
  Comma: [',', '<'],
  Period: ['.', '>'],
  Slash: ['/', '?'],
  Backquote: ['`', '~'],
  Space: [' ', ' '],
};

function usChar(e: KeyboardEvent): string {
  const { code, shiftKey } = e;
  if (/^Key[A-Z]$/.test(code)) {
    const letter = code.slice(3);
    return shiftKey ? letter : letter.toLowerCase();
  }
  if (/^Digit[0-9]$/.test(code)) {
    const d = Number(code.slice(5));
    return shiftKey ? US_SHIFT_DIGITS[d] : String(d);
  }
  const sym = US_SYMBOLS[code];
  if (sym) return shiftKey ? sym[1] : sym[0];
  return e.key;
}

/**
 * onScan riceve le possibili letture del codice (come lo vede il computer e come lo intendeva la pistola) e deve restituire true se lo ha riconosciuto (e usato).
 * In quel caso l'Invio viene bloccato e il campo in cui stava "scrivendo" la pistola viene ripristinato.
 */
export function useBarcodeScanner(onScan: (candidates: string[]) => boolean, enabled: boolean) {
  const handlerRef = useRef(onScan);
  handlerRef.current = onScan;

  useEffect(() => {
    if (!enabled) return;

    let buffer = '';
    let usBuffer = '';
    let lastTime = 0;
    let field: { el: FormField; value: string } | null = null;

    const reset = () => {
      buffer = '';
      usBuffer = '';
      field = null;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      if (e.key === 'Enter' || e.key === 'Tab') {
        if (buffer.length >= MIN_LENGTH) {
          const candidates = Array.from(new Set([buffer, usBuffer]));
          const snapshot = field;
          reset();
          if (handlerRef.current(candidates)) {
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
      usBuffer += usChar(e);
    };

    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [enabled]);
}
