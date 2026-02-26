-- ─────────────────────────────────────────────────────────────────────────────
-- MIGRACIÓN: Sistema de tarifas (RETAIL / WHOLESALE)
-- Ejecutar en Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Tabla de tarifas (niveles de precio)
CREATE TABLE IF NOT EXISTS tarifas (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre        text NOT NULL UNIQUE,
  descripcion   text,
  multiplicador decimal NOT NULL DEFAULT 1.0,   -- fallback: shopify_price × multiplicador
  activo        bool NOT NULL DEFAULT true,
  created_at    timestamptz DEFAULT now()
);

-- 2. Tarifas por defecto
INSERT INTO tarifas (nombre, descripcion, multiplicador) VALUES
  ('Retail',    'Precio público',   1.0),
  ('Wholesale', 'Precio mayorista', 0.65)
ON CONFLICT (nombre) DO NOTHING;

-- 3. Precios explícitos por SKU por tarifa (opcional, sobreescribe multiplicador)
CREATE TABLE IF NOT EXISTS tarifas_precios (
  tarifa_id  uuid    NOT NULL REFERENCES tarifas(id) ON DELETE CASCADE,
  sku        text    NOT NULL,
  precio     decimal NOT NULL CHECK (precio >= 0),
  PRIMARY KEY (tarifa_id, sku)
);

-- 4. Ampliar tabla customers
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS tarifa_id    uuid    REFERENCES tarifas(id),
  ADD COLUMN IF NOT EXISTS descuento_pct decimal NOT NULL DEFAULT 0
    CHECK (descuento_pct >= 0 AND descuento_pct <= 100);

-- 5. Asignar Wholesale a clientes existentes sin tarifa
UPDATE customers
  SET tarifa_id = (SELECT id FROM tarifas WHERE nombre = 'Wholesale' LIMIT 1)
WHERE tarifa_id IS NULL;
