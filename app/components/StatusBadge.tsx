import React from 'react'

type Status = 'draft' | 'confirmado' | 'produccion' | 'listo_envio' | 'enviado' | 'entregado' | 'cancelado'

const STATUS_CONFIG: Record<Status, { label: string; classes: string }> = {
  draft: {
    label: 'Draft',
    classes: 'bg-[#E0E0E0] text-[#0A0A0A] border-[#0A0A0A]'
  },
  confirmado: {
    label: 'Confirmed',
    classes: 'bg-[#0087B8] text-white border-[#0087B8]'
  },
  produccion: {
    label: 'In Production',
    classes: 'bg-[#E6883E] text-[#0A0A0A] border-[#E6883E]'
  },
  listo_envio: {
    label: 'Ready to Ship',
    classes: 'bg-[#F6E451] text-[#0A0A0A] border-[#0A0A0A]'
  },
  enviado: {
    label: 'Shipped',
    classes: 'bg-[#0DA265] text-white border-[#0DA265]'
  },
  entregado: {
    label: 'Delivered',
    classes: 'bg-[#876693] text-white border-[#876693]'
  },
  cancelado: {
    label: 'Cancelled',
    classes: 'bg-[#D93A35] text-white border-[#D93A35]'
  }
}

export default function StatusBadge({ status }: { status: Status }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.draft
  
  return (
    <span className={`
      inline-block text-[9px] font-bold tracking-[0.12em] uppercase
      px-2 py-[3px] border-2 rounded-none
      ${config.classes}
    `}>
      {config.label}
    </span>
  )
}
