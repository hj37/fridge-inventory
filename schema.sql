create table public.fridge_items (
id bigint generated always as identity primary key,
user_id uuid not null references auth.users(id) on delete cascade,
name varchar(100) not null check (length(trim(name)) > 0),
icon varchar(16) not null default '🥬',
quantity numeric(7,2) not null default 1 check (quantity > 0 and quantity <= 99999),
unit varchar(20) not null default '개' check (length(trim(unit)) > 0),
location varchar(10) not null default '냉장' check (location in ('냉장','냉동','실온')),
expires_on date,
created_at timestamptz not null default now(),
updated_at timestamptz not null default now()
);
create index fridge_items_user_expiry on public.fridge_items(user_id,expires_on);
alter table public.fridge_items enable row level security;
revoke all on public.fridge_items from anon;
grant select,insert,update,delete on public.fridge_items to authenticated;
grant usage,select on sequence public.fridge_items_id_seq to authenticated;
create policy own_items_select on public.fridge_items for select to authenticated using ((select auth.uid())=user_id);
create policy own_items_insert on public.fridge_items for insert to authenticated with check ((select auth.uid())=user_id);
create policy own_items_update on public.fridge_items for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy own_items_delete on public.fridge_items for delete to authenticated using ((select auth.uid())=user_id);
create function public.set_fridge_updated_at() returns trigger language plpgsql set search_path = '' as $$ begin new.updated_at = now(); return new; end; $$;
create trigger fridge_items_updated before update on public.fridge_items for each row execute function public.set_fridge_updated_at();
