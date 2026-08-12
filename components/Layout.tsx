import React, { useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import {
  LayoutDashboard,
  Package,
  ArrowLeftRight,
  ShoppingCart,
  FileText,
  Users,
  LogOut,
  AlertTriangle,
  Shirt,
  Sun,
  Moon,
} from 'lucide-react';
import { auth } from '../services/firebase';
import { APP_NAME, NAV_ITEMS } from '../constants';
import { AppUser, ViewType } from '../types';
import { applyTheme, getCurrentTheme, Theme } from '../utils/theme';

interface LayoutProps {
  user: AppUser | null;
  authLoading: boolean;
  lowStockCount: number;
  activeView: ViewType;
  onViewChange: (view: ViewType) => void;
  children: React.ReactNode;
}

function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    setTheme(getCurrentTheme());
  }, []);

  const toggle = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    setTheme(next);
  };

  return [theme, toggle];
}

function ThemeToggle({ theme, onToggle, className = '' }: { theme: Theme; onToggle: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      title={theme === 'dark' ? 'Passa al tema chiaro' : 'Passa al tema scuro'}
      className={className}
    >
      {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
    </button>
  );
}

function LoginForm() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [theme, toggleTheme] = useTheme();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        if (displayName) {
          await updateProfile(cred.user, { displayName });
        }
      }
    } catch (err) {
      const code = (err as { code?: string }).code || '';
      if (code.includes('user-not-found') || code.includes('wrong-password') || code.includes('invalid-credential')) {
        setError('Email o password non corretti.');
      } else if (code.includes('email-already-in-use')) {
        setError('Esiste già un account con questa email.');
      } else if (code.includes('weak-password')) {
        setError('La password deve avere almeno 6 caratteri.');
      } else {
        setError('Si è verificato un errore. Riprova.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 overflow-hidden transition-colors duration-200">
      <div className="pointer-events-none absolute -top-40 -left-40 w-96 h-96 rounded-full bg-brand-200/50 dark:bg-brand-900/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-48 -right-32 w-[28rem] h-[28rem] rounded-full bg-brand-100 dark:bg-brand-950/40 blur-3xl" />

      <ThemeToggle
        theme={theme}
        onToggle={toggleTheme}
        className="absolute top-5 right-5 p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white shadow-softer transition"
      />

      <div className="relative w-full max-w-sm bg-white/90 dark:bg-slate-900/90 backdrop-blur rounded-3xl shadow-soft border border-slate-200/80 dark:border-slate-800 p-8">
        <div className="flex flex-col items-center mb-7">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center shadow-card mb-4">
            <Shirt size={22} strokeWidth={2.2} />
          </div>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-white text-center tracking-tight">{APP_NAME}</h1>
          <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 text-center uppercase tracking-widest mt-1">
            Gestione magazzino
          </p>
        </div>

        <div className="flex mb-7 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all duration-200 ${
              mode === 'login'
                ? 'bg-white dark:bg-slate-700 shadow-softer text-slate-900 dark:text-white'
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            Accedi
          </button>
          <button
            type="button"
            onClick={() => setMode('register')}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all duration-200 ${
              mode === 'register'
                ? 'bg-white dark:bg-slate-700 shadow-softer text-slate-900 dark:text-white'
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            Registrati
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">Nome</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none transition focus:bg-white dark:focus:bg-slate-800 focus:border-brand-400 focus:ring-4 focus:ring-brand-100 dark:focus:ring-brand-900/40"
                placeholder="Mario Rossi"
              />
            </div>
          )}
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none transition focus:bg-white dark:focus:bg-slate-800 focus:border-brand-400 focus:ring-4 focus:ring-brand-100 dark:focus:ring-brand-900/40"
              placeholder="tuaemail@esempio.it"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none transition focus:bg-white dark:focus:bg-slate-800 focus:border-brand-400 focus:ring-4 focus:ring-brand-100 dark:focus:ring-brand-900/40"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-900/40 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 active:scale-[0.99] text-white dark:text-slate-900 font-bold py-2.5 rounded-xl text-sm shadow-card transition-all duration-150 disabled:opacity-50 disabled:active:scale-100"
          >
            {submitting ? 'Attendere...' : mode === 'login' ? 'Accedi' : 'Crea account'}
          </button>
        </form>
      </div>
    </div>
  );
}

const NAV_ICONS: Record<ViewType, React.ComponentType<{ size?: number; strokeWidth?: number }>> = {
  [ViewType.DASHBOARD]: LayoutDashboard,
  [ViewType.INVENTORY]: Package,
  [ViewType.ADD_PRODUCT]: Package,
  [ViewType.EDIT_PRODUCT]: Package,
  [ViewType.MOVEMENTS]: ArrowLeftRight,
  [ViewType.POS]: ShoppingCart,
  [ViewType.REPORTS]: FileText,
  [ViewType.USERS]: Users,
};

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export default function Layout({ user, authLoading, lowStockCount, activeView, onViewChange, children }: LayoutProps) {
  const [theme, toggleTheme] = useTheme();

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-[3px] border-slate-200 dark:border-slate-700 border-t-slate-900 dark:border-t-white rounded-full animate-spin" />
          <p className="text-slate-400 dark:text-slate-500 text-xs font-bold uppercase tracking-widest">Caricamento</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginForm />;
  }

  const isAdmin = user.role === 'admin';
  const visibleItems = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);
  const isNavActive = (view: ViewType) =>
    view === ViewType.INVENTORY
      ? activeView === ViewType.INVENTORY || activeView === ViewType.ADD_PRODUCT || activeView === ViewType.EDIT_PRODUCT
      : activeView === view;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row transition-colors duration-200">
      {/* Sidebar desktop/tablet landscape */}
      <aside className="hidden md:flex md:w-64 bg-slate-900 text-white md:flex-col shrink-0 md:h-screen md:sticky md:top-0 dark:border-r dark:border-slate-950/60">
        <div className="p-5 flex items-center gap-3 border-b border-white/10">
          <div className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center shrink-0">
            <Shirt size={17} strokeWidth={2.4} />
          </div>
          <div className="min-w-0">
            <h1 className="font-extrabold text-sm tracking-tight truncate">{APP_NAME}</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Gestione magazzino</p>
          </div>
        </div>

        <nav className="flex flex-col flex-1 p-3 gap-1">
          {visibleItems.map((item) => {
            const Icon = NAV_ICONS[item.view];
            const active = isNavActive(item.view);
            return (
              <button
                key={item.view}
                onClick={() => onViewChange(item.view)}
                className={`flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-bold whitespace-nowrap transition-all duration-150 relative rounded-xl ${
                  active ? 'bg-brand-600 text-white shadow-card' : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon size={16} />
                {item.label}
                {item.view === ViewType.INVENTORY && lowStockCount > 0 && (
                  <span className="flex items-center gap-0.5 bg-red-500 text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ml-auto">
                    <AlertTriangle size={10} /> {lowStockCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 p-3 mx-3 mb-3 rounded-xl bg-white/5 border border-white/10">
          <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-[11px] font-extrabold shrink-0">
            {getInitials(user.displayName) || 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold truncate">{user.displayName}</p>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
              {isAdmin ? 'Admin' : 'Staff'}
            </p>
          </div>
          <ThemeToggle
            theme={theme}
            onToggle={toggleTheme}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition shrink-0"
          />
          <button
            onClick={() => signOut(auth)}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition shrink-0"
            title="Esci"
          >
            <LogOut size={15} />
          </button>
        </div>
      </aside>

      {/* Header fisso mobile/tablet portrait */}
      <header className="md:hidden fixed top-0 inset-x-0 z-30 flex items-center justify-between gap-3 px-4 pt-[calc(env(safe-area-inset-top)+0.625rem)] pb-2.5 bg-white/85 dark:bg-slate-900/85 backdrop-blur-lg border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center shrink-0">
            <Shirt size={16} strokeWidth={2.4} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-extrabold text-slate-900 dark:text-white truncate leading-tight">{APP_NAME}</p>
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide leading-tight">
              {isAdmin ? 'Admin' : 'Staff'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <ThemeToggle
            theme={theme}
            onToggle={toggleTheme}
            className="p-2.5 rounded-xl text-slate-500 dark:text-slate-400 active:bg-slate-100 dark:active:bg-slate-800 transition"
          />
          <button
            onClick={() => signOut(auth)}
            className="p-2.5 rounded-xl text-slate-500 dark:text-slate-400 active:bg-slate-100 dark:active:bg-slate-800 transition"
            title="Esci"
          >
            <LogOut size={17} />
          </button>
        </div>
      </header>

      {/* Barra a schede fissa in basso, stile app nativa */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 flex items-stretch bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg border-t border-slate-200/80 dark:border-slate-800 pb-[env(safe-area-inset-bottom)]">
        {visibleItems.map((item) => {
          const Icon = NAV_ICONS[item.view];
          const active = isNavActive(item.view);
          return (
            <button
              key={item.view}
              onClick={() => onViewChange(item.view)}
              className={`relative flex-1 flex flex-col items-center justify-center gap-0.5 py-2 min-h-[52px] transition-colors active:bg-slate-100/70 dark:active:bg-slate-800/70 ${
                active ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400 dark:text-slate-500'
              }`}
            >
              {active && <span className="absolute top-0 inset-x-3 h-0.5 rounded-full bg-brand-600 dark:bg-brand-400" />}
              <span className="relative">
                <Icon size={21} strokeWidth={active ? 2.4 : 2} />
                {item.view === ViewType.INVENTORY && lowStockCount > 0 && (
                  <span className="absolute -top-1 -right-1.5 min-w-[15px] h-[15px] px-[3px] flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-extrabold leading-none">
                    {lowStockCount}
                  </span>
                )}
              </span>
              <span className="text-[10px] font-bold tracking-tight">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <main className="flex-1 overflow-y-auto min-w-0 px-4 pt-[calc(env(safe-area-inset-top)+4rem)] pb-[calc(env(safe-area-inset-bottom)+4.75rem)] md:p-8">
        <div className="max-w-6xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
