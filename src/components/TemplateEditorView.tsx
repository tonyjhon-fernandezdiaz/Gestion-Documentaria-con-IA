import React, { useState, useEffect, useRef } from 'react';
import { DocumentTemplate, TemplateSection, DocumentType } from '../types';
import { Save, Download, Upload, FileText, Check } from 'lucide-react';

const DOCUMENT_TYPES: DocumentType[] = [
  'Informe', 'Oficio', 'Memorando', 'Carta', 'Proveído', 'Resolución',
  'Acta', 'Constancia', 'Informe Técnico', 'Solicitud', 'Dictamen',
  'Directiva', 'Circular', 'Oficio Múltiple', 'Memorando Múltiple',
  'Nota de Insumo', 'Nota de Coordinación', 'Otros'
];

const CARTA_SECTIONS: TemplateSection[] = [
  { id: 'lugarFecha', tipo: 'metadatos', nombre: 'Lugar y fecha', obligatorio: true, editable: false, origen: 'sistema', campos: ['lugarFecha'], estilo: { alineacion: 'right', fuente: { name: 'Arial Narrow', size: 24, color: '#00B050' } } },
  { id: 'codigo', tipo: 'codigo', nombre: 'N° de documento', obligatorio: true, editable: false, origen: 'sistema', estilo: { alineacion: 'justify', fuente: { name: 'Arial Narrow', size: 24, color: '#00B050' } } },
  { id: 'destinatario', tipo: 'destinatario', nombre: 'Destinatario', obligatorio: true, editable: false, origen: 'fijo', estilo: { alineacion: 'left', fuente: { name: 'Arial', size: 22 } } },
  { id: 'lugarDestino', tipo: 'lugar', nombre: 'Lugar destino', obligatorio: true, editable: false, origen: 'sistema', estilo: { alineacion: 'left', fuente: { name: 'Arial', size: 22, color: '#00B050' } } },
  { id: 'asunto', tipo: 'asunto', nombre: 'Asunto', obligatorio: true, editable: false, origen: 'fijo', estilo: { alineacion: 'left', fuente: { name: 'Arial', size: 22 } } },
  { id: 'separator', tipo: 'separator', nombre: 'Línea separadora', obligatorio: false, editable: false, origen: 'fijo' },
  { id: 'cuerpo', tipo: 'body', nombre: 'Cuerpo del documento', obligatorio: true, editable: false, origen: 'ia', estilo: { alineacion: 'justify', fuente: { name: 'Arial', size: 20, color: '#FF0000' }, espaciado: { antes: 0, despues: 240, interlineado: 1.15 } } },
  { id: 'despedida', tipo: 'despedida', nombre: 'Despedida', obligatorio: true, editable: false, origen: 'ia', contenidoEstatico: 'Atentamente,', estilo: { alineacion: 'center', fuente: { name: 'Arial', size: 20, bold: true, color: '#FF0000' } } },
  { id: 'firma', tipo: 'firma', nombre: 'Firma y pie', obligatorio: true, editable: false, origen: 'fijo', estilo: { alineacion: 'left', fuente: { name: 'Arial', size: 16 } }, contenidoEstatico: '{{iniciales}}\n{{direccion}}\n{{url}}' },
];

const DEFAULT_SECTIONS: TemplateSection[] = [
  { id: 'metadatos', tipo: 'metadatos', nombre: 'Metadatos (destinatario, asunto, ref, fecha)', obligatorio: true, editable: false, origen: 'fijo', campos: ['destinatario', 'remitente', 'asunto', 'referencia', 'lugarFecha'] },
  { id: 'separator', tipo: 'separator', nombre: 'Línea separadora', obligatorio: false, editable: false, origen: 'fijo' },
  { id: 'cuerpo', tipo: 'body', nombre: 'Cuerpo del documento', obligatorio: true, editable: false, origen: 'ia', estilo: { alineacion: 'justify', fuente: { name: 'Arial', size: 22 }, espaciado: { antes: 0, despues: 240, interlineado: 1.15 } } },
  { id: 'despedida', tipo: 'despedida', nombre: 'Despedida', obligatorio: false, editable: true, origen: 'ia', contenidoEstatico: 'Atentamente,' },
  { id: 'firma', tipo: 'firma', nombre: 'Firma', obligatorio: true, editable: false, origen: 'fijo' },
];

const createDefaultTemplate = (documentType: DocumentType): DocumentTemplate => {
  const sections = documentType === 'Carta' ? CARTA_SECTIONS : DEFAULT_SECTIONS;
  return {
    id: documentType,
    documentType,
    nombre: `Plantilla ${documentType}`,
    page: { marginTop: 1440, marginRight: 1440, marginBottom: 1440, marginLeft: 1440, pageWidth: 12240, pageHeight: 15840, orientation: 'portrait' },
    defaultFont: { name: 'Arial', size: 22, color: '#000000' },
    sections: JSON.parse(JSON.stringify(sections)),
    version: 1,
    historial: [],
  };
};

export default function TemplateEditorView() {
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [selectedType, setSelectedType] = useState<DocumentType | null>(null);
  const [editing, setEditing] = useState<DocumentTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadTemplates(); }, []);

  const loadTemplates = async () => {
    try {
      const res = await fetch('/api/templates');
      const data = await res.json();
      setTemplates(Array.isArray(data) ? data : []);
    } catch { setTemplates([]); }
  };

  const handleSelectType = (dt: DocumentType) => {
    setSelectedType(dt);
    const existing = templates.find(t => t.documentType === dt);
    const tmpl = existing ? JSON.parse(JSON.stringify(existing)) : createDefaultTemplate(dt);
    setEditing(tmpl);
    setMessage(null);
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editing),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'Plantilla guardada' });
        await loadTemplates();
      } else {
        setMessage({ type: 'error', text: data.error || 'Error al guardar' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error de conexión' });
    }
    setSaving(false);
  };

  const handleDownloadDocx = () => {
    if (!selectedType) return;
    const a = document.createElement('a');
    a.href = `/api/templates/${selectedType}/download`;
    a.download = `Plantilla_${selectedType}.docx`;
    a.click();
  };

  const handleExportWord = async () => {
    if (!editing) return;
    try {
      const { generateDocxBlob } = await import('../utils/docxGenerator');
      const blob = await generateDocxBlob({
        docType: editing.documentType,
        docCode: 'XXXX-2026',
        docCodeFull: '001 -2026-GRSM-DRE-UGEL-B.',
        salutation: 'SEÑOR',
        recipients: [{ nombre: 'DESTINATARIO', cargo: 'CARGO' }],
        recipientLocation: 'TARAPOTO. -',
        fromName: 'REMITENTE',
        fromRole: 'CARGO REMITENTE',
        subject: 'ASUNTO DEL DOCUMENTO',
        referencia: 'EXPEDIENTE N° XXXX-2026',
        date: 'Bellavista, XX de mes del 2026',
        body: 'Cuerpo del documento redactado por la IA.',
        filename: `Plantilla_${editing.documentType}.docx`,
        template: editing,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Plantilla_${editing.documentType}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Error exporting Word:', e);
    }
  };

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMessage({ type: 'success', text: `Archivo "${file.name}" cargado.` });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ---------- RENDER ----------

  const renderTypeList = () => (
    <div className="w-64 shrink-0 space-y-1 overflow-y-auto max-h-[calc(100vh-12rem)] pr-2 border-r border-slate-200 dark:border-slate-800">
      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 px-1">Tipos</h3>
      {DOCUMENT_TYPES.map(dt => {
        const has = templates.some(t => t.documentType === dt);
        return (
          <button key={dt} onClick={() => handleSelectType(dt)}
            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
              selectedType === dt
                ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700'
                : has
                  ? 'bg-emerald-50 dark:bg-emerald-950/20 text-slate-700 dark:text-slate-300 border border-transparent hover:border-emerald-300'
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent'
            }`}>
            {has && <Check size={12} className="text-emerald-500 shrink-0" />}
            <span className="truncate">{dt}</span>
          </button>
        );
      })}
    </div>
  );

  const renderPreview = () => {
    if (!editing) return null;
    const { page, defaultFont: font, sections } = editing;
    const isLandscape = page.orientation === 'landscape';

    return (
      <div className="flex-1 flex flex-col items-center">
        {/* Toolbar */}
        <div className="flex items-center justify-between w-full max-w-3xl mb-3 px-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{editing.nombre}</span>
            <span className="text-[10px] text-slate-400">v{editing.version}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-[10px] font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-all">
              <Save size={12} /> {saving ? '...' : 'Guardar'}
            </button>
            <button onClick={handleDownloadDocx}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-[10px] font-semibold hover:bg-emerald-700 transition-all">
              <Download size={12} /> .docx
            </button>
            <button onClick={handleExportWord}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-600 text-white text-[10px] font-semibold hover:bg-rose-700 transition-all">
              <FileText size={12} /> Word
            </button>
            <input ref={fileInputRef} type="file" accept=".docx,.xlsx,.xls" onChange={handleUploadFile} className="hidden" />
            <button onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-[10px] font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
              <Upload size={12} /> Subir
            </button>
          </div>
        </div>

        {/* Page config bar */}
        <div className="flex items-center gap-3 w-full max-w-3xl mb-2 px-2 py-1.5 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-900 text-[9px]">
          {['marginTop', 'marginRight', 'marginBottom', 'marginLeft'].map(f => (
            <div key={f} className="flex items-center gap-1">
              <label className="font-semibold text-amber-700 dark:text-amber-400">{f.replace('margin', 'M. ')}</label>
              <input type="number" value={(page as any)[f]} onChange={e => setEditing({ ...editing, page: { ...page, [f]: Number(e.target.value) } })}
                className="w-14 px-1 py-0.5 rounded bg-white dark:bg-slate-950 border border-amber-200 dark:border-amber-800 text-[9px]" />
            </div>
          ))}
          <div className="flex items-center gap-1">
            <label className="font-semibold text-amber-700 dark:text-amber-400">Fuente</label>
            <select value={font.name} onChange={e => setEditing({ ...editing, defaultFont: { ...font, name: e.target.value } })}
              className="px-1 py-0.5 rounded bg-white dark:bg-slate-950 border border-amber-200 dark:border-amber-800 text-[9px]">
              <option value="Arial">Arial</option>
              <option value="Times New Roman">Times New Roman</option>
              <option value="Calibri">Calibri</option>
            </select>
          </div>
          <div className="flex items-center gap-1">
            <label className="font-semibold text-amber-700 dark:text-amber-400">Tamaño</label>
            <input type="number" value={font.size} onChange={e => setEditing({ ...editing, defaultFont: { ...font, size: Number(e.target.value) } })}
              className="w-12 px-1 py-0.5 rounded bg-white dark:bg-slate-950 border border-amber-200 dark:border-amber-800 text-[9px]" />
          </div>
          <div className="flex items-center gap-1">
            <label className="font-semibold text-amber-700 dark:text-amber-400">Orient.</label>
            <select value={page.orientation} onChange={e => setEditing({ ...editing, page: { ...page, orientation: e.target.value as 'portrait' | 'landscape' } })}
              className="px-1 py-0.5 rounded bg-white dark:bg-slate-950 border border-amber-200 dark:border-amber-800 text-[9px]">
              <option value="portrait">Vertical</option>
              <option value="landscape">Horizontal</option>
            </select>
          </div>
        </div>

        {/* Document preview */}
        <div
          className="bg-white dark:bg-slate-950 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden"
          style={{ width: '100%', maxWidth: isLandscape ? '860px' : '680px' }}
        >
          <div
            className="p-6 space-y-2"
            style={{
              minHeight: isLandscape ? '480px' : '660px',
              fontFamily: font.name,
              color: font.color,
              fontSize: font.size / 2,
            }}
          >
            {sections.map((section, idx) => {
              const s = section.estilo || {};
              const f = s.fuente || font;

              // Determinar alineación
              let textAlign: string = 'left';
              if (s.alineacion === 'center') textAlign = 'center';
              else if (s.alineacion === 'right') textAlign = 'right';
              else if (s.alineacion === 'justify') textAlign = 'justify';

              // Espaciado
              const sp = s.espaciado || {};
              const marginTop = sp.antes ? sp.antes / 20 : 0;
              const marginBottom = sp.despues ? sp.despues / 20 : 0;

              const style: React.CSSProperties = {
                fontFamily: f.name || font.name,
                fontSize: (f.size || font.size) / 2,
                color: f.color || font.color || '#000000',
                textAlign: textAlign as any,
                fontWeight: f.bold ? 'bold' : 'normal',
                fontStyle: f.italic ? 'italic' : 'normal',
                marginTop: `${marginTop}px`,
                marginBottom: `${marginBottom}px`,
                lineHeight: sp.interlineado || 1.15,
              };

              if (section.tipo === 'metadatos' && section.campos?.includes('lugarFecha')) {
                return (
                  <div key={section.id} style={{ ...style, textAlign: 'right', fontFamily: 'Arial Narrow', color: '#00B050' }}>
                    Bellavista, XX de mes del 2026
                  </div>
                );
              }
              if (section.tipo === 'codigo') {
                return (
                  <div key={section.id} style={{ ...style, fontFamily: 'Arial Narrow', color: '#00B050' }}>
                    CARTA N° 001 -2026-GRSM-DRE-UGEL-B.
                  </div>
                );
              }
              if (section.tipo === 'destinatario') {
                return (
                  <div key={section.id} style={style}>
                    <b>SEÑOR</b> : <span style={{ color: '#00B050' }}>DESTINATARIO</span>
                  </div>
                );
              }
              if (section.tipo === 'lugar') {
                return (
                  <div key={section.id} style={{ ...style, color: '#00B050' }}>
                    TARAPOTO. -
                  </div>
                );
              }
              if (section.tipo === 'asunto') {
                return (
                  <div key={section.id} style={style}>
                    <b>ASUNTO</b> : <span style={{ color: '#00B050' }}>Asunto del documento</span>
                  </div>
                );
              }
              if (section.tipo === 'metadatos') {
                const fields = section.campos || [];
                const vals: Record<string, string> = {
                  lugarFecha: 'Bellavista, XX de mes del 2026',
                  codigo: `${editing.documentType.toUpperCase()} N° XXXX-2026`,
                  destinatario: 'SEÑOR : DESTINATARIO',
                  remitente: 'DE : REMITENTE',
                  asunto: 'ASUNTO : ASUNTO DEL DOCUMENTO',
                  referencia: 'REF. : EXPEDIENTE N° XXXX-2026',
                };
                return (
                  <div key={section.id} style={style}>
                    {fields.map(f => (
                      <div key={f}><b>{f === 'lugarFecha' ? 'LUGAR Y FECHA' : f === 'codigo' ? 'CÓDIGO' : f.toUpperCase()}</b>: <span style={{ color: '#64748b' }}>{vals[f]}</span></div>
                    ))}
                  </div>
                );
              }
              if (section.tipo === 'separator') {
                return (
                  <div key={section.id} style={{ textAlign: 'center', color: '#94a3b8', fontSize: 8, marginTop: 8, marginBottom: 8 }}>
                    ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─
                  </div>
                );
              }
              if (section.tipo === 'body') {
                return (
                  <div key={section.id} style={{ ...style, color: '#FF0000' }}>
                    [Cuerpo del documento — redactado automáticamente por la IA]
                  </div>
                );
              }
              if (section.tipo === 'despedida' || section.tipo === 'custom') {
                return (
                  <div key={section.id} style={{ ...style, textAlign: 'center', fontWeight: 'bold', color: section.origen === 'ia' ? '#FF0000' : (f.color || '#000000') }}>
                    {section.contenidoEstatico || 'Atentamente,'}
                  </div>
                );
              }
              if (section.tipo === 'firma') {
                return (
                  <div key={section.id} style={style}>
                    <div style={{ fontWeight: 'bold', fontSize: 7 }}>[REMITENTE]</div>
                    <div style={{ fontSize: 6, color: '#64748b' }}>[CARGO DEL REMITENTE]</div>
                    <div style={{ fontSize: 6, color: '#64748b' }}>Esq. Avenida Loreto y Jr. San Martín – Tercer Piso – Ampliación. Bellavista - Telefax 042-544342</div>
                    <div style={{ fontSize: 5, color: '#64748b' }}>https://www.gob.pe/ugelbellavista</div>
                  </div>
                );
              }
              return null;
            })}
          </div>
        </div>
        {/* Leyenda de colores */}
        {editing.documentType === 'Carta' && (
          <div className="flex items-center gap-4 mt-2 text-[9px] text-slate-400">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full" style={{ background: '#00B050' }}></span> Sistema</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full" style={{ background: '#FF0000' }}></span> IA</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full" style={{ background: '#000000' }}></span> Fijo</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex gap-4 h-full">
      {renderTypeList()}
      {editing ? renderPreview() : (
        <div className="flex-1 flex items-center justify-center text-slate-400 text-xs">
          Seleccione un tipo de documento para editar su plantilla
        </div>
      )}
    </div>
  );
}