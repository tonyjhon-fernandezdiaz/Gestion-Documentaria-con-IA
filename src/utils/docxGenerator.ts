import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, AlignmentType, WidthType, ShadingType } from 'docx';
import type { DocumentTemplate, TemplateSection } from '../types.js';

interface DocxRecipient {
  nombre: string;
  cargo?: string;
  sexo?: 'F' | 'M';
}

interface DocxOptions {
  docType: string;
  docCode: string;
  salutation: string;
  recipients: DocxRecipient[];
  fromName: string;
  fromRole: string;
  subject: string;
  referencia: string;
  date: string;
  body: string;
  filename: string;
  template?: DocumentTemplate;
}

function twipsToHalfPoints(twips: number): number {
  return Math.round(twips / 20);
}

function buildParagraphFromStyle(text: string, estilo?: TemplateSection['estilo']): Paragraph {
  const alignmentMap: Record<string, (typeof AlignmentType)[keyof typeof AlignmentType]> = {
    left: AlignmentType.LEFT,
    center: AlignmentType.CENTER,
    right: AlignmentType.RIGHT,
    justify: AlignmentType.JUSTIFIED,
  };

  const runs: TextRun[] = [];
  const parts = text.split('\n');
  parts.forEach((part, i) => {
    if (i > 0) runs.push(new TextRun({ text: '', break: 1 }));
    runs.push(new TextRun({
      text: part,
      size: estilo?.fuente?.size || 21,
      bold: estilo?.fuente?.bold,
      italics: estilo?.fuente?.italic,
      color: estilo?.fuente?.color?.replace('#', '') || '000000',
      font: estilo?.fuente?.name || 'Arial',
    }));
  });

  return new Paragraph({
    children: runs,
    alignment: alignmentMap[estilo?.alineacion || 'justify'],
    spacing: {
      before: estilo?.espaciado?.antes || 0,
      after: estilo?.espaciado?.despues || 240,
      line: Math.round((estilo?.espaciado?.interlineado || 1.15) * 240),
      lineRule: 'auto',
    },
    border: estilo?.bordes?.inferior ? {
      bottom: {
        style: estilo.bordes.inferior.tipo === 'dashed' ? 'dashed' : 'single',
        size: estilo.bordes.inferior.grosor,
        color: estilo.bordes.inferior.color.replace('#', ''),
      },
    } : undefined,
  });
}

function addSectionChildren(children: (Paragraph | Table)[], section: TemplateSection, context: DocxOptions): void {
  switch (section.tipo) {
    case 'membrete': {
      if (section.contenidoEstatico) {
        // Parse HTML-like content or use default
        const lines = section.contenidoEstatico.split('\n').filter(Boolean);
        const table = new Table({
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  children: lines.map(l => new Paragraph({ children: [new TextRun({ text: l, bold: true, size: 18, color: '#1d4ed8' })], alignment: AlignmentType.LEFT })),
                  width: { size: 2400, type: WidthType.DXA },
                  verticalAlign: 'center',
                }),
                new TableCell({
                  children: [
                    new Paragraph({ children: [new TextRun({ text: 'DIRECCIÓN REGIONAL DE EDUCACIÓN', bold: true, size: 16, color: '#FFFFFF' })], alignment: AlignmentType.CENTER }),
                    new Paragraph({ children: [new TextRun({ text: 'UGEL Bellavista – Dirección – Área de Gestión Institucional – Racionalización', size: 11, color: '#FFFFFF' })], alignment: AlignmentType.CENTER }),
                    new Paragraph({ children: [new TextRun({ text: '"AÑO DEL BICENTENARIO..."', size: 9, color: '#FFFFFF', italics: true })], alignment: AlignmentType.CENTER }),
                  ],
                  width: { size: 7200, type: WidthType.DXA },
                  shading: { fill: '#8B3A3A', type: ShadingType.CLEAR },
                  verticalAlign: 'center',
                }),
              ],
            }),
          ],
        });
        children.push(table);
        children.push(new Paragraph({ children: [], spacing: { after: 200 } }));
      }
      break;
    }
    case 'metadatos': {
      const metaRows: TableRow[] = [];
      const addMetaRow = (label: string, valueChildren: TextRun[]) => {
        metaRows.push(new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 21 })], alignment: AlignmentType.LEFT })], width: { size: 1400, type: WidthType.DXA } }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: ':', bold: true, size: 21 })], alignment: AlignmentType.LEFT })], width: { size: 400, type: WidthType.DXA } }),
            new TableCell({ children: [new Paragraph({ children: valueChildren })], width: { size: 7800, type: WidthType.DXA } }),
          ],
        }));
      };

      if (context.recipients.length > 0 && section.campos?.includes('destinatario')) {
        const recChildren: TextRun[] = [];
        context.recipients.forEach((r, i) => {
          if (i > 0) recChildren.push(new TextRun({ text: '\n', size: 18 }));
          recChildren.push(new TextRun({ text: r.nombre, bold: true, size: 21 }));
          if (r.cargo) recChildren.push(new TextRun({ text: `\n${r.cargo}`, size: 20, color: '#334155' }));
        });
        addMetaRow(context.salutation || 'SEÑOR', recChildren);
      }
      if (section.campos?.includes('remitente')) {
        addMetaRow('DE', [new TextRun({ text: context.fromName, bold: true, size: 21 }), new TextRun({ text: `\n${context.fromRole}`, size: 20, color: '#334155' })]);
      }
      if (section.campos?.includes('asunto')) {
        addMetaRow('ASUNTO', [new TextRun({ text: context.subject, bold: true, size: 21 })]);
      }
      if (section.campos?.includes('referencia')) {
        addMetaRow('REFERENCIA', [new TextRun({ text: context.referencia || 'SIN REFERENCIA', size: 21, color: '#1e293b' })]);
      }
      if (section.campos?.includes('lugarFecha')) {
        addMetaRow('LUGAR Y FECHA', [new TextRun({ text: context.date, size: 21, color: '#1e293b' })]);
      }
      if (section.campos?.includes('codigo')) {
        addMetaRow('CÓDIGO', [new TextRun({ text: context.docCode, bold: true, size: 21 })]);
      }

      if (metaRows.length > 0) {
        children.push(new Table({ rows: metaRows }));
      }
      break;
    }
    case 'separator': {
      children.push(new Paragraph({
        children: [new TextRun({ text: '─'.repeat(90), size: 12, color: '#777777' })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 300, after: 300 },
      }));
      break;
    }
    case 'body': {
      const cleanBody = context.body
        .replace(/\\n/g, '\n')
        .replace(/```[\s\S]*?```/g, '')
        .replace(/^#{1,6}\s+/gm, '')
        .trim();
      const bodyParagraphs = cleanBody
        .split(/\n\s*\n/)
        .map(p => p.trim())
        .filter(Boolean)
        .map(p => buildParagraphFromStyle(p, section.estilo));
      children.push(...bodyParagraphs);
      break;
    }
    case 'despedida': {
      children.push(new Paragraph({ children: [], spacing: { after: 400 } }));
      children.push(buildParagraphFromStyle('Atentamente,', { alineacion: 'center', fuente: { name: 'Arial', size: 21, bold: true }, espaciado: { antes: 0, despues: 600, interlineado: 1.15 } }));
      break;
    }
    case 'firma': {
      children.push(new Paragraph({ children: [], spacing: { after: 600 } }));
      children.push(buildParagraphFromStyle(context.fromName, { alineacion: 'center', fuente: { name: 'Arial', size: 21, bold: true }, espaciado: { antes: 0, despues: 0, interlineado: 1.15 } }));
      children.push(buildParagraphFromStyle(context.fromRole, { alineacion: 'center', fuente: { name: 'Arial', size: 20, color: '#334155' }, espaciado: { antes: 0, despues: 0, interlineado: 1.15 } }));
      break;
    }
    case 'saludo': {
      if (section.contenidoEstatico) {
        children.push(buildParagraphFromStyle(section.contenidoEstatico, section.estilo));
      }
      break;
    }
    case 'custom': {
      if (section.contenidoEstatico) {
        children.push(buildParagraphFromStyle(section.contenidoEstatico, section.estilo));
      }
      break;
    }
  }
}

export async function generateDocxBlob(opts: DocxOptions): Promise<Blob> {
  const template = opts.template;
  const children: (Paragraph | Table)[] = [];

  if (template?.sections && template.sections.length > 0) {
    // Usar estructura de la plantilla
    for (const section of template.sections) {
      if (!section.obligatorio && !section.editable) continue;
      addSectionChildren(children, section, opts);
    }
  } else {
    // Estructura por defecto (compatibilidad hacia atrás)
    // Membrete
    const headerCellLeft = new TableCell({
      children: [
        new Paragraph({ children: [new TextRun({ text: 'San Martín', bold: true, italics: true, size: 18, color: '#1d4ed8' })], alignment: AlignmentType.LEFT }),
        new Paragraph({ children: [new TextRun({ text: 'Gobierno Regional', bold: true, size: 11, color: '#666666' })], alignment: AlignmentType.LEFT }),
      ],
      width: { size: 2400, type: WidthType.DXA },
      verticalAlign: 'center',
    });

    const headerCellRight = new TableCell({
      children: [
        new Paragraph({ children: [new TextRun({ text: 'DIRECCIÓN REGIONAL DE EDUCACIÓN', bold: true, size: 16, color: '#FFFFFF' })], alignment: AlignmentType.CENTER }),
        new Paragraph({ children: [new TextRun({ text: 'UGEL Bellavista – Dirección – Área de Gestión Institucional – Racionalización', size: 11, color: '#FFFFFF' })], alignment: AlignmentType.CENTER }),
        new Paragraph({ children: [new TextRun({ text: '"AÑO DEL BICENTENARIO..."', size: 9, color: '#FFFFFF', italics: true })], alignment: AlignmentType.CENTER }),
      ],
      width: { size: 7200, type: WidthType.DXA },
      shading: { fill: '#8B3A3A', type: ShadingType.CLEAR },
      verticalAlign: 'center',
    });

    children.push(new Table({ rows: [new TableRow({ children: [headerCellLeft, headerCellRight] })] }));
    children.push(new Paragraph({ children: [], spacing: { after: 200 } }));

    // Título
    children.push(new Paragraph({
      children: [new TextRun({ text: `${opts.docType.toUpperCase()} ${opts.docCode}`, bold: true, size: 22 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
    }));

    // Metadatos
    const metaRows: TableRow[] = [];
    const addMetaRow = (label: string, valueChildren: TextRun[]) => {
      metaRows.push(new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 21 })], alignment: AlignmentType.LEFT })], width: { size: 1400, type: WidthType.DXA } }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: ':', bold: true, size: 21 })], alignment: AlignmentType.LEFT })], width: { size: 400, type: WidthType.DXA } }),
          new TableCell({ children: [new Paragraph({ children: valueChildren })], width: { size: 7800, type: WidthType.DXA } }),
        ],
      }));
    };

    if (opts.recipients.length > 0) {
      const recChildren: TextRun[] = [];
      opts.recipients.forEach((r, i) => {
        if (i > 0) recChildren.push(new TextRun({ text: '\n', size: 18 }));
        recChildren.push(new TextRun({ text: r.nombre, bold: true, size: 21 }));
        if (r.cargo) recChildren.push(new TextRun({ text: `\n${r.cargo}`, size: 20, color: '#334155' }));
      });
      addMetaRow(opts.salutation, recChildren);
    }

    addMetaRow('DE', [new TextRun({ text: opts.fromName, bold: true, size: 21 }), new TextRun({ text: `\n${opts.fromRole}`, size: 20, color: '#334155' })]);
    addMetaRow('ASUNTO', [new TextRun({ text: opts.subject, bold: true, size: 21 })]);
    addMetaRow('REFERENCIA', [new TextRun({ text: opts.referencia || 'SIN REFERENCIA', size: 21, color: '#1e293b' })]);
    addMetaRow('LUGAR Y FECHA', [new TextRun({ text: opts.date, size: 21, color: '#1e293b' })]);

    children.push(new Table({ rows: metaRows }));

    // Separador
    children.push(new Paragraph({
      children: [new TextRun({ text: '─'.repeat(90), size: 12, color: '#777777' })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 300, after: 300 },
    }));

    // Cuerpo
    const cleanBody = opts.body
      .replace(/\\n/g, '\n')
      .replace(/```[\s\S]*?```/g, '')
      .replace(/^#{1,6}\s+/gm, '')
      .trim();
    const bodyParagraphs = cleanBody
      .split(/\n\s*\n/)
      .map(p => p.trim())
      .filter(Boolean)
      .map(p => new Paragraph({
        children: [new TextRun({ text: p, size: 21 })],
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 240 },
      }));
    children.push(...bodyParagraphs);

    // Firma
    children.push(new Paragraph({ children: [], spacing: { after: 400 } }));
    children.push(new Paragraph({
      children: [new TextRun({ text: 'Atentamente,', bold: true, size: 21 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 600 },
    }));
  }

  // Page setup from template or defaults
  const pageMargin = template?.page ? {
    top: template.page.marginTop,
    right: template.page.marginRight,
    bottom: template.page.marginBottom,
    left: template.page.marginLeft,
  } : { top: 1440, right: 1440, bottom: 1440, left: 1440 };

  const pageSize = template?.page ? {
    width: template.page.pageWidth,
    height: template.page.pageHeight,
    orientation: template.page.orientation as 'portrait' | 'landscape',
  } : { width: 12240, height: 15840, orientation: 'portrait' as const };

  const defaultFont = template?.defaultFont ? {
    font: template.defaultFont.name,
    size: template.defaultFont.size,
    color: template.defaultFont.color?.replace('#', '') || '000000',
  } : { font: 'Arial', size: 21 };

  const doc = new Document({
    creator: 'Sistema de Gestión Documentaria - UGEL Bellavista',
    title: opts.filename,
    styles: {
      default: {
        document: {
          run: defaultFont,
        },
      },
    },
    sections: [{
      properties: {
        page: {
          margin: pageMargin,
          size: pageSize,
        },
      },
      children,
    }],
  });

  return await Packer.toBlob(doc);
}