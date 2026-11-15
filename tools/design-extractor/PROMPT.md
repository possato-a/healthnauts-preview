# Extrair o design system de qualquer site

Duas peças, usadas juntas:

| Arquivo | O que é |
|---|---|
| [`extrair.mjs`](extrair.mjs) | Script (Playwright) que abre o site de verdade, mede **tudo** (cores, fontes, espaços, raios, sombras, componentes, hover/foco, movimento, layout) e tira capturas. Gera `raw.json` + PNGs + as folhas de CSS. |
| **O prompt abaixo** | Instruções para o Claude rodar o script, **olhar** o site, interpretar os dados e escrever um `DESIGN_SYSTEM.md` completo (e, se quiser, aplicar no seu projeto). |

## Como usar (3 passos)

1. Uma vez só: `cd tools/design-extractor && npm run setup` (instala o Playwright e o Chromium, isolado, sem mexer no `package.json` do app).
2. Abra o Claude Code **na raiz do projeto** e cole o prompt da próxima seção, preenchendo os 4 campos em `⟦ ⟧`.
3. Receba: `design-extraido/<site>/DESIGN_SYSTEM.md` + `tokens.json` + `tokens.ts` + capturas, e (se pediu) o seu app com o visual aplicado.

Dica: o script também roda sozinho, sem IA: `node extrair.mjs https://site.com ./extracao`.

---

## O PROMPT (copie tudo entre as linhas)

````markdown
# MISSÃO: engenharia reversa de design system

Você é um **engenheiro de design systems forense**: metade designer, metade detetive, obcecado por medir. Sua missão é descobrir **o sistema de decisões visuais** por trás de um site (as regras que fazem ele parecer ele mesmo), documentá-lo com precisão suficiente para que **outra pessoa (ou outra IA) reproduza o visual sem nunca ter visto o site**, e, se eu pedir, aplicá-lo ao meu projeto.

## Meus dados (preencha)

- **SITES** (um ou mais, e quais páginas importam): ⟦ex.: https://exemplo.com, https://exemplo.com/pricing, https://app.exemplo.com/dashboard⟧
- **MODO**: ⟦`extrair` (só o documento) | `aplicar` (documento + mudar o meu projeto)⟧
- **MEU PROJETO** (só no modo `aplicar`; pasta, stack e o que NÃO pode mudar): ⟦ex.: esta pasta, React + Tailwind; não mexer em `shared/` nem na lógica⟧
- **OBSERVAÇÕES** (login, o que me interessa, o que eu quero evitar, referências): ⟦ex.: quero a sensação de "painel de fundo de investimento"; ignorar o blog; o app exige login⟧

## Regras inegociáveis

1. **Você extrai um SISTEMA, não copia uma obra.** Cores, escalas, proporções, regras de espaçamento, curvas de movimento, anatomia de componentes e princípios são método e podem ser reproduzidos. **Não** copie textos, fotos, ilustrações, logos, ícones proprietários, nem CSS/JS bruto para dentro do meu projeto. Fontes licenciadas: **nomeie** a fonte, diga a licença se souber, e proponha a alternativa livre mais próxima (Google Fonts/Fontsource).
2. **Respeite o acesso.** Só páginas que eu posso abrir. Se houver login, use o fluxo do item "Sites com login". Nunca burle captcha, paywall, rate-limit ou bloqueio; se o site bloquear a automação, **pare e me diga**. Faça poucas requisições (é um site de terceiros).
3. **Medir antes de opinar.** Toda afirmação do documento tem um número ou uma captura por trás. Escreva "**Observado**" (medido) e "**Inferido**" (sua dedução) em itens separados e marque o grau de confiança quando houver dúvida. Nunca invente um valor para completar a tabela: escreva "não encontrado".
4. **O que se repete é o sistema.** Um valor que aparece 1 vez é acidente; um valor que aparece 20 vezes é token. Use as **frequências** do script como evidência.
5. **Nada de "design genérico".** Em toda decisão que você escrever ou aplicar, a justificativa tem que ser "porque o site faz assim (evidência X)", **nunca** "porque é o padrão/costuma ser". Se você se pegar usando um default (cantos de 12 px, sombra grande, gradiente roxo, Inter 16 px…) sem evidência, pare e meça.
6. **Eu não vejo seu terminal.** Trabalhe em fases, com resumo curto ao fim de cada uma (3 a 6 linhas, o que achou de mais característico) e **só me pergunte o indispensável**.

## FASE 0 · Preparação (2 min)

1. Confirme Node ≥ 18. Se `tools/design-extractor/node_modules` não existir: `cd tools/design-extractor && npm run setup`.
2. Se o script `tools/design-extractor/extrair.mjs` **não existir** no projeto, escreva você mesmo um equivalente com Playwright que faça os 8 blocos descritos no Apêndice A. Não prossiga sem um jeito de **renderizar o site de verdade** (HTML estático/`curl` não basta: os estilos reais só existem no navegador).
3. Crie `design-extraido/<dominio>/` e trabalhe lá. Anote a data e o commit do projeto (para saber o "antes").

## FASE 1 · Coleta

Para **cada página** relevante (home, uma página de conteúdo, uma de formulário, uma de tabela/dados, um estado vazio/erro/404 se existir, e a do app logado se houver):

```bash
node tools/design-extractor/extrair.mjs <url> design-extraido/<dominio>/<pagina>
```

Depois, **complete o que o script não vê**:

- **Hover/foco/ativo** de componentes que o script não alcançou (menus, abas, linhas de tabela, cards): com Playwright, `hover()`, `focus()`, `click()` e leia `getComputedStyle` antes/depois.
- **Movimento de verdade**: grave a entrada da página e uma interação como **sequência de capturas** (ex.: 12 capturas a cada 80 ms após `goto` e após um hover) ou com `page.video`. Leia `@keyframes`, `transition`, `animation` e bibliotecas (framer-motion, GSAP, Lenis, Lottie: procure no HTML/JS).
- **Estados raros**: modal aberto, dropdown, tooltip, toast, input com erro, botão desabilitado/carregando, skeleton, tela de carregamento.
- **Responsivo**: 390, 768, 1024, 1440 e 1920 px. Onde o layout muda (breakpoints) e o que some/empilha.
- **Tema escuro** (se houver): `emulateMedia({colorScheme:'dark'})` e a chave de tema do site.
- **Pilha técnica**: o site usa Tailwind? shadcn/Radix? MUI? Chakra? CSS puro? (classes `bg-…`, `--tw-`, `data-radix`, `MuiButton-`). Isso muda como você descreve os tokens (muitas vezes o site **já declara** os tokens como variáveis CSS: ouro puro).
- **Fontes**: abra os `@font-face`, pegue os nomes dos arquivos/URLs, veja pesos e se é variável; leia `font-feature-settings`, `font-optical-sizing`, `font-variation-settings`, `-webkit-font-smoothing`.

### Sites com login
Peça a **mim** que eu entre uma vez (`npx playwright codegen --save-storage=estado-login.json <url>`), depois use `extrair.mjs <url> <pasta> --login=estado-login.json`. Nunca peça nem guarde minha senha. O arquivo `estado-login.json` fica fora do Git.

### Sites difíceis
SPA que demora, banner de cookies, Shadow DOM, canvas/WebGL, iframe, Cloudflare: veja o Apêndice C. Se não der, diga o que ficou de fora.

## FASE 2 · Olhar de verdade (não pule)

**Abra e examine as capturas** (você enxerga imagens): `desktop-dobra.png`, `desktop-completo.png`, `celular-*.png`, `recorte-*.png`. Antes de olhar os números, escreva **para si** em 10 linhas as impressões: o que o olho vê primeiro? onde está o peso visual? quanto respiro há? a densidade é alta ou baixa? o tom é frio/quente, sério/lúdico? onde está a "assinatura"? Depois use os números para **confirmar ou desmentir** cada impressão.

## FASE 3 · Normalizar os tokens

Com `raw.json` (principalmente `computado`, `css.vars`, `componentes`):

**Cores**
- Converta rgb/hsl/oklch → **hex** (e guarde o original). Una valores quase iguais (diferença imperceptível) num token só e diga que uniu.
- Dê **papéis**, não números: `fundo-pagina`, `fundo-painel`, `borda`, `texto`, `texto-secundário`, `texto-apoio`, `marca`, `marca-hover`, `sucesso`, `erro`, `aviso`, `link`, `foco`. Se o site tem variáveis (`--primary`, `--muted-foreground`…), **use os nomes dele**.
- Descubra a **regra de uso**: onde a cor de marca aparece e onde **nunca** aparece; quantas cores "de verdade" existem (muitos sites sérios têm 1 cor + neutros); se os neutros são frios/quentes/neutros puros; contraste (calcule texto/fundo, WCAG).
- Opacidades recorrentes (ex.: borda a 8%, hover a 5%): são tokens.
- Gradientes e imagens de fundo: descreva (ângulo, paradas, cores) e diga se são decoração ou estrutura.

**Tipografia**
- Famílias e papel de cada uma (títulos, corpo, mono, números). Pesos usados (e os que **nunca** aparecem: isso é assinatura).
- **A escala**: liste tamanhos únicos em ordem, calcule a razão entre eles (1,125? 1,2? 1,25?) ou diga que é manual. Associe cada tamanho a um **uso** (título de página, de seção, corpo, legenda, rótulo).
- `line-height` por tamanho, `letter-spacing` por tamanho (títulos grandes costumam ser negativos; caixa alta, positivos), `text-transform`, `font-feature-settings` (números tabulares, `cv11`…), `font-optical-sizing`.
- Largura de leitura (`max-width` do texto em ch/px).

**Espaço, forma e profundidade**
- Descubra a **unidade-base** (4? 8? 10?) testando se os paddings/gaps são múltiplos. Liste a escala usada e onde cada passo aparece (entre seções, entre cards, por dentro do card, entre ícone e texto).
- **Raios**: lista única e onde cada um vive (botão, campo, card, modal, avatar, pílula) e a regra "de dentro menor que de fora".
- **Bordas**: espessura, cor, quando existe e quando se usa sombra no lugar.
- **Sombras**: decomponha cada `box-shadow` em **camadas** (contorno de 1px? contato curto? difusa longa? luz interna?). Diga quais elevações existem (plano, card, flutuante, modal) e o que cada uma carrega.
- Blur/backdrop-filter, vidro, texturas, grão, padrões: existem? (muitos sites "premium" não usam nada disso: diga.)

## FASE 4 · Componentes (as receitas)

Para **cada** componente, documente: anatomia (partes), medidas (altura, padding, gap, raio), tipografia, cores por estado, **todos os estados** (padrão · hover · foco · ativo/pressionado · desabilitado · carregando · erro), variantes, comportamento (o que anima e como), e o **HTML/estrutura essencial** (só a árvore e as classes de papel, não o código bruto).

Mínimo: botões (todas as variantes), links, campos de texto/select/checkbox/toggle/radio, cabeçalho/navegação, menu lateral (se houver), cards/painéis, tabelas/listas, etiquetas/badges/chips, abas, modais/gavetas/popovers/tooltips, toasts/alertas, avatares, ícones (família, traço, tamanho), gráficos (se houver: cores, grade, tooltip, interação), rodapé, tela vazia/erro/carregando, formulários completos.

## FASE 5 · Movimento

Tabela: **o quê** · gatilho · propriedades · duração · curva (cubic-bezier exata) · atraso/escalonamento · observações. Cubra: entrada de página, entrada de blocos, hover, pressionar, foco, abrir/fechar (menu, modal, gaveta), troca de rota, rolagem (parallax? revelar ao rolar? barra de progresso?), números que contam, skeleton/loader, micro-interações (ícones, setas), e o **tempo total** da tela de abertura. Diga a **filosofia** (rápido e discreto? lento e cinematográfico?) e o que **não** anima. Cheque `prefers-reduced-motion`.

## FASE 6 · Layout e ritmo

Largura máxima do conteúdo, grade (colunas/gaps por breakpoint), alinhamentos, **proporção entre cheio e vazio**, altura típica das seções, ordem fixa dos blocos de uma tela, como o cabeçalho de página é montado, densidade (confortável? compacta?), regras responsivas (o que empilha, o que some, tamanhos de alvo de toque).

## FASE 7 · O DNA (a parte que impede o genérico)

Escreva a seção que vale mais que todas as outras:

1. **As 5 a 10 assinaturas**: decisões **raras** que fazem o site parecer ele mesmo (ex.: "serifa fina só nos números", "bordas de 1px em tudo e nenhuma sombra longa", "cor de marca só em ação", "caixa alta mono nos rótulos", "linhas de 1px no lugar de cards"). Cada uma com **evidência** (captura/medida).
2. **Os "nunca"**: o que o site se recusa a fazer (sem emoji, sem gradiente, sem cantos redondos, sem sombras, sem ícones coloridos, sem centralizar texto, sem animação de bounce…). Os "nunca" definem a identidade tanto quanto os "sempre".
3. **Voz e microcopy**: tom (técnico? humano?), caixa das frases, como são botões, vazios, erros e legendas, pontuação, números e datas.
4. **Hierarquia**: como o site diz "isto é o mais importante" (tamanho? peso? cor? posição? espaço?).
5. **Teste do reconhecimento**: "se eu tirasse o logo, ainda reconheceria?" Diga **por quê**.
6. **Quem seria quem**: 3 a 5 adjetivos que descrevem a sensação (ex.: sóbrio, quente, técnico) e **2 sites/marcas parecidos e em que se diferenciam**.

## FASE 8 · O documento

Gere `design-extraido/<dominio>/DESIGN_SYSTEM.md` **neste molde** (use `docs/DESIGN_SYSTEM.md` deste repositório como referência de profundidade e de formato):

1. Como usar este documento (para outra IA) · estilo em uma frase
2. Princípios (e o **DNA**: assinaturas, "nunca", voz)
3. Cores (tabela: papel · hex · original · uso · frequência; regra de uso; contrastes; escuro)
4. Tipografia (famílias, escala com usos, line-height/letter-spacing, features, alternativas livres)
5. Forma, espaço e sombra (unidade-base, escala, raios, bordas, sombras em camadas, **valores CSS prontos**)
6. Layout e grade (por breakpoint)
7. Componentes (as receitas da Fase 4)
8. Gráficos e dados (se houver)
9. Movimento (a tabela da Fase 5)
10. Acessibilidade (contraste, foco, alvos, movimento reduzido)
11. Receitas para recriar (tela nova, componente novo, trocar a cor da marca)
12. O que nunca fazer
13. Armadilhas e incertezas (o que **não** foi possível medir; confiança de cada seção)
14. Apêndice: tokens em CSS (`:root`), `tailwind.config` e `tokens.ts` prontos para colar

Mais: `tokens.json` (todos os tokens, com o original), `tokens.ts` (objeto tipado), `tokens.css` (variáveis) e a pasta `capturas/`. **Cada valor do documento tem que bater com `raw.json`.**

## FASE 9 · Verificação (o teste de que está certo)

1. Monte uma **página de prova mínima** (HTML + `tokens.css`, ou rota temporária no meu projeto) com: título, parágrafo, botões (todas as variantes), campo, card, tabela, etiqueta e, se houver, um gráfico.
2. Capture no mesmo viewport e **compare lado a lado** com a captura do site (e, se puder, calcule a diferença de pixels com `pixelmatch`/`odiff`). Compare: cores, tamanhos, pesos, espaços, raios, sombras, estados de hover.
3. **Corrija o documento** até a prova ficar visualmente indistinguível nos tokens e componentes (o conteúdo, as imagens e a marca naturalmente diferem). Liste as divergências que sobraram e por quê.

## FASE 10 · (só no modo `aplicar`) Aplicar no meu projeto

1. **Mapeie** o que meu projeto já tem para o que o site tem: tabela de/para (token meu → token extraído). Descubra onde meu projeto guarda cores/tipos/espaços (ideal: **um** arquivo de tokens). Se não existir, **crie um** (um lugar só: mudar ali muda tudo) antes de mexer nas telas.
2. **Ordem**: (a) tokens → (b) estilos globais → (c) peças comuns (botão, campo, card, tabela, etiqueta) → (d) casca/cabeçalho/menu → (e) telas, uma a uma → (f) movimento → (g) tela de carregamento. Verifique no navegador **a cada passo**, em 1440 e 390 px.
3. **Nunca** cole o CSS do site. Reescreva com meus tokens e minha estrutura. Nenhuma tela escreve `#hex` ou tamanho solto: tudo vem dos tokens.
4. **Preserve** o conteúdo, a lógica, as rotas, os dados e o que eu marquei como intocável. Só o visual muda.
5. Ao final: `tsc`/`lint`/testes, capturas **antes e depois** e a lista do que mudou.

## ENTREGA

1. Os arquivos (caminhos completos).
2. **Resumo em 10 linhas**: a alma do site, as 3 assinaturas mais fortes e o que você mudaria/evitaria para não virar cópia.
3. **Incertezas**: o que não deu para medir (fonte paga? estado que exige conta? animação em WebGL?).
4. Se no modo `aplicar`: o antes/depois e como reverter.

## ANTI-GENÉRICO (verifique antes de entregar)

Reprove o seu próprio trabalho se encontrar qualquer um destes **sem evidência no site**: gradiente roxo/azul-néon · cards com sombra grande e cantos de 16–24 px em tudo · glassmorphism/blur · emoji ou ícones em círculos coloridos · texto centralizado em tudo · "hero + 3 cards de benefício" · Inter/Roboto 16 px em tudo · cinza `#6B7280` e azul `#3B82F6` · botões em pílula por reflexo · bordas de 1px em `#E5E7EB` por reflexo · espaçamento em 16/24/32 sem regra · animação de bounce/pulse sem função · "modo escuro" cinza-azulado padrão · textos "Lorem ipsum" ou "Welcome to…". Cada decisão visual precisa responder: **"qual medida do site justifica isto?"**
````

---

## Apêndice A · O que o `extrair.mjs` mede

| Bloco de `raw.json` | Conteúdo |
|---|---|
| `css` | Variáveis CSS de `:root`/`html`/`body`/temas, todos os `@font-face`, todos os `@keyframes`, as media queries, a lista de folhas de estilo, as fontes realmente carregadas. As folhas são baixadas inteiras para `css/`. |
| `computado` | O estilo **computado** de todo elemento visível, **contado**: top valores de cor do texto, fundo, borda, fonte, tamanho, peso, line-height, letter-spacing, raio, sombra, padding, margem, gap, transição, animação, backdrop-filter, imagem de fundo. É a frequência que separa token de acidente. |
| `componentes` | Um exemplar de cada variante de h1–h4, parágrafo, link, botão, campo, nav, rodapé, tabela, lista, imagem, rótulo, etiqueta, código e **cartão** (contêiner com borda/sombra/raio): estilos completos, caixa e HTML cortado. |
| `estados` | Para botões, links de navegação e campos: o estilo **antes**, no **hover** e no **foco** (o que muda de verdade). |
| `layout` | `max-width`s, grades (colunas e gap) e o ritmo das seções (altura, padding, fundo). |
| `meta` | Título, `theme-color`, favicons, logo (HTML), fontes do Google, classes de tema. |
| `temaEscuro`, `celular` | Resposta ao `prefers-color-scheme: dark` e medidas no viewport de 390 px (inclui se há rolagem horizontal). |
| PNGs | `desktop-dobra`, `desktop-completo`, `desktop-escuro`, `celular-dobra`, `celular-completo`, `recorte-botao/cartao/nav/campo`. |

Limites conhecidos: o script não clica em menus nem abre modais (faça isso à mão na Fase 1); não vê o que está em canvas/WebGL; não resolve `oklch`/`color-mix` para hex (converta você mesmo); não lê o que está em Shadow DOM fechado.

## Apêndice B · Receitas rápidas (Playwright)

```js
// Quadros de uma animação (12 capturas, a cada 80 ms)
for (let i = 0; i < 12; i++) { await page.screenshot({ path: `anim-${i}.png` }); await page.waitForTimeout(80); }

// Estilo computado de um elemento específico, antes e depois do hover
const get = (sel) => page.$eval(sel, (e) => { const c = getComputedStyle(e); return { bg: c.backgroundColor, sh: c.boxShadow, tr: c.transform, tt: c.transition }; });
const a = await get('.card'); await page.hover('.card'); await page.waitForTimeout(400); const b = await get('.card');

// Todas as cores literais do CSS baixado (frequência)
//   grep -ohE '#[0-9a-fA-F]{3,8}|rgba?\([^)]*\)|hsla?\([^)]*\)|oklch\([^)]*\)' css/*.css | sort | uniq -c | sort -rn | head -40

// Fontes: o arquivo real e o formato
const fontes = await page.evaluate(() => [...document.fonts].map(f => ({ f: f.family, w: f.weight, s: f.status })));

// Desligar animações para medir só o estático, ou forçar movimento reduzido
await page.emulateMedia({ reducedMotion: 'reduce' });

// Cobertura de CSS: quais regras o site realmente usa nesta página
await page.coverage.startCSSCoverage(); /* navegue */ const cov = await page.coverage.stopCSSCoverage();
```

Detectar a pilha: procure no HTML por `class="… bg-… text-… px-…"` (Tailwind), `data-radix-*` (Radix/shadcn), `Mui…` (MUI), `chakra-` (Chakra), `ant-` (Ant Design), `__next` (Next.js), `data-framer-` (Framer), `webflow` (Webflow).

## Apêndice C · Sites difíceis

| Problema | O que fazer |
|---|---|
| Aparece um banner de cookies que cobre a tela | `page.getByRole('button', {name: /accept|aceitar|ok/i}).click()` antes de capturar; ou remova o elemento com `evaluate` (só para a captura) |
| SPA que carrega devagar/animação de abertura | Aumente a espera (`waitForTimeout(6000)`) e capture **também** a abertura em quadros: ela faz parte do sistema |
| Conteúdo só aparece ao rolar | O script já rola a página; para rolagem horizontal ou carrosséis, role/clique e capture cada estado |
| Shadow DOM | `page.locator('css=…')` atravessa Shadow DOM aberto; no fechado, só dá para medir por fora e pelas capturas: diga isso |
| Canvas/WebGL/Three.js | Capture, descreva a técnica (pontos, shader, partículas), meça cores por amostragem de pixels da captura e documente como "efeito", sem tentar reproduzir o shader |
| iframe de outro domínio | `page.frames()` e rode a extração dentro do frame, se for relevante |
| Cloudflare/captcha/bloqueio | **Pare.** Não burle. Peça-me para abrir o site e salvar o estado, ou use só as capturas que eu mandar |
| `oklch()`, `color-mix()`, `light-dark()` | Resolva para sRGB usando o próprio navegador: aplique a cor num elemento e leia o `getComputedStyle` (ele devolve `rgb()`) |
| Site com tema claro/escuro por classe | Alterne a classe no `<html>` (`document.documentElement.classList.toggle('dark')`) e extraia de novo |
| Ícones | Diga a **família** (Lucide, Heroicons, Phosphor, próprio?), o traço, o tamanho e a cor; não copie SVGs proprietários |

## Apêndice D · Prompts curtos para o dia a dia

**Só extrair:**
> Extraia o design system de `https://…` seguindo `tools/design-extractor/PROMPT.md` (MODO `extrair`). Quero foco em tipografia, sombras e movimento. Entregue em `design-extraido/`.

**Extrair e aplicar na tela que estou fazendo:**
> Siga `tools/design-extractor/PROMPT.md` com MODO `aplicar` para `https://…`. Meu projeto é esta pasta; não mexa em `shared/` nem na lógica. Comece só pela tela `src/pages/X.tsx` e pelos tokens; mostre antes/depois.

**Só um componente:**
> Meça o botão primário e o card de `https://…` em todos os estados (hover, foco, pressionado, desabilitado), com medidas, sombras em camadas, transição e curva. Devolva uma tabela e o CSS com variáveis.

**Comparar dois sites:**
> Extraia `https://a.com` e `https://b.com` e escreva só a seção "DNA": o que cada um tem de único, o que têm em comum e onde o meu projeto está mais perto de cada um.

**Auditar o meu app contra um site de referência:**
> Extraia `https://ref.com` e compare, token a token, com `src/design/tokens.ts`. Liste as divergências por impacto visual (maior primeiro) e proponha as mudanças mínimas.
