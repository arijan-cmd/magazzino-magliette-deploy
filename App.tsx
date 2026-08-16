import React, { useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { collection, doc, onSnapshot, orderBy, query, runTransaction, updateDoc, writeBatch } from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from './services/firebase';
import { OperationType, handleFirestoreError } from './services/firestore';
import { uploadProductImages, deleteProductImage } from './services/storage';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import InventoryTable from './components/InventoryTable';
import ProductForm, { ProductFormValues, ProductImagesInput } from './components/ProductForm';
import StockMovementForm from './components/StockMovementForm';
import StockMovementsLog from './components/StockMovementsLog';
import SaleForm from './components/SaleForm';
import SalesLog from './components/SalesLog';
import ReportsExport from './components/ReportsExport';
import UsersSettings from './components/UsersSettings';
import { AppUser, MovementType, PaymentMethod, Product, Sale, StockMovement, UserRole, ViewType } from './types';

const EMAIL_API_URL = import.meta.env.VITE_EMAIL_API_URL || '/api/send-sale-mail';
const RECEIPT_API_URL = import.meta.env.VITE_RECEIPT_API_URL || '/api/emit-receipt';

async function ensureUserProfile(fbUser: FirebaseUser): Promise<AppUser> {
  const userRef = doc(db, 'users', fbUser.uid);
  const bootstrapRef = doc(db, 'meta', 'bootstrap');
  return runTransaction(db, async (tx) => {
    const userSnap = await tx.get(userRef);
    if (userSnap.exists()) {
      return userSnap.data() as AppUser;
    }
    const bootstrapSnap = await tx.get(bootstrapRef);
    const adminAlreadyCreated = bootstrapSnap.exists() ? !!bootstrapSnap.data().adminCreated : true;
    const role: UserRole = adminAlreadyCreated ? 'venditore' : 'admin';
    const profile: AppUser = {
      uid: fbUser.uid,
      email: fbUser.email || '',
      displayName: fbUser.displayName || fbUser.email || 'Utente',
      role,
      createdAt: new Date().toISOString(),
    };
    tx.set(userRef, profile);
    if (!adminAlreadyCreated) {
      tx.update(bootstrapRef, { adminCreated: true });
    }
    return profile;
  });
}

export default function App() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeView, setActiveView] = useState<ViewType>(ViewType.DASHBOARD);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [quickSellProductId, setQuickSellProductId] = useState<string | null>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);

  const isAdmin = user?.role === 'admin';
  const canManageStock = user?.role === 'admin' || user?.role === 'staff';

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setAuthLoading(false);
      return;
    }
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        setUser(null);
        setAuthLoading(false);
        return;
      }
      try {
        const profile = await ensureUserProfile(fbUser);
        setUser(profile);
      } catch (err) {
        console.error('[Auth] Errore creazione profilo utente:', err);
        setUser(null);
      } finally {
        setAuthLoading(false);
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!user) {
      setProducts([]);
      setSales([]);
      setMovements([]);
      setUsers([]);
      return;
    }

    const unsubProducts = onSnapshot(
      query(collection(db, 'products'), orderBy('updatedAt', 'desc')),
      (snap) => setProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Product)),
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, 'products');
        } catch {
          /* logged */
        }
      }
    );

    const unsubSales = onSnapshot(
      query(collection(db, 'sales'), orderBy('createdAt', 'desc')),
      (snap) => setSales(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Sale)),
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, 'sales');
        } catch {
          /* logged */
        }
      }
    );

    const unsubMovements = onSnapshot(
      query(collection(db, 'stockMovements'), orderBy('createdAt', 'desc')),
      (snap) => setMovements(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as StockMovement)),
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, 'stockMovements');
        } catch {
          /* logged */
        }
      }
    );

    let unsubUsers = () => {};
    if (isAdmin) {
      unsubUsers = onSnapshot(
        collection(db, 'users'),
        (snap) => setUsers(snap.docs.map((d) => ({ uid: d.id, ...d.data() }) as AppUser)),
        (err) => {
          try {
            handleFirestoreError(err, OperationType.LIST, 'users');
          } catch {
            /* logged */
          }
        }
      );
    } else {
      setUsers([]);
    }

    return () => {
      unsubProducts();
      unsubSales();
      unsubMovements();
      unsubUsers();
    };
  }, [user, isAdmin]);

  const runAction = useCallback(async (fn: () => Promise<void>) => {
    setActionError(null);
    try {
      await fn();
    } catch (err) {
      const message = (err as { message?: string }).message || 'Si è verificato un errore.';
      setActionError(message);
    }
  }, []);

  const saveProduct = useCallback(
    (data: ProductFormValues, images: ProductImagesInput, id?: string) =>
      runAction(async () => {
        const targetId = id || doc(collection(db, 'products')).id;
        const normalizedSku = data.sku.trim().toLowerCase();
        const nowIso = new Date().toISOString();

        let uploadedUrls: string[] = [];
        if (images.newFiles.length > 0) {
          uploadedUrls = await uploadProductImages(targetId, images.newFiles);
        }
        const finalImages = [...images.keepUrls, ...uploadedUrls];

        try {
          await runTransaction(db, async (tx) => {
            const skuRef = doc(db, 'productSkus', normalizedSku);
            const productRef = doc(db, 'products', targetId);
            const skuSnap = await tx.get(skuRef);

            if (id) {
              const productSnap = await tx.get(productRef);
              const previousSku = productSnap.exists()
                ? String(productSnap.data().sku || '').trim().toLowerCase()
                : null;
              if (previousSku !== normalizedSku) {
                if (skuSnap.exists()) throw new Error('Questo SKU è già usato da un altro prodotto.');
                if (previousSku) tx.delete(doc(db, 'productSkus', previousSku));
                tx.set(skuRef, { productId: targetId });
              }
              tx.update(productRef, { ...data, images: finalImages, updatedAt: nowIso });
            } else {
              if (skuSnap.exists()) throw new Error('Questo SKU è già usato da un altro prodotto.');
              tx.set(skuRef, { productId: targetId });
              tx.set(productRef, { ...data, images: finalImages, createdAt: nowIso, updatedAt: nowIso });
            }
          });
        } catch (err) {
          await Promise.all(uploadedUrls.map((url) => deleteProductImage(url).catch(() => {})));
          throw err;
        }

        const removedImages = (id ? products.find((p) => p.id === id)?.images || [] : []).filter(
          (url) => !images.keepUrls.includes(url)
        );
        await Promise.all(removedImages.map((url) => deleteProductImage(url).catch(() => {})));

        setEditingProduct(null);
        setActiveView(ViewType.INVENTORY);
      }),
    [runAction, products]
  );

  const deleteProduct = useCallback(
    (id: string) =>
      runAction(async () => {
        const product = products.find((p) => p.id === id);
        const batch = writeBatch(db);
        batch.delete(doc(db, 'products', id));
        if (product?.sku) {
          batch.delete(doc(db, 'productSkus', product.sku.trim().toLowerCase()));
        }
        await batch.commit();
        if (product?.images?.length) {
          await Promise.all(product.images.map((url) => deleteProductImage(url).catch(() => {})));
        }
      }),
    [runAction, products]
  );

  const createMovement = useCallback(
    (input: { productId: string; variantKey: string | null; type: Extract<MovementType, 'in' | 'out'>; quantity: number; reason: string }) =>
      runAction(async () => {
        if (!user) throw new Error('Devi accedere per registrare un movimento.');
        const delta = input.type === 'in' ? input.quantity : -input.quantity;
        const productRef = doc(db, 'products', input.productId);
        const movementRef = doc(collection(db, 'stockMovements'));
        const nowIso = new Date().toISOString();
        await runTransaction(db, async (tx) => {
          const snap = await tx.get(productRef);
          if (!snap.exists()) throw new Error('Prodotto non trovato.');
          const p = snap.data() as Product;
          const variants = { ...p.variants };
          if (input.variantKey) {
            const current = variants[input.variantKey] || 0;
            const next = current + delta;
            if (next < 0) throw new Error('Quantità non disponibile per questa variante.');
            variants[input.variantKey] = next;
          }
          const newQuantity = p.quantity + delta;
          if (newQuantity < 0) throw new Error('Quantità non disponibile in magazzino.');
          tx.update(productRef, { quantity: newQuantity, variants, updatedAt: nowIso });
          tx.set(movementRef, {
            productId: input.productId,
            productName: p.name,
            variantKey: input.variantKey,
            type: input.type,
            quantity: input.quantity,
            reason: input.reason,
            relatedSaleId: null,
            userId: user.uid,
            userName: user.displayName,
            createdAt: nowIso,
          });
        });
      }),
    [runAction, user]
  );

  const sellProduct = useCallback(
    (input: {
      productId: string;
      variantKey: string | null;
      quantity: number;
      unitPrice: number;
      commission: number;
      paymentMethod: PaymentMethod;
    }) =>
      runAction(async () => {
        if (!user) throw new Error('Devi accedere per registrare una vendita.');
        const productRef = doc(db, 'products', input.productId);
        const saleRef = doc(collection(db, 'sales'));
        const movementRef = doc(collection(db, 'stockMovements'));
        const nowIso = new Date().toISOString();
        const totalPrice = input.quantity * input.unitPrice - input.commission;
        let productSnapshot: Product | null = null;

        await runTransaction(db, async (tx) => {
          const snap = await tx.get(productRef);
          if (!snap.exists()) throw new Error('Prodotto non trovato.');
          const p = snap.data() as Product;
          productSnapshot = { ...p, id: snap.id };
          const variants = { ...p.variants };
          if (input.variantKey) {
            const current = variants[input.variantKey] || 0;
            if (current < input.quantity) throw new Error('Scorta insufficiente per questa variante.');
            variants[input.variantKey] = current - input.quantity;
          }
          if (p.quantity < input.quantity) throw new Error('Scorta insufficiente.');
          tx.update(productRef, { quantity: p.quantity - input.quantity, variants, updatedAt: nowIso });

          const sale: Omit<Sale, 'id'> = {
            productId: input.productId,
            productName: p.name,
            variantKey: input.variantKey,
            quantity: input.quantity,
            unitPrice: input.unitPrice,
            commission: input.commission,
            paymentMethod: input.paymentMethod,
            totalPrice,
            userId: user.uid,
            userName: user.displayName,
            createdAt: nowIso,
          };
          tx.set(saleRef, sale);

          const movement: Omit<StockMovement, 'id'> = {
            productId: input.productId,
            productName: p.name,
            variantKey: input.variantKey,
            type: 'sale',
            quantity: input.quantity,
            reason: 'Vendita',
            relatedSaleId: saleRef.id,
            userId: user.uid,
            userName: user.displayName,
            createdAt: nowIso,
          };
          tx.set(movementRef, movement);
        });

        if (productSnapshot) {
          const salePayload = {
            variantKey: input.variantKey,
            quantity: input.quantity,
            unitPrice: input.unitPrice,
            commission: input.commission,
            paymentMethod: input.paymentMethod,
            totalPrice,
            userName: user.displayName,
            createdAt: nowIso,
          };

          fetch(EMAIL_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ product: productSnapshot, sale: salePayload }),
          }).catch((err) => console.warn('[Email] Invio notifica vendita non riuscito:', err));

          if (input.paymentMethod === 'carta') {
            fetch(RECEIPT_API_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ product: productSnapshot, sale: salePayload }),
            }).catch((err) => console.warn('[Scontrino] Emissione scontrino non riuscita:', err));
          }
        }
      }),
    [runAction, user]
  );

  const cancelSale = useCallback(
    (sale: Sale) =>
      runAction(async () => {
        if (!user) throw new Error('Devi accedere per annullare una vendita.');
        const productRef = doc(db, 'products', sale.productId);
        const movementRef = doc(collection(db, 'stockMovements'));
        const saleRef = doc(db, 'sales', sale.id);
        const nowIso = new Date().toISOString();
        await runTransaction(db, async (tx) => {
          const snap = await tx.get(productRef);
          if (snap.exists()) {
            const p = snap.data() as Product;
            const variants = { ...p.variants };
            if (sale.variantKey) {
              variants[sale.variantKey] = (variants[sale.variantKey] || 0) + sale.quantity;
            }
            tx.update(productRef, { quantity: p.quantity + sale.quantity, variants, updatedAt: nowIso });
          }
          tx.set(movementRef, {
            productId: sale.productId,
            productName: sale.productName,
            variantKey: sale.variantKey,
            type: 'sale-cancel',
            quantity: sale.quantity,
            reason: 'Annullamento vendita',
            relatedSaleId: sale.id,
            userId: user.uid,
            userName: user.displayName,
            createdAt: nowIso,
          });
          tx.delete(saleRef);
        });
      }),
    [runAction, user]
  );

  const updateUserRole = useCallback(
    (uid: string, role: UserRole) => runAction(() => updateDoc(doc(db, 'users', uid), { role })),
    [runAction]
  );

  const resetMovementsHistory = useCallback(
    () =>
      runAction(async () => {
        if (!isAdmin) throw new Error('Solo un admin può resettare lo storico movimenti.');
        const ids = movements.map((m) => m.id);
        const chunkSize = 450;
        for (let i = 0; i < ids.length; i += chunkSize) {
          const batch = writeBatch(db);
          ids.slice(i, i + chunkSize).forEach((id) => batch.delete(doc(db, 'stockMovements', id)));
          await batch.commit();
        }
      }),
    [runAction, isAdmin, movements]
  );

  const lowStockProducts = products.filter((p) => p.quantity <= p.minStockLevel);

  const goToEdit = (product: Product) => {
    setEditingProduct(product);
    setActiveView(ViewType.EDIT_PRODUCT);
  };

  const goToAdd = () => {
    setEditingProduct(null);
    setActiveView(ViewType.ADD_PRODUCT);
  };

  const goToQuickSell = (productId: string) => {
    setQuickSellProductId(productId);
    setActiveView(ViewType.POS);
  };

  const renderView = () => {
    switch (activeView) {
      case ViewType.DASHBOARD:
        return (
          <Dashboard
            products={products}
            sales={sales}
            movements={movements}
            lowStockProducts={lowStockProducts}
            isAdmin={isAdmin}
            onResetMovements={resetMovementsHistory}
          />
        );
      case ViewType.INVENTORY:
        return (
          <InventoryTable
            products={products}
            sales={sales}
            isAdmin={isAdmin}
            canManageStock={canManageStock}
            onEdit={goToEdit}
            onDelete={deleteProduct}
            onAdd={goToAdd}
            onAdjustVariant={createMovement}
            onQuickSell={goToQuickSell}
          />
        );
      case ViewType.ADD_PRODUCT:
        return <ProductForm products={products} onSave={saveProduct} onCancel={() => setActiveView(ViewType.INVENTORY)} />;
      case ViewType.EDIT_PRODUCT:
        return (
          <ProductForm
            product={editingProduct}
            products={products}
            onSave={saveProduct}
            onCancel={() => {
              setEditingProduct(null);
              setActiveView(ViewType.INVENTORY);
            }}
          />
        );
      case ViewType.MOVEMENTS:
        return canManageStock ? (
          <div className="space-y-8">
            <StockMovementForm products={products} onSubmit={createMovement} />
            <StockMovementsLog movements={movements} />
          </div>
        ) : null;
      case ViewType.POS:
        return (
          <div className="space-y-8">
            <SaleForm products={products} onSell={sellProduct} initialProductId={quickSellProductId} />
            <SalesLog sales={sales} onCancelSale={cancelSale} />
          </div>
        );
      case ViewType.REPORTS:
        return <ReportsExport products={products} sales={sales} />;
      case ViewType.USERS:
        return isAdmin ? (
          <UsersSettings users={users} currentUserId={user?.uid || ''} onUpdateRole={updateUserRole} />
        ) : null;
      default:
        return null;
    }
  };

  if (!isFirebaseConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 transition-colors duration-200">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/50 rounded-3xl shadow-soft p-8 text-center">
          <div className="w-11 h-11 rounded-2xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-4 text-xl font-extrabold">
            !
          </div>
          <h1 className="text-lg font-extrabold text-slate-900 dark:text-white mb-2 tracking-tight">Configurazione Firebase mancante</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
            Per usare l'app devi collegare un progetto Firebase: crea il file{' '}
            <code className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-1.5 py-0.5 rounded-md text-xs font-semibold">
              .env
            </code>{' '}
            partendo da{' '}
            <code className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-1.5 py-0.5 rounded-md text-xs font-semibold">
              .env.example
            </code>{' '}
            e compila le variabili{' '}
            <code className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-1.5 py-0.5 rounded-md text-xs font-semibold">
              VITE_FIREBASE_*
            </code>{' '}
            con i dati del tuo progetto Firebase, poi riavvia il server.
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
            Consulta il README per la guida completa ai passi di configurazione.
          </p>
        </div>
      </div>
    );
  }

  return (
    <Layout
      user={user}
      authLoading={authLoading}
      lowStockCount={lowStockProducts.length}
      activeView={activeView}
      onViewChange={(view) => {
        setEditingProduct(null);
        setActiveView(view);
      }}
    >
      {actionError && (
        <div className="mb-5 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-400 text-sm font-semibold px-4 py-3 rounded-xl flex justify-between items-center shadow-softer">
          <span>{actionError}</span>
          <button
            onClick={() => setActionError(null)}
            className="font-bold ml-4 text-red-400 dark:text-red-500 hover:text-red-700 dark:hover:text-red-300 transition"
          >
            ×
          </button>
        </div>
      )}
      {renderView()}
    </Layout>
  );
}
