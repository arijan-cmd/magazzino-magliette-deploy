export type UserRole = 'admin' | 'staff';

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
  quantity: number; // aggregato, somma delle varianti (o valore diretto se non ci sono varianti)
  minStockLevel: number;
  sizes: string[];
  colors: string[];
  variants: Record<string, number>; // chiave "${color}-${size}"
  images: string[]; // URL di download da Firebase Storage
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
  userId: string;
  userName: string;
  createdAt: string; // ISO
}

export enum ViewType {
  DASHBOARD = 'dashboard',
  INVENTORY = 'inventory',
  ADD_PRODUCT = 'add_product',
  EDIT_PRODUCT = 'edit_product',
  MOVEMENTS = 'movements',
  POS = 'pos',
  REPORTS = 'reports',
  USERS = 'users',
}

export enum PeriodType {
  TODAY = 'today',
  WEEK = 'week',
  MONTH = 'month',
  ALL = 'all',
  CUSTOM = 'custom',
}
