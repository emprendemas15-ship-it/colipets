# COLIPETS

COLIPETS is a static progressive web app. It opens directly without requiring an account; data is saved on the current device. Signing in to Supabase is optional and enables syncing app data between devices. The Supabase client uses only the public anon key; row-level security keeps each account's data separate.

Live app: https://emprendemas15-ship-it.github.io/colipets/

The public GitHub repository contains application source, not business spreadsheets or generated reconciliation files. The deployment workflow copies only the files needed to run the PWA.

## Create and configure Supabase

1. Create a Supabase project in South America (São Paulo) and keep its database password private.
2. In the Supabase SQL Editor, run [`supabase/migrations/20261109000000_colipets_shared_state.sql`](./supabase/migrations/20261109000000_colipets_shared_state.sql). It creates the per-account state table, row-level security policies, an atomic merge function, and realtime updates.
3. In **Project Settings → API**, copy the Project URL and the public `anon`/publishable key. Never use or publish the `service_role` or secret key in this browser app.
4. In **Authentication → URL Configuration**, set the Site URL and redirect allow list to `https://emprendemas15-ship-it.github.io/colipets/`.
5. In **Authentication → Providers → Email**, enable email/password sign-in and turn off **Confirm email**. This lets the owner create the account without access to an email inbox; use a syntactically valid email such as `colipets@gmail.com` and keep the password private.
6. Run [`supabase/migrations/20261109000001_lock_colipets_sync_to_single_account.sql`](./supabase/migrations/20261109000001_lock_colipets_sync_to_single_account.sql). It locks cloud sync until an owner is explicitly authorized.
7. Create the account from COLIPETS. Since **Confirm email** is off, it should sign in immediately without an email link. Then in the SQL Editor, authorize it by running the query below, replacing `EMAIL_DE_LA_CUENTA` with its email. Finally, disable **Allow new users to sign up** in the Supabase Auth settings. Do not share or put the account password in GitHub.

   ```sql
   insert into public.colipets_sync_owner (singleton, user_id)
   select true, id
   from auth.users
   where lower(email) = lower('EMAIL_DE_LA_CUENTA')
   on conflict (singleton) do update set user_id = excluded.user_id;
   ```

   The query should insert exactly one row. If it inserts zero, make sure the account was created before running the query and that the email matches.

## Publish on GitHub Pages

1. Create a **public** GitHub repository named `colipets` and push this project to its `main` branch.
2. Open **Settings → Secrets and variables → Actions** and add these repository secrets:
   - `SUPABASE_URL`: the Supabase Project URL.
   - `SUPABASE_ANON_KEY`: the public anon/publishable key.
3. Under **Settings → Pages**, select **GitHub Actions** as the build and deployment source.
4. The workflow deploys on each push to `main`. After the first successful run, open the Pages URL shown in the deployment. The app opens directly; sign in only if you want to sync between devices.

The workflow writes the public client configuration only into the generated Pages artifact. It fails instead of publishing an app without its Supabase connection settings.

## Data and offline use

COLIPETS opens directly in local mode, and its data stays on that device unless you choose **Sincronizar entre dispositivos** and sign in. With an authorized session, changes sync automatically after edits and are retried every minute while the app is open; realtime updates bring in changes from other devices. Only the account explicitly authorized in `colipets_sync_owner` can use cloud sync; all other accounts are denied by row-level security. On the first sign-in, existing `taller_*` and `colipets_*` app data in that browser is merged into the account. Catalog entries merge by code and movements by ID; cloud values win if the same record differs. Use the same account on each device.

Use **Conteo físico** from either inventory section to reconcile products and raw materials. Enter only the items counted; blank fields are left unchanged. These stock-only adjustments are excluded from the monthly balance.

## Importar el Excel de forma privada

En **Copia de seguridad**, seleccione el paquete privado `COLIPETS-excel-import.json` para combinar los catálogos, clientes y movimientos históricos con los datos del navegador. La aplicación pública no incluye esos catálogos ni los datos de clientes. La importación es idempotente, crea una copia previa de recuperación, deja las existencias actuales en cero mediante ajustes físicos y reabre los cierres afectados. Los valores faltantes, códigos duplicados y dimensiones por verificar quedan señalados en **Conciliación de datos originales**; no se convierten silenciosamente en costos confiables.

El paquete y el libro de Excel contienen datos comerciales y de clientes: no se incluyen en el repositorio ni en el despliegue público. La app pedirá confirmación antes de importarlos. Si ya hay una sesión de sincronización activa, confirmar también enviará los datos a la cuenta Supabase autorizada; cancele la importación si no desea hacerlo.

## Validations and linked inventory

- Sales, credits, and consignment deliveries require available finished-product stock for the movement date. Credits reduce stock; consigned units are reserved and leave inventory when paid, or become available again when returned.
- Manufacturing requires an active product with a saved materials plan and enough raw materials for the selected date. Each confirmed production order records its material consumption once. Purchases for resale add resale inventory; purchases of raw materials add material inventory.
- Product and material selectors use the catalogs and fill related details and prices. Purchases require a catalog code for inventory items; an empty code is an operating expense.
- Movement dates are limited to the first open monthly period. Save that month's balance before registering movements in the following month. Payments, refunds, and consignment settlements cannot predate their original transaction.
- Required fields, positive quantities, valid totals, stock availability, and original transaction references are checked before a record is accepted.

## Quotes

Open **Cotizaciones** from the navigation menu. Add multiple active catalog products regardless of stock, or estimate a custom bed from a saved fabrication plan. Custom estimates use the selected dimensions and materials plus the catalog's material prices; missing or unreconciled costs are reported instead of silently treated as free. Suggested prices and quantities can be edited before saving. Quotes can be reopened and printed or saved as PDF, and they do not reserve stock, create inventory movements, or affect the monthly balance.

If Supabase is unavailable, COLIPETS still opens in local mode. Local-only changes are not uploaded until you sign in. The PWA caches its app shell for offline access after the first successful visit. Export a COLIPETS backup before changing devices or accounts.

The Excel workbook, `outputs/`, local Node modules, and spreadsheet-analysis scripts are intentionally excluded from GitHub by [`.gitignore`](./.gitignore).
