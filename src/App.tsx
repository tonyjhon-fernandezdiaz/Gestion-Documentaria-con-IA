import React, { useState, useEffect } from 'react';
import { Sparkles, Bot, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { safeStorage } from './utils/storage';

// Domain components
import Login from './components/Login';
import Sidebar, { SidebarTab } from './components/Sidebar';
import DashboardView from './components/DashboardView';
import DocumentsView from './components/DocumentsView';
import UploadView from './components/UploadView';
import PromptConfigView from './components/PromptConfigView';
import ConfigView from './components/ConfigView';
import LogsView from './components/LogsView';
import OrganigramaView from './components/OrganigramaView';

// Domain types
import { User, Document, AIProvider, PromptTemplate, SystemLog } from './types';

export default function App() {
  const [token, setToken] = useState<string | null>(safeStorage.getItem('saved_session_token'));
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(!!token);

  // Global State Stores
  const [currentTab, setCurrentTab] = useState<SidebarTab>('inicio');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [prompts, setPrompts] = useState<PromptTemplate[]>([]);
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [logs, setLogs] = useState<SystemLog[]>([]);
  
  // Theme state (modo claro por defecto)
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [currentTheme, setCurrentTheme] = useState<string>('predeterminado');
  const [showMascotBubble, setShowMascotBubble] = useState<boolean>(true);

  // Fetch active visual theme
  useEffect(() => {
    fetch('/api/config/theme')
      .then(res => res.json())
      .then(data => {
        if (data.theme) {
          setCurrentTheme(data.theme);
        }
      })
      .catch(err => console.error('Error loading active visual theme:', err));
  }, []);

  // Initialize Dark Theme
  useEffect(() => {
    const root = window.document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [darkMode]);

  // Auth Verification on mount or token changes
  useEffect(() => {
    if (token) {
      fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then((res) => {
          if (!res.ok) throw new Error('Sesión inválida.');
          return res.json();
        })
        .then((data) => {
          setCurrentUser(data.user);
          // Redirect if non-admin lands on 'inicio'
          if (data.user.role !== 'Administrador') {
            if (data.user.role === 'Secretaria') {
              setCurrentTab('subir');
            } else {
              setCurrentTab('documentos');
            }
          }
          // Load system data stores once authenticated
          fetchSystemData();
        })
        .catch(() => {
          // Clear session on failure
          handleLogout();
        })
        .finally(() => {
          setCheckingAuth(false);
        });
    } else {
      setCheckingAuth(false);
    }
  }, [token]);

  // Sync state data from API endpoints
  const fetchSystemData = async () => {
    try {
      const [docsRes, promptsRes, providersRes, logsRes] = await Promise.all([
        fetch('/api/documents'),
        fetch('/api/prompts'),
        fetch('/api/providers'),
        fetch('/api/logs')
      ]);

      if (docsRes.ok) setDocuments(await docsRes.json());
      if (promptsRes.ok) setPrompts(await promptsRes.json());
      if (providersRes.ok) setProviders(await providersRes.json());
      if (logsRes.ok) setLogs(await logsRes.json());
    } catch (err) {
      console.error('Error fetching system parameters:', err);
    }
  };

  const handleLoginSuccess = (newToken: string, user: User) => {
    safeStorage.setItem('saved_session_token', newToken);
    setToken(newToken);
    setCurrentUser(user);
    if (user.role === 'Administrador') {
      setCurrentTab('inicio');
    } else if (user.role === 'Secretaria') {
      setCurrentTab('subir');
    } else {
      setCurrentTab('documentos');
    }
  };

  const handleLogout = async () => {
    if (currentUser) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: currentUser.name })
        });
      } catch (e) {
        console.error(e);
      }
    }
    safeStorage.removeItem('saved_session_token');
    setToken(null);
    setCurrentUser(null);
  };

  // Callback utilities called from subviews to update global state
  const handleUpdateDocumentStatus = async (id: string, state: 'Aprobado' | 'Rechazado' | 'Pendiente') => {
    try {
      const response = await fetch(`/api/documents/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          estado: state,
          usuarioModificacion: currentUser?.name || 'Administrador'
        })
      });

      if (response.ok) {
        const updatedDoc = await response.json();
        // Update local state list
        setDocuments(prev => prev.map(d => d.id === id ? updatedDoc : d));
        // Refresh system audit logs
        fetchSystemLogs();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteDocument = async (id: string) => {
    try {
      const response = await fetch(`/api/documents/${id}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        setDocuments(prev => prev.filter(d => d.id !== id));
        fetchSystemLogs();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdatePromptInState = (id: string, updatedPrompt: string) => {
    setPrompts(prev => prev.map(p => {
      if (p.id === id) {
        const nextVersion = p.version + 1;
        return {
          ...p,
          prompt: updatedPrompt,
          version: nextVersion,
          historial: [
            {
              version: nextVersion,
              prompt: updatedPrompt,
              fecha: new Date().toISOString(),
              modificadoPor: currentUser?.name || 'Admin'
            },
            ...p.historial
          ]
        };
      }
      return p;
    }));
    fetchSystemLogs();
  };

  const handleUpdateProvidersInState = (updatedList: AIProvider[]) => {
    setProviders(updatedList);
    fetchSystemLogs();
  };

  const fetchSystemLogs = () => {
    fetch('/api/logs')
      .then(res => res.json())
      .then(data => setLogs(data))
      .catch(e => console.error(e));
  };

  const fetchDocuments = () => {
    fetch('/api/documents')
      .then(res => res.json())
      .then(data => setDocuments(data))
      .catch(e => console.error(e));
  };

  // Active View Router switcher
  const renderActiveTabContent = () => {
    if (!currentUser) return null;

    switch (currentTab) {
      case 'inicio':
        return (
          <DashboardView 
            documents={documents} 
            logs={logs} 
            onNavigate={(tab) => setCurrentTab(tab)} 
          />
        );
      case 'documentos':
        return (
          <DocumentsView 
            documents={documents} 
            currentUser={currentUser} 
            onUpdateStatus={handleUpdateDocumentStatus}
            onDelete={handleDeleteDocument}
          />
        );
      case 'subir':
        // Filter: only allow admin or secretary
        if (!['Administrador', 'Secretaria'].includes(currentUser.role)) {
          return <RoleUnauthorizedBlock />;
        }
        return (
          <UploadView 
            currentUser={currentUser} 
            onDocumentAdded={() => {
              fetchDocuments();
              fetchSystemLogs();
            }} 
          />
        );
      case 'prompts':
        if (!['Administrador', 'Jefe'].includes(currentUser.role)) {
          return <RoleUnauthorizedBlock />;
        }
        return (
          <PromptConfigView 
            prompts={prompts} 
            currentUser={currentUser}
            onUpdatePrompt={handleUpdatePromptInState}
          />
        );
      case 'config':
        return (
          <ConfigView 
            providers={providers} 
            currentUser={currentUser} 
            onUpdateProviders={handleUpdateProvidersInState}
            logs={logs}
            currentTheme={currentTheme}
            onThemeChanged={(theme) => setCurrentTheme(theme)}
          />
        );
      case 'organigrama':
        return (
          <OrganigramaView />
        );
      default:
        return (
          <div className="p-8 text-center text-slate-500 font-mono text-xs">
            Módulo en desarrollo o inaccesible.
          </div>
        );
    }
  };

  // Helper to obtain theme classes
  const getThemeClasses = (themeId: string) => {
    switch (themeId) {
      case 'nubes':
        return {
          font: 'font-outfit',
          bg: 'bg-gradient-to-b from-sky-50 to-white dark:from-slate-950 dark:to-sky-950/20 text-slate-800 dark:text-slate-100',
          card: 'bg-white/85 dark:bg-slate-900/90 backdrop-blur border-sky-100/55 dark:border-sky-950/50'
        };
      case 'neon':
        return {
          font: 'font-mono tracking-tight',
          bg: 'bg-slate-950 text-cyan-400 bg-cyber-grid border-cyan-500/20',
          card: 'bg-slate-950/90 dark:bg-slate-950/95 border-fuchsia-500/35 shadow-[0_0_15px_rgba(217,70,239,0.15)]'
        };
      case 'bosque':
        return {
          font: 'font-playfair text-[15px]',
          bg: 'bg-stone-50 dark:bg-stone-950 text-stone-800 dark:text-stone-100',
          card: 'bg-stone-100/80 dark:bg-stone-900/80 border-emerald-800/10 dark:border-stone-800'
        };
      case 'galaxy':
        return {
          font: 'font-space',
          bg: 'bg-slate-950 text-indigo-100 bg-radial-at-b from-purple-950/20 to-transparent',
          card: 'bg-slate-900/75 dark:bg-slate-950/80 backdrop-blur-md border-indigo-500/20'
        };
      case 'predeterminado':
      default:
        return {
          font: 'font-sans',
          bg: 'bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-200',
          card: 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800/80'
        };
    }
  };

  const themeClasses = getThemeClasses(currentTheme);

  // Auth processing loader splash screen
  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center font-sans">
        <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-xs text-indigo-400 font-bold tracking-widest uppercase">
          Verificando credenciales de seguridad...
        </p>
      </div>
    );
  }

  // Not logged in: Show premium login card
  if (!currentUser) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className={`flex min-h-screen transition-all duration-500 relative overflow-hidden theme-${currentTheme} ${themeClasses.bg} ${themeClasses.font}`}>
      
      {/* Background Animated Elements based on Visual Theme (Pinterest style) */}
      {currentTheme === 'nubes' && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0 opacity-55">
          {/* Drifting Clouds */}
          <div className="absolute top-[8%] left-[5%] w-48 h-16 bg-white/70 dark:bg-sky-200/20 rounded-full blur-[2px] animate-clouds-slow"></div>
          <div className="absolute top-[45%] left-[55%] w-56 h-20 bg-white/60 dark:bg-sky-200/10 rounded-full blur-[3px] animate-clouds-reverse"></div>
          <div className="absolute bottom-[15%] left-[15%] w-36 h-12 bg-white/70 dark:bg-sky-200/20 rounded-full blur-[1px] animate-clouds-slow"></div>
          
          {/* Floating Pastel Soft Circles */}
          <div className="absolute top-[20%] left-[30%] w-24 h-24 rounded-full bg-sky-200/20 blur-[8px] animate-float-slow"></div>
          <div className="absolute bottom-[30%] left-[75%] w-32 h-32 rounded-full bg-pink-100/20 blur-[12px] animate-float-slow" style={{ animationDelay: '3s' }}></div>
          <div className="absolute top-[60%] left-[10%] w-16 h-16 rounded-full bg-indigo-100/15 blur-[6px] animate-float-slow" style={{ animationDelay: '1.5s' }}></div>
        </div>
      )}

      {currentTheme === 'neon' && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0">
          {/* Glowing laser scanning beam */}
          <div className="absolute inset-x-0 h-1 bg-cyan-500/25 shadow-[0_0_15px_#06b6d4,0_0_30px_#06b6d4] animate-scanline"></div>
          
          {/* Moving Cyberpunk wireframe geometric figures */}
          <div className="absolute top-[15%] left-[15%] w-16 h-16 border border-cyan-400/25 rounded-lg rotate-12 animate-spin-slow"></div>
          <div className="absolute bottom-[25%] left-[65%] w-24 h-24 border border-fuchsia-500/20 rounded-xl rotate-45 animate-float-slow" style={{ animationDelay: '2s' }}></div>
          <div className="absolute top-[50%] left-[80%] w-12 h-12 border border-cyan-400/20 rounded-full animate-pulse-glow"></div>
          <div className="absolute bottom-[10%] left-[25%] w-20 h-20 border border-fuchsia-500/15 rounded-lg -rotate-12 animate-spin-slow" style={{ animationDelay: '4s' }}></div>
          
          {/* Tech crosshairs */}
          <div className="absolute top-[35%] left-[45%] text-cyan-400/10 text-xl font-bold animate-pulse">+</div>
          <div className="absolute bottom-[40%] left-[15%] text-fuchsia-500/10 text-2xl font-bold animate-pulse" style={{ animationDelay: '2.5s' }}>+</div>
        </div>
      )}

      {currentTheme === 'bosque' && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0 opacity-80">
          {/* Flickering diagonal fireflies */}
          <span className="absolute top-[25%] left-[12%] w-3.5 h-3.5 bg-yellow-400/50 rounded-full blur-[1.5px] animate-firefly-1"></span>
          <span className="absolute top-[58%] left-[76%] w-2.5 h-2.5 bg-amber-400/60 rounded-full blur-[1px] animate-firefly-2"></span>
          <span className="absolute bottom-[20%] left-[38%] w-3 h-3 bg-orange-400/40 rounded-full blur-[2px] animate-firefly-3"></span>
          <span className="absolute top-[40%] left-[48%] w-2 h-2 bg-emerald-400/50 rounded-full blur-[1px] animate-firefly-2" style={{ animationDelay: '4.5s' }}></span>
          
          {/* Earthy floating organic rings */}
          <div className="absolute top-[10%] left-[65%] w-48 h-48 rounded-full border border-emerald-800/5 dark:border-emerald-500/5 animate-spin-slow"></div>
          <div className="absolute bottom-[15%] left-[5%] w-36 h-36 rounded-full border border-amber-600/5 dark:border-amber-500/5 animate-float-slow"></div>
        </div>
      )}

      {currentTheme === 'galaxy' && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0">
          {/* Twinkling Space Starfield */}
          <div className="absolute top-[12%] left-[18%] w-1.5 h-1.5 bg-white rounded-full animate-twinkle"></div>
          <div className="absolute top-[48%] left-[72%] w-2 h-2 bg-white rounded-full animate-twinkle" style={{ animationDelay: '1.5s' }}></div>
          <div className="absolute bottom-[22%] left-[45%] w-1 h-1 bg-white rounded-full animate-twinkle" style={{ animationDelay: '3s' }}></div>
          <div className="absolute bottom-[55%] left-[12%] w-1.5 h-1.5 bg-violet-400 rounded-full animate-twinkle" style={{ animationDelay: '0.8s' }}></div>
          <div className="absolute top-[30%] left-[85%] w-1 h-1 bg-purple-300 rounded-full animate-twinkle" style={{ animationDelay: '2.2s' }}></div>
          <div className="absolute bottom-[10%] left-[90%] w-2 h-2 bg-white rounded-full animate-twinkle" style={{ animationDelay: '4s' }}></div>
          
          {/* Large purple space nebulae glowing spheres */}
          <div className="absolute top-[15%] left-[60%] w-64 h-64 rounded-full bg-purple-700/10 blur-[80px] animate-pulse-glow"></div>
          <div className="absolute bottom-[20%] left-[10%] w-80 h-80 rounded-full bg-indigo-700/10 blur-[100px] animate-pulse-glow" style={{ animationDelay: '3s' }}></div>
          
          {/* Shooting stars */}
          <div className="absolute top-[5%] left-[20%] w-24 h-[1.5px] bg-gradient-to-r from-violet-400 to-transparent animate-shooting-star"></div>
          <div className="absolute top-[40%] left-[50%] w-32 h-[1.5px] bg-gradient-to-r from-indigo-400 to-transparent animate-shooting-star-delayed"></div>
        </div>
      )}

      {/* Navigation rail sidebar */}
      <Sidebar 
        currentTab={currentTab} 
        onTabChange={setCurrentTab} 
        currentUser={currentUser} 
        onLogout={handleLogout}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
      />

      {/* Main Content Workspace viewport */}
      <main className="flex-1 p-8 overflow-y-auto max-h-screen relative z-10">
        <motion.div 
          key={currentTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="max-w-6xl mx-auto"
        >
          {renderActiveTabContent()}
        </motion.div>
      </main>

      {/* Floating Interactive Theme Mascot (Assistant) */}
      {currentTheme !== 'predeterminado' && (
        <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2 group pointer-events-auto">
          {/* Speech bubble / Recordatorios panel */}
          {showMascotBubble && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="max-w-[280px] p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xl text-[11px] text-slate-700 dark:text-slate-300 relative select-none font-sans space-y-3"
            >
              {/* Header */}
              <div className="font-extrabold text-indigo-600 dark:text-indigo-400 uppercase text-[9px] tracking-wider pb-1.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping"></span>
                  {currentTheme === 'nubes' && 'Asistente: Nubis ☁️'}
                  {currentTheme === 'neon' && 'Soporte: Cyber-V2 🤖'}
                  {currentTheme === 'bosque' && 'Saber: Paco la Llama 🦙'}
                  {currentTheme === 'galaxy' && 'Misión: AstroBoy 🚀'}
                </span>
                <span className="text-[8px] text-slate-400">UGEL Bellavista</span>
              </div>

              {/* Content */}
              <div className="py-1 text-center text-slate-600 dark:text-slate-300 space-y-1">
                <p className="font-bold">¡Hola, {currentUser?.name}!</p>
                <p className="text-[10px] leading-relaxed">¿Listo para redactar documentos oficiales hoy? Haz clic en "Nuevo Documento" para comenzar.</p>
              </div>

              {/* Bubble tail */}
              <div className="absolute bottom-[-6px] right-6 w-3 h-3 bg-white dark:bg-slate-900 border-r border-b border-slate-200/80 dark:border-slate-800 transform rotate-45"></div>
            </motion.div>
          )}

          {/* Mascot avatar button */}
          <button 
            onClick={() => setShowMascotBubble(!showMascotBubble)}
            className="w-16 h-16 rounded-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center p-1.5 relative overflow-hidden group animate-float-mascot"
            title="Haz clic para conversar con el asistente"
          >
            <div className="absolute inset-0 bg-indigo-500/5 group-hover:bg-indigo-500/10 transition-colors"></div>
            
            {currentTheme === 'nubes' && (
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <defs>
                  <linearGradient id="cloudGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="100%" stopColor="#bae6fd" />
                  </linearGradient>
                </defs>
                <path d="M25 60 a15 15 0 0 1 10 -25 a20 20 0 0 1 30 -5 a15 15 0 0 1 15 15 a15 15 0 0 1 -10 15 z" fill="url(#cloudGrad)" className="stroke-sky-200 stroke-2" />
                <circle cx="43" cy="46" r="3" fill="#0369a1" />
                <circle cx="57" cy="46" r="3" fill="#0369a1" />
                <path d="M47 53 q3 3 6 0" fill="none" stroke="#0369a1" strokeWidth="2" strokeLinecap="round" />
                <circle cx="38" cy="51" r="2.5" fill="#f43f5e" opacity="0.4" />
                <circle cx="62" cy="51" r="2.5" fill="#f43f5e" opacity="0.4" />
              </svg>
            )}
            
            {currentTheme === 'neon' && (
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <defs>
                  <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>
                <rect x="25" y="30" width="50" height="40" rx="10" fill="#1e1b4b" stroke="#06b6d4" strokeWidth="2" filter="url(#neonGlow)" />
                <rect x="42" y="70" width="16" height="8" fill="#475569" />
                <rect x="32" y="38" width="36" height="20" rx="4" fill="#000000" stroke="#a21caf" strokeWidth="1.5" />
                <circle cx="43" cy="48" r="2.5" fill="#06b6d4" className="animate-pulse" />
                <circle cx="57" cy="48" r="2.5" fill="#06b6d4" className="animate-pulse" />
                <line x1="46" y1="53" x2="54" y2="53" stroke="#06b6d4" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="50" y1="30" x2="50" y2="20" stroke="#06b6d4" strokeWidth="2" filter="url(#neonGlow)" />
                <circle cx="50" cy="18" r="4" fill="#d946ef" filter="url(#neonGlow)" />
              </svg>
            )}
            
            {currentTheme === 'bosque' && (
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <path d="M40 25 l3 -10 l5 10 z" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1.5" />
                <path d="M60 25 l-3 -10 l-5 10 z" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1.5" />
                <rect x="42" y="24" width="16" height="40" rx="8" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1" />
                <ellipse cx="50" cy="35" rx="8" ry="6" fill="#f1f5f9" />
                <circle cx="50" cy="33" r="1.5" fill="#475569" />
                <path d="M48 37 q2 2 4 0" fill="none" stroke="#475569" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="45" cy="30" r="2.5" fill="#1e293b" />
                <circle cx="55" cy="30" r="2.5" fill="#1e293b" />
                <path d="M42 50 h16 v10 h-16 z" fill="#ea580c" />
                <line x1="45" y1="50" x2="45" y2="60" stroke="#facc15" strokeWidth="2" />
                <line x1="50" y1="50" x2="50" y2="60" stroke="#3b82f6" strokeWidth="2" />
                <line x1="55" y1="50" x2="55" y2="60" stroke="#10b981" strokeWidth="2" />
                <circle cx="41" cy="33" r="2" fill="#f43f5e" opacity="0.5" />
                <circle cx="59" cy="33" r="2" fill="#f43f5e" opacity="0.5" />
              </svg>
            )}
            
            {currentTheme === 'galaxy' && (
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <circle cx="50" cy="46" r="26" fill="#e2e8f0" stroke="#6366f1" strokeWidth="2" />
                <ellipse cx="50" cy="44" rx="19" ry="14" fill="#1e1b4b" stroke="#818cf8" strokeWidth="1.5" />
                <path d="M38 48 q12 -6 24 0" fill="none" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
                <circle cx="44" cy="44" r="2" fill="#38bdf8" />
                <circle cx="56" cy="44" r="2" fill="#38bdf8" />
                <path d="M48 50 q2 2 4 0" fill="none" stroke="#38bdf8" strokeWidth="1.5" />
                <rect x="36" y="72" width="28" height="12" rx="4" fill="#cbd5e1" stroke="#6366f1" strokeWidth="1.5" />
                <rect x="44" y="75" width="12" height="6" fill="#ef4444" rx="1" />
                <circle cx="76" cy="24" r="2" fill="#fbbf24" className="animate-pulse" />
                <path d="M72 24 h8 M76 20 v8" stroke="#fbbf24" strokeWidth="1" />
              </svg>
            )}
          </button>
        </div>
      )}

    </div>
  );
}

// Reusable unauthorized layout blocker
function RoleUnauthorizedBlock() {
  return (
    <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-red-500/10 shadow-sm flex flex-col items-center justify-center space-y-4">
      <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
        <AlertCircle size={24} />
      </div>
      <div>
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Acceso Denegado</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
          Su rol institucional no cuenta con los permisos necesarios para modificar o auditar este módulo. Contacte al administrador.
        </p>
      </div>
    </div>
  );
}
