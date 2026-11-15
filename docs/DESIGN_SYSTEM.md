# Healthnauts · Design System

> Guia único do visual e do comportamento do app. Foi escrito para **quem vai mexer no código** (pessoas e o Claude):
> leia tudo uma vez, depois use como consulta. Regra de ouro: **mude um valor num lugar só e o app inteiro muda.**
> Os valores de verdade estão em [`src/design/tokens.ts`](../src/design/tokens.ts); este documento explica o porquê e o como.

## Índice

1. [Como usar este documento](#1-como-usar-este-documento)
2. [Princípios](#2-princípios)
3. [Onde cada coisa mora](#3-onde-cada-coisa-mora)
4. [Cores](#4-cores)
5. [Tipografia](#5-tipografia)
6. [Forma, espaço e sombra](#6-forma-espaço-e-sombra)
7. [Layout: a casca e o molde de tela](#7-layout-a-casca-e-o-molde-de-tela)
8. [Peças](#8-peças)
9. [Gráficos](#9-gráficos)
10. [O corpo em 3D](#10-o-corpo-em-3d)
11. [Movimento](#11-movimento)
12. [Tela de carregamento](#12-tela-de-carregamento)
13. [Acessibilidade e segurança de uso](#13-acessibilidade-e-segurança-de-uso)
14. [Receitas: como fazer cada coisa](#14-receitas-como-fazer-cada-coisa)
15. [O que nunca fazer](#15-o-que-nunca-fazer)
16. [Armadilhas técnicas já encontradas](#16-armadilhas-técnicas-já-encontradas)
17. [Composição de cada tela](#17-composição-de-cada-tela)

---

## 1. Como usar este documento

**Se você é um Claude (ou outra IA) recebendo este repositório:**

1. Leia as seções 2 a 8 antes de escrever qualquer tela. Elas dizem o que existe; **não invente peça, cor, tamanho ou espaçamento novos** se já houver um equivalente.
2. Toda cor vem de `src/design/tokens.ts`, por classe do Tailwind (`bg-brand`, `text-ink-3`, `bg-track`…) ou pelo objeto `color`/`level` (quando o valor é necessário em JS: gráficos, SVG, canvas, three.js). **Nunca escreva `#hex` ou `rgb()` numa tela.**
3. Toda tela nova é `<Pagina>` com blocos de `src/ui/pecas.tsx`, na ordem da [seção 7.3](#73-o-molde-de-toda-tela).
4. As regras de **conteúdo e ciência** (níveis de alerta, limites, fontes) **não pertencem ao design**: moram em `shared/` e a interface nunca decide um nível sozinha. Mexer no visual nunca deve exigir mexer em `shared/`.
5. Antes de entregar: `npx tsc --noEmit`, `npm test` (Node ≥ 22) e conferir a tela no navegador, em 1440 px e em 390 px.

**Estilo em uma frase:** um painel de instrumentos calmo e sério, como um relatório de fundo de investimento: papel quente, painéis brancos, **um verde** como marca, serifa fina nos títulos e nos números, linhas de 1 px, cantos pequenos, e cor de verdade **só** nos níveis de alerta.

---

## 2. Princípios

1. **Calmo e sério.** Pouca cor, pouco ruído, nada de enfeite. Sem gradiente chamativo, sem vidro, sem emoji, sem ícone "mágico". O que chama atenção é o dado, não a moldura.
2. **Cor significa algo.** Verde = marca/ação/série principal. Vermelho e verde claros = só variação boa/ruim de um número. Amarelo/laranja/vermelho/azul = **somente** níveis de alerta. Nunca use cor só para decorar.
3. **Cor nunca sozinha.** Um nível é sempre **cor + ícone + texto** (daltonismo, luvas, tela com reflexo).
4. **A resposta antes do gráfico.** O número grande vem primeiro, depois o gráfico que o explica.
5. **Cada informação aparece uma vez.** Nada de o mesmo número em três lugares da mesma tela.
6. **Estrutura idêntica em toda tela.** Mesmo cabeçalho, mesma largura, mesmos 20 px entre blocos, mesma ordem. Quem aprendeu uma tela sabe todas.
7. **Interativo sem poluir.** Em repouso o gráfico mostra só a grade e as marcas; valores e linha de guia aparecem **ao passar o mouse**; clicar fixa.
8. **Movimento com propósito.** Entradas suaves, números que rolam até o valor, linhas que se desenham. Tudo desliga com `prefers-reduced-motion`.
9. **Alvos de toque grandes.** Mínimo de 44 px em tudo que se aperta (a tripulação usa luvas e há vibração).
10. **Um design system central.** Tokens num arquivo; peças reutilizáveis; zero valor solto nas telas.

---

## 3. Onde cada coisa mora

```
src/
  design/tokens.ts        ← AS CORES, os níveis de alerta e a escala de tipo. Mude aqui.
  index.css               ← classes globais: .bloco, .card, .chip, .field, .btn-*, .tabela, .rise, .page-in, splash…
  ../tailwind.config.js   ← liga os tokens ao Tailwind (bg-brand, text-ink-2…), raios, fontes
  main.tsx                ← chama applyTokens() ANTES de desenhar
  ui/
    Pagina.tsx            ← o molde de toda tela (cabeçalho + conteúdo), LARGURA, Grupo
    pecas.tsx             ← Painel, Numero, NumerosGrid, Variacao, Linhazinha, ComUnidade, Avisos, Legenda, Registrar
    graficos.tsx          ← gráficos de painel: Radar, Anel, Margens, Enlace, Medidor, MapaDeCalor, SemanaDeAneis
    Periodo.tsx           ← FiltroPeriodo (atalhos + dois meses para escolher de um dia a outro)
  components/
    charts.tsx            ← gráficos de série no tempo: BarsChart, TrendChart, ScaleHeat, Legend, RefLine
    ui.tsx                ← StatusPill, Card, Section, More, Modal, Stat, axisProps
    AppShell.tsx          ← a casca: menu lateral, barra do alto, área de rolagem
    AlertBanner.tsx       ← faixa fina de alerta ativo no alto da tela
    Splash.tsx            ← tela de carregamento animada
    MyPanels.tsx          ← "Your panels": os números que a pessoa escolhe (até 10) + janela Customize
    TodayRoutine.tsx      ← RoutineBar: a rotina do dia com anel de progresso
    scene/Body3D.tsx      ← o corpo em pontos (three.js) · LiveTrace.tsx = ECG/respiração ao vivo
    lean/TopicDetail.tsx  ← Trends, CompareRow, useTrends (gráficos de tendência por tópico)
    magic/                ← NumberTicker (número que rola), MagicCard, BentoGrid
  pages/                  ← uma tela por arquivo: Overview, Isolation, Gravity, Environment, Radiation, Distance, GroundControl, Profile
  lib/levels.ts           ← cor/ícone/rótulo de cada nível (lê tokens.ts e shared/config/levels.js)
shared/                   ← REGRAS e DADOS (níveis, limites, cálculos, relatórios). Não é design. Não mexer ao mudar visual.
server/                   ← API opcional (Express). O site publicado roda tudo no navegador.
```

**Fluxo das cores:** `tokens.ts` → `applyTokens()` grava variáveis CSS (`--bg`, `--brand`, `--text-3`…) na raiz → o Tailwind lê as variáveis (`rgb(var(--brand) / <alpha-value>)`, por isso `bg-brand/15` funciona) → o CSS global também. Os gráficos, o SVG e o three.js leem o **mesmo objeto** `color` direto, porque precisam do valor, não da variável.

---

## 4. Cores

### 4.1 Paleta base (`color` em `tokens.ts`)

| Token | Valor | Variável CSS | Classe Tailwind | Uso |
|---|---|---|---|---|
| `bg` | `#F7F6F3` | `--bg` | `bg-paper`, `bg-space-bg` | Fundo da janela e do menu lateral. Off-white com um fio de calor. |
| `bg2` | `#EFEEEA` | `--bg-2` | `bg-paper-2`, `bg-space-deep` | Um tom abaixo: botões de escolha, hover forte. |
| `card` | `#FFFFFF` | `--card` | `bg-space-card`, `bg-white` | Painéis e cartões. |
| `border` | `#E7E6E1` | `--border` | `border-line`, `text-line` | Contornos e linhas de 1 px. |
| `track` | `#E9E8E3` | `--track` | `bg-track` | Trilho de barras de progresso e dos medidores. |
| `hover` | `#F5F5F2` | `--hover` | `bg-hover` | Fundo de linha/célula sob o mouse. |
| `text` | `#161615` | `--text` | `text-ink` | Tinta: texto principal e números. |
| `text2` | `#4B4A4A` | `--text-2` | `text-ink-2` | Texto secundário. |
| `text3` | `#727170` | `--text-3` | `text-ink-3` | Legendas e apoio (contraste 4,9:1 no branco). |
| `mark` | `#9A9993` | `--mark` | `text-mark`, `bg-mark` | Marcas finas: tracinhos de limite. |
| `disabled` | `#C3C2BA` | `--disabled` | `text-disabled` | O que não se escolhe. |
| `brand` | `#0B6B4A` | `--brand` | `bg-brand`, `text-brand` | **A cor da marca**: ação principal, escolha, foco, série principal dos gráficos. |
| `brandSoft` | `#095A3E` | `--brand-soft` | `bg-brand-soft` | Hover/pressionado da marca. |
| `greenSoft` | `#E3EFE8` | `--green-soft` | `bg-green-soft` | Fundo claro do verde (item escolhido, linha atual). |
| `greenLine` | `#A8CDBA` | `--green-line` | `bg-green-line` | Barras de apoio, "normal" em gráficos. |
| `band` | `#D6E2DA` | `--band` | — (use `color.band`) | Faixa da variação pessoal nos gráficos. |
| `good` / `goodSoft` | `#1A7F37` / `#DDF5E3` | `--good` | `text-good`, `bg-good-soft` | **Só** variação boa de um número. |
| `bad` / `badSoft` | `#C0233A` / `#FDE7EB` | `--bad` | `text-bad`, `bg-bad-soft` | **Só** variação ruim de um número e erros de formulário. |
| `quiet` / `quietSoft` | `#4B4A4A` / `#F0F0EE` | — | — | "Sem mudança" (cinza, sem seta). |

> Tailwind: a escala `slate-*` está **remapeada** para os tons de texto/fundo do tema claro (garante contraste ≥ 4,5:1 mesmo em código antigo). Prefira sempre `ink`, `ink-2`, `ink-3`.

### 4.2 Níveis de alerta (`level` em `tokens.ts`)

A **única** cor de verdade fora o verde da marca. Cada nível tem `color` (ponto, ícone, dado em destaque), `text` (texto, contraste ≥ 4,5:1 sobre o `soft`) e `soft` (fundo tingido).

| Nível | `color` | `text` | `soft` | Quando |
|---|---|---|---|---|
| `normal` | `#2F9E6A` | `#1F7550` | `#E8F3EC` | Esperado para o contexto |
| `advisory` | `#2F7FC0` | `#215F92` | `#E7F0F8` | Vale acompanhar, sem ação imediata |
| `caution` | `#D19A06` | `#8A6500` | `#FBF3DC` | Atenção |
| `warning` | `#E0661F` | `#A9480F` | `#FCEBDF` | Agir / confirmar |
| `emergency` | `#D23B30` | `#AE2A21` | `#FBE6E3` | Só condição de segurança do veículo |
| `unavailable` | `#A3A29B` | `#686761` | `#EFEDE5` | Sem dado |

Rótulo, ícone e ação de cada nível vêm de `shared/config/levels.js` (a mesma tabela que a API devolve) e são montados em `src/lib/levels.ts` → `LEVEL_UI[nivel]` = `{ label, color, text, soft, icon, action, Icon }`. Para mostrar um nível use sempre **`<StatusPill level={…} />`**.

### 4.3 Regras de uso de cor

- **Normal fica neutro.** Em gráficos, o "normal" é verde-marca/neutro; só o **último ponto** (o valor de agora) ganha a cor do nível quando for Caution ou pior (`lastColor` em `charts.tsx`).
- `StatusPill` em `normal` é um ponto que respira + texto cinza (não é uma pílula colorida); de `advisory` para cima vira pílula com fundo `soft`.
- Fundo de bloco é **sempre branco**. A página é `bg-paper`. O corpo 3D fica num bloco branco como os outros.
- Transparência: `bg-brand/15`, `border-brand/40` funcionam. Em JS/canvas use `comAlfa(color.brand, 0.3)`.
- Para **trocar a marca** (ex.: azul em vez de verde): troque `brand`, `brandSoft`, `greenSoft`, `greenLine`, `band` em `tokens.ts`. Nada mais. (O ícone/splash usam `color.brand`; o `#boot` em `index.html` e o favicon têm o hex copiado — troque também.)

---

## 5. Tipografia

Três famílias, cada uma com um trabalho (importadas em `main.tsx` via `@fontsource-variable/*`):

| Família | Classe | Onde |
|---|---|---|
| **Source Serif 4 Variable** | `.titulo`, `.display`, `.serif` | Título da página, **números em destaque**, nome na splash. Peso 360–380, letras juntas (`letter-spacing: -0.015em`). |
| **Inter Variable** | (padrão do `body`) | Todo o resto: rótulos, corpo, botões, tabelas. |
| **Geist Mono Variable** | `.font-mono`, `.eyebrow` | Rótulos técnicos em caixa alta (`.eyebrow`), relógios, ids. |

### Escala (`escala` em `tokens.ts`)

**Quatro tamanhos de texto e dois de destaque. Não crie outros.**

| Nome | px | Uso |
|---|---|---|
| `pagina` | 32 | Título da página (serifa, `leading-[1.1]`, `text-balance`) |
| `numero` | 28 | Número de um cartão (serifa, `leading-none`, `num`) |
| `numeroGrafico` | 22 | Número no alto de um gráfico |
| `titulo` | 14 | Título de painel: `text-[14px] font-semibold tracking-[-0.01em]` |
| `texto` | 13 | Corpo, tabelas, botões, linhas de lista |
| `apoio` | 12 | Legendas, dicas, variação, unidade |
| `micro` | 11 | `.eyebrow`, eixos dos gráficos |

Regras:

- **Números sempre tabulares:** adicione a classe `num` (`font-variant-numeric: tabular-nums`) em todo valor que muda.
- **Unidade pequena e cinza:** `<ComUnidade valor="63 bpm" />` mostra o número grande (e rolando, via `NumberTicker`) e a unidade em `0.5em`, `text-ink-3`. Texto longo (> 14 caracteres) vira corpo em Inter, não serifa.
- Peso: `font-medium`/`font-semibold` só em rótulo de linha e título de painel. Títulos de página e números são **finos** (peso baixo da serifa), nunca bold.
- Texto de apoio é `text-ink-3` (12 px); texto secundário `text-ink-2`; principal `text-ink`.
- Link de texto: classe `.link` (sublinhado fino, cor sobe no hover). Ações que levam a outra tela mostram uma seta pequena (`Seta`) que anda 2 px no hover.
- Idioma da interface: **inglês**. Datas/horas em `en-GB`.

---

## 6. Forma, espaço e sombra

### 6.1 Cantos

| Raio | Onde | Como |
|---|---|---|
| 5 px | campos, botões, itens de menu | `--radius`, `rounded-md` |
| 8 px | blocos, cartões, avisos | `--radius-bloco`, `rounded-lg` |
| 10 px | (reserva) | `rounded-xl` |
| 12 px | janelas (`Modal`) | `rounded-2xl`/`xl` |
| 9999 | chips, variação, status | `rounded-full` |

O de dentro é sempre menor que o de fora (ex.: bloco 8 → célula/linha dentro 5).

### 6.2 Linhas e sombras

- **Linha de 1 px**, cor `border`. Divisórias dentro de listas: `divide-y-[.5px] divide-[rgb(var(--border))]`.
- `--sombra-bloco` (blocos): contorno + sombra curta de contato + um fio de luz por dentro no alto. Plano, sem sombra longa.
- `--sombra-flutua` (menus, janelas, dicas, tooltips): contorno + sombra longa e difusa. **Só no que flutua.**
- Campo/botão: contorno de 1 px por `box-shadow inset`, sombra curtinha; no hover o contorno escurece (`text-3` a 60%); no foco, contorno verde + halo (`0 0 0 3px brand/12`).

### 6.3 Espaço: a regra dos 20 px

- **20 px entre blocos** (`gap-5`) e **20 px por dentro** do bloco (`px-5`). Em **todas** as telas.
- Padding vertical do `Painel`: `pt-4 pb-5`; entre título, valor e gráfico dentro dele: `gap-4`.
- Célula de número (`Numero`): `px-5 py-4`, `gap-2.5`.
- Margens da página: `px-4 sm:px-8`, `pt-3 md:pt-6`, `pb-16`. Largura máxima **1440 px** centralizada (`LARGURA` em `Pagina.tsx`).
- Grades sempre com `grid-cols-[minmax(0,1fr)]` (evita o texto com `truncate` empurrar a grade para fora).

### 6.4 Classes globais (`index.css`)

| Classe | O que é |
|---|---|
| `.bloco` | Painel: canto 8, contorno 1 px, `--sombra-bloco`, fundo branco |
| `.bloco-grade` | Igual, mas com fundo de linha e `overflow:hidden`: usado nas faixas de células com 1 px entre elas |
| `.card` / `.card-title` / `.card-sub` | Cartão simples com padding 20 |
| `.chip` | Etiqueta pílula de 20 px |
| `.surface-quiet` | Fundo `bg`, canto 8 (áreas calmas dentro de um bloco) |
| `.field` | Campo de texto 36 px |
| `.btn-primary` / `.btn-ghost` | Botões de 32 px (ver 8.9) |
| `.tabela` | Tabela de todas as telas (ver 8.8) |
| `.eyebrow` | Rótulo técnico (mono, 11 px, caixa alta, `text-3`) |
| `.titulo` / `.display` / `.serif` / `.num` | Tipografia (ver 5) |
| `.link` | Link de texto |
| `.indicator-focus` | Contorno verde por alguns segundos num indicador aberto por `?indicator=` |

---

## 7. Layout: a casca e o molde de tela

### 7.1 A casca (`AppShell.tsx`)

```
┌ menu 232px (56px recolhido) ┬ cartão branco (canto 5, contorno) ──────────────────┐
│ ▢ Healthnauts        [⟦]    │  barra do alto 48px: Healthnauts / Tela    [Demo] [🔔] │
│ ▸ Today                     │  ─ #rolagem (única área que rola) ───────────────── │
│   HAZARDS · RIDGE           │   <AlertBanner/>   (alerta ativo, uma linha)         │
│   Radiation …               │   <div class="page-in"> <Pagina>…</Pagina> </div>     │
│ ─ Mars · Day 142   12 min ● │                                                      │
│ ◉ Me                        │                                                      │
└─────────────────────────────┴──────────────────────────────────────────────────────┘
```

- O **menu e o fundo da janela** são `bg-paper`; a **página** é um cartão branco com 8 px de respiro em volta (`md:my-2 md:mr-2`). Em telas < `md` o menu vira gaveta (260 px) com fundo `black/20`.
- Item do menu: 32 px de altura, ícone `lucide` de 16 px (`strokeWidth 1.6`, `text-ink-3`), texto 13 px. O item ativo é **semibold** e ganha um fundo `black/[.055]` que **desliza** entre itens (`motion.span layoutId="nav-bg"`, mola `stiffness 500 / damping 40`). Ao lado do nome, o estado da área: ponto colorido (normal) ou mini-pílula (Advisory ou pior).
- Menu recolhido (`hn.menu` no `localStorage`): só ícones, nome na dica, ponto de estado no canto.
- Rodapé do menu: `{destino} · Day N` + atraso até a Terra + ponto do sensor ao vivo; embaixo o link "Me" (avatar verde de 20 px).
- A página muda com `key={pathname}` e a classe `page-in` (sobe 6 px, 380 ms). **Importante:** `page-in` usa `animation-fill-mode: backwards` — nunca `both/forwards`, senão fica um `transform` preso que quebra qualquer elemento `fixed` dentro da página (ver seção 16).

### 7.2 Cabeçalho de página (`Pagina`)

```tsx
<Pagina contexto="Isolation and confinement" titulo="Mind and sleep" sub="Frase simples do que importa." direita={<FiltroPeriodo …/>}>
```

1. Linha pequena (13 px, `ink-3`): **dia de hoje** em `en-GB` + ` · contexto` → "Sunday, 15 November · Gravity fields".
2. Título 32 px serifa. Na Overview é a saudação: "Good afternoon, Alex."
3. `sub` (opcional): 14 px, `ink-2`, máx. `max-w-2xl`: **uma ou duas frases** com o que importa agora.
4. `direita` (opcional): o que é da página (filtro de período, relógio da missão).

### 7.3 O molde de toda tela

Ordem **fixa**:

```
cabeçalho  →  faixa de números  →  o que registrar  →  gráficos  →  referência
```

- **Faixa de números** = `<NumerosGrid n={…}>` com várias `<Numero>`; é o resumo da tela.
- **O que registrar** = `<Registrar itens={…}>` (check-ins, testes, relatos).
- **Gráficos** = `<Painel>` com gráficos, em grades de 1, 2 ou 3 colunas (ver 7.4).
- **Referência** = tabelas e textos de explicação; "Why measure this?" dentro de `<More>`.

### 7.4 Grades e responsivo

| Situação | Classe |
|---|---|
| Dois painéis iguais | `grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-2 items-stretch` |
| Hero (corpo) + painéis | `xl:grid-cols-[minmax(0,11fr)_minmax(0,13fr)]` |
| Número de painéis ímpar | O último ocupa a linha inteira (`Trends` faz isso sozinho) |
| Faixa de números | `NumerosGrid`: 4 ⇒ `grid-cols-2 lg:grid-cols-4`; completa a última linha com células vazias para nunca sobrar buraco |
| Cartões na mesma linha | `items-stretch` + `Painel preenche` para terem **a mesma altura** |

- Breakpoints do Tailwind padrão; o app é pensado para 1440 px e funciona a 390 px (uma coluna, menu em gaveta, sem rolagem horizontal).
- **Nunca rolagem horizontal.** Se algo estourar, falta um `min-w-0`/`grid-cols-[minmax(0,1fr)]`/`truncate`.

---

## 8. Peças

Todas em `src/ui/pecas.tsx`, salvo indicação. Importe daqui; **não recrie**.

### 8.1 `Painel`

O bloco branco com título, legenda e conteúdo.

```tsx
<Painel titulo="Sleep" to="/isolation" legenda={<Legenda itens={…} />} valor="6.9 h" variacao="+0.3 h" bom nota="vs plan" preenche className="…" i={2}>
  …conteúdo…
</Painel>
```

| Prop | Efeito |
|---|---|
| `titulo` | `h2` 14 px semibold. Com `to`, vira link com seta. |
| `legenda` | À direita do título (texto de 12 px, `Legenda`, botão). |
| `valor` (+ `variacao`, `bom`, `nota`) | Número grande (28 px serifa) **antes** do conteúdo, com a `Variacao` ao lado. |
| `preenche` | O painel ocupa a altura da linha e reparte o conteúdo (listas de linhas iguais). |
| `i` | Posição na entrada em sequência (atraso de 60 ms × i). |
| `indicator` | Marca para o foco por `?indicator=`. |

Todo `Painel` entra com a animação `.rise`.

### 8.2 `Numero` + `NumerosGrid`

A célula de número e a faixa que as junta (1 px de linha entre elas, canto 8 na faixa).

```tsx
<NumerosGrid n={4}>
  <Numero nome="Heart rate" definicao="Resting beats per minute" valor="63 bpm" serie={[…]} nivel="normal" variacao="−1" comparacao="vs 7-day avg" to="/isolation?indicator=…" />
</NumerosGrid>
```

- **Mesma altura em todos:** linha do nome (16 px, `truncate`), valor (serifa 28), **linhazinha** de 28 px (ou outro gráfico, ou um espaço vazio) e a linha de estado (20 px) com `StatusPill` + `Variacao` + comparação (corta com "…").
- `definicao` põe um **sublinhado pontilhado** no nome e uma dica (nativa) com a definição.
- Com `to` ou `onClick` a célula é clicável (hover `bg-hover`, seta).
- `grafico` troca a linhazinha por outra coisa (ex.: uma régua).

### 8.3 `Variacao`

Etiqueta pílula pequena: seta ▲/▼ + valor. Verde claro (`good`) se `bom`, vermelho claro (`bad`) se não; valor sem mudança vira cinza "no change" **sem seta**. Use com sinal explícito: `+0.3 h`, `−1`.

### 8.4 `Linhazinha`

A linha curta do período: véu em gradiente leve embaixo, ponto no valor de agora com anel que pulsa (`.dot-ring`). A linha **se desenha** ao entrar (`spark-draw`, 1,2 s).

### 8.5 `ComUnidade`

Veja seção 5. Números inteiros/decimais rolam de 0 até o valor (`NumberTicker`, só quando entram na tela, uma vez).

### 8.6 `Avisos`

Linhas discretas de aviso (nível + rótulo + frase). **Só mostra `normal`, `advisory`, `unavailable`.** Caution, Warning e Emergency aparecem no **banner do alto** e não se repetem aqui.

### 8.7 `Registrar`

"O que registrar": painel com uma linha por tarefa (título, subtítulo, botão `btn-ghost` ou "Done" com ponto verde). Linhas de altura igual (`auto-rows-fr`).

### 8.8 Tabela (`.tabela`)

Cabeçalho 12 px `ink-3` sem negrito; linhas de 1 px; 20 px entre colunas (a última encosta na borda); primeira coluna em `ink`, as demais `ink-2`; linha atual com `tr.atual` (fundo `green-soft/50`); `nowrap` onde não pode quebrar.

### 8.9 Botões e campos

| Classe | Aparência |
|---|---|
| `.btn-primary` | Fundo verde, texto branco, contorno `brand-soft`, sombra curta; hover escurece; **apertar afunda** (0,5 px + escala 0,985) |
| `.btn-ghost` | Fundo branco, contorno de 1 px, sombra curta; hover escurece o contorno; apertado afunda e fica `bg` |
| `.field` | Campo de 36 px, contorno inset; foco = contorno verde + halo |
| `.chip` | Etiqueta pílula (20 px) |

Altura 32 px visual, mas o `index.css` garante área de toque de **44 px** (`button { min-height: 44px }`); onde a linha for apertada use `!min-h-0` (menus, ícones). Desabilitado: opacidade 50% e sem clique. Todos os botões e campos têm `:focus-visible` com contorno verde de 2 px.

### 8.10 `StatusPill` (`components/ui.tsx`)

`<StatusPill level="caution" small />`. Veja 4.2. `small` = 12 px (dentro de linhas e células), padrão = 13 px.

### 8.11 `Card`, `Section`, `More`, `Stat`

`components/ui.tsx`: `Card` (cartão com título/ícone/ação), `Section` (título de seção com marca de foco), `More` (disclosure "Why measure this?" que abre/fecha com altura animada), `Stat` (rótulo + valor + sub).

### 8.12 `Modal` (`components/ui.tsx`)

Diálogo acessível: `role="dialog"`, **Esc fecha**, **Tab fica dentro**, o foco volta para quem abriu, o fundo trava a rolagem. Renderizado por **portal no `<body>`** (obrigatório: ver seção 16), canto 12, `--sombra-flutua`, título em serifa 22 px, subtítulo 13 px, botão de fechar quadrado. Props: `open, onClose, title, sub, icon, wide`. Entra/sai com `AnimatePresence`.

### 8.13 `FiltroPeriodo` (`ui/Periodo.tsx`)

Botão com o período atual ("Last 7 days" / "3 Nov – 9 Nov") que abre um popover: **atalhos** (7, 14, 30 dias) à esquerda e **dois meses** para escolher de um dia a outro (prévia ao passar o mouse, "N days"), com **Apply/Cancel**. Tipo `Periodo = { de, ate, atalho? }`.

### 8.14 Outras peças de tela

- **`AlertBanner`**: uma linha no alto da área de rolagem para o alerta ativo mais grave; linha de 3 px na cor do nível à esquerda, mensagem truncada com título, hora sem quebra, botão de reconhecer quando exigido.
- **`MyPanels`**: a faixa "Your panels" (até 10 números escolhidos, mais graves primeiro) + janela **Customize** (linhas de 13 px, item escolhido em `green-soft`, rodapé com contagem).
- **`RoutineBar`** (`TodayRoutine.tsx`): painel `preenche` com `Anel` de progresso e uma linha por item da rotina.
- **`Notifications`** (sino), **`DemoPanel`** (simulador de cenários), **`MorningCheckin`**, **`PvtTest`**: usam `Modal`, `.btn-*`, `.field` e os tokens; mantenha assim.

---

## 9. Gráficos

### 9.1 Comportamento comum (vale para todos)

- **Em repouso**: grade horizontal de 1 px (`border`), eixos sem linha, rótulos de 10–11 px `ink-3`. Nada de valores escritos em cima das barras ou pontos.
- **Passar o mouse**: cabeçalho do gráfico (`CabecaDoGrafico`) mostra **o valor (serifa 22) e a data/hora** da posição; uma linha de guia tracejada; o ponto/barra em foco; os outros apagam.
- **Clicar**: **fixa** o ponto (aparece "Pinned · Clear"); clicar de novo solta.
- **Sem hover**: o cabeçalho mostra o **último valor**, com "Latest · data".
- **Cor**: série principal em `brand`; faixa pessoal em `band`; réguas tracejadas em `ink-3`; **só o último ponto** ganha a cor do nível quando não é normal.
- **Linha reta** entre pontos (`type="linear"`): a suavização inventava picos que o sensor não teve.
- **Entrada**: a linha/barras se desenham em ~900 ms (ease-out); respeitam `prefers-reduced-motion`.
- Sempre uma **legenda** (`Legenda` / `Legend`) com cor **e** texto; tracejado quando é referência.
- Sem pizza, sem 3D, sem gradiente decorativo. Véu vertical muito leve (opacidade 0,16 → 0) embaixo de linhas é permitido.

### 9.2 Gráficos de série no tempo (`components/charts.tsx`)

| Componente | Uso | Props principais |
|---|---|---|
| `BarsChart` | Uma barra por registro (ex.: horas de sono por noite) | `records, unit, refs, lastLevel, domain, fmt` |
| `TrendChart` | Linha no tempo + faixa pessoal sombreada + réguas | `records, band, refs, lastLevel, domain, unit, height, fmt, dayTicks` |
| `ScaleHeat` | Escalas 1–N (Samn-Perelli, KSS): células com o significado ao passar o mouse | `records, max, labels, lastLevel` |
| `Legend` | Legenda individual (cor + texto, `soft`, `dashed`) | |
| `RefLine` | `{ y, label, color? }`: régua tracejada com rótulo à direita (barras) ou dentro (linhas) | |

Os dados entram como `ApiRecord[]` (id, indicator, value, recordedAt…). Máximo de ~300 pontos por linha (reduz com passo, sempre mantendo o último). Altura padrão **176 px** (`height` para mudar). Os rótulos do eixo X saem de 8 em 8 quando há muitos.

### 9.3 Gráficos de painel (`ui/graficos.tsx`)

| Componente | O que mostra |
|---|---|
| `Radar` | Os cinco riscos RIDGE numa figura: quanto mais perto da borda, mais tranquilo. Cada vértice vira um botão (teclado, leitor de tela, leva à área). Só reflete o **nível que a API devolveu** (`RAIO` é desenho). Os pontos "estouram" para dentro ao entrar. |
| `Anel` | Progresso num anel de 4 px com o valor no meio; anima a volta. |
| `Margens` | Barras de 8 px com uma **marca no limite**/plano: quanto falta para o limite. Cor da barra = marca ou o nível, se estiver fora do normal. |
| `Medidor` | Meia-lua de 12 px com valor grande no meio e marca no limite. |
| `MapaDeCalor` | Linhas × dias; o tom do verde (8%→70% de opacidade) diz a intensidade; passar o mouse levanta a célula e apaga as outras; sem leitura = cinza com "·". |
| `SemanaDeAneis` | Sete `Anel` (um por dia), "✓" quando o plano foi cumprido. |
| `Enlace` | O caminho do sinal nave ↔ Terra: um ponto percorre a linha e o atraso fica no meio; sem enlace, linha tracejada e o ponto para. |

### 9.4 Quando usar cada um

| Pergunta que o gráfico responde | Use |
|---|---|
| "Como evoluiu?" | `TrendChart` (contínuo) ou `BarsChart` (um por dia) |
| "Estou dentro do meu normal?" | `TrendChart` com `band` |
| "Quanto falta para o limite?" | `Margens` (várias) ou `Medidor` (uma) |
| "Como estão as cinco áreas?" | `Radar` |
| "Cumpri o plano?" | `Anel` / `SemanaDeAneis` |
| "Qual dia/linha foi pior?" | `MapaDeCalor` |
| "Em que degrau da escala estou?" | `ScaleHeat` |

---

## 10. O corpo em 3D

`components/scene/Body3D.tsx` (three.js, desenho nosso, sem modelo externo).

- Um corpo humano adulto (~1,78 m) feito de **milhares de pontos** gerados por **"loft"**: cada parte (cabeça, pescoço, tronco, braços com ombro/bíceps/antebraço/mão, quadril, pernas com coxa/panturrilha/pé) é uma sequência de **anéis** (`Ring`: centro, largura, profundidade) amostrada em superfície.
- Três regiões ligadas a áreas: **cabeça e pescoço = Isolation**, **peito = sinais vitais**, **braços e pernas = Gravity**. A cor de cada região = **nível que a API devolveu** (nada aqui decide nível).
- Pontos desenhados por um shader próprio (tamanho por distância, brilho nas regiões). O corpo **gira devagar**; arrastar gira; passar o mouse **acende a região**; clicar abre o detalhe.
- O peito **pulsa no ritmo do coração** e o tronco **respira** no ritmo do sensor ao vivo, quando há leitura.
- Etiquetas de região ao lado (`LABEL_W = 180`) são **botões** (teclado/leitor de tela) com o nome do nível. `LiveTrace` mostra o ECG/respiração em traço verde.
- Cor da tinta dos pontos = `color.brand`. A distância da câmera depende da largura do contêiner (`z = 4.95 / 4.7 / 4.35` para < 520, < 600 e o resto) para as etiquetas não cobrirem o corpo em telas estreitas.
- `height` aceita número ou `"100%"`: na Overview o corpo preenche o bloco branco (`absolute inset-0`) com altura mínima de 560 px.
- Contêiner sempre um `.bloco` branco, igual aos outros cartões (o corpo **não** tem fundo escuro).

---

## 11. Movimento

Curva padrão em todo o app: **`cubic-bezier(0.32, 0.72, 0, 1)`** (sai rápido, assenta devagar). Alternativa para fades: `--ease: cubic-bezier(0, 0.09, 0.4, 1)`.

| O quê | Como | Tempo |
|---|---|---|
| Entrada de bloco | `.rise`: sobe 8 px, desfoque 2 → 0 px, fade; **escalonada** por `--i` (60 ms × posição; os 6 primeiros filhos escalonam sozinhos via `:nth-child`) | 520 ms |
| Entrada de página | `.page-in`: sobe 6 px | 380 ms |
| Troca de rota | `PageTransition` (só opacidade) | 240 ms |
| Número | `NumberTicker`: mola de 0 até o valor, uma vez quando entra na tela | mola |
| Linha pequena | `spark-draw`: a linha se desenha | 1,2 s |
| Último ponto | `.dot-ring`: anel que cresce e some | 2,4 s em loop |
| Status "normal" | `.breathe`: o ponto respira | 2,4 s em loop |
| Realce do menu | `layoutId="nav-bg"`: o fundo desliza entre itens | mola 500/40 |
| Menu recolhe | `transition-[width]` | 300 ms |
| Botões | `transition` de cor/sombra; apertado: afunda 0,5 px, escala 0,985 | 150 / 120 ms |
| Barras (margens) | `transition: width` | 800 ms |
| Anéis / medidor | `stroke-dashoffset` | 800–900 ms |
| Radar | pontos `radar-in` (escala 0,4 → 1) | — |
| Enlace | ponto viaja da nave à Terra | 3,2 s em loop |
| Seta de link | anda 2 px no hover | 200 ms |
| Modal | `AnimatePresence`: fade + sobe de leve | 200 ms |

**Reduzir movimento:** `@media (prefers-reduced-motion: reduce)` zera animações e transições; `NumberTicker` mostra o valor final; `PageTransition` não anima; o corpo 3D e a splash também respeitam.

---

## 12. Tela de carregamento

Duas camadas, para nunca haver tela em branco:

1. **`#boot`** em `index.html`: HTML/CSS puro, aparece antes do JavaScript (fundo `bg`, a marca respirando). O React remove ao montar.
2. **`Splash`** (`components/Splash.tsx`): a marca (círculo verde com a órbita e o tripulante) **se monta** (escala 0,82 → 1), um ponto **percorre a órbita** (`animateMotion`), o nome "Healthnauts" e "CREW HEALTH MONITOR" sobem em sequência, e uma linha fina corre embaixo.

Regras: fica **no mínimo 2,8 s** (`minimo` em `App.tsx`; antes disso a animação sumia no meio) e só sai quando os dados chegam **e** o mínimo passou; sai com fade + leve zoom (`splash-sai`, 600 ms); `role="status"`.

---

## 13. Acessibilidade e segurança de uso

- **Cor + ícone + texto** em todo nível (4.2). Contraste mínimo 4,5:1 (texto de nível usa `level.*.text` sobre `soft`).
- **Alvos de 44 px** (6.3/8.9). Foco visível: contorno verde de 2 px (`:focus-visible`).
- **Teclado**: o radar, as etiquetas do corpo, as células clicáveis e os menus são `button`/`a`; `Modal` prende o Tab; Esc fecha.
- **Leitor de tela**: SVGs decorativos com `aria-hidden`; gráficos com `role="img"` e `aria-label` quando mostram um valor; `NumberTicker` expõe o valor final.
- **Reduzir movimento** respeitado em todo lugar.
- **Não é diagnóstico.** Todo texto de saúde é de apoio à decisão; a interface nunca decide nível — vem da API/`shared/`.
- Emergência: tela cheia com reconhecimento obrigatório (`EmergencyOverlay`); Warning e Emergency exigem confirmação.

---

## 14. Receitas: como fazer cada coisa

### 14.1 Uma tela nova

```tsx
export default function Nova() {
  return (
    <Pagina contexto="Nome da área" titulo="Título curto" sub="Uma frase do que importa agora.">
      <NumerosGrid n={4}>…<Numero …/>…</NumerosGrid>
      <Registrar itens={[…]} />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 items-stretch lg:grid-cols-2">
        <Painel titulo="…" legenda={…}><TrendChart …/></Painel>
        <Painel titulo="…"><Margens …/></Painel>
      </div>
    </Pagina>
  );
}
```

Depois: rota em `src/App.tsx`, item em `AppShell.tsx` (ícone `lucide`), nome em `NOME_DA_TELA`.

### 14.2 Mudar a cor da marca / o fundo / um nível

Edite **só** o valor em `src/design/tokens.ts` (`color.brand`, `color.bg`, `level.caution`…). Recarregue. Se o Tailwind reclamar de uma classe nova, **reinicie o `vite`** (a configuração só é lida na partida).

### 14.3 Adicionar uma cor nova

1. Acrescente em `color` (`tokens.ts`). 2. Acrescente em `tailwind.config.js` com `token('nome-em-kebab')` (camelCase vira kebab; dígito ganha hífen: `text3` → `--text-3`). 3. Use por classe. Só crie cor nova se ela **significa algo novo**.

### 14.4 Mudar um tamanho de texto ou o espaço padrão

`escala` em `tokens.ts` documenta os valores; os componentes usam os valores literais (`text-[13px]`, `gap-5`). Se mudar a escala, procure o valor antigo em `src/ui/` e `src/index.css` (poucos lugares, todos nas peças) — **não nas telas**.

### 14.5 Um gráfico novo

Coloque em `src/ui/graficos.tsx` (painel) ou `src/components/charts.tsx` (série). Cores de `color`/`level`. Siga 9.1: grade leve em repouso, valor ao passar o mouse, clicar fixa, `prefers-reduced-motion`, legenda com cor + texto. Mostre-o dentro de um `<Painel>`.

### 14.6 Um nível de alerta novo

Isso é **conteúdo**, não design: acrescente em `shared/config/levels.js` (e nas regras), depois uma entrada em `level` (`tokens.ts`) com `color/text/soft` e um ícone em `ICONS` de `lib/levels.ts`.

### 14.7 Publicar (GitHub Pages)

`.github/workflows/pages.yml` roda os testes, constrói e publica. O `vite.config.ts` pega o nome do repositório de `GITHUB_REPOSITORY` para o `base`, então o mesmo código publica em qualquer repositório. Em *Settings → Pages* escolha **Source: GitHub Actions**. Localmente: `npm run dev` (porta 5173) ou `npm run build && npm run preview`.

---

## 15. O que nunca fazer

- ❌ `#hex`, `rgb()`, `text-[#…]`, `style={{ color: '…' }}` numa tela.
- ❌ Tamanho de texto fora da escala (`text-[15px]`, `text-lg`…) ou espaçamento fora de 20 px entre blocos.
- ❌ Usar vermelho/laranja/amarelo/azul fora de um nível de alerta; usar cor sozinha para dizer um estado.
- ❌ Decidir um nível na interface (`if (value > x) level = 'warning'`). Os níveis vêm de `shared/`.
- ❌ Gráfico suavizado (`type="monotone"`), pizza, 3D decorativo, gradiente chamativo, sombra longa em bloco, vidro/blur de fundo.
- ❌ Mostrar a mesma informação duas vezes na mesma tela; repetir no bloco de avisos o que o banner já mostra.
- ❌ Painéis lado a lado com alturas diferentes; células de número com alturas diferentes.
- ❌ Rolagem horizontal; texto cortado sem `truncate`/`title`; grade sem `minmax(0,1fr)`.
- ❌ Botão/campo com estilo escrito à mão; botão menor que 44 px de área de toque.
- ❌ Bold em título de página ou em número grande.
- ❌ Animação que ignora `prefers-reduced-motion`.
- ❌ Emoji e ícones "mágicos" (estrelinhas de IA). Ícones são `lucide-react`, 16 px, traço 1,6.

---

## 16. Armadilhas técnicas já encontradas

1. **Variáveis CSS com dígito.** `applyTokens` converte `text3` → `--text-3` e `bg2` → `--bg-2`. Sem o hífen antes do dígito, `bg-ink-3` ficava transparente.
2. **Tailwind só lê a configuração na partida.** Mudou `tailwind.config.js` (cores novas): reinicie o `vite`.
3. **Elemento `fixed` dentro de ancestral com `transform` desalinha.** Por isso: (a) `.page-in` usa `animation-fill-mode: backwards` (não deixa `transform` depois de acabar) e (b) `Modal` usa `createPortal(…, document.body)`. Se criar outra janela/menu/overlay fixo, faça por portal.
4. **Recharts v3**: o estado do mouse chega como `activeTooltipIndex`/`isTooltipActive`; fora da área do gráfico `isTooltipActive` é `false` — confira antes de fixar um ponto (`useDestaque` em `charts.tsx`). Tire o contorno azul do clique com a regra `.recharts-wrapper *{outline:none}`.
5. **Eixo com unidade duplicada** ("10hh"): ou `unit` no `YAxis` ou no `tickFormatter`, nunca os dois.
6. **Rótulos de régua escondidos atrás das barras**: em `BarsChart`, quando há `refs` a margem direita sobe para 72 px e o rótulo vai à direita.
7. **Texto truncado empurrando a grade**: grids com `truncate` dentro precisam de `grid-cols-[minmax(0,1fr)]` e `min-w-0`.
8. **Splash sumia no meio**: manter o mínimo de 2,8 s.
9. **Câmera do corpo 3D em cartão estreito**: ajustar a distância pela largura (já feito) e a divisão 11fr/13fr.
10. **Testes** usam *type stripping* do Node: **Node ≥ 22** (`engines` no `package.json`). Em Node 20 o `npm test` trava.

---

## 17. Composição de cada tela

| Tela | Cabeçalho | Corpo (de cima para baixo) |
|---|---|---|
| **Today** (`Overview`) | "Good afternoon, Alex." + 2 frases · relógio da missão | Avisos · "Your panels" + Customize · **[Corpo 3D (11fr) ‖ Números + Radar + Margens (13fr)]** · **[Rotina do dia ‖ Hazards RIDGE]** |
| **Isolation** | "Mind and sleep" | Faixa de números · Registrar (check-in, PVT) · "Today at a glance" (Margens) · "The last 7 days" (MapaDeCalor) · tendências por tópico (sono, estresse, humor, reação) |
| **Gravity** | "Body and balance" | Faixa de números · "Against your pre-flight values" (Margens) · "Exercise this week" (SemanaDeAneis) · formulários de registro · tendências |
| **Environment** | "Cabin" | Faixa de números · "Limits" (Medidor + Margens) · "Post-EVA symptom check" · tendências (CO₂, O₂, pressão, temperatura, ruído) |
| **Radiation** | "Radiation" | Faixa de números · "Career effective dose" · "Organ limits (reference only)" |
| **Distance** | "Earth link" | Faixa de números · "Signal path" (Enlace) · "Mission" · "Destinations" · relatórios à Terra (`ReportsToEarth`) |
| **Me** (`Profile`) | "Me" | Faixa de números · "Pre-flight baseline" · "Personal ranges" · "In observation" · "Alert history" (`.tabela`) |

**Contexto técnico rápido:** React 18 · Vite 7 · TypeScript · Tailwind 3 · Recharts 3 · Framer Motion · Zustand · react-router-dom (HashRouter) · three.js · lucide-react. Rotas com HashRouter: recarregar a página funciona no GitHub Pages.
