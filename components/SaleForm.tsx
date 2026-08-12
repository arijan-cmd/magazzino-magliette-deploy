import React, { useEffect, useMemo, useState } from 'react';
import { ShoppingCart } from '@phosphor-icons/react';
import { formatCurrency, sortSizes, variantKey } from '../constants';
import { PaymentMethod, Product } from '../types';

interface SaleFormProps {
  products: Product[];
  onSell: (input: {
    productId: string;
    variantKey: string | null;
    quantity: number;
    unitPrice: number;
    commission: number;
    paymentMethod: PaymentMethod;
  }) => void;
}

const inputClass =
  'w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:bg-white dark:focus:bg-slate-800 focus:border-brand-400 focus:ring-4 focus:ring-brand-100 dark:focus:ring-brand-900/40';
const labelClass = 'block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5';

export default function SaleForm({ products, onSell }: SaleFormProps) {
  const [productId, setProductId] = useState('');
  const [variant, setVariant] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);
  const [commission, setCommission] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('contanti');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const sellable = useMemo(() => products.filter((p) => p.quantity > 0), [products]);
  const selectedProduct = products.find((p) => p.id === productId) || null;

  const variantKeys = useMemo(() => {
    if (!selectedProduct) return [];
    if (!selectedProduct.sizes.length || !selectedProduct.colors.length) return [];
    const keys: string[] = [];
    selectedProduct.colors.forEach((color) =>
      sortSizes(selectedProduct.sizes).forEach((size) => {
        const key = variantKey(color, size);
        if ((selectedProduct.variants[key] || 0) > 0) keys.push(key);
      })
    );
    return keys;
  }, [selectedProduct]);

  useEffect(() => {
    if (selectedProduct) {
      setUnitPrice(selectedProduct.salePrice);
    }
  }, [selectedProduct]);

  const availableQuantity = selectedProduct
    ? variantKeys.length > 0
      ? selectedProduct.variants[variant] || 0
      : selectedProduct.quantity
    : 0;

  const total = quantity * unitPrice - commission;

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
    if (quantity > availableQuantity) {
      setError('Quantità richiesta superiore alla scorta disponibile.');
      return;
    }
    onSell({
      productId,
      variantKey: variantKeys.length > 0 ? variant : null,
      quantity,
      unitPrice,
      commission,
      paymentMethod,
    });
    setQuantity(1);
    setCommission(0);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2500);
  };

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
          <ShoppingCart size={19} />
        </div>
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">Registra vendita</h2>
          <p className="text-sm text-slate-400 dark:text-slate-500 font-medium">Punto vendita</p>
        </div>
      </div>
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-softer"
      >
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
            {sellable.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.sku}) — {p.quantity} pz disponibili
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

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Quantità</label>
            <input
              type="number"
              min={1}
              max={availableQuantity || undefined}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Prezzo unitario (€)</label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={unitPrice}
              onChange={(e) => setUnitPrice(Number(e.target.value))}
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Commissione (€)</label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={commission}
              onChange={(e) => setCommission(Number(e.target.value))}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Metodo di pagamento</label>
            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)} className={inputClass}>
              <option value="contanti">Contanti</option>
              <option value="carta">Carta</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between bg-gradient-to-r from-brand-50 to-brand-50/40 dark:from-brand-500/10 dark:to-brand-500/5 border border-brand-100 dark:border-brand-800/50 rounded-xl px-4 py-3.5">
          <span className="text-xs font-extrabold text-brand-700 dark:text-brand-300 uppercase tracking-wide">Totale</span>
          <span className="text-2xl font-extrabold text-brand-700 dark:text-brand-300">{formatCurrency(total)}</span>
        </div>

        {error && (
          <p className="text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-900/40 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
        {success && (
          <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-900/40 rounded-lg px-3 py-2">
            Vendita registrata correttamente.
          </p>
        )}

        <button
          type="submit"
          className="bg-brand-600 hover:bg-brand-700 active:scale-[0.98] text-white font-bold px-5 py-2.5 rounded-xl text-sm shadow-card transition-all duration-150"
        >
          Conferma vendita
        </button>
      </form>
    </div>
  );
}
