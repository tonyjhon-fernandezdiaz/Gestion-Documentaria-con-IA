import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  FileText, 
  Download, 
  Printer, 
  Trash2, 
  Eye, 
  Check, 
  X, 
  Calendar, 
  User, 
  Sparkles, 
  CheckCircle2, 
  XCircle,
  HelpCircle,
  ChevronRight
} from 'lucide-react';
import { Document, DocumentType, User as UserType } from '../types';
import { safeStorage } from '../utils/storage';
import { saveDocument } from '../utils/fileSaver';

interface DocumentsViewProps {
  documents: Document[];
  currentUser: UserType;
  onUpdateStatus: (id: string, state: 'Aprobado' | 'Rechazado' | 'Pendiente') => void;
  onDelete: (id: string) => void;
}

export default function DocumentsView({ 
  documents, 
  currentUser, 
  onUpdateStatus, 
  onDelete 
}: DocumentsViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('todos');
  const [stateFilter, setStateFilter] = useState<string>('todos');
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  React.useEffect(() => {
    setShowDeleteConfirm(false);
  }, [selectedDoc?.id]);

  // Extract all unique types of documents created so far
  const folderTypes = Array.from(new Set(documents.map(d => d.tipo))).filter(Boolean);

  // Filter documents
  const filteredDocs = documents.filter(doc => {
    const searchString = searchQuery.toLowerCase().trim();
    
    // Deep searchable values covering: expediente, referencia, tema, solicitante, creador, iaUtilizada, fecha, textoRedactado, and extra extracted fields
    const matchesSearch = !searchString ? true : (
      doc.expediente.toLowerCase().includes(searchString) ||
      doc.referencia.toLowerCase().includes(searchString) ||
      doc.tema.toLowerCase().includes(searchString) ||
      doc.solicitante.toLowerCase().includes(searchString) ||
      doc.creadoPor.toLowerCase().includes(searchString) ||
      doc.iaUtilizada.toLowerCase().includes(searchString) ||
      new Date(doc.fechaProceso).toLocaleDateString('es-ES').includes(searchString) ||
      (doc.textoRedactado && doc.textoRedactado.toLowerCase().includes(searchString)) ||
      (doc.textoOriginal && doc.textoOriginal.toLowerCase().includes(searchString)) ||
      (doc.datosExtraidos && JSON.stringify(doc.datosExtraidos).toLowerCase().includes(searchString))
    );
    
    const matchesType = typeFilter === 'todos' || doc.tipo === typeFilter;
    const matchesState = stateFilter === 'todos' || doc.estado === stateFilter;

    return matchesSearch && matchesType && matchesState;
  });

  // Clean backslash-n strings and duplicate header keys from AI draft body
  const cleanDocumentText = (text: string) => {
    if (!text) return '';
    
    // 1. Replace literal backslash-n sequences like '\\n' or '\\n\\n' with actual newlines.
    let cleaned = text.replace(/\\n/g, '\n');
    
    // 2. Strip code blocks if present
    cleaned = cleaned.replace(/^```[a-zA-Z]*\n/gm, '').replace(/\n```$/gm, '');

    // 3. Strip duplicate headers: if the model generated a header block
    const lines = cleaned.split('\n');
    const bodyLines: string[] = [];
    let foundMainBodyStart = false;

    for (let line of lines) {
      const trimmed = line.trim();
      
      if (!foundMainBodyStart) {
        const isHeaderKey = 
          trimmed.toUpperCase().startsWith('MEMORANDO') ||
          trimmed.toUpperCase().startsWith('INFORME N') ||
          trimmed.toUpperCase().startsWith('INFORME_N') ||
          trimmed.toUpperCase().startsWith('OFICIO') ||
          trimmed.toUpperCase().startsWith('PARA:') ||
          trimmed.toUpperCase().startsWith('AL:') ||
          trimmed.toUpperCase().startsWith('DE:') ||
          trimmed.toUpperCase().startsWith('ASUNTO:') ||
          trimmed.toUpperCase().startsWith('REF:') ||
          trimmed.toUpperCase().startsWith('REFERENCIA:') ||
          trimmed.toUpperCase().startsWith('FECHA:') ||
          trimmed.toUpperCase().startsWith('LUGAR Y FECHA:') ||
          trimmed.toUpperCase().startsWith('AÑO DE') ||
          trimmed.toUpperCase().startsWith('"AÑO DE');

        if (isHeaderKey) {
          continue; // skip this line!
        }
        
        if (trimmed.length > 0) {
          foundMainBodyStart = true;
        } else {
          continue; // skip leading empty lines
        }
      }
      
      bodyLines.push(line);
    }

    return bodyLines.join('\n').trim();
  };

  // Export engines
  const exportToWord = (doc: Document) => {
    const cleanText = cleanDocumentText(doc.textoRedactado || '');
    const savedHeaderImage = safeStorage.getItem('saved_area_header_image');
    const savedUserName = safeStorage.getItem('saved_user_name') || 'Mesa de Partes / Área Técnica';
    const savedUserRole = safeStorage.getItem('saved_user_role') || 'Soporte del Sistema';

    const header = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <title>Documento Oficial</title>
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          @page Section1 {
            size: 8.5in 11.0in;
            margin: 1.0in 1.0in 1.0in 1.0in;
            mso-header-margin: 0.5in;
            mso-footer-margin: 0.5in;
            mso-header: h1;
          }
          div.Section1 {
            page: Section1;
          }
          body {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 11pt;
            color: #000000;
          }
          p {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 11pt;
            line-height: 1.15;
            margin-top: 0;
            margin-bottom: 11pt;
            text-align: justify;
            color: #000000;
          }
          p.MsoHeader, div.MsoHeader {
            margin: 0in;
            margin-bottom: .0001pt;
          }
        </style>
      </head>
      <body>
    `;
    
    let headerBlock = '';
    if (savedHeaderImage) {
      headerBlock = `
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
          <tr>
            <td style="text-align: center; padding-bottom: 15px;">
              <img src="${savedHeaderImage}" width="600" style="width: 600px; height: auto; display: block; margin: 0 auto;" />
            </td>
          </tr>
        </table>
      `;
    } else {
      headerBlock = `
        <table style="width: 100%; border-collapse: collapse; padding-bottom: 12px; margin-bottom: 25px;">
          <tr>
            <td style="width: 30%; font-family: Arial, sans-serif; font-size: 11px; line-height: 1.2; vertical-align: middle;">
              <strong style="color: #1d4ed8; font-style: italic; font-size: 14px;">San Martín</strong><br/>
              <span style="font-weight: bold; text-transform: uppercase; font-size: 9px; color: #666;">Gobierno Regional</span>
            </td>
            <td style="width: 70%; bg-color: #8B3A3A; background-color: #8B3A3A; color: white; text-align: center; padding: 12px; font-family: Arial, sans-serif; font-weight: bold; vertical-align: middle;">
              <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">DIRECCIÓN REGIONAL DE EDUCACIÓN</div>
              <div style="font-size: 9px; text-transform: uppercase; font-weight: normal; margin-top: 3px;">UGEL Bellavista – Dirección – Área de Gestión Institucional – Racionalización</div>
              <div style="font-size: 7px; font-style: italic; font-weight: normal; margin-top: 4px; opacity: 0.9;">"AÑO DEL BICENTENARIO, DE LA CONSOLIDACIÓN DE NUESTRA INDEPENDENCIA, Y DE LA CONMEMORACIÓN DE LAS HEROICAS BATALLAS DE JUNÍN Y AYACUCHO"</div>
            </td>
          </tr>
        </table>
      `;
    }

    const formattedParagraphs = cleanText
      ? cleanText
          .split(/\n\s*\n/)
          .map(para => {
            const cleanPara = para.trim();
            if (!cleanPara) return '';
            return `<p style="margin-top: 0; margin-bottom: 11pt; line-height: 1.15; text-align: justify; font-family: Arial, sans-serif; font-size: 11pt; color: #000000;">${cleanPara.replace(/\n/g, '<br/>')}</p>`;
          })
          .filter(Boolean)
          .join('')
      : '<p style="margin-top: 0; margin-bottom: 11pt; line-height: 1.15; font-family: Arial, sans-serif; font-size: 11pt; color: #000000;">◇ Sin redactar</p>';

    const body = `
      <div class="Section1">
        <!-- Native Word Header element -->
        <div style="mso-element:header" id="h1">
          <div class="MsoHeader">
            ${headerBlock}
          </div>
        </div>

        <h2 style="text-align: center; text-decoration: underline; margin-bottom: 25px; font-size: 13pt; font-family: Arial, sans-serif; font-weight: bold; text-transform: uppercase;">
          ${doc.tipo.toUpperCase()} ${doc.expediente}
        </h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11pt; font-family: Arial, sans-serif; line-height: 1.15;">
          <tr>
            <td style="width: 140px; font-weight: bold; padding: 6px 0; vertical-align: top;">AL</td>
            <td style="width: 15px; font-weight: bold; padding: 6px 0; vertical-align: top;">:</td>
            <td style="padding: 6px 0; vertical-align: top;">
              ${doc.datosExtraidos?.destinatarios && Array.isArray(doc.datosExtraidos.destinatarios) && doc.datosExtraidos.destinatarios.length > 0 ? (
                doc.datosExtraidos.destinatarios.map((dest: any, idx: number) => `
                  ${idx > 0 ? '<div style="margin-top: 10px;"></div>' : ''}
                  <strong style="text-transform: uppercase; font-size: 11pt;">${dest.nombre || '-----'}</strong>
                  ${dest.cargo ? `<br/><span style="font-size: 10pt; color: #334155; text-transform: uppercase; font-weight: bold;">${dest.cargo}</span>` : ''}
                `).join('')
              ) : `
                <strong style="text-transform: uppercase; font-size: 11pt;">${doc.solicitante}</strong>
                ${doc.datosExtraidos?.cargo_destinatario ? `<br/><span style="font-size: 10pt; color: #334155; text-transform: uppercase; font-weight: bold;">${doc.datosExtraidos.cargo_destinatario}</span>` : ''}
              `}
            </td>
          </tr>
          <tr>
            <td style="font-weight: bold; padding: 6px 0; vertical-align: top;">DE</td>
            <td style="font-weight: bold; padding: 6px 0; vertical-align: top;">:</td>
            <td style="padding: 6px 0; vertical-align: top;">
              <strong style="text-transform: uppercase; font-size: 11pt;">${savedUserName}</strong>
              <br/><span style="font-size: 10pt; color: #334155; text-transform: uppercase; font-weight: bold;">${savedUserRole}</span>
            </td>
          </tr>
          <tr>
            <td style="font-weight: bold; padding: 6px 0; vertical-align: top;">ASUNTO</td>
            <td style="font-weight: bold; padding: 6px 0; vertical-align: top;">:</td>
            <td style="padding: 6px 0; vertical-align: top; font-weight: bold; text-transform: uppercase;">${doc.tema}</td>
          </tr>
          <tr>
            <td style="font-weight: bold; padding: 6px 0; vertical-align: top;">REFERENCIA</td>
            <td style="font-weight: bold; padding: 6px 0; vertical-align: top;">:</td>
            <td style="padding: 6px 0; vertical-align: top; color: #1e293b;">${doc.referencia || 'SIN REFERENCIA'}</td>
          </tr>
          <tr>
            <td style="font-weight: bold; padding: 6px 0; vertical-align: top;">LUGAR Y FECHA</td>
            <td style="font-weight: bold; padding: 6px 0; vertical-align: top;">:</td>
            <td style="padding: 6px 0; vertical-align: top; color: #1e293b;">Bellavista, ${new Date(doc.fechaProceso).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</td>
          </tr>
        </table>
        <hr style="border: 0; border-top: 1px dashed #777777; margin-bottom: 25px;" />
        <div style="font-size: 11pt; text-align: justify; line-height: 1.15; font-family: Arial, sans-serif; color: #000000; padding-top: 5px;">
          ${formattedParagraphs}
        </div>
        
        <!-- Center-aligned "Atentamente" signature area -->
        <br/><br/>
        <table style="width: 100%; border-collapse: collapse; margin-top: 40px; font-family: Arial, sans-serif; font-size: 11pt; text-align: center;">
          <tr>
            <td style="text-align: center; width: 100%;">
              <span style="font-weight: bold; display: block; margin-bottom: 60px;">Atentamente,</span>
            </td>
          </tr>
        </table>
      </div>
    </body></html>`;
    const filename = `${doc.expediente}_${doc.tipo}.doc`;
    const blob = new Blob(['﻿' + header + body], { type: 'application/msword' });
    saveDocument(filename, blob, 'application/msword');
  };

  const exportToExcel = () => {
    let csvContent = "\uFEFF"; // UTF-8 BOM
    csvContent += "Expediente,Referencia,Tipo,Solicitante,Tema,IA Utilizada,Tokens,Fecha de Proceso,Estado\n";
    
    filteredDocs.forEach(d => {
      const row = [
        d.expediente,
        d.referencia.replace(/"/g, '""'),
        d.tipo,
        d.solicitante.replace(/"/g, '""'),
        d.tema.replace(/"/g, '""'),
        d.iaUtilizada,
        d.tokens,
        new Date(d.fechaProceso).toLocaleDateString(),
        d.estado
      ].map(val => `"${val}"`).join(",");
      csvContent += row + "\n";
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const filename = `Reporte_Documentario_${new Date().toISOString().split('T')[0]}.csv`;
    saveDocument(filename, blob, 'text/csv;charset=utf-8;');
  };

  const handlePrint = (doc: Document) => {
    const cleanText = cleanDocumentText(doc.textoRedactado || '');
    const savedHeaderImage = safeStorage.getItem('saved_area_header_image');
    const savedUserName = safeStorage.getItem('saved_user_name') || 'Mesa de Partes / Área Técnica';
    const savedUserRole = safeStorage.getItem('saved_user_role') || 'Soporte del Sistema';

    // Build the header HTML string
    let headerHtml = '';
    if (savedHeaderImage) {
      headerHtml = `<div style="text-align: center; padding-bottom: 12px; margin-bottom: 25px;">
        <img src="${savedHeaderImage}" style="max-height: 90px; max-width: 100%; object-fit: contain;" />
      </div>`;
    } else {
      headerHtml = `<div class="header-container">
        <div class="logo-side">
          <div class="logo-badge">🏛️</div>
          <div class="logo-text">
            <span class="logo-brand">San Martín</span><br/>
            <strong>Gobierno Regional</strong>
          </div>
        </div>
        <div class="banner-side">
          <div class="banner-main">Dirección Regional de Educación</div>
          <div class="banner-sub">UGEL Bellavista – Dirección – Área de Gestión Institucional – Racionalización</div>
          <div class="banner-slogan">"AÑO DEL BICENTENARIO, DE LA CONSOLIDACIÓN DE NUESTRA INDEPENDENCIA, Y DE LA CONMEMORACIÓN DE LAS HEROICAS BATALLAS DE JUNÍN Y AYACUCHO"</div>
        </div>
      </div>`;
    }

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${doc.tipo} ${doc.expediente}</title>
            <style>
              body { font-family: Arial, Helvetica, sans-serif; padding: 40px; color: #000000; line-height: 1.5; font-size: 11pt; }
              .header-container { display: flex; align-items: center; padding-bottom: 15px; margin-bottom: 25px; }
              .logo-side { display: flex; align-items: center; width: 30%; gap: 8px; font-family: Arial, Helvetica, sans-serif; }
              .logo-badge { width: 32px; height: 32px; border-radius: 50%; border: 1px solid #d97706; background-color: #fef3c7; display: flex; align-items: center; justify-content: center; font-size: 10px; }
              .logo-text { font-size: 10px; line-height: 1.1; color: #334155; }
              .logo-brand { font-size: 12px; font-weight: bold; color: #4338ca; font-style: italic; }
              .banner-side { flex-1: 1; background-color: #8B3A3A; color: white; padding: 12px; text-align: center; font-family: Arial, Helvetica, sans-serif; border-radius: 4px; width: 70%; }
              .banner-main { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
              .banner-sub { font-size: 8px; font-weight: bold; text-transform: uppercase; margin-top: 2px; }
              .banner-slogan { font-size: 7px; font-style: italic; font-weight: normal; margin-top: 3px; opacity: 0.9; }
              .title { text-align: center; text-decoration: underline; font-size: 13pt; font-weight: bold; margin-bottom: 30px; font-family: Arial, sans-serif; text-transform: uppercase; color: #000000; }
              .meta-list { width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 11pt; font-family: Arial, sans-serif; }
              .meta-list td { padding: 6px 0; vertical-align: top; color: #000000; }
              .meta-label { width: 140px; font-weight: bold; text-transform: uppercase; }
              .meta-colon { width: 20px; font-weight: bold; }
              .meta-value { font-weight: bold; }
              .meta-value-regular { font-weight: normal; }
              .meta-subtitle { display: block; font-size: 10pt; color: #334155; font-weight: bold; margin-top: 2px; text-transform: uppercase; }
              .divider { border: 0; border-top: 1px dashed #777777; margin: 20px 0; }
              .content { white-space: pre-wrap; font-size: 11pt; text-align: justify; line-height: 1.5; color: #000000; padding-top: 5px; font-family: Arial, Helvetica, sans-serif; }
              @media print {
                body { padding: 0; }
                @page { margin: 2cm; }
              }
            </style>
          </head>
          <body>
            ${headerHtml}
            
            <div class="title">${doc.tipo.toUpperCase()} ${doc.expediente}</div>
            
            <table class="meta-list">
              <tr>
                <td class="meta-label">AL</td>
                <td class="meta-colon">:</td>
                <td class="meta-value">
                  ${doc.datosExtraidos?.destinatarios && Array.isArray(doc.datosExtraidos.destinatarios) && doc.datosExtraidos.destinatarios.length > 0 ? (
                    doc.datosExtraidos.destinatarios.map((dest: any, idx: number) => `
                      ${idx > 0 ? '<div style="margin-top: 10px;"></div>' : ''}
                      <span style="text-transform: uppercase; font-weight: bold; font-size: 11pt;">${dest.nombre}</span>
                      ${dest.cargo ? `<span class="meta-subtitle">${dest.cargo}</span>` : ''}
                    `).join('')
                  ) : `
                    <span style="text-transform: uppercase;">${doc.solicitante}</span>
                    ${doc.datosExtraidos?.cargo_destinatario ? `<span class="meta-subtitle">${doc.datosExtraidos.cargo_destinatario}</span>` : ''}
                  `}
                </td>
              </tr>
              <tr>
                <td class="meta-label">DE</td>
                <td class="meta-colon">:</td>
                <td class="meta-value">
                  <span style="text-transform: uppercase;">${savedUserName}</span>
                  <span class="meta-subtitle">${savedUserRole}</span>
                </td>
              </tr>
              <tr>
                <td class="meta-label">ASUNTO</td>
                <td class="meta-colon">:</td>
                <td class="meta-value" style="text-transform: uppercase;">${doc.tema}</td>
              </tr>
              <tr>
                <td class="meta-label">REFERENCIA</td>
                <td class="meta-colon">:</td>
                <td class="meta-value-regular">${doc.referencia || 'SIN REFERENCIA'}</td>
              </tr>
              <tr>
                <td class="meta-label">LUGAR Y FECHA</td>
                <td class="meta-colon">:</td>
                <td class="meta-value-regular">Bellavista, ${new Date(doc.fechaProceso).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</td>
              </tr>
            </table>
            
            <hr class="divider" />
            
            <div class="content">${cleanText || '◇ Sin redactar'}</div>
            
            <!-- Center-aligned "Atentamente" signature area -->
            <div style="margin-top: 60px; display: flex; flex-direction: column; align-items: center; justify-content: center; font-family: Arial, sans-serif; font-size: 11pt; text-align: center; color: #000000;">
              <div style="font-weight: bold; margin-bottom: 60px;">Atentamente,</div>
            </div>

            <script>
              window.onload = function() { window.print(); window.close(); }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  // Helper styles for badges
  const getStatusBadge = (estado: string) => {
    switch (estado) {
      case 'Aprobado':
        return <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"><CheckCircle2 size={12} /> Aprobado</span>;
      case 'Rechazado':
        return <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 border border-red-500/20"><XCircle size={12} /> Rechazado</span>;
      case 'Pendiente':
        return <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20"><HelpCircle size={12} /> Pendiente</span>;
      default:
        return <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-500 border border-slate-500/20">Procesado</span>;
    }
  };

  return (
    <div className="space-y-6 text-slate-800 dark:text-slate-100 font-sans" id="documents_view">
      
      {/* Upper header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800/80 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Archivo Documental
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Examine, filtre, exporte y modifique el estado de los documentos procesados por IA.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={exportToExcel}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold shadow-sm transition-all text-slate-700 dark:text-slate-300"
          >
            <Download size={13} />
            <span>Exportar Excel CSV</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/80 flex flex-col md:flex-row items-center gap-4 shadow-inner" id="filter_toolbar">
        {/* Search */}
        <div className="relative w-full md:flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Buscar por expediente, referencia, solicitante o tema..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Dropdowns */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Type Filter */}
          <div className="flex items-center gap-1.5 shrink-0">
            <Filter size={13} className="text-slate-400" />
            <select 
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-2 py-1.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 outline-none"
            >
              <option value="todos">Todos los tipos</option>
              <option value="Informe">Informe</option>
              <option value="Oficio">Oficio</option>
              <option value="Memorando">Memorando</option>
              <option value="Carta">Carta</option>
              <option value="Proveído">Proveído</option>
              <option value="Resolución">Resolución</option>
              <option value="Acta">Acta</option>
              <option value="Constancia">Constancia</option>
              <option value="Informe Técnico">Informe Técnico</option>
              <option value="Solicitud">Solicitud</option>
              <option value="Dictamen">Dictamen</option>
            </select>
          </div>

          {/* State Filter */}
          <select 
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            className="px-2 py-1.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 outline-none"
          >
            <option value="todos">Todos los estados</option>
            <option value="Procesado">Procesados</option>
            <option value="Pendiente">Pendientes</option>
            <option value="Aprobado">Aprobados</option>
            <option value="Rechazado">Rechazados</option>
          </select>
        </div>
      </div>

      {/* Main Grid List */}
      <div className="grid md:grid-cols-12 gap-6 items-start">
        
        {/* LEFT DIRECTORY PANEL: Folders Navigation */}
        <div className="md:col-span-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col gap-1 pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
              <span className="text-base">📁</span>
              <span>Buscador Inteligente</span>
            </h3>
            <div className="flex items-center gap-1 text-[9px] text-slate-400 font-mono overflow-hidden whitespace-nowrap text-ellipsis" title={safeStorage.getItem('saved_auto_save_path') || '/documentos_automaticos'}>
              <span className="shrink-0 text-slate-500">Ruta:</span>
              <span className="truncate">{safeStorage.getItem('saved_auto_save_path') || '/documentos_automaticos'}</span>
            </div>
          </div>

          <div className="space-y-1.5 max-h-[350px] overflow-y-auto pr-1">
            {/* Folder: Todos */}
            <button
              onClick={() => {
                setTypeFilter('todos');
              }}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-between group ${
                typeFilter === 'todos'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/10'
                  : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-950/50 dark:hover:bg-slate-950 text-slate-700 dark:text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm">🗂️</span>
                <span>Todos los Archivos</span>
              </div>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold ${
                typeFilter === 'todos' ? 'bg-indigo-500 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
              }`}>
                {documents.length}
              </span>
            </button>

            {/* Dynamic folders organized by document type */}
            {folderTypes.length === 0 ? (
              <div className="p-4 text-center text-[10px] text-slate-400 italic">
                Crea el primer documento para generar su carpeta de tipo.
              </div>
            ) : (
              folderTypes.map(type => {
                const count = documents.filter(d => d.tipo === type).length;
                return (
                  <button
                    key={type}
                    onClick={() => {
                      setTypeFilter(type);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-between group ${
                      typeFilter === type
                        ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/10'
                        : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-950/50 dark:hover:bg-slate-950 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate pr-2">
                      <span className="text-sm group-hover:scale-110 transition-transform duration-200">📁</span>
                      <span className="truncate">{type}s</span>
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold ${
                      typeFilter === type ? 'bg-amber-400 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT CONTENT PANEL: Documents list + detail panel */}
        <div className="md:col-span-9 grid md:grid-cols-12 gap-6 items-start">
          
          {/* Left Side: Expandable Docs List */}
          <div className={`${selectedDoc ? 'md:col-span-5' : 'md:col-span-12'} space-y-3`}>
          {filteredDocs.length === 0 ? (
            <div className="p-12 text-center rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
              <FileText size={42} className="mx-auto text-slate-300 dark:text-slate-700 mb-3" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No se encontraron documentos</p>
              <p className="text-xs text-slate-400 mt-1">Pruebe modificando los filtros de búsqueda o registre un nuevo documento.</p>
            </div>
          ) : (
            filteredDocs.map((doc) => (
              <div 
                key={doc.id}
                onClick={() => setSelectedDoc(doc)}
                className={`p-4 rounded-xl bg-white dark:bg-slate-900 border transition-all cursor-pointer shadow-sm flex items-start justify-between group ${
                  selectedDoc?.id === doc.id
                    ? 'border-indigo-500 ring-1 ring-indigo-500 bg-indigo-50/5 dark:bg-indigo-950/10'
                    : 'border-slate-200/80 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400">
                      {doc.tipo}
                    </span>
                    <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                      {doc.expediente}
                    </span>
                    {getStatusBadge(doc.estado)}
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {doc.referencia}
                  </h3>

                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 leading-relaxed">
                    {doc.tema}
                  </p>

                  <div className="flex items-center gap-4 text-[10px] text-slate-400 font-mono pt-1">
                    <span className="flex items-center gap-1"><User size={11} /> {doc.solicitante}</span>
                    <span className="flex items-center gap-1"><Calendar size={11} /> {new Date(doc.fechaProceso).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0 ml-3 self-center text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-colors">
                  <span className="text-[10px] font-semibold hidden sm:inline">Ver detalles</span>
                  <ChevronRight size={16} />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Right Side: Responsive Glass Detail Panel */}
        {selectedDoc && (
          <div className="md:col-span-7 p-6 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-indigo-500/20 shadow-2xl backdrop-blur-xl sticky top-6 space-y-6" id="detail_panel">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-500/10 text-indigo-500 rounded-md">
                    {selectedDoc.tipo}
                  </span>
                  {getStatusBadge(selectedDoc.estado)}
                </div>
                <h2 className="text-base font-bold text-slate-950 dark:text-white truncate">
                  {selectedDoc.expediente}
                </h2>
              </div>
              <button 
                onClick={() => setSelectedDoc(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={16} />
              </button>
            </div>

            {/* Core Info */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Referencia</span>
                <p className="font-semibold truncate text-slate-800 dark:text-slate-200">{selectedDoc.referencia}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Destinatario(s)</span>
                <div className="max-h-24 overflow-y-auto space-y-1">
                  {selectedDoc.datosExtraidos?.destinatarios && Array.isArray(selectedDoc.datosExtraidos.destinatarios) && selectedDoc.datosExtraidos.destinatarios.length > 0 ? (
                    selectedDoc.datosExtraidos.destinatarios.map((dest: any, idx: number) => (
                      <div key={idx} className="bg-slate-50 dark:bg-slate-950 p-1 rounded-md border border-slate-100 dark:border-slate-850">
                        <p className="font-bold uppercase text-slate-800 dark:text-slate-200 text-[10px]">{dest.nombre}</p>
                        {dest.cargo && <p className="text-[8.5px] text-slate-500 uppercase mt-0.5 font-semibold leading-none">{dest.cargo}</p>}
                      </div>
                    ))
                  ) : (
                    <div className="bg-slate-50 dark:bg-slate-950 p-1 rounded-md border border-slate-100 dark:border-slate-850">
                      <p className="font-bold uppercase text-slate-800 dark:text-slate-200 text-[10px]">{selectedDoc.solicitante}</p>
                      {selectedDoc.datosExtraidos?.cargo_destinatario && (
                        <p className="text-[8.5px] text-slate-500 uppercase mt-0.5 font-semibold leading-none">{selectedDoc.datosExtraidos.cargo_destinatario}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="col-span-2 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Tema de Expediente</span>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{selectedDoc.tema}</p>
              </div>
            </div>

            {/* AI Process Metadata Accordion */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200/60 dark:border-slate-800/60 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900 dark:text-white">
                <Sparkles size={13} className="text-indigo-500" />
                <span>Datos del Procesamiento de IA</span>
              </div>
              <div className="grid grid-cols-2 gap-y-2 text-[10px] font-mono text-slate-400">
                <div>Tecnología Utilizada:</div>
                <div className="text-right font-bold text-indigo-500 truncate">{selectedDoc.iaUtilizada}</div>
                <div>Tokens de Cuota:</div>
                <div className="text-right text-slate-600 dark:text-slate-300 font-bold">{selectedDoc.tokens} tokens</div>
                <div>Fecha de Proceso:</div>
                <div className="text-right text-slate-600 dark:text-slate-300">{new Date(selectedDoc.fechaProceso).toLocaleString()}</div>
              </div>
            </div>

            {/* Document Draft Body Block */}
            <div className="space-y-2">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Redacción Sugerida por IA</span>
              <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-[13px] sm:text-[14px] h-[320px] overflow-y-auto whitespace-pre-wrap text-justify border border-slate-200 dark:border-slate-800 scrollbar-thin scrollbar-thumb-indigo-500" style={{ fontFamily: 'Arial, Helvetica, sans-serif', lineHeight: '1.75', letterSpacing: '0.01em' }}>
                {selectedDoc.textoRedactado || 'Sin redacción procesada.'}
              </div>
            </div>

            {/* Actions Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              
              {/* Export items */}
              <div className="flex items-center gap-1.5">
                <button 
                  onClick={() => exportToWord(selectedDoc)}
                  className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-500 hover:bg-indigo-100 dark:hover:bg-indigo-900 hover:text-indigo-600 transition-colors"
                  title="Exportar a Word"
                >
                  <Download size={14} />
                </button>
                <button 
                  onClick={() => handlePrint(selectedDoc)}
                  className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-500 hover:bg-indigo-100 dark:hover:bg-indigo-900 hover:text-indigo-600 transition-colors"
                  title="Exportar a PDF / Imprimir"
                >
                  <Printer size={14} />
                </button>
              </div>

              {/* Status actions based on role */}
              <div className="flex items-center gap-1.5">
                {['Administrador', 'Jefe'].includes(currentUser.role) && selectedDoc.estado === 'Pendiente' && (
                  <>
                    <button 
                      onClick={() => {
                        onUpdateStatus(selectedDoc.id, 'Aprobado');
                        setSelectedDoc(prev => prev ? { ...prev, estado: 'Aprobado' } : null);
                      }}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold transition-colors shadow-sm"
                    >
                      <Check size={14} />
                      <span>Aprobar</span>
                    </button>
                    <button 
                      onClick={() => {
                        onUpdateStatus(selectedDoc.id, 'Rechazado');
                        setSelectedDoc(prev => prev ? { ...prev, estado: 'Rechazado' } : null);
                      }}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-semibold transition-colors shadow-sm"
                    >
                      <X size={14} />
                      <span>Rechazar</span>
                    </button>
                  </>
                )}

                {currentUser.role === 'Administrador' && (
                  showDeleteConfirm ? (
                    <div className="flex items-center gap-1.5 animate-fade-in bg-red-500/5 px-2 py-1 rounded-lg border border-red-500/20">
                      <span className="text-[10px] text-red-500 font-bold uppercase shrink-0">¿Eliminar permanentemente?</span>
                      <button 
                        onClick={() => {
                          onDelete(selectedDoc.id);
                          setSelectedDoc(null);
                        }}
                        className="px-2 py-1 rounded bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold shadow-sm transition-colors"
                      >
                        Sí, eliminar
                      </button>
                      <button 
                        onClick={() => setShowDeleteConfirm(false)}
                        className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 text-[10px] font-bold transition-colors"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setShowDeleteConfirm(true)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 text-xs font-semibold transition-colors"
                      title="Eliminar Registro"
                    >
                      <Trash2 size={14} />
                      <span>Eliminar</span>
                    </button>
                  )
                )}
              </div>

            </div>

          </div>
        )}

        </div> {/* Close md:col-span-9 grid wrapper */}

      </div>

    </div>
  );
}
