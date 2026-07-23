import { useState, useEffect } from 'react'
import { Building, RefreshCw, ChevronRight, ChevronDown } from 'lucide-react'

export default function OrganigramaView() {
  const [areas, setAreas] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    fetch('/api/organigrama')
      .then(r => r.json())
      .then(d => {
        if (d?.areas) setAreas(d.areas)
        if (d?.users) setUsers(d.users)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const membersOf = (id: string) =>
    users.filter(u => (u.areaIds || [u.areaId]).includes(id))

  const root = areas.filter((a: any) => !a.parentAreaId)

  function Node({ id, name, depth }: { id: string; name: string; depth: number }) {
    const [open, setOpen] = useState(depth < 2)
    const children = areas.filter((a: any) => a.parentAreaId === id)
    const hasKids = children.length > 0
    const m = membersOf(id)

    return (
      <div>
        <div
          className="flex items-center gap-1 py-1.5 px-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer text-xs group"
          style={{ paddingLeft: depth * 20 + 8 + 'px' }}
          onClick={() => hasKids && setOpen(!open)}
        >
          <span className="w-4 shrink-0 text-slate-400">
            {hasKids ? (open ? <ChevronDown size={12} /> : <ChevronRight size={12} />) : null}
          </span>
          <Building size={12} className="shrink-0 text-slate-400" />
          <span className={depth === 0 ? 'font-bold' : depth === 1 ? 'font-semibold' : ''}>
            {name}
          </span>
          <span className="ml-auto shrink-0 text-[10px] text-slate-400">
            {m.length} miembro{m.length !== 1 ? 's' : ''}
            {m.filter(u => u.condicion === 'Secretaria').length > 0 && (
              <span className="ml-1.5 text-amber-500 font-bold">
                · {m.filter(u => u.condicion === 'Secretaria').length} Sec
              </span>
            )}
          </span>
        </div>
        {hasKids && open && (
          <div className="ml-4 border-l border-slate-200 dark:border-slate-700">
            {children.map((c: any) => (
              <Node key={c.id} id={c.id} name={c.name} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-500">UGEL · Organigrama</p>
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">Estructura Orgánica</h2>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800">
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Actualizar
        </button>
      </div>

      <div className="rounded-xl border bg-white dark:bg-slate-900/60 p-4">
        {loading ? (
          <p className="text-xs text-slate-400 py-8 text-center">Cargando...</p>
        ) : root.length === 0 ? (
          <p className="text-xs text-slate-400 py-8 text-center">No hay áreas registradas.</p>
        ) : (
          root.map((a: any) => <Node key={a.id} id={a.id} name={a.name} depth={0} />)
        )}
      </div>
    </div>
  )
}
