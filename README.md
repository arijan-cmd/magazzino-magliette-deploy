# Magazzino Magliette

App web per la gestione di un magazzino di magliette: anagrafica prodotti (con taglie/colori/varianti, immagini e SKU univoco), carico e scarico magazzino con registro movimenti, vendite e incassi, avvisi scorte minime, report PDF esportabili ed email automatica ad ogni vendita tramite SMTP Aruba.

Stack: React + TypeScript + Vite, Express (dev/prod server), Firebase Auth + Firestore + Storage.

## 1. Installazione

```bash
npm install
```

## 2. Configurazione Firebase (obbligatoria)

L'app non funziona senza un progetto Firebase collegato. Segui questi passi:

1. Crea un nuovo progetto su [console.firebase.google.com](https://console.firebase.google.com).
2. Abilita **Firestore Database** (modalità produzione, database `(default)`).
3. Abilita **Authentication → Sign-in method → Email/Password**.
4. In **Impostazioni progetto → Le tue app**, registra una Web App e copia le chiavi di configurazione.
5. Copia `.env.example` in `.env` e compila le variabili `VITE_FIREBASE_*` con quei valori.
6. In Firestore, crea manualmente il documento `meta/bootstrap` con un unico campo booleano `adminCreated: false`. Serve al meccanismo "il primo utente che si registra diventa amministratore": senza questo documento, nessuno può ottenere il ruolo admin.
7. Nella scheda **Regole** di Firestore, incolla il contenuto del file [`firestore.rules`](firestore.rules) di questo progetto (oppure fai il deploy con `firebase deploy --only firestore:rules` se usi la Firebase CLI).
8. Abilita **Storage** (per le immagini prodotto): nella console Firebase vai su Storage → Crea bucket predefinito. Poi, nella scheda **Regole** di Storage, incolla il contenuto del file [`storage.rules`](storage.rules) di questo progetto.

Una volta completati questi passi, il primo account che si registra dall'app diventa automaticamente **admin**; tutti gli account successivi sono **staff**. Un admin può promuovere/retrocedere altri utenti dalla sezione "Utenti".

## 3. Configurazione email vendite (SMTP Aruba)

Per ricevere una email ad ogni vendita registrata, compila in `.env`:

```
SMTP_HOST=smtps.aruba.it
SMTP_PORT=465
SMTP_USER=tuacasella@tuodominio.it
SMTP_PASS=la-tua-password
SMTP_SECURE=true
SMTP_FROM="Magazzino Magliette" <tuacasella@tuodominio.it>
SMTP_TO=destinatario-notifiche@tuodominio.it
```

Se queste variabili non sono impostate, l'app continua a funzionare normalmente: la vendita viene comunque registrata, semplicemente non parte l'email (viene loggato un avviso `SMTP_NOT_CONFIGURED` nella console del server).

## 4. Avvio

```bash
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000).

## 5. Build di produzione

```bash
npm run build
npm start
```

## Note

- Le credenziali SMTP vengono lette **solo** da variabili d'ambiente: non ci sono valori di default nel codice, per evitare di esporre password in chiaro nel sorgente.
- I movimenti di magazzino (`stockMovements`) sono un registro di sola creazione (append-only): non possono essere modificati né cancellati, nemmeno dall'admin — eventuali errori si correggono con un movimento di rettifica.
