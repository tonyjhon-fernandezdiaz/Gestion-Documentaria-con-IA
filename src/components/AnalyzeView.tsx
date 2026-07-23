import React, { useState } from 'react';
import { 
  UploadCloud, 
  FileText, 
  AlertTriangle, 
  CheckCircle2, 
  Loader2, 
  ShieldAlert, 
  ListChecks, 
  FileSearch,
  Sparkles,
  X
} from 'lucide-react';
import { User } from '../types';

interface AnalyzeViewProps {
  currentUser: User;
}

interface ErrorObservation {
  tipo: string;
  descripcion: string;
  original: string;
  recomendacion: string;
}

interface AnalysisResult {
  success: boolean;
  pageCount: number;
  errorCount: number;
  errors: ErrorObservation[];
  recomendacionesGenerales: string[];
  ia_utilizada: string;
  responseTimeMs: number;
}

export default function AnalyzeView({ currentUser }: AnalyzeViewProps) {
  const [file, setFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string>('');
  const [analyzing, setAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // Convert uploaded file to base64
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      const validExtensions = ['.pdf', '.docx', '.doc', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp'];
      const fileExt = selectedFile.name.substring(selectedFile.name.lastIndexOf('.')).toLowerCase();
      
      if (!validExtensions.includes(fileExt)) {
        setErrorMsg('Formato no soportado. Suba un archivo PDF, Word (.docx, .doc) o imagen.');
        return;
      }

      setFile(selectedFile);
      setErrorMsg('');
      
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target && event.target.result) {
          setFileBase64(event.target.result as string);
        }
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selectedFile = e.dataTransfer.files[0];
      const validExtensions = ['.pdf', '.docx', '.doc', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp'];
      const fileExt = selectedFile.name.substring(selectedFile.name.lastIndexOf('.')).toLowerCase();
      
      if (!validExtensions.includes(fileExt)) {
        setErrorMsg('Formato no soportado. Suba un archivo PDF, Word (.docx, .doc) o imagen.');
        return;
      }

      setFile(selectedFile);
      setErrorMsg('');
      
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target && event.target.result) {
          setFileBase64(event.target.result as string);
        }
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleAnalyze = async () => {
    if (!file || !fileBase64) {
      setErrorMsg('Por favor, seleccione o arrastre un archivo primero.');
      return;
    }

    setAnalyzing(true);
    setErrorMsg('');
    setResult(null);

    try {
      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          filename: file.name,
          usuario: currentUser.name,
          fileBase64
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Ocurrió un error al analizar el documento.');
      }

      setResult(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error de conexión con el servidor.');
    } finally {
      setAnalyzing(false);
    }
  };

  const clearFile = () => {
    setFile(null);
    setFileBase64('');
    setResult(null);
    setErrorMsg('');
  };

  // Helper to color code error types
  const getErrorTypeBadge = (tipo: string) => {
    const t = tipo.toLowerCase();
    if (t.includes('orto') || t.includes('grama')) {
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-900/60';
    }
    if (t.includes('contra') || t.includes('norma')) {
      return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border-red-200 dark:border-red-900/60';
    }
    if (t.includes('redac') || t.includes('estil')) {
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-900/60';
    }
    return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* Header Banner */}
      <div className="relative rounded-3xl bg-gradient-to-r from-teal-500/10 via-emerald-500/5 to-transparent border border-teal-500/10 dark:border-teal-500/20 p-6 sm:p-8 overflow-hidden shadow-sm">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-b from-teal-500/10 to-transparent rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/10 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 text-[10px] font-bold tracking-wider uppercase">
              <Sparkles size={10} className="animate-pulse" />
              Auditoría Inteligente con IA
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <FileSearch className="text-teal-500" />
              Analizar Documento de Planificación
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
              Herramienta de revisión automatizada para informes de planificación, presupuestos, convenios o directivas. 
              Sube archivos en formato <strong className="text-teal-600 dark:text-teal-400">PDF, Word (.docx) o imágenes</strong> para validar consistencia de datos, ortografía y estructura administrativa.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Upload Zone & Controls */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-md rounded-2xl p-5 space-y-4">
            <h2 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest flex items-center gap-1.5">
              <UploadCloud size={14} className="text-teal-500" />
              Cargar Archivo
            </h2>

            {/* Drag and Drop Zone */}
            {!file ? (
              <div 
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all flex flex-col items-center justify-center cursor-pointer min-h-[200px] select-none ${
                  dragActive 
                    ? 'border-teal-500 bg-teal-500/5 scale-[0.98]' 
                    : 'border-slate-200 dark:border-slate-800 hover:border-teal-500/50 hover:bg-slate-50/50 dark:hover:bg-slate-900/30'
                }`}
              >
                <input 
                  type="file" 
                  id="doc-analyzer-file" 
                  className="hidden" 
                  accept=".pdf,.docx,.doc,.png,.jpg,.jpeg,.gif,.webp,.bmp" 
                  onChange={handleFileChange}
                />
                <label htmlFor="doc-analyzer-file" className="cursor-pointer flex flex-col items-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-teal-500/10 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                    <FileText size={20} />
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                      Haz clic para examinar
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      o arrastra tu archivo PDF, DOCX, DOC o imagen aquí
                    </span>
                  </div>
                  <span className="inline-block px-2.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[8px] text-slate-500 uppercase font-extrabold">
                    Límite: 40 páginas
                  </span>
                </label>
              </div>
            ) : (
              <div className="border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 rounded-xl p-4 flex items-center justify-between gap-3 animate-fade-in">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-9 h-9 rounded-lg bg-teal-500/10 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                    <FileText size={16} />
                  </div>
                  <div className="overflow-hidden">
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate uppercase font-mono">
                      {file.name}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </div>
                  </div>
                </div>
                <button 
                  onClick={clearFile}
                  className="p-1 rounded-full hover:bg-red-50 dark:hover:bg-red-950/40 text-red-500 transition-colors"
                  title="Quitar archivo"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {errorMsg && (
              <div className="p-3 bg-red-500/5 border border-red-500/10 text-red-500 rounded-xl text-[10px] font-bold flex items-start gap-2">
                <ShieldAlert size={14} className="shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              onClick={handleAnalyze}
              disabled={analyzing || !file}
              className={`w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all ${
                analyzing || !file 
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                  : 'bg-teal-500 text-white hover:bg-teal-600 hover:shadow-md'
              }`}
            >
              {analyzing ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Analizando documento...</span>
                </>
              ) : (
                <>
                  <FileSearch size={14} />
                  <span>Auditar Consistencia</span>
                </>
              )}
            </button>
          </div>

          {/* Access Note Card */}
          <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/10 border border-indigo-100/30 dark:border-indigo-900/30 text-[10px] text-indigo-600 dark:text-indigo-400 font-sans space-y-1">
            <span className="font-extrabold uppercase tracking-wide block">⚠️ Control de Acceso Restringido</span>
            <p className="leading-relaxed">
              Esta sección es exclusiva para personal de la Oficina de Planificación y Presupuesto y Administradores del Sistema. Toda auditoría y descarga queda registrada en la bitácora de acciones del sistema.
            </p>
          </div>
        </div>

        {/* Results Area */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Default view / Placeholder */}
          {!result && !analyzing && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-md rounded-2xl p-10 flex flex-col items-center justify-center text-center space-y-4 min-h-[400px]">
              <div className="w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 flex items-center justify-center text-slate-400 dark:text-slate-600">
                <FileSearch size={32} />
              </div>
              <div className="space-y-1">
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest">
                  Esperando Documento
                </h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed font-semibold">
                  Carga un documento oficial de Planificación en el panel de la izquierda para comenzar el análisis automático.
                </p>
              </div>
            </div>
          )}

          {/* Analyzing / Loading Skeleton */}
          {analyzing && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-md rounded-2xl p-10 space-y-6 animate-pulse">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/3"></div>
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-20"></div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800 rounded-xl p-3"></div>
                ))}
              </div>
              <div className="space-y-3 pt-4">
                <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/4"></div>
                <div className="h-20 bg-slate-100 dark:bg-slate-800 rounded-xl"></div>
                <div className="h-20 bg-slate-100 dark:bg-slate-800 rounded-xl"></div>
              </div>
            </div>
          )}

          {/* Results Render */}
          {result && (
            <div className="space-y-6 animate-fade-in">
              
              {/* Stats overview */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl p-4 flex flex-col justify-between">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Hojas Detectadas</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-xl font-extrabold text-slate-800 dark:text-white">{result.pageCount}</span>
                    <span className="text-[10px] text-slate-400">pág.</span>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl p-4 flex flex-col justify-between">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Observaciones</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className={`text-xl font-extrabold ${result.errorCount > 0 ? 'text-red-500' : 'text-green-500'}`}>
                      {result.errorCount}
                    </span>
                    <span className="text-[10px] text-slate-400">ítems</span>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl p-4 flex flex-col justify-between">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Motor IA</span>
                  <div className="truncate text-xs font-bold text-teal-600 dark:text-teal-400 mt-1 uppercase">
                    {result.ia_utilizada.split('(')[0].trim()}
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl p-4 flex flex-col justify-between">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Tiempo de Respuesta</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-xl font-extrabold text-slate-800 dark:text-white">
                      {(result.responseTimeMs / 1000).toFixed(2)}
                    </span>
                    <span className="text-[10px] text-slate-400">seg.</span>
                  </div>
                </div>
              </div>

              {/* General recommendations */}
              {result.recomendacionesGenerales && result.recomendacionesGenerales.length > 0 && (
                <div className="bg-teal-500/5 border border-teal-500/10 dark:border-teal-500/20 rounded-2xl p-5 space-y-3">
                  <h3 className="text-xs font-bold text-teal-700 dark:text-teal-400 uppercase tracking-widest flex items-center gap-1.5">
                    <ListChecks size={14} />
                    Recomendaciones Generales de Calidad
                  </h3>
                  <ul className="space-y-2">
                    {result.recomendacionesGenerales.map((rec, i) => (
                      <li key={i} className="text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2 leading-relaxed">
                        <CheckCircle2 size={13} className="text-teal-500 mt-0.5 shrink-0" />
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Detailed errors list */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest flex items-center gap-1.5">
                  <AlertTriangle size={14} className="text-amber-500" />
                  Lista de Inconsistencias y Errores
                </h3>

                {result.errors.length === 0 ? (
                  <div className="bg-green-500/5 border border-green-500/10 dark:border-green-500/20 rounded-2xl p-6 text-center text-green-600 dark:text-green-400 flex flex-col items-center justify-center space-y-2">
                    <CheckCircle2 size={24} className="text-green-500" />
                    <span className="text-xs font-bold uppercase tracking-wider">¡Ningún error crítico encontrado!</span>
                    <span className="text-[10px] text-slate-400 font-semibold">El documento cumple con los estándares ortográficos, estilísticos y de consistencia lógica interna.</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {result.errors.map((err, idx) => (
                      <div 
                        key={idx} 
                        className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm rounded-xl p-4.5 space-y-3 hover:border-slate-300 dark:hover:border-slate-700 transition-all font-sans"
                      >
                        {/* Header */}
                        <div className="flex items-center justify-between gap-2 border-b border-slate-50 dark:border-slate-800/80 pb-2">
                          <span className={`px-2 py-0.5 rounded text-[8px] uppercase font-extrabold border ${getErrorTypeBadge(err.tipo)}`}>
                            {err.tipo}
                          </span>
                          <span className="text-[9px] text-slate-400 font-bold">Observación #{idx + 1}</span>
                        </div>

                        {/* Description */}
                        <p className="text-xs text-slate-700 dark:text-slate-200 font-bold leading-relaxed">
                          {err.descripcion}
                        </p>

                        {/* Original Text comparison */}
                        {err.original && (
                          <div className="text-[10px] p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850/60 font-mono text-slate-500 dark:text-slate-400 relative overflow-hidden select-text">
                            <span className="absolute top-1 right-2 text-[8px] uppercase tracking-wider text-slate-400/60 font-sans font-extrabold select-none">Texto Original</span>
                            "{err.original}"
                          </div>
                        )}

                        {/* Recommendation */}
                        <div className="p-3 rounded-lg bg-teal-500/5 dark:bg-teal-500/10 border border-teal-500/10 dark:border-teal-500/25 flex items-start gap-2">
                          <CheckCircle2 size={13} className="text-teal-500 shrink-0 mt-0.5" />
                          <div className="space-y-0.5">
                            <span className="text-[9px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-widest block">Corrección Sugerida</span>
                            <p className="text-[11px] text-slate-700 dark:text-slate-300 font-bold leading-relaxed">
                              {err.recomendacion}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

        </div>

      </div>

    </div>
  );
}
