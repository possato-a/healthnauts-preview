// Painel da demonstração: os 8 cenários da API, o sensor simulado e "Reset demo".
// O cenário grava os dados pela API; o sensor ao vivo passa a repetir a mesma condição até "Back to nominal".
import { useEffect, useState } from 'react';
import { FlaskConical, Power, RotateCcw, Undo2, X } from 'lucide-react';
import { api } from '../services/api';
import { useStore } from '../store/useStore';
import { sim, type SimState } from '../sim/liveSensors';
import { setEarthLink } from '../sim/link';
import { AREA, STORAGE_KEY, UI_KEY } from '../config/api';
import { AREA_LABEL } from '../lib/content';

const SIM_FOR: Record<string, Partial<Pick<SimState, 'cabin' | 'vitals'>>> = {
  'high-co2': { cabin: 'high-co2' }, depressurization: { cabin: 'depressurization' }, 'sensor-fault': { cabin: 'offline' }, fever: { vitals: 'fever' },
};

export function useSim() {
  const [s, setS] = useState(sim.get());
  useEffect(() => sim.subscribe(setS), []);
  return s;
}

/** O botão da demonstração mora na barra do alto (Topo); o painel abre perto dele. */
export function DemoButton() {
  return (
    <button onClick={() => window.dispatchEvent(new Event('hn:demo'))} className="btn-ghost"><FlaskConical size={14} />Demo</button>
  );
}

export function DemoPanel() {
  const [open, setOpen] = useState(false);
  useEffect(() => { const t = () => setOpen((o) => !o); window.addEventListener('hn:demo', t); return () => window.removeEventListener('hn:demo', t); }, []);
  const [busy, setBusy] = useState<string | null>(null);
  const [list, setList] = useState<{ id: string; areaId: string; label: string }[]>([]);
  const refresh = useStore((s) => s.refresh); const overview = useStore((s) => s.overview);
  const s = useSim();
  useEffect(() => { api.scenarios().then((r) => setList(r.scenarios)).catch(() => setList([])); }, []);

  const run = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key);
    try { await fn(); await refresh(); } catch (e) { console.warn(e); } finally { setBusy(null); }
  };
  const scenario = (id: string) => run(id, async () => {
    await api.runScenario(id);
    if (SIM_FOR[id]) await sim.setMode(SIM_FOR[id], refresh);
  });
  const nominal = () => run('nominal', async () => {
    await sim.setMode({ cabin: 'nominal', vitals: 'nominal' }, refresh);
    if (overview?.areas.find((a) => a.areaId === AREA.radiation)?.groups.solar?.level) {
      await api.operation(AREA.radiation, 'solar', { recordedAt: new Date().toISOString(), active: false });
    }
    if (overview?.link.status === 'unavailable') await setEarthLink(true);
  });
  const reset = () => {
    sim.stop(); sim.reset();
    try { localStorage.removeItem(STORAGE_KEY); localStorage.removeItem(UI_KEY); } catch { /* ignora */ }
    api.resetDemo(); location.reload();
  };

  return (
    <>
      {open && (
        <div className="fixed top-14 right-6 z-40 w-[22rem] max-w-[calc(100vw-2.5rem)] max-h-[80vh] overflow-y-auto rounded-lg bg-white p-5 rise [box-shadow:var(--sombra-flutua)]">
          <div className="flex items-center justify-between"><h3 className="card-title">Demo scenarios</h3><button onClick={() => setOpen(false)} aria-label="Close" className="text-ink-3 hover:text-ink"><X size={18} /></button></div>
          <p className="card-sub mt-1">Simulated data only. Each scenario is written through the onboard API.</p>

          <div className="mt-3 rounded-xl bg-paper p-3.5 flex items-center justify-between gap-3">
            <div><p className="text-[13px]">Simulated live sensor</p><p className="text-[12px] text-ink-3">Cabin: {s.cabin} · Vitals: {s.vitals} · every 2 min</p></div>
            <button onClick={() => (s.on ? sim.stop() : sim.start(refresh))} className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[12px] font-medium ${s.on ? 'bg-ink text-paper' : 'bg-white text-ink-2 [box-shadow:inset_0_0_0_1px_rgb(var(--border))]'}`}>
              <Power size={12} />{s.on ? 'On' : 'Off'}
            </button>
          </div>

          <ul className="mt-3 space-y-1.5">
            {list.map((sc) => (
              <li key={sc.id}>
                <button disabled={!!busy} onClick={() => scenario(sc.id)} className="w-full text-left rounded-xl hover:bg-paper px-3 py-2 transition-colors disabled:opacity-50 [box-shadow:inset_0_0_0_1px_rgb(var(--border))]">
                  <span className="block text-[13px] text-ink">{busy === sc.id ? 'Running…' : sc.label}</span>
                  <span className="block text-[12px] text-ink-3">{AREA_LABEL[sc.areaId]}{sc.id === 'sensor-fault' ? ' · readings stop; Unavailable once the last one is older than 5 min' : ''}</span>
                </button>
              </li>
            ))}
            <li>
              <button disabled={!!busy} onClick={() => run('exercise', () => sim.setMode({ vitals: 'exercise' }, refresh))} className="w-full text-left rounded-xl hover:bg-paper px-3 py-2 transition-colors disabled:opacity-50 [box-shadow:inset_0_0_0_1px_rgb(var(--border))]">
                <span className="block text-[13px] text-ink">Exercising (live sensor)</span><span className="block text-[12px] text-ink-3">Gravity · vital signs with activity = exercise</span>
              </button>
            </li>
          </ul>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button disabled={!!busy} onClick={nominal} className="btn-ghost text-[12px]"><Undo2 size={13} />Back to nominal</button>
            <button onClick={reset} className="btn-ghost text-[12px]"><RotateCcw size={13} />Reset demo</button>
          </div>
          <p className="text-[12px] text-ink-3 mt-2">Back to nominal: the live sensor sends normal readings again and the Earth link returns. Alerts close only when a valid reading is back in range (the CO₂ 1-hour average takes up to an hour).</p>
        </div>
      )}
    </>
  );
}
