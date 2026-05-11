'use client';

import { useState } from 'react';
import { FR } from '@/components/fr/Atoms';

// ─── Translations ─────────────────────────────────────────────────────────────

const LANG_LABELS: Record<string, string> = {
  es: 'Español',
  en: 'English',
  de: 'Deutsch',
  fr: 'Français',
};

const UI: Record<string, Record<string, string>> = {
  es: {
    title: 'AYUDA',
    subtitle: 'FAQ · CONTACTO',
    faqHead: 'PREGUNTAS FRECUENTES',
    contactHead: 'CONTÁCTANOS',
    subjectLabel: 'Asunto',
    orderIdLabel: 'Nº de pedido',
    orderIdHint: '(opcional)',
    orderIdPlaceholder: 'ej. A1B2C3D4',
    messageLabel: 'Mensaje',
    messagePlaceholder: 'Describe tu consulta o problema…',
    sendBtn: 'ENVIAR MENSAJE',
    sendingBtn: 'ENVIANDO…',
    successMsg: '✓ Mensaje enviado — te responderemos en un día laborable.',
    sendAnother: 'Enviar otro mensaje',
    replyTime: 'Respuesta en 1 día laborable',
  },
  en: {
    title: 'HELP',
    subtitle: 'FAQ · CONTACT',
    faqHead: 'FREQUENTLY ASKED QUESTIONS',
    contactHead: 'CONTACT US',
    subjectLabel: 'Subject',
    orderIdLabel: 'Order ID',
    orderIdHint: '(optional)',
    orderIdPlaceholder: 'e.g. A1B2C3D4',
    messageLabel: 'Message',
    messagePlaceholder: 'Describe your question or issue…',
    sendBtn: 'SEND MESSAGE',
    sendingBtn: 'SENDING…',
    successMsg: '✓ Message sent — we\'ll get back to you within one business day.',
    sendAnother: 'Send another message',
    replyTime: 'Reply within 1 business day',
  },
  de: {
    title: 'HILFE',
    subtitle: 'FAQ · KONTAKT',
    faqHead: 'HÄUFIGE FRAGEN',
    contactHead: 'KONTAKT',
    subjectLabel: 'Betreff',
    orderIdLabel: 'Bestellnummer',
    orderIdHint: '(optional)',
    orderIdPlaceholder: 'z.B. A1B2C3D4',
    messageLabel: 'Nachricht',
    messagePlaceholder: 'Beschreibe deine Frage oder dein Anliegen…',
    sendBtn: 'NACHRICHT SENDEN',
    sendingBtn: 'WIRD GESENDET…',
    successMsg: '✓ Nachricht gesendet — wir melden uns innerhalb eines Werktages.',
    sendAnother: 'Weitere Nachricht senden',
    replyTime: 'Antwort innerhalb 1 Werktages',
  },
  fr: {
    title: 'AIDE',
    subtitle: 'FAQ · CONTACT',
    faqHead: 'QUESTIONS FRÉQUENTES',
    contactHead: 'NOUS CONTACTER',
    subjectLabel: 'Sujet',
    orderIdLabel: 'Nº de commande',
    orderIdHint: '(optionnel)',
    orderIdPlaceholder: 'ex. A1B2C3D4',
    messageLabel: 'Message',
    messagePlaceholder: 'Décrivez votre question ou problème…',
    sendBtn: 'ENVOYER LE MESSAGE',
    sendingBtn: 'ENVOI EN COURS…',
    successMsg: '✓ Message envoyé — nous vous répondrons dans un jour ouvrable.',
    sendAnother: 'Envoyer un autre message',
    replyTime: 'Réponse sous 1 jour ouvrable',
  },
};

const FAQ: Record<string, { q: string; a: string }[]> = {
  es: [
    {
      q: '¿Cómo hago un nuevo pedido?',
      a: 'En el portal, haz clic en "New Order". Verás el catálogo con tus productos disponibles y precios según tu tarifa. Añade las unidades que necesitas para cada variante y confirma. Recibirás confirmación inmediata y podrás seguir el estado del pedido en tiempo real desde la sección "Orders".',
    },
    {
      q: '¿Cuándo entra mi pedido en producción?',
      a: 'Los pedidos confirmados entran en producción en 24–48 horas laborables. Cuando el estado cambie a "In Production" recibirás una notificación. El proceso completo desde confirmación hasta "Ready to Ship" es habitualmente de 3–5 días laborables, aunque puede variar según el volumen.',
    },
    {
      q: '¿Cómo funciona el proceso de pago?',
      a: 'El pago se activa cuando el pedido llega al estado "Ready to Ship" — en ese momento los costes de envío ya están confirmados y sabes exactamente el total. El pago es online a través de Revolut (tarjeta de crédito/débito o transferencia bancaria). Tras el pago, el pedido pasa automáticamente a "Shipped" y recibirás el número de seguimiento.',
    },
    {
      q: '¿Cuáles son los plazos de envío?',
      a: 'España peninsular: 24–48 horas. Baleares e Islas Canarias: 3–5 días laborables. Europa continental: 3–7 días laborables según país y transportista. Al llegar al estado "Ready to Ship" verás el servicio de envío asignado con la estimación de días.',
    },
    {
      q: '¿Cuánto pesa mi pedido y cómo se calcula el envío?',
      a: 'Cada producto tiene un peso unitario definido. Al crear el pedido puedes ver el peso total estimado. El coste de envío se calcula definitivamente en el momento del despacho, según el peso real y destino, y se refleja en el pedido antes de solicitar el pago.',
    },
    {
      q: '¿Puedo modificar o cancelar un pedido?',
      a: 'Los pedidos en estado "Confirmed" o "In Production" pueden cancelarse contactando con nosotros antes de que lleguen a "Ready to Ship". Una vez el pedido está preparado, no es posible modificarlo ni cancelarlo. Para cambios urgentes, escríbenos cuanto antes a través del formulario de contacto.',
    },
    {
      q: '¿Dónde veo el seguimiento de mi envío?',
      a: 'En la página de detalle del pedido (sección "Orders" → clic en el pedido) aparecerá un enlace directo de tracking una vez el pedido esté enviado. También recibirás el número de seguimiento por email.',
    },
    {
      q: '¿Cuál es el pedido mínimo?',
      a: 'El mínimo depende de tu tarifa de cliente. Al crear un pedido, si el importe de los productos no alcanza el mínimo, el portal te indica exactamente cuánto falta. El mínimo aplica sobre el subtotal de productos, sin incluir el envío.',
    },
    {
      q: '¿Cómo actualizo mi dirección o datos de contacto?',
      a: 'Ve a la sección "Profile" del portal. Puedes actualizar tu dirección de envío, teléfono y datos de contacto directamente desde allí. Para cambios en datos fiscales (razón social, CIF/NIF, dirección de facturación), contáctanos ya que requieren verificación.',
    },
    {
      q: '¿Qué hago si hay un problema con mi pedido?',
      a: 'Usa el formulario de contacto más abajo e indica el número de pedido. Revisamos todos los mensajes en un máximo de 24 horas laborables. Para urgencias, escríbenos directamente a wholesale@firmarollers.com.',
    },
  ],
  en: [
    {
      q: 'How do I place a new order?',
      a: 'In the portal, click "New Order". You will see the catalogue with your available products and prices based on your pricing tier. Add the quantities you need for each variant and confirm. You will receive instant confirmation and can track the order status in real time from the "Orders" section.',
    },
    {
      q: 'When does my order go into production?',
      a: 'Confirmed orders enter production within 24–48 business hours. You will receive a notification when the status changes to "In Production". The full process from confirmation to "Ready to Ship" is typically 3–5 business days, though it may vary depending on volume.',
    },
    {
      q: 'How does the payment process work?',
      a: 'Payment is activated when the order reaches "Ready to Ship" status — at that point shipping costs are confirmed and you know the exact total. Payment is made online via Revolut (credit/debit card or bank transfer). After payment, the order automatically moves to "Shipped" and you will receive a tracking number.',
    },
    {
      q: 'What are the shipping times?',
      a: 'Mainland Spain: 24–48 hours. Balearic & Canary Islands: 3–5 business days. Continental Europe: 3–7 business days depending on the country and carrier. When the order reaches "Ready to Ship" you will see the assigned shipping service with an estimated delivery date.',
    },
    {
      q: 'How is the order weight and shipping cost calculated?',
      a: 'Each product has a defined unit weight. When creating the order you can see the estimated total weight. The shipping cost is calculated definitively at dispatch time based on the actual weight and destination, and is shown in the order before payment is requested.',
    },
    {
      q: 'Can I modify or cancel an order?',
      a: 'Orders in "Confirmed" or "In Production" status can be cancelled by contacting us before they reach "Ready to Ship". Once the order is prepared it cannot be modified or cancelled. For urgent changes, please contact us as soon as possible using the contact form.',
    },
    {
      q: 'Where can I find my shipment tracking?',
      a: 'On the order detail page (go to "Orders" → click the order) a direct tracking link will appear once the order has shipped. You will also receive the tracking number by email.',
    },
    {
      q: 'What is the minimum order?',
      a: 'The minimum order depends on your customer pricing tier. When creating an order, if the product subtotal does not reach the minimum, the portal will tell you exactly how much more is needed. The minimum applies to the product subtotal, excluding shipping.',
    },
    {
      q: 'How do I update my address or contact details?',
      a: 'Go to the "Profile" section of the portal. You can update your shipping address, phone number, and contact details directly from there. For changes to billing data (company name, tax ID, billing address), please contact us as these require verification.',
    },
    {
      q: 'What should I do if there is a problem with my order?',
      a: 'Use the contact form below and include your order number. We review all messages within 24 business hours. For urgent matters, email us directly at wholesale@firmarollers.com.',
    },
  ],
  de: [
    {
      q: 'Wie gebe ich eine neue Bestellung auf?',
      a: 'Klicke im Portal auf "New Order". Du siehst den Katalog mit deinen verfügbaren Produkten und Preisen gemäß deiner Preisstufe. Füge die benötigten Mengen für jede Variante hinzu und bestätige. Du erhältst eine sofortige Bestätigung und kannst den Bestellstatus in Echtzeit im Bereich "Orders" verfolgen.',
    },
    {
      q: 'Wann geht meine Bestellung in Produktion?',
      a: 'Bestätigte Bestellungen gehen innerhalb von 24–48 Werktagen in Produktion. Du erhältst eine Benachrichtigung, wenn sich der Status auf "In Production" ändert. Der gesamte Prozess von der Bestätigung bis "Ready to Ship" dauert in der Regel 3–5 Werktage, kann je nach Volumen aber variieren.',
    },
    {
      q: 'Wie funktioniert der Zahlungsvorgang?',
      a: 'Die Zahlung wird aktiviert, wenn die Bestellung den Status "Ready to Ship" erreicht — zu diesem Zeitpunkt sind die Versandkosten bestätigt und du kennst den genauen Gesamtbetrag. Die Zahlung erfolgt online über Revolut (Kredit-/Debitkarte oder Banküberweisung). Nach der Zahlung wechselt die Bestellung automatisch zu "Shipped" und du erhältst eine Sendungsnummer.',
    },
    {
      q: 'Wie lange dauert der Versand?',
      a: 'Spanisches Festland: 24–48 Stunden. Balearen & Kanarische Inseln: 3–5 Werktage. Kontinentaleuropa: 3–7 Werktage je nach Land und Transporteur. Wenn die Bestellung "Ready to Ship" erreicht, siehst du den zugewiesenen Versanddienst mit geschätztem Lieferdatum.',
    },
    {
      q: 'Wie werden das Bestellgewicht und die Versandkosten berechnet?',
      a: 'Jedes Produkt hat ein definiertes Stückgewicht. Beim Erstellen der Bestellung siehst du das geschätzte Gesamtgewicht. Die Versandkosten werden endgültig beim Versand anhand des tatsächlichen Gewichts und Ziels berechnet und vor der Zahlungsaufforderung in der Bestellung angezeigt.',
    },
    {
      q: 'Kann ich eine Bestellung ändern oder stornieren?',
      a: 'Bestellungen im Status "Confirmed" oder "In Production" können durch Kontaktaufnahme mit uns storniert werden, bevor sie "Ready to Ship" erreichen. Sobald die Bestellung vorbereitet ist, kann sie nicht mehr geändert oder storniert werden. Für dringende Änderungen kontaktiere uns bitte so schnell wie möglich über das Kontaktformular.',
    },
    {
      q: 'Wo finde ich die Sendungsverfolgung?',
      a: 'Auf der Bestelldetailseite (gehe zu "Orders" → klicke auf die Bestellung) erscheint ein direkter Tracking-Link, sobald die Bestellung versandt wurde. Du erhältst die Sendungsnummer auch per E-Mail.',
    },
    {
      q: 'Was ist die Mindestbestellmenge?',
      a: 'Die Mindestbestellung hängt von deiner Kundenpreisstufe ab. Beim Erstellen einer Bestellung teilt dir das Portal genau mit, wie viel noch fehlt, falls der Produktbetrag das Minimum nicht erreicht. Das Minimum gilt für den Produktzwischensumme ohne Versand.',
    },
    {
      q: 'Wie aktualisiere ich meine Adresse oder Kontaktdaten?',
      a: 'Gehe zum Bereich "Profile" im Portal. Du kannst dort deine Versandadresse, Telefonnummer und Kontaktdaten direkt aktualisieren. Für Änderungen an Rechnungsdaten (Firmenname, Steuernummer, Rechnungsadresse) kontaktiere uns bitte, da diese eine Überprüfung erfordern.',
    },
    {
      q: 'Was soll ich tun, wenn es ein Problem mit meiner Bestellung gibt?',
      a: 'Nutze das unten stehende Kontaktformular und gib deine Bestellnummer an. Wir bearbeiten alle Nachrichten innerhalb von 24 Werktagen. Für dringende Angelegenheiten schreibe uns direkt an wholesale@firmarollers.com.',
    },
  ],
  fr: [
    {
      q: 'Comment passer une nouvelle commande ?',
      a: 'Dans le portail, cliquez sur "New Order". Vous verrez le catalogue avec vos produits disponibles et les prix selon votre tarif. Ajoutez les quantités nécessaires pour chaque variante et confirmez. Vous recevrez une confirmation immédiate et pourrez suivre le statut de la commande en temps réel depuis la section "Orders".',
    },
    {
      q: 'Quand ma commande passe-t-elle en production ?',
      a: 'Les commandes confirmées entrent en production sous 24–48 heures ouvrables. Vous recevrez une notification lorsque le statut passera à "In Production". Le processus complet de la confirmation jusqu\'à "Ready to Ship" prend généralement 3–5 jours ouvrables, selon le volume.',
    },
    {
      q: 'Comment fonctionne le processus de paiement ?',
      a: 'Le paiement est activé lorsque la commande atteint le statut "Ready to Ship" — à ce moment, les frais de livraison sont confirmés et vous connaissez le total exact. Le paiement s\'effectue en ligne via Revolut (carte de crédit/débit ou virement bancaire). Après le paiement, la commande passe automatiquement à "Shipped" et vous recevrez un numéro de suivi.',
    },
    {
      q: 'Quels sont les délais de livraison ?',
      a: 'Espagne continentale : 24–48 heures. Baléares et Îles Canaries : 3–5 jours ouvrables. Europe continentale : 3–7 jours ouvrables selon le pays et le transporteur. Lorsque la commande atteint "Ready to Ship", vous verrez le service d\'expédition attribué avec une date de livraison estimée.',
    },
    {
      q: 'Comment le poids et les frais de livraison sont-ils calculés ?',
      a: 'Chaque produit a un poids unitaire défini. Lors de la création de la commande, vous pouvez voir le poids total estimé. Les frais de livraison sont calculés définitivement à l\'expédition selon le poids réel et la destination, et sont affichés dans la commande avant la demande de paiement.',
    },
    {
      q: 'Puis-je modifier ou annuler une commande ?',
      a: 'Les commandes en statut "Confirmed" ou "In Production" peuvent être annulées en nous contactant avant qu\'elles n\'atteignent "Ready to Ship". Une fois la commande préparée, elle ne peut plus être modifiée ni annulée. Pour des changements urgents, contactez-nous dès que possible via le formulaire de contact.',
    },
    {
      q: 'Où puis-je trouver le suivi de mon envoi ?',
      a: 'Sur la page de détail de la commande (allez dans "Orders" → cliquez sur la commande), un lien de suivi direct apparaîtra une fois la commande expédiée. Vous recevrez également le numéro de suivi par e-mail.',
    },
    {
      q: 'Quelle est la commande minimale ?',
      a: 'La commande minimale dépend de votre tarif client. Lors de la création d\'une commande, si le sous-total des produits n\'atteint pas le minimum, le portail vous indique exactement combien il manque. Le minimum s\'applique au sous-total des produits, hors livraison.',
    },
    {
      q: 'Comment mettre à jour mon adresse ou mes coordonnées ?',
      a: 'Rendez-vous dans la section "Profile" du portail. Vous pouvez y mettre à jour votre adresse de livraison, votre numéro de téléphone et vos coordonnées directement. Pour les modifications des données de facturation (raison sociale, numéro de TVA, adresse de facturation), contactez-nous car elles nécessitent une vérification.',
    },
    {
      q: 'Que faire en cas de problème avec ma commande ?',
      a: 'Utilisez le formulaire de contact ci-dessous en indiquant votre numéro de commande. Nous traitons tous les messages dans un délai de 24 heures ouvrables. Pour les urgences, écrivez-nous directement à wholesale@firmarollers.com.',
    },
  ],
};

const SUBJECTS: Record<string, { value: string; label: string }[]> = {
  es: [
    { value: 'order',    label: 'Consulta de pedido' },
    { value: 'shipping', label: 'Pregunta sobre envío' },
    { value: 'billing',  label: 'Facturación / pago' },
    { value: 'account',  label: 'Cuenta y acceso' },
    { value: 'other',    label: 'Otro' },
  ],
  en: [
    { value: 'order',    label: 'Order inquiry' },
    { value: 'shipping', label: 'Shipping question' },
    { value: 'billing',  label: 'Billing / payment' },
    { value: 'account',  label: 'Account & access' },
    { value: 'other',    label: 'Other' },
  ],
  de: [
    { value: 'order',    label: 'Bestellanfrage' },
    { value: 'shipping', label: 'Versandfrage' },
    { value: 'billing',  label: 'Abrechnung / Zahlung' },
    { value: 'account',  label: 'Konto & Zugang' },
    { value: 'other',    label: 'Sonstiges' },
  ],
  fr: [
    { value: 'order',    label: 'Demande de commande' },
    { value: 'shipping', label: 'Question sur la livraison' },
    { value: 'billing',  label: 'Facturation / paiement' },
    { value: 'account',  label: 'Compte & accès' },
    { value: 'other',    label: 'Autre' },
  ],
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function AyudaPage() {
  const [lang, setLang]           = useState<string>('es');
  const [openFaq, setOpenFaq]     = useState<number | null>(null);
  const [subject, setSubject]     = useState('order');
  const [message, setMessage]     = useState('');
  const [orderId, setOrderId]     = useState('');
  const [sending, setSending]     = useState(false);
  const [sent, setSent]           = useState(false);
  const [sendError, setSendError] = useState('');

  const t    = UI[lang];
  const faqs = FAQ[lang];
  const subs = SUBJECTS[lang];

  function switchLang(l: string) {
    setLang(l);
    setOpenFaq(null);
    setSubject('order');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (sending || sent) return;
    setSending(true); setSendError('');
    try {
      const res = await fetch('/api/portal/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, message, orderId: orderId.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to send');
      setSent(true);
      setMessage(''); setOrderId('');
    } catch (err: any) {
      setSendError(err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fr-page" style={{ maxWidth: 760 }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-alexandria), Alexandria, sans-serif', fontWeight: 900, fontSize: 38, lineHeight: 0.95, letterSpacing: '-0.04em', textTransform: 'uppercase' }}>
            {t.title}<span style={{ color: FR.red }}>.</span>
          </div>
          <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 10, color: 'rgba(17,17,17,0.5)', letterSpacing: '0.1em', marginTop: 6 }}>
            {t.subtitle}
          </div>
        </div>

        {/* Language switcher */}
        <div style={{ display: 'flex', gap: 2, border: '1px solid #111', overflow: 'hidden' }}>
          {Object.entries(LANG_LABELS).map(([code, label]) => {
            const active = lang === code;
            return (
              <button
                key={code}
                onClick={() => switchLang(code)}
                style={{
                  padding: '6px 10px',
                  border: 'none',
                  borderRight: '1px solid #111',
                  background: active ? '#111' : 'transparent',
                  color: active ? '#fff' : '#111',
                  fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                  fontSize: 9, fontWeight: 700, letterSpacing: '0.12em',
                  textTransform: 'uppercase', cursor: 'pointer',
                  boxShadow: 'none',
                }}
              >
                {code.toUpperCase()}
              </button>
            );
          })}
        </div>
      </div>

      {/* FAQ */}
      <div className="fr-card" style={{ overflow: 'hidden' }}>
        <div className="fr-section-head">{t.faqHead}</div>
        <div>
          {faqs.map((item, i) => {
            const open = openFaq === i;
            return (
              <div key={i} style={{ borderBottom: i < faqs.length - 1 ? '1px solid rgba(17,17,17,0.1)' : 'none' }}>
                <button
                  onClick={() => setOpenFaq(open ? null : i)}
                  style={{
                    width: '100%', textAlign: 'left', background: 'transparent', border: 'none',
                    padding: '14px 18px', cursor: 'pointer', boxShadow: 'none',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#111' }}>{item.q}</span>
                  <span style={{
                    fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                    fontSize: 14, color: FR.red, flexShrink: 0,
                    transition: 'transform 0.15s',
                    transform: open ? 'rotate(45deg)' : 'none',
                  }}>+</span>
                </button>
                {open && (
                  <div style={{ padding: '0 18px 16px', fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 11, lineHeight: 1.8, color: 'rgba(17,17,17,0.7)' }}>
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Contact form */}
      <div className="fr-card" style={{ overflow: 'hidden' }}>
        <div className="fr-section-head">{t.contactHead}</div>
        <div style={{ padding: '20px 18px' }}>

          {sent ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ padding: '12px 16px', border: '1px solid #0DA265', fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 11, color: '#0DA265' }}>
                {t.successMsg}
              </div>
              <button
                onClick={() => setSent(false)}
                style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 10, background: 'transparent', border: 'none', cursor: 'pointer', textDecoration: 'underline', color: '#111', padding: 0 }}
              >
                {t.sendAnother}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(17,17,17,0.5)' }}>
                    {t.subjectLabel}
                  </label>
                  <select
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 11, border: '1px solid #111', borderRadius: 0, padding: '8px 10px', background: '#fff', outline: 'none' }}
                  >
                    {subs.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(17,17,17,0.5)' }}>
                    {t.orderIdLabel} <span style={{ opacity: 0.5 }}>{t.orderIdHint}</span>
                  </label>
                  <input
                    type="text"
                    value={orderId}
                    onChange={e => setOrderId(e.target.value)}
                    placeholder={t.orderIdPlaceholder}
                    style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 11, border: '1px solid #111', borderRadius: 0, padding: '8px 10px', background: '#fff', outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(17,17,17,0.5)' }}>
                  {t.messageLabel}
                </label>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  required
                  rows={5}
                  placeholder={t.messagePlaceholder}
                  style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 11, border: '1px solid #111', borderRadius: 0, padding: '8px 10px', background: '#fff', outline: 'none', resize: 'vertical', minHeight: 100 }}
                />
              </div>

              {sendError && (
                <div style={{ padding: '8px 12px', border: `1px solid ${FR.red}`, fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 10, color: FR.red }}>
                  ✕ {sendError}
                </div>
              )}

              <button
                type="submit"
                disabled={sending || message.trim().length < 10}
                className="btn-primary"
                style={{ alignSelf: 'flex-start', padding: '10px 24px', fontSize: 11, letterSpacing: '0.14em' }}
              >
                {sending ? t.sendingBtn : t.sendBtn}
              </button>
            </form>
          )}

          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(17,17,17,0.1)', display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            <a href="mailto:wholesale@firmarollers.com" style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 11, color: '#111', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: FR.red }}>✉</span> wholesale@firmarollers.com
            </a>
            <span style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 10, color: 'rgba(17,17,17,0.4)', alignSelf: 'center' }}>
              {t.replyTime}
            </span>
          </div>
        </div>
      </div>

    </div>
  );
}
