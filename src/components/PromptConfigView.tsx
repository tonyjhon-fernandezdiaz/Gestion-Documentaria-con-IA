import React, { useState, useEffect } from 'react';
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
  X,
  Building2,
  GitMerge,
  Plus,
  Trash2,
  ShieldAlert,
  HelpCircle,
  Edit2
} from 'lucide-react';
import { PromptTemplate, DocumentType, User as UserType, AreaTemplate, AreaItem } from '../types';

interface PromptConfigViewProps {
  prompts: PromptTemplate[];
  currentUser: UserType;
  onUpdatePrompt: (id: string, updatedPrompt: string) => void;
}

export default function PromptConfigView({ prompts, currentUser, onUpdatePrompt }: PromptConfigViewProps) {
  const isAdmin = currentUser.role === 'Administrador';

  // Tabs: 'general' (General Prompt Templates) | 'area' (Area & Office Specific Templates)
  const [activeTab, setActiveTab] = useState<'general' | 'area'>('area');

  // General Prompts State
  const [selectedPrompt, setSelectedPrompt] = useState<PromptTemplate>(prompts[0] || null);
  const [editText, setEditText] = useState(prompts[0]?.prompt || '');
  const [successMsg, setSuccessMsg] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Area Templates State
  const [areas, setAreas] = useState<AreaItem[]>([]);
  const [areaTemplates, setAreaTemplates] = useState<AreaTemplate[]>([]);
  const [selectedAreaId, setSelectedAreaId] = useState<string>('adm');
  const [selectedDocType, setSelectedDocType] = useState<DocumentType>('Memorando');
  const [editingAreaTemplate, setEditingAreaTemplate] = useState<Partial<AreaTemplate> | null>(null);
  const [areaSuccessMsg, setAreaSuccessMsg] = useState(false);
  const [areaErrorMsg, setAreaErrorMsg] = useState('');

  // Load areas and area templates
  useEffect(() => {
    fetch('/api/areas')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setAreas(data);
      })
      .catch(() => {});

    fetch('/api/area-templates')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setAreaTemplates(data);
      })
      .catch(() => {});
  }, []);

  const handleSelectPrompt = (p: PromptTemplate) => {
    setSelectedPrompt(p);
    setEditText(p.prompt);
    setSuccessMsg(false);
    setErrorMsg('');
  };

  const handleSaveGeneralPrompt = async () => {
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
      onUpdatePrompt(selectedPrompt.id, editText);
      setSelectedPrompt(updated);
      setSuccessMsg(true);
      setTimeout(() => setSuccessMsg(false), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al guardar el prompt.');
      setTimeout(() => setErrorMsg(''), 5000);
    }
  };

  const handleSaveAreaTemplate = async () => {
    if (!editingAreaTemplate || !editingAreaTemplate.title || !editingAreaTemplate.templateText) {
      setAreaErrorMsg('El título y el texto del modelo son requeridos.');
      return;
    }
    setAreaErrorMsg('');

    try {
      const token = localStorage.getItem('saved_session_token');
      const response = await fetch('/api/area-templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          template: {
            ...editingAreaTemplate,
            areaId: selectedAreaId,
            documentType: selectedDocType
          },
          usuario: currentUser.name
        })
      });

      const saved = await response.json();
      if (!response.ok) throw new Error(saved.error || 'Error al guardar plantilla.');

      setAreaTemplates(prev => {
        const idx = prev.findIndex(t => t.id === saved.id);
        if (idx !== -1) {
          const updated = [...prev];
          updated[idx] = saved;
          return updated;
        }
        return [saved, ...prev];
      });

      setAreaSuccessMsg(true);
      setTimeout(() => setAreaSuccessMsg(false), 3000);
      setEditingAreaTemplate(null);
    } catch (err: any) {
      setAreaErrorMsg(err.message || 'Error al guardar plantilla por área.');
    }
  };

  const handleDeleteAreaTemplate = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar esta plantilla de área?')) return;
    try {
      const token = localStorage.getItem('saved_session_token');
      const response = await fetch(`/api/area-templates/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Error al eliminar plantilla.');
      setAreaTemplates(prev => prev.filter(t => t.id !== id));
    } catch (err: any) {
      alert(err.message);
    }
  };

  // If user is not Admin, show restriction view
  if (!isAdmin) {
    return (
      <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-4 max-w-xl mx-auto my-12 shadow-sm">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
          <ShieldAlert size={32} />
        </div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          Acceso Restringido - Solo Administrador
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          La gestión y configuración de la **Biblioteca de Plantillas por Área** y directivas de redacción está reservada exclusivamente para el Administrador Principal del Sistema.
        </p>
        <div className="text-[11px] font-mono text-slate-400 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
          Su rol actual: <strong className="text-indigo-500">{currentUser.role}</strong>
        </div>
      </div>
    );
  }

  const selectedAreaObj = areas.find(a => a.id === selectedAreaId);
  const parentAreaObj = selectedAreaObj?.parentAreaId ? areas.find(a => a.id === selectedAreaObj.parentAreaId) : null;

  // Filter templates for current area & type
  const matchingTemplates = areaTemplates.filter(t => 
    (t.areaId === selectedAreaId || t.subareaId === selectedAreaId) && t.documentType === selectedDocType
  );

  const inheritedTemplates = parentAreaObj ? areaTemplates.filter(t => 
    t.areaId === parentAreaObj.id && t.documentType === selectedDocType
  ) : [];

  return (
    <div className="space-y-6 text-slate-800 dark:text-slate-100 font-sans" id="prompts_config_view">
      
      {/* Upper Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800/80 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Biblioteca de Plantillas y Directivas de Redacción
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Gestione plantillas estructuradas por áreas/oficinas de acuerdo al organigrama de la UGEL, optimizando el consumo de tokens.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shrink-0">
          <button
            onClick={() => setActiveTab('area')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'area'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/80 dark:border-slate-800'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Building2 size={14} />
            <span>Plantillas por Área</span>
          </button>
          <button
            onClick={() => setActiveTab('general')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'general'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/80 dark:border-slate-800'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Sliders size={14} />
            <span>Directivas Generales</span>
          </button>
        </div>
      </div>

      {activeTab === 'area' ? (
        /* AREA TEMPLATES MATRIX VIEW */
        <div className="space-y-6">
          
          {/* Controls Bar: Select Area & Document Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Building2 size={14} className="text-indigo-500" />
                <span>1. Seleccionar Área u Oficina (Organigrama):</span>
              </label>
              <select
                value={selectedAreaId}
                onChange={(e) => {
                  setSelectedAreaId(e.target.value);
                  setEditingAreaTemplate(null);
                }}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
              >
                {areas.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.parentAreaId ? `↳ ${a.name} (Sub-oficina)` : `${a.name} (Área Principal)`}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <FileText size={14} className="text-indigo-500" />
                <span>2. Seleccionar Tipo de Documento:</span>
              </label>
              <select
                value={selectedDocType}
                onChange={(e) => {
                  setSelectedDocType(e.target.value as DocumentType);
                  setEditingAreaTemplate(null);
                }}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
              >
                {[
                  'Informe', 'Oficio', 'Memorando', 'Carta', 'Proveído', 'Resolución', 
                  'Acta', 'Constancia', 'Informe Técnico', 'Solicitud', 'Dictamen', 
                  'Directiva', 'Circular', 'Oficio Múltiple', 'Memorando Múltiple', 'Nota de Insumo'
                ].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Hierarchy Fallback Tree Status Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950 text-white border border-indigo-500/20 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 font-sans">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <GitMerge size={16} className="text-indigo-400" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  Organigrama & Herencia Jerárquica Activa
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                Área seleccionada: <strong className="text-indigo-300">{selectedAreaObj?.name}</strong> 
                {parentAreaObj && <span> (Depende jerárquicamente de: <strong className="text-amber-300">{parentAreaObj.name}</strong>)</span>}
              </p>
            </div>
            
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setEditingAreaTemplate({
                  title: `Modelo ${selectedDocType} - ${selectedAreaObj?.code}`,
                  subtipoProposito: 'Certificación Presupuestal',
                  templateText: `Tengo a bien dirigirme a usted con la finalidad de solicitar...\n\nSin otro particular, expreso mis consideraciones.`,
                  areaId: selectedAreaId,
                  documentType: selectedDocType
                })}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow active:scale-95"
              >
                <Plus size={14} />
                <span>Nueva Plantilla para esta Área</span>
              </button>
            </div>
          </div>

          {/* Editor Form Modal or Block */}
          {editingAreaTemplate && (
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-indigo-500/40 shadow-lg space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Edit2 size={16} className="text-indigo-500" />
                  <span>{editingAreaTemplate.id ? 'Editar' : 'Crear'} Plantilla Específica ({selectedDocType} - {selectedAreaObj?.name})</span>
                </h3>
                <button 
                  onClick={() => setEditingAreaTemplate(null)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    Título Identificador de la Plantilla
                  </label>
                  <input
                    type="text"
                    value={editingAreaTemplate.title || ''}
                    onChange={(e) => setEditingAreaTemplate({ ...editingAreaTemplate, title: e.target.value })}
                    placeholder="ej. Solicitud de Certificación Crédito Presupuestario"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    Subtipo / Propósito de Trámite
                  </label>
                  <input
                    type="text"
                    value={editingAreaTemplate.subtipoProposito || ''}
                    onChange={(e) => setEditingAreaTemplate({ ...editingAreaTemplate, subtipoProposito: e.target.value })}
                    placeholder="ej. Certificación Presupuestal, Solicitud de Información..."
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                  Modelo y Estructura de Redacción Fija (~150 tokens)
                </label>
                <textarea
                  rows={6}
                  value={editingAreaTemplate.templateText || ''}
                  onChange={(e) => setEditingAreaTemplate({ ...editingAreaTemplate, templateText: e.target.value })}
                  placeholder="Redacte el texto estándar con los párrafos institucionales fijados..."
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs leading-relaxed focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                {areaSuccessMsg ? (
                  <span className="text-xs text-emerald-500 font-bold">¡Plantilla guardada con éxito!</span>
                ) : areaErrorMsg ? (
                  <span className="text-xs text-red-500 font-bold">{areaErrorMsg}</span>
                ) : <span />}

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditingAreaTemplate(null)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-400"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveAreaTemplate}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow"
                  >
                    <Save size={13} />
                    <span>Guardar Modelo</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* List of Templates (Specific for this Area & Inherited) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Specific Templates Block */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Plantillas Específicas del Área ({matchingTemplates.length})
                  </h3>
                </div>
              </div>

              {matchingTemplates.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 italic">
                  No hay plantillas cargadas para esta oficina. El sistema heredará la del área superior.
                </div>
              ) : (
                <div className="space-y-3">
                  {matchingTemplates.map(tmpl => (
                    <div key={tmpl.id} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white">{tmpl.title}</h4>
                          <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                            Propósito: {tmpl.subtipoProposito}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setEditingAreaTemplate(tmpl)}
                            className="p-1 text-slate-400 hover:text-indigo-600"
                            title="Editar"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => handleDeleteAreaTemplate(tmpl.id)}
                            className="p-1 text-slate-400 hover:text-red-600"
                            title="Eliminar"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 font-mono italic line-clamp-3 bg-white dark:bg-slate-900 p-2 rounded border border-slate-100 dark:border-slate-800/80">
                        "{tmpl.templateText}"
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Inherited Templates Block */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Plantillas Heredadas de Área Superior ({inheritedTemplates.length})
                  </h3>
                </div>
              </div>

              {!parentAreaObj ? (
                <div className="py-8 text-center text-xs text-slate-400 italic">
                  Esta es un área principal (Dirección / Jefatura), no hereda de áreas superiores.
                </div>
              ) : inheritedTemplates.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 italic">
                  No hay plantillas en el área superior ({parentAreaObj.name}). Se usará la IA generativa predeterminada.
                </div>
              ) : (
                <div className="space-y-3">
                  {inheritedTemplates.map(tmpl => (
                    <div key={tmpl.id} className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-xs font-bold text-amber-900 dark:text-amber-300">{tmpl.title}</h4>
                          <span className="text-[10px] font-mono text-amber-700 dark:text-amber-400 font-semibold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                            Origen: {parentAreaObj.name}
                          </span>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 font-mono italic line-clamp-3 bg-white dark:bg-slate-900 p-2 rounded border border-slate-100 dark:border-slate-800/80">
                        "{tmpl.templateText}"
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>
      ) : (
        /* GENERAL PROMPTS EDITOR VIEW */
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
                      Editar Prompt General: {selectedPrompt.documentType}
                    </h3>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Defina el estilo, los apartados técnicos y formalidades generales para este tipo documental.
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
                    onClick={handleSaveGeneralPrompt}
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
      )}

    </div>
  );
}
