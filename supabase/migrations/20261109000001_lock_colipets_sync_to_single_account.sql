begin;

create table if not exists public.colipets_sync_owner (
    singleton boolean primary key default true check (singleton),
    user_id uuid not null unique references auth.users (id) on delete cascade
);

alter table public.colipets_sync_owner enable row level security;

revoke all on public.colipets_sync_owner from public, anon;
revoke insert, update, delete on public.colipets_sync_owner from authenticated;
grant select on public.colipets_sync_owner to authenticated;

drop policy if exists "Authorized account can read COLIPETS sync owner"
    on public.colipets_sync_owner;
create policy "Authorized account can read COLIPETS sync owner"
    on public.colipets_sync_owner
    for select
    to authenticated
    using ((select auth.uid()) = user_id);

drop policy if exists "Users can read their own COLIPETS state"
    on public.colipets_app_state;
drop policy if exists "Users can create their own COLIPETS state"
    on public.colipets_app_state;
drop policy if exists "Users can update their own COLIPETS state"
    on public.colipets_app_state;
drop policy if exists "Authorized account can read COLIPETS state"
    on public.colipets_app_state;
drop policy if exists "Authorized account can create COLIPETS state"
    on public.colipets_app_state;
drop policy if exists "Authorized account can update COLIPETS state"
    on public.colipets_app_state;

create policy "Authorized account can read COLIPETS state"
    on public.colipets_app_state
    for select
    to authenticated
    using (
        (select auth.uid()) = user_id
        and exists (
            select 1
            from public.colipets_sync_owner as owner
            where owner.user_id = (select auth.uid())
        )
    );

create policy "Authorized account can create COLIPETS state"
    on public.colipets_app_state
    for insert
    to authenticated
    with check (
        (select auth.uid()) = user_id
        and exists (
            select 1
            from public.colipets_sync_owner as owner
            where owner.user_id = (select auth.uid())
        )
    );

create policy "Authorized account can update COLIPETS state"
    on public.colipets_app_state
    for update
    to authenticated
    using (
        (select auth.uid()) = user_id
        and exists (
            select 1
            from public.colipets_sync_owner as owner
            where owner.user_id = (select auth.uid())
        )
    )
    with check (
        (select auth.uid()) = user_id
        and exists (
            select 1
            from public.colipets_sync_owner as owner
            where owner.user_id = (select auth.uid())
        )
    );

commit;
