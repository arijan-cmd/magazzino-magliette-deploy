import React, { useMemo, useState } from 'react';
import {
  Archive,
  Plus,
  PencilSimple,
  Trash,
  CaretRight,
  CaretDown,
  Folder,
  FolderOpen,
  ArrowRight,
  X,
} from '@phosphor-icons/react';
import { DEFAULT_SIZES, sortSizes, variantKey } from '../constants';
import VariantSelect from './VariantSelect';
import { BlankGarment, Product } from '../types';

interface BlankStockManagerProps {
  garments: BlankGarment[];
  products: Product[];
  onSave: (data: Omit<BlankGarment, 'id' | 'createdAt' | 'updatedAt'>, id?: string) => void;
  onDelete: (id: string) => void;
  onAdjustVariant: (garmentId: string, variantKey: string, quantity: number) => void;
  onTransfer: (input: {
    garmentId: string;
    variantKey: string;
    colore: string;
    taglia: string;
    productId: string;
    quantity: number;
  }) => void;
}

const inputClass =
  'w-full px-3.5 py-2.5 bg-slate-50 dark:bg-night-800 border border-slate-200 dark:border-night-700 rounded-xl text-sm text-slate-900 dark:text-night-100 outline-none transition focus:bg-white dark:focus:bg-night-800 focus:border-brand-400 focus:ring-4 focus:ring-brand-100 dark:focus:ring-brand-900/40';
const labelClass = 'block text-xs font-bold text-slate-500 dark:text-night-400 mb-1.5';

function GarmentForm({
  garment,
  existingModelli,
  availableSizes,
  availableColors,
  onSave,
  onCancel,
}: {
  garment?: BlankGarment | null;
  existingModelli: string[];
  availableSizes: string[];
  availableColors: string[];
  onSave: (data: Omit<BlankGarment, 'id' | 'createdAt' | 'updatedAt'>, id?: string) => void;
  onCancel: () => void;
}) {
  const [modello, setModello] = useState(garment?.modello || '');
  const [sizes, setSizes] = useState<string[]>(garment?.sizes || []);
  const [colors, setColors] = useState<string[]>(garment?.colors || []);
  const [variants, setVariants] = useState<Record<string, number>>(garment?.variants || {});
  const [error, setError] = useState<string | null>(null);

  const sortedSizes = useMemo(() => sortSizes(sizes), [sizes]);
  const hasVariants = sizes.length > 0 && colors.length > 0;

  const allVariantKeys = useMemo(() => {
    if (!hasVariants) return [];
    const keys: string[] = [];
    colors.forEach((color) => sortedSizes.forEach((size) => keys.push(variantKey(color, size))));
    return keys;
  }, [colors, sortedSizes, hasVariants]);

  const updateVariantQty = (key: string, qty: number) => {
    setVariants((prev) => ({ ...prev, [key]: Math.max(0, qty) }));
  };

  const totalQuantity = allVariantKeys.reduce((sum, key) => sum + (variants[key] || 0), 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!modello.trim()) {
      setError('Il nome del modello è obbligatorio.');
      return;
    }
    if (!hasVariants) {
      setError('Aggiungi almeno una taglia e un colore.');
      return;
    }
    const cleanVariants: Record<string, number> = {};
    allVariantKeys.forEach((key) => {
      cleanVariants[key] = variants[key] || 0;
    });
    onSave(
      { modello: modello.trim(), sizes: sortedSizes, colors, variants: cleanVariants, quantity: totalQuantity },
      garment?.id
    );
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white dark:bg-night-900 border border-slate-200/80 dark:border-night-800 rounded-2xl p-6 space-y-5 shadow-softer"
    >
      <div>
        <label className={labelClass}>Modello *</label>
        <input
          list="modello-options"
          value={modello}
          onChange={(e) => setModello(e.target.value)}
          placeholder="Es. Oversized, Classica, Retro..."
          className={inputClass}
        />
        <datalist id="modello-options">
          {existingModelli.map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <VariantSelect label="Taglie" values={sortedSizes} onChange={setSizes} options={availableSizes} />
        <VariantSelect label="Colori" values={colors} onChange={setColors} options={availableColors} />
      </div>

      {hasVariants && (
        <div>
          <label className={labelClass + ' mb-2'}>
            Quantità per variante ·{' '}
            <span className="text-brand-600 dark:text-brand-400 font-extrabold">{totalQuantity} totali</span>
          </label>
          <div className="overflow-x-auto border border-slate-200 dark:border-night-800 rounded-xl">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-night-800/40">
                <tr>
                  <th className="text-left px-3 py-2.5 font-bold text-slate-500 dark:text-night-400 text-xs uppercase">Colore</th>
                  {sortedSizes.map((size) => (
                    <th key={size} className="text-center px-3 py-2.5 font-bold text-slate-500 dark:text-night-400 text-xs uppercase">
                      {size}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {colors.map((color) => (
                  <tr key={color} className="border-t border-slate-100 dark:border-night-800">
                    <td className="px-3 py-2 font-bold text-slate-700 dark:text-night-200">{color}</td>
                    {sortedSizes.map((size) => {
                      const key = variantKey(color, size);
                      return (
                        <td key={key} className="px-2 py-1.5">
                          <input
                            type="number"
                            min={0}
                            value={variants[key] || 0}
                            onChange={(e) => updateVariantQty(key, Number(e.target.value))}
                            className="w-16 mx-auto block text-center px-1 py-1.5 bg-white dark:bg-night-900 border border-slate-200 dark:border-night-700 text-slate-900 dark:text-night-100 rounded-lg text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-900/40"
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
      )}

      {error && (
        <p className="text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-900/40 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          className="bg-brand-600 hover:bg-brand-700 active:scale-[0.98] text-white font-bold px-5 py-2.5 rounded-xl text-sm shadow-card transition-all duration-150"
        >
          Salva modello
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="border border-slate-200 dark:border-night-700 text-slate-600 dark:text-night-300 hover:bg-slate-50 dark:hover:bg-night-800 font-bold px-5 py-2.5 rounded-xl text-sm transition"
        >
          Annulla
        </button>
      </div>
    </form>
  );
}

function TransferPanel({
  garmentId,
  garmentModello,
  variantKeyValue,
  colore,
  taglia,
  available,
  products,
  onTransfer,
  onClose,
}: {
  garmentId: string;
  garmentModello: string;
  variantKeyValue: string;
  colore: string;
  taglia: string;
  available: number;
  products: Product[];
  onTransfer: BlankStockManagerProps['onTransfer'];
  onClose: () => void;
}) {
  const [productId, setProductId] = useState(products[0]?.id || '');
  const [quantity, setQuantity] = useState(available);
  const [error, setError] = useState<string | null>(null);

  const selectedProduct = products.find((p) => p.id === productId) || null;
  const willAddVariant = !!selectedProduct && (!selectedProduct.colors.includes(colore) || !selectedProduct.sizes.includes(taglia));

  const handleConfirm = () => {
    setError(null);
    if (!productId) {
      setError('Seleziona un prodotto di destinazione.');
      return;
    }
    if (quantity <= 0 || quantity > available) {
      setError('Quantità non valida.');
      return;
    }
    onTransfer({ garmentId, variantKey: variantKeyValue, colore, taglia, productId, quantity });
    onClose();
  };

  return (
    <div className="mt-2 bg-brand-50/60 dark:bg-brand-500/10 border border-brand-200 dark:border-brand-800/50 rounded-xl p-3 space-y-2.5">
      <p className="text-xs font-bold text-brand-700 dark:text-brand-300">
        Carica {colore} / {taglia} · {garmentModello} in un prodotto
      </p>
      {products.length === 0 ? (
        <p className="text-xs font-semibold text-slate-500 dark:text-night-400">Non ci sono ancora prodotti in catalogo.</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
            <select value={productId} onChange={(e) => setProductId(e.target.value)} className={inputClass + ' py-2'}>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku})
                </option>
              ))}
            </select>
            <input
              type="number"
              min={1}
              max={available}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className={inputClass + ' py-2 sm:w-24'}
            />
          </div>
          {willAddVariant && (
            <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
              Questo prodotto non ha ancora la variante {colore} / {taglia}: verrà aggiunta automaticamente.
            </p>
          )}
          {error && <p className="text-xs font-semibold text-red-600 dark:text-red-400">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleConfirm}
              className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 active:scale-[0.98] text-white font-bold px-3.5 py-1.5 rounded-lg text-xs shadow-card transition-all duration-150"
            >
              <ArrowRight size={13} /> Conferma
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-bold text-slate-400 dark:text-night-500 hover:underline px-2"
            >
              Annulla
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function GarmentCard({
  garment,
  products,
  onEdit,
  onDelete,
  onAdjustVariant,
  onTransfer,
}: {
  garment: BlankGarment;
  products: Product[];
  onEdit: (g: BlankGarment) => void;
  onDelete: (id: string) => void;
  onAdjustVariant: BlankStockManagerProps['onAdjustVariant'];
  onTransfer: BlankStockManagerProps['onTransfer'];
}) {
  const [expandedColors, setExpandedColors] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [transferKey, setTransferKey] = useState<string | null>(null);

  const toggleColor = (color: string) => {
    setExpandedColors((prev) => {
      const next = new Set(prev);
      if (next.has(color)) next.delete(color);
      else next.add(color);
      return next;
    });
  };

  return (
    <div className="bg-white dark:bg-night-900 border border-slate-200/80 dark:border-night-800 rounded-2xl p-5 shadow-softer">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">{garment.modello}</h3>
          <p className="text-xs font-semibold text-slate-400 dark:text-night-500">{garment.quantity} pezzi disponibili</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onEdit(garment)}
            className="p-2 text-slate-400 dark:text-night-500 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-500/10 rounded-lg transition-colors"
            title="Modifica"
          >
            <PencilSimple size={15} />
          </button>
          {confirmDelete ? (
            <>
              <button
                onClick={() => {
                  onDelete(garment.id);
                  setConfirmDelete(false);
                }}
                className="text-xs font-bold text-red-600 dark:text-red-400 px-2 hover:underline whitespace-nowrap"
              >
                Conferma
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-xs font-bold text-slate-400 dark:text-night-500 px-2 hover:underline"
              >
                Annulla
              </button>
            </>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="p-2 text-slate-400 dark:text-night-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
              title="Elimina"
            >
              <Trash size={15} />
            </button>
          )}
        </div>
      </div>

      <div className="space-y-0.5">
        {garment.colors.map((color) => {
          const isOpen = expandedColors.has(color);
          const colorTotal = garment.sizes.reduce((sum, size) => sum + (garment.variants[variantKey(color, size)] || 0), 0);
          return (
            <div key={color}>
              <button
                type="button"
                onClick={() => toggleColor(color)}
                className="flex items-center gap-2 w-full text-left py-1.5 px-2 rounded-lg hover:bg-slate-50 dark:hover:bg-night-800/60 transition-colors"
              >
                {isOpen ? <CaretDown size={13} className="text-slate-400" /> : <CaretRight size={13} className="text-slate-400" />}
                {isOpen ? (
                  <FolderOpen size={15} className="text-brand-500" />
                ) : (
                  <Folder size={15} className="text-slate-400 dark:text-night-500" />
                )}
                <span className="text-sm font-bold text-slate-700 dark:text-night-200">{color}</span>
                <span className="text-xs font-semibold text-slate-400 dark:text-night-500">{colorTotal} pz</span>
              </button>
              {isOpen && (
                <div className="pl-8 py-1 space-y-1">
                  {sortSizes(garment.sizes).map((size) => {
                    const key = variantKey(color, size);
                    const qty = garment.variants[key] || 0;
                    return (
                      <div key={key} className="pr-2">
                        <div className="flex items-center justify-between gap-3 py-1">
                          <span className="text-xs font-semibold text-slate-500 dark:text-night-400">Taglia {size}</span>
                          <div className="flex items-center gap-2">
                            <input
                              key={`${key}-${qty}`}
                              type="number"
                              min={0}
                              defaultValue={qty}
                              onBlur={(e) => {
                                const safeNew = Math.max(0, Math.floor(Number(e.target.value)) || 0);
                                if (safeNew !== qty) onAdjustVariant(garment.id, key, safeNew);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                              }}
                              className="w-16 text-center px-1.5 py-1 bg-white dark:bg-night-900 border border-slate-200 dark:border-night-700 text-slate-900 dark:text-night-100 rounded-lg text-xs font-bold outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-900/40"
                            />
                            <button
                              type="button"
                              disabled={qty === 0}
                              onClick={() => setTransferKey(transferKey === key ? null : key)}
                              className="flex items-center gap-1 text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline disabled:opacity-30 disabled:pointer-events-none whitespace-nowrap"
                            >
                              {transferKey === key ? <X size={12} /> : <ArrowRight size={12} />}
                              Prodotto
                            </button>
                          </div>
                        </div>
                        {transferKey === key && (
                          <TransferPanel
                            garmentId={garment.id}
                            garmentModello={garment.modello}
                            variantKeyValue={key}
                            colore={color}
                            taglia={size}
                            available={qty}
                            products={products}
                            onTransfer={onTransfer}
                            onClose={() => setTransferKey(null)}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function BlankStockManager({ garments, products, onSave, onDelete, onAdjustVariant, onTransfer }: BlankStockManagerProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [editingGarment, setEditingGarment] = useState<BlankGarment | null>(null);

  const existingModelli = useMemo(() => Array.from(new Set(garments.map((g) => g.modello))).sort(), [garments]);
  const availableSizes = useMemo(
    () => Array.from(new Set([...DEFAULT_SIZES, ...garments.flatMap((g) => g.sizes), ...products.flatMap((p) => p.sizes)])).filter(Boolean),
    [garments, products]
  );
  const availableColors = useMemo(
    () =>
      Array.from(new Set([...garments.flatMap((g) => g.colors), ...products.flatMap((p) => p.colors)]))
        .filter(Boolean)
        .sort(),
    [garments, products]
  );

  const handleSave: BlankStockManagerProps['onSave'] = (data, id) => {
    onSave(data, id);
    setFormOpen(false);
    setEditingGarment(null);
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">Magazzino</h2>
          <p className="text-sm text-slate-400 dark:text-night-500 font-medium mt-0.5">
            Magliette non stampate disponibili, da caricare nei prodotti già in catalogo
          </p>
        </div>
        {!formOpen && (
          <button
            onClick={() => {
              setEditingGarment(null);
              setFormOpen(true);
            }}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 active:scale-[0.98] text-white font-bold px-4 py-2.5 rounded-xl text-sm w-fit shadow-card transition-all duration-150"
          >
            <Plus size={16} /> Nuovo modello
          </button>
        )}
      </div>

      {formOpen && (
        <div className="mb-6">
          <GarmentForm
            garment={editingGarment}
            existingModelli={existingModelli}
            availableSizes={availableSizes}
            availableColors={availableColors}
            onSave={handleSave}
            onCancel={() => {
              setFormOpen(false);
              setEditingGarment(null);
            }}
          />
        </div>
      )}

      {garments.length === 0 && !formOpen ? (
        <div className="bg-white dark:bg-night-900 border border-slate-200/80 dark:border-night-800 rounded-2xl py-16 flex flex-col items-center gap-2 text-slate-300 dark:text-night-700">
          <Archive size={32} />
          <p className="text-sm text-slate-400 dark:text-night-500 font-semibold">Nessun modello in magazzino.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {garments.map((garment) => (
            <GarmentCard
              key={garment.id}
              garment={garment}
              products={products}
              onEdit={(g) => {
                setEditingGarment(g);
                setFormOpen(true);
              }}
              onDelete={onDelete}
              onAdjustVariant={onAdjustVariant}
              onTransfer={onTransfer}
            />
          ))}
        </div>
      )}
    </div>
  );
}
