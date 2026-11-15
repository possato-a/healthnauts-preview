// Configuração da API. Sem VITE_API_BASE_URL o app usa o roteador local de shared/ (Opção A, padrão no Pages).
export const API_BASE_URL: string | undefined = import.meta.env.VITE_API_BASE_URL || undefined;
export const ASTRONAUT_ID = 'astro_demo_001';
/** O nome mostrado na saudação do Today (a demo não tem cadastro de pessoa: troque aqui). */
export const CREW_NAME = 'Alex';
export const DATASET = 'simulated' as const;
export const STORAGE_KEY = 'healthnauts:store';
export const UI_KEY = 'healthnauts:ui';

export const AREA = {
  radiation: 'radiation',
  isolation: 'isolation_confinement',
  distance: 'distance_from_earth',
  gravity: 'gravity_fields',
  cabin: 'hostile_closed_environment',
} as const;
export type AreaId = (typeof AREA)[keyof typeof AREA];
