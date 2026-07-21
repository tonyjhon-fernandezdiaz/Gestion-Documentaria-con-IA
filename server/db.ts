import pkg from 'pg';
const { Pool } = pkg;
import { User, Document, AIProvider, PromptTemplate, SystemLog, DocumentType, LearningCorrection, AgendaEvent } from '../src/types.js';

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
  activeTheme?: string;
}

const DEFAULT_PROMPTS: Record<DocumentType, string> = {
  Informe: 'Redacte un Informe de estilo libre o tipo carta, que sea un texto formal continuo estructurado en párrafos fluidos y narrativos pero sin divisiones numeradas ni secciones rígidas (NO use "I. ANTECEDENTES", etc.). Se utiliza para informar de manera directa e institucional un asunto.',
  Oficio: 'Redacte un Oficio de comunicación externa. Debe ser formal, contener destinatario, asunto, referencia y cuerpo estructurado con tono institucional.',
  Memorando: 'Redacte un Memorando interno breve y directo. Indique claramente las instrucciones o recordatorios para el personal.',
  Carta: 'Redacte una Carta comercial o de representación formal, manteniendo un tono educado, profesional y cortés.',
  Proveído: 'Redacte un Proveído de trámite rápido de derivación o derivación con instrucciones para otra área institucional.',
  Resolución: 'Redacte una Resolución administrativa estructurada con los vistos, considerandos (sección legal y justificación) y la parte resolutiva (artículos).',
  Acta: 'Redacte un Acta de sesión o reunión formal que registre los asistentes, la agenda tratada, los debates y los acuerdos adoptados.',
  Constancia: 'Redacte una Constancia oficial certificando un hecho, situación académica, laboral o de servicios de un solicitante.',
  'Informe Técnico': 'Redacte un Informe Técnico exhaustivo y estructurado de manera rigurosa. Debe incluir obligatoriamente las secciones oficiales en mayúsculas y negrita numeradas con números romanos: "I. ANTECEDENTES", "II. ANÁLISIS", "III. CONCLUSIONES" y "IV. RECOMENDACIONES", detallando minuciosamente cada punto con base técnica y legal.',
  Solicitud: 'Redacte una Solicitud formal de ciudadano o administrado dirigida a la autoridad competente con fundamentos de hecho y de derecho.',
  Dictamen: 'Redacte un Dictamen legal o especializado que evalúe jurídicamente la procedencia o improcedencia de un asunto en consulta.'
};

const INITIAL_DB: DatabaseSchema = {
  users: [
    { id: '1', username: '74223117', name: 'Administrador Principal', role: 'Administrador', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', password: '101296' }
  ],
  providers: [
    { id: 'groq', name: 'Groq', priority: 1, enabled: true, hasKey: false, modelName: 'llama-3.3-70b-versatile', tokensConsumed: 0, balance: 15.00 },
    { id: 'gemini', name: 'Google Gemini', priority: 2, enabled: true, hasKey: true, modelName: 'gemini-3.5-flash', tokensConsumed: 0, balance: 99.82 },
    { id: 'openrouter', name: 'OpenRouter', priority: 3, enabled: true, hasKey: false, modelName: 'google/gemini-2.5-flash', tokensConsumed: 0, balance: 10.00 },
    { id: 'cerebras', name: 'Cerebras', priority: 4, enabled: true, hasKey: false, modelName: 'llama3.1-8b', tokensConsumed: 0, balance: 20.00 },
    { id: 'deepseek', name: 'DeepSeek', priority: 5, enabled: true, hasKey: false, modelName: 'deepseek-chat', tokensConsumed: 0, balance: 8.50 },
    { id: 'mistral', name: 'Mistral', priority: 6, enabled: true, hasKey: false, modelName: 'mistral-large-latest', tokensConsumed: 0, balance: 15.00 },
    { id: 'openai', name: 'OpenAI', priority: 7, enabled: true, hasKey: false, modelName: 'gpt-4o-mini', tokensConsumed: 0, balance: 4.90 },
    { id: 'claude', name: 'Claude', priority: 8, enabled: true, hasKey: false, modelName: 'claude-3-5-sonnet-latest', tokensConsumed: 0, balance: 12.30 },
    { id: 'nvidia', name: 'NVIDIA NIM', priority: 9, enabled: true, hasKey: false, modelName: 'meta/llama-3.1-70b-instruct', tokensConsumed: 0, balance: 10.00 }
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

const TABLES = ['users', 'documents', 'providers', 'prompts', 'logs', 'agenda', 'learning_corrections'];
const RELOAD_THROTTLE_MS = 3000;

export class NeonDatabase {
  private pool: InstanceType<typeof Pool> | null = null;
  private data: DatabaseSchema = {
    users: [], documents: [], providers: [], prompts: [], logs: [], learningCorrections: [], agenda: []
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
      await this.q(`CREATE TABLE IF NOT EXISTS ${t} (id text PRIMARY KEY, seq bigserial, data jsonb NOT NULL)`);
    }
    await this.q(`CREATE TABLE IF NOT EXISTS kv (key text PRIMARY KEY, value text)`);

    const existing = await this.q('SELECT COUNT(*)::int AS n FROM users');
    if ((existing[0]?.n ?? 0) === 0) {
      await this.seed();
    } else {
      // Auto-heal missing default providers (e.g. groq, nvidia) so they are never lost
      for (const p of INITIAL_DB.providers) {
        const check = await this.q('SELECT id FROM providers WHERE id = $1', [p.id]);
        if (check.length === 0) {
          await this.upsert('providers', p.id, p);
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
  }

  private async load(): Promise<void> {
    const [users, documents, providers, prompts, logs, agenda, corrections, theme] = await Promise.all([
      this.q('SELECT data FROM users ORDER BY seq ASC'),
      this.q('SELECT data FROM documents ORDER BY seq DESC'),
      this.q('SELECT data FROM providers ORDER BY seq ASC'),
      this.q('SELECT data FROM prompts ORDER BY seq ASC'),
      this.q('SELECT data FROM logs ORDER BY seq DESC LIMIT 1000'),
      this.q('SELECT data FROM agenda ORDER BY seq DESC'),
      this.q('SELECT data FROM learning_corrections ORDER BY seq DESC'),
      this.q("SELECT value FROM kv WHERE key = 'activeTheme'"),
    ]);
    this.data = {
      users: users.map((r: any) => r.data),
      documents: documents.map((r: any) => r.data),
      providers: providers.map((r: any) => r.data),
      prompts: prompts.map((r: any) => r.data),
      logs: logs.map((r: any) => r.data),
      agenda: agenda.map((r: any) => r.data),
      learningCorrections: corrections.map((r: any) => r.data),
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
  getProviders(): AIProvider[] { return this.data.providers; }

  async updateProviders(providers: AIProvider[]): Promise<void> {
    this.data.providers = providers;
    await this.q('DELETE FROM providers');
    for (const p of providers) await this.upsert('providers', p.id, p);
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
}

export const db = new NeonDatabase();
