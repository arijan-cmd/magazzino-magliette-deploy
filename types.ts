export type UserRole = 'admin' | 'staff' | 'venditore';

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  createdAt: string; // ISO
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  description: string;
  salePrice: number;
  purchasePrice: number;
  aliquotaIva: string; // es. "22", "10", "4", "N1"... vedi IVA_RATES
  quantity: number; // aggregato, somma delle varianti (o valore diretto se non ci sono varianti)
  minStockLevel: number;
  sizes: string[];
  colors: string[];
  variants: Record<string, number>; // chiave "${color}-${size}"
  images: string[]; // URL di download da Firebase Storage
  createdAt: string; // ISO
  updatedAt: string; // ISO
}

export interface BlankGarment {
  id: string;
  modello: string; // es. "Oversized", "Classica", "Retro" — modello/vestibilità del capo non stampato
  sizes: string[];
  colors: string[];
  variants: Record<string, number>; // chiave "${color}-${size}"
  quantity: number; // aggregato, somma delle varianti
  createdAt: string; // ISO
  updatedAt: string; // ISO
}

export type PaymentMethod = 'contanti' | 'carta';

export interface Sale {
  id: string;
  productId: string;
  productName: string;
  variantKey: string | null;
  quantity: number;
  unitPrice: number;
  commission: number;
  paymentMethod: PaymentMethod;
  totalPrice: number;
  userId: string;
  userName: string;
  createdAt: string; // ISO
  // Stato dello scontrino elettronico (solo vendite a carta). Assente sulle vendite precedenti.
  receiptStatus?: 'pending' | 'emitted' | 'failed';
  receiptNumber?: string | null;
  receiptTest?: boolean | null;
  receiptError?: string | null;
  receiptUpdatedAt?: string;
}

export type MovementType = 'in' | 'out' | 'sale' | 'sale-cancel';

export const MOVEMENT_REASON_PRESETS = [
  'Rifornimento fornitore',
  'Reso cliente',
  'Prodotto danneggiato',
  'Rettifica inventario',
  'Vendita',
  'Annullamento vendita',
  'Altro',
] as const;

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  variantKey: string | null;
  type: MovementType;
  quantity: number; // sempre positivo, il segno lo dà `type`
  reason: string;
  relatedSaleId: string | null;
  relatedGarmentId: string | null; // id del modello in magazzino da cui proviene un carico
  reversesMovementId: string | null; // id del movimento annullato, se questo è un annullamento
  userId: string;
  userName: string;
  createdAt: string; // ISO
}

export enum ViewType {
  DASHBOARD = 'dashboard',
  INVENTORY = 'inventory',
  ADD_PRODUCT = 'add_product',
  EDIT_PRODUCT = 'edit_product',
  BLANK_STOCK = 'blank_stock',
  MOVEMENTS = 'movements',
  POS = 'pos',
  REPORTS = 'reports',
  STATS = 'stats',
  USERS = 'users',
}

export enum PeriodType {
  TODAY = 'today',
  WEEK = 'week',
  MONTH = 'month',
  ALL = 'all',
  CUSTOM = 'custom',
}
