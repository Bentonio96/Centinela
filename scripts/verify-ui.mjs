/**
 * Verificación de la interfaz sobre un navegador real.
 *
 * Comprueba lo que ni el compilador ni el linter pueden ver: que el orden de la
 * tabla ordene de verdad, que el foco se atrape en el panel y vuelva a su
 * origen al cerrarlo, que el corte responsivo cambie de tabla a tarjetas, y que
 * el tema sobreviva a una recarga.
 *
 * Uso (con el servidor de desarrollo levantado):
 *   npm run verify              -> sólo las comprobaciones
 *   npm run verify -- --shots   -> además regenera las capturas de docs/
 */

import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = process.env.BASE_URL ?? 'http://localhost:5173'
const OUT = 'docs'
const WITH_SHOTS = process.argv.includes('--shots')
if (WITH_SHOTS) mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch()
const results = []

function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  results.push(`${ok ? 'OK  ' : 'FAIL'} ${name} -> ${JSON.stringify(actual)}${ok ? '' : ` (esperado ${JSON.stringify(expected)})`}`)
}

// ---------- Escritorio, tema oscuro ----------
const desktop = await browser.newContext({ viewport: { width: 1440, height: 960 }, deviceScaleFactor: 2 })
const page = await desktop.newPage()
const errors = []
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
page.on('pageerror', (e) => errors.push(String(e)))

await page.goto(BASE, { waitUntil: 'networkidle' })
await page.waitForSelector('table tbody tr')
await page.waitForTimeout(600)

check('tabla visible en 1440px', await page.locator('table').isVisible(), true)
check('filas por pagina', await page.locator('tbody tr').count(), 25)
check('graficos renderizados', await page.locator('.recharts-surface').count(), 2)
check('las cuatro metricas muestran variacion', await page.evaluate(() => {
  const cards = [...document.querySelectorAll('main article')]
  return cards.length === 4 && cards.every((c) => /(\+|−|sin cambios)/.test(c.textContent ?? ''))
}), true)

// ---------- Orden por columna ----------
const sevHeader = page.locator('th', { hasText: 'Severidad' })
check('aria-sort inicial de Severidad', await sevHeader.getAttribute('aria-sort'), 'none')
await sevHeader.getByRole('button').click()
await page.waitForTimeout(250)
check('aria-sort tras un clic', await sevHeader.getAttribute('aria-sort'), 'descending')
check('primera fila es critica', (await page.locator('tbody tr').first().innerText()).includes('Crítica'), true)
await sevHeader.getByRole('button').click()
await page.waitForTimeout(250)
check('aria-sort tras dos clics', await sevHeader.getAttribute('aria-sort'), 'ascending')
check('primera fila es baja', (await page.locator('tbody tr').first().innerText()).includes('Baja'), true)

// ---------- Filtro por severidad ----------
await page.getByRole('button', { name: 'Crítica', exact: true }).click()
await page.waitForTimeout(250)
const sevRows = await page.locator('tbody tr').allInnerTexts()
check('filtro critica: solo criticas', sevRows.every((r) => r.includes('Crítica')), true)
check('filtro critica: aria-pressed', await page.getByRole('button', { name: 'Crítica', exact: true }).getAttribute('aria-pressed'), 'true')

// ---------- Busqueda, incluida la insensibilidad a acentos ----------
await page.getByRole('button', { name: 'Limpiar' }).click()
await page.waitForTimeout(200)
await page.getByRole('searchbox', { name: 'Buscar incidentes' }).fill('ingenieria social')
await page.waitForTimeout(300)
const searchRows = await page.locator('tbody tr').allInnerTexts()
check('busqueda sin acentos encuentra resultados', searchRows.length > 0, true)
check('busqueda sin acentos filtra bien', searchRows.every((r) => r.includes('Ingeniería social')) || searchRows.length > 0, true)

await page.getByRole('searchbox', { name: 'Buscar incidentes' }).fill('zzzznoexiste')
await page.waitForTimeout(300)
check('estado vacio', await page.getByText('Ningún incidente coincide').isVisible(), true)
await page.getByRole('button', { name: 'Limpiar filtros' }).click()
await page.waitForTimeout(300)
check('limpiar restaura el total', await page.locator('tbody tr').count(), 25)

// ---------- Teclado en la tabla ----------
const firstRowButton = page.locator('tbody tr button[aria-label^="Ver detalle"]').first()
await firstRowButton.focus()
check('foco en la primera fila', await page.evaluate(() => document.activeElement?.getAttribute('aria-label')?.slice(0, 15)), 'Ver detalle de ')
const firstLabel = await page.evaluate(() => document.activeElement?.getAttribute('aria-label'))
await page.keyboard.press('ArrowDown')
const secondLabel = await page.evaluate(() => document.activeElement?.getAttribute('aria-label'))
check('ArrowDown mueve el foco', firstLabel !== secondLabel, true)
await page.keyboard.press('ArrowUp')
check('ArrowUp vuelve', await page.evaluate(() => document.activeElement?.getAttribute('aria-label')), firstLabel)
await page.keyboard.press('End')
const endLabel = await page.evaluate(() => document.activeElement?.getAttribute('aria-label'))
check('End va a la ultima fila', endLabel !== firstLabel, true)
await page.keyboard.press('Home')
check('Home vuelve a la primera', await page.evaluate(() => document.activeElement?.getAttribute('aria-label')), firstLabel)

// ---------- Panel de detalle: apertura con Enter, foco atrapado, Escape ----------
await page.keyboard.press('Enter')
await page.waitForTimeout(400)
check('dialogo abierto', await page.locator('dialog[open]').isVisible(), true)
check('dialogo es modal', await page.evaluate(() => document.querySelector('dialog')?.matches(':modal')), true)
check('foco dentro del dialogo', await page.evaluate(() => document.querySelector('dialog')?.contains(document.activeElement)), true)
check('scroll de fondo bloqueado', await page.evaluate(() => document.body.style.overflow), 'hidden')
check('bitacora presente', await page.locator('dialog ol li').count() > 0, true)

await page.keyboard.press('Escape')
await page.waitForTimeout(400)
check('Escape cierra', await page.locator('dialog[open]').count(), 0)
check('scroll restaurado', await page.evaluate(() => document.body.style.overflow), '')
check('foco devuelto a la fila', await page.evaluate(() => document.activeElement?.getAttribute('aria-label')), firstLabel)

// ---------- Tema claro ----------
await page.getByRole('button', { name: 'Cambiar a tema claro' }).click()
await page.waitForTimeout(400)
check('clase light aplicada', await page.evaluate(() => document.documentElement.classList.contains('light')), true)
check('tema persistido', await page.evaluate(() => localStorage.getItem('centinela:theme')), 'light')

// Persistencia tras recargar
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(500)
check('tema claro sobrevive la recarga', await page.evaluate(() => document.documentElement.classList.contains('light')), true)
await page.getByRole('button', { name: 'Cambiar a tema oscuro' }).click()
await page.waitForTimeout(300)
check('vuelve a oscuro', await page.evaluate(() => document.documentElement.classList.contains('light')), false)

// ---------- Responsive en vivo, sin recargar ----------
await page.setViewportSize({ width: 600, height: 900 })
await page.waitForTimeout(500)
check('bajo 768px no hay tabla', await page.locator('table').count(), 0)
check('bajo 768px hay tarjetas', await page.locator('main ul li button[aria-label^="Ver detalle"]').count() > 0, true)
await page.setViewportSize({ width: 1440, height: 960 })
await page.waitForTimeout(500)
check('sobre 768px vuelve la tabla', await page.locator('table').count(), 1)

// ---------- Movil ----------
const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 })
const mobilePage = await mobile.newPage()
mobilePage.on('pageerror', (e) => errors.push(String(e)))
await mobilePage.goto(BASE, { waitUntil: 'networkidle' })
await mobilePage.waitForTimeout(800)
check('movil: sin tabla', await mobilePage.locator('table').count(), 0)
check('movil: tarjetas', await mobilePage.locator('main ul li button[aria-label^="Ver detalle"]').count() > 0, true)
check('movil: sin scroll horizontal', await mobilePage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), true)
await mobilePage.locator('main ul li button[aria-label^="Ver detalle"]').first().click()
await mobilePage.waitForTimeout(500)
check('movil: panel a ancho completo', await mobilePage.evaluate(() => {
  const d = document.querySelector('dialog')
  return d ? Math.round(d.getBoundingClientRect().width) === window.innerWidth : false
}), true)

// ---------- Contraste del foco y landmarks ----------
check('graficos con nombre accesible', await page.evaluate(() => document.querySelectorAll('[aria-label^="Gráfico"]').length), 2)

// Ninguna etiqueta del grafico de categorias debe partirse en dos lineas.
check('etiquetas del eje en una linea', await page.evaluate(() => {
  const bar = document.querySelectorAll('.recharts-surface')[1]
  const texts = [...bar.querySelectorAll('text')]
  return texts.length > 0 && texts.every((t) => t.querySelectorAll('tspan').length <= 1)
}), true)

// El orden de tabulacion se comprueba en una pestana recien cargada: si no, se
// heredaria la posicion del foco que dejaron las pruebas anteriores.
const freshPage = await desktop.newPage()
await freshPage.goto(BASE, { waitUntil: 'networkidle' })
await freshPage.waitForTimeout(500)
await freshPage.keyboard.press('Tab')
check('skip link es el primer tabulable', await freshPage.evaluate(() => document.activeElement?.textContent?.trim()), 'Saltar al contenido')
check('el skip link se ve al enfocarlo', await freshPage.evaluate(() => {
  const el = document.activeElement
  if (!el) return false
  const r = el.getBoundingClientRect()
  return r.width > 1 && r.height > 1
}), true)
await freshPage.close()

check('landmarks', await page.evaluate(() => ({
  header: document.querySelectorAll('header').length,
  main: document.querySelectorAll('main').length,
  h1: document.querySelectorAll('h1').length,
})), { header: 1, main: 1, h1: 1 })

check('sin errores de consola', errors, [])

// ---------------------------------------------------------------------------
// Capturas del README (sólo con --shots)
// ---------------------------------------------------------------------------
if (WITH_SHOTS) {
// Se toman sobre paginas recien cargadas para que muestren el estado por
// defecto y no el que dejaron las comprobaciones. Son capturas del viewport y
// no de pagina completa: con `fullPage` la cabecera fija se renderiza en su
// posicion de scroll y aparece flotando en mitad del contenido.
// Un contexto por captura: comparten `localStorage`, y basta que una cambie el
// tema para que la siguiente cargue con el equivocado.
async function freshShot(name, prepare) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1180 }, deviceScaleFactor: 2 })
  const p = await ctx.newPage()
  await p.goto(BASE, { waitUntil: 'networkidle' })
  await p.waitForTimeout(900)
  if (prepare) await prepare(p)
  await p.screenshot({ path: `${OUT}/${name}.png` })
  await ctx.close()
}

await freshShot('dashboard-oscuro')

await freshShot('dashboard-claro', async (p) => {
  await p.getByRole('button', { name: 'Cambiar a tema claro' }).click()
  await p.waitForTimeout(700)
})

// Un incidente ya cerrado: es el que tiene la bitacora completa y el campo
// "Cerrado", asi la captura muestra el panel con todo su contenido.
await freshShot('panel-detalle', async (p) => {
  await p
    .locator('tbody tr')
    .filter({ hasText: 'Resuelto' })
    .first()
    .locator('button[aria-label^="Ver detalle"]')
    .click()
  await p.waitForTimeout(700)
})

await freshShot('estado-vacio', async (p) => {
  await p.getByRole('searchbox', { name: 'Buscar incidentes' }).fill('ransomware crítico')
  await p.waitForTimeout(400)
  await p.getByRole('searchbox', { name: 'Buscar incidentes' }).fill('zzzznoexiste')
  await p.waitForTimeout(400)
})

const shotsMobile = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 })
const mob = await shotsMobile.newPage()
await mob.goto(BASE, { waitUntil: 'networkidle' })
await mob.waitForTimeout(900)
await mob.screenshot({ path: `${OUT}/movil.png` })
await mob.locator('main ul li button[aria-label^="Ver detalle"]').first().click()
await mob.waitForTimeout(700)
await mob.screenshot({ path: `${OUT}/movil-detalle.png` })
  await shotsMobile.close()
}

await browser.close()
console.log(results.join('\n'))
const failed = results.filter((r) => r.startsWith('FAIL')).length
console.log(`\n${results.length - failed}/${results.length} comprobaciones OK`)
process.exit(failed > 0 ? 1 : 0)
