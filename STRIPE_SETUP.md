# Stripe Integration Setup (Ultra Simple)

## Paso 1: Crear producto en Stripe

1. Andá a [dashboard.stripe.com](https://dashboard.stripe.com) (usá Test Mode por ahora)
2. Click en **Products** → **Add product**
3. Creá este producto:

### Producto: Yearly
- Name: `Unlimited Pass (Yearly)`
- Price: `$11.99`
- Billing period: `Yearly`
- Click **Save product**
- Copiá el **Price ID** (empieza con `price_`)

4. Guardá ese Price ID como secret de Supabase: `STRIPE_YEARLY_PRICE_ID`.

## Paso 2: Deployar el backend (1 min)

Corré este comando en tu terminal:

```bash
cd /Users/joaquinestruch/Desktop/ChessApp/ChessEngineered
./deploy.sh
```

Te va a pedir:
- Loguearte a Supabase (si no estás)
- Setear secrets (te los pide uno por uno)

## Paso 3: Setear Secrets en Supabase

Necesitás estos 5 valores:

| Secret | Dónde conseguirlo |
|---|---|
| `STRIPE_SECRET_KEY` | Stripe Dashboard → Developers → API Keys → Secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard → Developers → Webhooks → Add endpoint |
| `STRIPE_YEARLY_PRICE_ID` | Stripe Dashboard → Product → Price ID |
| `SUPABASE_URL` | `https://mvvnqkixgxjblgyrnvte.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Project Settings → API → service_role key |
| `SUPABASE_ANON_KEY` | Supabase Dashboard → Project Settings → API → anon/public key |

### Para setearlos:

**Opción A: Por CLI (el script ya te lo pide)**

**Opción B: Por web**
1. Andá a [tu dashboard de Supabase](https://supabase.com/dashboard/project/mvvnqkixgxjblgyrnvte/settings/functions)
2. Agregá cada secret uno por uno

## Paso 4: Configurar Webhook en Stripe

1. Stripe Dashboard → Developers → Webhooks → **Add an endpoint**
2. Endpoint URL:
   ```
   https://mvvnqkixgxjblgyrnvte.supabase.co/functions/v1/stripe-webhook
   ```
3. Seleccioná estos eventos:
   - ☑️ `checkout.session.completed`
   - ☑️ `invoice.paid`
   - ☑️ `invoice.payment_failed`
   - ☑️ `customer.subscription.deleted`
   - ☑️ `customer.subscription.updated`
4. Click **Add endpoint**
5. Copiá el **Signing secret** (empieza con `whsec_`)
6. Pegalo en Supabase secrets como `STRIPE_WEBHOOK_SECRET`

## Paso 5: Correr migración SQL

1. Andá a [Supabase SQL Editor](https://supabase.com/dashboard/project/mvvnqkixgxjblgyrnvte/sql)
2. Abrí el archivo `supabase/migrations/20240101000000_add_subscriptions.sql`
3. Copiá y pegá el contenido en el SQL Editor
4. Click **Run**

## Paso 6: Probar

1. Abrí `http://localhost:8085/checkout.html`
2. Logueate con tu cuenta
3. Click **Pay $11.99**
4. Te redirige a Stripe Checkout
5. Usá esta tarjeta de prueba:
   - Número: `4242 4242 4242 4242`
   - Fecha: cualquiera futura
   - CVC: cualquier 3 dígitos
   - ZIP: cualquiera
6. Completá el pago
7. Te redirige a `openings.html?checkout=success`

Nota: la app ofrece una apertura gratis sin tarjeta. Stripe no tiene trial configurado; el checkout cobra la suscripción anual cuando el usuario quiere desbloquear más aperturas.

## Going Live (cuando quieras cobrar de verdad)

1. Activá **Live Mode** en Stripe Dashboard
2. Creá los mismos productos en Live Mode
3. Guardá el nuevo Price ID live como `STRIPE_YEARLY_PRICE_ID`
4. Cambiá las keys de test a live en Supabase secrets
5. Actualizá el webhook endpoint a producción
6. Deployá de nuevo con `./deploy.sh`

## Troubleshooting

**"Invalid session" error:**
→ Asegurate de estar logueado antes de ir al checkout

**"Invalid checkout plan" error:**
→ Verificá que `STRIPE_YEARLY_PRICE_ID` esté seteado en Supabase Functions.

**Webhook no funciona:**
→ Verificá que el `STRIPE_WEBHOOK_SECRET` sea el correcto
→ Verificá que la URL del webhook sea exacta

**No se guarda la suscripción:**
→ Revisá los logs de la función en Supabase Dashboard → Edge Functions → Logs
