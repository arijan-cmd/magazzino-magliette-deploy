import React, { useMemo, useState } from 'react';
import { ArrowCircleDown, ArrowCircleUp, ArrowsLeftRight } from '@phosphor-icons/react';
import { MOVEMENT_REASON_PRESETS, MovementType, Product } from '../types';
import { sortSizes, variantKey } from '../constants';

interface StockMovementFormProps {
  products: Product[];
  onSubmit: (input: {
    productId: string;
    variantKey: string | null;
    type: Extract<MovementType, 'in' | 'out'>;
    quantity: number;
    reason: string;
  }) => void;
}

const inputClass =
  'w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:bg-white dark:focus:bg-slate-800 focus:border-brand-400 focus:ring-4 focus:ring-brand-100 dark:focus:ring-brand-900/40';
const labelClass = 'block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5';

export default function StockMovementForm({ products, onSubmit }: StockMovementFormProps) {
  const [productId, setProductId] = useState('');
  const [variant, setVariant] = useState('');
  const [type, setType] = useState<'in' | 'out'>('in');
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState<string>(MOVEMENT_REASON_PRESETS[0]);
  const [customReason, setCustomReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const selectedProduct = products.find((p) => p.id === productId) || null;
  const variantKeys = useMemo(() => {
    if (!selectedProduct) return [];
    if (!selectedProduct.sizes.length || !selectedProduct.colors.length) return [];
    const keys: string[] = [];
    selectedProduct.colors.forEach((color) => sortSizes(selectedProduct.sizes).forEach((size) => keys.push(variantKey(color, size))));
    return keys;
  }, [selectedProduct]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    if (!selectedProduct) {
      setError('Seleziona un prodotto.');
      return;
    }
    if (variantKeys.length > 0 && !variant) {
      setError('Seleziona una variante.');
      return;
    }
    if (quantity <= 0) {
      setError('La quantità deve essere maggiore di zero.');
      return;
    }
    const finalReason = reason === 'Altro' ? customReason.trim() || 'Altro' : reason;
    onSubmit({
      productId,
      variantKey: variantKeys.length > 0 ? variant : null,
      type,
      quantity,
      reason: finalReason,
    });
    setProductId('');
    setVariant('');
    setType('in');
    setQuantity(1);
    setReason(MOVEMENT_REASON_PRESETS[0]);
    setCustomReason('');
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2500);
  };

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
          <ArrowsLeftRight size={19} />
        </div>
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">Carico / Scarico magazzino</h2>
          <p className="text-sm text-slate-400 dark:text-slate-500 font-medium">Registra un movimento manuale</p>
        </div>
      </div>
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-softer"
      >
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setType('in')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold border transition-all duration-150 ${
              type === 'in'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-card'
                : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <ArrowCircleDown size={16} /> Carico (entrata)
          </button>
          <button
            type="button"
            onClick={() => setType('out')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold border transition-all duration-150 ${
              type === 'out'
                ? 'bg-red-600 text-white border-red-600 shadow-card'
                : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <ArrowCircleUp size={16} /> Scarico (uscita)
          </button>
        </div>

        <div>
          <label className={labelClass}>Prodotto</label>
          <select
            value={productId}
            onChange={(e) => {
              setProductId(e.target.value);
              setVariant('');
            }}
            className={inputClass}
          >
            <option value="">Seleziona un prodotto...</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.sku}) — {p.quantity} pz
              </option>
            ))}
          </select>
        </div>

        {variantKeys.length > 0 && (
          <div>
            <label className={labelClass}>Variante</label>
            <select value={variant} onChange={(e) => setVariant(e.target.value)} className={inputClass}>
              <option value="">Seleziona una variante...</option>
              {variantKeys.map((key) => (
                <option key={key} value={key}>
                  {key.replace('-', ' / ')} — {selectedProduct?.variants[key] || 0} pz
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className={labelClass}>Quantità</label>
          <input
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            className={inputClass + ' sm:w-40'}
          />
        </div>

        <div>
          <label className={labelClass}>Motivo</label>
          <select value={reason} onChange={(e) => setReason(e.target.value)} className={inputClass}>
            {MOVEMENT_REASON_PRESETS.filter((r) => r !== 'Vendita' && r !== 'Annullamento vendita').map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          {reason === 'Altro' && (
            <input
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="Specifica il motivo..."
              className={inputClass + ' mt-2'}
            />
          )}
        </div>

        {error && (
          <p className="text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-900/40 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
        {success && (
          <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-900/40 rounded-lg px-3 py-2">
            Movimento registrato correttamente.
          </p>
        )}

        <button
          type="submit"
          className="bg-brand-600 hover:bg-brand-700 active:scale-[0.98] text-white font-bold px-5 py-2.5 rounded-xl text-sm shadow-card transition-all duration-150"
        >
          Registra movimento
        </button>
      </form>
    </div>
  );
}
