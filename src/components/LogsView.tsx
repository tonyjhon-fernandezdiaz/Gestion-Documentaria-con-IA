import React, { useState } from 'react';
import { 
  History, 
  Search, 
  Filter, 
  Clock, 
  User, 
  ShieldCheck, 
  Sparkles, 
  Cpu, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Info,
  Layers,
  ChevronRight
} from 'lucide-react';
import { SystemLog } from '../types';

interface LogsViewProps {
  logs: SystemLog[];
}

export default function LogsView({ logs }: LogsViewProps) {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('todos');

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.accion.toLowerCase().includes(search.toLowerCase()) ||
      log.detalles.toLowerCase().includes(search.toLowerCase()) ||
      log.usuario.toLowerCase().includes(search.toLowerCase());
    
    const matchesType = filterType === 'todos' || log.tipo === filterType;

    return matchesSearch && matchesType;
  });

  const getLogIcon = (tipo: string) => {
    switch (tipo) {
      case 'success':
        return <CheckCircle size={15} className="text-emerald-500 shrink-0" />;
      case 'error':
        return <XCircle size={15} className="text-red-500 shrink-0" />;
      case 'warning':
        return <AlertTriangle size={15} className="text-amber-500 shrink-0" />;
      default:
        return <Info size={15} className="text-blue-500 shrink-0" />;
    }
  };

  return (
    <div className="space-y-6 text-slate-800 dark:text-slate-100 font-sans" id="logs_view">
      
      {/* View Header */}
      <div className="border-b border-slate-200 dark:border-slate-800/80 pb-5">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
          Bitácora del Sistema (Auditoría)
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Registro inmutable de transacciones, accesos de usuarios y diagnósticos de conmutación de Inteligencia Artificial.
        </p>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/80 flex flex-col md:flex-row items-center gap-4 shadow-inner" id="logs_filters">
        {/* Search */}
        <div className="relative w-full md:flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Buscar por usuario, acción o detalles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Filter Dropdown */}
        <div className="flex items-center gap-2 shrink-0">
          <Filter size={13} className="text-slate-400" />
          <select 
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-2 py-1.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 outline-none"
          >
            <option value="todos">Todos los eventos</option>
            <option value="success">Éxitos (Success)</option>
            <option value="info">Información (Info)</option>
            <option value="warning">Advertencias (Warning)</option>
            <option value="error">Fallas críticas (Error)</option>
          </select>
        </div>
      </div>

      {/* Audit List Container */}
      <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
        <div className="space-y-1.5" id="logs_list">
          {filteredLogs.length === 0 ? (
            <div className="p-12 text-center">
              <History size={36} className="mx-auto text-slate-300 dark:text-slate-700 mb-2" />
              <p className="text-xs text-slate-500">No hay registros que coincidan con la búsqueda.</p>
            </div>
          ) : (
            filteredLogs.map((log) => {
              const isAiAction = log.providerAttempted !== undefined || log.providerSucceeded !== undefined;
              return (
                <div 
                  key={log.id}
                  className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                    isAiAction
                      ? 'bg-indigo-500/5 dark:bg-indigo-950/10 border-indigo-500/20'
                      : 'bg-white dark:bg-slate-950/30 border-slate-100 dark:border-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-950/60'
                  }`}
                >
                  
                  {/* Left block: details and timestamps */}
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="mt-1 shrink-0">{getLogIcon(log.tipo)}</div>
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-slate-950 dark:text-white">
                          {log.accion}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                          <Clock size={11} />
                          {new Date(log.fecha).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        {log.detalles}
                      </p>

                      {/* AI failover chain visual logs */}
                      {isAiAction && (
                        <div className="pt-2 flex flex-col gap-1.5">
                          {log.providerAttempted && (
                            <div className="flex flex-wrap items-center gap-1.5 text-[9px] font-mono">
                              <span className="text-slate-400">Ruta de Intento:</span>
                              {log.providerAttempted.map((att, idx) => {
                                const isSucceeded = att === log.providerSucceeded;
                                return (
                                  <span 
                                    key={idx} 
                                    className={`px-1 rounded ${
                                      isSucceeded 
                                        ? 'bg-emerald-500/10 text-emerald-500 font-semibold' 
                                        : 'bg-red-500/10 text-red-500'
                                    }`}
                                  >
                                    {att.toUpperCase()} {isSucceeded ? '✓' : '❌'}
                                  </span>
                                );
                              })}
                            </div>
                          )}

                          {/* Response latency metrics */}
                          <div className="flex items-center gap-4 text-[9px] font-mono text-slate-400">
                            {log.tokensUsed !== undefined && (
                              <span>Tokens: <strong className="text-slate-700 dark:text-slate-300">{log.tokensUsed}</strong></span>
                            )}
                            {log.responseTimeMs !== undefined && (
                              <span>Latencia de Pipeline: <strong className="text-slate-700 dark:text-slate-300">{log.responseTimeMs}ms</strong></span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right block: Author profile metadata */}
                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center bg-slate-50 dark:bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-100 dark:border-slate-800/80 text-[10px] font-mono text-slate-500 dark:text-slate-400">
                    <User size={11} className="text-indigo-400" />
                    <span>{log.usuario}</span>
                  </div>

                </div>
              );
            })
          )}
        </div>
      </div>

    </div>
  );
}
