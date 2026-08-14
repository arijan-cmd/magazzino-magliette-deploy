import React, { useEffect, useMemo, useState } from 'react';
import { X, Plus, Package, Image } from '@phosphor-icons/react';
import { DEFAULT_CATEGORIES, DEFAULT_SIZES, IVA_RATES, sortSizes, variantKey } from '../constants';
import { MAX_IMAGE_SIZE_BYTES } from '../services/storage';
import { Product } from '../types';

export type ProductFormValues = Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'images'>;

export interface ProductImagesInput {
  keepUrls: string[];
  newFiles: File[];
}

interface ProductFormProps {
  product?: Product | null;
  products: Product[];
  onSave: (data: ProductFormValues, images: ProductImagesInput, id?: string) => void;
  onCancel: () => void;
}

const inputClass =
  'w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:bg-white dark:focus:bg-slate-800 focus:border-brand-400 focus:ring-4 focus:ring-brand-100 dark:focus:ring-brand-900/40';
const labelClass = 'block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5';

function ChipInput({
  label,
  values,
  onChange,
  suggestions,
}: {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  suggestions?: string[];
}) {
  const [draft, setDraft] = useState('');

  const add = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || values.includes(trimmed)) return;
    onChange([...values, trimmed]);
    setDraft('');
  };

  return (
    <div>
      <label className={labelClass}>{label}</label>
      <div className="flex flex-wrap gap-2 mb-2">
        {values.map((v) => (
          <span
            key={v}
            className="flex items-center gap-1.5 bg-brand-50 dark:bg-brand-500/10 border border-brand-100 dark:border-brand-800/60 text-brand-700 dark:text-brand-300 rounded-full pl-3 pr-2 py-1 text-xs font-bold"
          >
            {v}
            <button
              type="button"
              onClick={() => onChange(values.filter((x) => x !== v))}
              className="hover:text-brand-900 dark:hover:text-brand-100"
            >
              <X size={12} />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add(draft);
            }
          }}
          placeholder={`Aggiungi ${label.toLowerCase()}...`}
          className={inputClass + ' py-2'}
        />
        <button
          type="button"
          onClick={() => add(draft)}
          className="px-3.5 py-2 bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-xl text-xs font-bold flex items-center gap-1 shrink-0 transition"
        >
          <Plus size={14} /> Aggiungi
        </button>
      </div>
      {suggestions && suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {suggestions
            .filter((s) => !values.includes(s))
            .map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => add(s)}
                className="text-[11px] font-bold text-slate-400 dark:text-slate-500 border border-dashed border-slate-300 dark:border-slate-700 rounded-full px-2.5 py-0.5 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300 transition"
              >
                + {s}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

export default function ProductForm({ product, products, onSave, onCancel }: ProductFormProps) {
  const [name, setName] = useState(product?.name || '');
  const [sku, setSku] = useState(product?.sku || '');
  const [category, setCategory] = useState(product?.category || DEFAULT_CATEGORIES[0]);
  const [description, setDescription] = useState(product?.description || '');
  const [salePrice, setSalePrice] = useState(product?.salePrice ?? 0);
  const [purchasePrice, setPurchasePrice] = useState(product?.purchasePrice ?? 0);
  const [aliquotaIva, setAliquotaIva] = useState(product?.aliquotaIva ?? '22');
  const [minStockLevel, setMinStockLevel] = useState(product?.minStockLevel ?? 5);
  const [sizes, setSizes] = useState<string[]>(product?.sizes || []);
  const [colors, setColors] = useState<string[]>(product?.colors || []);
  const [variants, setVariants] = useState<Record<string, number>>(product?.variants || {});
  const [manualQuantity, setManualQuantity] = useState(product?.quantity ?? 0);
  const [existingImages, setExistingImages] = useState<string[]>(product?.images || []);
  const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      newImagePreviews.forEach((url) => URL.revokeObjectURL(url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasVariants = sizes.length > 0 && colors.length > 0;
  const sortedSizes = useMemo(() => sortSizes(sizes), [sizes]);

  const allVariantKeys = useMemo(() => {
    if (!hasVariants) return [];
    const keys: string[] = [];
    colors.forEach((color) => sortedSizes.forEach((size) => keys.push(variantKey(color, size))));
    return keys;
  }, [colors, sortedSizes, hasVariants]);

  const updateVariantQty = (key: string, qty: number) => {
    setVariants((prev) => ({ ...prev, [key]: Math.max(0, qty) }));
  };

  const totalQuantity = hasVariants
    ? allVariantKeys.reduce((sum, key) => sum + (variants[key] || 0), 0)
    : manualQuantity;

  const normalizedSku = sku.trim().toLowerCase();
  const duplicateSku =
    normalizedSku.length > 0 &&
    products.some((p) => p.id !== product?.id && p.sku.trim().toLowerCase() === normalizedSku);

  const handleFilesSelected = (fileList: FileList | null) => {
    if (!fileList) return;
    const files = Array.from(fileList);
    const tooLarge = files.find((f) => f.size > MAX_IMAGE_SIZE_BYTES);
    if (tooLarge) {
      setError(`L'immagine "${tooLarge.name}" supera i 5MB consentiti.`);
      return;
    }
    const notImage = files.find((f) => !f.type.startsWith('image/'));
    if (notImage) {
      setError(`Il file "${notImage.name}" non è un'immagine.`);
      return;
    }
    setError(null);
    setNewImageFiles((prev) => [...prev, ...files]);
    setNewImagePreviews((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))]);
  };

  const removeExistingImage = (url: string) => {
    setExistingImages((prev) => prev.filter((u) => u !== url));
  };

  const removeNewImage = (index: number) => {
    setNewImagePreviews((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
    setNewImageFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !sku.trim()) {
      setError('Nome e SKU sono obbligatori.');
      return;
    }
    if (duplicateSku) {
      setError('Questo SKU è già usato da un altro prodotto: deve essere univoco.');
      return;
    }
    const cleanVariants: Record<string, number> = {};
    if (hasVariants) {
      allVariantKeys.forEach((key) => {
        cleanVariants[key] = variants[key] || 0;
      });
    }
    onSave(
      {
        name: name.trim(),
        sku: sku.trim(),
        category,
        description: description.trim(),
        salePrice: Number(salePrice) || 0,
        purchasePrice: Number(purchasePrice) || 0,
        aliquotaIva,
        quantity: totalQuantity,
        minStockLevel: Number(minStockLevel) || 0,
        sizes: sortedSizes,
        colors,
        variants: cleanVariants,
      },
      { keepUrls: existingImages, newFiles: newImageFiles },
      product?.id
    );
  };

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
          <Package size={19} />
        </div>
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {product ? 'Modifica prodotto' : 'Nuovo prodotto'}
          </h2>
          <p className="text-sm text-slate-400 dark:text-slate-500 font-medium">Compila i dettagli dell'articolo</p>
        </div>
      </div>
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 space-y-6 shadow-softer"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Nome prodotto *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="Maglietta Basic" />
          </div>
          <div>
            <label className={labelClass}>SKU *</label>
            <input
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              className={
                inputClass + (duplicateSku ? ' !border-red-400 focus:!ring-red-100 dark:focus:!ring-red-900/40' : '')
              }
              placeholder="TS-001"
            />
            {duplicateSku && (
              <p className="text-xs font-semibold text-red-600 dark:text-red-400 mt-1.5">
                Questo SKU è già in uso da un altro prodotto.
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Categoria</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
              {DEFAULT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Scorta minima</label>
            <input
              type="number"
              min={0}
              value={minStockLevel}
              onChange={(e) => setMinStockLevel(Number(e.target.value))}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>Descrizione</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={inputClass} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Prezzo di vendita (€)</label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={salePrice}
              onChange={(e) => setSalePrice(Number(e.target.value))}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Prezzo di acquisto (€)</label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(Number(e.target.value))}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Aliquota IVA</label>
            <select value={aliquotaIva} onChange={(e) => setAliquotaIva(e.target.value)} className={inputClass}>
              {IVA_RATES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
          <label className={labelClass + ' mt-4'}>Immagini prodotto</label>
          <div className="flex flex-wrap gap-3">
            {existingImages.map((url) => (
              <div key={url} className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 group">
                <img src={url} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeExistingImage(url)}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            {newImagePreviews.map((url, i) => (
              <div key={url} className="relative w-20 h-20 rounded-xl overflow-hidden border border-brand-200 dark:border-brand-700 group">
                <img src={url} alt="" className="w-full h-full object-cover" />
                <span className="absolute bottom-0 inset-x-0 bg-brand-600/90 text-white text-[9px] font-bold text-center py-0.5">
                  nuova
                </span>
                <button
                  type="button"
                  onClick={() => removeNewImage(i)}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            <label className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center gap-1 text-slate-400 dark:text-slate-500 hover:border-brand-400 hover:text-brand-500 cursor-pointer transition">
              <Image size={18} />
              <span className="text-[10px] font-bold">Aggiungi</span>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  handleFilesSelected(e.target.files);
                  e.target.value = '';
                }}
              />
            </label>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium mt-2">Fino a 5MB per immagine.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="pt-4">
            <ChipInput label="Taglie" values={sortedSizes} onChange={setSizes} suggestions={DEFAULT_SIZES} />
          </div>
          <div className="pt-4">
            <ChipInput label="Colori" values={colors} onChange={setColors} />
          </div>
        </div>

        {hasVariants ? (
          <div>
            <label className={labelClass + ' mb-2'}>
              Quantità per variante ·{' '}
              <span className="text-brand-600 dark:text-brand-400 font-extrabold">{totalQuantity} totali</span>
            </label>
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/40">
                  <tr>
                    <th className="text-left px-3 py-2.5 font-bold text-slate-500 dark:text-slate-400 text-xs uppercase">Colore</th>
                    {sortedSizes.map((size) => (
                      <th key={size} className="text-center px-3 py-2.5 font-bold text-slate-500 dark:text-slate-400 text-xs uppercase">
                        {size}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {colors.map((color) => (
                    <tr key={color} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="px-3 py-2 font-bold text-slate-700 dark:text-slate-200">{color}</td>
                      {sortedSizes.map((size) => {
                        const key = variantKey(color, size);
                        return (
                          <td key={key} className="px-2 py-1.5">
                            <input
                              type="number"
                              min={0}
                              value={variants[key] || 0}
                              onChange={(e) => updateVariantQty(key, Number(e.target.value))}
                              className="w-16 mx-auto block text-center px-1 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-900/40"
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div>
            <label className={labelClass}>
              Quantità in magazzino{' '}
              {sizes.length === 0 && colors.length === 0 ? '' : '(aggiungi sia taglie che colori per gestire le varianti)'}
            </label>
            <input
              type="number"
              min={0}
              value={manualQuantity}
              onChange={(e) => setManualQuantity(Number(e.target.value))}
              className={inputClass + ' sm:w-40'}
            />
          </div>
        )}

        {error && (
          <p className="text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-900/40 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="bg-brand-600 hover:bg-brand-700 active:scale-[0.98] text-white font-bold px-5 py-2.5 rounded-xl text-sm shadow-card transition-all duration-150"
          >
            Salva prodotto
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-bold px-5 py-2.5 rounded-xl text-sm transition"
          >
            Annulla
          </button>
        </div>
      </form>
    </div>
  );
}
