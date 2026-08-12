import { UserRole, ViewType } from './types';

export const APP_NAME = 'Magazzino Magliette';

export const DEFAULT_CATEGORIES = ['T-Shirt', 'Felpa', 'Polo', 'Canotta', 'Accessori'];

export const DEFAULT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  staff: 'Staff',
  venditore: 'Venditore',
};

export const NAV_ITEMS: { view: ViewType; label: string; roles?: UserRole[] }[] = [
  { view: ViewType.DASHBOARD, label: 'Dashboard' },
  { view: ViewType.INVENTORY, label: 'Magazzino' },
  { view: ViewType.MOVEMENTS, label: 'Movimenti', roles: ['admin', 'staff'] },
  { view: ViewType.POS, label: 'Vendite' },
  { view: ViewType.REPORTS, label: 'Report' },
  { view: ViewType.USERS, label: 'Utenti', roles: ['admin'] },
];

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value || 0);
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function variantKey(color: string, size: string): string {
  return `${color}-${size}`;
}

export function sortSizes(sizes: string[]): string[] {
  return [...sizes].sort((a, b) => {
    const ia = DEFAULT_SIZES.indexOf(a);
    const ib = DEFAULT_SIZES.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
}
