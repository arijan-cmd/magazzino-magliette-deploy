import React, { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { TrendDown, TrendUp, ChartLineUp } from '@phosphor-icons/react';
import { formatCurrency, sortSizes } from '../constants';
import { useDarkMode } from '../hooks/useDarkMode';
import { Product, Sale, StockMovement } from '../types';

interface StatsViewProps {
  sales: Sale[];
  products: Product[];
  movements: StockMovement[];
}

type Period = '30d' | '6m' | 'all';

const PERIODS: { value: Period; label: string }[] = [
  { value: '30d', label: '30 giorni' },
  { value: '6m', label: '6 mesi' },
  { value: 'all', label: 'Sempre' },
];

const NEON = {
  cyan: '#22e4f0',
  green: '#34f0b0',
  blue: '#4c7dff',
  violet: '#a58bff',
  amber: '#ffb86b',
  rose: '#ff6b8a',
};
const CATEGORY_COLORS = [NEON.cyan, NEON.violet, NEON.amber, NEON.green, NEON.blue, NEON.rose];

const COLOR_SWATCH: Record<string, string> = {
  nero: '#15151c',
  bianco: '#f2f2f5',
  beige: '#d9c3a0',
  denim: '#4a6a99',
  grigio: '#8b8f9a',
  rosso: '#d94452',
  blu: '#2f5fd0',
  azzurro: '#6bb7ff',
  verde: '#2f9e6a',
  rosa: '#f29ac0',
  giallo: '#f2cf4a',
  arancione: '#f08a3c',
  viola: '#8a5bd6',
  marrone: '#7a5638',
  panna: '#f1e6cf',
};

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
const MONTHS_SHORT = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];

const gross = (s: Sale) => s.quantity * s.unitPrice;
const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
const monthKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}`;

function periodStart(period: Period, now: Date): Date | null {
  if (period === '30d') {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    d.setDate(d.getDate() - 29);
    return d;
  }
  if (period === '6m') return new Date(now.getFullYear(), now.getMonth() - 5, 1);
  return null;
}

function previousStart(period: Period, start: Date | null): Date | null {
  if (!start) return null;
  if (period === '30d') {
    const d = new Date(start);
    d.setDate(d.getDate() - 30);
    return d;
  }
  return new Date(start.getFullYear(), start.getMonth() - 6, 1);
}

function splitVariant(key: string | null): { color: string; size: string } | null {
  if (!key) return null;
  const i = key.lastIndexOf('-');
  if (i <= 0) return null;
  return { color: key.slice(0, i).trim(), size: key.slice(i + 1).trim() };
}

function titleCase(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}


function tooltipStyles(isDark: boolean) {
  const text = isDark ? '#e8ecff' : '#0f172a';
  return {
    contentStyle: {
      borderRadius: 12,
      border: isDark ? '1px solid #2d3aa6' : '1px solid #e2e8f0',
      background: isDark ? '#0d1360' : '#ffffff',
      color: text,
      fontSize: 12,
    },
    labelStyle: { color: text, fontWeight: 700 },
    itemStyle: { color: text },
  };
}

function Card({ title, hint, children, className = '' }: { title: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`bg-white dark:bg-night-900 border border-slate-200/80 dark:border-night-800 rounded-2xl p-5 shadow-softer min-w-0 ${className}`}
    >
      <div className="flex items-baseline justify-between gap-2 mb-4">
        <h3 className="text-sm font-bold text-slate-500 dark:text-night-400">{title}</h3>
        {hint && <span className="text-[11px] font-semibold text-slate-400 dark:text-night-500">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function Delta({ current, previous }: { current: number; previous: number | null }) {
  if (previous === null) return <span className="text-xs font-semibold text-slate-400 dark:text-night-500">Dall'inizio</span>;
  if (previous === 0) return <span className="text-xs font-semibold text-slate-400 dark:text-night-500">Nessun dato nel periodo precedente</span>;
  const pct = ((current - previous) / previous) * 100;
  const up = pct >= 0;
  const Icon = up ? TrendUp : TrendDown;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-bold ${up ? 'text-emerald-600 dark:text-neon-green' : 'text-rose-600 dark:text-rose-300'}`}>
      <Icon size={13} weight="bold" />
      {up ? '+' : ''}
      {Math.round(pct)}% sul periodo precedente
    </span>
  );
}

function StatCard({ label, value, current, previous }: { label: string; value: string; current: number; previous: number | null }) {
  return (
    <div className="bg-white dark:bg-night-900 border border-slate-200/80 dark:border-night-800 rounded-2xl p-5 shadow-softer min-w-0">
      <p className="text-xs font-bold text-slate-400 dark:text-night-400 uppercase tracking-wide">{label}</p>
      <p className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1 mb-1.5 tracking-tight truncate">{value}</p>
      <Delta current={current} previous={previous} />
    </div>
  );
}

function Ring({ value, color, label, sub }: { value: number | null; color: string; label: string; sub?: string }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const pct = value === null ? 0 : Math.max(0, Math.min(100, value));
  return (
    <div className="text-center min-w-0">
      <svg viewBox="0 0 90 90" width="88" height="88" className="mx-auto" role="img" aria-label={`${label}: ${value === null ? 'nessun dato' : `${Math.round(pct)} per cento`}`}>
        <circle cx="45" cy="45" r={r} fill="none" stroke="currentColor" className="text-slate-200 dark:text-night-700" strokeWidth="9" />
        <circle
          cx="45"
          cy="45"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={`${(c * pct) / 100} ${c}`}
          transform="rotate(-90 45 45)"
          style={{ filter: `drop-shadow(0 0 5px ${color}aa)` }}
        />
        <text x="45" y="51" textAnchor="middle" fontSize="18" fontWeight="800" className="fill-slate-900 dark:fill-white">
          {value === null ? '—' : `${Math.round(pct)}%`}
        </text>
      </svg>
      <p className="text-xs font-bold text-slate-600 dark:text-night-300 mt-1.5">{label}</p>
      {sub && <p className="text-[11px] font-medium text-slate-400 dark:text-night-500">{sub}</p>}
    </div>
  );
}

function BarRow({ label, value, max, swatch }: { label: string; value: number; max: number; swatch?: string }) {
  return (
    <div className="mb-3 last:mb-0">
      <div className="flex justify-between gap-3 text-[13px] font-semibold text-slate-700 dark:text-night-200 mb-1.5">
        <span className="truncate flex items-center gap-2">
          {swatch && <i className="inline-block w-3 h-3 rounded border border-slate-300 dark:border-white/40 shrink-0" style={{ background: swatch }} />}
          {label}
        </span>
        <b className="text-slate-900 dark:text-white">{value}</b>
      </div>
      <div className="h-2.5 rounded-full bg-slate-100 dark:bg-night-700/60 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand-500 to-neon-cyan"
          style={{ width: `${max > 0 ? Math.max(3, (value / max) * 100) : 0}%`, boxShadow: '0 0 10px rgba(34,228,240,0.4)' }}
        />
      </div>
    </div>
  );
}

function Histogram({ data, id, height = 190, unit = 'Vendite' }: { data: { label: string; value: number }[]; id: string; height?: number; unit?: string }) {
  const isDark = useDarkMode();
  const max = Math.max(...data.map((d) => d.value), 0);
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 18, right: 4, left: 4, bottom: 0 }}>
          <defs>
            <linearGradient id={`${id}-base`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4c7dff" />
              <stop offset="100%" stopColor="#2a3ab8" />
            </linearGradient>
            <linearGradient id={`${id}-hot`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#34f0b0" />
              <stop offset="55%" stopColor="#22e4f0" />
              <stop offset="100%" stopColor="#4c7dff" />
            </linearGradient>
          </defs>
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9aa8e0' }} axisLine={false} tickLine={false} interval={0} />
          <YAxis hide domain={[0, 'dataMax']} />
          <Tooltip
            cursor={{ fill: 'rgba(120,150,255,0.10)' }}
            {...tooltipStyles(isDark)}
            formatter={(v) => [String(v), unit]}
          />
          <Bar dataKey="value" radius={[8, 8, 3, 3]} maxBarSize={44}>
            {data.map((d, i) => (
              <Cell key={i} fill={`url(#${id}-${max > 0 && d.value === max ? 'hot' : 'base'})`} />
            ))}
            <LabelList dataKey="value" position="top" style={{ fontSize: 12, fontWeight: 700, fill: isDark ? '#e8ecff' : '#334155' }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function StatsView({ sales, products, movements }: StatsViewProps) {
  const isDark = useDarkMode();
  const [period, setPeriod] = useState<Period>('all');
  const [category, setCategory] = useState<string>('Tutte');

  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const categoryOf = (productId: string) => productById.get(productId)?.category || 'Altro';

  const stats = useMemo(() => {
    const now = new Date();
    const start = periodStart(period, now);
    const prevStart = previousStart(period, start);

    const byCategory = sales.filter((s) => category === 'Tutte' || categoryOf(s.productId) === category);
    const inRange = (s: Sale, from: Date | null, to: Date | null) => {
      const t = new Date(s.createdAt).getTime();
      return (!from || t >= from.getTime()) && (!to || t < to.getTime());
    };
    const current = byCategory.filter((s) => inRange(s, start, null));
    const previous = start && prevStart ? byCategory.filter((s) => inRange(s, prevStart, start)) : null;

    const sum = (list: Sale[]) => list.reduce((a, s) => a + gross(s), 0);
    const units = (list: Sale[]) => list.reduce((a, s) => a + s.quantity, 0);
    const totals = {
      revenue: sum(current),
      count: current.length,
      avg: current.length ? sum(current) / current.length : 0,
      units: units(current),
    };
    const prevTotals = previous
      ? { revenue: sum(previous), count: previous.length, avg: previous.length ? sum(previous) / previous.length : 0, units: units(previous) }
      : null;

    // Serie temporale degli incassi
    let series: { label: string; incassi: number }[] = [];
    if (period === '30d' && start) {
      const buckets = new Map<string, number>();
      current.forEach((s) => {
        const k = dayKey(new Date(s.createdAt));
        buckets.set(k, (buckets.get(k) || 0) + gross(s));
      });
      for (let i = 0; i < 30; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        series.push({ label: `${d.getDate()}/${d.getMonth() + 1}`, incassi: buckets.get(dayKey(d)) || 0 });
      }
    } else {
      const first = current.length ? new Date(Math.min(...current.map((s) => new Date(s.createdAt).getTime()))) : now;
      const from = start || new Date(first.getFullYear(), first.getMonth(), 1);
      const buckets = new Map<string, number>();
      current.forEach((s) => {
        const k = monthKey(new Date(s.createdAt));
        buckets.set(k, (buckets.get(k) || 0) + gross(s));
      });
      const cursor = new Date(from.getFullYear(), from.getMonth(), 1);
      while (cursor <= now) {
        series.push({
          label: `${MONTHS_SHORT[cursor.getMonth()]}${cursor.getFullYear() !== now.getFullYear() ? ` ${String(cursor.getFullYear()).slice(2)}` : ''}`,
          incassi: buckets.get(monthKey(cursor)) || 0,
        });
        cursor.setMonth(cursor.getMonth() + 1);
      }
    }

    // Vendite per mese (ultimi 6 mesi, indipendente dal periodo scelto)
    const monthly: { label: string; value: number }[] = [];
    const monthCounts = new Map<string, number>();
    byCategory.forEach((s) => {
      const k = monthKey(new Date(s.createdAt));
      monthCounts.set(k, (monthCounts.get(k) || 0) + 1);
    });
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthly.push({ label: MONTHS_SHORT[d.getMonth()], value: monthCounts.get(monthKey(d)) || 0 });
    }

    // Vendite per giorno della settimana
    const weekday = WEEKDAYS.map((label) => ({ label, value: 0 }));
    current.forEach((s) => {
      weekday[(new Date(s.createdAt).getDay() + 6) % 7].value += 1;
    });

    // Categorie (quota sugli incassi, ignora il filtro categoria)
    const inPeriodAll = sales.filter((s) => inRange(s, start, null));
    const catRevenue = new Map<string, number>();
    inPeriodAll.forEach((s) => catRevenue.set(categoryOf(s.productId), (catRevenue.get(categoryOf(s.productId)) || 0) + gross(s)));
    const catTotal = [...catRevenue.values()].reduce((a, b) => a + b, 0);
    const categories = [...catRevenue.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name, value], i) => ({ name, value, pct: catTotal ? (value / catTotal) * 100 : 0, color: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }));

    // Prodotti, taglie, colori
    const prodUnits = new Map<string, number>();
    const sizeUnits = new Map<string, number>();
    const colorUnits = new Map<string, number>();
    current.forEach((s) => {
      prodUnits.set(s.productName, (prodUnits.get(s.productName) || 0) + s.quantity);
      const v = splitVariant(s.variantKey);
      if (v) {
        sizeUnits.set(v.size, (sizeUnits.get(v.size) || 0) + s.quantity);
        const ck = v.color.toLowerCase();
        colorUnits.set(ck, (colorUnits.get(ck) || 0) + s.quantity);
      }
    });
    const topProducts = [...prodUnits.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
    const sizes = sortSizes([...sizeUnits.keys()]).map((label) => ({ label, value: sizeUnits.get(label) || 0 }));
    const colors = [...colorUnits.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);

    // Indicatori
    const cardSales = current.filter((s) => s.paymentMethod === 'carta');
    const checked = cardSales.filter((s) => s.receiptStatus);
    const emitted = checked.filter((s) => s.receiptStatus === 'emitted').length;
    const soldProducts = new Set(current.map((s) => s.productId)).size;
    const cancels = movements.filter(
      (m) => m.type === 'sale-cancel' && inRange({ createdAt: m.createdAt } as Sale, start, null) && (category === 'Tutte' || categoryOf(m.productId) === category)
    ).length;
    const rings = {
      receipts: checked.length ? (emitted / checked.length) * 100 : null,
      receiptsSub: checked.length ? `${emitted} su ${checked.length} controllate` : 'nessuna controllata',
      card: current.length ? (cardSales.length / current.length) * 100 : null,
      sold: products.length ? (soldProducts / products.length) * 100 : null,
      soldSub: `${soldProducts} su ${products.length}`,
      cancels: current.length + cancels ? (cancels / (current.length + cancels)) * 100 : null,
      cancelsSub: `${cancels} storni`,
    };

    return { totals, prevTotals, series, monthly, weekday, categories, topProducts, sizes, colors, rings };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sales, products, movements, period, category]);

  const categoryChoices = useMemo(() => {
    const names = new Map<string, number>();
    sales.forEach((s) => names.set(categoryOf(s.productId), (names.get(categoryOf(s.productId)) || 0) + 1));
    return ['Tutte', ...[...names.entries()].sort((a, b) => b[1] - a[1]).map(([n]) => n)];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sales, products]);

  const chip = (active: boolean) =>
    `px-3.5 py-2 min-h-[40px] rounded-lg text-xs font-bold transition ${
      active
        ? 'bg-gradient-to-r from-neon-cyan to-brand-500 text-night-950 shadow-card'
        : 'text-slate-500 dark:text-night-300 hover:bg-slate-100 dark:hover:bg-night-700/50'
    }`;

  const maxProd = stats.topProducts[0]?.[1] || 0;
  const maxColor = stats.colors[0]?.[1] || 0;
  const hasData = stats.totals.count > 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-3 flex-wrap">
            Statistiche
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-400/40">
              Solo admin
            </span>
          </h2>
          <p className="text-sm text-slate-500 dark:text-night-400 mt-0.5">Tutte le vendite registrate sul server</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="flex gap-1 p-1 rounded-xl bg-white dark:bg-night-900 border border-slate-200/80 dark:border-night-800" role="group" aria-label="Periodo">
            {PERIODS.map((p) => (
              <button key={p.value} type="button" onClick={() => setPeriod(p.value)} className={chip(period === p.value)} aria-pressed={period === p.value}>
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1 p-1 rounded-xl bg-white dark:bg-night-900 border border-slate-200/80 dark:border-night-800" role="group" aria-label="Categoria">
            {categoryChoices.map((c) => (
              <button key={c} type="button" onClick={() => setCategory(c)} className={chip(category === c)} aria-pressed={category === c}>
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {!hasData ? (
        <div className="bg-white dark:bg-night-900 border border-slate-200/80 dark:border-night-800 rounded-2xl py-20 flex flex-col items-center gap-2 text-slate-400 dark:text-night-500">
          <ChartLineUp size={36} />
          <p className="text-sm font-semibold">Nessuna vendita nel periodo e nella categoria scelti.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard label="Incassi totali" value={formatCurrency(stats.totals.revenue)} current={stats.totals.revenue} previous={stats.prevTotals?.revenue ?? null} />
            <StatCard label="Vendite registrate" value={String(stats.totals.count)} current={stats.totals.count} previous={stats.prevTotals?.count ?? null} />
            <StatCard label="Scontrino medio" value={formatCurrency(stats.totals.avg)} current={stats.totals.avg} previous={stats.prevTotals?.avg ?? null} />
            <StatCard label="Capi venduti" value={String(stats.totals.units)} current={stats.totals.units} previous={stats.prevTotals?.units ?? null} />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <Card title="Incassi nel tempo" hint={period === '30d' ? 'ultimi 30 giorni' : 'per mese'} className="xl:col-span-2">
              <div className="h-60 neon-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="stArea" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#34f0b0" stopOpacity={0.45} />
                        <stop offset="95%" stopColor="#22e4f0" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="stLine" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#4c7dff" />
                        <stop offset="100%" stopColor="#34f0b0" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9aa8e0' }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={24} />
                    <YAxis tick={{ fontSize: 11, fill: '#9aa8e0' }} axisLine={false} tickLine={false} width={44} tickFormatter={(v) => `${v}€`} />
                    <Tooltip
                      {...tooltipStyles(isDark)}
                      formatter={(v) => [formatCurrency(Number(v)), 'Incassi']}
                    />
                    <Area type="monotone" dataKey="incassi" stroke="url(#stLine)" fill="url(#stArea)" strokeWidth={3} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card title="Indicatori">
              <div className="grid grid-cols-2 gap-x-3 gap-y-5">
                <Ring value={stats.rings.receipts} color={NEON.green} label="Scontrini emessi" sub={stats.rings.receiptsSub} />
                <Ring value={stats.rings.card} color={NEON.cyan} label="Pagati con carta" />
                <Ring value={stats.rings.sold} color="#7aa2ff" label="Prodotti venduti" sub={stats.rings.soldSub} />
                <Ring value={stats.rings.cancels} color={NEON.rose} label="Vendite stornate" sub={stats.rings.cancelsSub} />
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card title="Vendite per mese" hint="ultimi 6 mesi">
              <Histogram id="stMonth" data={stats.monthly} />
            </Card>
            <Card title="Giorni più forti" hint="vendite per giorno">
              <Histogram id="stDay" data={stats.weekday} />
            </Card>
            <Card title="Per categoria" hint="% sugli incassi">
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={stats.categories} dataKey="value" nameKey="name" innerRadius={48} outerRadius={68} paddingAngle={2} stroke="none">
                      {stats.categories.map((c) => (
                        <Cell key={c.name} fill={c.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      {...tooltipStyles(isDark)}
                      formatter={(v, n) => [formatCurrency(Number(v)), String(n)]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 mt-3 text-[13px] font-semibold text-slate-600 dark:text-night-300">
                {stats.categories.map((c) => (
                  <span key={c.name} className="flex items-center gap-1.5">
                    <i className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: c.color }} />
                    {c.name} {Math.round(c.pct)}%
                  </span>
                ))}
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card title="Prodotti più venduti" hint="pezzi">
              {stats.topProducts.map(([name, n]) => (
                <BarRow key={name} label={name} value={n} max={maxProd} />
              ))}
            </Card>
            <Card title="Taglie più vendute" hint="pezzi">
              {stats.sizes.length ? (
                <Histogram id="stSize" data={stats.sizes} height={180} unit="Pezzi" />
              ) : (
                <p className="text-sm text-slate-400 dark:text-night-500">Nessuna variante registrata.</p>
              )}
            </Card>
            <Card title="Colori più venduti" hint="pezzi">
              {stats.colors.length ? (
                stats.colors.map(([name, n]) => (
                  <BarRow key={name} label={titleCase(name)} value={n} max={maxColor} swatch={COLOR_SWATCH[name] || '#8b8f9a'} />
                ))
              ) : (
                <p className="text-sm text-slate-400 dark:text-night-500">Nessuna variante registrata.</p>
              )}
            </Card>
          </div>

          <p className="text-[11px] font-medium text-slate-400 dark:text-night-500 text-right">
            Incassi al lordo delle commissioni. «Scontrini emessi» considera solo le vendite a carta con stato scontrino registrato.
          </p>
        </>
      )}
    </div>
  );
}
