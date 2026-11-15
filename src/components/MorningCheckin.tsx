// Check-in da manhã (~1 min), no modelo do Reaction Self Test da NASA (do protótipo).
// Grava o episódio de sono em sleep-episodes (a API calcula a duração) e as escalas em records.
// O nível de cada resposta só aparece depois de salvar, vindo da API.
import { useState } from 'react';
import { ClipboardCheck, Sparkles } from 'lucide-react';
import { api } from '../services/api';
import { AREA } from '../config/api';
import { useStore, XP_PER_CHECKIN, dayKey } from '../store/useStore';
import { fmtHours } from '../lib/format';
import { KSS_LABELS, SP_LABELS } from '../lib/content';
import { Modal } from './ui';

/** Escala visual analógica: 0 a 100 por baixo, mas sem número na tela; só os rótulos das pontas. */
function Slider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="text-[13px] text-ink">{label}</span>
      <input type="range" min={0} max={100} value={value} onChange={(e) => onChange(+e.target.value)}
        aria-valuetext={`${value}% of the way from Very low to Very high`}
        className="w-full mt-1 accent-brand" />
      <div className="flex justify-between text-[12px] text-ink-3" aria-hidden="true"><span>Very low</span><span>Very high</span></div>
    </label>
  );
}

/** "22:30" de ontem e "06:30" de hoje viram instantes com fuso. */
function toInstants(bed: string, wake: string) {
  const [bh, bm] = bed.split(':').map(Number); const [wh, wm] = wake.split(':').map(Number);
  const w = new Date(); w.setHours(wh, wm, 0, 0);
  if (w.getTime() > Date.now()) w.setDate(w.getDate() - 1);
  const b = new Date(w); b.setHours(bh, bm, 0, 0);
  if (b.getTime() >= w.getTime()) b.setDate(b.getDate() - 1);
  return { bedAt: b, wakeAt: w };
}

export function MorningCheckin() {
  const open = useStore((s) => s.checkinOpen); const setOpen = useStore((s) => s.setCheckinOpen);
  return (
    <Modal open={open} onClose={() => setOpen(false)} title="Morning check-in" sub="About 1 minute · based on NASA's ISS Reaction Self Test" icon={<ClipboardCheck size={18} />} wide>
      <CheckinForm onSaved={() => setOpen(false)} />
    </Modal>
  );
}

function CheckinForm({ onSaved }: { onSaved: () => void }) {
  const { refresh, addXp, ui } = useStore();
  const done = ui.checkins.includes(dayKey());
  const [bed, setBed] = useState('22:30'); const [wake, setWake] = useState('06:30');
  const [lat, setLat] = useState(15); const [awake, setAwake] = useState(10);
  const [q, setQ] = useState(70); const [kss, setKss] = useState(3); const [sp, setSp] = useState(3);
  const [stress, setStress] = useState(30); const [mood, setMood] = useState(70);
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);

  const { bedAt, wakeAt } = toInstants(bed, wake);
  // Só uma prévia de leitura; a duração gravada é a que a API calcula.
  const preview = Math.max(0, (wakeAt.getTime() - bedAt.getTime()) / 3600000 - (lat + awake) / 60);

  const save = async () => {
    setBusy(true); setError(null);
    try {
      await api.sleepEpisode({ bedAt: bedAt.toISOString(), wakeAt: wakeAt.toISOString(), sleepLatencyMinutes: lat, awakeMinutes: awake });
      const recordedAt = new Date().toISOString();
      await api.records(AREA.isolation, [
        { indicator: 'sleep_quality', value: q, unit: null, recordedAt },
        { indicator: 'sleepiness_kss', value: kss, unit: null, recordedAt },
        { indicator: 'fatigue_samn_perelli', value: sp, unit: null, recordedAt },
        { indicator: 'stress', value: stress, unit: null, recordedAt },
        { indicator: 'mood_score', value: mood, unit: null, recordedAt },
      ]);
      if (!done) addXp(XP_PER_CHECKIN, true);
      await refresh(); onSaved();
    } catch (e: any) { setError(e?.message ?? 'Could not save.'); } finally { setBusy(false); }
  };

  return (
    <div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(125px,1fr))] gap-2">
        <label className="text-[12px] text-ink-3">Went to bed<input className="field mt-1" type="time" value={bed} onChange={(e) => setBed(e.target.value)} /></label>
        <label className="text-[12px] text-ink-3">Got up<input className="field mt-1" type="time" value={wake} onChange={(e) => setWake(e.target.value)} /></label>
        <label className="text-[12px] text-ink-3">Min. to fall asleep<input className="field mt-1" type="number" min={0} value={lat} onChange={(e) => setLat(Math.max(0, +e.target.value))} /></label>
        <label className="text-[12px] text-ink-3">Min. awake at night<input className="field mt-1" type="number" min={0} value={awake} onChange={(e) => setAwake(Math.max(0, +e.target.value))} /></label>
      </div>
      <p className="mt-2 text-[12px] text-ink-3">Time asleep: <b className="text-ink font-mono">{fmtHours(preview)}</b> <span className="text-ink-3">(NASA plan: 8h30)</span></p>

      <div className="mt-5">
        <p className="text-[12px] text-ink-2">How sleepy do you feel right now? <span className="text-ink-3">(1-9, KSS reference, own labels)</span></p>
        <div className="grid grid-cols-9 gap-1 mt-2">
          {KSS_LABELS.map((label, i) => {
            const v = i + 1; const sel = v === kss;
            return <button key={v} title={label} onClick={() => setKss(v)}
              className={`h-11 rounded-lg border text-[13px] font-semibold transition ${sel ? 'text-white border-brand bg-brand/20' : 'text-ink-3 border-line hover:border-slate-500'}`}>{v}</button>;
          })}
        </div>
        <p className="text-[12px] text-ink-3 mt-1.5">{kss}: {KSS_LABELS[kss - 1]}</p>
      </div>

      <div className="mt-4">
        <p className="text-[12px] text-ink-2">Which statement best describes how you feel right now? <span className="text-ink-3">(Samn-Perelli)</span></p>
        <select value={sp} onChange={(e) => setSp(+e.target.value)} className="field mt-2 !py-2.5">
          {SP_LABELS.map((o, i) => <option key={i} value={i + 1}>{i + 1}. {o}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-4 mt-5">
        <Slider label="Stress" value={stress} onChange={setStress} />
        <Slider label="Mood" value={mood} onChange={setMood} />
        <Slider label="Sleep quality" value={q} onChange={setQ} />
      </div>
      <p className="text-[12px] text-ink-3 mt-2">Stress, mood and sleep quality are compared with your own usual range, not with a fixed cut-off. Prototype scales, not validated instruments.</p>
      {error && <p className="text-[12px] text-red-300 mt-2">{error}</p>}

      <footer className="flex flex-wrap items-center justify-between gap-3 mt-5 pt-4 border-t border-line">
        <span className="text-[12px] text-ink-2 inline-flex items-center gap-1"><Sparkles size={12} />{done ? 'Check-in already saved today' : `+${XP_PER_CHECKIN} XP for completing it, whatever your answers`}</span>
        <button onClick={save} disabled={busy} className="bg-brand hover:bg-brand-soft text-space-bg text-[13px] font-semibold rounded-xl px-5 py-2.5 disabled:opacity-60">{busy ? 'Saving…' : done ? 'Save new check-in' : 'Save check-in'}</button>
      </footer>
    </div>
  );
}
