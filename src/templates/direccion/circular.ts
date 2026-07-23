export function circularHTML(params: {
  docNumber: string
  docSuffix: string
  recipients: { nombre: string; cargo?: string }[]
  asunto: string
  referencia?: string
  body: string
  fecha: string
}): string {
  return `
<div style="font-family:Arial,sans-serif;font-size:11pt;line-height:1.4;color:#000;padding:0;max-width:100%">
  <div style="text-align:right;margin-bottom:12pt;font-size:10pt">${params.fecha}</div>
  <div style="text-align:left;margin-bottom:10pt;font-weight:700;font-size:11pt">
    CIRCULAR N° ${params.docNumber}${params.docSuffix}
  </div>
  <div style="margin-bottom:8pt;font-size:11pt">
    <strong>SEÑORES :&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ${params.recipients.map(r => r.nombre).join(', ') || '-----'}</strong>
    <br><span style="margin-left:60pt;font-weight:700">CIUDAD.-</span>
  </div>
  <div style="margin-bottom:8pt;font-size:11pt">
    <strong>ASUNTO&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <span style="text-transform:uppercase">${params.asunto || '-----'}</span></strong>
  </div>
  ${params.referencia ? `
  <div style="margin-bottom:8pt;font-size:11pt">
    <strong>REF.&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <span style="text-transform:uppercase">${params.referencia}</span></strong>
  </div>` : ''}
  <div style="text-align:center;color:#bbb;margin-bottom:10pt;user-select:none">=======================================================================</div>
  <div style="text-align:justify;font-size:11pt;line-height:1.5">${params.body}</div>
</div>`
}
