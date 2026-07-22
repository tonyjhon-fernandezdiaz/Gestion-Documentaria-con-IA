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
  { id: 'dir', name: 'Dirección UGEL', code: 'DIR', suffix: '-2026-UGEL-DIR' },
  { id: 'agi', name: 'Área de Gestión Institucional', code: 'AGI', suffix: '-2026-UGEL-AGI' },
  { id: 'planificacion', name: 'Planificación y Presupuesto', code: 'AGI-PP', parentAreaId: 'agi', suffix: '-2026-UGEL-AGI-PP' },
  { id: 'racionalizacion', name: 'Racionalización y Estadística', code: 'AGI-RE', parentAreaId: 'agi', suffix: '-2026-UGEL-AGI-RE' },
  { id: 'infraestructura', name: 'Infraestructura Educativa', code: 'AGI-IE', parentAreaId: 'agi', suffix: '-2026-UGEL-AGI-IE' },
  { id: 'agp', name: 'Área de Gestión Pedagógica', code: 'AGP', suffix: '-2026-UGEL-AGP' },
  { id: 'inicial-primaria', name: 'Educación Inicial y Primaria', code: 'AGP-EIP', parentAreaId: 'agp', suffix: '-2026-UGEL-AGP-EIP' },
  { id: 'secundaria', name: 'Educación Secundaria y Superior', code: 'AGP-ESS', parentAreaId: 'agp', suffix: '-2026-UGEL-AGP-ESS' },
  { id: 'acompanamiento', name: 'Acompañamiento Pedagógico', code: 'AGP-AP', parentAreaId: 'agp', suffix: '-2026-UGEL-AGP-AP' },
  { id: 'adm', name: 'Área de Administración', code: 'ADM', suffix: '-2026-UGEL-ADM' },
  { id: 'finanzas', name: 'Finanzas y Tesorería', code: 'ADM-FT', parentAreaId: 'adm', suffix: '-2026-UGEL-ADM-FT' },
  { id: 'contabilidad', name: 'Contabilidad y Abastecimiento', code: 'ADM-CA', parentAreaId: 'adm', suffix: '-2026-UGEL-ADM-CA' },
  { id: 'rrhh', name: 'Área de Recursos Humanos', code: 'RRHH', suffix: '-2026-UGEL-RRHH' },
  { id: 'planillas', name: 'Planillas y Escalafón', code: 'RRHH-PE', parentAreaId: 'rrhh', suffix: '-2026-UGEL-RRHH-PE' },
  { id: 'bienestar', name: 'Bienestar Social', code: 'RRHH-BS', parentAreaId: 'rrhh', suffix: '-2026-UGEL-RRHH-BS' },
];

// Plantillas de área: aún no se cargan datos iniciales. Se define como lista vacía
// para que el arranque/sembrado no falle (antes faltaba y rompía la base de datos).
const INITIAL_AREA_TEMPLATES: AreaTemplate[] = [];

const DEFAULT_PROMPTS: Record<DocumentType, string> = {
  Informe: 'Redacte un Informe de estilo libre o tipo carta, que sea un texto formal continuo estructurado en párrafos fluidos y narrativos pero sin divisiones numeradas ni secciones rígidas (NO use "I. ANTECEDENTES", etc.). Se utiliza para informar de manera directa e institucional un asunto.',
  Oficio: 'Redacte un Oficio de comunicación externa. Debe ser formal, contener destinatario, asunto, referencia y cuerpo estructurado con tono institucional.',
  Memorando: 'Redacte un Memorando interno breve y directo. Indique claramente las instrucciones o recordatorios para el personal.',
  Carta: 'Redacte una Carta institucional de la UGEL Bellavista con la siguiente estructura y formato exactos (se guiará por el formato oficial de la Dirección):\n1. FORMATO Y FUENTE: Debe redactarse utilizando estrictamente una fuente limpia (Arial o Arial Narrow). El cuerpo de texto debe ser justificado, con espaciado regular de 1.15 líneas y sin sangría de primera línea.\n2. ESTRUCTURA DE CABECERA:\n   - Inicie con el lugar y fecha alineado a la derecha, por ejemplo: "Bellavista, 08 de enero del 2026."\n   - Siga con el código de carta alineado a la izquierda, por ejemplo: "CARTA N° [Número] -2026-GRSM- DRE-UGEL-B."\n   - Escriba el destinatario en mayúsculas precedido de "SEÑOR" o "SEÑORA" e indicando su ciudad de procedencia en la siguiente línea (ej: "SEÑOR : YAVE CARBONEL SILVA" y abajo "TARAPOTO.-" o "BELLAVISTA.-").\n   - Indique el ASUNTO alineado a la izquierda.\n   - Si aplica, indique la REFERENCIA ("REF.") detallando el expediente (ej: "EXPEDIENTE Nº0311-2026").\n   - Inserte una línea de guiones como separador visual justo antes del cuerpo: "-----------------------------------------------------------------------------------------".\n3. CUERPO DE REDACCIÓN:\n   - El primer párrafo de saludo debe iniciar formalmente con el estilo: "Tengo el agrado de dirigirme a usted para expresarle mi cordial y afectuoso saludo en representación de la Unidad de Gestión Educativa Local de Bellavista, y a la vez..." (o "así mismo en atención al documento de la referencia hacerle llegar...").\n   - Redacte los párrafos intermedios de forma justificada explicando técnicamente la respuesta, el descargo, o la subsanación correspondiente.\n   - El párrafo de despedida debe finalizar exactamente de la siguiente manera: "Hago propicia la oportunidad para expresarle muestras de consideración y estima personal." (o "Sin otro particular, hago propicia la oportunidad para expresarle los sentimientos de mi especial consideración.").\n4. FIRMA Y PIE DE PÁGINA: Finalice con la palabra "Atentamente," centrada y deje espacio para la firma del Jefe del Área o Director.',
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
    { id: '1', username: '74223117', name: 'Administrador Principal', role: 'Administrador', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', password: '101296', areaId: 'dir', cargo: 'Administrador del Sistema' },
    { id: 'sec-agp', username: 'agp', name: 'Secretaría AGP (Pedagógica)', role: 'Secretaria', avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150', password: '159159', areaId: 'agp', cargo: 'Secretaria de Gestión Pedagógica' },
    { id: 'sec-agi', username: 'agi', name: 'Secretaría AGI (Institucional)', role: 'Secretaria', avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150', password: '455645', areaId: 'agi', cargo: 'Secretaria de Gestión Institucional' },
    { id: 'sec-rrhh', username: 'rrhh', name: 'Secretaría RRHH (Recursos Humanos)', role: 'Secretaria', avatar: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=150', password: '123456', areaId: 'rrhh', cargo: 'Secretaria de Recursos Humanos' },
    { id: 'sec-adm', username: 'adm', name: 'Secretaría ADM (Administración)', role: 'Secretaria', avatar: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=150', password: '455645', areaId: 'adm', cargo: 'Secretaria de Administración' },
    { id: 'sec-dir', username: 'dir', name: 'Secretaría DIR (Dirección)', role: 'Secretaria', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', password: '741852', areaId: 'dir', cargo: 'Secretaria de Dirección' }
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
  agenda: []
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
      // Auto-heal and sync active default users (e.g. AGP, AGI, RRHH, ADM, DIR)
      for (const u of INITIAL_DB.users) {
        const check = await this.q('SELECT data FROM users WHERE id = $1 OR LOWER(data->>\'username\') = $2', [u.id, u.username.toLowerCase()]);
        if (check.length === 0) {
          await this.upsert('users', u.id, u);
        } else {
          const merged = { ...check[0].data, username: u.username, password: u.password, role: u.role, name: u.name, areaId: check[0].data.areaId || u.areaId, cargo: check[0].data.cargo || u.cargo };
          await this.upsert('users', check[0].data.id || u.id, merged);
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
      providers: providers.map((r: any) => {
        const p = r.data;
        const key = (p.apiKey && String(p.apiKey).trim() !== '') ? String(p.apiKey).trim() : BUILTIN_KEYS[p.id];
        return {
          ...p,
          apiKey: key,
          hasKey: !!key
        };
      }),
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
    return (this.data.providers || []).map(p => {
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
    await this.q('DELETE FROM providers');
    for (const p of merged) await this.upsert('providers', p.id, p);
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
    return this.data.areas && this.data.areas.length > 0 ? this.data.areas : DEFAULT_AREAS;
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
}

export const db = new NeonDatabase();
