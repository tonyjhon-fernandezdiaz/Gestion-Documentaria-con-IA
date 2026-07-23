export function memorandoHTML(params: {
  docNumber: string
  docSuffix: string
  recipients: { nombre: string; cargo?: string }[]
  asunto: string
  body: string
  fecha: string
}): string {
  const r = params.recipients[0]
  return `
<div style="font-family:Arial,sans-serif;font-size:11pt;line-height:1.4;color:#000;padding:0;max-width:100%">
  <div style="margin-bottom:10pt;font-weight:700;font-size:11pt;text-align:center">
    MEMORANDUM N° ${params.docNumber}${params.docSuffix}
  </div>
  <div style="margin-bottom:8pt;font-size:11pt">
    <strong>A&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:&nbsp;&nbsp;&nbsp; ${r?.nombre || '-----'}</strong>
    ${r?.cargo ? `<br><span style="margin-left:60pt;font-size:10pt">${r.cargo.toUpperCase()}</span>` : ''}
    <br><span style="margin-left:60pt;font-weight:700">UGEL BELLAVISTA</span>
  </div>
  <div style="margin-bottom:8pt;font-size:11pt">
    <strong>ASUNTO&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:&nbsp;&nbsp;&nbsp; <span style="text-transform:uppercase">${params.asunto || '-----'}</span></strong>
  </div>
  <div style="margin-bottom:8pt;font-size:11pt">
    <strong>FECHA&nbsp;&nbsp;&nbsp;&nbsp;:&nbsp;&nbsp;&nbsp; Bellavista, ${params.fecha}</strong>
  </div>
  <div style="text-align:center;color:#bbb;margin-bottom:10pt;user-select:none">-------------------------------------------------------------</div>
  <div style="text-align:justify;font-size:11pt;line-height:1.5">${params.body}</div>
</div>`
}
