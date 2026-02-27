-- Migration: Extended customer profile fields
-- Run this in your Supabase SQL editor

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS nombre_comercial       TEXT,
  ADD COLUMN IF NOT EXISTS tipo_empresa           TEXT,
  ADD COLUMN IF NOT EXISTS tipo_fiscal            TEXT DEFAULT 'NIF/CIF',
  ADD COLUMN IF NOT EXISTS numero_eori            TEXT,
  ADD COLUMN IF NOT EXISTS fecha_constitucion     DATE,
  ADD COLUMN IF NOT EXISTS direccion_fiscal       JSONB,
  ADD COLUMN IF NOT EXISTS tipo_cliente           TEXT,
  ADD COLUMN IF NOT EXISTS zona_distribucion      TEXT,
  ADD COLUMN IF NOT EXISTS marcas_comercializadas TEXT,
  ADD COLUMN IF NOT EXISTS volumen_estimado       TEXT,
  ADD COLUMN IF NOT EXISTS num_puntos_venta       INTEGER,
  ADD COLUMN IF NOT EXISTS condiciones_legales    JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS condiciones_comerciales JSONB NOT NULL DEFAULT '{}';

-- Optional: add comment documentation
COMMENT ON COLUMN customers.nombre_comercial        IS 'Trade name if different from razón social';
COMMENT ON COLUMN customers.tipo_empresa            IS 'Legal entity type: SL, SA, LLC, Ltd, GmbH, SAS, AG, Autónomo, Otro';
COMMENT ON COLUMN customers.tipo_fiscal             IS 'Tax ID type: NIF/CIF, VAT Number, EIN, Tax ID';
COMMENT ON COLUMN customers.numero_eori             IS 'EORI number for EU cross-border operations';
COMMENT ON COLUMN customers.fecha_constitucion      IS 'Date of company incorporation';
COMMENT ON COLUMN customers.direccion_fiscal        IS 'Fiscal/legal address {street, city, state, postal_code, country}';
COMMENT ON COLUMN customers.tipo_cliente            IS 'distribuidor|mayorista|tienda_fisica|ecommerce|cadena|marketplace';
COMMENT ON COLUMN customers.zona_distribucion       IS 'Geographic distribution zone';
COMMENT ON COLUMN customers.marcas_comercializadas  IS 'Brands currently sold by this customer';
COMMENT ON COLUMN customers.volumen_estimado        IS 'Estimated monthly/annual purchase volume';
COMMENT ON COLUMN customers.num_puntos_venta        IS 'Number of sales points / stores';
COMMENT ON COLUMN customers.condiciones_legales     IS '{acepta_condiciones, acepta_privacidad, consentimiento_comunicaciones, declaracion_cumplimiento}';
COMMENT ON COLUMN customers.condiciones_comerciales IS '{forma_pago, condiciones_pago, notas_especiales}';
