import express from 'express';
import path from 'path';
import nodemailer from 'nodemailer';

try {
  process.loadEnvFile('.env');
} catch {
  // .env non presente (es. primo avvio prima della configurazione): si prosegue con i soli process.env già impostati.
}

const app = express();
const PORT = 3000;

app.use(express.json());

app.post('/api/send-sale-mail', async (req, res) => {
  const { product, sale } = req.body;

  if (!product || !sale) {
    return res.status(400).json({
      success: false,
      message: 'Parametri "product" e "sale" richiesti.',
    });
  }

  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 465;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpSecure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : true;
  const smtpFrom = process.env.SMTP_FROM || (smtpUser ? `"Magazzino Magliette" <${smtpUser}>` : undefined);
  const smtpTo = process.env.SMTP_TO;

  console.log('[SMTP] Richiesta invio mail ricevuta per vendita di:', product.name);

  if (!smtpHost || !smtpUser || !smtpPass || !smtpTo || !smtpFrom) {
    console.warn('[SMTP] Credenziali SMTP non configurate. Salto invio email.');
    return res.status(200).json({
      success: false,
      code: 'SMTP_NOT_CONFIGURED',
      message:
        "SMTP non configurato. Imposta SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_TO (e opzionalmente SMTP_FROM) nel file .env.",
    });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    const paymentMethodText = sale.paymentMethod === 'contanti' ? '💵 Contanti' : '💳 Carta';
    const variantText = sale.variantKey ? sale.variantKey.replace('-', ' / ').toUpperCase() : 'Nessuna variante';
    const saleDate = sale.createdAt ? new Date(sale.createdAt) : new Date();
    const formattedDate = saleDate.toLocaleString('it-IT', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Nuova Vendita Registrata</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; background-color: #f8fafc; color: #334155; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; }
          .header { background-color: #0f172a; color: #ffffff; padding: 30px; text-align: center; }
          .header h1 { margin: 0; font-size: 24px; font-weight: 800; text-transform: uppercase; color: #38bdf8; }
          .header p { margin: 8px 0 0 0; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; }
          .content { padding: 30px; }
          .product-card { background-color: #f1f5f9; padding: 20px; border-radius: 16px; margin-bottom: 25px; border: 1px solid #e2e8f0; }
          .product-title { font-size: 18px; font-weight: 800; color: #1e293b; text-transform: uppercase; margin: 0 0 4px 0; }
          .product-sku { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
          .badges { margin-top: 12px; }
          .badge { display: inline-block; font-size: 10px; font-weight: 800; padding: 4px 10px; border-radius: 8px; text-transform: uppercase; margin-right: 6px; }
          .badge-variant { background-color: #e0f2fe; color: #0369a1; }
          .badge-qty { background-color: #f1f5f9; color: #475569; }
          .details-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
          .details-table td { padding: 12px 0; font-size: 13px; }
          .label { font-weight: 700; color: #64748b; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; }
          .value { font-weight: 800; color: #1e293b; text-align: right; }
          .total-row { border-top: 2px dashed #cbd5e1; border-bottom: 2px dashed #cbd5e1; }
          .total-value { font-size: 20px; font-weight: 900; color: #059669; }
          .footer { background-color: #f8fafc; padding: 20px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <p>Nuova registrazione</p>
            <h1>Vendita effettuata</h1>
          </div>
          <div class="content">
            <div class="product-card">
              <h2 class="product-title">${product.name}</h2>
              <div class="product-sku">SKU: ${product.sku || 'N.D.'}</div>
              <div class="badges">
                <span class="badge badge-variant">${variantText}</span>
                <span class="badge badge-qty">Q.tà: ${sale.quantity}</span>
              </div>
            </div>
            <table class="details-table">
              <tr><td class="label">Prezzo unitario</td><td class="value">€${Number(sale.unitPrice).toFixed(2)}</td></tr>
              <tr><td class="label">Commissione</td><td class="value" style="color:#ef4444;">- €${Number(sale.commission || 0).toFixed(2)}</td></tr>
              <tr><td class="label">Metodo di pagamento</td><td class="value">${paymentMethodText}</td></tr>
              <tr class="total-row">
                <td class="label" style="padding:16px 0;font-size:13px;color:#059669;">Totale transazione</td>
                <td class="value total-value" style="padding:16px 0;">€${Number(sale.totalPrice).toFixed(2)}</td>
              </tr>
              <tr><td class="label" style="padding-top:20px;">Data e ora</td><td class="value" style="padding-top:20px;">${formattedDate}</td></tr>
              <tr><td class="label">Venditore</td><td class="value">${sale.userName || 'N.D.'}</td></tr>
            </table>
          </div>
          <div class="footer">Generato automaticamente da Magazzino Magliette</div>
        </div>
      </body>
      </html>
    `;

    await transporter.sendMail({
      from: smtpFrom,
      to: smtpTo,
      subject: `Nuova vendita: ${product.name} - €${Number(sale.totalPrice).toFixed(2)}`,
      html: htmlContent,
    });

    console.log('[SMTP] Email inviata correttamente a:', smtpTo);
    return res.status(200).json({ success: true, message: 'Email inviata con successo.' });
  } catch (error: any) {
    console.error("[SMTP] Errore nell'invio dell'email:", error);
    return res.status(500).json({ success: false, message: "Errore durante l'invio dell'email: " + error.message });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server in esecuzione su http://localhost:${PORT}`);
  });
}

startServer();
