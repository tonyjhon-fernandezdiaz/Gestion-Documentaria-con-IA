import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  Video, 
  Plus, 
  Trash2, 
  ExternalLink, 
  AlertCircle, 
  Check, 
  FileText, 
  Bell, 
  RefreshCw,
  Info,
  ChevronRight
} from 'lucide-react';
import { AgendaEvent, User as UserType } from '../types';
import { safeStorage } from '../utils/storage';

interface AgendaViewProps {
  currentUser: UserType;
}

export default function AgendaView({ currentUser }: AgendaViewProps) {
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState<string>('todos');

  // Form states
  const [title, setTitle] = useState('');
  const [fecha, setFecha] = useState('');
  const [tipo, setTipo] = useState<'Reunión' | 'Trámite' | 'Recordatorio' | 'Otro'>('Reunión');
  const [descripcion, setDescripcion] = useState('');
  const [enlace, setEnlace] = useState('');

  // Toast message
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const token = safeStorage.getItem('saved_session_token');
      const response = await fetch('/api/agenda', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        // Sort events by date ascending
        setEvents(data.sort((a: AgendaEvent, b: AgendaEvent) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()));
      }
    } catch (e) {
      console.error('Error fetching agenda events:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !fecha) {
      setErrorMsg('Por favor complete los campos obligatorios (Título y Fecha).');
      return;
    }

    try {
      const token = safeStorage.getItem('saved_session_token');
      const response = await fetch('/api/agenda', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title,
          fecha,
          tipo,
          descripcion,
          enlace: enlace.trim() || undefined
        })
      });

      if (response.ok) {
        setSuccessMsg('Evento agendado con éxito.');
        setTitle('');
        setFecha('');
        setTipo('Reunión');
        setDescripcion('');
        setEnlace('');
        setTimeout(() => setSuccessMsg(null), 3000);
        fetchEvents();
      } else {
        const err = await response.json();
        setErrorMsg(err.error || 'No se pudo agregar el evento.');
        setTimeout(() => setErrorMsg(null), 3000);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Error de conexión.');
      setTimeout(() => setErrorMsg(null), 3000);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!window.confirm('¿Está seguro de eliminar este evento de la agenda?')) return;

    try {
      const token = safeStorage.getItem('saved_session_token');
      const response = await fetch(`/api/agenda?id=${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setSuccessMsg('Evento eliminado.');
        setTimeout(() => setSuccessMsg(null), 3000);
        fetchEvents();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getCountdown = (dateStr: string) => {
    const diff = new Date(dateStr).getTime() - new Date().getTime();
    if (diff < 0) {
      return 'Concluido / Pasado';
    }
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `En ${days} ${days === 1 ? 'día' : 'días'}`;
    if (hours > 0) return `En ${hours} ${hours === 1 ? 'hora' : 'horas'}`;
    return `En ${mins} ${mins === 1 ? 'minuto' : 'minutos'}`;
  };

  const filteredEvents = events.filter(e => filterType === 'todos' || e.tipo === filterType);

  return (
    <div className="space-y-6 text-slate-800 dark:text-slate-100 font-sans" id="agenda_view">
      
      {/* Tab Header block matching screenshot standards */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Calendar className="text-rose-500" size={24} />
            <span>Agenda del Área</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Organiza tus reuniones, links de Zoom/Teams, plazos de expedientes y recordatorios de trabajo
          </p>
        </div>
        <button
          onClick={fetchEvents}
          className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 px-4 py-2 rounded-2xl shadow-sm text-xs text-slate-500 font-medium flex items-center gap-1.5 hover:bg-slate-50 transition-all"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          <span>Sincronizar</span>
        </button>
      </div>

      <div className="grid lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT PANEL: Create Event Form */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] p-6 shadow-sm space-y-5">
          <div className="border-b border-slate-50 dark:border-slate-800 pb-3">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <Plus size={16} className="text-rose-500" />
              <span>Programar Evento</span>
            </h2>
          </div>

          <form onSubmit={handleAddEvent} className="space-y-4">
            {/* Title */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Asunto / Título *
              </label>
              <input 
                type="text"
                required
                placeholder="Ej. Reunión de Racionalización de Plazas"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-rose-500 transition-colors"
              />
            </div>

            {/* Event Type & Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Tipo de Evento
                </label>
                <select
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value as any)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-rose-500 transition-colors"
                >
                  <option value="Reunión">Reunión 👥</option>
                  <option value="Trámite">Trámite 📝</option>
                  <option value="Recordatorio">Recordatorio ⏰</option>
                  <option value="Otro">Otro 🏷️</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Fecha y Hora *
                </label>
                <input 
                  type="datetime-local"
                  required
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-rose-500 transition-colors font-mono"
                />
              </div>
            </div>

            {/* Virtual Link / URL */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Enlace de Videollamada (Zoom/Meets)</span>
                <span className="text-[10px] text-slate-400 font-normal">Opcional</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Video size={14} />
                </div>
                <input 
                  type="url"
                  placeholder="https://zoom.us/j/... ó https://meet.google.com/..."
                  value={enlace}
                  onChange={(e) => setEnlace(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-rose-500 transition-colors font-mono"
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Detalles / Agenda de la sesión
              </label>
              <textarea 
                rows={3}
                placeholder="Indica puntos clave a tratar, participantes o requisitos..."
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-rose-500 transition-colors resize-none"
              />
            </div>

            {successMsg && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs border border-emerald-500/10 flex items-center gap-1.5">
                <Check size={14} />
                <span>{successMsg}</span>
              </div>
            )}

            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs border border-rose-500/10 flex items-center gap-1.5">
                <AlertCircle size={14} />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <Plus size={14} />
              <span>Agendar Evento</span>
            </button>
          </form>
        </div>

        {/* RIGHT PANEL: Events List / Calendar Agenda View */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Quick Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {['todos', 'Reunión', 'Trámite', 'Recordatorio', 'Otro'].map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 capitalize ${
                  filterType === type
                    ? 'bg-rose-600 text-white shadow-md'
                    : 'bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                }`}
              >
                {type === 'todos' ? 'Todos 🗓️' : type === 'Reunión' ? 'Reuniones 👥' : type === 'Trámite' ? 'Trámites 📝' : type === 'Recordatorio' ? 'Recordatorios ⏰' : 'Otros 🏷️'}
              </button>
            ))}
          </div>

          {/* Events Stack */}
          <div className="space-y-3" id="agenda_events_list">
            {loading && events.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800">
                <RefreshCw size={24} className="animate-spin text-rose-500 mx-auto mb-3" />
                <p>Sincronizando agenda oficial de la UGEL...</p>
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] text-slate-400 text-xs space-y-2">
                <Calendar size={36} className="text-slate-300 mx-auto mb-1" />
                <p className="font-bold text-slate-700 dark:text-slate-300">No hay pendientes programados</p>
                <p className="text-[11px]">Si tienes tareas de despacho, reuniones con directores o links de Zoom, prográmalos con el formulario de la izquierda.</p>
              </div>
            ) : (
              filteredEvents.map((event) => {
                const isPassed = new Date(event.fecha).getTime() < new Date().getTime();
                return (
                  <div 
                    key={event.id}
                    className={`p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 shadow-sm hover:border-rose-500/30 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative overflow-hidden ${
                      isPassed ? 'opacity-65' : ''
                    }`}
                  >
                    {/* Decorative side accent bar matching type */}
                    <div className={`absolute top-0 bottom-0 left-0 w-1.5 ${
                      event.tipo === 'Reunión' 
                        ? 'bg-rose-500' 
                        : event.tipo === 'Trámite' 
                        ? 'bg-amber-500' 
                        : event.tipo === 'Recordatorio' 
                        ? 'bg-blue-500' 
                        : 'bg-purple-500'
                    }`} />

                    <div className="pl-2 space-y-2 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                          event.tipo === 'Reunión'
                            ? 'bg-rose-500/10 text-rose-500'
                            : event.tipo === 'Trámite'
                            ? 'bg-amber-500/10 text-amber-500'
                            : event.tipo === 'Recordatorio'
                            ? 'bg-blue-500/10 text-blue-500'
                            : 'bg-purple-500/10 text-purple-500'
                        }`}>
                          {event.tipo}
                        </span>
                        
                        <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                          <Clock size={11} />
                          <span>{new Date(event.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                        </span>

                        <span className={`text-[9px] font-extrabold rounded px-1.5 py-0.2 ${
                          isPassed 
                            ? 'bg-slate-100 text-slate-400 dark:bg-slate-800' 
                            : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 animate-pulse'
                        }`}>
                          {getCountdown(event.fecha)}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-tight">
                          {event.title}
                        </h3>
                        {event.descripcion && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-sans pr-4">
                            {event.descripcion}
                          </p>
                        )}
                      </div>

                      {event.enlace && (
                        <div className="flex items-center gap-1.5 pt-1">
                          <a
                            href={event.enlace}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-400 text-[10px] font-bold transition-all border border-blue-100 dark:border-blue-900/40"
                          >
                            <Video size={12} className="text-blue-500 shrink-0" />
                            <span>Unirse a Videollamada (Zoom/Meet)</span>
                            <ExternalLink size={10} className="shrink-0" />
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Delete Event trigger */}
                    <div className="flex items-center self-end sm:self-center shrink-0 pr-1">
                      <button
                        onClick={() => handleDeleteEvent(event.id)}
                        className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-all active:scale-95"
                        title="Eliminar de la agenda"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
