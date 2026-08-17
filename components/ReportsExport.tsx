import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FileArrowDown, ClipboardText, Receipt, QrCode } from '@phosphor-icons/react';
import { exportInventoryToPDF, exportSalesToPDF } from '../utils/pdfExport';
import { exportQrLabels } from '../utils/labelExport';
import { PaymentMethod, Product, Sale } from '../types';

interface ReportsExportProps {
  products: Product[];
  sales: Sale[];
}

const inputClass =
  'w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:bg-white dark:focus:bg-slate-800 focus:border-brand-400 focus:ring-4 focus:ring-brand-100 dark:focus:ring-brand-900/40';
const labelClass = 'block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5';
const checkboxLabelClass = 'flex items-center gap-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 cursor-pointer';
const checkboxClass = 'w-4 h-4 rounded accent-brand-600';

export default function ReportsExport({ products, sales }: ReportsExportProps) {
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [includePrices, setIncludePrices] = useState(true);
  const [includeVariants, setIncludeVariants] = useState(true);
  const [inventoryBusy, setInventoryBusy] = useState(false);

  const availableCategories = useMemo(
    () => Array.from(new Set(products.map((p) => p.category))).filter(Boolean).sort(),
    [products]
  );
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const categoriesInitialized = useRef(false);
  useEffect(() => {
    if (!categoriesInitialized.current && availableCategories.length > 0) {
      setSelectedCategories(availableCategories);
      categoriesInitialized.current = true;
    }
  }, [availableCategories]);
  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) => (prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]));
  };

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'all' | PaymentMethod>('all');
  const [salesBusy, setSalesBusy] = useState(false);

  const [labelProductId, setLabelProductId] = useState('');
  const [labelBusy, setLabelBusy] = useState(false);
  const [labelError, setLabelError] = useState<string | null>(null);

  const handleInventoryExport = async () => {
    setInventoryBusy(true);
    try {
      await exportInventoryToPDF(products, { onlyInStock, includePrices, includeVariants, categories: selectedCategories });
    } finally {
      setInventoryBusy(false);
    }
  };

  const handleSalesExport = async () => {
    setSalesBusy(true);
    try {
      await exportSalesToPDF(sales, products, { from: from || null, to: to || null, paymentMethod });
    } finally {
      setSalesBusy(false);
    }
  };

  const handleLabelsExport = async () => {
    setLabelBusy(true);
    setLabelError(null);
    try {
      const target = labelProductId ? products.filter((p) => p.id === labelProductId) : products;
      await exportQrLabels(target);
    } catch (err) {
      setLabelError((err as Error).message || 'Errore nella generazione delle etichette.');
    } finally {
      setLabelBusy(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">Report</h2>
        <p className="text-sm text-slate-400 dark:text-slate-500 font-medium mt-0.5">Esporta i dati del magazzino in PDF</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 max-w-5xl">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-softer">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
              <ClipboardText size={17} />
            </div>
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Report inventario</h3>
          </div>
          <div className="space-y-2.5">
            <label className={checkboxLabelClass}>
              <input type="checkbox" checked={onlyInStock} onChange={(e) => setOnlyInStock(e.target.checked)} className={checkboxClass} />
              Solo prodotti disponibili
            </label>
            <label className={checkboxLabelClass}>
              <input type="checkbox" checked={includePrices} onChange={(e) => setIncludePrices(e.target.checked)} className={checkboxClass} />
              Includi prezzi
            </label>
            <label className={checkboxLabelClass}>
              <input
                type="checkbox"
                checked={includeVariants}
                onChange={(e) => setIncludeVariants(e.target.checked)}
                className={checkboxClass}
              />
              Includi dettaglio varianti
            </label>
          </div>
          {availableCategories.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className={labelClass + ' mb-0'}>Categorie</label>
                <div className="flex gap-2 text-[11px] font-bold">
                  <button type="button" onClick={() => setSelectedCategories(availableCategories)} className="text-brand-600 dark:text-brand-400 hover:underline">
                    Tutte
                  </button>
                  <button type="button" onClick={() => setSelectedCategories([])} className="text-slate-400 dark:text-slate-500 hover:underline">
                    Nessuna
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {availableCategories.map((category) => {
                  const checked = selectedCategories.includes(category);
                  return (
                    <label
                      key={category}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border transition ${
                        checked
                          ? 'bg-brand-50 dark:bg-brand-500/10 border-brand-300 dark:border-brand-800 text-brand-700 dark:text-brand-300'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      <input type="checkbox" checked={checked} onChange={() => toggleCategory(category)} className={checkboxClass} />
                      {category}
                    </label>
                  );
                })}
              </div>
            </div>
          )}
          <button
            onClick={handleInventoryExport}
            disabled={inventoryBusy || selectedCategories.length === 0}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 active:scale-[0.98] text-white font-bold px-4 py-2.5 rounded-xl text-sm shadow-card transition-all duration-150 disabled:opacity-50"
          >
            <FileArrowDown size={16} /> {inventoryBusy ? 'Generazione...' : 'Esporta inventario PDF'}
          </button>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-softer">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
              <Receipt size={17} />
            </div>
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Report vendite</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Dal</label>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Al</label>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputClass} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Metodo di pagamento</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as 'all' | PaymentMethod)}
              className={inputClass}
            >
              <option value="all">Tutti</option>
              <option value="contanti">Contanti</option>
              <option value="carta">Carta</option>
            </select>
          </div>
          <button
            onClick={handleSalesExport}
            disabled={salesBusy}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 active:scale-[0.98] text-white font-bold px-4 py-2.5 rounded-xl text-sm shadow-card transition-all duration-150 disabled:opacity-50"
          >
            <FileArrowDown size={16} /> {salesBusy ? 'Generazione...' : 'Esporta vendite PDF'}
          </button>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-softer">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
              <QrCode size={17} />
            </div>
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Etichette QR</h3>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-medium leading-relaxed">
            Genera etichette 40×30mm (QR + SKU + colore/taglia + prezzo) per la stampante Phomemo: un'immagine per ogni
            variante con scorta disponibile. Scarica lo ZIP, estrailo sul telefono e importa le immagini nell'app Phomemo
            per stampare. Scansionando il QR si apre direttamente la vendita già compilata.
          </p>
          <div>
            <label className={labelClass}>Prodotto</label>
            <select value={labelProductId} onChange={(e) => setLabelProductId(e.target.value)} className={inputClass}>
              <option value="">Tutti i prodotti con scorta disponibile</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku})
                </option>
              ))}
            </select>
          </div>
          {labelError && (
            <p className="text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-900/40 rounded-lg px-3 py-2">
              {labelError}
            </p>
          )}
          <button
            onClick={handleLabelsExport}
            disabled={labelBusy}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 active:scale-[0.98] text-white font-bold px-4 py-2.5 rounded-xl text-sm shadow-card transition-all duration-150 disabled:opacity-50"
          >
            <FileArrowDown size={16} /> {labelBusy ? 'Generazione...' : 'Genera etichette (ZIP)'}
          </button>
        </div>
      </div>
    </div>
  );
}
