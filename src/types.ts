export type UserRole = 'Administrador' | 'Secretaria' | 'Jefe' | 'Consulta';

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  avatar: string;
  password?: string;
  areaId?: string; // linked office or sub-office
  areaIds?: string[]; // linked offices or sub-offices (multiple support)
  cargo?: string; // custom institutional job title
  condicion?: string; // condition: Secretaria, Especialista, Apoyo Administrativo, Jefe, etc.
  sexo?: 'F' | 'M';
}

export type DocumentType =
  | 'Informe'
  | 'Oficio'
  | 'Memorando'
  | 'Carta'
  | 'Proveído'
  | 'Resolución'
  | 'Acta'
  | 'Constancia'
  | 'Informe Técnico'
  | 'Solicitud'
  | 'Dictamen'
  | 'Directiva'
  | 'Circular'
  | 'Oficio Múltiple'
  | 'Memorando Múltiple'
  | 'Nota de Insumo'
  | 'Nota de Coordinación'
  | 'Otros';

export interface AreaItem {
  id: string;
  name: string;
  code: string;
  parentAreaId?: string; // If sub-office, links to parent area (e.g. 'adm', 'agi')
  suffix: string; // e.g. '-2026-UGEL-ADM'
  responsableNombre?: string;
  responsableCargo?: string;
  membreteBase64?: string; // base64 representation of office logo/header
  order?: number; // sort order within the same parent level
}

export interface AreaTemplate {
  id: string;
  documentType: DocumentType;
  areaId: string; // e.g. 'adm', 'agi', 'agp', 'dir', 'rrhh'
  subareaId?: string; // e.g. 'finanzas', 'planificacion'
  subtipoProposito: string; // e.g. 'Certificación Presupuestal', 'Solicitud de Información', 'Cumplimiento'
  title: string;
  templateText: string;
  version: number;
  historial: {
    version: number;
    templateText: string;
    fecha: string;
    modificadoPor: string;
  }[];
}

export interface DocumentTemplate {
  id: string; // documentType (e.g. 'Carta', 'Oficio', 'Memorando')
  documentType: DocumentType;
  nombre: string; // nombre visible
  descripcion?: string;
  // Configuración de página
  page: {
    marginTop: number; // twips (1/1440 inch)
    marginRight: number;
    marginBottom: number;
    marginLeft: number;
    pageWidth: number; // twips (letter = 12240)
    pageHeight: number; // twips (letter = 15840)
    orientation: 'portrait' | 'landscape';
  };
  // Fuente por defecto
  defaultFont: {
    name: string; // 'Arial', 'Times New Roman', etc.
    size: number; // half-points (11pt = 22)
    color: string; // hex
  };
  // Estructura de la plantilla (secciones en orden)
  sections: TemplateSection[];
  // Metadatos
  version: number;
  historial: {
    version: number;
    fecha: string;
    modificadoPor: string;
  }[];
}

export interface TemplateSection {
  id: string;
  tipo: 'header' | 'body' | 'footer' | 'membrete' | 'metadatos' | 'saludo' | 'despedida' | 'firma' | 'custom' | 'separator' | 'codigo' | 'lugar' | 'destinatario' | 'asunto' | 'lugarFecha';
  nombre: string; // nombre visible
  obligatorio: boolean;
  editable: boolean; // si el usuario puede editarlo en el editor visual
  origen: 'sistema' | 'ia' | 'fijo'; // qué genera el contenido de esta sección
  // Contenido estático (para membrete, saludo, despedida, firma)
  contenidoEstatico?: string; // HTML o texto plano
  // Para secciones dinámicas (metadatos): qué campos mostrar
  campos?: ('lugarFecha' | 'codigo' | 'destinatario' | 'remitente' | 'asunto' | 'referencia' | 'custom')[];
  // Estilos específicos de la sección
  estilo?: {
    alineacion?: 'left' | 'center' | 'right' | 'justify';
    fuente?: { name: string; size: number; bold?: boolean; italic?: boolean; color?: string };
    espaciado?: { antes: number; despues: number; interlineado: number };
    bordes?: { inferior?: { tipo: 'single' | 'dashed' | 'none'; color: string; grosor: number } };
  };
}

export interface CorrelativeCounter {
  id: string; // e.g. 'adm_Memorando'
  areaId: string;
  documentType: DocumentType;
  lastNumber: number; // e.g. 1, 2, 5
  suffix: string; // e.g. '-2026-UGEL-ADM'
}

export interface Document {
  id: string;
  expediente: string;
  referencia: string;
  solicitante: string;
  tema: string;
  tipo: DocumentType;
  datosExtraidos: Record<string, any>;
  textoRedactado: string;
  iaUtilizada: string;
  tokens: number;
  fechaProceso: string;
  estado: 'Pendiente' | 'Procesado' | 'Aprobado' | 'Rechazado';
  originalFilename?: string;
  textoOriginal?: string;
  creadoPor: string;
}

export interface AIProvider {
  id: string;
  name: string;
  priority: number;
  enabled: boolean;
  hasKey: boolean;
  apiUrl?: string;
  modelName: string;
  apiKey?: string;
  maskedKey?: string;
  tokensConsumed?: number;
  balance?: number;
}

export interface PromptTemplate {
  id: string;
  documentType: DocumentType;
  prompt: string;
  version: number;
  historial: {
    version: number;
    prompt: string;
    fecha: string;
    modificadoPor: string;
  }[];
}

export interface SystemLog {
  id: string;
  fecha: string;
  usuario: string;
  accion: string;
  detalles: string;
  tipo: 'info' | 'success' | 'warning' | 'error';
  ip?: string;
  providerAttempted?: string[];
  providerSucceeded?: string;
  tokensUsed?: number;
  responseTimeMs?: number;
}

export interface LearningCorrection {
  id: string;
  fecha: string;
  campo: string;
  valorErroneo: string;
  valorCorregido: string;
  contextoTexto?: string;
  explicacion?: string;
  usuario: string;
}

export interface AgendaEvent {
  id: string;
  title: string;
  fecha: string; // ISO date-time
  tipo: 'Reunión' | 'Trámite' | 'Recordatorio' | 'Otro';
  descripcion: string;
  enlace?: string; // e.g. zoom, meets, teams link
  completado: boolean;
  creadoPor: string;
  fechaCreacion: string;
}

