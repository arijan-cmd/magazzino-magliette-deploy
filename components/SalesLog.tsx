import React, { useState } from 'react';
import { Money, CreditCard, Receipt, ArrowUUpLeft } from '@phosphor-icons/react';
import { formatCurrency, formatDate } from '../constants';
import { Sale } from '../types';

interface SalesLogProps {
  sales: Sale[];
  onCancelSale: (sale: Sale) => void;
}

export default function SalesLog({ sales, onCancelSale }: SalesLogProps) {
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);

  return (
    <div>
      <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight mb-4">Storico vendite</h3>

      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-softer">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/80 dark:bg-slate-800/40">
              <tr>
                <th className="text-left px-4 py-3.5 font-bold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide">
                  Prodotto
                </th>
                <th className="text-right px-4 py-3.5 font-bold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide">
                  Q.tà
                </th>
                <th className="text-left px-4 py-3.5 font-bold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide">
                  Pagamento
                </th>
                <th className="text-right px-4 py-3.5 font-bold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide">
                  Totale
                </th>
                <th className="text-left px-4 py-3.5 font-bold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide">
                  Venditore
                </th>
                <th className="text-left px-4 py-3.5 font-bold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide">
                  Data
                </th>
                <th className="text-right px-4 py-3.5 font-bold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide">
                  Azioni
                </th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => (
                <tr
                  key={sale.id}
                  className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                    {sale.productName}
                    {sale.variantKey && (
                      <span className="text-slate-400 dark:text-slate-500 font-medium"> · {sale.variantKey.replace('-', ' / ')}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-extrabold text-slate-700 dark:text-slate-200">{sale.quantity}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1.5 font-bold px-2.5 py-1 rounded-full text-xs ${
                        sale.paymentMethod === 'contanti'
                          ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10'
                          : 'text-sky-700 dark:text-sky-400 bg-sky-50 dark:bg-sky-500/10'
                      }`}
                    >
                      {sale.paymentMethod === 'contanti' ? <Money size={12} /> : <CreditCard size={12} />}
                      {sale.paymentMethod === 'contanti' ? 'Contanti' : 'Carta'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-extrabold text-slate-900 dark:text-white">
                    {formatCurrency(sale.totalPrice)}
                  </td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400 font-medium">{sale.userName}</td>
                  <td className="px-4 py-3 text-slate-400 dark:text-slate-500 font-medium">{formatDate(sale.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      {confirmCancelId === sale.id ? (
                        <>
                          <button
                            onClick={() => {
                              onCancelSale(sale);
                              setConfirmCancelId(null);
                            }}
                            className="text-xs font-bold text-red-600 dark:text-red-400 px-2 hover:underline whitespace-nowrap"
                          >
                            Conferma storno
                          </button>
                          <button
                            onClick={() => setConfirmCancelId(null)}
                            className="text-xs font-bold text-slate-400 dark:text-slate-500 px-2 hover:underline"
                          >
                            Annulla
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setConfirmCancelId(sale.id)}
                          className="p-2 text-slate-400 dark:text-slate-500 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded-lg transition-colors"
                          title="Storna vendita"
                        >
                          <ArrowUUpLeft size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {sales.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-300 dark:text-slate-700">
                      <Receipt size={32} />
                      <p className="text-sm text-slate-400 dark:text-slate-500 font-semibold">Nessuna vendita registrata.</p>
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
