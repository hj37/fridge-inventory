alter table public.fridge_items add column category varchar(20) not null default '식재료' check(category in ('식재료','소스·장류'));
create table public.fridge_receipt_imports (
 id bigint generated always as identity primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 receipt_hash varchar(64) not null check(receipt_hash ~ '^[0-9a-f]{64}$'),
 created_at timestamptz not null default now(),
 unique(user_id,receipt_hash)
);
alter table public.fridge_receipt_imports enable row level security;
revoke all on public.fridge_receipt_imports from anon;
grant select,insert on public.fridge_receipt_imports to authenticated;
grant usage,select on sequence public.fridge_receipt_imports_id_seq to authenticated;
create policy own_receipts_select on public.fridge_receipt_imports for select to authenticated using ((select auth.uid())=user_id);
create policy own_receipts_insert on public.fridge_receipt_imports for insert to authenticated with check ((select auth.uid())=user_id);
create function public.import_fridge_receipt(receipt_hash text,receipt_rows jsonb) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
 owner_id uuid := auth.uid();
 row_value jsonb;
 claimed integer;
 amount numeric;
 changed integer;
begin
 if owner_id is null then raise exception '로그인이 필요해요.'; end if;
 if jsonb_typeof(receipt_rows) is distinct from 'array' then raise exception '품목 목록을 확인해주세요.'; end if;
 if jsonb_array_length(receipt_rows)<1 or jsonb_array_length(receipt_rows)>50 then raise exception '품목은 1~50개까지 반영할 수 있어요.'; end if;
 insert into public.fridge_receipt_imports(user_id,receipt_hash) values(owner_id,receipt_hash)
 on conflict on constraint fridge_receipt_imports_user_id_receipt_hash_key do nothing;
 get diagnostics claimed=row_count;
 if claimed=0 then return jsonb_build_object('duplicate',true); end if;
 for row_value in select value from jsonb_array_elements(receipt_rows) loop
  amount := (row_value->>'quantity')::numeric;
  if amount is null or amount<=0 or amount>99999 then raise exception '수량을 확인해주세요.'; end if;
  if nullif(row_value->>'target_id','') is not null then
   update public.fridge_items set quantity=quantity+amount
   where id=(row_value->>'target_id')::bigint and user_id=owner_id
   and unit=row_value->>'unit' and location=row_value->>'location'
   and expires_on is not distinct from nullif(row_value->>'expires_on','')::date;
   get diagnostics changed=row_count;
   if changed<>1 then raise exception '기존 재고의 단위·보관장소·소비기한을 확인해주세요.'; end if;
  else
   insert into public.fridge_items(user_id,name,icon,quantity,unit,location,expires_on,category)
   values(owner_id,trim(row_value->>'name'),row_value->>'icon',amount,row_value->>'unit',row_value->>'location',nullif(row_value->>'expires_on','')::date,row_value->>'category');
  end if;
 end loop;
 return jsonb_build_object('duplicate',false,'count',jsonb_array_length(receipt_rows));
end; $$;
revoke execute on function public.import_fridge_receipt(text,jsonb) from public,anon;
grant execute on function public.import_fridge_receipt(text,jsonb) to authenticated;
