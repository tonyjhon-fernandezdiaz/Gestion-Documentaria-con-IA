import React, { useState } from 'react';
import { 
  Sliders, 
  Save, 
  History, 
  Sparkles, 
  FileText, 
  Check, 
  CornerDownRight, 
  ChevronRight, 
  User, 
  Calendar,
  X
} from 'lucide-react';
import { PromptTemplate, DocumentType, User as UserType } from '../types';

interface PromptConfigViewProps {
  prompts: PromptTemplate[];
  currentUser: UserType;
  onUpdatePrompt: (id: string, updatedPrompt: string) => void;
}

export default function PromptConfigView({ prompts, currentUser, onUpdatePrompt }: PromptConfigViewProps) {
  const [selectedPrompt, setSelectedPrompt] = useState<PromptTemplate>(prompts[0] || null);
  const [editText, setEditText] = useState(prompts[0]?.prompt || '');
  const [successMsg, setSuccessMsg] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSelectPrompt = (p: PromptTemplate) => {
    setSelectedPrompt(p);
    setEditText(p.prompt);
    setSuccessMsg(false);
    setErrorMsg('');
  };

  const handleSave = async () => {
    if (!selectedPrompt) return;
    setErrorMsg('');
    
    try {
      const response = await fetch(`/api/prompts/${selectedPrompt.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: editText,
          usuario: currentUser.name
        })
      });

      const updated = await response.json();
      if (!response.ok) throw new Error(updated.error);

      // Trigger callback to update database on state
      onUpdatePrompt(selectedPrompt.id, editText);
      
      // Update local state views
      setSelectedPrompt(updated);
      setSuccessMsg(true);
      setTimeout(() => setSuccessMsg(false), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al guardar el prompt.');
      setTimeout(() => setErrorMsg(''), 5000);
    }
  };

  return (
    <div className="space-y-6 text-slate-800 dark:text-slate-100 font-sans" id="prompts_config_view">
      
      {/* Upper header */}
      <div className="border-b border-slate-200 dark:border-slate-800/80 pb-5">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
          Plantillas de Prompts para IA
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Personalice las directivas de redacción jurídica y formal que guían a la IA para cada tipo de documento oficial.
        </p>
      </div>

      <div className="grid lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: Prompts category selection list */}
        <div className="lg:col-span-4 space-y-2">
          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2 px-1">Tipos de Documento</div>
          <div className="space-y-1 max-h-[480px] overflow-y-auto pr-1">
            {prompts.map((p) => {
              const isSelected = selectedPrompt?.id === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => handleSelectPrompt(p)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border text-left text-xs font-semibold transition-all ${
                    isSelected
                      ? 'bg-gradient-to-r from-indigo-500/10 to-purple-500/5 border-indigo-500 text-indigo-600 dark:text-indigo-400 shadow-sm'
                      : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <FileText size={15} className={isSelected ? 'text-indigo-500' : 'text-slate-400'} />
                    <span className="truncate">{p.documentType}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-950 text-slate-400 font-mono font-bold">
                      v{p.version}
                    </span>
                    <ChevronRight size={14} className="text-slate-400" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Side: Active Prompt text editor & History logs */}
        {selectedPrompt && (
          <div className="lg:col-span-8 space-y-6">
            
            {/* Template Editor Box */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Editar Prompt: {selectedPrompt.documentType}
                  </h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Defina el estilo, los apartados técnicos y formalidades para este tipo documental.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold bg-indigo-500/10 text-indigo-500 px-2.5 py-0.5 rounded-full">
                    Versión Activa: {selectedPrompt.version}
                  </span>
                </div>
              </div>

              {/* Textarea */}
              <div className="space-y-1">
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  rows={8}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 text-xs leading-relaxed focus:outline-none focus:ring-0 resize-y"
                  placeholder="Escriba las directrices y estructura del prompt..."
                />
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                {successMsg ? (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-500 font-semibold bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                    <Check size={14} />
                    <span>¡Prompt guardado y versionado con éxito!</span>
                  </div>
                ) : errorMsg ? (
                  <div className="flex items-center gap-1.5 text-xs text-red-500 font-semibold bg-red-50 dark:bg-red-950/40 px-3 py-1.5 rounded-lg border border-red-500/20">
                    <X size={14} />
                    <span>{errorMsg}</span>
                  </div>
                ) : (
                  <div className="text-[10px] text-slate-400">
                    Al guardar, se incrementará la versión automáticamente.
                  </div>
                )}

                <button
                  onClick={handleSave}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow transition-colors"
                >
                  <Save size={13} />
                  <span>Guardar Versión</span>
                </button>
              </div>
            </div>

            {/* Version History logs timeline */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <History size={16} className="text-slate-400" />
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Historial de Modificaciones y Auditoría
                </h3>
              </div>

              <div className="space-y-4 max-h-[220px] overflow-y-auto pr-1">
                {selectedPrompt.historial && selectedPrompt.historial.map((hist, i) => (
                  <div key={i} className="flex items-start gap-3 text-xs">
                    <div className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-950 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-[9px] font-mono font-bold text-indigo-500">v{hist.version}</span>
                    </div>
                    <div className="min-w-0 flex-1 border-b border-slate-100 dark:border-slate-800/80 pb-3 last:border-0">
                      <p className="text-[11px] text-slate-700 dark:text-slate-300 italic line-clamp-2 leading-relaxed">
                        "{hist.prompt}"
                      </p>
                      <div className="flex items-center gap-3 text-[10px] text-slate-400 font-mono mt-2">
                        <span className="flex items-center gap-1"><User size={10} /> {hist.modificadoPor}</span>
                        <span className="flex items-center gap-1"><Calendar size={10} /> {new Date(hist.fecha).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

      </div>

    </div>
  );
}
