create table if not exists public.colipets_app_state (
    user_id uuid primary key references auth.users (id) on delete cascade,
    data jsonb not null default '{}'::jsonb,
    updated_at timestamptz not null default now(),
    constraint colipets_app_state_data_is_object
        check (jsonb_typeof(data) = 'object')
);

alter table public.colipets_app_state enable row level security;

create policy "Users can read their own COLIPETS state"
    on public.colipets_app_state
    for select
    to authenticated
    using ((select auth.uid()) = user_id);

create policy "Users can create their own COLIPETS state"
    on public.colipets_app_state
    for insert
    to authenticated
    with check ((select auth.uid()) = user_id);

create policy "Users can update their own COLIPETS state"
    on public.colipets_app_state
    for update
    to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);

grant select, insert, update on public.colipets_app_state to authenticated;
revoke all on public.colipets_app_state from anon;

create or replace function public.colipets_merge_json(
    p_current jsonb,
    p_incoming jsonb,
    p_key text default null
)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $$
declare
    v_result jsonb;
    v_entry jsonb;
    v_existing jsonb;
    v_key text;
    v_identity text;
    v_existing_identity text;
    v_index integer;
    v_found boolean;
    v_identity_by_code boolean;
begin
    if p_key in (
        'taller_pt_vla',
        'taller_mp_vla',
        'taller_nofab_v1',
        'taller_clientes_v1'
    ) and jsonb_typeof(p_incoming) = 'array' then
        return p_incoming;
    end if;

    if jsonb_typeof(p_current) = 'object' and jsonb_typeof(p_incoming) = 'object' then
        v_result := p_current;
        for v_key in select jsonb_object_keys(p_incoming)
        loop
            if v_result ? v_key then
                v_result := jsonb_set(
                    v_result,
                    array[v_key],
                    public.colipets_merge_json(v_result -> v_key, p_incoming -> v_key, v_key),
                    true
                );
            else
                v_result := jsonb_set(v_result, array[v_key], p_incoming -> v_key, true);
            end if;
        end loop;
        return v_result;
    end if;

    if jsonb_typeof(p_current) = 'array' and jsonb_typeof(p_incoming) = 'array' then
        v_result := p_current;
        v_identity_by_code := p_key in (
            'taller_pt_vla',
            'taller_mp_vla',
            'taller_nofab_v1',
            'taller_clientes_v1'
        );

        for v_entry in select value from jsonb_array_elements(p_incoming)
        loop
            v_identity := coalesce(
                v_entry ->> 'id',
                v_entry ->> 'operationId',
                v_entry ->> 'numero',
                case when v_identity_by_code then v_entry ->> 'codigo' end,
                v_entry::text
            );
            v_found := false;

            for v_index in 0 .. jsonb_array_length(v_result) - 1
            loop
                v_existing := v_result -> v_index;
                v_existing_identity := coalesce(
                    v_existing ->> 'id',
                    v_existing ->> 'operationId',
                    v_existing ->> 'numero',
                    case when v_identity_by_code then v_existing ->> 'codigo' end,
                    v_existing::text
                );

                if v_identity = v_existing_identity then
                    v_result := jsonb_set(
                        v_result,
                        array[v_index::text],
                        public.colipets_merge_json(v_existing, v_entry, p_key),
                        false
                    );
                    v_found := true;
                    exit;
                end if;
            end loop;

            if not v_found then
                v_result := v_result || jsonb_build_array(v_entry);
            end if;
        end loop;

        return v_result;
    end if;

    return p_incoming;
end;
$$;

revoke all on function public.colipets_merge_json(jsonb, jsonb, text) from public, anon;
grant execute on function public.colipets_merge_json(jsonb, jsonb, text) to authenticated;

create or replace function public.sync_colipets_app_state(p_data jsonb)
returns table (data jsonb, updated_at timestamptz)
language plpgsql
security invoker
set search_path = ''
as $$
declare
    v_user_id uuid := auth.uid();
    v_current jsonb;
    v_merged jsonb;
    v_updated_at timestamptz;
begin
    if v_user_id is null then
        raise exception 'Authentication is required to sync COLIPETS data.';
    end if;

    if jsonb_typeof(p_data) <> 'object' then
        raise exception 'COLIPETS data must be a JSON object.';
    end if;

    insert into public.colipets_app_state (user_id, data)
    values (v_user_id, '{}'::jsonb)
    on conflict (user_id) do nothing;

    select state.data
    into v_current
    from public.colipets_app_state as state
    where state.user_id = v_user_id
    for update;

    v_merged := public.colipets_merge_json(v_current, p_data);

    update public.colipets_app_state as state
    set data = v_merged,
        updated_at = now()
    where state.user_id = v_user_id
    returning state.updated_at into v_updated_at;

    return query select v_merged, v_updated_at;
end;
$$;

revoke all on function public.sync_colipets_app_state(jsonb) from public, anon;
grant execute on function public.sync_colipets_app_state(jsonb) to authenticated;

do $$
begin
    alter publication supabase_realtime add table public.colipets_app_state;
exception
    when duplicate_object then null;
end;
$$;
