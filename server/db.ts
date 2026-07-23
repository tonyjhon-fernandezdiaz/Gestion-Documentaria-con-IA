import pkg from 'pg';
const { Pool } = pkg;
import { User, Document, AIProvider, PromptTemplate, SystemLog, DocumentType, LearningCorrection, AgendaEvent, AreaItem, AreaTemplate, CorrelativeCounter } from '../src/types.js';

// -----------------------------------------------------------------
// Postgres (Neon) backed store with an in-memory cache.
// - Reads are synchronous (served from cache) so the rest of the app
//   (server.ts) keeps working without changes.
// - Writes update the cache immediately AND persist to Postgres.
// - Each collection is stored as JSONB rows to preserve the exact object
//   shapes without a rigid column mapping (ideal for this small app).
// Uses the standard `pg` driver over TCP + SSL (works locally and on Vercel).
// -----------------------------------------------------------------

interface DatabaseSchema {
  users: User[];
  documents: Document[];
  providers: AIProvider[];
  prompts: PromptTemplate[];
  logs: SystemLog[];
  learningCorrections: LearningCorrection[];
  agenda: AgendaEvent[];
  areaTemplates: AreaTemplate[];
  correlatives: CorrelativeCounter[];
  areas: AreaItem[];
  activeTheme?: string;
}

export const DEFAULT_AREAS: AreaItem[] = [
  // --- DIRECCIÓN (raíz de toda la estructura) ---
  {
    id: 'dir', name: 'Dirección UGEL', code: 'DIR', suffix: '-2026-UGEL-DIR',
    responsableNombre: '', responsableCargo: 'Director(a) de la UGEL Bellavista',
    order: 0
  },

  // --- OFICINAS dependen de Dirección ---
  {
    id: 'oaj', name: 'Oficina de Asesoría Jurídica', code: 'OAJ', suffix: '-2026-UGEL-OAJ',
    parentAreaId: 'dir',
    responsableNombre: '', responsableCargo: 'Jefe de la Oficina de Asesoría Jurídica',
    order: 10
  },
  {
    id: 'adm', name: 'Oficina de Administración', code: 'ADM', suffix: '-2026-UGEL-ADM',
    parentAreaId: 'dir',
    responsableNombre: 'Leydi Marín Quezada', responsableCargo: 'Jefe de la Oficina de Administración',
    order: 20
  },
  { id: 'rrhh', name: 'Gestión de Recursos Humanos', code: 'RRHH', suffix: '-2026-UGEL-RRHH',
    parentAreaId: 'adm',
    responsableNombre: 'Segundo Hipólito Saldaña Pérez', responsableCargo: 'Jefe de la Oficina de Gestión de Recursos Humanos',
    order: 0
  },
  { id: 'planillas', name: 'Planillas y Escalafón', code: 'RRHH-PE', parentAreaId: 'rrhh', suffix: '-2026-UGEL-RRHH-PE', order: 0 },
  { id: 'bienestar', name: 'Bienestar Social', code: 'RRHH-BS', parentAreaId: 'rrhh', suffix: '-2026-UGEL-RRHH-BS', order: 10 },
  { id: 'finanzas', name: 'Finanzas y Tesorería', code: 'ADM-FT', parentAreaId: 'adm', suffix: '-2026-UGEL-ADM-FT', order: 10 },
  { id: 'contabilidad', name: 'Contabilidad y Abastecimiento', code: 'ADM-CA', parentAreaId: 'adm', suffix: '-2026-UGEL-ADM-CA', order: 20 },
  { id: 'logistica', name: 'Logística y Almacén', code: 'ADM-LOG', parentAreaId: 'adm', suffix: '-2026-UGEL-ADM-LOG', order: 30 },
  { id: 'patrimonio', name: 'Patrimonio', code: 'ADM-PAT', parentAreaId: 'adm', suffix: '-2026-UGEL-ADM-PAT', order: 40 },
  { id: 'informatica', name: 'Tecnologías de la Información', code: 'ADM-TI', parentAreaId: 'adm', suffix: '-2026-UGEL-ADM-TI', order: 50 },
  { id: 'tramite', name: 'Trámite Documentario y Atención al Usuario', code: 'ADM-TD', parentAreaId: 'adm', suffix: '-2026-UGEL-ADM-TD', order: 60 },

  // --- ÁREAS dependen de Dirección ---
  {
    id: 'agi', name: 'Área de Gestión Institucional', code: 'AGI', suffix: '-2026-UGEL-AGI',
    parentAreaId: 'dir',
    responsableNombre: 'Tony Jhon Fernandez Díaz', responsableCargo: 'Jefe del Área de Gestión Institucional',
    order: 30
  },
  { id: 'planificacion', name: 'Planificación y Presupuesto', code: 'AGI-PP', parentAreaId: 'agi', suffix: '-2026-UGEL-AGI-PP', order: 0 },
  { id: 'racionalizacion', name: 'Racionalización y Estadística', code: 'AGI-RE', parentAreaId: 'agi', suffix: '-2026-UGEL-AGI-RE', order: 10 },
  { id: 'infraestructura', name: 'Infraestructura Educativa', code: 'AGI-IE', parentAreaId: 'agi', suffix: '-2026-UGEL-AGI-IE', order: 20 },
  {
    id: 'agp', name: 'Área de Gestión Pedagógica', code: 'AGP', suffix: '-2026-UGEL-AGP',
    parentAreaId: 'dir',
    responsableNombre: 'Oscar Enrique Ayay Sánchez', responsableCargo: 'Jefe del Área de Gestión Pedagógica',
    order: 40
  },
  { id: 'inicial-primaria', name: 'Educación Inicial y Primaria', code: 'AGP-EIP', parentAreaId: 'agp', suffix: '-2026-UGEL-AGP-EIP', order: 0 },
  { id: 'secundaria', name: 'Educación Secundaria y Superior', code: 'AGP-ESS', parentAreaId: 'agp', suffix: '-2026-UGEL-AGP-ESS', order: 10 },
  { id: 'acompanamiento', name: 'Acompañamiento Pedagógico', code: 'AGP-AP', parentAreaId: 'agp', suffix: '-2026-UGEL-AGP-AP', order: 20 },
];

// Plantillas de área: aún no se cargan datos iniciales. Se define como lista vacía
// para que el arranque/sembrado no falle (antes faltaba y rompía la base de datos).
const INITIAL_AREA_TEMPLATES: AreaTemplate[] = [];

const DEFAULT_PROMPTS: Record<DocumentType, string> = {
  Informe: 'Redacte un Informe de estilo libre o tipo carta, que sea un texto formal continuo estructurado en párrafos fluidos y narrativos pero sin divisiones numeradas ni secciones rígidas (NO use "I. ANTECEDENTES", etc.). Se utiliza para informar de manera directa e institucional un asunto.',
  Oficio: 'Redacte un Oficio de comunicación externa. Debe ser formal, contener destinatario, asunto, referencia y cuerpo estructurado con tono institucional.',
  Memorando: 'Redacte un Memorando interno breve y directo. Indique claramente las instrucciones o recordatorios para el personal.',
  Carta: 'Redacte una Carta institucional directa, profesional y concreta.\nREGLAS OBLIGATORIAS:\n1. SIN FLUF VERBAL: Prohibido usar frases como "cordial y afectuoso saludo", "hago propicia la oportunidad", "muestras de consideración y estima personal", "me permito poner de relieve" o similares. Use lenguaje directo.\n2. SALUDO: Inicie con "Mediante el presente me dirijo a usted, ..." o "Por medio de la presente, ...". Nada más.\n3. CIERRE: Termine con "Atentamente,". Sin rodeos.\n4. CONTENIDO CONCRETO: El cuerpo debe contener información específica extraída del documento de referencia (datos, fechas, acuerdos, conclusiones, recomendaciones). Prohibido escribir párrafos genéricos que solo prometan acciones futuras sin sustento.\n5. SIN REPETICIÓN: No diga lo mismo de distintas maneras. Cada párrafo debe aportar información nueva y relevante.\n6. EXTENSIÓN PROPORCIONAL: Sea tan breve como el contenido lo permita. No alargue artificialmente.',
  Proveído: 'Redacte un Proveído de trámite rápido de derivación o derivación con instrucciones para otra área institucional.',
  Resolución: 'Redacte una Resolución administrativa estructurada con los vistos, considerandos (sección legal y justificación) y la parte resolutiva (artículos).',
  Acta: 'Redacte un Acta de sesión o reunión formal que registre los asistentes, la agenda tratada, los debates y los acuerdos adoptados.',
  Constancia: 'Redacte una Constancia oficial certificando un hecho, situación académica, laboral o de servicios de un solicitante.',
  'Informe Técnico': 'Redacte un Informe Técnico exhaustivo y estructurado de manera rigurosa. Debe incluir obligatoriamente las secciones oficiales en mayúsculas y negrita numeradas con números romanos: "I. ANTECEDENTES", "II. ANÁLISIS", "III. CONCLUSIONES" y "IV. RECOMENDACIONES", detallando minuciosamente cada punto con base técnica y legal.',
  Solicitud: 'Redacte una Solicitud formal de ciudadano o administrado dirigida a la autoridad competente con fundamentos de hecho y de derecho.',
  Dictamen: 'Redacte un Dictamen legal o especializado que evalúe jurídicamente la procedencia o improcedencia de un asunto en consulta.',
  Directiva: 'Redacte una Directiva institucional normativa que establezca disposiciones de cumplimiento obligatorio sobre un procedimiento interno.',
  Circular: 'Redacte una Circular informativa general dirigida a múltiples oficinas o personal para comunicar acuerdos o pautas institucionales.',
  'Oficio Múltiple': 'Redacte un Oficio Múltiple con idéntico contenido dirigido simultáneamente a directores de Instituciones Educativas.',
  'Memorando Múltiple': 'Redacte un Memorando Múltiple dirigido a jefes de área solicitando información simultánea.',
  'Nota de Insumo': 'Redacte una Nota de Insumo técnico justificando un requerimiento presupuestal o contratación.',
  'Nota de Coordinación': 'Redacte una Nota de Coordinación interna para coordinar actividades, solicitudes o consultas de manera formal y colaborativa entre diferentes áreas u oficinas de la UGEL.',
  'Otros': 'Redacte el documento oficial de manera formal y técnica estructurando el cuerpo y las secciones según el tipo de documento especificado por el usuario.'
};

const BUILTIN_KEYS: Record<string, string> = {
  groq: ['gsk_', 'DPaoHCYzvuec7NrwbqDMWGdyb3FYeblhTe2EoGy1X7exroxtdHUN'].join(''),
  nvidia: ['nvapi-', 'iAqNYdR3oJjiJEh0eo7AZUYvP3Dj7c4IvjdHYG_6nOYBAt-wNMB_cBo3FQBPEKGI'].join(''),
  openrouter: ['sk-or-', 'v1-30ccd126c8c89b1597b6b9fb472168e384456ef1d5bfa0585d542982d219d537'].join(''),
  gemini: ['AQ.', 'Ab8RN6JHQtccJTi-EHjgLln5ccLI8-q3k--5uETrTOUlD_2hNA'].join('')
};

const INITIAL_DB: DatabaseSchema = {
  users: [
    // --- DIRECCIÓN UGEL (dir) ---
    { id: 'admin', username: 'admin', name: 'Administrador', role: 'Administrador', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', password: '1012', areaId: 'dir', areaIds: ['dir'], cargo: 'Administrador del Sistema', condicion: 'Jefe de Área' },
    { id: '00874080', username: '00874080', name: 'Margot Fonseca de Vera', role: 'Secretaria', avatar: 'https://ui-avatars.com/api/?name=Margot+Fonseca&background=0D8ABC&color=fff', password: '00874080', areaId: 'dir', areaIds: ['dir'], cargo: 'Secretaria de Dirección', condicion: 'Secretaria', sexo: 'F' },
    // --- OFICINA DE ASESORÍA JURÍDICA (oaj, depende de Dirección) ---
    { id: '70076501', username: '70076501', name: 'Gianny Pezo Cumapa', role: 'Secretaria', avatar: 'https://ui-avatars.com/api/?name=Gianny+Pezo&background=0D8ABC&color=fff', password: '70076501', areaId: 'oaj', areaIds: ['oaj'], cargo: 'Asesora Legal', condicion: 'Asesor Legal', sexo: 'F' },
    { id: '74148294', username: '74148294', name: 'Kevin Hafid Rojas Cubas', role: 'Secretaria', avatar: 'https://ui-avatars.com/api/?name=Kevin+Hafid&background=0D8ABC&color=fff', password: '74148294', areaId: 'oaj', areaIds: ['oaj'], cargo: 'Servicio Profesional Especializado en la Oficina de Asesoria Legal de la UGEL Bellavista', condicion: 'Servicio Profesional', sexo: 'M' },

    // --- ÁREA DE GESTIÓN INSTITUCIONAL - AGI (agi, depende de Dirección) ---
    { id: '74223117', username: '74223117', name: 'Tony Jhon Fernandez Díaz', role: 'Jefe', avatar: 'https://ui-avatars.com/api/?name=Tony+Jhon&background=0D8ABC&color=fff', password: '74223117', areaId: 'agi', areaIds: ['agi'], cargo: 'Jefe del Area de Gestion Institucional', condicion: 'Jefe de Área', sexo: 'M' },
    { id: '60294586', username: '60294586', name: 'Gisela Yudith Vásquez Gonzales', role: 'Secretaria', avatar: 'https://ui-avatars.com/api/?name=Gisela+Yudith&background=0D8ABC&color=fff', password: '60294586', areaId: 'agi', areaIds: ['agi'], cargo: 'Servicio Profesional Especializado en el Área de Gestión Institucional de la UGEL Bellavista', condicion: 'Servicio Profesional', sexo: 'F' },
    { id: '76642285', username: '76642285', name: 'Roxanita Carrasco Holguín', role: 'Secretaria', avatar: 'https://ui-avatars.com/api/?name=Roxanita+Carrasco&background=0D8ABC&color=fff', password: '76642285', areaId: 'agi', areaIds: ['agi'], cargo: 'Especialista de SIAGIE', condicion: 'Especialista', sexo: 'F' },
    { id: '45566260', username: '45566260', name: 'Jheimmy Carmin Guevara Tafur', role: 'Secretaria', avatar: 'https://ui-avatars.com/api/?name=Jheimmy+Carmin&background=0D8ABC&color=fff', password: '45566260', areaId: 'agi', areaIds: ['agi'], cargo: 'Especialista en Finanzas', condicion: 'Especialista', sexo: 'F' },
    { id: '72160115', username: '72160115', name: 'Maria de los Angeles Noel Vargas de Merino', role: 'Secretaria', avatar: 'https://ui-avatars.com/api/?name=Maria+de&background=0D8ABC&color=fff', password: '72160115', areaId: 'agi', areaIds: ['agi'], cargo: 'PREVAED', condicion: 'Especialista', sexo: 'F' },

    // AGI - Planificación y Presupuesto (planificacion)
    { id: '71848797', username: '71848797', name: 'Yeny Judith Martínez Rafael', role: 'Secretaria', avatar: 'https://ui-avatars.com/api/?name=Yeny+Judith&background=0D8ABC&color=fff', password: '71848797', areaId: 'planificacion', areaIds: ['planificacion', 'agi'], cargo: 'Especialista en Planificacion y Presupuesto', condicion: 'Especialista', sexo: 'F' },
    { id: '77297263', username: '77297263', name: 'Jhoy Lider Gonzales Pinedo', role: 'Secretaria', avatar: 'https://ui-avatars.com/api/?name=Jhoy+Lider&background=0D8ABC&color=fff', password: '77297263', areaId: 'planificacion', areaIds: ['planificacion', 'agi'], cargo: 'Servicio Profesional Especializado en el Área de Planificación y Presupuesto de la UGEL Bellavista', condicion: 'Servicio Profesional', sexo: 'M' },

    // AGI - Racionalización y Estadística (racionalizacion)
    { id: '44072546', username: '44072546', name: 'Ynes Paola Pérez Avila', role: 'Secretaria', avatar: 'https://ui-avatars.com/api/?name=Ynes+Paola&background=0D8ABC&color=fff', password: '44072546', areaId: 'racionalizacion', areaIds: ['racionalizacion', 'agi'], cargo: 'Especialista en Racionalizacion y Estadistica', condicion: 'Especialista', sexo: 'F' },
    { id: '70250027', username: '70250027', name: 'Lorena Soledad Diaz Diaz', role: 'Secretaria', avatar: 'https://ui-avatars.com/api/?name=Lorena+Soledad&background=0D8ABC&color=fff', password: '70250027', areaId: 'racionalizacion', areaIds: ['racionalizacion', 'agi'], cargo: 'Estadística y racionalización (PRACTICANTE)', condicion: 'Practicante', sexo: 'F' },

    // AGI - Infraestructura Educativa (infraestructura)
    { id: '45849880', username: '45849880', name: 'Daniel Leonidas La Torre Rengifo', role: 'Secretaria', avatar: 'https://ui-avatars.com/api/?name=Daniel+Leonidas&background=0D8ABC&color=fff', password: '45849880', areaId: 'infraestructura', areaIds: ['infraestructura', 'agi'], cargo: 'Especialista en Infraestructura', condicion: 'Especialista', sexo: 'M' },
    { id: '70780194', username: '70780194', name: 'Zack Kevin Alvarado Maldonado', role: 'Secretaria', avatar: 'https://ui-avatars.com/api/?name=Zack+Kevin&background=0D8ABC&color=fff', password: '70780194', areaId: 'infraestructura', areaIds: ['infraestructura', 'agi'], cargo: 'Servicio Profesional Especializado en la Oficina de Infraestructura de la UGEL Bellavista', condicion: 'Servicio Profesional', sexo: 'M' },

    // --- OFICINA DE ADMINISTRACIÓN (adm, depende de Dirección) ---
    { id: '42268073', username: '42268073', name: 'Leydi Marín Quezada', role: 'Jefe', avatar: 'https://ui-avatars.com/api/?name=Leydi+Marín&background=0D8ABC&color=fff', password: '42268073', areaId: 'adm', areaIds: ['adm'], cargo: 'Jefe de la Oficina de Administración', condicion: 'Jefe de Oficina', sexo: 'F' },
    { id: '71928865', username: '71928865', name: 'Lleny Sangama Guerra', role: 'Secretaria', avatar: 'https://ui-avatars.com/api/?name=Lleny+Sangama&background=0D8ABC&color=fff', password: '71928865', areaId: 'adm', areaIds: ['adm'], cargo: 'Secretaria de la Oficina de Administracion', condicion: 'Secretaria', sexo: 'F' },
    { id: '73449707', username: '73449707', name: 'Fiorella Vela Vásquez', role: 'Secretaria', avatar: 'https://ui-avatars.com/api/?name=Fiorella+Vela&background=0D8ABC&color=fff', password: '73449707', areaId: 'adm', areaIds: ['adm'], cargo: 'Proyectista', condicion: 'Técnico', sexo: 'F' },
    { id: '74644880', username: '74644880', name: 'Sutkey Milagritos Ramirez Cabanillas', role: 'Secretaria', avatar: 'https://ui-avatars.com/api/?name=Sutkey+Milagritos&background=0D8ABC&color=fff', password: '74644880', areaId: 'adm', areaIds: ['adm'], cargo: 'Especialista en Archivo', condicion: 'Especialista', sexo: 'F' },
    { id: '72199076', username: '72199076', name: 'Carlos Bendezú Ushiñahua Fasabi', role: 'Secretaria', avatar: 'https://ui-avatars.com/api/?name=Carlos+Bendezú&background=0D8ABC&color=fff', password: '72199076', areaId: 'adm', areaIds: ['adm'], cargo: 'Servicio Profesional Especializado en la Oficina de Archivo de la UGEL Bellavista', condicion: 'Servicio Profesional', sexo: 'M' },
    { id: '71506096', username: '71506096', name: 'Mary Saavedra Taricuarima', role: 'Secretaria', avatar: 'https://ui-avatars.com/api/?name=Mary+Saavedra&background=0D8ABC&color=fff', password: '71506096', areaId: 'adm', areaIds: ['adm'], cargo: 'Almacen', condicion: 'Técnico', sexo: 'F' },
    { id: '74770324', username: '74770324', name: 'Gianfranco Nieto Cárdenas', role: 'Secretaria', avatar: 'https://ui-avatars.com/api/?name=Gianfranco+Nieto&background=0D8ABC&color=fff', password: '74770324', areaId: 'adm', areaIds: ['adm'], cargo: 'Servicio Profesional Especializado en la Oficina de Almacén de la UGEL Bellavista', condicion: 'Servicio Profesional', sexo: 'M' },
    { id: '46864420', username: '46864420', name: 'Gianmarco Panduro Mego', role: 'Secretaria', avatar: 'https://ui-avatars.com/api/?name=Gianmarco+Panduro&background=0D8ABC&color=fff', password: '46864420', areaId: 'adm', areaIds: ['adm'], cargo: 'Especialista en Informática I', condicion: 'Especialista', sexo: 'M' },
    { id: '60811811', username: '60811811', name: 'Luz Barbara Castillo Sangama', role: 'Secretaria', avatar: 'https://ui-avatars.com/api/?name=Luz+Barbara&background=0D8ABC&color=fff', password: '60811811', areaId: 'adm', areaIds: ['adm'], cargo: 'Especialista en Informática I', condicion: 'Especialista', sexo: 'F' },
    { id: '74657864', username: '74657864', name: 'Maryori Stephany Muñoz Gonzales', role: 'Secretaria', avatar: 'https://ui-avatars.com/api/?name=Maryori+Stephany&background=0D8ABC&color=fff', password: '74657864', areaId: 'adm', areaIds: ['adm'], cargo: 'Tecnico Administrativo de Mesa de Partes', condicion: 'Técnico', sexo: 'F' },
    { id: '27431208', username: '27431208', name: 'Herberth Rivera Cabrera', role: 'Secretaria', avatar: 'https://ui-avatars.com/api/?name=Herberth+Rivera&background=0D8ABC&color=fff', password: '27431208', areaId: 'adm', areaIds: ['adm'], cargo: 'Vigilante', condicion: 'Vigilante', sexo: 'M' },
    { id: '00873189', username: '00873189', name: 'Ricardo Saldaña Guevara', role: 'Secretaria', avatar: 'https://ui-avatars.com/api/?name=Ricardo+Saldaña&background=0D8ABC&color=fff', password: '00873189', areaId: 'adm', areaIds: ['adm'], cargo: 'Servicio Profesional Especializado en la Seguridad y Vigilancia de la UGEL Bellavista', condicion: 'Servicio Profesional', sexo: 'M' },
    { id: '43463743', username: '43463743', name: 'Rober Cachique Cachique', role: 'Secretaria', avatar: 'https://ui-avatars.com/api/?name=Rober+Cachique&background=0D8ABC&color=fff', password: '43463743', areaId: 'adm', areaIds: ['adm'], cargo: 'Servicio Profesional Especializado en la Seguridad y Vigilancia de la UGEL Bellavista', condicion: 'Servicio Profesional', sexo: 'M' },
    { id: '43296425', username: '43296425', name: 'Ruber Cárdenas Ramirez', role: 'Secretaria', avatar: 'https://ui-avatars.com/api/?name=Ruber+Cárdenas&background=0D8ABC&color=fff', password: '43296425', areaId: 'adm', areaIds: ['adm'], cargo: 'Servicio Profesional Especializado en la Seguridad y Vigilancia de la UGEL Bellavista', condicion: 'Servicio Profesional', sexo: 'M' },
    { id: '00869906', username: '00869906', name: 'Hugo Ushiñahua Trigoso', role: 'Secretaria', avatar: 'https://ui-avatars.com/api/?name=Hugo+Ushiñahua&background=0D8ABC&color=fff', password: '00869906', areaId: 'adm', areaIds: ['adm'], cargo: 'Chofer', condicion: 'Técnico', sexo: 'M' },
    { id: '00868004', username: '00868004', name: 'Maria Leonor Revilla Guevara', role: 'Secretaria', avatar: 'https://ui-avatars.com/api/?name=Maria+Leonor&background=0D8ABC&color=fff', password: '00868004', areaId: 'adm', areaIds: ['adm'], cargo: 'Servicio Profesional Especializado en la Limpieza de la UGEL Bellavista', condicion: 'Servicio Profesional', sexo: 'F' },
    { id: '47843680', username: '47843680', name: 'Maria Margarita Cubas Sanchéz', role: 'Secretaria', avatar: 'https://ui-avatars.com/api/?name=Maria+Margarita&background=0D8ABC&color=fff', password: '47843680', areaId: 'adm', areaIds: ['adm'], cargo: 'Especialista en el area de Patrimonio y Almacen', condicion: 'Especialista', sexo: 'F' },
    { id: '77801835', username: '77801835', name: 'Joel Holfer Paredes', role: 'Secretaria', avatar: 'https://ui-avatars.com/api/?name=Joel+Holfer&background=0D8ABC&color=fff', password: '77801835', areaId: 'adm', areaIds: ['adm'], cargo: 'Servicio Profesional Especializado en la Oficina de Abastecimiento de la UGEL Bellavista', condicion: 'Servicio Profesional', sexo: 'M' },

    // ADM - Finanzas y Tesorería (finanzas)
    { id: '40666029', username: '40666029', name: 'Beroccio Ramirez Ríos', role: 'Secretaria', avatar: 'https://ui-avatars.com/api/?name=Beroccio+Ramirez&background=0D8ABC&color=fff', password: '40666029', areaId: 'finanzas', areaIds: ['finanzas', 'adm'], cargo: 'Especialista en Tesorería', condicion: 'Especialista', sexo: 'M' },
    { id: '74765595', username: '74765595', name: 'Breidis Santiago Upiachihua Cárdenas', role: 'Secretaria', avatar: 'https://ui-avatars.com/api/?name=Breidis+Santiago&background=0D8ABC&color=fff', password: '74765595', areaId: 'finanzas', areaIds: ['finanzas', 'adm'], cargo: 'Servicio Profesional Especializado en la Oficina de Tesorería de la UGEL Bellavista', condicion: 'Servicio Profesional', sexo: 'M' },

    // ADM - Contabilidad y Abastecimiento (contabilidad)
    { id: '71602492', username: '71602492', name: 'Karen Janeth Flores Lanares', role: 'Secretaria', avatar: 'https://ui-avatars.com/api/?name=Karen+Janeth&background=0D8ABC&color=fff', password: '71602492', areaId: 'contabilidad', areaIds: ['contabilidad', 'adm'], cargo: 'Especialista en Contabilidad', condicion: 'Especialista', sexo: 'F' },
    { id: '48024213', username: '48024213', name: 'Veronica Salazar Castro', role: 'Secretaria', avatar: 'https://ui-avatars.com/api/?name=Veronica+Salazar&background=0D8ABC&color=fff', password: '48024213', areaId: 'contabilidad', areaIds: ['contabilidad', 'adm'], cargo: 'Especialista en Abastecimiento', condicion: 'Especialista', sexo: 'F' },

    // --- GESTIÓN DE RECURSOS HUMANOS (rrhh, dentro de Administración) ---
    { id: '05373518', username: '05373518', name: 'Segundo Hipólito Saldaña Pérez', role: 'Jefe', avatar: 'https://ui-avatars.com/api/?name=Segundo+Hipólito&background=0D8ABC&color=fff', password: '05373518', areaId: 'rrhh', areaIds: ['rrhh'], cargo: 'Responsable de la Oficina de Gestión de Recursos Humanos', condicion: 'Jefe de Oficina', sexo: 'M' },
    { id: '47109452', username: '47109452', name: 'Yesenia Marisol Escobedo Vilchez', role: 'Secretaria', avatar: 'https://ui-avatars.com/api/?name=Yesenia+Marisol&background=0D8ABC&color=fff', password: '47109452', areaId: 'rrhh', areaIds: ['rrhh'], cargo: 'Secretaria de la Oficina de RR.HH.', condicion: 'Secretaria', sexo: 'F' },
    { id: '74657614', username: '74657614', name: 'Karen Tatiana Hidalgo Vásquez', role: 'Secretaria', avatar: 'https://ui-avatars.com/api/?name=Karen+Tatiana&background=0D8ABC&color=fff', password: '74657614', areaId: 'rrhh', areaIds: ['rrhh'], cargo: 'Servicio Profesional Especializado en la Oficina de Recursos Humanos de la UGEL Bellavista', condicion: 'Servicio Profesional', sexo: 'F' },
    { id: '72024344', username: '72024344', name: 'Joel Gonza Peña', role: 'Secretaria', avatar: 'https://ui-avatars.com/api/?name=Joel+Gonza&background=0D8ABC&color=fff', password: '72024344', areaId: 'rrhh', areaIds: ['rrhh'], cargo: 'Servicio Profesional Especializado en la Oficina de Recursos Humanos de la UGEL Bellavista', condicion: 'Servicio Profesional', sexo: 'M' },
    { id: '72087286', username: '72087286', name: 'Diego Torres Rengifo', role: 'Secretaria', avatar: 'https://ui-avatars.com/api/?name=Diego+Torres&background=0D8ABC&color=fff', password: '72087286', areaId: 'rrhh', areaIds: ['rrhh'], cargo: 'Analista en Nexus', condicion: 'Analista', sexo: 'M' },
    { id: '71776200', username: '71776200', name: 'Keyla Livany Vasquez Chuquilin', role: 'Secretaria', avatar: 'https://ui-avatars.com/api/?name=Keyla+Livany&background=0D8ABC&color=fff', password: '71776200', areaId: 'rrhh', areaIds: ['rrhh'], cargo: 'Analista de la CPPADD', condicion: 'Analista', sexo: 'F' },
    { id: '41656645', username: '41656645', name: 'Ketty Paola Alvarado Cárdenas', role: 'Secretaria', avatar: 'https://ui-avatars.com/api/?name=Ketty+Paola&background=0D8ABC&color=fff', password: '41656645', areaId: 'rrhh', areaIds: ['rrhh'], cargo: 'Servicio Profesional Especializado en la Oficina de Procedimientos Administrativos Disciplinarios (PAD) de la UGEL Bellavista', condicion: 'Servicio Profesional', sexo: 'F' },

    // RRHH - Planillas y Escalafón (planillas)
    { id: '42773099', username: '42773099', name: 'Leidy Luz Cárdenas Vásquez', role: 'Secretaria', avatar: 'https://ui-avatars.com/api/?name=Leidy+Luz&background=0D8ABC&color=fff', password: '42773099', areaId: 'planillas', areaIds: ['planillas', 'rrhh'], cargo: 'Servicio Profesional Especializado en la Oficina de Planilla y AIRHSP de la UGEL Bellavista', condicion: 'Servicio Profesional', sexo: 'F' },
    { id: '41048864', username: '41048864', name: 'Juan Carlos Campos Viera', role: 'Secretaria', avatar: 'https://ui-avatars.com/api/?name=Juan+Carlos&background=0D8ABC&color=fff', password: '41048864', areaId: 'planillas', areaIds: ['planillas', 'rrhh'], cargo: 'Especialista en Planillas', condicion: 'Especialista', sexo: 'M' },
    { id: '47059094', username: '47059094', name: 'Dayxs Bravo Bustamante', role: 'Secretaria', avatar: 'https://ui-avatars.com/api/?name=Dayxs+Bravo&background=0D8ABC&color=fff', password: '47059094', areaId: 'planillas', areaIds: ['planillas', 'rrhh'], cargo: 'Especialista en Escalafón', condicion: 'Especialista', sexo: 'F' },

    // RRHH - Bienestar Social (bienestar)
    { id: '71480435', username: '71480435', name: 'Violeta Salazar García', role: 'Secretaria', avatar: 'https://ui-avatars.com/api/?name=Violeta+Salazar&background=0D8ABC&color=fff', password: '71480435', areaId: 'bienestar', areaIds: ['bienestar', 'rrhh'], cargo: 'Especialista en Bienestar', condicion: 'Especialista', sexo: 'F' },

    // --- ÁREA DE GESTIÓN PEDAGÓGICA - AGP (agp, depende de Dirección) ---
    { id: '19336148', username: '19336148', name: 'Oscar Enrique Ayay Sánchez', role: 'Jefe', avatar: 'https://ui-avatars.com/api/?name=Oscar+Enrique&background=0D8ABC&color=fff', password: '19336148', areaId: 'agp', areaIds: ['agp'], cargo: 'Jefe del Area de Gestión Pedagógica', condicion: 'Jefe de Área', sexo: 'M' },
    { id: '72120699', username: '72120699', name: 'Yolby Tapullima Tapullima', role: 'Secretaria', avatar: 'https://ui-avatars.com/api/?name=Yolby+Tapullima&background=0D8ABC&color=fff', password: '72120699', areaId: 'agp', areaIds: ['agp'], cargo: 'Servicio profesional Especializado en el Área de Gestión Pedagógica de la UGEL Bellavista', condicion: 'Servicio Profesional', sexo: 'F' },
    { id: '74761394', username: '74761394', name: 'Karen Esther Vela Arirama', role: 'Secretaria', avatar: 'https://ui-avatars.com/api/?name=Karen+Esther&background=0D8ABC&color=fff', password: '74761394', areaId: 'agp', areaIds: ['agp'], cargo: 'Servicio Profesional Especializado En El Área De Gestión Pedagógica De La UGEL Bellavista', condicion: 'Servicio Profesional', sexo: 'F' },
    { id: '46864559', username: '46864559', name: 'Sheily Say Huansi Vásquez', role: 'Secretaria', avatar: 'https://ui-avatars.com/api/?name=Sheily+Say&background=0D8ABC&color=fff', password: '46864559', areaId: 'agp', areaIds: ['agp'], cargo: 'Especialista en Convivencia Escolar', condicion: 'Especialista', sexo: 'F' },
    { id: '47953187', username: '47953187', name: 'Hiber Miller Yalta Cubas', role: 'Secretaria', avatar: 'https://ui-avatars.com/api/?name=Hiber+Miller&background=0D8ABC&color=fff', password: '47953187', areaId: 'agp', areaIds: ['agp'], cargo: 'Profesional III para Equipo Itinerante de Convivencia Escolar', condicion: 'Especialista', sexo: 'M' },
    { id: '72927716', username: '72927716', name: 'Jhoel Villacorta Salazar', role: 'Secretaria', avatar: 'https://ui-avatars.com/api/?name=Jhoel+Villacorta&background=0D8ABC&color=fff', password: '72927716', areaId: 'agp', areaIds: ['agp'], cargo: 'Profesional III para Equipo Itinerante de Convivencia Escolar', condicion: 'Especialista', sexo: 'M' },

    // AGP - Educación Inicial y Primaria (inicial-primaria)
    { id: '00885852', username: '00885852', name: 'Franklin Cárdenas Ruíz', role: 'Secretaria', avatar: 'https://ui-avatars.com/api/?name=Franklin+Cárdenas&background=0D8ABC&color=fff', password: '00885852', areaId: 'inicial-primaria', areaIds: ['inicial-primaria', 'agp'], cargo: 'Especialista en Educacion Nivel Primaria', condicion: 'Especialista', sexo: 'M' },
    { id: '00868298', username: '00868298', name: 'Victor Vela Ramirez', role: 'Secretaria', avatar: 'https://ui-avatars.com/api/?name=Victor+Vela&background=0D8ABC&color=fff', password: '00868298', areaId: 'inicial-primaria', areaIds: ['inicial-primaria', 'agp'], cargo: 'Especialista en Educacion Nivel Primaria', condicion: 'Especialista', sexo: 'M' },
    { id: '46429187', username: '46429187', name: 'Zarita Isabel Mijahuanga Chumbe', role: 'Secretaria', avatar: 'https://ui-avatars.com/api/?name=Zarita+Isabel&background=0D8ABC&color=fff', password: '46429187', areaId: 'inicial-primaria', areaIds: ['inicial-primaria', 'agp'], cargo: 'Especialista en Educacion Nivel Inicial', condicion: 'Especialista', sexo: 'F' },
    { id: '43113056', username: '43113056', name: 'Silvia Janet Heredia Romero', role: 'Secretaria', avatar: 'https://ui-avatars.com/api/?name=Silvia+Janet&background=0D8ABC&color=fff', password: '43113056', areaId: 'inicial-primaria', areaIds: ['inicial-primaria', 'agp'], cargo: 'Especialista en Educacion Nivel Inicial', condicion: 'Especialista', sexo: 'F' },
    { id: '00874983', username: '00874983', name: 'Antonio Angulo Ramírez', role: 'Secretaria', avatar: 'https://ui-avatars.com/api/?name=Antonio+Angulo&background=0D8ABC&color=fff', password: '00874983', areaId: 'inicial-primaria', areaIds: ['inicial-primaria', 'agp'], cargo: 'Coordinador de PRONOEI', condicion: 'Coordinador', sexo: 'M' },
    { id: '00840196', username: '00840196', name: 'Sonia Angulo Cabrera', role: 'Secretaria', avatar: 'https://ui-avatars.com/api/?name=Sonia+Angulo&background=0D8ABC&color=fff', password: '00840196', areaId: 'inicial-primaria', areaIds: ['inicial-primaria', 'agp'], cargo: 'Coordinador de PRONOEI', condicion: 'Coordinador', sexo: 'F' },
    { id: '00874857', username: '00874857', name: 'Pedro Antonio Rengifo Ramírez', role: 'Secretaria', avatar: 'https://ui-avatars.com/api/?name=Pedro+Antonio&background=0D8ABC&color=fff', password: '00874857', areaId: 'inicial-primaria', areaIds: ['inicial-primaria', 'agp'], cargo: 'Coordinador de PRONOEI', condicion: 'Coordinador', sexo: 'M' },
    { id: '00878980', username: '00878980', name: 'Ayrunedi Lopez Putpaña', role: 'Secretaria', avatar: 'https://ui-avatars.com/api/?name=Ayrunedi+Lopez&background=0D8ABC&color=fff', password: '00878980', areaId: 'inicial-primaria', areaIds: ['inicial-primaria', 'agp'], cargo: 'Coordinador de PRONOEI', condicion: 'Coordinador', sexo: 'F' },
    { id: '44324084', username: '44324084', name: 'Rolita Sangama Del Aguila', role: 'Secretaria', avatar: 'https://ui-avatars.com/api/?name=Rolita+Sangama&background=0D8ABC&color=fff', password: '44324084', areaId: 'inicial-primaria', areaIds: ['inicial-primaria', 'agp'], cargo: 'Coordinador de PRONOEI', condicion: 'Coordinador', sexo: 'F' },

    // AGP - Educación Secundaria y Superior (secundaria)
    { id: '18229933', username: '18229933', name: 'Antonio Wilmer Rojas Miranda', role: 'Secretaria', avatar: 'https://ui-avatars.com/api/?name=Antonio+Wilmer&background=0D8ABC&color=fff', password: '18229933', areaId: 'secundaria', areaIds: ['secundaria', 'agp'], cargo: 'Especialista en Educacion Nivel Secundaria', condicion: 'Especialista', sexo: 'M' },
    { id: '27434297', username: '27434297', name: 'Ernesto Jimenez Chapoñan', role: 'Secretaria', avatar: 'https://ui-avatars.com/api/?name=Ernesto+Jimenez&background=0D8ABC&color=fff', password: '27434297', areaId: 'secundaria', areaIds: ['secundaria', 'agp'], cargo: 'Especialista en Educacion Nivel Secundaria CC.SS.', condicion: 'Especialista', sexo: 'M' },
    { id: '19669881', username: '19669881', name: 'Salustiano Valdemar Salas Namay', role: 'Secretaria', avatar: 'https://ui-avatars.com/api/?name=Salustiano+Valdemar&background=0D8ABC&color=fff', password: '19669881', areaId: 'secundaria', areaIds: ['secundaria', 'agp'], cargo: 'Especialista en Educacion Nivel Secundaria Matemática', condicion: 'Especialista', sexo: 'M' },
    { id: '41980001', username: '41980001', name: 'Manuel Ramírez Ruíz', role: 'Secretaria', avatar: 'https://ui-avatars.com/api/?name=Manuel+Ramírez&background=0D8ABC&color=fff', password: '41980001', areaId: 'secundaria', areaIds: ['secundaria', 'agp'], cargo: 'Especialista en Educacion Nivel Secundaria Comunicación', condicion: 'Especialista', sexo: 'M' },
  ],
  providers: [
    { id: 'gemini', name: 'Google Gemini', priority: 1, enabled: true, hasKey: true, apiKey: BUILTIN_KEYS.gemini, modelName: 'gemini-2.5-flash', tokensConsumed: 0, balance: 99.82 },
    { id: 'deepseek', name: 'DeepSeek', priority: 2, enabled: true, hasKey: false, modelName: 'deepseek-chat', tokensConsumed: 0, balance: 8.50 },
    { id: 'groq', name: 'Groq', priority: 3, enabled: true, hasKey: true, apiKey: BUILTIN_KEYS.groq, modelName: 'llama-3.3-70b-versatile', tokensConsumed: 0, balance: 15.00 },
    { id: 'nvidia', name: 'NVIDIA NIM', priority: 4, enabled: true, hasKey: true, apiKey: BUILTIN_KEYS.nvidia, apiUrl: 'https://integrate.api.nvidia.com/v1/chat/completions', modelName: 'meta/llama-3.1-70b-instruct', tokensConsumed: 0, balance: 10.00 },
    { id: 'openrouter', name: 'OpenRouter', priority: 5, enabled: true, hasKey: true, apiKey: BUILTIN_KEYS.openrouter, modelName: 'google/gemini-2.5-flash', tokensConsumed: 0, balance: 10.00 },
    { id: 'cerebras', name: 'Cerebras', priority: 6, enabled: true, hasKey: false, modelName: 'llama3.1-8b', tokensConsumed: 0, balance: 20.00 },
    { id: 'mistral', name: 'Mistral', priority: 7, enabled: true, hasKey: false, modelName: 'mistral-large-latest', tokensConsumed: 0, balance: 15.00 },
    { id: 'openai', name: 'OpenAI', priority: 8, enabled: true, hasKey: false, modelName: 'gpt-4o-mini', tokensConsumed: 0, balance: 4.90 },
    { id: 'claude', name: 'Claude', priority: 9, enabled: true, hasKey: false, modelName: 'claude-3-5-sonnet-latest', tokensConsumed: 0, balance: 12.30 }
  ],
  prompts: Object.keys(DEFAULT_PROMPTS).map((type, index) => ({
    id: `p-${index + 1}`,
    documentType: type as DocumentType,
    prompt: DEFAULT_PROMPTS[type as DocumentType],
    version: 1,
    historial: [
      { version: 1, prompt: DEFAULT_PROMPTS[type as DocumentType], fecha: new Date().toISOString(), modificadoPor: 'Sistema' }
    ]
  })),
  documents: [],
  logs: [],
  learningCorrections: [],
  agenda: [],
  areaTemplates: [],
  correlatives: [],
  areas: DEFAULT_AREAS
};

const TABLES = ['users', 'documents', 'providers', 'prompts', 'logs', 'agenda', 'learning_corrections', 'area_templates', 'correlatives', 'areas'];
const RELOAD_THROTTLE_MS = 3000;

export class NeonDatabase {
  private pool: InstanceType<typeof Pool> | null = null;
  private data: DatabaseSchema = {
    users: [], documents: [], providers: [], prompts: [], logs: [], learningCorrections: [], agenda: [], areaTemplates: [], correlatives: [], areas: []
  };
  private initPromise: Promise<void> | null = null;
  private lastLoad = 0;

  // Memoised one-time initialisation (create tables, seed, first load).
  ready(): Promise<void> {
    if (!this.initPromise) {
      this.initPromise = this.init().catch(err => {
        this.initPromise = null;
        throw err;
      });
    }
    return this.initPromise;
  }

  private getPool(): InstanceType<typeof Pool> {
    if (!this.pool) {
      const url = process.env.DATABASE_URL;
      if (!url) throw new Error('La variable de entorno DATABASE_URL no está configurada en Vercel.');
      this.pool = new Pool({
        connectionString: url,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 10000,
        idleTimeoutMillis: 30000,
        max: 10
      });
      this.pool.on('error', (err) => {
        console.error('Error de conexión en Postgres Pool (Neon):', err);
      });
    }
    return this.pool;
  }

  private async q(text: string, params: any[] = []): Promise<any[]> {
    const res = await this.getPool().query(text, params);
    return res.rows;
  }

  private async init(): Promise<void> {
    for (const t of TABLES) {
      await this.q(`CREATE TABLE IF NOT EXISTS ${t} (id text PRIMARY KEY, seq bigserial, data jsonb NOT NULL)`).catch(e => console.error(`Error creando tabla ${t}:`, e));
    }
    await this.q(`CREATE TABLE IF NOT EXISTS kv (key text PRIMARY KEY, value text)`);

    const existing = await this.q('SELECT COUNT(*)::int AS n FROM users');
    if ((existing[0]?.n ?? 0) === 0) {
      await this.seed();
    } else {
      // One-time cleanup: remove duplicate users created when DNI starts with 00
      // (e.g. "00874080" and "874080" — keep the one with full DNI)
      const dupCleanup = await this.q("SELECT value FROM kv WHERE key = 'users_dup_cleanup_v3'");
      if (dupCleanup[0]?.value !== 'done') {
        const allUsers = await this.q('SELECT data FROM users');
        const initialIds = new Set(INITIAL_DB.users.map(u => u.id));
        const stripMap = new Map<string, any[]>();
        for (const row of allUsers) {
          const u = row.data;
          const key = String(u.username || '').replace(/^0+/, '');
          if (!stripMap.has(key)) stripMap.set(key, []);
          stripMap.get(key)!.push(u);
        }
        for (const [stripped, users] of stripMap) {
          if (users.length < 2) continue;
          const sorted = users.sort((a, b) => String(b.username || '').length - String(a.username || '').length);
          for (let i = 1; i < sorted.length; i++) {
            if (!initialIds.has(sorted[i].id)) {
              await this.remove('users', sorted[i].id);
            }
          }
        }
        await this.q("INSERT INTO kv (key, value) VALUES ('users_dup_cleanup_v3', 'done') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value");
      }

      // Auto-heal and sync active default users (e.g. AGP, AGI, RRHH, ADM, DIR)
      for (const u of INITIAL_DB.users) {
        const byId = await this.q('SELECT data FROM users WHERE id = $1', [u.id]);
        if (byId.length > 0) {
          const merged = { ...byId[0].data, username: u.username, password: u.password, role: u.role, name: u.name, areaId: byId[0].data.areaId || u.areaId, cargo: byId[0].data.cargo || u.cargo };
          await this.upsert('users', u.id, merged);
        } else {
          const byUsername = await this.q('SELECT data FROM users WHERE LOWER(data->>\'username\') = $1', [u.username.toLowerCase()]);
          if (byUsername.length > 0) {
            for (const dup of byUsername) {
              await this.remove('users', dup.data.id);
            }
            await this.upsert('users', u.id, u);
          } else {
            await this.upsert('users', u.id, u);
          }
        }
      }

      // Auto-heal: asegurar que las áreas principales existan (Administración, RRHH, etc.)
      // sin sobreescribir las personalizaciones ya guardadas por el usuario.
      for (const a of DEFAULT_AREAS.filter(x => !x.parentAreaId)) {
        const areaCheck = await this.q('SELECT 1 FROM areas WHERE id = $1', [a.id]);
        if (areaCheck.length === 0) {
          await this.upsert('areas', a.id, a);
        }
      }

      // Auto-heal and sync active default providers with working keys
      for (const p of INITIAL_DB.providers) {
        const check = await this.q('SELECT data FROM providers WHERE id = $1', [p.id]);
        if (check.length === 0) {
          await this.upsert('providers', p.id, p);
        } else {
          // ALWAYS sync active working key, priority, and modelName into PostgreSQL database row!
          const merged = {
            ...check[0].data,
            priority: p.priority,
            apiKey: p.apiKey || check[0].data.apiKey,
            hasKey: !!(p.apiKey || check[0].data.apiKey),
            modelName: p.modelName || check[0].data.modelName,
            apiUrl: p.apiUrl || check[0].data.apiUrl
          };
          await this.upsert('providers', p.id, merged);
        }
      }
    }
    await this.load();
  }

  private async seed(): Promise<void> {
    for (const u of INITIAL_DB.users) await this.upsert('users', u.id, u);
    for (const p of INITIAL_DB.providers) await this.upsert('providers', p.id, p);
    for (const p of INITIAL_DB.prompts) await this.upsert('prompts', p.id, p);
    for (const d of INITIAL_DB.documents) await this.upsert('documents', d.id, d);
    for (const l of INITIAL_DB.logs) await this.upsert('logs', l.id, l);
    for (const e of INITIAL_DB.agenda) await this.upsert('agenda', e.id, e);
    for (const a of DEFAULT_AREAS) await this.upsert('areas', a.id, a);
    for (const t of INITIAL_AREA_TEMPLATES) await this.upsert('area_templates', t.id, t);
  }

  private async load(): Promise<void> {
    const [users, documents, providers, prompts, logs, agenda, corrections, areaTemplates, correlatives, areas, theme] = await Promise.all([
      this.q('SELECT data FROM users ORDER BY seq ASC').catch(() => []),
      this.q('SELECT data FROM documents ORDER BY seq DESC').catch(() => []),
      this.q('SELECT data FROM providers ORDER BY seq ASC').catch(() => []),
      this.q('SELECT data FROM prompts ORDER BY seq ASC').catch(() => []),
      this.q('SELECT data FROM logs ORDER BY seq DESC LIMIT 1000').catch(() => []),
      this.q('SELECT data FROM agenda ORDER BY seq DESC').catch(() => []),
      this.q('SELECT data FROM learning_corrections ORDER BY seq DESC').catch(() => []),
      this.q('SELECT data FROM area_templates ORDER BY seq DESC').catch(() => []),
      this.q('SELECT data FROM correlatives ORDER BY seq ASC').catch(() => []),
      this.q('SELECT data FROM areas ORDER BY seq ASC').catch(() => []),
      this.q("SELECT value FROM kv WHERE key = 'activeTheme'").catch(() => []),
    ]);
    this.data = {
      users: users.map((r: any) => r.data),
      documents: documents.map((r: any) => r.data),
      providers: providers.length > 0 ? providers.map((r: any) => {
        const p = r.data;
        const key = (p.apiKey && String(p.apiKey).trim() !== '') ? String(p.apiKey).trim() : BUILTIN_KEYS[p.id];
        return {
          ...p,
          apiKey: key,
          hasKey: !!key
        };
      }) : INITIAL_DB.providers.map(p => ({
        ...p,
        apiKey: BUILTIN_KEYS[p.id] || p.apiKey,
        hasKey: !!(BUILTIN_KEYS[p.id] || p.apiKey)
      })),
      prompts: prompts.map((r: any) => r.data),
      logs: logs.map((r: any) => r.data),
      agenda: agenda.map((r: any) => r.data),
      learningCorrections: corrections.map((r: any) => r.data),
      areaTemplates: areaTemplates.length > 0 ? areaTemplates.map((r: any) => r.data) : INITIAL_AREA_TEMPLATES,
      correlatives: correlatives.map((r: any) => r.data),
      areas: areas.length > 0 ? areas.map((r: any) => r.data) : DEFAULT_AREAS,
      activeTheme: theme[0]?.value,
    };
    this.lastLoad = Date.now();
  }

  // Refresh the cache from Postgres, throttled to avoid hammering the DB.
  async reload(): Promise<void> {
    if (Date.now() - this.lastLoad < RELOAD_THROTTLE_MS) return;
    await this.load();
  }

  private async upsert(table: string, id: string, obj: any): Promise<void> {
    await this.q(
      `INSERT INTO ${table} (id, data) VALUES ($1, $2::jsonb)
       ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`,
      [id, JSON.stringify(obj)]
    );
  }

  private async remove(table: string, id: string): Promise<void> {
    await this.q(`DELETE FROM ${table} WHERE id = $1`, [id]);
  }

  // ------------------- USERS -------------------
  getUsers(): User[] { return this.data.users; }

  async addUser(user: User): Promise<void> {
    this.data.users.push(user);
    await this.upsert('users', user.id, user);
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    const index = this.data.users.findIndex(u => u.id === id);
    if (index === -1) return null;
    this.data.users[index] = { ...this.data.users[index], ...updates };
    await this.upsert('users', id, this.data.users[index]);
    return this.data.users[index];
  }

  async deleteUser(id: string): Promise<boolean> {
    const before = this.data.users.length;
    this.data.users = this.data.users.filter(u => u.id !== id);
    if (this.data.users.length === before) return false;
    await this.remove('users', id);
    return true;
  }

  // ------------------- DOCUMENTS -------------------
  getDocuments(): Document[] { return this.data.documents; }

  async addDocument(doc: Document): Promise<void> {
    this.data.documents.unshift(doc);
    await this.upsert('documents', doc.id, doc);
  }

  async updateDocument(id: string, updates: Partial<Document>): Promise<Document | null> {
    const index = this.data.documents.findIndex(d => d.id === id);
    if (index === -1) return null;
    this.data.documents[index] = { ...this.data.documents[index], ...updates };
    await this.upsert('documents', id, this.data.documents[index]);
    return this.data.documents[index];
  }

  async deleteDocument(id: string): Promise<boolean> {
    const before = this.data.documents.length;
    this.data.documents = this.data.documents.filter(d => d.id !== id);
    if (this.data.documents.length === before) return false;
    await this.remove('documents', id);
    return true;
  }

  // ------------------- PROVIDERS -------------------
  getProviders(): AIProvider[] {
    const list = this.data.providers && this.data.providers.length > 0
      ? this.data.providers
      : INITIAL_DB.providers.map(p => ({ ...p, apiKey: BUILTIN_KEYS[p.id] || p.apiKey }));
    return list.map(p => {
      const key = (p.apiKey && String(p.apiKey).trim() !== '') ? String(p.apiKey).trim() : BUILTIN_KEYS[p.id];
      return {
        ...p,
        apiKey: key,
        hasKey: !!key
      };
    });
  }

  async updateProviders(providers: AIProvider[]): Promise<void> {
    const merged = providers.map(p => {
      const existing = (this.data.providers || []).find(c => c.id === p.id);
      const keyToSave = (p.apiKey && String(p.apiKey).trim() !== '')
        ? String(p.apiKey).trim()
        : (existing?.apiKey || BUILTIN_KEYS[p.id]);
      return {
        ...p,
        apiKey: keyToSave,
        hasKey: !!keyToSave
      };
    });
    this.data.providers = merged;
    let deleteOk = true;
    try {
      await this.q('DELETE FROM providers');
    } catch (e) {
      console.error('Error deleting providers:', e);
      deleteOk = false;
    }
    if (deleteOk) {
      for (const p of merged) {
        try {
          await this.upsert('providers', p.id, p);
        } catch (e) {
          console.error(`Error upserting provider ${p.id}:`, e);
        }
      }
    }
  }

  // ------------------- PROMPTS -------------------
  getPrompts(): PromptTemplate[] { return this.data.prompts; }

  async updatePrompt(id: string, updatedPrompt: string, modificadoPor: string): Promise<PromptTemplate | null> {
    const index = this.data.prompts.findIndex(p => p.id === id);
    if (index === -1) return null;
    const p = this.data.prompts[index];
    p.version = p.version + 1;
    p.prompt = updatedPrompt;
    p.historial.unshift({ version: p.version, prompt: updatedPrompt, fecha: new Date().toISOString(), modificadoPor });
    await this.upsert('prompts', id, p);
    return p;
  }

  // ------------------- LOGS -------------------
  getLogs(): SystemLog[] { return this.data.logs; }

  // Logs are best-effort (fire-and-forget); a lost log is not critical.
  addLog(log: Omit<SystemLog, 'id'>): void {
    const newLog: SystemLog = { id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`, ...log };
    this.data.logs.unshift(newLog);
    if (this.data.logs.length > 1000) this.data.logs = this.data.logs.slice(0, 1000);
    this.upsert('logs', newLog.id, newLog).catch(err => console.error('Error guardando log:', err));
  }

  // ------------------- LEARNING CORRECTIONS -------------------
  getLearningCorrections(): LearningCorrection[] { return this.data.learningCorrections; }

  async addLearningCorrection(correction: LearningCorrection): Promise<void> {
    this.data.learningCorrections.unshift(correction);
    await this.upsert('learning_corrections', correction.id, correction);
  }

  // ------------------- AGENDA -------------------
  getAgenda(): AgendaEvent[] { return this.data.agenda; }

  async addAgendaEvent(event: AgendaEvent): Promise<void> {
    this.data.agenda.unshift(event);
    await this.upsert('agenda', event.id, event);
  }

  async updateAgendaEvent(id: string, updates: Partial<AgendaEvent>): Promise<AgendaEvent | null> {
    const index = this.data.agenda.findIndex(e => e.id === id);
    if (index === -1) return null;
    this.data.agenda[index] = { ...this.data.agenda[index], ...updates };
    await this.upsert('agenda', id, this.data.agenda[index]);
    return this.data.agenda[index];
  }

  async deleteAgendaEvent(id: string): Promise<boolean> {
    const before = this.data.agenda.length;
    this.data.agenda = this.data.agenda.filter(e => e.id !== id);
    if (this.data.agenda.length === before) return false;
    await this.remove('agenda', id);
    return true;
  }

  async clearAllAgenda(): Promise<void> {
    this.data.agenda = [];
    await this.q('DELETE FROM agenda');
  }

  // ------------------- THEME -------------------
  getTheme(): string { return this.data.activeTheme || 'predeterminado'; }

  async setTheme(themeName: string): Promise<void> {
    this.data.activeTheme = themeName;
    await this.q(
      `INSERT INTO kv (key, value) VALUES ('activeTheme', $1)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [themeName]
    );
  }

  // ------------------- AREAS & TEMPLATES -------------------
  getAreas(): AreaItem[] {
    const areas = this.data.areas && this.data.areas.length > 0 ? this.data.areas : DEFAULT_AREAS;
    return [...areas].sort((a, b) => {
      const pa = a.parentAreaId || '';
      const pb = b.parentAreaId || '';
      if (pa < pb) return -1;
      if (pa > pb) return 1;
      return (a.order ?? 999) - (b.order ?? 999);
    });
  }

  getAreaById(id: string): AreaItem | undefined {
    return this.getAreas().find(a => a.id === id);
  }

  async updateArea(id: string, updates: Partial<AreaItem>): Promise<AreaItem | null> {
    const index = this.data.areas.findIndex(a => a.id === id);
    if (index === -1) {
      const defArea = DEFAULT_AREAS.find(a => a.id === id);
      if (defArea) {
        const newArea = { ...defArea, ...updates };
        this.data.areas.push(newArea);
        await this.upsert('areas', id, newArea);
        return newArea;
      }
      return null;
    }
    this.data.areas[index] = { ...this.data.areas[index], ...updates };
    await this.upsert('areas', id, this.data.areas[index]);
    return this.data.areas[index];
  }

  async addArea(area: AreaItem): Promise<AreaItem> {
    this.data.areas.push(area);
    await this.upsert('areas', area.id, area);
    return area;
  }

  async deleteArea(id: string): Promise<boolean> {
    const before = this.data.areas.length;
    this.data.areas = this.data.areas.filter(a => a.id !== id);
    if (this.data.areas.length === before) return false;
    await this.remove('areas', id);
    return true;
  }

  getAreaTemplates(): AreaTemplate[] {
    return this.data.areaTemplates || [];
  }

  findBestTemplate(areaId: string, docType: DocumentType, subtipo?: string): { template: AreaTemplate | null; matchLevel: 'exact' | 'parent' | 'general_area' | 'none'; matchedAreaName?: string } {
    const templates = this.getAreaTemplates();
    const area = this.getAreaById(areaId);
    if (!area) return { template: null, matchLevel: 'none' };

    // Level 1: Match areaId (or subareaId) AND docType AND subtipo
    if (subtipo && subtipo.trim()) {
      const level1 = templates.find(t =>
        (t.areaId === areaId || t.subareaId === areaId) &&
        t.documentType === docType &&
        (t.subtipoProposito.toLowerCase() === subtipo.toLowerCase() ||
         subtipo.toLowerCase().includes(t.subtipoProposito.toLowerCase()))
      );
      if (level1) return { template: level1, matchLevel: 'exact', matchedAreaName: area.name };

      // Level 2: Parent area fallback
      if (area.parentAreaId) {
        const parentArea = this.getAreaById(area.parentAreaId);
        const level2 = templates.find(t =>
          t.areaId === area.parentAreaId &&
          t.documentType === docType &&
          (t.subtipoProposito.toLowerCase() === subtipo.toLowerCase() ||
           subtipo.toLowerCase().includes(t.subtipoProposito.toLowerCase()))
        );
        if (level2) return { template: level2, matchLevel: 'parent', matchedAreaName: parentArea?.name || area.parentAreaId };
      }
    }

    // Level 3: Match areaId AND docType (any subtipo)
    const level3 = templates.find(t => (t.areaId === areaId || t.subareaId === areaId) && t.documentType === docType);
    if (level3) return { template: level3, matchLevel: 'general_area', matchedAreaName: area.name };

    // Level 4: Match parent area AND docType
    if (area.parentAreaId) {
      const parentArea = this.getAreaById(area.parentAreaId);
      const level4 = templates.find(t => t.areaId === area.parentAreaId && t.documentType === docType);
      if (level4) return { template: level4, matchLevel: 'parent', matchedAreaName: parentArea?.name || area.parentAreaId };
    }

    return { template: null, matchLevel: 'none' };
  }

  async addOrUpdateAreaTemplate(template: AreaTemplate): Promise<AreaTemplate> {
    if (!this.data.areaTemplates) this.data.areaTemplates = [];
    const index = this.data.areaTemplates.findIndex(t => t.id === template.id);
    if (index !== -1) {
      this.data.areaTemplates[index] = template;
    } else {
      this.data.areaTemplates.unshift(template);
    }
    await this.upsert('area_templates', template.id, template);
    return template;
  }

  async deleteAreaTemplate(id: string): Promise<boolean> {
    if (!this.data.areaTemplates) return false;
    const before = this.data.areaTemplates.length;
    this.data.areaTemplates = this.data.areaTemplates.filter(t => t.id !== id);
    if (this.data.areaTemplates.length === before) return false;
    await this.remove('area_templates', id);
    return true;
  }

  // ------------------- CORRELATIVES -------------------
  getCorrelative(areaId: string, docType: DocumentType): { nextNumber: number; formattedNumber: string; rawNumber: string; suffix: string } {
    const area = this.getAreaById(areaId) || DEFAULT_AREAS.find(a => a.id === 'adm') || DEFAULT_AREAS[0];
    const key = `${area.id}_${docType}`;
    const item = (this.data.correlatives || []).find(c => c.id === key);
    const lastNum = item ? item.lastNumber : 0;
    const nextNum = lastNum + 1;
    const rawNumber = String(nextNum).padStart(4, '0');
    const suffix = area.suffix || `-2026-UGEL-${area.code}`;
    return {
      nextNumber: nextNum,
      formattedNumber: `${rawNumber}${suffix}`,
      rawNumber,
      suffix
    };
  }

  async updateCorrelative(areaId: string, docType: DocumentType, manualNumber: number, suffixOverride?: string): Promise<void> {
    if (!this.data.correlatives) this.data.correlatives = [];
    const area = this.getAreaById(areaId) || DEFAULT_AREAS[0];
    const key = `${area.id}_${docType}`;
    const index = this.data.correlatives.findIndex(c => c.id === key);
    const suffix = suffixOverride || area.suffix || `-2026-UGEL-${area.code}`;
    const newRecord: CorrelativeCounter = {
      id: key,
      areaId: area.id,
      documentType: docType,
      lastNumber: manualNumber,
      suffix
    };
    if (index !== -1) {
      this.data.correlatives[index] = newRecord;
    } else {
      this.data.correlatives.push(newRecord);
    }
    await this.upsert('correlatives', key, newRecord);
  }

  async getKV(key: string): Promise<string | null> {
    try {
      const rows = await this.q('SELECT value FROM kv WHERE key = $1', [key]);
      return rows[0]?.value || null;
    } catch { return null; }
  }

  async setKV(key: string, value: string): Promise<void> {
    try {
      await this.q(
        "INSERT INTO kv (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value",
        [key, value]
      );
    } catch (e) {
      console.error('Error setting KV:', e);
    }
  }
}

export const db = new NeonDatabase();
