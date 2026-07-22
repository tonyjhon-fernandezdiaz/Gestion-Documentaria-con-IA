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


