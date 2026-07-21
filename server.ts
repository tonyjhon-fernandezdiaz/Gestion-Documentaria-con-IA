import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import express from 'express';
import path from 'path';
import { GoogleGenAI, Type } from '@google/genai';
import { db } from './server/db.js';
import { DocumentType, AIProvider } from './src/types.js';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Normalize URL path for Vercel serverless function rewrites (/api/index)
app.use((req, _res, next) => {
  if (req.url && !req.url.startsWith('/api')) {
    req.url = '/api' + (req.url.startsWith('/') ? '' : '/') + req.url;
  }
  next();
});

// Ensure the database is initialised and the cache is fresh before each API request.
app.use('/api', async (_req, res, next) => {
  try {
    await db.ready();
    await db.reload();
    next();
  } catch (err: any) {
    console.error('Error inicializando la base de datos:', err);
    res.status(503).json({
      error: 'Base de datos no disponible',
      detalle: String(err?.message || err?.code || err)
    });
  }
});

// Initialise Google Gemini client on server (using a lazy getter for robustness and hot reloading)
function getGeminiClient(overrideKey?: string): GoogleGenAI | null {
  const apiKey = overrideKey || process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Robust content generation helper with automatic model fallback (e.g. gemini-3.5-flash -> gemini-3.1-flash-lite)
async function generateContentWithFallback(ai: any, params: any): Promise<any> {
  const modelsToTry = ['gemini-3.5-flash', 'gemini-3.1-flash-lite'];
  let lastError: any = null;
  for (const model of modelsToTry) {
    try {
      console.log(`[AI] Intentando generar contenido con el modelo ${model}...`);
      const response = await ai.models.generateContent({
        ...params,
        model: model
      });
      console.log(`[AI] Éxito usando el modelo ${model}`);
      return response;
    } catch (err: any) {
      console.warn(`[AI Warning] El modelo ${model} falló: ${err.message || err}.`);
      lastError = err;
    }
  }
  throw lastError || new Error('No se pudo generar contenido con ningún modelo de Gemini disponible.');
}
const geminiApiKey = process.env.GEMINI_API_KEY;

// Global state for simulating network failures/rate limits for testing fallback
let simulateApiFailures = true;

// Active connections state in memory
interface ConnectedUser {
  username: string;
  name: string;
  role: string;
  ip: string;
  lastActive: string;
}
const connectedUsersMap = new Map<string, ConnectedUser>();

// Helper to register active user and IP
function registerConnection(req: any, user: any) {
  if (!user) return;
  const ip = (req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || '127.0.0.1').split(',')[0].trim();
  connectedUsersMap.set(user.username, {
    username: user.username,
    name: user.name,
    role: user.role,
    ip: ip === '::1' ? '127.0.0.1' : ip,
    lastActive: new Date().toISOString()
  });
}

// Helper to log actions into the system bitácora
function logSystemAction(
  username: string,
  accion: string,
  detalles: string,
  tipo: 'info' | 'success' | 'warning' | 'error',
  extra: Partial<any> = {}
) {
  db.addLog({
    fecha: new Date().toISOString(),
    usuario: username,
    accion,
    detalles,
    tipo,
    ...extra,
  });
}

// -----------------------------------------------------------------
// API ROUTES: AUTHENTICATION
// -----------------------------------------------------------------

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username) {
    return res.status(400).json({ error: 'Usuario requerido.' });
  }

  const users = db.getUsers();
  const user = users.find((u) => u.username.toLowerCase() === username.toLowerCase());

  if (user) {
    // Validate password
    if (user.password && user.password !== password) {
      return res.status(401).json({ error: 'Contraseña incorrecta.' });
    }
    registerConnection(req, user);
    logSystemAction(user.name, 'Inicio de Sesión', `Usuario ${user.username} inició sesión con rol ${user.role}.`, 'success');
    return res.json({ token: `sess-${user.id}-${Date.now()}`, user });
  }

  return res.status(401).json({ error: 'Usuario no registrado.' });
});

function getUserIdFromToken(authHeader: string | undefined): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer sess-')) {
    return null;
  }
  const tokenParts = authHeader.replace('Bearer sess-', '').split('-');
  if (tokenParts.length > 1) {
    tokenParts.pop(); // remove timestamp
    return tokenParts.join('-');
  }
  return tokenParts[0] || null;
}

app.get('/api/auth/me', (req, res) => {
  const authHeader = req.headers.authorization;
  const userId = getUserIdFromToken(authHeader);
  if (!userId) {
    return res.status(401).json({ error: 'No autorizado.' });
  }

  const users = db.getUsers();
  const user = users.find((u) => u.id === userId);

  if (user) {
    registerConnection(req, user);
    return res.json({ user });
  }
  return res.status(401).json({ error: 'Sesión expirada.' });
});

app.post('/api/auth/logout', (req, res) => {
  const username = req.body.username || 'Usuario';
  logSystemAction(username, 'Cierre de Sesión', 'Sesión cerrada correctamente.', 'info');
  res.json({ success: true });
});

// -----------------------------------------------------------------
// API ROUTES: USER MANAGEMENT (ADMIN ONLY)
// -----------------------------------------------------------------

function checkIsAdmin(req: any) {
  const authHeader = req.headers.authorization;
  const userId = getUserIdFromToken(authHeader);
  if (!userId) {
    return false;
  }
  const users = db.getUsers();
  const user = users.find((u) => u.id === userId);
  return user && user.role === 'Administrador';
}

app.get('/api/users', (req, res) => {
  if (!checkIsAdmin(req)) {
    return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de Administrador.' });
  }
  res.json(db.getUsers());
});

app.post('/api/users', async (req, res) => {
  if (!checkIsAdmin(req)) {
    return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de Administrador.' });
  }
  const { username, name, role, password, avatar } = req.body;
  if (!username || !name || !role || !password) {
    return res.status(400).json({ error: 'Faltan campos obligatorios.' });
  }

  const users = db.getUsers();
  if (users.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
    return res.status(400).json({ error: 'El nombre de usuario ya está registrado.' });
  }

  const newUser = {
    id: `u-${Date.now()}`,
    username,
    name,
    role,
    password,
    avatar: avatar || `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150`
  };

  await db.addUser(newUser);
  logSystemAction('Administrador', 'Usuario Creado', `Se registró un nuevo usuario: ${name} (${role}).`, 'success');
  res.json(newUser);
});

app.put('/api/users/:id', async (req, res) => {
  if (!checkIsAdmin(req)) {
    return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de Administrador.' });
  }
  const { id } = req.params;
  const updates = req.body;

  const users = db.getUsers();
  const existingUser = users.find((u) => u.id === id);
  if (!existingUser) {
    return res.status(404).json({ error: 'Usuario no encontrado.' });
  }

  if (existingUser.username === '74223117') {
    if (updates.role && updates.role !== 'Administrador') {
      return res.status(400).json({ error: 'No se puede degradar el rol del Administrador principal.' });
    }
    if (updates.username && updates.username !== '74223117') {
      return res.status(400).json({ error: 'No se puede cambiar el nombre de usuario del Administrador principal.' });
    }
  }

  const updatedUser = await db.updateUser(id, updates);
  if (updatedUser) {
    logSystemAction('Administrador', 'Usuario Modificado', `Se actualizó el usuario: ${updatedUser.name}.`, 'info');
    return res.json(updatedUser);
  }
  res.status(400).json({ error: 'No se pudo actualizar el usuario.' });
});

app.delete('/api/users/:id', async (req, res) => {
  if (!checkIsAdmin(req)) {
    return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de Administrador.' });
  }
  const { id } = req.params;

  const users = db.getUsers();
  const userToDelete = users.find((u) => u.id === id);
  if (!userToDelete) {
    return res.status(404).json({ error: 'Usuario no encontrado.' });
  }

  if (userToDelete.username === '74223117') {
    return res.status(400).json({ error: 'No se puede eliminar el Administrador principal.' });
  }

  const success = await db.deleteUser(id);
  if (success) {
    logSystemAction('Administrador', 'Usuario Eliminado', `Se eliminó al usuario: ${userToDelete.name}.`, 'warning');
    return res.json({ success: true });
  }
  res.status(400).json({ error: 'No se pudo eliminar el usuario.' });
});

// -----------------------------------------------------------------
// API ROUTES: DOCUMENTS MANAGEMENT
// -----------------------------------------------------------------

app.get('/api/documents', (req, res) => {
  res.json(db.getDocuments());
});

app.post('/api/documents', async (req, res) => {
  const { expediente, referencia, solicitante, tema, tipo, datosExtraidos, textoRedactado, iaUtilizada, tokens, originalFilename, textoOriginal, creadoPor } = req.body;

  const newDoc = {
    id: `doc-${Date.now()}`,
    expediente: expediente || `EXP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    referencia: referencia || 'S/R',
    solicitante: solicitante || 'Anónimo',
    tema: tema || 'Sin tema especificado',
    tipo: tipo as DocumentType,
    datosExtraidos: datosExtraidos || {},
    textoRedactado: textoRedactado || '',
    iaUtilizada: iaUtilizada || 'Desconocida',
    tokens: tokens || 0,
    fechaProceso: new Date().toISOString(),
    estado: 'Procesado' as const,
    originalFilename,
    textoOriginal,
    creadoPor: creadoPor || 'Sistema',
  };

  await db.addDocument(newDoc);
  logSystemAction(creadoPor || 'Sistema', 'Documento Creado', `Se procesó y registró el expediente ${newDoc.expediente} (${newDoc.tipo}).`, 'success');
  res.json(newDoc);
});

app.put('/api/documents/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const updatedDoc = await db.updateDocument(id, updates);

  if (updatedDoc) {
    logSystemAction(updates.usuarioModificacion || 'Sistema', 'Documento Actualizado', `Documento ${updatedDoc.expediente} actualizado a estado: ${updatedDoc.estado}.`, 'info');
    return res.json(updatedDoc);
  }
  return res.status(404).json({ error: 'Documento no encontrado.' });
});

app.delete('/api/documents/:id', async (req, res) => {
  const { id } = req.params;
  const doc = db.getDocuments().find(d => d.id === id);
  const success = await db.deleteDocument(id);

  if (success && doc) {
    logSystemAction('Administrador', 'Documento Eliminado', `Se eliminó el registro de expediente ${doc.expediente}.`, 'warning');
    return res.json({ success: true });
  }
  return res.status(404).json({ error: 'Documento no encontrado.' });
});

// -----------------------------------------------------------------
// API ROUTES: PROMPTS CONFIGURATION
// -----------------------------------------------------------------

app.get('/api/prompts', (req, res) => {
  res.json(db.getPrompts());
});

app.put('/api/prompts/:id', async (req, res) => {
  const { id } = req.params;
  const { prompt, usuario } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'El contenido del prompt es requerido.' });
  }

  const updatedPrompt = await db.updatePrompt(id, prompt, usuario || 'Admin');
  if (updatedPrompt) {
    logSystemAction(usuario || 'Admin', 'Prompt Actualizado', `Modificado prompt para el tipo: ${updatedPrompt.documentType} a versión ${updatedPrompt.version}.`, 'info');
    return res.json(updatedPrompt);
  }
  return res.status(404).json({ error: 'Plantilla de prompt no encontrada.' });
});

// -----------------------------------------------------------------
// API ROUTES: PROVIDERS CONFIGURATION
// -----------------------------------------------------------------

app.get('/api/providers', (req, res) => {
  res.json(db.getProviders());
});

app.put('/api/providers', async (req, res) => {
  if (!checkIsAdmin(req)) {
    return res.status(403).json({ error: 'Acceso denegado. Solo el administrador puede modificar la configuración de las IA.' });
  }

  const providers = req.body.providers;
  const { usuario } = req.body;

  if (!Array.isArray(providers)) {
    return res.status(400).json({ error: 'Formato incorrecto para proveedores.' });
  }

  // Preserve existing apiKeys if they are not provided in the update (e.g. not edited in front-end)
  const currentProviders = db.getProviders();
  const updatedProviders = providers.map((updated: any) => {
    const existing = currentProviders.find((p) => p.id === updated.id);
    return {
      ...updated,
      apiKey: updated.apiKey !== undefined ? updated.apiKey : (existing ? existing.apiKey : undefined)
    };
  });

  await db.updateProviders(updatedProviders);
  logSystemAction(usuario || 'Admin', 'Proveedores de IA Actualizados', 'Se actualizó la jerarquía, prioridades y llaves API de los proveedores de IA.', 'warning');
  res.json({ success: true, providers: db.getProviders() });
});

app.post('/api/providers', async (req, res) => {
  if (!checkIsAdmin(req)) {
    return res.status(403).json({ error: 'Acceso denegado. Solo el administrador puede agregar nuevos proveedores.' });
  }

  const { provider, usuario } = req.body;
  if (!provider || !provider.id || !provider.name) {
    return res.status(400).json({ error: 'Faltan datos obligatorios del proveedor.' });
  }

  const currentProviders = db.getProviders();
  if (currentProviders.some((p) => p.id === provider.id)) {
    return res.status(400).json({ error: 'El ID de proveedor ya existe.' });
  }

  const maxPriority = currentProviders.reduce((max, p) => p.priority > max ? p.priority : max, 0);
  const newProvider = {
    id: provider.id,
    name: provider.name,
    priority: provider.priority || (maxPriority + 1),
    enabled: provider.enabled !== undefined ? provider.enabled : true,
    hasKey: !!provider.apiKey,
    apiUrl: provider.apiUrl || undefined,
    modelName: provider.modelName || 'modelo-estandar',
    apiKey: provider.apiKey || undefined
  };

  currentProviders.push(newProvider);
  await db.updateProviders(currentProviders);
  logSystemAction(usuario || 'Admin', 'Proveedor IA Creado', `Se registró un nuevo proveedor de IA: ${newProvider.name} (${newProvider.modelName}).`, 'success');
  res.json({ success: true, providers: db.getProviders() });
});

app.delete('/api/providers/:id', async (req, res) => {
  if (!checkIsAdmin(req)) {
    return res.status(403).json({ error: 'Acceso denegado. Solo el administrador puede eliminar proveedores.' });
  }

  const { id } = req.params;
  const { usuario } = req.body;

  const currentProviders = db.getProviders();
  const provider = currentProviders.find((p) => p.id === id);
  if (!provider) {
    return res.status(404).json({ error: 'Proveedor no encontrado.' });
  }

  if (id === 'gemini') {
    return res.status(400).json({ error: 'No se puede eliminar el proveedor fallback de Google Gemini.' });
  }

  const updatedProviders = currentProviders.filter((p) => p.id !== id);
  await db.updateProviders(updatedProviders);
  logSystemAction(usuario || 'Admin', 'Proveedor IA Eliminado', `Se eliminó el proveedor de IA: ${provider.name}.`, 'warning');
  res.json({ success: true, providers: db.getProviders() });
});

app.post('/api/providers/:id/test', async (req, res) => {
  if (!checkIsAdmin(req)) {
    return res.status(403).json({ error: 'Acceso denegado. Solo el administrador puede probar la conexión de las IA.' });
  }

  const { id } = req.params;
  const { apiKey } = req.body;

  const currentProviders = db.getProviders();
  const provider = currentProviders.find((p) => p.id === id);

  if (!provider) {
    return res.status(404).json({ error: 'Proveedor no encontrado.' });
  }

  // Determine key to use (supports input, saved DB key, or process.env variables)
  const keyToUse = (apiKey !== undefined && apiKey !== '') ? apiKey : (provider.apiKey || process.env[`${id.toUpperCase()}_API_KEY`]);

  if (!keyToUse) {
    return res.status(400).json({ error: 'Clave API no configurada para este proveedor. Ingrese la clave o agréguela en Vercel Settings -> Environment Variables.' });
  }

  // Build a test provider clone with temporary key override
  const testProvider = {
    ...provider,
    hasKey: !!keyToUse,
    apiKey: keyToUse
  };

  const originalSimulation = simulateApiFailures;
  
  try {
    // Disable simulation temporarily for direct manual diagnostics
    simulateApiFailures = false;

    const systemInstruction = 'Responde única y exclusivamente con el número dígito de la respuesta matemática, sin ningún otro texto, explicaciones ni adornos.';
    const userPrompt = 'Cuánto es 2+2?';

    const response = await requestProviderAPI(testProvider, systemInstruction, userPrompt, keyToUse, true);
    const responseText = (response.text || '').trim();

    // Check if the response contains '4' and does not contain typical error text
    const isCorrect = responseText.includes('4') && !responseText.toLowerCase().includes('error');

    if (isCorrect) {
      res.json({
        success: true,
        respuesta: responseText,
        message: 'Conexión exitosa. El proveedor respondió correctamente.'
      });
    } else {
      res.json({
        success: false,
        respuesta: responseText,
        error: `Respuesta incorrecta. Se esperaba "4" pero se obtuvo: "${responseText}"`
      });
    }
  } catch (err: any) {
    res.json({
      success: false,
      error: err.message || 'Falla de conexión con la API del proveedor.'
    });
  } finally {
    simulateApiFailures = originalSimulation;
  }
});

app.get('/api/config/simulation', (req, res) => {
  res.json({ simulateApiFailures });
});

app.post('/api/config/simulation', (req, res) => {
  simulateApiFailures = !!req.body.simulate;
  logSystemAction('Administrador', 'Simulación IA Modificada', `Se ${simulateApiFailures ? 'ACTIVÓ' : 'DESACTIVÓ'} la simulación de fallas de APIs.`, 'info');
  res.json({ simulateApiFailures });
});

app.get('/api/config/theme', (req, res) => {
  res.json({ theme: db.getTheme() });
});

app.post('/api/config/theme', async (req, res) => {
  const { theme } = req.body;
  if (!theme) {
    return res.status(400).json({ error: 'Se requiere especificar el tema.' });
  }
  await db.setTheme(theme);
  logSystemAction('Administrador', 'Tema Visual Modificado', `Se cambió la plantilla de visualización global a: ${theme.toUpperCase()}.`, 'info');
  res.json({ success: true, theme });
});

// -----------------------------------------------------------------
// API ROUTES: SYSTEM LOGS
// -----------------------------------------------------------------

app.get('/api/logs', (req, res) => {
  res.json(db.getLogs());
});

// -----------------------------------------------------------------
// API ROUTES: AI LEARNING AND CORRECTIONS
// -----------------------------------------------------------------

app.get('/api/learning', (req, res) => {
  res.json(db.getLearningCorrections());
});

app.post('/api/learning', async (req, res) => {
  const { campo, valorErroneo, valorCorregido, contextoTexto, explicacion, usuario } = req.body;
  if (!campo || valorCorregido === undefined) {
    return res.status(400).json({ error: 'El campo y el valor corregido son obligatorios.' });
  }

  const correction = {
    id: `lc-${Date.now()}`,
    fecha: new Date().toISOString(),
    campo,
    valorErroneo: valorErroneo || '',
    valorCorregido,
    contextoTexto,
    explicacion,
    usuario: usuario || 'Usuario'
  };

  await db.addLearningCorrection(correction);
  logSystemAction(
    usuario || 'Usuario', 
    'Aprendizaje Guardado', 
    `Nueva corrección registrada para el campo "${campo}". La IA usará esto como lección para futuros expedientes.`, 
    'success'
  );
  res.json({ success: true, correction });
});

// Helper to optimize document length to save tokens (keeps 1st and last pages if > 5 pages)
function optimizeDocumentPages(text: string): { optimizedText: string; isOptimized: boolean; originalPageCount: number } {
  if (!text) return { optimizedText: '', isOptimized: false, originalPageCount: 0 };
  
  const cleanText = text.replace(/\r\n/g, '\n');
  let pages: string[] = [];
  
  if (cleanText.includes('\f')) {
    pages = cleanText.split('\f');
  } else {
    const pageRegex = /\[(?:PÁGINA|PAGINA|PAGE)\s*\d+\]/gi;
    if (pageRegex.test(cleanText)) {
      pages = cleanText.split(pageRegex).filter(p => p.trim().length > 0);
    } else {
      const lines = cleanText.split('\n');
      const linesPerPage = 40;
      for (let i = 0; i < lines.length; i += linesPerPage) {
        pages.push(lines.slice(i, i + linesPerPage).join('\n'));
      }
    }
  }

  pages = pages.map(p => p.trim()).filter(p => p.length > 0);
  const originalPageCount = pages.length;

  if (originalPageCount > 5) {
    const firstPage = pages[0];
    const lastPage = pages[pages.length - 1];
    
    const optimizedText = `[PÁGINA 1 - INICIO DEL DOCUMENTO]\n${firstPage}\n\n[... PÁGINAS INTERMEDIAS OMITIDAS PARA LIMITAR EL GASTO DE TOKENS Y OPTIMIZAR COSTOS ...]\n\n[ÚLTIMA PÁGINA (PÁGINA ${originalPageCount}) - CONCLUSIONES Y RECOMENDACIONES DE ORIGEN]\n${lastPage}`;
    
    return {
      optimizedText,
      isOptimized: true,
      originalPageCount
    };
  }

  return {
    optimizedText: text,
    isOptimized: false,
    originalPageCount
  };
}

// -----------------------------------------------------------------
// AI MULTI-PROVIDER FAILOVER & ENGINE
// -----------------------------------------------------------------

// Helper for fetch timeout to prevent hanging the application indefinitely
async function fetchWithTimeout(url: string, options: any, timeoutMs: number = 15000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Fallback logic to call individual real API, or simulate if key is missing or simulated error toggled
async function requestProviderAPI(
  provider: AIProvider,
  systemInstruction: string,
  userPrompt: string,
  apiKey: string | undefined,
  isTest: boolean = false,
  fileBase64?: string,
  mimeType?: stri  // If simulation of failures is enabled, let's randomly trigger errors for higher-priority providers
  // without real API keys to showcase the robust automatic failover! We exclude Gemini from failing if it's the ultimate fallback
  if (simulateApiFailures && provider.id !== 'gemini' && !apiKey && Math.random() < 0.6) {
    const errorCodes = [408, 429, 500, 503];
    const code = errorCodes[Math.floor(Math.random() * errorCodes.length)];
    throw new Error(`[Simulado] API Error ${code} from ${provider.name}: Limite de cuota alcanzado o error del servidor.`);
  }

  // If we have a custom API Key configured for third-party, make a real API call!
  if (provider.id !== 'gemini' && (provider.hasKey || apiKey)) {
    try {
      if (provider.id === 'groq') {
        const bodyObj: any = {
          model: provider.modelName,
          messages: [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: userPrompt }
          ]
        };
        // ONLY request json_object if not a simple plain text test
        if (!isTest) {
          bodyObj.response_format = { type: 'json_object' };
        }

        const response = await fetchWithTimeout('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify(bodyObj),
        }, 15000);
        if (!response.ok) throw new Error(`Groq HTTP ${response.status}`);
        const data = await response.json();
        return {
          text: data.choices[0].message.content,
          tokens: data.usage?.total_tokens || 350
        };
      }

      if (provider.id === 'openrouter') {
        const response = await fetchWithTimeout('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: provider.modelName,
            messages: [
              { role: 'system', content: systemInstruction },
              { role: 'user', content: userPrompt }
            ]
          }),
        }, 15000);
        if (!response.ok) throw new Error(`OpenRouter HTTP ${response.status}`);
        const data = await response.json();
        return {
          text: data.choices[0].message.content,
          tokens: data.usage?.total_tokens || 400
        };
      }

      if (['openai', 'deepseek', 'cerebras', 'mistral'].includes(provider.id)) {
        let endpoint = 'https://api.openai.com/v1/chat/completions';
        if (provider.id === 'deepseek') endpoint = 'https://api.deepseek.com/chat/completions';
        if (provider.id === 'cerebras') endpoint = 'https://api.cerebras.ai/v1/chat/completions';
        if (provider.id === 'mistral') endpoint = 'https://api.mistral.ai/v1/chat/completions';

        const response = await fetchWithTimeout(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: provider.modelName,
            messages: [
              { role: 'system', content: systemInstruction },
              { role: 'user', content: userPrompt }
            ]
          }),
        }, 15000);
        if (!response.ok) throw new Error(`${provider.name} HTTP ${response.status}`);
        const data = await response.json();
        return {
          text: data.choices[0].message.content,
          tokens: data.usage?.total_tokens || 380
        };
      }

      if (provider.id === 'claude') {
        const response = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: provider.modelName,
            max_tokens: 4000,
            system: systemInstruction,
            messages: [{ role: 'user', content: userPrompt }]
          }),
        }, 15000);
        if (!response.ok) throw new Error(`Claude HTTP ${response.status}`);
        const data = await response.json();
        return {
          text: data.content[0].text,
          tokens: data.usage?.input_tokens + data.usage?.output_tokens || 500
        };
      }

      // Generic/custom API (like NVIDIA NIM or any other OpenAI-compatible API with custom apiUrl)
      const isCustomOrGeneric = !['groq', 'openrouter', 'openai', 'deepseek', 'cerebras', 'mistral', 'claude'].includes(provider.id);
      if (isCustomOrGeneric) {
        let endpoint = provider.apiUrl || (provider.id.includes('nvidia') ? 'https://integrate.api.nvidia.com/v1/chat/completions' : 'https://api.openai.com/v1/chat/completions');
        
        // Auto-fix endpoints if user provided base URL ending in /v1 or /v1/
        if (endpoint.endsWith('/v1') || endpoint.endsWith('/v1/')) {
          endpoint = endpoint.replace(/\/+$/, '') + '/chat/completions';
        }

        let modelName = provider.modelName || 'meta/llama-3.1-70b-instruct';
        if (modelName.includes('405b')) {
          modelName = 'meta/llama-3.1-70b-instruct';
        }

        const response = await fetchWithTimeout(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: modelName,
            messages: [
              { role: 'system', content: systemInstruction },
              { role: 'user', content: userPrompt }
            ]
          }),
        }, 15000);

        if (!response.ok) {
          const errBody = await response.text().catch(() => '');
          throw new Error(`${provider.name} HTTP ${response.status}: ${errBody.slice(0, 150)}`);
        }
        const data = await response.json();
        return {
          text: data.choices?.[0]?.message?.content || '',
          tokens: data.usage?.total_tokens || 350
        };
      }data.usage?.total_tokens || 350
        };
      }
    } catch (err: any) {
      throw new Error(`Falla de conexión real con ${provider.name}: ${err.message}`);
    }
  }

  // Use the Gemini provider's own API key (configured in the app) to process the request.
  const ai = getGeminiClient(apiKey);
  if (ai) {
    if (isTest) {
      // If it is a basic test, don't enforce document JSON schema
      const combinedPrompt = `${systemInstruction}\n\nPregunta: ${userPrompt}`;
      const response = await generateContentWithFallback(ai, {
        contents: combinedPrompt
      });
      return {
        text: response.text || '',
        tokens: 15
      };
    }

    const combinedPrompt = `${systemInstruction}\n\n[INSTRUCCIONES DEL DOCUMENTO]:\n${userPrompt}\n\nRECUERDA: Debes responder UNICAMENTE con un formato JSON válido que contenga la estructura descrita.`;
    
    const parts: any[] = [];
    if (fileBase64 && mimeType) {
      const base64Data = fileBase64.includes(',') ? fileBase64.split(',')[1] : fileBase64;
      parts.push({
        inlineData: {
          data: base64Data,
          mimeType: mimeType
        }
      });
    }
    parts.push({ text: combinedPrompt });
 
    const response = await generateContentWithFallback(ai, {
      contents: { parts: parts },
      config: {
        responseMimeType: 'application/json'
      }
    });

    const parsedResponse = JSON.parse(response.text || '{}');
    // Stamp the selected provider name to simulate that provider answered, but indicate Gemini ran under the hood!
    parsedResponse.ia_utilizada = `${provider.name} (${provider.modelName}) ${provider.id !== 'gemini' ? '[Simulado con Gemini]' : ''}`;
    parsedResponse.tokens = parsedResponse.tokens || Math.floor(180 + Math.random() * 300);
    parsedResponse.fecha_proceso = new Date().toISOString();

    return {
      text: JSON.stringify(parsedResponse),
      tokens: parsedResponse.tokens
    };
  }

  throw new Error(`Proveedor ${provider.name} no disponible y motor Gemini no inicializado.`);
}

// Helper to update active provider token consumption and cost balance deduction
function updateProviderStats(providerId: string, tokensUsed: number) {
  try {
    const providers = db.getProviders();
    const index = providers.findIndex(p => p.id === providerId);
    if (index !== -1) {
      const p = providers[index];
      const currentTokens = p.tokensConsumed || 0;
      const currentBalance = p.balance !== undefined ? p.balance : (p.id === 'gemini' ? 99.82 : 15.00);
      
      // Compute realistic/simulated cost multiplier (e.g. Claude: $15 per million, Gemini: $0.15 per million, OpenAI: $2 per million, etc.)
      let costPerToken = 0.00000015; // default very cheap
      if (p.id === 'claude') costPerToken = 0.000015;
      else if (p.id === 'openai') costPerToken = 0.000002;
      else if (p.id === 'gemini') costPerToken = 0.00000015;
      else if (p.id === 'deepseek') costPerToken = 0.0000002;
      
      const totalCost = tokensUsed * costPerToken;
      const newTokens = currentTokens + tokensUsed;
      const newBalance = Math.max(0, currentBalance - totalCost);
      
      providers[index] = {
        ...p,
        tokensConsumed: newTokens,
        balance: parseFloat(newBalance.toFixed(4))
      };
      db.updateProviders(providers).catch((e: any) => console.error('Error persistiendo estadísticas de proveedor:', e));
    }
  } catch (err) {
    console.error('Error updating provider statistics:', err);
  }
}

// Complete OCR & Data Extraction Multi-provider pipeline
app.post('/api/ai/ocr', async (req, res) => {
  const { text, filename, usuario, fileBase64, mimeType } = req.body;

  if (!text && !fileBase64) {
    return res.status(400).json({ error: 'Contenido del documento vacío.' });
  }

  const hasUsableProvider = db.getProviders().some(p => p.enabled && (p.apiKey || (p.id === 'gemini' && process.env.GEMINI_API_KEY)));
  if (!hasUsableProvider) {
    return res.status(500).json({ error: 'No hay ningún proveedor de IA configurado con una API key. Configúrelo en Configuraciones -> Proveedores de IA.' });
  }

  const startTime = Date.now();
  
  // 1. Optimize document length to reduce token consumption (keep only 1st and last page if > 5 pages)
  const { optimizedText, isOptimized, originalPageCount } = optimizeDocumentPages(text);

  // 2. Load past corrections for real-time machine learning (few-shot context injection)
  const learningList = db.getLearningCorrections();
  let learningContext = '';
  if (learningList.length > 0) {
    const recentLearning = learningList.slice(0, 10);
    learningContext = `\n\n[CONOCIMIENTO DE APRENDIZAJE Y HISTORIAL DE CORRECCIONES DE USUARIOS - CRÍTICO]:
El usuario ha corregido los siguientes errores en documentos procesados anteriormente. Debes estudiar rigurosamente este conocimiento aprendido y aplicar las mismas correcciones para no volver a cometer estos fallos:
${recentLearning.map((l, idx) => `
Caso aprendido ${idx + 1}:
- Campo corregido: "${l.campo}"
- Error anterior cometido por la IA: "${l.valorErroneo}"
- Corrección humana aplicada (VALOR VERDADERO): "${l.valorCorregido}"
${l.contextoTexto ? `- Contexto del documento original donde ocurrió: "${l.contextoTexto.slice(0, 180)}"` : ''}
${l.explicacion ? `- Instrucción correctora: "${l.explicacion}"` : ''}
`).join('\n')}`;
  }

  const sortedProviders = db.getProviders()
    .filter((p) => p.enabled)
    .sort((a, b) => a.priority - b.priority);

  const attempted: string[] = [];
  const errorsDetail: Record<string, string> = {};
  let successfulProvider: AIProvider | null = null;
  let resultJSON: any = null;
  let finalTokens = 0;

  for (const provider of sortedProviders) {
    attempted.push(provider.id);
    try {
      const baseSystemInstruction = `Eres un sistema OCR Inteligente de nivel empresarial para el Gobierno e Instituciones de Educación Pública. 
Analiza el documento proveído y extrae la información en un formato JSON estructurado con la mayor precisión técnica y jurídica, evitando cualquier suposición o confusión temática. 

DIRECTIVAS DE EXTRACCIÓN CRÍTICAS (EVITAR ERRORES DE ANÁLISIS):
1. IDENTIFICACIÓN PRECISA DEL ÁREA Y CONTEXTO:
   - Determina cuidadosamente el tema principal del documento (Racionalización de Plazas, Infraestructura, Personal, Presupuesto, Asesoría Jurídica, etc.).
   - NO confundas áreas ni inventes relaciones de presupuesto. Por ejemplo, si el documento trata sobre "Racionalización de Plazas" (Compromiso de Desempeño 3.1, NEXUS, excedencias, reubicación de plazas), clasifica y describe el tema estrictamente bajo el área de Racionalización, Planificación o Gestión Institucional. NO asumas que requiere presupuesto o que proviene del área de Presupuesto a menos que el documento mencione explícitamente transferencias financieras activas.
2. IMPORTANCIA VITAL DE CONCLUSIONES Y RECOMENDACIONES:
   - Identifica y extrae fielmente las Conclusiones y Recomendaciones presentes en el documento original. Estos puntos son de máxima prioridad.
   - Extrae textualmente o sintetiza con extrema fidelidad los acuerdos adoptados, derivaciones solicitadas (por ejemplo, "derivar al Equipo de Personal", "elevar a Dirección para firma de resolución") o acciones dictaminadas. Colócalas de forma explícita y estructurada dentro del objeto "datos_extraidos" en el campo "conclusiones_y_recomendaciones_originales".
3. NO INVENTAR DATOS NI VALORES:
   - Si no se especifica una fecha, monto o código, déjalo vacío o usa "No especificado". No inventes montos monetarios ni números de plazas.

Debe contener obligatoriamente estos campos:
- "referencia": El código o identificador del documento que se está subiendo o leyendo (ejemplo: "INFORME N° 072-2024-GRSM-DRE/UGEL-B-AGI/RA" o "MEMORANDO N° 2023-2026-UGEL-AGI"). Busca este código de identificación en la parte superior del documento, usualmente centrado o en letras grandes encima de los campos 'AL:', 'DE:', 'ASUNTO:'. Es fundamental que extraigas este identificador exacto de la parte superior del documento and lo asignes al campo "referencia".
- "expediente": El código de expediente o número correlativo (ejemplo: N° de Registro o de Expediente si existe).
- "solicitante": El remitente o firmante del documento (campo "DE:" u oficina de origen).
- "tema": El asunto del documento (campo "ASUNTO:" o descripción del tema principal sin mezclar áreas).
- "datos_extraidos": un objeto con metadatos clave detectados que incluya:
    * "urgencia": "Alta", "Media" o "Baja" según el tenor del texto.
    * "resumen": Breve resumen ejecutivo centrado en el tema principal real del documento.
    * "conclusiones_y_recomendaciones_originales": Una lista de las conclusiones y recomendaciones exactas encontradas en el documento de origen.
    * "area_responsable": El área técnica real a la que compete (ejemplo: "Racionalización / Gestión Institucional", "Infraestructura", "Personal", "Administración").`;

      const systemInstruction = baseSystemInstruction + learningContext;
      const userPrompt = `DOCUMENTO ORIGINAL DE REFERENCIA:\n${optimizedText}\n\nAnaliza de manera sumamente precisa y técnica, prestando especial atención a las Conclusiones y Recomendaciones de origen y delimitando correctamente el área responsable. Extrae los metadatos en un formato JSON válido.`;

      // Simular clave si es necesario
      const key = provider.apiKey;
      const response = await requestProviderAPI(
        provider,
        systemInstruction,
        userPrompt,
        key,
        false,
        fileBase64,
        mimeType
      );

      resultJSON = JSON.parse(response.text);
      finalTokens = response.tokens;
      successfulProvider = provider;
      break; // Succeeded! Stop iterating
    } catch (err: any) {
      console.warn(`Error en proveedor ${provider.name}: ${err.message || err}. Intentando siguiente...`);
      errorsDetail[provider.id] = err.message || String(err);
    }
  }

  const responseTimeMs = Date.now() - startTime;

  if (successfulProvider && resultJSON) {
    updateProviderStats(successfulProvider.id, finalTokens);
    // Audit logs bitácora
    logSystemAction(
      usuario || 'Usuario',
      'OCR y Extracción',
      `OCR y extracción de datos con éxito de archivo "${filename || 'Documento'}" usando ${successfulProvider.name}.${isOptimized ? ' [Optimización de hojas activada (>5 hojas)]' : ''}`,
      'success',
      {
        providerAttempted: attempted,
        providerSucceeded: successfulProvider.id,
        tokensUsed: finalTokens,
        responseTimeMs,
        isOptimized,
        originalPageCount
      }
    );

    return res.json({
      success: true,
      data: resultJSON,
      textOriginal: text,
      filename,
      ia_utilizada: `${successfulProvider.name} (${successfulProvider.modelName})`,
      attempted,
      responseTimeMs,
      tokens: finalTokens,
      isOptimized,
      originalPageCount
    });
  }

  logSystemAction(
    usuario || 'Usuario',
    'OCR Fallido',
    `Fallo en OCR y extracción de "${filename || 'Documento'}". Todos los proveedores fallaron.`,
    'error',
    { providerAttempted: attempted }
  );

  return res.status(502).json({
    error: 'Todos los proveedores de IA fallaron al procesar la solicitud.',
    attempted,
    errorsDetail
  });
});

// Draft and Generate Document based on prompted template
app.post('/api/ai/draft', async (req, res) => {
  const { metadata, docType, originalText, usuario, fileBase64, mimeType } = req.body;

  if (!docType) {
    return res.status(400).json({ error: 'El tipo de documento a redactar es obligatorio.' });
  }

  const hasUsableProvider = db.getProviders().some(p => p.enabled && (p.apiKey || (p.id === 'gemini' && process.env.GEMINI_API_KEY)));
  if (!hasUsableProvider) {
    return res.status(500).json({ error: 'No hay ningún proveedor de IA configurado con una API key. Configúrelo en Configuraciones -> Proveedores de IA.' });
  }

  const startTime = Date.now();
  
  // 1. Optimize document length for drafting as well to save tokens (keeps 1st and last pages if > 5 pages)
  let optimizedOriginalText = '';
  let isOptimized = false;
  let originalPageCount = 0;
  if (originalText) {
    const opt = optimizeDocumentPages(originalText);
    optimizedOriginalText = opt.optimizedText;
    isOptimized = opt.isOptimized;
    originalPageCount = opt.originalPageCount;
  }

  // 2. Load past corrections for real-time machine learning (few-shot context injection)
  const learningList = db.getLearningCorrections();
  let learningContext = '';
  if (learningList.length > 0) {
    const recentLearning = learningList.slice(0, 10);
    learningContext = `\n\n[CONOCIMIENTO DE APRENDIZAJE Y HISTORIAL DE CORRECCIONES DE USUARIOS - CRÍTICO]:
El usuario ha corregido los siguientes errores en documentos redactados anteriormente. Debes estudiar rigurosamente este conocimiento aprendido y aplicar las mismas correcciones para no volver a cometer estos fallos:
${recentLearning.map((l, idx) => `
Caso aprendido ${idx + 1}:
- Campo corregido: "${l.campo}"
- Error anterior cometido por la IA: "${l.valorErroneo}"
- Corrección humana aplicada (VALOR VERDADERO): "${l.valorCorregido}"
${l.contextoTexto ? `- Contexto del documento original donde ocurrió: "${l.contextoTexto.slice(0, 180)}"` : ''}
${l.explicacion ? `- Instrucción correctora: "${l.explicacion}"` : ''}
`).join('\n')}`;
  }

  const prompts = db.getPrompts();
  const promptTemplate = prompts.find((p) => p.documentType === docType)?.prompt || 'Redacte un documento oficial.';

  const sortedProviders = db.getProviders()
    .filter((p) => p.enabled)
    .sort((a, b) => a.priority - b.priority);

  const attempted: string[] = [];
  let successfulProvider: AIProvider | null = null;
  let draftedJSON: any = null;
  let finalTokens = 0;

  for (const provider of sortedProviders) {
    attempted.push(provider.id);
    try {

        const baseSystemInstruction = `Eres un redactor técnico y jurídico premium para la UGEL Bellavista (Gobierno Regional de San Martín). 
Tu misión es redactar de forma impecable el cuerpo del documento institucional tipo "${docType}" siguiendo los más altos estándares de la administración pública del Perú, garantizando precisión absoluta para un procesamiento masivo y diario de expedientes sin margen de error.

DIRECTIVAS CRÍTICAS DE CONTENIDO Y REDACCIÓN:
1. PRIORIDAD ABSOLUTA AL DOCUMENTO ADJUNTO: Debes basar la mayor parte de la redacción en el texto del documento de referencia cargado internamente (antepasado en 'Antecedentes de texto original'). Extrae exhaustivamente los datos numéricos, los argumentos técnicos, los antecedentes detallados, las conclusiones y las recomendaciones específicas del archivo adjunto.
2. DELIMITACIÓN EXCLUSIVA DE ÁREAS Y CONTEXTOS (EVITAR MEZCLAS Y ERRORES): Queda terminantemente prohibido mezclar terminologías, competencias o roles de oficinas ajenas.
   - Si el tema es "Racionalización de Plazas" (Compromiso de Desempeño 3.1 - NEXUS), pertenece exclusivamente al Área de Gestión Institucional (AGI) o Racionalización/Personal. **NO** tiene relación con el área de Presupuesto ni Planificación Financiera, ni debes sugerir trámites presupuestales o transferencias financieras a menos que el documento original mencione explícitamente una partida presupuestal activa. Mantén la redacción estrictamente delimitada al saneamiento, contratación, reubicación o excedencia de plazas docentes y administrativas.
   - De igual forma, si el tema es Infraestructura, Currículo, o Trámite Documentario, mantén los límites temáticos correspondientes con rigor técnico.
3. MÁXIMA IMPORTANCIA Y FIDELIDAD A CONCLUSIONES Y RECOMENDACIONES DE ORIGEN: Las conclusiones y recomendaciones del documento base son de **vital importancia** y constituyen el núcleo decisorio del expediente.
   - Debes identificar cada conclusión y recomendación del documento original.
   - Debes trasladar íntegra y explícitamente estas conclusiones y recomendaciones al cuerpo del nuevo documento que estás redactando. No omitas ninguna recomendación de derivación (por ejemplo, "derivar al Equipo de Personal"), emisión de acto resolutivo (por ejemplo, "emitir Resolución Directoral de aprobación"), o sanción, ya que un error u omisión de estas decisiones en la redacción generará un vicio o retraso administrativo grave en el flujo de trabajo diario de la UGEL.
4. INTEGRIDAD NUMÉRICA Y NOMINAL ABSOLUTA: No inventes, aproximes ni alteres números de plazas, códigos modulares de Instituciones Educativas (I.E.), nombres de docentes o funcionarios, montos, ni números de informes/oficios. La información de origen debe figurar de manera 100% exactas y fidedigna en la redacción sugerida.
5. COMBINAR CON LAS NOTAS DEL USUARIO: Si hay notas de contexto adicionales escritas manualmente por el usuario, combínalas armónicamente con los antecedentes del documento adjunto, pero asegúrate de que el documento adjunto sea la fuente principal de información y sustento técnico del informe, oficio, memorando, proveído o resolución.
6. DISTINCIÓN CRÍTICA ENTRE INFORME E INFORME TÉCNICO:
   - Si el tipo de documento es "Informe Técnico", estructúralo obligatoria y rigurosamente con secciones numeradas en mayúsculas y negrita: "I. ANTECEDENTES", "II. ANÁLISIS", "III. CONCLUSIONES" y "IV. RECOMENDACIONES", detallando de manera técnica y legal cada punto.
   - Si el tipo de documento es "Informe" (sin el término "Técnico"), redacta un documento "tipo carta" o de comunicación continua, es decir, un cuerpo formal en párrafos fluidos y directos, SIN secciones rígidas, SIN numeraciones de secciones ("I. ANTECEDENTES", "II. ANÁLISIS", etc.) y de manera más integrada y narrativa. El "Informe" común debe fluir como una carta informativa sin separadores rígidos.
7. EXCLUSIÓN DE CABECERAS EN "texto_redactado": Redacta exclusivamente el CUERPO del documento (los párrafos de desarrollo), empezando directamente con el saludo o párrafo introductorio. NO incluyas cabeceras repetitivas como "MEMORANDO N°...", "A:", "DE:", "ASUNTO:", "FECHA:", ya que la interfaz del sistema las renderiza automáticamente.
8. RESPONDER EN JSON: Debes responder estrictamente en formato JSON plano con la siguiente estructura exacta:
{
  "expediente": "${metadata.expediente || ''}",
  "referencia": "${metadata.referencia || ''}",
  "solicitante": "${metadata.solicitante || ''}",
  "tema": "${metadata.tema || ''}",
  "datos_extraidos": {},
  "texto_redactado": "Aquí va la redacción profesional y completa del cuerpo del \${docType}...",
  "ia_utilizada": "",
  "tokens": 0,
  "fecha_proceso": ""
}`;

        const systemInstruction = baseSystemInstruction + learningContext;
        const userPrompt = `
REQUISITOS DE REDACCIÓN DE LA UGEL:
- Tipo de documento: ${docType}
- Instrucciones de la Plantilla: ${promptTemplate}
- Destinatario / Solicitante: ${metadata.solicitante || 'No especificado'}
- Asunto / Tema: ${metadata.tema || 'No especificado'}
- Código o Expediente de Referencia: ${metadata.expediente || 'No especificado'}
- Metadatos Clave Extraídos: ${JSON.stringify(metadata.datos_extraidos || {})}

ANTECEDENTES COMPLETOS (Incluye el documento de referencia y notas del usuario):
${optimizedOriginalText ? `${optimizedOriginalText}` : 'No se ha adjuntado texto de referencia. Redacte con los metadatos.'}

Por favor, lee detalladamente toda la información anterior (especialmente el documento de referencia adjunto), extrae los detalles, nombres de áreas, derivaciones sugeridas, y redacta de manera pulcra, formal y completa el cuerpo de desarrollo en el campo "texto_redactado" del JSON de respuesta.`;

      const key = provider.apiKey;
      const response = await requestProviderAPI(
        provider,
        systemInstruction,
        userPrompt,
        key,
        false,
        fileBase64,
        mimeType
      );

      draftedJSON = JSON.parse(response.text);
      finalTokens = response.tokens;
      successfulProvider = provider;
      break;
    } catch (err: any) {
      console.warn(`Error de redacción en ${provider.name}: ${err.message}`);
    }
  }

  const responseTimeMs = Date.now() - startTime;

  if (successfulProvider && draftedJSON) {
    updateProviderStats(successfulProvider.id, finalTokens);
    logSystemAction(
      usuario || 'Usuario',
      'Redacción IA',
      `Redacción automatizada de "${docType}" completada con ${successfulProvider.name}.${isOptimized ? ' [Optimización de hojas activa (>5 hojas)]' : ''}`,
      'success',
      {
        providerAttempted: attempted,
        providerSucceeded: successfulProvider.id,
        tokensUsed: finalTokens,
        responseTimeMs,
        isOptimized,
        originalPageCount
      }
    );

    return res.json({
      success: true,
      data: draftedJSON,
      ia_utilizada: `${successfulProvider.name} (${successfulProvider.modelName})`,
      attempted,
      responseTimeMs,
      tokens: finalTokens,
      isOptimized,
      originalPageCount
    });
  }

  logSystemAction(
    usuario || 'Usuario',
    'Redacción Fallida',
    `Fallo al intentar redactar el tipo "${docType}". Todos los proveedores fallaron.`,
    'error',
    { providerAttempted: attempted }
  );

  return res.status(502).json({
    error: 'Todos los proveedores de IA fallaron al redactar el documento.',
    attempted
  });
});

// -----------------------------------------------------------------
// API ROUTES: AGENDA MANAGEMENT
// -----------------------------------------------------------------

app.get('/api/agenda', (req, res) => {
  res.json(db.getAgenda());
});

app.post('/api/agenda', async (req, res) => {
  const { title, fecha, tipo, descripcion, enlace, creadoPor } = req.body;
  if (!title || !fecha || !tipo) {
    return res.status(400).json({ error: 'El título, fecha y tipo son obligatorios.' });
  }

  const newEvent = {
    id: `evt-${Date.now()}`,
    title,
    fecha,
    tipo,
    descripcion: descripcion || '',
    enlace: enlace || '',
    completado: false,
    creadoPor: creadoPor || 'Usuario',
    fechaCreacion: new Date().toISOString()
  };

  await db.addAgendaEvent(newEvent);
  logSystemAction(creadoPor || 'Usuario', 'Creación de Agenda', `Nuevo evento programado: "${title}" de tipo ${tipo}.`, 'info');
  res.json(newEvent);
});

app.put('/api/agenda/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const updatedEvent = await db.updateAgendaEvent(id, updates);
  if (updatedEvent) {
    logSystemAction(updates.creadoPor || 'Usuario', 'Agenda Modificada', `Evento "${updatedEvent.title}" fue actualizado (Completado: ${updatedEvent.completado}).`, 'info');
    return res.json(updatedEvent);
  }
  return res.status(404).json({ error: 'Evento de agenda no encontrado.' });
});

app.delete('/api/agenda/:id', async (req, res) => {
  const { id } = req.params;
  const event = db.getAgenda().find(e => e.id === id);
  const success = await db.deleteAgendaEvent(id);

  if (success && event) {
    logSystemAction('Usuario', 'Agenda Eliminada', `Evento "${event.title}" fue removido de la agenda.`, 'warning');
    return res.json({ success: true });
  }
  return res.status(404).json({ error: 'Evento no encontrado.' });
});

// -----------------------------------------------------------------
// API ROUTES: ADMIN CONNECTIONS & DOCUMENT STATISTICS
// -----------------------------------------------------------------

app.get('/api/admin/connections-stats', (req, res) => {
  if (!checkIsAdmin(req)) {
    return res.status(403).json({ error: 'Acceso denegado. Solo administradores pueden ver estadísticas de conexión.' });
  }

  // 1. Get active connections
  const activeConnections = Array.from(connectedUsersMap.values()).sort(
    (a, b) => new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime()
  );

  // 2. Compute document statistics
  const docs = db.getDocuments();
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
  
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(now.getDate() - 7);
  
  const oneMonthAgo = new Date();
  oneMonthAgo.setDate(now.getDate() - 30);

  let docsToday = 0;
  let docsWeek = 0;
  let docsMonth = 0;
  const docsAllTime = docs.length;

  // Track document count per user for detail list
  const userStatsMap = new Map<string, { today: number; week: number; month: number; total: number }>();

  // Pre-seed known users
  db.getUsers().forEach(u => {
    userStatsMap.set(u.name, { today: 0, week: 0, month: 0, total: 0 });
  });

  docs.forEach((doc) => {
    const docDate = new Date(doc.fechaProceso);
    const createdBy = doc.creadoPor || 'Desconocido';
    
    let isToday = false;
    let isWeek = false;
    let isMonth = false;

    if (doc.fechaProceso && doc.fechaProceso.startsWith(todayStr)) {
      docsToday++;
      isToday = true;
    }
    if (docDate >= oneWeekAgo) {
      docsWeek++;
      isWeek = true;
    }
    if (docDate >= oneMonthAgo) {
      docsMonth++;
      isMonth = true;
    }

    // Accumulate in user stats
    const stats = userStatsMap.get(createdBy) || { today: 0, week: 0, month: 0, total: 0 };
    stats.total++;
    if (isToday) stats.today++;
    if (isWeek) stats.week++;
    if (isMonth) stats.month++;
    userStatsMap.set(createdBy, stats);
  });

  const userStats = Array.from(userStatsMap.entries()).map(([name, stats]) => ({
    name,
    ...stats
  }));

  res.json({
    activeConnections,
    stats: {
      today: docsToday,
      week: docsWeek,
      month: docsMonth,
      allTime: docsAllTime
    },
    userStats
  });
});

// -----------------------------------------------------------------
// API ROUTES: AI ADMINISTRATIVE ERROR DETECTOR
// -----------------------------------------------------------------

app.post('/api/ai/detect-errors', async (req, res) => {
  const { draftText, docType, expediente, referencia, asunto, destinatario, cargoDestinatario, usuario } = req.body;
  
  if (!draftText) {
    return res.status(400).json({ error: 'El texto del borrador es obligatorio para analizar.' });
  }

  const ai = getGeminiClient(db.getProviders().find(p => p.id === 'gemini')?.apiKey);
  // If Gemini client is ready, perform dynamic AI auditing
  if (ai) {
    try {
      const systemInstruction = `Eres un auditor legal y especialista en Control Institucional de la UGEL Bellavista, experto en Normativa de Redacción Pública del Perú y Directivas de Simplificación Administrativa.
Analiza el borrador del documento administrativo provisto en busca de:
1. Errores de coherencia (datos inconsistentes, contradicciones, incoherencias con las oficinas indicadas en la referencia o expediente).
2. Errores ortográficos, gramaticales o de sintaxis.
3. Tono inadecuado o poco formal.
4. Ausencia de secciones vitales (como antecedentes en informes técnicos, o partes resolutivas detalladas).
5. Errores de competencia o mezcla temática (por ejemplo, si menciona Racionalización de Plazas y propone derivar indebidamente a Presupuesto cuando corresponde a Personal o AGI).

De ser posible, busca frases exactas del borrador para proponer como "targetText" y su versión corregida como "replacementText" para que el usuario pueda presionar un botón y auto-corregir el editor de texto.

Responde estrictamente en formato JSON con la siguiente estructura:
{
  "errors": [
    {
      "id": "string único",
      "gravedad": "Crítico" | "Advertencia" | "Sugerencia",
      "seccion": "Formato" | "Coherencia" | "Sintaxis" | "Normativa",
      "descripcion": "Explicación breve del error",
      "sugerencia": "Propuesta detallada de corrección",
      "targetText": "frase exacta a buscar en el borrador (opcional)",
      "replacementText": "frase de reemplazo sugerida (opcional)"
    }
  ]
}`;

      const userPrompt = `
TIPO DE DOCUMENTO: ${docType || 'No especificado'}
EXPEDIENTE: ${expediente || 'No especificado'}
REFERENCIA: ${referencia || 'No especificado'}
ASUNTO: ${asunto || 'No especificado'}
DESTINATARIO: ${destinatario || 'No especificado'} (${cargoDestinatario || ''})
FIRMADO POR: ${usuario || 'Usuario'}

TEXTO DEL BORRADOR PARA ANALIZAR:
"""
${draftText}
"""
`;

      const response = await generateContentWithFallback(ai, {
        contents: `${systemInstruction}\n\n${userPrompt}`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              errors: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    gravedad: { type: Type.STRING },
                    seccion: { type: Type.STRING },
                    descripcion: { type: Type.STRING },
                    sugerencia: { type: Type.STRING },
                    targetText: { type: Type.STRING },
                    replacementText: { type: Type.STRING }
                  },
                  required: ['id', 'gravedad', 'seccion', 'descripcion', 'sugerencia']
                }
              }
            },
            required: ['errors']
          }
        }
      });

      const result = JSON.parse(response.text || '{"errors":[]}');
      return res.json(result);
    } catch (err: any) {
      console.error('Error analyzing draft with Gemini:', err);
    }
  }

  // Deterministic Local Fallback Auditor Mode (Very precise institutional checks)
  const errors: any[] = [];
  
  // Rule 1: Typo checks
  if (draftText.toLowerCase().includes('infraestrucura')) {
    errors.push({
      id: 'err-off-1',
      gravedad: 'Advertencia',
      seccion: 'Sintaxis',
      descripcion: 'Posible error de ortografía en la palabra "infraestrucura".',
      sugerencia: 'Escribir "infraestructura" correctamente.',
      targetText: 'infraestrucura',
      replacementText: 'infraestructura'
    });
  }

  // Rule 2: Document constraints
  if (docType === 'Informe Técnico' && !draftText.includes('I. ANTECEDENTES') && !draftText.includes('ANTECEDENTES')) {
    errors.push({
      id: 'err-off-2',
      gravedad: 'Crítico',
      seccion: 'Formato',
      descripcion: 'El documento es un "Informe Técnico" pero no contiene la sección estándar y obligatoria de "I. ANTECEDENTES".',
      sugerencia: 'Agregue la sección de Antecedentes en mayúscula y negrita para dar validez formal al informe técnico.'
    });
  }

  if (docType === 'Informe' && draftText.includes('I. ANTECEDENTES')) {
    errors.push({
      id: 'err-off-3',
      gravedad: 'Sugerencia',
      seccion: 'Formato',
      descripcion: 'El documento es un "Informe" común (no técnico) pero contiene separaciones rígidas de estilo romano.',
      sugerencia: 'Considere remover la cabecera "I. ANTECEDENTES" y redactar en párrafos continuos fluidos, sin divisiones rígidas.'
    });
  }

  // Rule 3: Expediente verification
  if (expediente && expediente.trim().length > 0 && !draftText.includes(expediente)) {
    errors.push({
      id: 'err-off-4',
      gravedad: 'Advertencia',
      seccion: 'Coherencia',
      descripcion: `El borrador no hace referencia al número de expediente ingresado (${expediente}) en su cuerpo de texto.`,
      sugerencia: `Incorpore el código de expediente ${expediente} en el primer párrafo para garantizar la trazabilidad legal del trámite.`,
      targetText: 'Por medio de la presente',
      replacementText: `En relación al expediente ${expediente}, por medio de la presente`
    });
  }

  // Rule 4: Atentamente signature
  if (!draftText.toLowerCase().includes('atentamente') && !draftText.toLowerCase().includes('atentamente,')) {
    errors.push({
      id: 'err-off-5',
      gravedad: 'Sugerencia',
      seccion: 'Formato',
      descripcion: 'No se detecta un cierre formal clásico (como "Atentamente," o "Es todo cuanto tengo que informar a usted").',
      sugerencia: 'Aunque el sistema genera el pie de firma, asegúrese de redactar una fórmula de cierre profesional al final.'
    });
  }

  // Rule 5: Recipient check
  if (destinatario && !draftText.toUpperCase().includes(destinatario.toUpperCase().split(' ')[0])) {
    errors.push({
      id: 'err-off-6',
      gravedad: 'Advertencia',
      seccion: 'Coherencia',
      descripcion: `El nombre del destinatario ("${destinatario}") no figura mencionado en el borrador redactado.`,
      sugerencia: 'Es recomendable dirigir formalmente los párrafos iniciales de sustento al destinatario.'
    });
  }

  res.json({ errors });
});

// Global Error Handling Middleware to guarantee JSON error responses
app.use((err: any, req: any, res: any, next: any) => {
  console.error('Unhandled Server Error:', err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: err.message || 'Error interno del servidor',
    success: false
  });
});

// -----------------------------------------------------------------
// EXPORT
// The Vercel serverless entry point is api/index.ts.
// Local development (with Vite) is handled by dev.ts.
// -----------------------------------------------------------------
export default app;
