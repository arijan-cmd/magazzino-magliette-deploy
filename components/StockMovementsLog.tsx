import React, { useMemo, useState } from 'react';
import { ArrowDownCircle, ArrowUpCircle, ShoppingCart, Undo2, History } from 'lucide-react';
import { formatDate } from '../constants';
import { MovementType, StockMovement } from '../types';

interface StockMovementsLogProps {
  movements: StockMovement[];
}

const TYPE_META: Record<MovementType, { label: string; icon: React.ComponentType<{ size?: number }>; color: string; sign: string }> = {
  in: { label: 'Carico', icon: ArrowDownCircle, color: 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10', sign: '+' },
  out: { label: 'Scarico', icon: ArrowUpCircle, color: 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-500/10', sign: '-' },
  sale: { label: 'Vendita', icon: ShoppingCart, color: 'text-brand-700 dark:text-brand-400 bg-brand-50 dark:bg-brand-500/10', sign: '-' },
  'sale-cancel': { label: 'Annullo vendita', icon: Undo2, color: 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10', sign: '+' },
};

export default function StockMovementsLog({ movements }: StockMovementsLogProps) {
  const [typeFilter, setTypeFilter] = useState<'all' | MovementType>('all');

  const filtered = useMemo(
    () => (typeFilter === 'all' ? movements : movements.filter((m) => m.type === typeFilter)),
    [movements, typeFilter]
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">Storico movimenti</h3>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as 'all' | MovementType)}
          className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-100 dark:focus:ring-brand-900/40"
        >
          <option value="all">Tutti i tipi</option>
          <option value="in">Carico</option>
          <option value="out">Scarico</option>
          <option value="sale">Vendita</option>
          <option value="sale-cancel">Annullo vendita</option>
        </select>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-softer">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/80 dark:bg-slate-800/40">
              <tr>
                <th className="text-left px-4 py-3.5 font-bold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide">Tipo</th>
                <th className="text-left px-4 py-3.5 font-bold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide">
                  Prodotto
                </th>
                <th className="text-left px-4 py-3.5 font-bold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide">
                  Motivo
                </th>
                <th className="text-right px-4 py-3.5 font-bold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide">
                  Quantità
                </th>
                <th className="text-left px-4 py-3.5 font-bold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide">
                  Utente
                </th>
                <th className="text-left px-4 py-3.5 font-bold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide">
                  Data
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => {
                const meta = TYPE_META[m.type];
                const Icon = meta.icon;
                return (
                  <tr
                    key={m.id}
                    className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 font-bold px-2.5 py-1 rounded-full text-xs ${meta.color}`}>
                        <Icon size={12} /> {meta.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                      {m.productName}
                      {m.variantKey && (
                        <span className="text-slate-400 dark:text-slate-500 font-medium"> · {m.variantKey.replace('-', ' / ')}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 font-medium">{m.reason}</td>
                    <td className="px-4 py-3 text-right font-extrabold text-slate-700 dark:text-slate-200">
                      {meta.sign}
                      {m.quantity}
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 font-medium">{m.userName}</td>
                    <td className="px-4 py-3 text-slate-400 dark:text-slate-500 font-medium">{formatDate(m.createdAt)}</td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-300 dark:text-slate-700">
                      <History size={32} strokeWidth={1.5} />
                      <p className="text-sm text-slate-400 dark:text-slate-500 font-semibold">Nessun movimento registrato.</p>
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
