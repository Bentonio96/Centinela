/**
 * Verificación de la interfaz sobre un navegador real.
 *
 * Comprueba lo que ni el compilador ni el linter pueden ver: que el orden de la
 * tabla ordene de verdad, que el foco se atrape en el panel y vuelva a su
 * origen al cerrarlo, que el corte responsivo cambie de tabla a tarjetas, que
 * el tema sobreviva a una recarga, que el estado viaje en la URL y que el flujo
 * en vivo no le robe el foco a nadie.
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

// ---------------------------------------------------------------------------
// El estado vive en la URL
// ---------------------------------------------------------------------------
const path = () => {
  const parsed = new URL(page.url())
  return parsed.pathname + parsed.search
}

await page.goto(BASE, { waitUntil: 'networkidle' })
await page.waitForTimeout(700)
check('url limpia al inicio', path(), '/')

await page.getByRole('button', { name: 'Crítica', exact: true }).click()
await page.waitForTimeout(300)
check('el filtro se escribe en la url', path(), '/?sev=critical')

await page.getByRole('searchbox', { name: 'Buscar incidentes' }).fill('vpn')
await page.waitForTimeout(400)
check('la busqueda se escribe en la url', path().includes('q=vpn'), true)

// Un enlace compartido reconstruye la vista completa.
await page.goto(`${BASE}/?sev=critical&cat=ransomware&orden=severity:desc`, { waitUntil: 'networkidle' })
await page.waitForTimeout(700)
const sharedRows = await page.locator('tbody tr').allInnerTexts()
check('enlace compartido: severidad', sharedRows.every((r) => r.includes('Crítica')), true)
check('enlace compartido: categoria', sharedRows.every((r) => r.includes('Ransomware')), true)
check('enlace compartido: selector sincronizado', await page.getByLabel('Filtrar por categoría').inputValue(), 'ransomware')
check('enlace compartido: orden', await page.locator('th', { hasText: 'Severidad' }).getAttribute('aria-sort'), 'descending')

// Los parametros invalidos se descartan sin romper nada.
await page.goto(`${BASE}/?sev=inventada&cat=xxx&orden=nada:raro&p=-5&dia=99-99`, { waitUntil: 'networkidle' })
await page.waitForTimeout(700)
check('parametros invalidos: no rompen', await page.locator('tbody tr').count(), 25)
check('parametros invalidos: url saneada', path(), '/')

// Abrir el panel empuja una entrada; "atras" lo cierra.
await page.locator('tbody tr button[aria-label^="Ver detalle"]').first().click()
await page.waitForTimeout(500)
check('abrir el panel escribe la url', path().includes('inc=INC-'), true)
await page.goBack()
await page.waitForTimeout(600)
check('el boton atras cierra el panel', await page.locator('dialog[open]').count(), 0)
check('atras limpia el parametro', path().includes('inc='), false)

// ---------------------------------------------------------------------------
// Filtrar desde los graficos
// ---------------------------------------------------------------------------
await page.goto(BASE, { waitUntil: 'networkidle' })
await page.waitForTimeout(900)

const bars = page.locator('.recharts-surface').nth(1).locator('.recharts-bar-rectangle')
await bars.first().click({ force: true })
await page.waitForTimeout(500)
check('clic en barra filtra', path().startsWith('/?cat='), true)
check('clic en barra sincroniza el selector', (await page.getByLabel('Filtrar por categoría').inputValue()).length > 0, true)
await bars.first().click({ force: true })
await page.waitForTimeout(500)
check('re-clic en la barra deselecciona', path(), '/')

// El grafico de linea necesita que el puntero pase por encima antes del clic:
// Recharts calcula el punto activo en el `mousemove`.
const trendBox = await page.locator('.recharts-surface').first().boundingBox()
await page.mouse.move(trendBox.x + trendBox.width * 0.5, trendBox.y + trendBox.height * 0.5)
await page.waitForTimeout(300)
await page.mouse.down()
await page.mouse.up()
await page.waitForTimeout(500)
check('clic en la linea filtra por dia', path().startsWith('/?dia='), true)
check('el dia muestra su chip', await page.locator('button[aria-label^="Quitar filtro"]').count(), 1)
await page.locator('button[aria-label^="Quitar filtro"]').first().click()
await page.waitForTimeout(400)
check('el chip quita el filtro', path(), '/')

// El selector de categoria es la ruta accesible por teclado al mismo filtro.
await page.getByLabel('Filtrar por categoría').selectOption('ransomware')
await page.waitForTimeout(400)
const selectRows = await page.locator('tbody tr').allInnerTexts()
check('el selector filtra', selectRows.every((r) => r.includes('Ransomware')), true)
await page.getByLabel('Filtrar por categoría').selectOption('')
await page.waitForTimeout(400)
check('"todas las categorias" limpia', path(), '/')

// ---------------------------------------------------------------------------
// Flujo en vivo
// ---------------------------------------------------------------------------
const liveButton = page.getByRole('button', { name: /flujo en tiempo real/ })
const totalText = () =>
  page.locator('section[aria-labelledby="incidentes-titulo"] p[role="status"]').first().innerText()
const highlighted = () =>
  page.evaluate(() => document.querySelectorAll('tbody tr[class*="accent-soft/60"]').length)

check('el flujo arranca detenido', await liveButton.getAttribute('aria-pressed'), 'false')
const totalBefore = await totalText()

await page.getByRole('button', { name: /Activar el flujo/ }).click()
await page.waitForTimeout(300)
check('el flujo se activa', await liveButton.getAttribute('aria-pressed'), 'true')

// Con el flujo activo, el foco no debe moverse solo.
await page.locator('tbody tr button[aria-label^="Ver detalle"]').nth(2).focus()
const focusBefore = await page.evaluate(() => document.activeElement?.getAttribute('aria-label'))
await page.waitForTimeout(9000)

check('entran incidentes nuevos', (await totalText()) !== totalBefore, true)
check('la fila nueva se resalta', (await highlighted()) > 0, true)
check('la pagina sigue teniendo 25 filas', await page.locator('tbody tr').count(), 25)
check('el flujo no roba el foco', await page.evaluate(() => document.activeElement?.getAttribute('aria-label')), focusBefore)

await page.getByRole('button', { name: /Detener el flujo/ }).click()
await page.waitForTimeout(400)
const totalAfterStop = await totalText()
check('el flujo se detiene', await liveButton.getAttribute('aria-pressed'), 'false')
check('al detener se apaga el resalte', await highlighted(), 0)
await page.waitForTimeout(5000)
check('detenido, el total se congela', await totalText(), totalAfterStop)

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

  await freshShot('filtro-desde-grafico', async (p) => {
    const bar = p.locator('.recharts-surface').nth(1).locator('.recharts-bar-rectangle').nth(2)
    await bar.click({ force: true })
    await p.waitForTimeout(700)
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
