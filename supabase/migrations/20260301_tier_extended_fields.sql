-- Phase 2.0 — Extended tier configuration
-- Run this in Supabase SQL Editor or via supabase db push

alter table tarifas
  add column if not exists hidden_products    text[]  not null default '{}',
  add column if not exists minimum_order_value numeric not null default 0,
  add column if not exists pack_size          integer not null default 1;

comment on column tarifas.hidden_products     is 'Array of Shopify product IDs hidden from this tier''s catalog view';
comment on column tarifas.minimum_order_value is 'Minimum order total (EUR) required to submit an order on this tier. 0 = no minimum.';
comment on column tarifas.pack_size           is 'Quantity must be a multiple of this number. 1 = no restriction.';
