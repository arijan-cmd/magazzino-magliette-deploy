import React, { useMemo, useState } from 'react';
import {
  MagnifyingGlass,
  Plus,
  PencilSimple,
  Trash,
  Warning,
  Package,
  CaretRight,
  CaretDown,
  Folder,
  FolderOpen,
  Rows,
  SquaresFour,
  TrendUp,
  ShoppingBag,
} from '@phosphor-icons/react';
import { formatCurrency, sortSizes, variantKey } from '../constants';
import { MovementType, Product, Sale } from '../types';

interface InventoryTableProps {
  products: Product[];
  sales: Sale[];
  isAdmin: boolean;
  canManageStock: boolean;
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
  onAdjustVariant: (input: {
    productId: string;
    variantKey: string;
    type: Extract<MovementType, 'in' | 'out'>;
    quantity: number;
    reason: string;
  }) => void;
  onQuickSell: (productId: string) => void;
}

function getStockStatus(product: Product): { label: string; className: string } {
  if (product.quantity === 0) {
    return { label: 'Esaurito', className: 'bg-slate-800/80 text-slate-200' };
  }
  if (product.quantity <= product.minStockLevel) {
    return { label: 'Sottoscorta', className: 'bg-amber-100 text-amber-800' };
  }
  return { label: 'Disponibile', className: 'bg-emerald-100 text-emerald-800' };
}

function ColorFolder({
  product,
  color,
  isOpen,
  onToggle,
  canManageStock,
  onAdjustVariant,
}: {
  product: Product;
  color: string;
  isOpen: boolean;
  onToggle: () => void;
  canManageStock: boolean;
  onAdjustVariant: InventoryTableProps['onAdjustVariant'];
}) {
  const colorTotal = product.sizes.reduce((sum, size) => sum + (product.variants[variantKey(color, size)] || 0), 0);

  const handleAdjust = (key: string, currentQty: number, rawValue: string) => {
    const safeNew = Math.max(0, Math.floor(Number(rawValue)) || 0);
    if (safeNew === currentQty) return;
    const delta = safeNew - currentQty;
    onAdjustVariant({
      productId: product.id,
      variantKey: key,
      type: delta > 0 ? 'in' : 'out',
      quantity: Math.abs(delta),
      reason: 'Rettifica inventario',
    });
  };

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center gap-2 w-full text-left py-1.5 px-2 rounded-lg hover:bg-white dark:hover:bg-slate-800/60 transition-colors"
      >
        {isOpen ? <CaretDown size={13} className="text-slate-400" /> : <CaretRight size={13} className="text-slate-400" />}
        {isOpen ? (
          <FolderOpen size={15} className="text-brand-500" />
        ) : (
          <Folder size={15} className="text-slate-400 dark:text-slate-500" />
        )}
        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{color}</span>
        <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">{colorTotal} pz</span>
      </button>
      {isOpen && (
        <div className="pl-8 py-1 space-y-0.5">
          {sortSizes(product.sizes).map((size) => {
            const key = variantKey(color, size);
            const qty = product.variants[key] || 0;
            return (
              <div key={key} className="flex items-center justify-between gap-3 py-1 pr-2">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Taglia {size}</span>
                {canManageStock ? (
                  <input
                    key={`${key}-${qty}`}
                    type="number"
                    min={0}
                    defaultValue={qty}
                    onBlur={(e) => handleAdjust(key, qty, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                    }}
                    className="w-16 text-center px-1.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-xs font-bold outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-900/40"
                  />
                ) : (
                  <span className="w-16 text-center px-1.5 py-1 text-slate-600 dark:text-slate-300 text-xs font-bold">{qty}</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ProductCard({
  product,
  soldCount,
  isAdmin,
  canManageStock,
  confirmDeleteId,
  setConfirmDeleteId,
  onEdit,
  onDelete,
  onAdjustVariant,
  onQuickSell,
}: {
  product: Product;
  soldCount: number;
  isAdmin: boolean;
  canManageStock: boolean;
  confirmDeleteId: string | null;
  setConfirmDeleteId: (id: string | null) => void;
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
  onAdjustVariant: InventoryTableProps['onAdjustVariant'];
  onQuickSell: (productId: string) => void;
}) {
  const status = getStockStatus(product);
  const hasVariants = product.sizes.length > 0 && product.colors.length > 0;

  const handleAdjust = (key: string, currentQty: number, rawValue: string) => {
    const safeNew = Math.max(0, Math.floor(Number(rawValue)) || 0);
    if (safeNew === currentQty) return;
    const delta = safeNew - currentQty;
    onAdjustVariant({
      productId: product.id,
      variantKey: key,
      type: delta > 0 ? 'in' : 'out',
      quantity: Math.abs(delta),
      reason: 'Rettifica inventario',
    });
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-softer flex flex-col">
      <div className="relative aspect-square bg-slate-100 dark:bg-slate-800">
        {product.images?.[0] ? (
          <img src={product.images[0]} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-700">
            <Package size={40} />
          </div>
        )}
        <span className="absolute top-2 left-2 text-[10px] font-extrabold uppercase tracking-wide px-2 py-1 rounded-full bg-slate-900/80 text-white">
          {product.category}
        </span>
        <span className={`absolute top-2 right-2 text-[10px] font-extrabold uppercase tracking-wide px-2 py-1 rounded-full ${status.className}`}>
          {status.label}
        </span>
      </div>

      <div className="p-4 flex flex-col gap-3 flex-1">
        <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
          <span>SKU {product.sku}</span>
          <span className="flex items-center gap-1 text-brand-600 dark:text-brand-400">
            <TrendUp size={13} /> {soldCount} venduti
          </span>
        </div>

        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-extrabold text-slate-900 dark:text-white leading-snug">{product.name}</h3>
          <span className="text-base font-extrabold text-slate-900 dark:text-white shrink-0">{formatCurrency(product.salePrice)}</span>
        </div>

        {hasVariants ? (
          <div className="space-y-2.5">
            <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Varianti per colore</p>
            {product.colors.map((color) => {
              const colorTotal = product.sizes.reduce((sum, size) => sum + (product.variants[variantKey(color, size)] || 0), 0);
              return (
                <div key={color} className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-2.5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-extrabold text-slate-700 dark:text-slate-200">{color}</span>
                    <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500">Pezzi: {colorTotal}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {sortSizes(product.sizes).map((size) => {
                      const key = variantKey(color, size);
                      const qty = product.variants[key] || 0;
                      return (
                        <div
                          key={key}
                          className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-1.5 py-1"
                        >
                          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">{size}</span>
                          {canManageStock ? (
                            <input
                              key={`${key}-${qty}`}
                              type="number"
                              min={0}
                              defaultValue={qty}
                              onBlur={(e) => handleAdjust(key, qty, e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                              }}
                              className="w-9 text-center bg-transparent text-slate-900 dark:text-slate-100 text-xs font-bold outline-none"
                            />
                          ) : (
                            <span className="w-9 text-center text-slate-600 dark:text-slate-300 text-xs font-bold">{qty}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}

        <div className="flex items-center justify-between pt-1 mt-auto">
          <div>
            <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Giacenza tot</p>
            <p className="text-lg font-extrabold text-slate-900 dark:text-white">{product.quantity}</p>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => onEdit(product)}
                className="p-2 text-slate-400 dark:text-slate-500 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-500/10 rounded-lg transition-colors"
                title="Modifica"
              >
                <PencilSimple size={15} />
              </button>
              {confirmDeleteId === product.id ? (
                <>
                  <button
                    onClick={() => {
                      onDelete(product.id);
                      setConfirmDeleteId(null);
                    }}
                    className="text-xs font-bold text-red-600 dark:text-red-400 px-2 hover:underline whitespace-nowrap"
                  >
                    Conferma
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(null)}
                    className="text-xs font-bold text-slate-400 dark:text-slate-500 px-2 hover:underline"
                  >
                    Annulla
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setConfirmDeleteId(product.id)}
                  className="p-2 text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                  title="Elimina"
                >
                  <Trash size={15} />
                </button>
              )}
            </div>
          )}
        </div>

        <button
          onClick={() => onQuickSell(product.id)}
          disabled={product.quantity === 0}
          className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none text-white font-bold py-2.5 rounded-xl text-sm shadow-card transition-all duration-150"
        >
          <ShoppingBag size={16} /> Vendi questo capo
        </button>
      </div>
    </div>
  );
}

export default function InventoryTable({
  products,
  sales,
  isAdmin,
  canManageStock,
  onEdit,
  onDelete,
  onAdd,
  onAdjustVariant,
  onQuickSell,
}: InventoryTableProps) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Tutte');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  const [expandedColors, setExpandedColors] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  const categories = useMemo(() => ['Tutte', ...Array.from(new Set(products.map((p) => p.category)))], [products]);

  const soldByProduct = useMemo(() => {
    const map = new Map<string, number>();
    sales.forEach((s) => map.set(s.productId, (map.get(s.productId) || 0) + s.quantity));
    return map;
  }, [sales]);

  const filtered = products.filter((p) => {
    const matchesSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === 'Tutte' || p.category === category;
    return matchesSearch && matchesCategory;
  });

  const toggleProduct = (id: string) => {
    setExpandedProducts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleColor = (productId: string, color: string) => {
    const key = `${productId}::${color}`;
    setExpandedColors((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">Magazzino</h2>
          <p className="text-sm text-slate-400 dark:text-slate-500 font-medium mt-0.5">{products.length} prodotti in catalogo</p>
        </div>
        {isAdmin && (
          <button
            onClick={onAdd}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 active:scale-[0.98] text-white font-bold px-4 py-2.5 rounded-xl text-sm w-fit shadow-card transition-all duration-150"
          >
            <Plus size={16} /> Nuovo prodotto
          </button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <MagnifyingGlass size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca per nome o SKU..."
            className="w-full pl-10 pr-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-100 dark:focus:ring-brand-900/40"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-100 dark:focus:ring-brand-900/40"
        >
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1 shrink-0">
          <button
            type="button"
            onClick={() => setViewMode('table')}
            title="Vista tabella"
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'table'
                ? 'bg-brand-600 text-white'
                : 'text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Rows size={16} />
          </button>
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            title="Vista schede"
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'grid'
                ? 'bg-brand-600 text-white'
                : 'text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <SquaresFour size={16} />
          </button>
        </div>
      </div>

      {viewMode === 'grid' ? (
        filtered.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl py-16 flex flex-col items-center gap-2 text-slate-300 dark:text-slate-700">
            <Package size={32} />
            <p className="text-sm text-slate-400 dark:text-slate-500 font-semibold">Nessun prodotto trovato.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                soldCount={soldByProduct.get(product.id) || 0}
                isAdmin={isAdmin}
                canManageStock={canManageStock}
                confirmDeleteId={confirmDeleteId}
                setConfirmDeleteId={setConfirmDeleteId}
                onEdit={onEdit}
                onDelete={onDelete}
                onAdjustVariant={onAdjustVariant}
                onQuickSell={onQuickSell}
              />
            ))}
          </div>
        )
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-softer">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50/80 dark:bg-slate-800/40">
                <tr>
                  <th className="w-8 px-2 py-3.5" />
                  <th className="text-left px-4 py-3.5 font-bold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide">
                    Prodotto
                  </th>
                  <th className="text-left px-4 py-3.5 font-bold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide">
                    SKU
                  </th>
                  <th className="text-left px-4 py-3.5 font-bold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide">
                    Categoria
                  </th>
                  <th className="text-right px-4 py-3.5 font-bold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide">
                    Prezzo
                  </th>
                  <th className="text-right px-4 py-3.5 font-bold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide">
                    Quantità
                  </th>
                  <th className="text-right px-4 py-3.5 font-bold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide">
                    Azioni
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((product) => {
                  const lowStock = product.quantity <= product.minStockLevel;
                  const hasVariants = product.sizes.length > 0 && product.colors.length > 0;
                  const isExpanded = expandedProducts.has(product.id);
                  return (
                    <React.Fragment key={product.id}>
                      <tr className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-2 py-3.5">
                          {hasVariants && (
                            <button
                              type="button"
                              onClick={() => toggleProduct(product.id)}
                              className="p-1 text-slate-400 dark:text-slate-500 hover:text-brand-600 dark:hover:text-brand-400 rounded transition-colors"
                              title={isExpanded ? 'Comprimi' : 'Mostra taglie e colori'}
                            >
                              {isExpanded ? <CaretDown size={16} /> : <CaretRight size={16} />}
                            </button>
                          )}
                        </td>
                        <td
                          className={`px-4 py-3.5 font-bold text-slate-900 dark:text-white ${hasVariants ? 'cursor-pointer' : ''}`}
                          onClick={hasVariants ? () => toggleProduct(product.id) : undefined}
                        >
                          <div className="flex items-center gap-3">
                            {product.images?.[0] ? (
                              <img
                                src={product.images[0]}
                                alt=""
                                className="w-9 h-9 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0" />
                            )}
                            {product.name}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-slate-400 dark:text-slate-500 font-medium">{product.sku}</td>
                        <td className="px-4 py-3.5">
                          <span className="text-xs font-bold text-slate-500 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full">
                            {product.category}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right font-bold text-slate-700 dark:text-slate-200">
                          {formatCurrency(product.salePrice)}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <span
                            className={`inline-flex items-center gap-1 font-extrabold px-2.5 py-1 rounded-full text-xs ${
                              lowStock
                                ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400'
                                : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                            }`}
                          >
                            {lowStock && <Warning size={12} />}
                            {product.quantity}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex justify-end gap-1">
                            {isAdmin && (
                              <button
                                onClick={() => onEdit(product)}
                                className="p-2 text-slate-400 dark:text-slate-500 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-500/10 rounded-lg transition-colors"
                                title="Modifica"
                              >
                                <PencilSimple size={15} />
                              </button>
                            )}
                            {isAdmin &&
                              (confirmDeleteId === product.id ? (
                                <>
                                  <button
                                    onClick={() => {
                                      onDelete(product.id);
                                      setConfirmDeleteId(null);
                                    }}
                                    className="text-xs font-bold text-red-600 dark:text-red-400 px-2 hover:underline"
                                  >
                                    Conferma
                                  </button>
                                  <button
                                    onClick={() => setConfirmDeleteId(null)}
                                    className="text-xs font-bold text-slate-400 dark:text-slate-500 px-2 hover:underline"
                                  >
                                    Annulla
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => setConfirmDeleteId(product.id)}
                                  className="p-2 text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                                  title="Elimina"
                                >
                                  <Trash size={15} />
                                </button>
                              ))}
                          </div>
                        </td>
                      </tr>
                      {hasVariants && isExpanded && (
                        <tr className="border-t border-slate-100 dark:border-slate-800">
                          <td colSpan={7} className="p-0 bg-slate-50/60 dark:bg-slate-950/40">
                            <div className="px-4 py-3 pl-12 space-y-0.5 max-w-sm">
                              {product.colors.map((color) => (
                                <ColorFolder
                                  key={color}
                                  product={product}
                                  color={color}
                                  isOpen={expandedColors.has(`${product.id}::${color}`)}
                                  onToggle={() => toggleColor(product.id, color)}
                                  canManageStock={canManageStock}
                                  onAdjustVariant={onAdjustVariant}
                                />
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-16 text-center">
                      <div className="flex flex-col items-center gap-2 text-slate-300 dark:text-slate-700">
                        <Package size={32} />
                        <p className="text-sm text-slate-400 dark:text-slate-500 font-semibold">Nessun prodotto trovato.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
