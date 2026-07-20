import React, { useState, useEffect } from 'react';
import { Shield, Sparkles, AlertCircle, FileText, Bot, ArrowRight, UserCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { User } from '../types';
import { safeStorage } from '../utils/storage';

interface LoginProps {
  onLoginSuccess: (token: string, user: User) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<'user' | 'pass' | null>(null);

  // Quick-login shortcuts
  const quickUsers = [
    { username: '74223117', label: 'Admin (74223117)', role: 'Administrador', pass: '101296' },
    { username: 'secretaria', label: 'Secretaria', role: 'Secretaria', pass: '123456' },
    { username: 'jefe', label: 'Jefe', role: 'Jefe', pass: '123456' },
    { username: 'consulta', label: 'Consulta', role: 'Consulta', pass: '123456' },
  ];

  // Auto-fill from localStorage on mount if "Remember Me" was checked previously
  useEffect(() => {
    const savedUser = safeStorage.getItem('saved_doc_username');
    if (savedUser) {
      setUsername(savedUser);
      setRememberMe(true);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Por favor ingrese su usuario.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim().toLowerCase(), password }),
      });

      const contentType = response.headers.get('content-type') || '';
      let data: any = {};
      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        throw new Error(
          response.status === 503 || response.status === 500
            ? 'Error de conexión a la base de datos en Vercel. Asegúrese de haber configurado la variable DATABASE_URL en Vercel -> Settings -> Environment Variables.'
            : `Respuesta no válida del servidor (${response.status}): ${text.slice(0, 100)}`
        );
      }

      if (!response.ok) {
        throw new Error(data.error || data.detalle || 'Credenciales inválidas.');
      }

      if (rememberMe) {
        safeStorage.setItem('saved_doc_username', username.trim().toLowerCase());
      } else {
        safeStorage.removeItem('saved_doc_username');
      }

      onLoginSuccess(data.token, data.user);
    } catch (err: any) {
      setError(err.message || 'Error de conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-slate-950 overflow-hidden font-sans">
      {/* Dynamic Ambient Glow Backdrops */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] animate-pulse-slow"></div>
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[150px] animate-pulse-slow"></div>

      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:32px_32px]"></div>

      <div className="relative z-10 w-full max-w-5xl mx-auto px-4 grid md:grid-cols-12 gap-8 items-center" id="login_grid">
        
        {/* Left Side: Premium SVG 3D Illustration & Branding */}
        <div className="md:col-span-6 flex flex-col justify-center space-y-6 text-white text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 self-center md:self-start rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold backdrop-blur-md">
            <Sparkles size={13} className="animate-spin-slow" />
            <span>Gestión Documental Inteligente con IA v2.5</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-indigo-200 leading-tight">
            Gestión de Documentos <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
              Multi-Proveedor IA
            </span>
          </h1>

          <p className="text-sm text-slate-400 max-w-md leading-relaxed">
            Plataforma corporativa premium para OCR automático, redacción automatizada y gestión con conmutación inteligente por fallas entre proveedores de IA.
          </p>

          {/* Floating Premium Document Illustration */}
          <div className="relative w-full max-w-[360px] aspect-square mx-auto md:mx-0 flex items-center justify-center animate-float-premium">
            <svg viewBox="0 0 400 400" className="w-full h-full">
              {/* Outer Glow Ring */}
              <circle cx="200" cy="200" r="160" fill="none" stroke="url(#glowGradient)" strokeWidth="1" strokeDasharray="6 6" opacity="0.4" />
              {/* Core AI Node */}
              <circle cx="200" cy="180" r="50" fill="url(#coreGradient)" className="filter drop-shadow-[0_0_25px_rgba(99,102,241,0.5)]" />
              <path d="M190 165l25 15-25 15v-30z" fill="#fff" />
              
              {/* Provider Nodes */}
              {/* Groq */}
              <circle cx="90" cy="110" r="22" fill="#1e1e38" stroke="#6366f1" strokeWidth="1.5" />
              <text x="90" y="114" fill="#818cf8" fontSize="10" textAnchor="middle" fontFamily="monospace">Groq</text>
              <line x1="112" y1="125" x2="160" y2="160" stroke="#6366f1" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />

              {/* Gemini */}
              <circle cx="310" cy="110" r="22" fill="#1e1e38" stroke="#a855f7" strokeWidth="1.5" />
              <text x="310" y="114" fill="#c084fc" fontSize="10" textAnchor="middle" fontFamily="monospace">Gem</text>
              <line x1="288" y1="125" x2="240" y2="160" stroke="#a855f7" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />

              {/* OpenAI */}
              <circle cx="90" cy="250" r="22" fill="#1e1e38" stroke="#10b981" strokeWidth="1.5" />
              <text x="90" y="254" fill="#34d399" fontSize="10" textAnchor="middle" fontFamily="monospace">GPT</text>
              <line x1="112" y1="235" x2="160" y2="200" stroke="#10b981" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />

              {/* Claude */}
              <circle cx="310" cy="250" r="22" fill="#1e1e38" stroke="#f97316" strokeWidth="1.5" />
              <text x="310" y="254" fill="#fb923c" fontSize="10" textAnchor="middle" fontFamily="monospace">Claude</text>
              <line x1="288" y1="235" x2="240" y2="200" stroke="#f97316" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />

              {/* Central Floating Document Sheet */}
              <g transform="translate(160, 240)" className="filter drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]">
                <rect x="0" y="0" width="80" height="100" rx="6" fill="#1e293b" stroke="#475569" strokeWidth="1.5" />
                <rect x="12" y="15" width="56" height="6" rx="2" fill="#6366f1" />
                <rect x="12" y="30" width="40" height="4" rx="2" fill="#94a3b8" />
                <rect x="12" y="42" width="56" height="4" rx="2" fill="#94a3b8" />
                <rect x="12" y="54" width="48" height="4" rx="2" fill="#94a3b8" />
                <rect x="12" y="66" width="30" height="4" rx="2" fill="#a855f7" />
                {/* Micro spark */}
                <path d="M64 80l4 4-4 4-4-4z" fill="#f59e0b" />
              </g>

              {/* Floating particles */}
              <circle cx="200" cy="50" r="3" fill="#38bdf8" opacity="0.8" />
              <circle cx="150" cy="330" r="4" fill="#c084fc" opacity="0.5" />
              <circle cx="280" cy="310" r="2" fill="#fb7185" opacity="0.6" />

              <defs>
                <linearGradient id="glowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#a855f7" stopOpacity="0.2" />
                </linearGradient>
                <linearGradient id="coreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#4f46e5" />
                  <stop offset="100%" stopColor="#7c3aed" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>

        {/* Right Side: Glassmorphic Login Form */}
        <div className="md:col-span-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md mx-auto p-8 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl shadow-2xl relative"
            id="login_card"
          >
            {/* Fluid/Neon accent border top */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-t-2xl"></div>

            <div className="flex flex-col space-y-2 mb-6 text-center md:text-left">
              <h2 className="text-2xl font-semibold text-white tracking-tight">
                Acceso Institucional
              </h2>
              <p className="text-xs text-slate-400">
                Ingrese sus credenciales de seguridad asignadas
              </p>
            </div>

            {error && (
              <div className="mb-4 flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                <AlertCircle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              {/* Username Input */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-300">Usuario</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                    <Shield size={16} className={focusedField === 'user' ? 'text-indigo-400' : ''} />
                  </span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onFocus={() => setFocusedField('user')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="Ej. admin o secretaria"
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-950/80 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white text-sm transition-all outline-none"
                    autoFocus
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-300">Contraseña</label>
                  <button 
                    type="button" 
                    onClick={() => alert('Para este demo, use los botones de ingreso rápido para loguearse al instante sin contraseña.')}
                    className="text-[10px] text-indigo-400 hover:underline hover:text-indigo-300"
                  >
                    ¿Olvidó contraseña?
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                    <Bot size={16} className={focusedField === 'pass' ? 'text-purple-400' : ''} />
                  </span>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocusedField('pass')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-950/80 border border-slate-800 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-white text-sm transition-all outline-none"
                  />
                </div>
              </div>

              {/* Remember Me Toggle */}
              <div className="flex items-center justify-between py-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-800 text-indigo-500 focus:ring-0 focus:ring-offset-0 w-4 h-4 cursor-pointer"
                  />
                  <span className="text-xs text-slate-400">Recordar mi usuario</span>
                </label>
              </div>

              {/* Liquid-Neon Glowing Button */}
              <button
                type="submit"
                disabled={loading}
                className="relative w-full overflow-hidden rounded-lg p-[1.5px] focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-transform active:scale-[0.98]"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 animate-pulse"></span>
                <span className="relative flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-slate-950 hover:bg-slate-900 text-white text-sm font-semibold transition-all">
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <span>Autenticar Acceso</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </span>
              </button>
            </form>

            {/* Quick Demo Logins Selection */}
            <div className="mt-6 pt-6 border-t border-slate-800/80">
              <div className="flex items-center gap-1.5 mb-3 text-slate-400 text-xs">
                <UserCheck size={13} className="text-indigo-400" />
                <span>Accesos rápidos para pruebas:</span>
              </div>
              <div className="grid grid-cols-2 gap-2" id="quick_logins">
                {quickUsers.map((item) => (
                  <button
                    key={item.username}
                    type="button"
                    onClick={() => {
                      setUsername(item.username);
                      setPassword(item.pass);
                      // Auto trigger submitting for fluid demo experience
                      setTimeout(() => {
                        setUsername(item.username);
                        setPassword(item.pass);
                      }, 50);
                    }}
                    className="flex flex-col items-start p-2 rounded-lg bg-slate-950/50 hover:bg-slate-950 border border-slate-800 hover:border-slate-700 text-left transition-all group"
                  >
                    <span className="text-xs font-semibold text-slate-200 group-hover:text-indigo-400">
                      {item.label}
                    </span>
                    <span className="text-[10px] text-slate-500 leading-none">
                      {item.role}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </div>

      </div>
    </div>
  );
}
