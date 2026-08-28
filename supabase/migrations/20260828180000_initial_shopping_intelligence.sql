create extension if not exists pgcrypto;

create type public.shopping_list_status as enum ('active', 'completed', 'archived');
create type public.shopping_item_status as enum ('pending', 'purchased', 'removed');
create type public.shopping_session_status as enum ('active', 'completed', 'cancelled');
create type public.price_source as enum ('purchase', 'promotion', 'external_api', 'manual');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  nome text not null default '',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  icon text,
  color text,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, name)
);

create table public.markets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  address text,
  city text,
  state text,
  favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, name)
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  brand text,
  ean text,
  package_description text,
  category_id uuid references public.categories(id) on delete set null,
  favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index products_user_ean_unique on public.products(user_id, ean) where ean is not null;

create table public.shopping_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  budget numeric(12,2) check (budget is null or budget >= 0),
  status public.shopping_list_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table public.shopping_list_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.shopping_lists(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  name_snapshot text not null,
  category_id uuid references public.categories(id) on delete set null,
  quantity numeric(10,3) not null default 1 check (quantity > 0),
  estimated_price numeric(12,2) check (estimated_price is null or estimated_price >= 0),
  status public.shopping_item_status not null default 'pending',
  favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.shopping_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  list_id uuid not null references public.shopping_lists(id) on delete restrict,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  initial_market_id uuid references public.markets(id) on delete set null,
  current_market_id uuid references public.markets(id) on delete set null,
  total numeric(12,2) check (total is null or total >= 0),
  status public.shopping_session_status not null default 'active'
);

create unique index one_active_session_per_list on public.shopping_sessions(list_id) where status = 'active';

create table public.purchase_items (
  id uuid primary key default gen_random_uuid(),
  shopping_session_id uuid not null references public.shopping_sessions(id) on delete cascade,
  shopping_list_item_id uuid references public.shopping_list_items(id) on delete set null,
  product_id uuid references public.products(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  product_name_snapshot text not null,
  category_id uuid references public.categories(id) on delete set null,
  quantity numeric(10,3) not null check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  total_price numeric(12,2) generated always as (round(quantity * unit_price, 2)) stored,
  market_id uuid not null references public.markets(id) on delete restrict,
  source public.price_source not null default 'purchase',
  purchased_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.promotions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  market_id uuid not null references public.markets(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  brand text,
  package_description text,
  regular_price numeric(12,2),
  promotional_price numeric(12,2) not null check (promotional_price >= 0),
  promotion_type text,
  promotion_rule text,
  requires_loyalty_program boolean not null default false,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  source_type public.price_source not null default 'promotion',
  source_reference text,
  created_at timestamptz not null default now(),
  check (ends_at >= starts_at)
);

create index categories_user_id_idx on public.categories(user_id);
create index markets_user_id_idx on public.markets(user_id);
create index products_user_id_idx on public.products(user_id);
create index shopping_lists_user_id_idx on public.shopping_lists(user_id);
create index shopping_list_items_list_id_idx on public.shopping_list_items(list_id);
create index shopping_list_items_user_id_idx on public.shopping_list_items(user_id);
create index shopping_sessions_user_id_idx on public.shopping_sessions(user_id);
create index purchase_items_user_id_idx on public.purchase_items(user_id);
create index purchase_items_product_id_idx on public.purchase_items(product_id);
create index purchase_items_market_id_idx on public.purchase_items(market_id);
create index purchase_items_purchased_at_idx on public.purchase_items(purchased_at desc);
create index promotions_market_dates_idx on public.promotions(market_id, starts_at, ends_at);

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger categories_updated_at before update on public.categories for each row execute function public.set_updated_at();
create trigger markets_updated_at before update on public.markets for each row execute function public.set_updated_at();
create trigger products_updated_at before update on public.products for each row execute function public.set_updated_at();
create trigger shopping_lists_updated_at before update on public.shopping_lists for each row execute function public.set_updated_at();
create trigger shopping_list_items_updated_at before update on public.shopping_list_items for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  category_name text;
  market_name text;
begin
  insert into public.profiles (id, email, nome)
  values (new.id, coalesce(new.email, ''), coalesce(new.raw_user_meta_data ->> 'nome', split_part(coalesce(new.email, ''), '@', 1)));

  foreach category_name in array array['Mercearia','Laticínios','Açougue','Hortifruti','Padaria','Bebidas','Limpeza','Higiene','Outros'] loop
    insert into public.categories (user_id, name, is_system) values (new.id, category_name, true);
  end loop;
  foreach market_name in array array['Guanabara','Mundial','Assaí','Prezunic'] loop
    insert into public.markets (user_id, name) values (new.id, market_name);
  end loop;
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.markets enable row level security;
alter table public.products enable row level security;
alter table public.shopping_lists enable row level security;
alter table public.shopping_list_items enable row level security;
alter table public.shopping_sessions enable row level security;
alter table public.purchase_items enable row level security;
alter table public.promotions enable row level security;

create policy profiles_select_own on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy profiles_update_own on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy categories_select_own on public.categories for select to authenticated using ((select auth.uid()) = user_id);
create policy categories_insert_own on public.categories for insert to authenticated with check ((select auth.uid()) = user_id and is_system = false);
create policy categories_update_own on public.categories for update to authenticated using ((select auth.uid()) = user_id and is_system = false) with check ((select auth.uid()) = user_id and is_system = false);
create policy categories_delete_own on public.categories for delete to authenticated using ((select auth.uid()) = user_id and is_system = false);

create policy markets_select_own on public.markets for select to authenticated using ((select auth.uid()) = user_id);
create policy markets_insert_own on public.markets for insert to authenticated with check ((select auth.uid()) = user_id);
create policy markets_update_own on public.markets for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy markets_delete_own on public.markets for delete to authenticated using ((select auth.uid()) = user_id);

create policy products_select_own on public.products for select to authenticated using ((select auth.uid()) = user_id);
create policy products_insert_own on public.products for insert to authenticated with check ((select auth.uid()) = user_id);
create policy products_update_own on public.products for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy products_delete_own on public.products for delete to authenticated using ((select auth.uid()) = user_id);

create policy lists_select_own on public.shopping_lists for select to authenticated using ((select auth.uid()) = user_id);
create policy lists_insert_own on public.shopping_lists for insert to authenticated with check ((select auth.uid()) = user_id);
create policy lists_update_own on public.shopping_lists for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy lists_delete_own on public.shopping_lists for delete to authenticated using ((select auth.uid()) = user_id);

create policy list_items_select_own on public.shopping_list_items for select to authenticated using ((select auth.uid()) = user_id);
create policy list_items_insert_own on public.shopping_list_items for insert to authenticated with check ((select auth.uid()) = user_id and exists (select 1 from public.shopping_lists l where l.id = list_id and l.user_id = (select auth.uid())));
create policy list_items_update_own on public.shopping_list_items for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy list_items_delete_own on public.shopping_list_items for delete to authenticated using ((select auth.uid()) = user_id);

create policy sessions_select_own on public.shopping_sessions for select to authenticated using ((select auth.uid()) = user_id);
create policy sessions_insert_own on public.shopping_sessions for insert to authenticated with check ((select auth.uid()) = user_id);
create policy sessions_update_own on public.shopping_sessions for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy sessions_delete_own on public.shopping_sessions for delete to authenticated using ((select auth.uid()) = user_id);

create policy purchases_select_own on public.purchase_items for select to authenticated using ((select auth.uid()) = user_id);
create policy purchases_insert_own on public.purchase_items for insert to authenticated with check ((select auth.uid()) = user_id);
create policy purchases_update_own on public.purchase_items for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy purchases_delete_own on public.purchase_items for delete to authenticated using ((select auth.uid()) = user_id);

create policy promotions_select_own on public.promotions for select to authenticated using ((select auth.uid()) = user_id);
create policy promotions_insert_own on public.promotions for insert to authenticated with check ((select auth.uid()) = user_id);
create policy promotions_update_own on public.promotions for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy promotions_delete_own on public.promotions for delete to authenticated using ((select auth.uid()) = user_id);

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.profiles, public.categories, public.markets, public.products, public.shopping_lists, public.shopping_list_items, public.shopping_sessions, public.purchase_items, public.promotions to authenticated;

