export type UserRole = 'Administrador' | 'Secretaria' | 'Jefe' | 'Consulta';

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  avatar: string;
  password?: string;
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
  | 'Dictamen';

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


