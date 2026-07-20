import React, { useState } from 'react';
import { 
  Network, 
  Search, 
  Users, 
  Building, 
  UserCheck, 
  HelpCircle, 
  Plus, 
  Layers, 
  ShieldAlert, 
  FileSpreadsheet, 
  GraduationCap, 
  FolderLock
} from 'lucide-react';

interface DependencyNode {
  id: string;
  name: string;
  category: 'Direccion' | 'Apoyo' | 'Linea' | 'SubArea';
  secretarias: number;
  secretariaType?: string;
  subUnits?: string[];
  description: string;
  icon: React.ComponentType<any>;
}

export default function OrganigramaView() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNode, setSelectedNode] = useState<string | null>('direccion');
  const [showSecretariesOnly, setShowSecretariesOnly] = useState(false);

  // Official UGEL organization data based on user input
  const dependencies: DependencyNode[] = [
    {
      id: 'direccion',
      name: 'Dirección de la UGEL',
      category: 'Direccion',
      secretarias: 2,
      secretariaType: 'Secretaría General',
      subUnits: [
        'Oficina de Control Institucional',
        'Oficina de Asesoría Jurídica',
        'Consejo Participativo Local de Educación'
      ],
      description: 'Órgano de dirección de más alto nivel encargado de planificar, conducir y evaluar la gestión educativa, administrativa e institucional de la UGEL.',
      icon: Building
    },
    {
      id: 'control_institucional',
      name: 'Oficina de Control Institucional',
      category: 'Apoyo',
      secretarias: 0,
      description: 'Órgano responsable de ejecutar el control gubernamental interno en la UGEL para cautelar la legalidad y eficiencia de las operaciones.',
      icon: FolderLock
    },
    {
      id: 'asesoria_juridica',
      name: 'Oficina de Asesoría Jurídica',
      category: 'Apoyo',
      secretarias: 0,
      description: 'Encargada de asesorar a la Dirección y demás áreas en asuntos jurídicos y legales de carácter administrativo e institucional.',
      icon: ShieldAlert
    },
    {
      id: 'administracion',
      name: 'Oficina de Administración',
      category: 'Apoyo',
      secretarias: 1,
      secretariaType: 'Secretaría de Administración',
      subUnits: [
        'Contabilidad',
        'Gestión de Recursos Humanos',
        'Logística (Almacén)',
        'Patrimonio',
        'Tecnologías de la Información',
        'Tesorería',
        'Trámite Documentario y Atención al Usuario'
      ],
      description: 'Órgano de apoyo responsable de proveer y gestionar de forma eficiente los recursos financieros, tecnológicos y materiales necesarios.',
      icon: Layers
    },
    {
      id: 'recursos_humanos',
      name: 'Gestión de Recursos Humanos',
      category: 'SubArea',
      secretarias: 2,
      secretariaType: 'Secretaría de Recursos Humanos',
      subUnits: [
        'Bienestar de Personal',
        'Escalafón',
        'Remuneraciones y Pensiones',
        'Secretaría Técnica de Procesos Administrativos Disciplinarios',
        'NEXUS'
      ],
      description: 'Sub-área que pertenece orgánicamente a la Oficina de Administración, dedicada a la selección, capacitación, bienestar, planillas, escalafón y disciplina del personal docente y administrativo de la UGEL.',
      icon: Users
    },
    {
      id: 'tramite_documentario',
      name: 'Trámite Documentario y Atención al Usuario',
      category: 'SubArea',
      secretarias: 0,
      subUnits: [
        'Archivo Central',
        'Actas y Certificados',
        'Comunicaciones e Imagen Institucional'
      ],
      description: 'Unidad de mesa de partes, recepción de solicitudes, expedientes físicos/digitales y atención directa al ciudadano.',
      icon: FileSpreadsheet
    },
    {
      id: 'gestion_institucional',
      name: 'Área de Gestión Institucional (AGI)',
      category: 'Linea',
      secretarias: 1,
      secretariaType: 'Secretaría de Gestión Institucional',
      subUnits: [
        'Estadística',
        'Infraestructura',
        'Planificación',
        'Presupuesto',
        'Racionalización',
        'SIAGIE',
        'Finanzas'
      ],
      description: 'Órgano de línea encargado de planificar, presupuestar y racionalizar los recursos, supervisando la infraestructura, estadística y sistemas de información como el SIAGIE.',
      icon: Network
    },
    {
      id: 'gestion_pedagogica',
      name: 'Área de Gestión Pedagógica (AGP)',
      category: 'Linea',
      secretarias: 2,
      secretariaType: 'Secretaría de Gestión Pedagógica',
      subUnits: [
        'Especialistas de Educación Inicial',
        'Especialistas de Educación Primaria',
        'Especialistas de Educación Secundaria',
        'Coordinadores de PRONOEI'
      ],
      description: 'Órgano de línea encargado de orientar y evaluar el desarrollo curricular, el acompañamiento pedagógico, y el monitoreo de las Instituciones Educativas.',
      icon: GraduationCap
    }
  ];

  // Filter items
  const filteredDependencies = dependencies.filter(node => {
    const matchesSearch = node.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          node.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (node.subUnits && node.subUnits.some(s => s.toLowerCase().includes(searchQuery.toLowerCase())));
    const matchesSecretariasOnly = !showSecretariesOnly || node.secretarias > 0;
    return matchesSearch && matchesSecretariasOnly;
  });

  const activeNode = dependencies.find(d => d.id === selectedNode) || dependencies[0];

  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-6 space-y-6 z-10 relative" id="organigrama_view_container">
      
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 rounded-2xl bg-white/70 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 shadow-sm backdrop-blur">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/10 tracking-widest uppercase">
            🏛️ Estructura Orgánica UGEL
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white uppercase tracking-tight">
            Organigrama Funcional y Secretarías
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
            Visualice la jerarquía de las Unidades de Gestión Educativa Local. El mapa muestra las dependencias y resalta exactamente cuáles áreas cuentan con soporte de secretarias asignadas oficialmente.
          </p>
        </div>
        
        {/* Info badging of secretarias */}
        <div className="flex flex-wrap gap-2">
          <div className="px-3.5 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-center">
            <div className="text-lg font-black text-indigo-600 dark:text-indigo-400">8</div>
            <div className="text-[9px] font-bold uppercase text-slate-400">Secretarias Totales</div>
          </div>
          <div className="px-3.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
            <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">5</div>
            <div className="text-[9px] font-bold uppercase text-slate-400">Áreas con Secretaría</div>
          </div>
        </div>
      </div>

      {/* Control Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-slate-100/50 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-200/50 dark:border-slate-800/50">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Buscar oficina, sub-unidad o secretaria..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-all font-sans"
            id="organigrama_search_input"
          />
        </div>

        <button
          onClick={() => setShowSecretariesOnly(!showSecretariesOnly)}
          className={`flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all active:scale-95 border ${
            showSecretariesOnly 
              ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm' 
              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
          }`}
          id="toggle_secretaries_filter_btn"
        >
          <UserCheck size={13} />
          <span>Filtrar: Solo con Secretaria</span>
        </button>
      </div>

      <div className="grid lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Interactive Organization Tree Map */}
        <div className="lg:col-span-8 space-y-6">
          <div className="p-6 rounded-2xl bg-white/70 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 shadow-sm backdrop-blur relative overflow-hidden min-h-[500px]">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-6 flex items-center justify-between">
              <span>Estructura Interactiva</span>
              <span className="text-indigo-500 animate-pulse">● Haga clic en cualquier módulo</span>
            </div>

            {/* Hierarchical Tree Render using stylized flex grids */}
            <div className="flex flex-col items-center gap-8 py-4 relative z-10 font-sans">
              
              {/* Level 1: Dirección general (Top Node) */}
              <div className="w-full max-w-xs flex flex-col items-center">
                <button
                  onClick={() => setSelectedNode('direccion')}
                  className={`w-full p-4 rounded-xl border text-center transition-all duration-300 relative ${
                    selectedNode === 'direccion'
                      ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 shadow-md scale-105'
                      : 'border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/80 hover:border-indigo-400'
                  }`}
                  id="organigrama_node_direccion"
                >
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-indigo-600 text-white text-[8px] font-black uppercase rounded tracking-widest">
                    DIRECCIÓN
                  </div>
                  <Building className="mx-auto text-indigo-500 mb-1.5" size={18} />
                  <h4 className="text-xs font-bold uppercase text-slate-900 dark:text-white">
                    Dirección de la UGEL
                  </h4>
                  <div className="mt-2 flex items-center justify-center gap-1">
                    <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-extrabold flex items-center gap-1 uppercase">
                      👤👤 Secretaría General (2)
                    </span>
                  </div>
                </button>
                
                {/* Vertical Line down */}
                <div className="h-8 w-0.5 bg-slate-300 dark:bg-slate-700"></div>
              </div>

              {/* Level 2: Apoyo & Staff offices (Horizontal row with control/asesoría) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 w-full relative">
                {/* Horizontal connection line backer */}
                <div className="hidden md:block absolute top-0 left-[16%] right-[16%] h-0.5 bg-slate-300 dark:bg-slate-700 -translate-y-8"></div>
                
                {/* OCI */}
                <div className="flex flex-col items-center">
                  <div className="hidden md:block h-8 w-0.5 bg-slate-300 dark:bg-slate-700 -mt-8"></div>
                  <button
                    onClick={() => setSelectedNode('control_institucional')}
                    className={`w-full p-3 rounded-lg border text-center transition-all duration-300 ${
                      selectedNode === 'control_institucional'
                        ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 shadow-md'
                        : 'border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/80 hover:border-indigo-400'
                    }`}
                    id="organigrama_node_oci"
                  >
                    <FolderLock className="mx-auto text-slate-400 dark:text-slate-500 mb-1" size={15} />
                    <h5 className="text-[10px] font-bold uppercase text-slate-800 dark:text-slate-200">
                      Control Institucional
                    </h5>
                    <span className="text-[8px] uppercase text-slate-400 block mt-1">Sin secretaria asignada</span>
                  </button>
                </div>

                {/* Asesoría Jurídica */}
                <div className="flex flex-col items-center">
                  <div className="hidden md:block h-8 w-0.5 bg-slate-300 dark:bg-slate-700 -mt-8"></div>
                  <button
                    onClick={() => setSelectedNode('asesoria_juridica')}
                    className={`w-full p-3 rounded-lg border text-center transition-all duration-300 ${
                      selectedNode === 'asesoria_juridica'
                        ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 shadow-md'
                        : 'border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/80 hover:border-indigo-400'
                    }`}
                    id="organigrama_node_oaj"
                  >
                    <ShieldAlert className="mx-auto text-slate-400 dark:text-slate-500 mb-1" size={15} />
                    <h5 className="text-[10px] font-bold uppercase text-slate-800 dark:text-slate-200">
                      Asesoría Jurídica
                    </h5>
                    <span className="text-[8px] uppercase text-slate-400 block mt-1">Sin secretaria asignada</span>
                  </button>
                </div>

                {/* Administración */}
                <div className="flex flex-col items-center col-span-1 sm:col-span-2 md:col-span-1 gap-3">
                  <div className="hidden md:block h-8 w-0.5 bg-slate-300 dark:bg-slate-700 -mt-8"></div>
                  <div className="w-full flex flex-col items-center gap-2 p-2.5 rounded-xl bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200/60 dark:border-slate-800/60">
                    <button
                      onClick={() => setSelectedNode('administracion')}
                      className={`w-full p-3 rounded-lg border text-center transition-all duration-300 relative ${
                        selectedNode === 'administracion'
                          ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 shadow-md'
                          : 'border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/80 hover:border-indigo-400'
                      }`}
                      id="organigrama_node_administracion"
                    >
                      <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-slate-500 text-white text-[7px] font-black uppercase rounded">
                        APOYO
                      </div>
                      <Layers className="mx-auto text-indigo-500 mb-1" size={15} />
                      <h5 className="text-[10px] font-bold uppercase text-slate-900 dark:text-white">
                        Administración
                      </h5>
                      <span className="text-[8px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold inline-block mt-1 uppercase">
                        👤 1 Secretaria
                      </span>
                    </button>

                    {/* Vertical connector to its child sub-unit */}
                    <div className="h-3 w-0.5 bg-slate-300 dark:bg-slate-700"></div>

                    {/* Recursos Humanos styled as dependent child inside Administration */}
                    <button
                      onClick={() => setSelectedNode('recursos_humanos')}
                      className={`w-full p-2.5 rounded-lg border text-center transition-all duration-300 relative ${
                        selectedNode === 'recursos_humanos'
                          ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 shadow-md'
                          : 'border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/80 hover:border-indigo-400'
                      }`}
                      id="organigrama_node_rrhh"
                    >
                      <div className="absolute -top-2 left-4 px-1.5 py-0.2 bg-rose-500 text-white text-[6px] font-black uppercase rounded">
                        Sub-Área de Adm.
                      </div>
                      <Users className="mx-auto text-rose-500 mb-1" size={14} />
                      <h6 className="text-[9px] font-bold uppercase text-slate-800 dark:text-slate-100 leading-tight">
                        Gestión de Recursos Humanos
                      </h6>
                      <span className="text-[7.5px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-extrabold inline-block mt-1 uppercase">
                        👤👤 2 Secretarias
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Vertical link line from administration / upper blocks down to core line areas */}
              <div className="h-6 w-0.5 bg-slate-300 dark:bg-slate-700"></div>

              {/* Level 3: Line Areas (Gestión Institucional and Gestión Pedagógica side-by-side) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full relative">
                {/* Connection bar */}
                <div className="hidden sm:block absolute top-0 left-[25%] right-[25%] h-0.5 bg-slate-300 dark:bg-slate-700 -translate-y-6"></div>
                
                {/* Gestión Institucional */}
                <div className="flex flex-col items-center">
                  <div className="hidden sm:block h-6 w-0.5 bg-slate-300 dark:bg-slate-700 -mt-6"></div>
                  <button
                    onClick={() => setSelectedNode('gestion_institucional')}
                    className={`w-full p-4 rounded-xl border text-center transition-all duration-300 relative ${
                      selectedNode === 'gestion_institucional'
                        ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 shadow-md'
                        : 'border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/80 hover:border-indigo-400'
                    }`}
                    id="organigrama_node_agi"
                  >
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-indigo-600 text-white text-[8px] font-black uppercase rounded tracking-widest">
                      LÍNEA (AGI)
                    </div>
                    <Network className="mx-auto text-indigo-500 mb-1.5" size={16} />
                    <h4 className="text-xs font-bold uppercase text-slate-900 dark:text-white">
                      Área de Gestión Institucional
                    </h4>
                    <span className="mt-2 inline-block px-2.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 font-extrabold text-[9px] uppercase">
                      👤 1 Secretaria
                    </span>
                  </button>
                </div>

                {/* Gestión Pedagógica */}
                <div className="flex flex-col items-center">
                  <div className="hidden sm:block h-6 w-0.5 bg-slate-300 dark:bg-slate-700 -mt-6"></div>
                  <button
                    onClick={() => setSelectedNode('gestion_pedagogica')}
                    className={`w-full p-4 rounded-xl border text-center transition-all duration-300 relative ${
                      selectedNode === 'gestion_pedagogica'
                        ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 shadow-md'
                        : 'border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/80 hover:border-indigo-400'
                    }`}
                    id="organigrama_node_agp"
                  >
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-indigo-600 text-white text-[8px] font-black uppercase rounded tracking-widest">
                      LÍNEA (AGP)
                    </div>
                    <GraduationCap className="mx-auto text-indigo-500 mb-1.5" size={16} />
                    <h4 className="text-xs font-bold uppercase text-slate-900 dark:text-white">
                      Área de Gestión Pedagógica
                    </h4>
                    <span className="mt-2 inline-block px-2.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-extrabold text-[9px] uppercase">
                      👤👤 2 Secretarias
                    </span>
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Right Side: Interactive Details of selected node */}
        <div className="lg:col-span-4 space-y-6">
          <div className="p-5 rounded-2xl bg-white/70 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 shadow-sm backdrop-blur space-y-4">
            
            {/* Header selection card */}
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="p-2 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl">
                {React.createElement(activeNode.icon, { size: 20 })}
              </div>
              <div className="min-w-0">
                <div className="text-[9px] font-bold uppercase tracking-widest text-slate-400 font-mono">
                  {activeNode.category === 'Direccion' && 'Alta Dirección'}
                  {activeNode.category === 'Apoyo' && 'Órgano de Apoyo'}
                  {activeNode.category === 'Linea' && 'Órgano de Línea'}
                  {activeNode.category === 'SubArea' && 'Sub-Unidad Interna'}
                </div>
                <h3 className="text-xs font-black uppercase text-slate-900 dark:text-white truncate">
                  {activeNode.name}
                </h3>
              </div>
            </div>

            {/* Description */}
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-sans">
              {activeNode.description}
            </p>

            {/* Secretary assignment block (Specified by User!) */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200/50 dark:border-slate-800/50 space-y-2">
              <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                Soporte y Secretarias Asignadas:
              </div>
              
              {activeNode.secretarias > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                    <span className="text-indigo-600 dark:text-indigo-400 uppercase text-[10px]">
                      📂 {activeNode.secretariaType || 'Secretaría Directiva'}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase">
                      {activeNode.secretarias} {activeNode.secretarias === 1 ? 'Secretaria' : 'Secretarias'}
                    </span>
                  </div>
                  
                  {/* Avatars layout based on count */}
                  <div className="flex items-center gap-1.5">
                    {Array.from({ length: activeNode.secretarias }).map((_, idx) => (
                      <div key={idx} className="flex items-center gap-1 bg-white dark:bg-slate-900 px-2 py-1 rounded-lg border text-[9px] text-slate-500 font-bold uppercase">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                        <span>Sec. {idx + 1}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[9.5px] text-slate-400 leading-normal font-sans italic">
                    {activeNode.id === 'direccion' && 'Encargadas de coordinar decretos de alcaldía, resoluciones directorales, oficios múltiples de UGEL y derivación general.'}
                    {activeNode.id === 'administracion' && 'Encargada de controlar la documentación interna del área, cartas, dictámenes de proveído e informes contables.'}
                    {activeNode.id === 'recursos_humanos' && 'Controlan la recepción de expedientes de licencias, actas de bienestar, resoluciones de escalafón y la base de datos NEXUS.'}
                    {activeNode.id === 'gestion_institucional' && 'Administra la correspondencia de SIAGIE, presupuestos analíticos y trámites de infraestructura educativa.'}
                    {activeNode.id === 'gestion_pedagogica' && 'Apoyan con el monitoreo de PRONOEI, actas curriculares e informes pedagógicos anuales.'}
                  </p>
                </div>
              ) : (
                <div className="text-[10px] text-slate-400 font-semibold uppercase italic flex items-center gap-1">
                  🚫 No requiere secretaria asignada directamente.
                </div>
              )}
            </div>

            {/* Sub units or branches list */}
            {activeNode.subUnits && activeNode.subUnits.length > 0 && (
              <div className="space-y-2">
                <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                  Sub-unidades y Oficinas a cargo:
                </div>
                <div className="grid grid-cols-1 gap-1.5">
                  {activeNode.subUnits.map((sub, idx) => (
                    <div 
                      key={idx}
                      className="px-2.5 py-1.5 rounded-lg bg-indigo-50/20 dark:bg-indigo-950/10 border border-indigo-500/5 text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase truncate flex items-center gap-1.5"
                    >
                      <span className="text-indigo-400 font-mono">•</span>
                      <span>{sub}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Quick search match results helper */}
          {searchQuery && (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border text-xs space-y-2">
              <span className="text-[9px] text-slate-400 font-bold uppercase">Resultados de Búsqueda ({filteredDependencies.length}):</span>
              <div className="space-y-1.5 max-h-[220px] overflow-y-auto">
                {filteredDependencies.map(node => (
                  <button
                    key={node.id}
                    onClick={() => setSelectedNode(node.id)}
                    className="w-full text-left p-2 rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-950 text-[10px] font-bold uppercase text-slate-800 dark:text-slate-200 border truncate flex justify-between items-center"
                  >
                    <span>{node.name}</span>
                    <span className="text-[9px] text-indigo-500">
                      {node.secretarias} {node.secretarias === 1 ? 'Sec' : 'Secs'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

    </div>
  );
}
