// A casca (a da Atehra): o menu cinza à esquerda e, à direita, o painel branco com a barra no alto (o caminho, a demo e o
// sino) e a área que rola. Menu: Today, os 5 riscos RIDGE (letra, nome e o estado) e Me; no pé, a missão.
// No celular, o menu vira uma gaveta. O nível de cada área vem da API (nada decide nível aqui).
import { useEffect, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { NavLink, useLocation } from 'react-router-dom';
import { Activity, Brain, LayoutGrid, Menu, PanelLeft, Radiation, Satellite, User, Wind, X, type LucideIcon } from 'lucide-react';
import { useStore } from '../store/useStore';
import { AREA } from '../config/api';
import { LEVEL_UI } from '../lib/levels';
import { color } from '../design/tokens';
import { worstLevel } from '../../shared/config/levels.js';
import { fmtDuration } from '../lib/format';
import type { DisplayLevel } from '../services/api';
import { Notifications } from './Notifications';
import { AlertBanner, EmergencyOverlay } from './AlertBanner';
import { DemoButton, DemoPanel, useSim } from './DemoPanel';
import { MorningCheckin } from './MorningCheckin';
import { PvtTest } from './PvtTest';
import { useIndicatorFocus } from './lean/TopicDetail';
import { cn } from '../lib/utils';

type Item = { to: string; label: string; letter?: string; icon: LucideIcon; area: string | null };
// RIDGE: Radiation, Isolation, Distance, Gravity, Environment (a ordem da NASA).
const RIDGE: Item[] = [
  { to: '/radiation', label: 'Radiation', letter: 'R', icon: Radiation, area: AREA.radiation },
  { to: '/isolation', label: 'Isolation', letter: 'I', icon: Brain, area: AREA.isolation },
  { to: '/distance', label: 'Distance', letter: 'D', icon: Satellite, area: AREA.distance },
  { to: '/gravity', label: 'Gravity', letter: 'G', icon: Activity, area: AREA.gravity },
  { to: '/environment', label: 'Environment', letter: 'E', icon: Wind, area: AREA.cabin },
];
const NOME_DA_TELA: Record<string, string> = { '/': 'Today', '/profile': 'Me', ...Object.fromEntries(RIDGE.map((r) => [r.to, r.label])) };

/** Marca: a órbita com o tripulante (um ponto) dentro. */
export function Mark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="15" fill={color.brand} />
      <ellipse cx="16" cy="16" rx="11" ry="4.6" fill="none" stroke={color.card} strokeWidth="1.3" transform="rotate(-28 16 16)" opacity="0.9" />
      <circle cx="16" cy="16" r="4.2" fill={color.card} />
      <circle cx="25.2" cy="11.3" r="1.6" fill={color.card} />
    </svg>
  );
}

/** Relógio da missão (MET: dias:horas:minutos:segundos desde o início), ao vivo. */
export function MissionClock({ startedAt }: { startedAt: string }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const s = Math.max(0, Math.floor((now - Date.parse(startedAt)) / 1000));
  const p = (n: number) => String(n).padStart(2, '0');
  return <span className="font-mono tabular-nums">{String(Math.floor(s / 86400)).padStart(3, '0')}:{p(Math.floor(s / 3600) % 24)}:{p(Math.floor(s / 60) % 60)}:{p(s % 60)}</span>;
}

export function AppShell({ children }: { children: ReactNode }) {
  const overview = useStore((s) => s.overview); const mission = useStore((s) => s.mission);
  const s = useSim();
  const [open, setOpen] = useState(false);
  const [slim, setSlim] = useState(() => { try { return localStorage.getItem('hn.menu') === 'slim'; } catch { return false; } });
  const toggleSlim = () => setSlim((v) => { const n = !v; try { localStorage.setItem('hn.menu', n ? 'slim' : 'wide'); } catch { /* ok */ } return n; });
  const { pathname } = useLocation();
  useIndicatorFocus();
  useEffect(() => { document.getElementById('rolagem')?.scrollTo({ top: 0 }); }, [pathname]);
  const levelOf = (area: string | null): DisplayLevel | null => {
    if (!area || !overview) return null;
    const a = overview.areas.find((x) => x.areaId === area);
    // Na gravidade o sinal vital tem nível próprio; o menu usa a mesma prioridade da API (worstLevel de shared/).
    if (area === AREA.gravity && a) return worstLevel([a.headline, { ...overview.vitalSigns, critical: true }]).displayLevel as DisplayLevel;
    return a?.displayLevel ?? null;
  };
  const day = mission ? Math.floor((Date.now() - Date.parse(mission.input.startedAt)) / 86400000) + 1 : null;
  const link = overview?.link;
  const delay = link ? (link.status === 'unavailable' ? 'No link' : fmtDuration(link.oneWaySeconds)) : '—';

  // `fino`: o menu recolhido (só os ícones, com o nome na dica).
  const linha = (t: Item, fino: boolean) => {
    const lv = levelOf(t.area); const ui = lv ? LEVEL_UI[lv] : null;
    const Icone = t.icon;
    const alerta = ui && lv !== 'normal' && lv !== 'unavailable';
    return (
      <NavLink key={t.to} to={t.to} end={t.to === '/'} onClick={() => setOpen(false)} title={fino ? t.label : undefined}
        className={({ isActive }) => cn('group relative flex h-8 !min-h-0 items-center gap-2.5 rounded-md text-[13px] transition-colors duration-150', fino ? 'justify-center !min-w-0 px-0' : 'px-2',
          isActive ? 'font-semibold text-ink' : 'text-ink-2 hover:bg-black/[.04] hover:text-ink')}>
        {({ isActive }) => (<>
          {isActive && <motion.span layoutId="nav-bg" className="absolute inset-0 rounded-md bg-black/[.055]" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
          <Icone size={16} strokeWidth={1.6} className="relative shrink-0 text-ink-3 transition-transform duration-200 group-hover:scale-110 group-hover:text-ink" aria-hidden="true" />
          {!fino && <span className="relative flex-1">{t.label}</span>}
          {!fino && alerta && <span className="relative inline-flex items-center gap-1 rounded-full px-1.5 text-[11px] font-medium" style={{ color: ui!.text, background: ui!.soft }}>{ui && <ui.Icon size={11} strokeWidth={2.4} aria-hidden="true" />}{ui!.label}</span>}
          {!fino && ui && !alerta && <span className="relative size-1.5 rounded-full" style={{ background: ui.color }} aria-label={ui.label} />}
          {fino && ui && <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full" style={{ background: ui.color }} aria-label={ui.label} />}
        </>)}
      </NavLink>
    );
  };

  const menu = (fino: boolean) => (
    <>
      <div className={cn('flex h-8 items-center pb-1', fino ? 'justify-center' : 'gap-2 px-2')}>
        {!fino && <><Mark /><span className="flex-1 text-[14px] font-semibold tracking-[-0.01em]">Healthnauts</span></>}
        <button onClick={toggleSlim} aria-label={fino ? 'Expand the menu' : 'Collapse the menu'} title={fino ? 'Expand the menu' : 'Collapse the menu'}
          className="hidden size-7 !min-h-0 !min-w-0 place-items-center rounded-md text-ink-3 hover:bg-black/[.05] hover:text-ink md:grid">{fino ? <Mark /> : <PanelLeft size={16} strokeWidth={1.6} />}</button>
      </div>
      <nav className="mt-2 grid gap-0.5" aria-label="Main">
        {linha({ to: '/', label: 'Today', icon: LayoutGrid, area: null }, fino)}
        {fino ? <span className="mx-2 my-2 border-t border-line" /> : <p className="eyebrow px-2 pb-1 pt-4">Hazards · RIDGE</p>}
        {RIDGE.map((r) => linha(r, fino))}
      </nav>
      {/* No pé, só o essencial: onde a missão está e o perfil */}
      <div className="mt-auto grid gap-1 pt-3">
        {!fino ? (
          <p className="flex items-center justify-between px-2 pb-1 text-[12px] text-ink-3">
            <span>{mission?.input.destination ?? '—'} · Day {day ?? '—'}</span>
            <span className="inline-flex items-center gap-1.5 font-mono" title={`Delay to Earth ${delay} · live sensor ${s.on ? 'on' : 'off'}`}>
              {delay}<span className={cn('size-1.5 rounded-full', s.on ? 'bg-good breathe' : 'bg-ink-3')} />
            </span>
          </p>
        ) : (
          <span className="mx-auto grid size-6 place-items-center" title={`${mission?.input.destination ?? ''} · Day ${day ?? '—'} · delay ${delay} · sensor ${s.on ? 'on' : 'off'}`}><span className={cn('size-1.5 rounded-full', s.on ? 'bg-good breathe' : 'bg-ink-3')} /></span>
        )}
        <NavLink to="/profile" onClick={() => setOpen(false)} title={fino ? 'Me' : undefined}
          className={({ isActive }) => cn('relative flex h-9 !min-h-0 items-center gap-2.5 rounded-md text-[13px] transition-colors', fino ? 'justify-center !min-w-0 px-0' : 'px-2', isActive ? 'font-semibold text-ink' : 'text-ink-2 hover:bg-black/[.04] hover:text-ink')}>
          {({ isActive }) => (<>
            {isActive && <motion.span layoutId="nav-bg" className="absolute inset-0 rounded-md bg-black/[.055]" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
            <span className="relative grid size-5 shrink-0 place-items-center rounded-full bg-brand text-white"><User size={11} strokeWidth={2.2} /></span>
            {!fino && <span className="relative">Me</span>}
          </>)}
        </NavLink>
      </div>
    </>
  );

  return (
    <div className="flex h-screen">
      <EmergencyOverlay />
      <aside className={cn('hidden shrink-0 flex-col px-2 py-3 transition-[width] duration-300 md:flex', slim ? 'w-[56px]' : 'w-[232px]')}>{menu(slim)}</aside>
      {open && (
        <div className="fixed inset-0 z-50 bg-black/20 md:hidden" onClick={() => setOpen(false)}>
          <aside className="absolute inset-y-0 left-0 flex w-[260px] flex-col bg-paper px-2 py-3" onClick={(e) => e.stopPropagation()}>{menu(false)}</aside>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col bg-white md:my-2 md:mr-2 md:overflow-hidden md:rounded-md md:border md:border-line">
        {/* A barra no alto: o caminho à esquerda; a demo e o sino à direita */}
        <div className="flex h-12 shrink-0 items-center gap-2 px-3">
          <button className="grid size-8 !min-h-0 !min-w-0 place-items-center rounded-md text-ink-2 hover:bg-black/[.05] md:hidden" onClick={() => setOpen(true)} aria-label="Open menu">{open ? <X size={18} /> : <Menu size={18} />}</button>
          <p className="text-[13px] text-ink-3">Healthnauts <span className="mx-1">/</span> <span className="text-ink">{NOME_DA_TELA[pathname] ?? ''}</span></p>
          <span className="flex-1" />
          <DemoButton />
          <Notifications />
        </div>
        <div id="rolagem" className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          <AlertBanner />
          <div key={pathname} className="page-in">{children}</div>
        </div>
      </div>
      <DemoPanel />
      <MorningCheckin />
      <PvtTest />
    </div>
  );
}
