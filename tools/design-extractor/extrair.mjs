#!/usr/bin/env node
// Extrai o design system de qualquer site renderizado: tokens, tipografia, componentes, estados de hover, movimento e capturas.
// Uso:   node extrair.mjs <url> [pasta-de-saida] [--login=estado.json]
// Setup: npm i -D playwright   &&   npx playwright install chromium     (playwright-core também serve se já houver um Chromium)
// Saída: <pasta>/raw.json (dados brutos) · <pasta>/*.png (capturas) · <pasta>/css/ (as folhas de estilo baixadas)
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

let chromium;
try { ({ chromium } = await import('playwright')); } catch { ({ chromium } = await import('playwright-core')); }

const url = process.argv[2];
const out = process.argv[3] && !process.argv[3].startsWith('--') ? process.argv[3] : './extracao';
const login = process.argv.find((a) => a.startsWith('--login='))?.split('=')[1]; // storageState salvo pelo Playwright (site com conta)
if (!url) { console.error('Uso: node extrair.mjs <url> [pasta] [--login=estado.json]'); process.exit(1); }
mkdirSync(join(out, 'css'), { recursive: true });

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, storageState: login });
const page = await ctx.newPage();
const log = [];
page.on('pageerror', (e) => log.push(`pageerror: ${e.message}`));
await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 }).catch((e) => log.push(`goto: ${e.message}`));
await page.waitForTimeout(3500); // animações de entrada, splash, fontes

// rola a página inteira uma vez (carrega o que é preguiçoso e dispara animações de rolagem)
await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 700) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); } window.scrollTo(0, 0); });
await page.waitForTimeout(800);

const raw = { url, quando: new Date().toISOString(), log };

// 1) O que a própria página diz: variáveis CSS, @font-face, @keyframes, media queries, folhas (também as de outro domínio).
raw.css = await page.evaluate(async () => {
  const vars = {}; const fontFaces = []; const keyframes = {}; const media = new Set(); const sheets = [];
  const walk = (rules, origem) => {
    for (const r of rules) {
      try {
        if (r.type === CSSRule.STYLE_RULE) {
          if (/^(:root|html|body|\.dark|\[data-theme|:host)/.test(r.selectorText)) {
            for (const n of r.style) if (n.startsWith('--')) (vars[r.selectorText] ??= {})[n] = r.style.getPropertyValue(n).trim();
          }
        } else if (r.type === CSSRule.FONT_FACE_RULE) fontFaces.push({ origem, css: r.cssText.slice(0, 400) });
        else if (r.type === CSSRule.KEYFRAMES_RULE) keyframes[r.name] = r.cssText.slice(0, 900);
        else if (r.type === CSSRule.MEDIA_RULE) { media.add(r.conditionText); walk(r.cssRules, origem); }
        else if (r.cssRules) walk(r.cssRules, origem);
      } catch { /* regra bloqueada */ }
    }
  };
  for (const s of document.styleSheets) {
    sheets.push(s.href || 'inline');
    try { walk(s.cssRules, s.href || 'inline'); } catch { /* folha de outro domínio sem CORS: baixada à parte */ }
  }
  return { vars, fontFaces, keyframes, media: [...media], sheets, fontsCarregadas: [...document.fonts].map((f) => `${f.family} ${f.weight} ${f.style} ${f.status}`) };
});

// 2) Baixa as folhas (para ler o que o navegador bloqueou e para o Claude consultar o CSS de verdade).
const folhas = await page.evaluate(() => [...document.styleSheets].map((s) => s.href).filter(Boolean));
for (const [i, href] of folhas.entries()) {
  try { const r = await ctx.request.get(href); writeFileSync(join(out, 'css', `${String(i).padStart(2, '0')}-${new URL(href).pathname.split('/').pop() || 'style'}.css`), await r.text()); } catch (e) { log.push(`css ${href}: ${e.message}`); }
}

// 3) Estilos computados de tudo o que é visível: frequência de cada valor = o sistema de verdade (o que se repete é token).
raw.computado = await page.evaluate(() => {
  const props = ['color', 'background-color', 'border-top-color', 'font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing', 'text-transform',
    'border-radius', 'box-shadow', 'padding-top', 'padding-left', 'margin-top', 'row-gap', 'column-gap', 'border-top-width', 'opacity', 'transition-duration', 'transition-timing-function', 'animation-name', 'backdrop-filter', 'background-image'];
  const cont = Object.fromEntries(props.map((p) => [p, {}]));
  const els = [...document.querySelectorAll('body *')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; });
  for (const e of els) {
    const cs = getComputedStyle(e);
    const temTexto = [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    for (const p of props) {
      const v = cs.getPropertyValue(p);
      if (!v || v === 'none' || v === 'normal' || v === '0px' || v === 'auto' || v === 'rgba(0, 0, 0, 0)' || v === '0s' || v === 'ease' && p === 'transition-timing-function') continue;
      if ((p === 'color' || p.startsWith('font') || p === 'line-height' || p === 'letter-spacing' || p === 'text-transform') && !temTexto) continue;
      cont[p][v] = (cont[p][v] || 0) + 1;
    }
  }
  const top = (o, n = 14) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n);
  return { elementos: els.length, ...Object.fromEntries(props.map((p) => [p, top(cont[p])])) };
});

// 4) Componentes: um exemplar de cada, com estilos completos e o HTML (cortado).
raw.componentes = await page.evaluate(() => {
  const campos = ['color', 'background', 'background-color', 'background-image', 'border', 'border-radius', 'box-shadow', 'padding', 'margin', 'font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing', 'text-transform', 'text-decoration', 'height', 'min-height', 'width', 'gap', 'display', 'transition', 'cursor', 'backdrop-filter'];
  const pega = (e) => { const cs = getComputedStyle(e); const r = e.getBoundingClientRect(); return { texto: (e.innerText || e.value || e.placeholder || '').trim().slice(0, 60), caixa: `${Math.round(r.width)}x${Math.round(r.height)}`, estilo: Object.fromEntries(campos.map((c) => [c, cs.getPropertyValue(c)])), html: e.outerHTML.slice(0, 500) }; };
  const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const alvo = {
    h1: 'h1', h2: 'h2', h3: 'h3', h4: 'h4', paragrafo: 'p', link: 'a[href]', botao: 'button, [role=button], a[class*=btn], a[class*=button]', campo: 'input:not([type=hidden]), textarea, select',
    nav: 'nav, header', rodape: 'footer', tabela: 'table', lista: 'ul li', imagem: 'img', rotulo: 'label', etiqueta: '[class*=badge], [class*=chip], [class*=tag], [class*=pill]', codigo: 'code, pre',
  };
  const res = {};
  for (const [nome, sel] of Object.entries(alvo)) {
    const todos = [...document.querySelectorAll(sel)].filter(vis);
    // botões e links: pega variantes distintas (primário, secundário…) pelo fundo + cor
    const vistos = new Set(); const amostras = [];
    for (const e of todos) { const cs = getComputedStyle(e); const k = cs.backgroundColor + cs.color + cs.borderRadius + cs.fontSize; if (vistos.has(k)) continue; vistos.add(k); amostras.push(pega(e)); if (amostras.length >= 4) break; }
    if (amostras.length) res[nome] = amostras;
  }
  // cartões/painéis: elementos com sombra ou borda, raio e fundo (o contêiner que se repete)
  const cartoes = [...document.querySelectorAll('div, section, article, li, a')].filter((e) => { const cs = getComputedStyle(e); const r = e.getBoundingClientRect(); return r.width > 160 && r.height > 80 && r.width < 900 && (cs.boxShadow !== 'none' || parseFloat(cs.borderTopWidth) > 0) && parseFloat(cs.borderRadius) > 0 && cs.backgroundColor !== 'rgba(0, 0, 0, 0)'; });
  const vistos = new Set(); res.cartao = [];
  for (const e of cartoes) { const cs = getComputedStyle(e); const k = cs.boxShadow + cs.borderRadius + cs.backgroundColor + cs.padding; if (vistos.has(k)) continue; vistos.add(k); res.cartao.push(pega(e)); if (res.cartao.length >= 4) break; }
  return res;
});

// 5) Estados: passa o mouse e foca nos primeiros botões, links e campos e vê o que muda (hover, foco, ativo).
raw.estados = [];
for (const sel of ['button, [role=button], a[class*=btn], a[class*=button]', 'nav a, header a', 'input:not([type=hidden]), textarea']) {
  const els = await page.$$(sel);
  for (const el of els.slice(0, 3)) {
    if (!(await el.isVisible())) continue;
    const antes = await el.evaluate((e) => { const cs = getComputedStyle(e); return { background: cs.backgroundColor, color: cs.color, boxShadow: cs.boxShadow, border: cs.borderTopColor, transform: cs.transform, opacity: cs.opacity, outline: cs.outline, textDecoration: cs.textDecorationLine, transition: cs.transition.slice(0, 140) }; });
    const hover = await (async () => { await el.hover().catch(() => {}); await page.waitForTimeout(350); return el.evaluate((e) => { const cs = getComputedStyle(e); return { background: cs.backgroundColor, color: cs.color, boxShadow: cs.boxShadow, border: cs.borderTopColor, transform: cs.transform, opacity: cs.opacity, textDecoration: cs.textDecorationLine }; }); })();
    await el.focus().catch(() => {}); await page.keyboard.press('Tab').catch(() => {}); await el.focus().catch(() => {}); await page.waitForTimeout(250);
    const foco = await el.evaluate((e) => { const cs = getComputedStyle(e); return { outline: cs.outline, boxShadow: cs.boxShadow, border: cs.borderTopColor }; });
    const texto = await el.evaluate((e) => (e.innerText || e.placeholder || e.name || '').trim().slice(0, 40));
    raw.estados.push({ seletor: sel.split(',')[0], texto, antes, hover, foco });
  }
}
await page.mouse.move(0, 0);

// 6) Layout: larguras de contêiner, colunas de grade, espaçamento entre seções.
raw.layout = await page.evaluate(() => {
  const larg = {}; const grades = {};
  for (const e of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(e); const r = e.getBoundingClientRect();
    if (cs.maxWidth !== 'none' && cs.maxWidth.endsWith('px')) larg[cs.maxWidth] = (larg[cs.maxWidth] || 0) + 1;
    if (cs.display === 'grid' && cs.gridTemplateColumns !== 'none') { const k = `${cs.gridTemplateColumns.split(' ').length} col · gap ${cs.gap}`; grades[k] = (grades[k] || 0) + 1; }
  }
  const secoes = [...document.querySelectorAll('main > *, body > div > *, section')].slice(0, 12).map((s) => { const cs = getComputedStyle(s); const r = s.getBoundingClientRect(); return { tag: s.tagName.toLowerCase(), classe: String(s.className).slice(0, 60), alturaPx: Math.round(r.height), paddingY: `${cs.paddingTop} / ${cs.paddingBottom}`, fundo: cs.backgroundColor }; });
  return { alturaTotal: document.documentElement.scrollHeight, maxWidths: Object.entries(larg).sort((a, b) => b[1] - a[1]).slice(0, 6), grades: Object.entries(grades).sort((a, b) => b[1] - a[1]).slice(0, 8), secoes };
});

// 7) Meta e marca.
raw.meta = await page.evaluate(() => ({ titulo: document.title, themeColor: document.querySelector('meta[name=theme-color]')?.content, icones: [...document.querySelectorAll('link[rel*=icon]')].map((l) => l.href), logo: [...document.querySelectorAll('header img, nav img, header svg, nav svg')].slice(0, 2).map((e) => e.outerHTML.slice(0, 300)), fontesGoogle: [...document.querySelectorAll('link[href*="fonts.g"]')].map((l) => l.href), tema: document.documentElement.className + ' ' + (document.documentElement.dataset.theme || '') }));

// 8) Capturas: página inteira no desktop e no celular, o primeiro dobramento, o escuro (se o site responder) e recortes dos componentes.
await page.screenshot({ path: join(out, 'desktop-dobra.png') });
await page.screenshot({ path: join(out, 'desktop-completo.png'), fullPage: true }).catch((e) => log.push(`fullpage: ${e.message}`));
await page.emulateMedia({ colorScheme: 'dark' }); await page.waitForTimeout(700);
await page.screenshot({ path: join(out, 'desktop-escuro.png') });
raw.temaEscuro = await page.evaluate(() => ({ fundo: getComputedStyle(document.body).backgroundColor, texto: getComputedStyle(document.body).color }));
await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'no-preference' });
await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(900);
await page.screenshot({ path: join(out, 'celular-dobra.png') });
await page.screenshot({ path: join(out, 'celular-completo.png'), fullPage: true }).catch(() => {});
raw.celular = await page.evaluate(() => ({ h1: getComputedStyle(document.querySelector('h1') || document.body).fontSize, body: getComputedStyle(document.body).fontSize, rolagemHorizontal: document.documentElement.scrollWidth > innerWidth }));
await page.setViewportSize({ width: 1440, height: 900 });
for (const [nome, sel] of [['botao', 'button, [role=button], a[class*=btn]'], ['cartao', '[class*=card], [class*=bloco], article'], ['nav', 'nav, header'], ['campo', 'input:not([type=hidden])']]) {
  for (const el of await page.$$(sel)) {
    if (!(await el.isVisible())) continue;
    await el.screenshot({ path: join(out, `recorte-${nome}.png`) }).catch(() => {});
    break;
  }
}

writeFileSync(join(out, 'raw.json'), JSON.stringify(raw, null, 2));
console.log(`ok → ${out}/raw.json · ${raw.computado.elementos} elementos · ${folhas.length} folhas · ${Object.keys(raw.css.vars).length} escopos de variáveis`);
await browser.close();
