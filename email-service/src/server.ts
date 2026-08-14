import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Origine non consentita'));
      }
    },
  })
);
app.use(express.json());

app.get('/', (_req, res) => {
  res.status(200).json({ status: 'ok', service: 'magazzino-magliette-email-service' });
});

app.post('/api/send-sale-mail', async (req, res) => {
  const { product, sale } = req.body;

  if (!product || !sale) {
    return res.status(400).json({
      success: false,
      message: 'Parametri "product" e "sale" richiesti.',
    });
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  const emailFrom = process.env.EMAIL_FROM || 'Magazzino Magliette <onboarding@resend.dev>';
  const emailTo = process.env.EMAIL_TO;

  console.log('[Email] Richiesta invio mail ricevuta per vendita di:', product.name);

  if (!resendApiKey || !emailTo) {
    console.warn('[Email] Credenziali non configurate. Salto invio email.');
    return res.status(200).json({
      success: false,
      code: 'EMAIL_NOT_CONFIGURED',
      message: 'Imposta RESEND_API_KEY e EMAIL_TO sul servizio Render.',
    });
  }

  try {
    const paymentMethodText = sale.paymentMethod === 'contanti' ? '💵 Contanti' : '💳 Carta';
    const variantText = sale.variantKey ? String(sale.variantKey).replace('-', ' / ').toUpperCase() : 'Nessuna variante';
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

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: emailFrom,
        to: [emailTo],
        subject: `Nuova vendita: ${product.name} - €${Number(sale.totalPrice).toFixed(2)}`,
        html: htmlContent,
      }),
    });

    if (!resendResponse.ok) {
      const errText = await resendResponse.text();
      throw new Error(`Resend ha risposto ${resendResponse.status}: ${errText}`);
    }

    console.log('[Email] Email inviata correttamente a:', emailTo);
    return res.status(200).json({ success: true, message: 'Email inviata con successo.' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Email] Errore nell'invio dell'email:", error);
    return res.status(500).json({ success: false, message: "Errore durante l'invio dell'email: " + message });
  }
});

app.post('/api/emit-receipt', async (req, res) => {
  const { product, sale } = req.body;

  if (!product || !sale) {
    return res.status(400).json({
      success: false,
      message: 'Parametri "product" e "sale" richiesti.',
    });
  }

  const codiceLicenza = process.env.BILLY_CODICE_LICENZA;
  const aeUser = process.env.BILLY_AE_USER;
  const aePassword = process.env.BILLY_AE_PASSWORD;
  const aePin = process.env.BILLY_AE_PIN;
  // Di default si parte in modalità TEST (scontrino fac-simile, non trasmesso all'Agenzia delle Entrate).
  // Va impostato esplicitamente BILLY_TEST_MODE=false su Render per passare all'invio reale.
  const testMode = process.env.BILLY_TEST_MODE !== 'false';

  console.log(`[Scontrino] Richiesta emissione per vendita di: ${product.name} ${testMode ? '(TEST)' : '(REALE)'}`);

  if (!codiceLicenza || !aeUser || !aePassword || !aePin) {
    console.warn('[Scontrino] Credenziali Billy Connect non configurate. Salto emissione scontrino.');
    return res.status(200).json({
      success: false,
      code: 'BILLY_NOT_CONFIGURED',
      message: 'Imposta BILLY_CODICE_LICENZA, BILLY_AE_USER, BILLY_AE_PASSWORD, BILLY_AE_PIN sul servizio Render.',
    });
  }

  try {
    const quantity = Number(sale.quantity) || 0;
    const unitPrice = Number(sale.unitPrice) || 0;
    const totalGross = quantity * unitPrice;
    const aliquota = product.aliquotaIva || '22';
    const descrizione = String(product.name || '').slice(0, 60);

    const payload = {
      auth: {
        command: 'invio',
        codiceLicenza,
        test: testMode,
      },
      utente: {
        ae_user: aeUser,
        ae_password: aePassword,
        ae_pin: aePin,
      },
      dati: {
        righe: [
          {
            quantita: String(quantity),
            descrizione,
            importoUnitario: unitPrice.toFixed(2),
            sconto: '0.00',
            aliquota: String(aliquota),
            omaggio: false,
            idReparto: 0,
          },
        ],
        pagamenti: [
          {
            // 1 = contanti, 2 = pagamento elettronico (vedi documentazione Billy Connect)
            pagamentoTipo: sale.paymentMethod === 'contanti' ? 1 : 2,
            pagamentoImporto: totalGross.toFixed(2),
          },
        ],
      },
    };

    const billyResponse = await fetch('https://www.scontrinosenzacassa.it/connect/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'param=' + encodeURIComponent(JSON.stringify(payload)),
    });

    const billyText = await billyResponse.text();
    let billyJson: { head?: { errore?: string }; scontrino?: { numeroDocumento?: string; scontrino_pdf_url?: string } };
    try {
      billyJson = JSON.parse(billyText);
    } catch {
      throw new Error(`Risposta non valida da Billy Connect: ${billyText.slice(0, 200)}`);
    }

    if (billyJson.head?.errore) {
      throw new Error(billyJson.head.errore);
    }

    console.log(
      `[Scontrino] Emesso correttamente: ${billyJson.scontrino?.numeroDocumento} ${testMode ? '(TEST)' : '(REALE)'}`
    );
    return res.status(200).json({
      success: true,
      test: testMode,
      numeroDocumento: billyJson.scontrino?.numeroDocumento,
      scontrinoPdfUrl: billyJson.scontrino?.scontrino_pdf_url,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Scontrino] Errore nell'emissione dello scontrino:", error);
    return res.status(500).json({ success: false, message: "Errore durante l'emissione dello scontrino: " + message });
  }
});

app.listen(PORT, () => {
  console.log(`Email service in esecuzione sulla porta ${PORT}`);
});
