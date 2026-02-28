-- Email send history log
CREATE TABLE email_logs (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  type        text        NOT NULL,   -- 'welcome' | 'order_confirmation' | 'order_shipped' | 'admin_notification'
  recipient   text        NOT NULL,
  subject     text        NOT NULL,
  customer_id uuid        REFERENCES customers(id) ON DELETE SET NULL,
  order_id    uuid        REFERENCES orders(id)    ON DELETE SET NULL,
  status      text        NOT NULL DEFAULT 'sent', -- 'sent' | 'failed'
  error       text,
  sent_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX email_logs_sent_at_idx     ON email_logs(sent_at DESC);
CREATE INDEX email_logs_customer_id_idx ON email_logs(customer_id);
CREATE INDEX email_logs_order_id_idx    ON email_logs(order_id);
