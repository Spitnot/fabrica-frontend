-- Portal hero banner — singleton table (one row)
CREATE TABLE IF NOT EXISTS portal_hero (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  active       boolean     NOT NULL DEFAULT false,
  bg_image_url text        NOT NULL DEFAULT '',
  titulo       text        NOT NULL DEFAULT '',
  descripcion  text        NOT NULL DEFAULT '',
  cta_label    text        NOT NULL DEFAULT 'New Order',
  cta_href     text        NOT NULL DEFAULT '/portal/pedidos/nuevo',
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- Seed default row
INSERT INTO portal_hero (active, titulo, descripcion, cta_label, cta_href)
SELECT false, '', '', 'New Order', '/portal/pedidos/nuevo'
WHERE NOT EXISTS (SELECT 1 FROM portal_hero);
