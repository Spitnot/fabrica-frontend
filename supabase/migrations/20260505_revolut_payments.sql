-- revolut_payments — tabla de pagos online via Revolut Merchant API

create table if not exists revolut_payments (
  id                  uuid        primary key default gen_random_uuid(),
  order_id            uuid        not null references orders(id) on delete restrict,
  customer_id         uuid        not null references customers(id) on delete restrict,
  revolut_order_id    text        not null unique,
  revolut_payment_id  text,
  amount              numeric     not null,
  currency            text        not null default 'EUR',
  status              text        not null default 'pending'
                        check (status in ('pending', 'completed', 'failed', 'cancelled')),
  checkout_url        text        not null,
  merchant_reference  text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  completed_at        timestamptz,
  error_message       text,
  revolut_response    jsonb,
  metadata            jsonb
);

-- Índices de búsqueda frecuente
create index if not exists revolut_payments_order_id_idx     on revolut_payments(order_id);
create index if not exists revolut_payments_customer_id_idx  on revolut_payments(customer_id);
create index if not exists revolut_payments_status_idx       on revolut_payments(status);

-- RLS: habilitado, solo la service role escribe; clientes solo ven sus propios pagos
alter table revolut_payments enable row level security;

create policy "customers_select_own_payments"
  on revolut_payments for select
  using (auth.uid() = customer_id);

-- updated_at automático
create or replace function update_revolut_payments_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger revolut_payments_updated_at
  before update on revolut_payments
  for each row execute function update_revolut_payments_updated_at();
