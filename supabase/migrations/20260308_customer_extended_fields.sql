-- ─────────────────────────────────────────────────────────────────────────────
-- MIGRACIÓN: Campos extendidos de clientes
-- Añade campos del formulario que no tenían columna en DB
-- Ejecutar en Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS nombre_comercial   text,
  ADD COLUMN IF NOT EXISTS tipo_empresa       text,
  ADD COLUMN IF NOT EXISTS numero_eori        text,
  ADD COLUMN IF NOT EXISTS fecha_constitucion date,
  ADD COLUMN IF NOT EXISTS perfil_comercial   jsonb;

COMMENT ON COLUMN customers.nombre_comercial   IS 'Nombre comercial (puede diferir de razón social)';
COMMENT ON COLUMN customers.tipo_empresa       IS 'Forma jurídica: SL, SA, LLC, Autónomo, etc.';
COMMENT ON COLUMN customers.numero_eori        IS 'Número EORI para operaciones aduaneras';
COMMENT ON COLUMN customers.fecha_constitucion IS 'Fecha de constitución de la empresa';
COMMENT ON COLUMN customers.perfil_comercial   IS 'Datos comerciales: {zona_distribucion, marcas_comercializadas, volumen_estimado, num_puntos_venta}';
