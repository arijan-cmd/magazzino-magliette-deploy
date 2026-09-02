import React, { useState } from 'react';
import { Plus, X } from '@phosphor-icons/react';

const inputClass =
  'w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:bg-white dark:focus:bg-slate-800 focus:border-brand-400 focus:ring-4 focus:ring-brand-100 dark:focus:ring-brand-900/40';
const labelClass = 'block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5';

interface VariantSelectProps {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  options: string[];
}

export default function VariantSelect({ label, values, onChange, options }: VariantSelectProps) {
  const [addingNew, setAddingNew] = useState(false);
  const [draft, setDraft] = useState('');

  const availableOptions = options.filter((o) => !values.includes(o));

  const add = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || values.includes(trimmed)) return;
    onChange([...values, trimmed]);
  };

  const confirmNew = () => {
    add(draft);
    setDraft('');
    setAddingNew(false);
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

      {addingNew ? (
        <div className="flex gap-2">
          <input
            type="text"
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                confirmNew();
              }
              if (e.key === 'Escape') {
                setDraft('');
                setAddingNew(false);
              }
            }}
            placeholder={`Nuovo/a ${label.toLowerCase()}...`}
            className={inputClass + ' py-2'}
          />
          <button
            type="button"
            onClick={confirmNew}
            className="px-3.5 py-2 bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-xl text-xs font-bold flex items-center gap-1 shrink-0 transition"
          >
            <Plus size={14} /> Aggiungi
          </button>
          <button
            type="button"
            onClick={() => {
              setDraft('');
              setAddingNew(false);
            }}
            className="px-3 py-2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 text-xs font-bold shrink-0"
          >
            Annulla
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <select
            value=""
            onChange={(e) => {
              if (e.target.value) add(e.target.value);
            }}
            className={inputClass}
          >
            <option value="">{availableOptions.length > 0 ? 'Seleziona per aggiungere...' : 'Nessun altro valore disponibile'}</option>
            {availableOptions.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setAddingNew(true)}
            className="px-3.5 py-2 bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-xl text-xs font-bold flex items-center gap-1 shrink-0 transition whitespace-nowrap"
          >
            <Plus size={14} /> Nuovo/a
          </button>
        </div>
      )}
    </div>
  );
}
