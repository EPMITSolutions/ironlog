'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { useProfile } from '@/store'
import { dbGetAll, dbPut, exportData, importData, uuid } from '@/lib/db'
import { GOAL_LABELS } from '@/lib/utils'
import { Download, Upload, Pencil, Check, X, Scale } from 'lucide-react'

export default function Profile() {
  const { profile, update } = useProfile()
  const [sc, setSC] = useState(0)
  const [pc, setPC] = useState(0)
  const [metrics, setMetrics] = useState<any[]>([])
  const [showM, setShowM] = useState(false)
  const [editing, setEditing] = useState(false)
  const [newName, setNewName] = useState('')
  const [m, setM] = useState({ weight: '', fat: '', chest: '', waist: '', bicep: '', thigh: '' })

  useEffect(() => {
    const load = async () => {
      const [s, p, bm] = await Promise.all([dbGetAll('sessions'), dbGetAll('personal_records'), dbGetAll('body_metrics')])
      setSC(s.filter((x: any) => x.finished_at).length)
      setPC(p.filter((x: any) => x.pr_type === 'max_weight').length)
      setMetrics(bm.sort((a: any, b: any) => a.recorded_at.localeCompare(b.recorded_at)))
    }
    load()
  }, [])

  const latestMetric = metrics.at(-1)

  const saveMetric = async () => {
    const today = new Date().toISOString().split('T')[0]
    const existing = metrics.find((x: any) => x.recorded_at === today)
    const data = {
      id: existing?.id ?? uuid(), recorded_at: today,
      weight_kg: parseFloat(m.weight) || null,
      body_fat_pct: parseFloat(m.fat) || null,
      chest_cm: parseFloat(m.chest) || null,
      waist_cm: parseFloat(m.waist) || null,
      bicep_cm: parseFloat(m.bicep) || null,
      thigh_cm: parseFloat(m.thigh) || null,
    }
    await dbPut('body_metrics', data)
    const updated = await dbGetAll('body_metrics')
    setMetrics(updated.sort((a: any, b: any) => a.recorded_at.localeCompare(b.recorded_at)))
    setShowM(false)
    setM({ weight: '', fat: '', chest: '', waist: '', bicep: '', thigh: '' })
  }

  const doExport = async () => {
    const json = await exportData()
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([json], { type: 'application/json' })),
      download: `ironlog-${new Date().toISOString().split('T')[0]}.json`
    })
    a.click()
  }

  const doImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return
    await importData(await f.text())
    alert('Datos importados correctamente. Recarga la página.')
  }

  // Gráfica de peso corporal (últimas 10 medidas)
  const weightData = metrics.filter((m: any) => m.weight_kg).slice(-10)
  const maxW = weightData.length ? Math.max(...weightData.map((m: any) => m.weight_kg)) : 100
  const minW = weightData.length ? Math.min(...weightData.map((m: any) => m.weight_kg)) : 60

  return (
    <div className="px-5 pt-14 pb-4 space-y-6">
      {/* Header perfil */}
      <div className="flex flex-col items-center py-4 space-y-3">
        <div className="w-20 h-20 rounded-full bg-accent/20 border-2 border-accent flex items-center justify-center">
          <span className="font-heading text-4xl text-accent">{(profile?.full_name ?? 'U')[0].toUpperCase()}</span>
        </div>
        {editing ? (
          <div className="flex items-center gap-2">
            <input className="bg-card border border-accent rounded-xl px-3 py-2 text-white text-base text-center outline-none w-48"
              value={newName} onChange={e => setNewName(e.target.value)} autoFocus
              onKeyDown={e => { if (e.key === 'Enter') { update({ full_name: newName }); setEditing(false) } }} />
            <button onClick={() => { update({ full_name: newName }); setEditing(false) }} className="text-accent font-bold text-lg">✓</button>
            <button onClick={() => setEditing(false)} className="text-white/30 text-lg">✕</button>
          </div>
        ) : (
          <button onClick={() => { setNewName(profile?.full_name ?? ''); setEditing(true) }}
            className="font-heading text-3xl text-white tracking-wide">
            {profile?.full_name ?? 'Usuario'} <span className="text-lg">✏️</span>
          </button>
        )}
        <span className="bg-accent/20 border border-accent/40 text-accent text-sm px-4 py-1.5 rounded-full">
          {GOAL_LABELS[profile?.goal ?? 'general']}
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2.5">
        {[
          { l: 'Sesiones', v: sc },
          { l: 'Records', v: pc, a: true },
          { l: 'Peso actual', v: latestMetric?.weight_kg ? `${latestMetric.weight_kg}kg` : '—' }
        ].map(({ l, v, a }) => (
          <div key={l} className={`bg-card border rounded-2xl p-3 text-center ${a ? 'border-accent' : 'border-border'}`}>
            <p className="font-heading text-2xl text-accent leading-tight">{v}</p>
            <p className="text-white/30 text-xs mt-1">{l}</p>
          </div>
        ))}
      </div>

      {/* Medidas + gráfica peso */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-heading text-xl text-white tracking-wide">Medidas corporales</h2>
          <button onClick={() => setShowM(true)} className="text-accent text-sm">+ Registrar</button>
        </div>
        {latestMetric ? (
          <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
            <p className="text-white/20 text-xs">Última: {new Date(latestMetric.recorded_at).toLocaleDateString('es', { dateStyle: 'medium' })}</p>
            <div className="grid grid-cols-3 gap-3">
              {[['Peso', latestMetric.weight_kg, 'kg'], ['%Grasa', latestMetric.body_fat_pct, '%'], ['Pecho', latestMetric.chest_cm, 'cm'], ['Cintura', latestMetric.waist_cm, 'cm'], ['Bícep', latestMetric.bicep_cm, 'cm'], ['Muslo', latestMetric.thigh_cm, 'cm']]
                .filter(([, v]) => v != null)
                .map(([l, v, u]) => (
                  <div key={l as string} className="text-center">
                    <p className="font-heading text-xl text-white leading-tight">{v}{u}</p>
                    <p className="text-white/20 text-xs mt-0.5">{l as string}</p>
                  </div>
                ))}
            </div>

            {/* Gráfica evolución peso */}
            {weightData.length >= 2 && (
              <div>
                <p className="text-white/20 text-xs mb-2">Evolución del peso</p>
                <div className="flex items-end gap-1 h-16">
                  {weightData.map((md: any, i: number) => {
                    const h = maxW === minW ? 50 : Math.max(10, ((md.weight_kg - minW) / (maxW - minW)) * 100)
                    const isLast = i === weightData.length - 1
                    return (
                      <div key={md.id} className="flex-1 flex flex-col items-center gap-1">
                        {isLast && <span className="text-accent text-[9px] font-bold">{md.weight_kg}</span>}
                        <div className="w-full rounded-sm" style={{ height: `${h}%`, minHeight: 4, backgroundColor: isLast ? '#C8F135' : '#2A2A2A' }} />
                        <span className="text-white/10 text-[8px]">{new Date(md.recorded_at).toLocaleDateString('es', { day: 'numeric', month: 'short' })}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-card border border-border rounded-2xl p-4">
            <p className="text-white/30 text-sm mb-2">Sin medidas todavía.</p>
            <button onClick={() => setShowM(true)} className="text-accent text-sm">Registrar primera medida →</button>
          </div>
        )}
      </div>

      {/* Objetivo */}
      <div>
        <h2 className="font-heading text-xl text-white tracking-wide mb-3">Mi objetivo</h2>
        <div className="flex flex-wrap gap-2">
          {Object.entries(GOAL_LABELS).map(([k, v]) => (
            <button key={k} onClick={() => update({ goal: k })}
              className={`px-4 py-2 rounded-xl border text-sm transition-all ${profile?.goal === k ? 'border-accent bg-accent/20 text-accent font-semibold' : 'border-border bg-card text-white/50'}`}>
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Backup */}
      <div>
        <h2 className="font-heading text-xl text-white tracking-wide mb-3">Backup de datos</h2>
        <div className="bg-card border border-border rounded-2xl divide-y divide-border">
          <button onClick={doExport} className="w-full flex justify-between items-center px-4 py-3.5 active:opacity-70">
            <div>
              <p className="text-white text-sm text-left"<Download size={14} /> Exportar datos</p>
              <p className="text-white/20 text-xs mt-0.5">Descarga un JSON con todo tu historial</p>
            </div>
            <span className="text-white/20">›</span>
          </button>
          <label className="w-full flex justify-between items-center px-4 py-3.5 cursor-pointer active:opacity-70">
            <div>
              <p className="text-white text-sm"<Upload size={14} /> Importar datos</p>
              <p className="text-white/20 text-xs mt-0.5">Restaura desde un backup anterior</p>
            </div>
            <span className="text-white/20">›</span>
            <input type="file" accept=".json" className="hidden" onChange={doImport} />
          </label>
        </div>
        <p className="text-white/20 text-xs mt-2 text-center">Exporta regularmente para no perder datos al cambiar de dispositivo</p>
      </div>

      <p className="text-white/10 text-xs text-center pb-4">IronLog · Datos guardados en tu dispositivo</p>

      {/* Modal medidas */}
      {showM && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end">
          <div className="w-full max-w-md mx-auto bg-surface rounded-t-3xl p-5 pb-10">
            <p className="font-heading text-2xl text-white tracking-wide mb-1">Registrar medidas</p>
            <p className="text-white/30 text-sm mb-4 capitalize">{new Date().toLocaleDateString('es', { dateStyle: 'long' })}</p>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {[['Peso (kg)', 'weight'], ['% Grasa', 'fat'], ['Pecho (cm)', 'chest'], ['Cintura (cm)', 'waist'], ['Bícep (cm)', 'bicep'], ['Muslo (cm)', 'thigh']].map(([l, k]) => (
                <div key={k}>
                  <p className="text-white/30 text-xs mb-1.5">{l}</p>
                  <input type="number" inputMode="decimal"
                    className="w-full bg-card border border-border rounded-xl px-3 py-2.5 text-white text-center text-sm outline-none focus:border-accent"
                    value={(m as any)[k]} onChange={e => setM(x => ({ ...x, [k]: e.target.value }))} placeholder="—" />
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowM(false)} className="flex-1 bg-card border border-border rounded-xl py-3 text-white/40 text-sm">Cancelar</button>
              <button onClick={saveMetric} className="flex-1 bg-accent text-black font-bold rounded-xl py-3 text-sm">Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
