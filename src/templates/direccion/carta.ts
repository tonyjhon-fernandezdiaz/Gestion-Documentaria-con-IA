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
  const recipientLocation = 'TARAPOTO. -'
  
  return `
<div style="font-family:Arial,sans-serif;font-size:11pt;line-height:1.4;color:#000;padding:0;max-width:100%">
  <div style="text-align:right;margin-bottom:12pt;font-size:10pt;color:#00B050;font-weight:700">${params.fecha}</div>
  <div style="text-align:left;margin-bottom:10pt;font-weight:700;font-size:11pt;color:#00B050">
    CARTA N° ${params.docNumber}${params.docSuffix}
  </div>
  <div style="margin-bottom:8pt;font-size:11pt">
    <strong style="color:#000">${salutation}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</strong>
    <span style="color:#00B050;font-weight:700">${r?.nombre || '-----'}</span>
    <br><span style="margin-left:96px;font-size:10pt;font-weight:700;color:#00B050">${recipientLocation}</span>
  </div>
  <div style="margin-bottom:8pt;font-size:11pt">
    <strong style="color:#000">ASUNTO&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</strong>
    <span style="color:#00B050;font-weight:700;text-transform:uppercase">${params.asunto || '-----'}</span>
  </div>
  <div style="text-align:center;color:#000;margin-bottom:12pt;user-select:none;font-weight:700">-------------------------------------------------------------------------------------------------</div>
  <div style="text-align:justify;font-size:11pt;line-height:1.5;color:#000;margin-bottom:10pt">
    Tengo el agrado de dirigirme a usted para expresarle mi cordial y afectuoso saludo en representación de la Unidad de Gestión Educativa Local de Bellavista, 
  </div>
  <div style="text-align:justify;font-size:11pt;line-height:1.5;color:#FF0000">${params.body}</div>
</div>`
}
