import React, { useMemo, useState } from 'react';
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  AlertTriangle,
  PackageSearch,
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
} from 'lucide-react';
import { formatCurrency, sortSizes, variantKey } from '../constants';
import { MovementType, Product } from '../types';

interface InventoryTableProps {
  products: Product[];
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
        {isOpen ? <ChevronDown size={13} className="text-slate-400" /> : <ChevronRight size={13} className="text-slate-400" />}
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

export default function InventoryTable({
  products,
  isAdmin,
  canManageStock,
  onEdit,
  onDelete,
  onAdd,
  onAdjustVariant,
}: InventoryTableProps) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Tutte');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  const [expandedColors, setExpandedColors] = useState<Set<string>>(new Set());

  const categories = useMemo(() => ['Tutte', ...Array.from(new Set(products.map((p) => p.category)))], [products]);

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
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
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
      </div>

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
                            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
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
                          {lowStock && <AlertTriangle size={12} />}
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
                              <Pencil size={15} />
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
                                <Trash2 size={15} />
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
                      <PackageSearch size={32} strokeWidth={1.5} />
                      <p className="text-sm text-slate-400 dark:text-slate-500 font-semibold">Nessun prodotto trovato.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
