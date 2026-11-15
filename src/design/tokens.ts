// O DESIGN SYSTEM, num lugar só. Mude um valor aqui e muda no app inteiro:
//   · cada cor vira uma variável CSS (--bg, --brand, --good…), que o Tailwind (tailwind.config.js) e o src/index.css usam;
//   · os gráficos e o corpo 3D leem os mesmos valores por `color` (eles precisam do valor, não da variável);
//   · os níveis de alerta (cor, fundo e texto de cada um) ficam em `level`.
// Regra: nenhuma tela escreve uma cor (#hex) nem um tamanho solto; usa a classe do Tailwind (bg-brand, text-ink-3, bg-track…) ou o que sai daqui.
// A escala de tipo e o espaçamento estão em `escala`; as peças (Painel, Numero, Tabela…) em src/ui/pecas.tsx.

export const color = {
  // superfícies e linhas
  bg: '#F7F6F3',        // o fundo da janela e do menu: um off-white com um fio de calor
  bg2: '#EFEEEA',       // um tom abaixo: hover e botões de escolha
  card: '#FFFFFF',      // o painel e os cartões
  border: '#E7E6E1',    // contornos e linhas de 1 px
  track: '#E9E8E3',     // o trilho das barras de progresso
  hover: '#F5F5F2',     // o fundo de uma célula ou linha sob o mouse
  // texto
  text: '#161615',      // tinta
  text2: '#4B4A4A',     // texto secundário
  text3: '#727170',     // legendas (4,9:1 no branco)
  mark: '#9A9993',      // marcas finas: tracinhos de limite
  disabled: '#C3C2BA',  // o que não se escolhe
  // a cor da marca (a ação, a escolha, a série principal dos gráficos)
  brand: '#0B6B4A',
  brandSoft: '#095A3E', // no hover
  greenSoft: '#E3EFE8', // o fundo claro do verde
  greenLine: '#A8CDBA', // barras de apoio
  band: '#D6E2DA',      // a faixa pessoal nos gráficos
  // melhor / pior numa variação (não são níveis de alerta)
  good: '#1A7F37', goodSoft: '#DDF5E3',
  bad: '#C0233A', badSoft: '#FDE7EB',
  quiet: '#4B4A4A', quietSoft: '#F0F0EE',
} as const;

/** Os níveis de alerta (especificação 2.1): cor (ponto, ícone, dado), texto e o fundo tingido. A única cor de verdade fora o verde da marca. */
export const level = {
  normal: { color: '#2F9E6A', text: '#1F7550', soft: '#E8F3EC' },
  advisory: { color: '#2F7FC0', text: '#215F92', soft: '#E7F0F8' },
  caution: { color: '#D19A06', text: '#8A6500', soft: '#FBF3DC' },
  warning: { color: '#E0661F', text: '#A9480F', soft: '#FCEBDF' },
  emergency: { color: '#D23B30', text: '#AE2A21', soft: '#FBE6E3' },
  unavailable: { color: '#A3A29B', text: '#686761', soft: '#EFEDE5' },
} as const;

/** A escala de tipo (px) e de espaço. Quatro tamanhos de texto e dois de destaque; 20 px entre blocos e por dentro deles. */
export const escala = {
  micro: 11, apoio: 12, texto: 13, titulo: 14,           // texto: legenda, apoio, corpo e título de painel
  numero: 28, numeroGrafico: 22, pagina: 32,             // destaque: o número do cartão, o do gráfico e o título da página
  espaco: 20,                                            // entre blocos e por dentro deles
} as const;

const kebab = (s: string) => s.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`).replace(/([a-z])(\d)/g, '$1-$2');
const canais = (hex: string) => `${parseInt(hex.slice(1, 3), 16)} ${parseInt(hex.slice(3, 5), 16)} ${parseInt(hex.slice(5, 7), 16)}`;

/** Escreve as cores como variáveis CSS (canais RGB, para o Tailwind aceitar opacidade). Roda uma vez, antes de desenhar. */
export function applyTokens(root: HTMLElement = document.documentElement) {
  for (const [nome, hex] of Object.entries(color)) root.style.setProperty(`--${kebab(nome)}`, canais(hex));
}

/** Uma cor com transparência (para gráficos e canvas): comAlfa(color.brand, 0.3). */
export const comAlfa = (hex: string, a: number) => `rgba(${canais(hex).split(' ').join(',')},${a})`;
