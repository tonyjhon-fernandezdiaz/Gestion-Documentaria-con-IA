import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, AlignmentType, WidthType, ShadingType, convertInchesToTwip } from 'docx';

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
}

export async function generateDocxBlob(opts: DocxOptions): Promise<Blob> {
  const cleanBody = opts.body
    .replace(/\\n/g, '\n')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/^#{1,6}\s+/gm, '')
    .trim();

  const children: (Paragraph | Table)[] = [];

  // --- Header (membrete) ---
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
      new Paragraph({ children: [new TextRun({ text: '"AÑO DEL BICENTENARIO, DE LA CONSOLIDACIÓN DE NUESTRA INDEPENDENCIA, Y DE LA CONMEMORACIÓN DE LAS HEROICAS BATALLAS DE JUNÍN Y AYACUCHO"', size: 9, color: '#FFFFFF', italics: true })], alignment: AlignmentType.CENTER }),
    ],
    width: { size: 7200, type: WidthType.DXA },
    shading: { fill: '#8B3A3A', type: ShadingType.CLEAR },
    verticalAlign: 'center',
  });

  children.push(
    new Table({
      rows: [new TableRow({ children: [headerCellLeft, headerCellRight] })],
    })
  );

  children.push(new Paragraph({ children: [], spacing: { after: 200 } }));

  // --- Title ---
  children.push(
    new Paragraph({
      children: [new TextRun({ text: `${opts.docType.toUpperCase()} ${opts.docCode}`, bold: true, size: 22 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
    })
  );

  // --- Metadata table ---
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

  // --- Dashed line ---
  children.push(
    new Paragraph({
      children: [new TextRun({ text: '─'.repeat(90), size: 12, color: '#777777' })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 300, after: 300 },
    })
  );

  // --- Body ---
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

  // --- Signature ---
  children.push(new Paragraph({ children: [], spacing: { after: 400 } }));
  children.push(
    new Paragraph({
      children: [new TextRun({ text: 'Atentamente,', bold: true, size: 21 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 600 },
    })
  );

  const doc = new Document({
    creator: 'Sistema de Gestión Documentaria - UGEL Bellavista',
    title: opts.filename,
    styles: {
      default: {
        document: {
          run: { font: 'Arial', size: 21 },
        },
      },
    },
    sections: [{
      properties: {
        page: {
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          size: { width: 12240, height: 15840 },
        },
      },
      children,
    }],
  });

  return await Packer.toBlob(doc);
}
