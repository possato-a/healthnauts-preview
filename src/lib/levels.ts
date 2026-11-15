// Cor, rótulo e ícone de cada nível (especificação 2.1). Rótulo, ícone e ação vêm de shared/config/levels.js,
// a mesma tabela que a API devolve em /overview → levels. A COR na tela é a do tema claro (Calm Instrument):
// os mesmos matizes da especificação (verde, azul, amarelo, laranja, vermelho, cinza), mais fundos e escuros,
// para o texto do nível ter pelo menos 4,5:1 sobre o branco e o fundo tingido (`soft`).
import { CircleCheck, CircleDashed, Info, OctagonAlert, Siren, TriangleAlert, type LucideIcon } from 'lucide-react';
import { levels, rank } from '../../shared/config/levels.js';
import type { AlertLevel, DisplayLevel } from '../services/api';
import { color, level } from '../design/tokens';

const ICONS: Record<string, LucideIcon> = { CircleCheck, Info, TriangleAlert, OctagonAlert, Siren, CircleDashed };

/** color: ponto, ícone e dado em destaque · text: texto do nível · soft: fundo tingido. (Os valores estão em src/design/tokens.ts.) */
const THEME: Record<DisplayLevel, { color: string; text: string; soft: string }> = level;

export interface LevelUi { label: string; color: string; text: string; soft: string; icon: string; action: string; Icon: LucideIcon }
export const LEVEL_UI = Object.fromEntries(Object.entries(levels).map(([id, l]) =>
  [id, { ...l, ...THEME[id as DisplayLevel], Icon: ICONS[l.icon] }])) as Record<DisplayLevel, LevelUi>;

/** Os gráficos: o verde é a série principal; as barras de apoio e a faixa pessoal em verde claro (nunca o azul do Advisory). */
export const GREEN: string = color.brand;
export const NEUTRAL: string = color.greenLine;
export const BAND: string = color.band;
export const INK: string = color.text;
export const INK_2: string = color.text2;
export const INK_3: string = color.text3;
export const LINE: string = color.border;

/** Só para ordenar listas na tela (o nível em si vem da API). */
export const severity = (level: AlertLevel | null | undefined) => rank(level ?? null) as number;
export const isFlagged = (d: DisplayLevel) => d !== 'normal' && d !== 'unavailable';
