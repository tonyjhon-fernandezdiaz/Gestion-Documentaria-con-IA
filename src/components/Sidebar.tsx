import React, { useState } from 'react';
import { 
  Home,
  Sun,
  Moon,
  FilePlus2,
  Clock,
  Sliders,
  Settings,
  LogOut,
  ShieldCheck,
  Calendar,
  Network
} from 'lucide-react';
import { User as UserType } from '../types';

export type SidebarTab = 'inicio' | 'documentos' | 'subir' | 'analizar' | 'prompts' | 'config' | 'logs' | 'organigrama';

interface SidebarProps {
  currentTab: SidebarTab;
  onTabChange: (tab: SidebarTab) => void;
  currentUser: UserType;
  onLogout: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

export default function Sidebar({ 
  currentTab, 
  onTabChange, 
  currentUser, 
  onLogout,
  darkMode,
  onToggleDarkMode
}: SidebarProps) {
  // Navigation structure based on role permissions (Reordered as requested)
  const mainMenuItems = [
    { 
      id: 'inicio' as const, 
      label: 'Inicio', 
      icon: Home,
      bgColor: 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400',
      activeColor: 'ring-2 ring-blue-500 bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300',
      roles: ['Administrador']
    },
    { 
      id: 'subir' as const, 
      label: 'Nuevo Documento', 
      icon: FilePlus2,
      bgColor: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400',
      activeColor: 'ring-2 ring-amber-500 bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300',
      roles: ['Administrador', 'Secretaria', 'Jefe', 'Consulta']
    },
    { 
      id: 'analizar' as const, 
      label: 'Analizar Documento', 
      icon: ShieldCheck,
      bgColor: 'bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400',
      activeColor: 'ring-2 ring-teal-500 bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300',
      roles: ['Administrador', 'Secretaria', 'Jefe', 'Consulta'],
      customVisible: currentUser.role === 'Administrador' || currentUser.areaId === 'planificacion' || (currentUser.areaIds && (currentUser.areaIds.includes('planificacion') || currentUser.areaIds.includes('agp')))
    },
    { 
      id: 'documentos' as const, 
      label: 'Historial de documentos', 
      icon: Clock,
      bgColor: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
      activeColor: 'ring-2 ring-slate-600 bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white',
      roles: ['Administrador', 'Secretaria', 'Jefe', 'Consulta']
    },

    { 
      id: 'organigrama' as const, 
      label: 'Organigrama', 
      icon: Network,
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400',
      activeColor: 'ring-2 ring-emerald-500 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300',
      roles: ['Administrador', 'Secretaria', 'Jefe', 'Consulta']
    },
    { 
      id: 'prompts' as const, 
      label: 'Plantillas', 
      icon: Sliders,
      bgColor: 'bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400',
      activeColor: 'ring-2 ring-purple-500 bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300',
      roles: ['Administrador']
    }
  ];

  const bottomMenuItems = [
    { 
      id: 'config' as const, 
      label: 'Configuraciones', 
      icon: Settings,
      bgColor: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300',
      activeColor: 'ring-2 ring-zinc-600 bg-zinc-200 dark:bg-slate-700 text-zinc-900 dark:text-white',
      roles: ['Administrador', 'Secretaria', 'Jefe', 'Consulta']
    }
  ];

  const visibleMainItems = mainMenuItems.filter(item => {
    const isRoleOk = item.roles.includes(currentUser.role);
    if ('customVisible' in item) {
      return isRoleOk && item.customVisible;
    }
    return isRoleOk;
  });
  const visibleBottomItems = bottomMenuItems.filter(item => item.roles.includes(currentUser.role));

  return (
    <aside className="w-24 shrink-0 flex flex-col justify-between py-6 items-center min-h-screen bg-transparent relative z-40">
      
      {/* Container matching image (curved white border-less column, slightly separated from margins) */}
      <div className="w-18 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-md rounded-[2.5rem] py-6 px-2.5 flex flex-col items-center justify-between h-[calc(100vh-2rem)] fixed left-4 top-4">
        
        {/* Top/Middle: mainMenuItems stacked sequentially */}
        <div className="flex flex-col items-center gap-4 w-full">
          <div className="flex flex-col items-center gap-4 w-full">
            {visibleMainItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <div key={item.id} className="relative group">
                  <button
                    onClick={() => onTabChange(item.id)}
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                      isActive 
                        ? `${item.activeColor} scale-110 shadow-md shadow-indigo-500/10` 
                        : `${item.bgColor} hover:scale-105 opacity-85 hover:opacity-100`
                    }`}
                    id={`sidebar_tab_${item.id}`}
                  >
                    <Icon size={20} />
                  </button>
                  
                  {/* Floating custom Tooltip */}
                  <div className="absolute left-16 top-1/2 -translate-y-1/2 ml-2 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-[11px] font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 transform translate-x-2 group-hover:translate-x-0 shadow-lg z-50">
                    {item.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Section: Configuraciones, Modo Claro/Oscuro, Cerrar Sesión */}
        <div className="flex flex-col items-center gap-4 pt-4 border-t border-slate-100 dark:border-slate-800/60 w-full mt-auto">
          
          {/* Bottom menu items (Configuraciones) */}
          {visibleBottomItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <div key={item.id} className="relative group">
                <button
                  onClick={() => onTabChange(item.id)}
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                    isActive 
                      ? `${item.activeColor} scale-110 shadow-md` 
                      : `${item.bgColor} hover:scale-105 opacity-85 hover:opacity-100`
                  }`}
                  id={`sidebar_tab_${item.id}`}
                >
                  <Icon size={20} />
                </button>
                
                {/* Floating custom Tooltip */}
                <div className="absolute left-16 top-1/2 -translate-y-1/2 ml-2 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-[11px] font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 transform translate-x-2 group-hover:translate-x-0 shadow-lg z-50">
                  {item.label}
                </div>
              </div>
            );
          })}

          {/* Theme toggler button */}
          <div className="relative group">
            <button 
              onClick={onToggleDarkMode}
              className="w-12 h-12 rounded-2xl flex items-center justify-center bg-slate-50 dark:bg-slate-800/40 text-slate-400 hover:text-slate-600 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              title={darkMode ? "Modo Claro" : "Modo Oscuro"}
            >
              {darkMode ? <Sun size={20} className="text-amber-400" /> : <Moon size={20} />}
            </button>
            <div className="absolute left-16 top-1/2 -translate-y-1/2 ml-2 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-[11px] font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 transform translate-x-2 group-hover:translate-x-0 shadow-lg z-50">
              {darkMode ? "Modo Claro" : "Modo Oscuro"}
            </div>
          </div>

          {/* Log-out button - standard icon, NO avatar/photo image */}
          <div className="relative group">
            <button 
              onClick={onLogout}
              className="w-12 h-12 rounded-2xl flex items-center justify-center bg-red-50 dark:bg-red-950/20 text-red-500 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-950/50 transition-all"
              title="Cerrar Sesión"
              id="logout_btn"
            >
              <LogOut size={20} />
            </button>
            <div className="absolute left-16 top-1/2 -translate-y-1/2 ml-2 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-[11px] font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 transform translate-x-2 group-hover:translate-x-0 shadow-lg z-50">
              Cerrar Sesión ({currentUser.name})
            </div>
          </div>

        </div>

      </div>
    </aside>
  );
}
