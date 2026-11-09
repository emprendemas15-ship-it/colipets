# COLIPETS

COLIPETS is a static progressive web app. It opens directly without requiring an account; data is saved on the current device. Signing in to Supabase is optional and enables syncing app data between devices. The Supabase client uses only the public anon key; row-level security keeps each account's data separate.

Live app: https://emprendemas15-ship-it.github.io/colipets/

The public GitHub repository contains application source, not business spreadsheets or generated reconciliation files. The deployment workflow copies only the files needed to run the PWA.

## Create and configure Supabase

1. Create a Supabase project in South America (São Paulo) and keep its database password private.
2. In the Supabase SQL Editor, run [`supabase/migrations/20261109000000_colipets_shared_state.sql`](./supabase/migrations/20261109000000_colipets_shared_state.sql). It creates the per-account state table, row-level security policies, an atomic merge function, and realtime updates.
3. In **Project Settings → API**, copy the Project URL and the public `anon`/publishable key. Never use or publish the `service_role` or secret key in this browser app.
4. In **Authentication → URL Configuration**, set the Site URL and redirect allow list to `https://emprendemas15-ship-it.github.io/colipets/`.
5. In **Authentication → Providers → Email**, configure email/password sign-in. Create the shared account once from the app; confirm the email if Supabase requests it.

## Publish on GitHub Pages

1. Create a **public** GitHub repository named `colipets` and push this project to its `main` branch.
2. Open **Settings → Secrets and variables → Actions** and add these repository secrets:
   - `SUPABASE_URL`: the Supabase Project URL.
   - `SUPABASE_ANON_KEY`: the public anon/publishable key.
3. Under **Settings → Pages**, select **GitHub Actions** as the build and deployment source.
4. The workflow deploys on each push to `main`. After the first successful run, open the Pages URL shown in the deployment. The app opens directly; sign in only if you want to sync between devices.

The workflow writes the public client configuration only into the generated Pages artifact. It fails instead of publishing an app without its Supabase connection settings.

## Data and offline use

COLIPETS opens directly in local mode, and its data stays on that device unless you choose **Sincronizar entre dispositivos** and sign in. On the first sign-in, existing `taller_*` and `colipets_*` app data in that browser is merged into the account. Catalog entries merge by code and movements by ID; cloud values win if the same record differs. Later changes sync through Supabase and realtime updates. Use the same account on each device.

If Supabase is unavailable, COLIPETS still opens in local mode. Local-only changes are not uploaded until you sign in. The PWA caches its app shell for offline access after the first successful visit. Export a COLIPETS backup before changing devices or accounts.

The Excel workbook, `outputs/`, local Node modules, and spreadsheet-analysis scripts are intentionally excluded from GitHub by [`.gitignore`](./.gitignore).
