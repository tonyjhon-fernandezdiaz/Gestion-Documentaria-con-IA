import React, { useState, useEffect } from 'react';
import { 
  Network, Search, Users, Building, UserCheck, HelpCircle, Plus, Layers, 
  ShieldAlert, FileSpreadsheet, GraduationCap, Scale, HeartHandshake, RefreshCw
} from 'lucide-react';
import { safeStorage } from '../utils/storage';

interface OrgNode {
  id: string;
  name: string;
  category: 'Direccion' | 'Apoyo' | 'Linea' | 'SubArea';
  secretarias: number;
  secretariaType?: string;
  children: OrgNode[];
  allMembers: number;
}

export default function OrganigramaView() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNode, setSelectedNode] = useState<string | null>('dir');
  const [showSecretariesOnly, setShowSecretariesOnly] = useState(false);
  const [areas, setAreas] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  const getToken = () => safeStorage.getItem('saved_session_token');
  const authHeaders = () => ({ 'Authorization': `Bearer ${getToken()}` });

  useEffect(() => {
    fetch('/api/areas').then(r => r.json()).then(setAreas).catch(() => {});
    fetch('/api/users', { headers: authHeaders() })
      .then(r => r.json())
      .then(data => setUsers(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const getMemberIds = (areaId: string): string[] => {
    return users.filter(u => (u.areaIds || (u.areaId ? [u.areaId] : [])).includes(areaId)).map(u => u.id);
  };

  const getSecretariaCount = (areaId: string): number => {
    return users.filter(u => {
      const inArea = (u.areaIds || (u.areaId ? [u.areaId] : [])).includes(areaId);
      return inArea && u.condicion === 'Secretaria';
    }).length;
  };

  const buildTree = (parentId?: string): OrgNode[] => {
    return areas
      .filter((a: any) => parentId ? a.parentAreaId === parentId : !a.parentAreaId)
      .map((a: any) => ({
        id: a.id,
        name: a.name,
        category: a.id === 'dir' ? 'Direccion' as const :
                 a.name.includes('Oficina') || a.id === 'oaj' || a.id === 'adm' ? 'Apoyo' as const :
                 a.parentAreaId && !['oaj','adm','agi','agp'].includes(a.id) ? 'SubArea' as const :
                 'Linea' as const,
        secretarias: getSecretariaCount(a.id),
        secretariaType: getSecretariaCount(a.id) > 0 ? `Secretaría de ${a.name.replace(/^(Oficina de|Área de) /, '')}` : undefined,
        children: buildTree(a.id),
        allMembers: getMemberIds(a.id).length
      }));
  };

  const tree = buildTree();
  const getNodeById = (id: string, nodes: OrgNode[] = tree): OrgNode | null => {
    for (const n of nodes) { if (n.id === id) return n; const r = getNodeById(id, n.children); if (r) return r; }
    return null;
  };
  const activeNode = getNodeById(selectedNode || '');

  const getSubUnitNames = (id: string): string[] => {
    const node = getNodeById(id);
    if (!node) return [];
    const subs: string[] = [];
    for (const c of node.children) {
      subs.push(c.name);
      for (const cc of c.children) subs.push(`  · ${cc.name}`);
    }
    return subs;
  };

  const totalSecretarias = users.filter(u => u.condicion === 'Secretaria').length;
  const areasWithSec = areas.filter((a: any) => getSecretariaCount(a.id) > 0).length;

  const allNodes: OrgNode[] = [];
  const flatten = (nodes: OrgNode[]) => { for (const n of nodes) { allNodes.push(n); flatten(n.children); } };
  flatten(tree);

  const filteredNodes = allNodes.filter(n => {
    const matchesSearch = n.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSec = !showSecretariesOnly || n.secretarias > 0;
    return matchesSearch && matchesSec;
  });

  const dirNode = tree[0];
  const officeNodes = dirNode?.children.filter(c => c.category === 'Apoyo') || [];
  const lineNodes = dirNode?.children.filter(c => c.category === 'Linea') || [];

  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-6 space-y-6 z-10 relative" id="organigrama_view_container">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 rounded-2xl bg-white/70 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 shadow-sm backdrop-blur">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/10 tracking-widest uppercase">
              🏛️ Estructura Orgánica UGEL
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white uppercase tracking-tight">
              Organigrama Funcional
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
              Mapa interactivo con las áreas y oficinas registradas. Seleccione cualquier unidad para ver sus detalles.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => { fetch('/api/areas').then(r => r.json()).then(setAreas).catch(() => {}); fetch('/api/users', { headers: authHeaders() }).then(r => r.json()).then(data => setUsers(Array.isArray(data) ? data : [])).catch(() => {}); }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-95">
              <RefreshCw size={13} /> <span>Actualizar</span>
            </button>
          <div className="px-3.5 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-center">
            <div className="text-lg font-black text-indigo-600 dark:text-indigo-400">{totalSecretarias}</div>
            <div className="text-[9px] font-bold uppercase text-slate-400">Secretarias Totales</div>
          </div>
          <div className="px-3.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
            <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">{areasWithSec}</div>
            <div className="text-[9px] font-bold uppercase text-slate-400">Áreas con Secretaría</div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-slate-100/50 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-200/50 dark:border-slate-800/50">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Buscar oficina, sub-unidad o secretaria..." value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-all font-sans" />
        </div>
        <button onClick={() => setShowSecretariesOnly(!showSecretariesOnly)}
          className={`flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all active:scale-95 border ${showSecretariesOnly ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm' : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'}`}>
          <UserCheck size={13} />
          <span>Filtrar: Solo con Secretaria</span>
        </button>
      </div>

      <div className="grid lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 space-y-6">
          <div className="p-6 rounded-2xl bg-white/70 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 shadow-sm backdrop-blur relative overflow-hidden min-h-[500px]">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-6 flex items-center justify-between">
              <span>Estructura Interactiva</span>
              <span className="text-indigo-500 animate-pulse">● Haga clic en cualquier módulo</span>
            </div>

            {tree.length > 0 && (
              <div className="flex flex-col items-center gap-8 py-4 relative z-10 font-sans">
                {/* Level 1: Dirección */}
                <div className="w-full max-w-xs flex flex-col items-center">
                  <button onClick={() => setSelectedNode('dir')}
                    className={`w-full p-4 rounded-xl border text-center transition-all duration-300 relative ${selectedNode === 'dir' ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 shadow-md scale-105' : 'border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/80 hover:border-indigo-400'}`}>
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-indigo-600 text-white text-[8px] font-black uppercase rounded tracking-widest">DIRECCIÓN</div>
                    <Building className="mx-auto text-indigo-500 mb-1.5" size={18} />
                    <h4 className="text-xs font-bold uppercase text-slate-900 dark:text-white">Dirección de la UGEL</h4>
                    <div className="mt-2 flex items-center justify-center gap-1">
                      {dirNode && (
                        <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-extrabold flex items-center gap-1 uppercase">
                          👤{dirNode.secretarias > 0 ? `👤 Secretaría General (${dirNode.secretarias})` : ''}
                        </span>
                      )}
                    </div>
                  </button>
                  <div className="h-8 w-0.5 bg-slate-300 dark:bg-slate-700"></div>
                </div>

                {/* Level 2: Oficinas */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full relative max-w-2xl mx-auto">
                  <div className="hidden sm:block absolute top-0 left-[25%] right-[25%] h-0.5 bg-slate-300 dark:bg-slate-700 -translate-y-8"></div>
                  
                  {officeNodes.map((office) => (
                    <div key={office.id} className="flex flex-col items-center">
                      <div className="hidden sm:block h-8 w-0.5 bg-slate-300 dark:bg-slate-700 -mt-8"></div>
                      {office.children.filter(c => c.category === 'SubArea').length > 0 ? (
                        <div className="w-full flex flex-col items-center gap-2 p-2.5 rounded-xl bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200/60 dark:border-slate-800/60">
                          <button onClick={() => setSelectedNode(office.id)}
                            className={`w-full p-3 rounded-lg border text-center transition-all duration-300 relative ${selectedNode === office.id ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 shadow-md' : 'border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/80 hover:border-indigo-400'}`}>
                            <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-slate-500 text-white text-[7px] font-black uppercase rounded">APOYO</div>
                            {office.id === 'adm' ? <Layers className="mx-auto text-indigo-500 mb-1" size={15} /> : <ShieldAlert className="mx-auto text-slate-400 dark:text-slate-500 mb-1" size={15} />}
                            <h5 className="text-[10px] font-bold uppercase text-slate-900 dark:text-white">{office.name}</h5>
                            {office.secretarias > 0 ? (
                              <span className="text-[8px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold inline-block mt-1 uppercase">👤 {office.secretarias} Secretaria{office.secretarias !== 1 ? 's' : ''}</span>
                            ) : (
                              <span className="text-[8px] uppercase text-slate-400 block mt-1">Sin secretaria</span>
                            )}
                          </button>
                          {office.children.filter(c => c.category === 'SubArea').map((sub) => (
                            <React.Fragment key={sub.id}>
                              <div className="h-3 w-0.5 bg-slate-300 dark:bg-slate-700"></div>
                              <button onClick={() => setSelectedNode(sub.id)}
                                className={`w-full p-2.5 rounded-lg border text-center transition-all duration-300 relative ${selectedNode === sub.id ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 shadow-md' : 'border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/80 hover:border-indigo-400'}`}>
                                <div className="absolute -top-2 left-4 px-1.5 py-0.2 bg-rose-500 text-white text-[6px] font-black uppercase rounded">Sub-Área</div>
                                <Users className="mx-auto text-rose-500 mb-1" size={14} />
                                <h6 className="text-[9px] font-bold uppercase text-slate-800 dark:text-slate-100 leading-tight">{sub.name}</h6>
                                {sub.secretarias > 0 ? (
                                  <span className="text-[7.5px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-extrabold inline-block mt-1 uppercase">👤👤 {sub.secretarias} Secretarias</span>
                                ) : (
                                  <span className="text-[7.5px] text-slate-400 block mt-1">Sin secretaria</span>
                                )}
                              </button>
                            </React.Fragment>
                          ))}
                        </div>
                      ) : (
                        <button onClick={() => setSelectedNode(office.id)}
                          className={`w-full p-3 rounded-lg border text-center transition-all duration-300 ${selectedNode === office.id ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 shadow-md' : 'border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/80 hover:border-indigo-400'}`}>
                          {office.id === 'adm' ? <Layers className="mx-auto text-indigo-500 mb-1" size={15} /> : <ShieldAlert className="mx-auto text-slate-400 dark:text-slate-500 mb-1" size={15} />}
                          <h5 className="text-[10px] font-bold uppercase text-slate-900 dark:text-white">{office.name}</h5>
                          {office.secretarias > 0 ? (
                            <span className="text-[8px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold inline-block mt-1 uppercase">👤 {office.secretarias} Secretaria{office.secretarias !== 1 ? 's' : ''}</span>
                          ) : (
                            <span className="text-[8px] uppercase text-slate-400 block mt-1">Sin secretaria</span>
                          )}
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Vertical connector */}
                {lineNodes.length > 0 && <div className="h-6 w-0.5 bg-slate-300 dark:bg-slate-700"></div>}

                {/* Level 3: Áreas de Línea */}
                {lineNodes.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full relative">
                    <div className="hidden sm:block absolute top-0 left-[25%] right-[25%] h-0.5 bg-slate-300 dark:bg-slate-700 -translate-y-6"></div>
                    {lineNodes.map((area) => (
                      <div key={area.id} className="flex flex-col items-center">
                        <div className="hidden sm:block h-6 w-0.5 bg-slate-300 dark:bg-slate-700 -mt-6"></div>
                        <button onClick={() => setSelectedNode(area.id)}
                          className={`w-full p-4 rounded-xl border text-center transition-all duration-300 relative ${selectedNode === area.id ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 shadow-md' : 'border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/80 hover:border-indigo-400'}`}>
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-indigo-600 text-white text-[8px] font-black uppercase rounded tracking-widest">
                            LÍNEA ({area.id.toUpperCase()})
                          </div>
                          {area.id === 'agi' ? (
                            <Network className="mx-auto text-indigo-500 mb-1.5" size={16} />
                          ) : (
                            <GraduationCap className="mx-auto text-indigo-500 mb-1.5" size={16} />
                          )}
                          <h4 className="text-xs font-bold uppercase text-slate-900 dark:text-white">{area.name}</h4>
                          {area.secretarias > 0 ? (
                            <span className="mt-2 inline-block px-2.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 font-extrabold text-[9px] uppercase">
                              👤 {area.secretarias} Secretaria{area.secretarias !== 1 ? 's' : ''}
                            </span>
                          ) : (
                            <span className="mt-2 inline-block text-[8px] text-slate-400">Sin secretaria</span>
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right panel */}
        <div className="lg:col-span-4 space-y-6">
          <div className="p-5 rounded-2xl bg-white/70 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 shadow-sm backdrop-blur space-y-4">
            {activeNode ? (
              <>
                <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="p-2 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl">
                    {activeNode.id === 'dir' ? <Building size={20} /> :
                     activeNode.id === 'adm' ? <Layers size={20} /> :
                     activeNode.id === 'oaj' ? <ShieldAlert size={20} /> :
                     activeNode.id === 'agi' ? <Network size={20} /> :
                     activeNode.id === 'agp' ? <GraduationCap size={20} /> :
                     <Users size={20} />}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[9px] font-bold uppercase tracking-widest text-slate-400 font-mono">
                      {activeNode.category === 'Direccion' ? 'Alta Dirección' :
                       activeNode.category === 'Apoyo' ? 'Órgano de Apoyo' :
                       activeNode.category === 'Linea' ? 'Órgano de Línea' :
                       'Sub-Unidad Interna'}
                    </div>
                    <h3 className="text-xs font-black uppercase text-slate-900 dark:text-white truncate">{activeNode.name}</h3>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-sans">
                  {activeNode.id === 'dir' ? 'Órgano de dirección de más alto nivel encargado de planificar, conducir y evaluar la gestión educativa, administrativa e institucional de la UGEL.' :
                   activeNode.id === 'oaj' ? 'Encargada de asesorar a la Dirección y demás áreas en asuntos jurídicos y legales de carácter administrativo e institucional.' :
                   activeNode.id === 'adm' ? 'Órgano de apoyo responsable de proveer y gestionar de forma eficiente los recursos financieros, tecnológicos y materiales necesarios.' :
                   activeNode.id === 'rrhh' ? 'Sub-área dedicada a la selección, capacitación, bienestar, planillas, escalafón y disciplina del personal docente y administrativo de la UGEL.' :
                   activeNode.id === 'agi' ? 'Órgano de línea encargado de planificar, presupuestar y racionalizar los recursos, supervisando infraestructura, estadística y sistemas de información.' :
                   activeNode.id === 'agp' ? 'Órgano de línea encargado de orientar y evaluar el desarrollo curricular, el acompañamiento pedagógico, y el monitoreo de las Instituciones Educativas.' :
                   'Unidad administrativa que depende de una oficina o área superior.'}
                </p>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200/50 dark:border-slate-800/50 space-y-2">
                  <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Soporte y Secretarias Asignadas:</div>
                  {activeNode.secretarias > 0 ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                        <span className="text-indigo-600 dark:text-indigo-400 uppercase text-[10px]">📂 {activeNode.secretariaType || 'Secretaría Directiva'}</span>
                        <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase">
                          {activeNode.secretarias} {activeNode.secretarias === 1 ? 'Secretaria' : 'Secretarias'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {Array.from({ length: activeNode.secretarias }).map((_, idx) => (
                          <div key={idx} className="flex items-center gap-1 bg-white dark:bg-slate-900 px-2 py-1 rounded-lg border text-[9px] text-slate-500 font-bold uppercase">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                            <span>Sec. {idx + 1}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-[10px] text-slate-400 font-semibold uppercase italic flex items-center gap-1">🚫 No requiere secretaria asignada directamente.</div>
                  )}
                </div>

                {activeNode.children.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Sub-unidades y Oficinas a cargo:</div>
                    <div className="grid grid-cols-1 gap-1.5">
                      {activeNode.children.map((sub) => (
                        <div key={sub.id} className="px-2.5 py-1.5 rounded-lg bg-indigo-50/20 dark:bg-indigo-950/10 border border-indigo-500/5 text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase truncate flex items-center gap-1.5">
                          <span className="text-indigo-400 font-mono">•</span>
                          <span>{sub.name} <span className="text-slate-400 font-normal">({sub.allMembers} miembro{sub.allMembers !== 1 ? 's' : ''})</span></span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="py-12 text-center text-slate-400 text-xs">No se encontró la unidad seleccionada.</div>
            )}
          </div>

          {searchQuery && (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border text-xs space-y-2">
              <span className="text-[9px] text-slate-400 font-bold uppercase">Resultados ({filteredNodes.length}):</span>
              <div className="space-y-1.5 max-h-[220px] overflow-y-auto">
                {filteredNodes.map(n => (
                  <button key={n.id} onClick={() => setSelectedNode(n.id)}
                    className="w-full text-left p-2 rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-950 text-[10px] font-bold uppercase text-slate-800 dark:text-slate-200 border truncate flex justify-between items-center">
                    <span>{n.name}</span>
                    <span className="text-[9px] text-indigo-500">{n.secretarias} {n.secretarias === 1 ? 'Sec' : 'Secs'}</span>
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