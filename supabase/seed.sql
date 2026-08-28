-- Dados de demonstração para o primeiro usuário do projeto de desenvolvimento. Não execute em produção.
do $$
declare
  demo_user uuid; demo_list uuid; demo_session uuid; demo_category uuid;
  product_names text[] := array['Arroz 5kg','Feijão 1kg','Leite 1L','Café 500g','Detergente 500ml','Papel higiênico 12 rolos'];
  base_prices numeric[] := array[27.90,8.49,5.69,23.90,2.79,18.90];
  product_name text; product_id uuid; market_row record; month_offset integer; item_index integer;
begin
  select id into demo_user from auth.users order by created_at limit 1;
  if demo_user is null then raise notice 'Crie um usuário de desenvolvimento antes de executar o seed.'; return; end if;
  insert into public.categories(user_id, name, is_system) select demo_user, name, true from unnest(array['Mercearia','Laticínios','Açougue','Hortifruti','Padaria','Bebidas','Limpeza','Higiene','Outros']) name on conflict (user_id, name) do nothing;
  insert into public.markets(user_id, name) select demo_user, name from unnest(array['Guanabara','Mundial','Assaí','Prezunic']) name on conflict (user_id, name) do nothing;
  select id into demo_category from public.categories where user_id = demo_user and name = 'Mercearia';
  foreach product_name in array product_names loop insert into public.products(user_id, name, category_id) values (demo_user, product_name, demo_category); end loop;
  insert into public.shopping_lists(user_id, name, description, budget) values (demo_user, 'Compra do mês', 'Lista demonstrativa para validação', 700) returning id into demo_list;
  insert into public.shopping_list_items(list_id, user_id, product_id, name_snapshot, category_id, quantity, estimated_price)
  select demo_list, demo_user, p.id, p.name, p.category_id, case when p.name = 'Leite 1L' then 12 else 1 end, base_prices[array_position(product_names, p.name)] from public.products p where p.user_id = demo_user and p.name = any(product_names);
  for month_offset in 1..6 loop
    select * into market_row from public.markets where user_id = demo_user order by name offset ((month_offset - 1) % 4) limit 1;
    insert into public.shopping_sessions(user_id, list_id, started_at, finished_at, initial_market_id, current_market_id, total, status) values (demo_user, demo_list, now() - make_interval(months => month_offset), now() - make_interval(months => month_offset) + interval '1 hour', market_row.id, market_row.id, 0, 'completed') returning id into demo_session;
    item_index := 0;
    foreach product_name in array product_names loop
      item_index := item_index + 1; select id into product_id from public.products where user_id = demo_user and name = product_name limit 1;
      insert into public.purchase_items(shopping_session_id, product_id, user_id, product_name_snapshot, category_id, quantity, unit_price, market_id, purchased_at) values (demo_session, product_id, demo_user, product_name, demo_category, case when product_name = 'Leite 1L' then 12 else 1 end, round((base_prices[item_index] * (1 + month_offset * 0.012 + ((item_index + month_offset) % 3) * 0.018))::numeric, 2), market_row.id, now() - make_interval(months => month_offset));
    end loop;
    update public.shopping_sessions set total = (select sum(total_price) from public.purchase_items where shopping_session_id = demo_session) where id = demo_session;
  end loop;
end $$;
