export function cartaHTML(params: {
  docNumber: string
  docSuffix: string
  recipients: { nombre: string; cargo?: string; sexo?: string }[]
  asunto: string
  body: string
  fecha: string
}): string {
  const r = params.recipients[0]
  const salutation = r?.sexo === 'F' ? 'SEÑORA' : 'SEÑOR'
  return `
<div style="font-family:Arial Narrow,Arial,sans-serif;font-size:11pt;line-height:1.4;color:#000;padding:0;max-width:100%">
  <div style="text-align:right;margin-bottom:12pt;font-size:10pt">${params.fecha}</div>
  <div style="text-align:left;margin-bottom:10pt;font-weight:700;font-size:11pt">
    CARTA N° ${params.docNumber}${params.docSuffix}
  </div>
  <div style="margin-bottom:8pt;font-size:11pt">
    <strong>${salutation}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ${r?.nombre || '-----'}</strong>
    <br><span style="margin-left:60pt;font-size:10pt;font-weight:700">${r?.cargo ? r.cargo.toUpperCase() : ''}</span>
    <br><span style="margin-left:60pt;font-weight:700">BELLAVISTA.-</span>
  </div>
  <div style="margin-bottom:8pt;font-size:11pt">
    <strong>ASUNTO&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <span style="text-transform:uppercase">${params.asunto || '-----'}</span></strong>
  </div>
  <div style="text-align:center;color:#bbb;margin-bottom:10pt;user-select:none">----------------------------------------------------------------------------------------</div>
  <div style="text-align:justify;font-size:11pt;line-height:1.5">${params.body}</div>
</div>`
}
