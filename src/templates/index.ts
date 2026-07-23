import { oficioHTML } from './direccion/oficio'
import { cartaHTML } from './direccion/carta'
import { circularHTML } from './direccion/circular'
import { memorandoHTML } from './direccion/memorando'

type DocParams = {
  docType: string
  docNumber: string
  docSuffix: string
  recipients: { nombre: string; cargo?: string; sexo?: string }[]
  asunto: string
  referencia?: string
  body: string
  fecha: string
}

export function getDocumentHTML(officeId: string, params: DocParams): string {
  const dt = params.docType.toLowerCase()

  if (officeId === 'dir') {
    if (dt === 'oficio') return oficioHTML(params)
    if (dt === 'carta') return cartaHTML(params)
    if (dt === 'circular') return circularHTML(params)
    if (dt === 'memorando' || dt === 'memorandum') return memorandoHTML(params)
  }

  // Fallback genérico
  const r = params.recipients[0]
  const salutation = r?.sexo === 'F' ? 'SEÑORA' : 'SEÑOR'
  return `
<div style="font-family:Arial,sans-serif;font-size:11pt;line-height:1.4;color:#000;padding:0;max-width:100%">
  <div style="text-align:right;margin-bottom:12pt;font-size:10pt">${params.fecha}</div>
  <div style="text-align:center;margin-bottom:10pt;font-weight:700;font-size:11pt;text-decoration:underline">
    ${params.docType.toUpperCase()} N° ${params.docNumber}${params.docSuffix}
  </div>
  ${r ? `<div style="margin-bottom:8pt;font-size:11pt"><strong>${salutation}&nbsp;:&nbsp; ${r.nombre}</strong></div>` : ''}
  <div style="margin-bottom:8pt;font-size:11pt">
    <strong>ASUNTO&nbsp;:&nbsp; <span style="text-transform:uppercase">${params.asunto || '-----'}</span></strong>
  </div>
  ${params.referencia ? `<div style="margin-bottom:8pt;font-size:11pt"><strong>REF.&nbsp;:&nbsp; ${params.referencia}</strong></div>` : ''}
  <div style="text-align:center;color:#bbb;margin-bottom:10pt">---</div>
  <div style="text-align:justify;font-size:11pt;line-height:1.5">${params.body}</div>
</div>`
}
