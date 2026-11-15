// Sinais vitais ao vivo (sensor simulado) + NEWS2 como referência experimental. Nível vem da API (vitalSigns / news2).
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Activity, HeartPulse } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useSim } from './DemoPanel';
import { AREA } from '../config/api';
import { ago } from '../lib/format';
import { Card, StatusPill } from './ui';
import { ComUnidade } from '../ui/pecas';

export function VitalsCard({ detailed }: { detailed?: boolean }) {
  const vital = useStore((s) => s.overview?.vitalSigns);
  const news2 = useStore((s) => s.details[AREA.gravity]?.assessments.find((a) => a.indicator === 'news2'));
  const s = useSim();
  const m = s.lastVitals?.measurements;
  // Aberto pelo coração da RIDGE Scene: rola até este cartão.
  const focus = (useLocation().state as { focus?: string } | null)?.focus === 'vitals';
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (detailed && focus) ref.current?.scrollIntoView({ block: 'center' }); }, [detailed, focus]);
  const items: [string, string][] = m ? [
    ['Heart rate', `${m.heart_rate.value} bpm`], ['Blood pressure', `${m.blood_pressure_systolic.value}/${m.blood_pressure_diastolic.value} mmHg`],
    ['Respiratory rate', `${m.respiratory_rate.value} /min`], ['SpO₂', `${m.spo2.value}%`], ['Temperature', `${m.body_temperature.value} °C`],
  ] : [];
  return (
    <div ref={ref} id="vital-signs" className="scroll-mt-48">
    <Card title="Vital signs" sub={`Simulated wrist sensor · ${s.lastVitals ? 'updated ' + ago(s.lastVitals.recordedAt) : 'waiting for a reading'}${s.lastVitals?.activity === 'exercise' ? ' · exercising' : ''}`}
      icon={<HeartPulse size={15} />} right={vital && <StatusPill level={vital.displayLevel} />}>
      <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-5">
        {items.map(([k, v]) => (
          <div key={k} className="grid gap-1.5"><p className="text-[12px] text-ink-3">{k}</p><p className="serif num text-[22px] leading-none"><ComUnidade valor={v} /></p></div>
        ))}
      </div>
      {vital?.message && <p className="text-[13px] text-ink-2">{vital.message}</p>}
      {news2 && (
        <div className="grid gap-2 rounded-md bg-paper-2 px-3.5 py-3">
          <p className="inline-flex items-center gap-1.5 text-[13px] text-ink-2"><Activity size={13} />Early warning score (terrestrial reference, experimental): <b className="num text-ink">{news2.score ?? '—'}</b></p>
          {detailed && news2.components && (
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(news2.components as Record<string, number>).map(([k, pts]) => (
                <span key={k} className="chip bg-white normal-case">{k.replace(/_/g, ' ')}: {pts}</span>
              ))}
            </div>
          )}
          <p className="text-[12px] text-ink-3">{news2.limitation}</p>
        </div>
      )}
    </Card>
    </div>
  );
}
