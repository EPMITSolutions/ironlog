'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { useProfile } from '@/store'
import { dbGetAll, dbPut, exportData, importData, uuid } from '@/lib/db'
import { GOAL_LABELS } from '@/lib/utils'

export default function Profile() {
  const { profile, update } = useProfile()
  const [sc, setSC] = useState(0); const [pc, setPC] = useState(0); const [metric, setMetric] = useState<any>(null)
  const [showM, setShowM] = useState(false)
  const [editing, setEditing] = useState(false); const [newName, setNewName] = useState('')
  const [m, setM] = useState({ weight:'',fat:'',chest:'',waist:'',bicep:'',thigh:'' })

  useEffect(() => {
    const load = async () => {
      const [s, p, bm] = await Promise.all([dbGetAll('sessions'), dbGetAll('personal_records'), dbGetAll('body_metrics')])
      setSC(s.filter((x: any) => x.finished_at).length)
      setPC(p.filter((x: any) => x.pr_type === 'max_weight').length)
      const sorted = bm.sort((a: any, b: any) => b.recorded_at.localeCompare(a.recorded_at))
      setMetric(sorted[0] ?? null)
    }
    load()
  }, [])

  const saveMetric = async () => {
    const today = new Date().toISOString().split('T')[0]
    const data = { id: metric?.recorded_at===today ? metric.id : uuid(), recorded_at: today, weight_kg: parseFloat(m.weight)||null, body_fat_pct: parseFloat(m.fat)||null, chest_cm: parseFloat(m.chest)||null, waist_cm: parseFloat(m.waist)||null, bicep_cm: parseFloat(m.bicep)||null, thigh_cm: parseFloat(m.thigh)||null }
    await dbPut('body_metrics', data); setMetric(data); setShowM(false)
    setM({ weight:'',fat:'',chest:'',waist:'',bicep:'',thigh:'' })
  }

  const doExport = async () => {
    const json = await exportData()
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([json],{type:'application/json'})), download: `ironlog-${new Date().toISOString().split('T')[0]}.json` })
    a.click()
  }

  const doImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return
    await importData(await f.text())
    alert('Datos importados. Recarga la página.')
  }

  return (
    <div className="px-5 pt-14 pb-4 space-y-6">
      <div className="flex flex-col items-center py-4 space-y-3">
        <div className="w-20 h-20 rounded-full bg-accent/20 border-2 border-accent flex items-center justify-center">
          <span className="font-heading text-4xl text-accent">{(profile?.full_name??'U')[0].toUpperCase()}</span>
        </div>
        {editing ? (
          <div className="flex items-center gap-2">
            <input className="bg-card border border-accent rounded-xl px-3 py-2 text-white text-base text-center outline-none w-44" value={newName} onChange={e=>setNewName(e.target.value)} autoFocus />
            <button onClick={() => { update({full_name:newName}); setEditing(false) }} className="text-accent font-bold text-lg">✓</button>
          </div>
        ) : (
          <button onClick={() => { setNewName(profile?.full_name??''); setEditing(true) }} className="font-heading text-3xl text-white tracking-wide">
            {profile?.full_name??'Usuario'} <span className="text-base">✏️</span>
          </button>
        )}
        <span className="bg-accent/20 border border-accent/40 text-accent text-sm px-4 py-1.5 rounded-full">{GOAL_LABELS[profile?.goal??'general']}</span>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        {[{l:'Sesiones',v:sc},{l:'Records',v:pc,a:true},{l:'Peso',v:metric?.weight_kg?`${metric.weight_kg}kg`:'—'}].map(({l,v,a})=>(
          <div key={l} className={`bg-card border rounded-2xl p-3 text-center ${a?'border-accent':'border-border'}`}>
            <p className="font-heading text-2xl text-accent leading-tight">{v}</p>
            <p className="text-white/30 text-xs mt-1">{l}</p>
          </div>
        ))}
      </div>

      <div>
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-heading text-xl text-white tracking-wide">Medidas</h2>
          <button onClick={() => setShowM(true)} className="text-accent text-sm">+ Registrar</button>
        </div>
        {metric ? (
          <div className="bg-card border border-border rounded-2xl p-4">
            <p className="text-white/20 text-xs mb-3">Última: {new Date(metric.recorded_at).toLocaleDateString('es')}</p>
            <div className="grid grid-cols-3 gap-3">
              {[['Peso',metric.weight_kg,'kg'],['%Grasa',metric.body_fat_pct,'%'],['Pecho',metric.chest_cm,'cm'],['Cintura',metric.waist_cm,'cm'],['Bícep',metric.bicep_cm,'cm'],['Muslo',metric.thigh_cm,'cm']].filter(([,v])=>v!=null).map(([l,v,u])=>(
                <div key={l as string} className="text-center">
                  <p className="font-heading text-xl text-white leading-tight">{v}{u}</p>
                  <p className="text-white/20 text-xs mt-0.5">{l as string}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-2xl p-4">
            <button onClick={() => setShowM(true)} className="text-accent text-sm">Registrar medidas →</button>
          </div>
        )}
      </div>

      <div>
        <h2 className="font-heading text-xl text-white tracking-wide mb-3">Mi objetivo</h2>
        <div className="flex flex-wrap gap-2">
          {Object.entries(GOAL_LABELS).map(([k,v]) => (
            <button key={k} onClick={() => update({goal:k})} className={`px-4 py-2 rounded-xl border text-sm ${profile?.goal===k?'border-accent bg-accent/20 text-accent font-semibold':'border-border bg-card text-white/50'}`}>{v}</button>
          ))}
        </div>
      </div>

      <div>
        <h2 className="font-heading text-xl text-white tracking-wide mb-3">Backup</h2>
        <div className="bg-card border border-border rounded-2xl divide-y divide-border">
          <button onClick={doExport} className="w-full flex justify-between items-center px-4 py-3.5">
            <span className="text-white text-sm">📤 Exportar datos</span><span className="text-white/20">›</span>
          </button>
          <label className="w-full flex justify-between items-center px-4 py-3.5 cursor-pointer">
            <span className="text-white text-sm">📥 Importar datos</span><span className="text-white/20">›</span>
            <input type="file" accept=".json" className="hidden" onChange={doImport} />
          </label>
        </div>
        <p className="text-white/20 text-xs mt-2 text-center">Exporta regularmente para no perder datos</p>
      </div>

      <p className="text-white/10 text-xs text-center pb-4">IronLog · Next.js + IndexedDB</p>

      {showM && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end">
          <div className="w-full max-w-md mx-auto bg-surface rounded-t-3xl p-5 pb-10">
            <p className="font-heading text-2xl text-white tracking-wide mb-4">Registrar medidas</p>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {[['Peso (kg)','weight'],['% Grasa','fat'],['Pecho (cm)','chest'],['Cintura (cm)','waist'],['Bícep (cm)','bicep'],['Muslo (cm)','thigh']].map(([l,k])=>(
                <div key={k}>
                  <p className="text-white/30 text-xs mb-1.5">{l}</p>
                  <input type="number" className="w-full bg-card border border-border rounded-xl px-3 py-2.5 text-white text-center text-sm outline-none focus:border-accent"
                    value={(m as any)[k]} onChange={e => setM(x=>({...x,[k]:e.target.value}))} placeholder="—" />
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
