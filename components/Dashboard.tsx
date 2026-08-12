import React, { useMemo, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useDarkMode } from '../hooks/useDarkMode';
import {
  AlertTriangle,
  Package,
  Euro,
  Boxes,
  ShoppingCart,
  ArrowDownCircle,
  ArrowUpCircle,
  Undo2,
  Banknote,
  CreditCard,
  Percent,
  ShoppingBag,
} from 'lucide-react';
import { formatCurrency, formatDate } from '../constants';
import { MovementType, PeriodType, Product, Sale, StockMovement } from '../types';

const PERIOD_LABELS: Record<PeriodType, string> = {
  [PeriodType.TODAY]: 'Oggi',
  [PeriodType.WEEK]: 'Ultimi 7 giorni',
  [PeriodType.MONTH]: 'Questo mese',
  [PeriodType.ALL]: 'Da sempre',
  [PeriodType.CUSTOM]: 'Intervallo personalizzato',
};

interface DashboardProps {
  products: Product[];
  sales: Sale[];
  movements: StockMovement[];
  lowStockProducts: Product[];
}

const MOVEMENT_META: Record<
  MovementType,
  { icon: React.ComponentType<{ size?: number; className?: string }>; color: string }
> = {
  in: { icon: ArrowDownCircle, color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10' },
  out: { icon: ArrowUpCircle, color: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10' },
  sale: { icon: ShoppingCart, color: 'text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-500/10' },
  'sale-cancel': { icon: Undo2, color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10' },
};

function isSameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString();
}

function KpiCard({
  icon: Icon,
  label,
  value,
  tint,
}: {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  value: string;
  tint: string;
}) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 flex items-center gap-4 shadow-softer hover:shadow-card transition-shadow duration-200">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${tint}`}>
        <Icon size={19} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">{label}</p>
        <p className="text-xl font-extrabold text-slate-900 dark:text-white truncate">{value}</p>
      </div>
    </div>
  );
}

export default function Dashboard({ products, sales, movements, lowStockProducts }: DashboardProps) {
  const isDark = useDarkMode();
  const totalProducts = products.length;
  const totalUnits = products.reduce((sum, p) => sum + p.quantity, 0);
  const stockValue = products.reduce((sum, p) => sum + p.quantity * p.purchasePrice, 0);

  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - 6);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const revenueToday = sales
    .filter((s) => isSameDay(new Date(s.createdAt), now))
    .reduce((sum, s) => sum + s.totalPrice, 0);
  const revenueWeek = sales.filter((s) => new Date(s.createdAt) >= startOfWeek).reduce((sum, s) => sum + s.totalPrice, 0);
  const revenueMonth = sales
    .filter((s) => new Date(s.createdAt) >= startOfMonth)
    .reduce((sum, s) => sum + s.totalPrice, 0);

  const [period, setPeriod] = useState<PeriodType>(PeriodType.MONTH);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const periodSales = useMemo(() => {
    if (period === PeriodType.ALL) return sales;
    if (period === PeriodType.CUSTOM) {
      return sales.filter((s) => {
        const d = new Date(s.createdAt);
        if (customFrom && d < new Date(customFrom)) return false;
        if (customTo) {
          const end = new Date(customTo);
          end.setHours(23, 59, 59, 999);
          if (d > end) return false;
        }
        return true;
      });
    }
    const start =
      period === PeriodType.TODAY
        ? new Date(now.getFullYear(), now.getMonth(), now.getDate())
        : period === PeriodType.WEEK
          ? startOfWeek
          : startOfMonth;
    return sales.filter((s) => new Date(s.createdAt) >= start);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sales, period, customFrom, customTo]);

  const grossAmount = (s: Sale) => s.quantity * s.unitPrice;
  const cashSales = periodSales.filter((s) => s.paymentMethod === 'contanti');
  const cardSales = periodSales.filter((s) => s.paymentMethod === 'carta');
  const cashGross = cashSales.reduce((sum, s) => sum + grossAmount(s), 0);
  const cardGross = cardSales.reduce((sum, s) => sum + grossAmount(s), 0);
  const cashItems = cashSales.reduce((sum, s) => sum + s.quantity, 0);
  const cardItems = cardSales.reduce((sum, s) => sum + s.quantity, 0);
  const totalCommission = periodSales.reduce((sum, s) => sum + (s.commission || 0), 0);
  const totalGross = cashGross + cardGross;

  const chartData = useMemo(() => {
    const days: { date: string; label: string; incasso: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const total = sales.filter((s) => isSameDay(new Date(s.createdAt), d)).reduce((sum, s) => sum + s.totalPrice, 0);
      days.push({ date: d.toISOString(), label: d.toLocaleDateString('it-IT', { weekday: 'short' }), incasso: total });
    }
    return days;
  }, [sales, now]);

  const recentActivity = useMemo(() => movements.slice(0, 8), [movements]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">Dashboard</h2>
        <p className="text-sm text-slate-400 dark:text-slate-500 font-medium mt-0.5">Panoramica del tuo magazzino</p>
      </div>

      {lowStockProducts.length > 0 && (
        <div className="bg-red-50/70 dark:bg-red-500/10 border border-red-200 dark:border-red-900/40 rounded-2xl p-4 flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-red-100 dark:bg-red-500/15 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
            <AlertTriangle size={17} />
          </div>
          <div>
            <p className="text-sm font-extrabold text-red-700 dark:text-red-400 mb-1.5">
              {lowStockProducts.length} prodott{lowStockProducts.length === 1 ? 'o' : 'i'} sotto la scorta minima
            </p>
            <div className="flex flex-wrap gap-1.5">
              {lowStockProducts.map((p) => (
                <span
                  key={p.id}
                  className="text-xs font-semibold bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 px-2.5 py-1 rounded-full"
                >
                  {p.name}: {p.quantity} / min {p.minStockLevel}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={Package}
          label="Prodotti"
          value={String(totalProducts)}
          tint="bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400"
        />
        <KpiCard
          icon={Boxes}
          label="Unità totali"
          value={String(totalUnits)}
          tint="bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400"
        />
        <KpiCard
          icon={Euro}
          label="Valore magazzino"
          value={formatCurrency(stockValue)}
          tint="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
        />
        <KpiCard
          icon={ShoppingCart}
          label="Incassi oggi"
          value={formatCurrency(revenueToday)}
          tint="bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400"
        />
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-softer">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Vendite per metodo di pagamento</h3>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as PeriodType)}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-100 dark:focus:ring-brand-900/40"
            >
              {Object.values(PeriodType).map((p) => (
                <option key={p} value={p}>
                  {PERIOD_LABELS[p]}
                </option>
              ))}
            </select>
            {period === PeriodType.CUSTOM && (
              <>
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-100 dark:focus:ring-brand-900/40"
                />
                <span className="text-xs font-bold text-slate-400 dark:text-slate-500">–</span>
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-100 dark:focus:ring-brand-900/40"
                />
              </>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Banknote size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Contanti (lordo)</p>
              <p className="text-lg font-extrabold text-slate-900 dark:text-white truncate">{formatCurrency(cashGross)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
              <CreditCard size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Carta (lordo)</p>
              <p className="text-lg font-extrabold text-slate-900 dark:text-white truncate">{formatCurrency(cardGross)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
              <Euro size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Totale lordo</p>
              <p className="text-lg font-extrabold text-slate-900 dark:text-white truncate">{formatCurrency(totalGross)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Percent size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Commissioni</p>
              <p className="text-lg font-extrabold text-slate-900 dark:text-white truncate">{formatCurrency(totalCommission)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <ShoppingBag size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Capi venduti (contanti)</p>
              <p className="text-lg font-extrabold text-slate-900 dark:text-white truncate">{cashItems}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
              <ShoppingBag size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Capi venduti (carta)</p>
              <p className="text-lg font-extrabold text-slate-900 dark:text-white truncate">{cardItems}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
              <Boxes size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Capi venduti (totale)</p>
              <p className="text-lg font-extrabold text-slate-900 dark:text-white truncate">{cashItems + cardItems}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-softer">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Incassi ultimi 7 giorni</h3>
            <div className="flex gap-4 text-xs font-semibold text-slate-400 dark:text-slate-500">
              <span>
                Settimana <span className="text-slate-700 dark:text-slate-200 font-bold">{formatCurrency(revenueWeek)}</span>
              </span>
              <span>
                Mese <span className="text-slate-700 dark:text-slate-200 font-bold">{formatCurrency(revenueMonth)}</span>
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorIncasso" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7c86e2" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#7c86e2" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={40} />
              <Tooltip
                formatter={(value) => formatCurrency(Number(value) || 0)}
                contentStyle={{
                  borderRadius: 12,
                  border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
                  fontSize: 12,
                  boxShadow: '0 4px 16px -4px rgba(15,23,42,0.12)',
                  background: isDark ? '#0f172a' : '#ffffff',
                  color: isDark ? '#f1f5f9' : '#0f172a',
                }}
                labelStyle={{ color: isDark ? '#f1f5f9' : '#0f172a' }}
              />
              <Area type="monotone" dataKey="incasso" stroke="#5b63d6" fill="url(#colorIncasso)" strokeWidth={2.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-softer">
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white mb-4">Attività recente</h3>
          <div className="space-y-4">
            {recentActivity.map((m) => {
              const meta = MOVEMENT_META[m.type];
              const Icon = meta.icon;
              return (
                <div key={m.id} className="flex items-start gap-3 text-xs">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${meta.color}`}>
                    <Icon size={13} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800 dark:text-slate-100 truncate">{m.productName}</p>
                    <p className="text-slate-400 dark:text-slate-500 font-medium">
                      {m.reason} · {formatDate(m.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })}
            {recentActivity.length === 0 && (
              <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">Nessuna attività recente.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
