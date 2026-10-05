/**
 * Verificación de la interfaz sobre un navegador real.
 *
 * Comprueba lo que ni el compilador ni el linter pueden ver: que las rutas
 * naveguen y el botón "atrás" deshaga, que un enlace viejo siga llegando a la
 * tabla filtrada, que el foco se atrape en un diálogo y vuelva a su origen,
 * que mover una tarjeta del tablero cambie los indicadores, que el acento
 * sobreviva a una recarga, que la consola se pinte clara pase lo que pase, que
 * el contraste alcance AA con los colores ya resueltos y que el flujo en vivo
 * no le robe el foco a nadie.
 *
 * Uso (con el servidor de desarrollo levantado):
 *   npm run verify              -> sólo las comprobaciones
 *   npm run verify -- --shots   -> además regenera las capturas de docs/
 *   BASE_URL=https://… npm run verify   -> contra cualquier despliegue
 */

import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = (process.env.BASE_URL ?? 'http://localhost:5173').replace(/\/$/, '')
const OUT = 'docs'
const WITH_SHOTS = process.argv.includes('--shots')
if (WITH_SHOTS) mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch()
const results = []

function check(name, actual, expected = true) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  results.push(
    `${ok ? 'OK  ' : 'FAIL'} ${name} -> ${JSON.stringify(actual)}${ok ? '' : ` (esperado ${JSON.stringify(expected)})`}`,
  )
}

const errors = []
function watch(page) {
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  page.on('pageerror', (error) => errors.push(String(error)))
}

async function open(page, path) {
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' })
  await page.waitForSelector('h1')
  // Deja terminar la entrada escalonada antes de medir o capturar.
  await page.waitForTimeout(900)
}

const location = (page) => page.evaluate(() => window.location.pathname + window.location.search)
const heading = (page) => page.locator('h1').innerText()
const navLink = (page, name) =>
  page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: new RegExp(`^${name}`) })
const rows = (page) => page.locator('main tbody tr')
/** El contador de casos sin resolver junto a "Incidentes", en la barra lateral. */
const unresolvedBadge = async (page) =>
  Number.parseInt(await navLink(page, 'Incidentes').locator('span.tabular').innerText(), 10)
const noOverflow = (page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)

// ===========================================================================
// Escritorio
// ===========================================================================
const desktop = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
  permissions: ['clipboard-read', 'clipboard-write'],
})
const page = await desktop.newPage()
watch(page)

// ---------- Arranque ----------
await open(page, '/')
check('titulo de la pestana', await page.title(), 'Panel · Centinela')
check('un solo h1', await page.locator('h1').count(), 1)
check('h1 del panel', await heading(page), 'Panel')
check('el panel se pinta claro', await page.evaluate(() => getComputedStyle(document.querySelector('main')).backgroundColor), 'rgb(243, 245, 242)')
check('siete vistas en la navegacion', await page.getByRole('navigation', { name: 'Principal' }).getByRole('link').count(), 7)
check('aria-current en Panel', await navLink(page, 'Panel').getAttribute('aria-current'), 'page')
check('cuatro indicadores con variacion', await page.evaluate(() => {
  const cards = [...document.querySelectorAll('main section[aria-labelledby="indicadores-titulo"] article')]
  return cards.length === 4 && cards.every((card) => /(\+|−|sin cambios)/.test(card.textContent ?? ''))
}))
check('carga de la semana: 4 dias reales y 3 proyectados', await page.evaluate(() => {
  const list = document.querySelector('section[aria-labelledby="carga-titulo"] ol')
  return [list?.querySelectorAll('button').length, list?.querySelectorAll('[role="img"]').length]
}), [4, 3])
check('medidor de plazos con nombre accesible', await page.locator('section[aria-labelledby="sla-titulo"] svg[role="img"]').getAttribute('aria-label').then((label) => /dentro de plazo/.test(label ?? '')))
check('el documento no desborda (panel)', await noOverflow(page))
check('enlace de salto es lo primero tabulable', await page.evaluate(() => {
  const first = document.querySelector('a, button, input, select, [tabindex]')
  return first?.textContent?.trim()
}), 'Saltar al contenido')

// ---------- Rutas ----------
await navLink(page, 'Incidentes').click()
await page.waitForSelector('main tbody tr')
check('clic en el menu cambia la ruta', await location(page), '/incidentes')
check('el titulo de la pestana sigue a la vista', await page.title(), 'Incidentes · Centinela')
check('el foco va al h1 nuevo', await page.evaluate(() => document.activeElement?.tagName), 'H1')
check('aria-current se mueve', await navLink(page, 'Incidentes').getAttribute('aria-current'), 'page')
await page.goBack()
await page.waitForTimeout(300)
check('atras vuelve al panel', [await location(page), await heading(page)], ['/', 'Panel'])
await page.goForward()
await page.waitForTimeout(300)
check('adelante vuelve a incidentes', await heading(page), 'Incidentes')

await open(page, '/?sev=critical')
check('enlace heredado redirige a la tabla', await location(page), '/incidentes?sev=critical')
check('enlace heredado filtra', (await rows(page).allInnerTexts()).every((row) => row.includes('Crítica')))

await open(page, '/no-existe')
check('ruta desconocida cae al panel', await heading(page), 'Panel')

await page.keyboard.press('g')
await page.keyboard.press('t')
await page.waitForTimeout(300)
check('atajo g t va al tablero', await location(page), '/tablero')

// ---------- Del panel a la tabla ----------
await open(page, '/')
const criticalOnPanel = Number.parseInt(
  await page.locator('article', { hasText: 'Críticos sin resolver' }).locator('p.tabular').first().innerText(),
  10,
)
await page.getByRole('button', { name: 'Ver los incidentes críticos sin resolver', exact: true }).click()
await page.waitForTimeout(400)
check('indicador lleva a la tabla con su recorte', await location(page), '/incidentes?sev=critical&estado=open%2Cinvestigating%2Ccontained')
check('el recorte coincide con el indicador', await rows(page).count(), criticalOnPanel)
check('el atajo "Criticos" queda marcado', await page.getByRole('button', { name: 'Críticos', exact: true }).getAttribute('aria-pressed'), 'true')

await navLink(page, 'Tablero').click()
await page.waitForTimeout(300)
check('fuera de la tabla la URL no arrastra filtros', await location(page), '/tablero')
await navLink(page, 'Incidentes').click()
await page.waitForTimeout(300)
check('al volver, los filtros se reponen en la URL', await location(page), '/incidentes?sev=critical&estado=open%2Cinvestigating%2Ccontained')
await page.reload({ waitUntil: 'networkidle' })
await page.waitForSelector('h1')
check('recargar conserva el recorte', await rows(page).count(), criticalOnPanel)

await page.getByRole('button', { name: 'Copiar enlace', exact: true }).click()
await page.waitForTimeout(200)
check('copiar enlace copia la URL', await page.evaluate(() => navigator.clipboard.readText()), `${BASE}/incidentes?sev=critical&estado=open%2Cinvestigating%2Ccontained`)

// ---------- Tabla ----------
await open(page, '/incidentes')
check('filas por pagina', await rows(page).count(), 25)
const total = await page.locator('main [role="status"]').first().innerText()
check('recuento total visible', /^\d+ incidentes en total$/.test(total.replace(/\s+/g, ' ')))
check('la tabla cabe en su tarjeta', await page.evaluate(() => {
  const scroller = document.querySelector('main table')?.parentElement
  return scroller !== null && scroller !== undefined && scroller.scrollWidth <= scroller.clientWidth
}))

const severityHeader = page.locator('th', { hasText: 'Severidad' })
check('aria-sort inicial', await severityHeader.getAttribute('aria-sort'), 'none')
await severityHeader.getByRole('button').click()
await page.waitForTimeout(200)
check('aria-sort tras un clic', await severityHeader.getAttribute('aria-sort'), 'descending')
check('primera fila critica', (await rows(page).first().innerText()).includes('Crítica'))
await severityHeader.getByRole('button').click()
await page.waitForTimeout(200)
check('primera fila baja', (await rows(page).first().innerText()).includes('Baja'))
check('el orden viaja en la URL', await location(page), '/incidentes?orden=severity%3Aasc')

await open(page, '/incidentes')
await page.keyboard.press('/')
check('la barra enfoca la busqueda', await page.evaluate(() => document.activeElement?.getAttribute('type')), 'search')
await page.keyboard.type('ingenieria social')
await page.waitForTimeout(300)
check('busqueda sin acentos encuentra', (await rows(page).count()) > 0)
await page.getByRole('searchbox', { name: 'Buscar incidentes' }).fill('zzzznoexiste')
await page.waitForTimeout(300)
check('estado vacio con salida', await page.getByText('Ningún incidente coincide').isVisible())
await page.getByRole('button', { name: 'Limpiar filtros', exact: true }).click()
await page.waitForTimeout(200)
check('limpiar filtros restaura', await rows(page).count(), 25)

await page.getByRole('button', { name: 'Página siguiente', exact: true }).click()
await page.waitForTimeout(200)
check('paginacion', [await page.locator('nav[aria-label="Paginación de incidentes"] [role="status"]').innerText().then((text) => text.startsWith('Página 2')), await location(page)], [true, '/incidentes?p=2'])

await open(page, '/incidentes')
const firstRowButton = rows(page).first().getByRole('button')
await firstRowButton.focus()
await page.keyboard.press('ArrowDown')
check('flecha abajo recorre las filas', await page.evaluate(() => {
  const buttons = [...document.querySelectorAll('main tbody tr button')]
  return buttons.indexOf(document.activeElement)
}), 1)

// ---------- Panel de detalle ----------
await firstRowButton.focus()
const firstId = (await rows(page).first().locator('td').first().innerText()).trim()
await page.keyboard.press('Enter')
await page.waitForSelector('dialog[open]')
check('enter abre el detalle', await location(page), `/incidentes?inc=${firstId}`)
check('el foco entra al dialogo', await page.evaluate(() => document.activeElement?.closest('dialog') !== null))
for (let i = 0; i < 40; i += 1) await page.keyboard.press('Tab')
check('el foco no escapa del dialogo', await page.evaluate(() => document.activeElement?.closest('dialog') !== null))
await page.keyboard.press('ArrowRight')
await page.waitForTimeout(200)
const secondId = (await rows(page).nth(1).locator('td').first().innerText()).trim()
check('flecha derecha pasa al siguiente', await location(page), `/incidentes?inc=${secondId}`)
await page.keyboard.press('Escape')
await page.waitForTimeout(300)
check('escape cierra y limpia la URL', await location(page), '/incidentes')
check('el foco vuelve a la fila', await page.evaluate(() => document.activeElement?.closest('tbody') !== null))

await firstRowButton.click()
await page.waitForSelector('dialog[open]')
await page.goBack()
await page.waitForTimeout(300)
check('atras cierra el panel sin salir de la vista', [await page.locator('dialog[open]').count(), await location(page)], [0, '/incidentes'])

await open(page, `/tablero?inc=${firstId}`)
check('enlace directo abre el detalle sobre cualquier vista', [await page.locator('dialog[open]').count(), await heading(page)], [1, 'Tablero'])
await page.getByRole('button', { name: 'Cerrar el detalle del incidente', exact: true }).click()
await page.waitForTimeout(300)
check('cerrar un enlace directo no saca del sitio', await location(page), '/tablero')

// ---------- Detalle: cambiar estado y deshacer ----------
await open(page, '/incidentes?estado=open')
const before = await unresolvedBadge(page)
await rows(page).first().getByRole('button').click()
await page.waitForSelector('dialog[open]')
const timelineBefore = await page.locator('dialog[open] ol li').count()
await page.locator('dialog[open]').getByRole('button', { name: 'Resuelto', exact: true }).click()
await page.waitForTimeout(300)
check('resolver baja el contador de abiertos', await unresolvedBadge(page), before - 1)
check('resolver firma la bitacora', await page.locator('dialog[open] ol li').count(), timelineBefore + 1)
check('el aviso se monta dentro del dialogo', await page.locator('dialog[open] [role="status"][aria-label="Avisos"]').count(), 1)
await page.locator('dialog[open]').getByRole('button', { name: 'Deshacer', exact: true }).click()
await page.waitForTimeout(300)
check('deshacer devuelve el contador', await unresolvedBadge(page), before)
check('deshacer devuelve la bitacora', await page.locator('dialog[open] ol li').count(), timelineBefore)
await page.locator('dialog[open] select').selectOption({ index: 3 })
await page.waitForTimeout(200)
check('reasignar firma la bitacora', await page.locator('dialog[open] ol li').count(), timelineBefore + 1)
await page.keyboard.press('Escape')
await page.waitForTimeout(300)

// ---------- Nuevo incidente ----------
await open(page, '/incidentes')
const totalBefore = Number.parseInt(await page.locator('main [role="status"]').first().innerText(), 10)
const badgeBefore = await unresolvedBadge(page)
await page.keyboard.press('n')
await page.waitForSelector('dialog[open]')
check('n abre el formulario con el foco en el titulo', await page.evaluate(() => document.activeElement?.tagName), 'INPUT')
await page.getByRole('button', { name: 'Registrar incidente', exact: true }).click()
await page.waitForTimeout(200)
check('el titulo es obligatorio', await page.locator('dialog[open]').count(), 1)
await page.keyboard.type('Prueba de verificacion')
await page.locator('dialog[open]').getByText('Crítica', { exact: true }).click()
await page.getByRole('button', { name: 'Registrar incidente', exact: true }).click()
await page.waitForTimeout(400)
check('registrar cierra el formulario', await page.locator('dialog[open]').count(), 0)
check('el incidente nuevo encabeza la tabla', (await rows(page).first().innerText()).includes('Prueba de verificacion'))
check('el total sube en uno', Number.parseInt(await page.locator('main [role="status"]').first().innerText(), 10), totalBefore + 1)
check('el contador de abiertos sube en uno', await unresolvedBadge(page), badgeBefore + 1)

// ---------- Tablero ----------
await open(page, '/tablero')
const column = (status) => page.locator(`section[aria-labelledby="columna-${status}"]`)
const countIn = (status) => column(status).locator('li[data-flip]').count()
check('cuatro columnas', await page.locator('main section[aria-labelledby^="columna-"]').count(), 4)
const openBefore = await countIn('open')
const containedBefore = await countIn('contained')
const movedId = await column('open').locator('li[data-flip]').first().getAttribute('data-flip')
await column('open').getByRole('button', { name: `Acciones de ${movedId}`, exact: true }).click()
check('el menu abre con el foco en la primera opcion', await page.evaluate(() => document.activeElement?.getAttribute('role')), 'menuitem')
await page.getByRole('menuitem', { name: 'Contenido', exact: true }).click()
await page.waitForTimeout(600)
check('el menu mueve la tarjeta', [await countIn('open'), await countIn('contained')], [openBefore - 1, containedBefore + 1])
check('la tarjeta esta en su columna nueva', await column('contained').locator(`li[data-flip="${movedId}"]`).count(), 1)

const investigatingBefore = await countIn('investigating')
const dragged = column('investigating').locator('li[data-flip]').first()
const draggedId = await dragged.getAttribute('data-flip')
await dragged.locator('article').dragTo(column('open').locator('header'))
await page.waitForTimeout(600)
check('arrastrar mueve la tarjeta', [await countIn('investigating'), await column('open').locator(`li[data-flip="${draggedId}"]`).count()], [investigatingBefore - 1, 1])

const allCards = await page.locator('main li[data-flip]').count()
await page.getByRole('button', { name: 'Críticas y altas', exact: true }).click()
await page.waitForTimeout(500)
check('el filtro del tablero recorta', (await page.locator('main li[data-flip]').count()) < allCards)

// ---------- Calendario ----------
await open(page, '/calendario')
check('rejilla con siete columnas', await page.locator('main thead th').count(), 7)
check('la semana empieza en lunes', await page.locator('main thead th').first().innerText().then((text) => text.toLowerCase()), 'lun')
check('hoy esta seleccionado', await page.locator('main tbody button[aria-pressed="true"]').count(), 1)
const month = await page.locator('#mes-titulo').innerText()
await page.getByRole('button', { name: 'Mes siguiente', exact: true }).click()
await page.waitForTimeout(200)
check('mes siguiente cambia el titulo', (await page.locator('#mes-titulo').innerText()) !== month)
await page.getByRole('button', { name: 'Hoy', exact: true }).click()
await page.waitForTimeout(200)
check('hoy vuelve al mes actual', await page.locator('#mes-titulo').innerText(), month)

// ---------- Analitica ----------
await open(page, '/analitica')
check('cuatro indicadores del periodo', await page.locator('section[aria-labelledby="kpis-titulo"] article').count(), 4)
check('tabla alternativa del grafico: 30 dias', await page.locator('section[aria-labelledby="detecciones-titulo"] table tbody tr').count(), 30)
await page.getByRole('button', { name: '7 días', exact: true }).click()
await page.waitForTimeout(400)
check('cambiar el periodo recalcula: 7 dias', await page.locator('section[aria-labelledby="detecciones-titulo"] table tbody tr').count(), 7)
check('mapa de calor: 7 x 24 celdas', await page.locator('section[aria-labelledby="calor-titulo"] [role="img"] span[title]').count(), 168)
await page.locator('section[aria-labelledby="detecciones-titulo"] [role="group"][tabindex="0"]').focus()
await page.keyboard.press('ArrowLeft')
await page.keyboard.press('ArrowLeft')
await page.waitForTimeout(150)
check('las flechas recorren el grafico y lo anuncian', await page.locator('section[aria-labelledby="detecciones-titulo"] [aria-live]').innerText().then((text) => /en este período/.test(text)))

// ---------- Equipo ----------
await open(page, '/equipo')
check('ocho analistas', await page.locator('main li[data-flip]').count(), 8)
await page.getByRole('button', { name: 'Forense', exact: true }).click()
await page.waitForTimeout(500)
check('filtro por celula', await page.locator('main li[data-flip]').count(), 2)
await page.getByRole('button', { name: 'Perfil', exact: true }).first().click()
await page.waitForSelector('dialog[open]')
check('el perfil abre con el nombre', await page.locator('dialog[open] h2').innerText(), 'Valentina Soto')
await page.keyboard.press('Escape')
await page.waitForTimeout(300)
await page.getByRole('button', { name: 'Ver casos', exact: true }).first().click()
await page.waitForTimeout(400)
check('ver casos lleva a la tabla filtrada', await location(page), '/incidentes?estado=open%2Cinvestigating%2Ccontained&resp=Valentina+Soto')

// ---------- Paleta de comandos ----------
await open(page, '/')
await page.keyboard.press('Control+k')
await page.waitForSelector('dialog[open]')
check('ctrl+k abre la paleta con el foco en el campo', await page.evaluate(() => document.activeElement?.getAttribute('role')), 'combobox')
check('la opcion activa se anuncia', await page.evaluate(() => {
  const input = document.activeElement
  const id = input?.getAttribute('aria-activedescendant')
  return id !== null && document.getElementById(id ?? '')?.getAttribute('aria-selected')
}), 'true')
await page.keyboard.type('calend')
await page.keyboard.press('Enter')
await page.waitForTimeout(400)
check('la paleta navega', [await location(page), await page.locator('dialog[open]').count()], ['/calendario', 0])
await page.keyboard.press('Control+k')
await page.keyboard.type(firstId)
await page.waitForTimeout(200)
await page.keyboard.press('Enter')
await page.waitForSelector('dialog[open] h2')
check('la paleta abre un incidente por su ID', await location(page), `/calendario?inc=${firstId}`)
await page.keyboard.press('Control+k')
await page.waitForTimeout(200)
check('ctrl+k no abre la paleta sobre otro dialogo', await page.locator('dialog[open]').count(), 1)
await page.keyboard.press('Escape')
await page.waitForTimeout(300)

// ---------- Ajustes ----------
await open(page, '/ajustes')
check('pestanas con rol', await page.getByRole('tab').count(), 4)
await page.getByRole('tab', { name: 'Perfil', exact: true }).focus()
await page.keyboard.press('ArrowDown')
await page.keyboard.press('ArrowDown')
check('las flechas cambian de pestana', await page.getByRole('tab', { name: 'Apariencia', exact: true }).getAttribute('aria-selected'), 'true')
check('no hay selector de tema en los ajustes', await page.getByRole('button', { name: /^(Claro|Oscuro)$/ }).count(), 0)
await page.getByRole('button', { name: 'Océano', exact: true }).click()
await page.getByRole('button', { name: 'Domingo', exact: true }).click()
await page.waitForTimeout(200)
const accentColor = () => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--brand-800').trim())
check('el acento se aplica', [await page.evaluate(() => document.documentElement.dataset.accent), await accentColor()], ['ocean', '#173f86'])
await page.reload({ waitUntil: 'networkidle' })
await page.waitForSelector('h1')
check('el acento sobrevive a recargar', [await page.evaluate(() => document.documentElement.dataset.accent), await accentColor()], ['ocean', '#173f86'])
await open(page, '/calendario')
check('la semana empieza en domingo', await page.locator('main thead th').first().innerText().then((text) => text.toLowerCase()), 'dom')
await open(page, '/ajustes')
await page.getByRole('tab', { name: 'Datos', exact: true }).click()
await page.getByRole('button', { name: 'Restablecer preferencias', exact: true }).click()
await page.waitForTimeout(200)
check('restablecer vuelve al acento por defecto', [await page.evaluate(() => document.documentElement.dataset.accent ?? null), await accentColor()], [null, '#135631'])

// ---------- Flujo en vivo ----------
await open(page, '/')
const liveBadge = await unresolvedBadge(page)
const play = page.getByRole('button', { name: 'Iniciar el flujo en vivo', exact: true })
await play.click()
check('el interruptor del flujo queda pulsado', await page.getByRole('button', { name: 'Pausar el flujo en vivo', exact: true }).getAttribute('aria-pressed'), 'true')
// Se lee sólo la región viva, no la tarjeta entera: el cronómetro va justo
// antes en el DOM, y "00:00:05" pegado a "0 incidentes" se leería como 50.
await page.waitForFunction(
  () => /^[1-9]/.test(document.querySelector('section[aria-labelledby="flujo-en-vivo"] [aria-live]')?.textContent ?? ''),
  undefined,
  { timeout: 20_000 },
)
check('el flujo trae incidentes', /[1-9]/.test(await page.locator('section[aria-labelledby="flujo-en-vivo"] [aria-live]').innerText()))
check('el cronometro avanza', (await page.locator('[role="timer"]').innerText()) !== '00:00:00')
check('el flujo no roba el foco', await page.evaluate(() => document.activeElement?.getAttribute('aria-label')), 'Pausar el flujo en vivo')
await page.getByRole('button', { name: 'Pausar el flujo en vivo', exact: true }).click()
await page.getByRole('button', { name: 'Detener el flujo y reiniciar el cronómetro', exact: true }).click()
check('detener pone el cronometro a cero', await page.locator('[role="timer"]').innerText(), '00:00:00')
check('lo recibido se queda', (await unresolvedBadge(page)) >= liveBadge)

check('sin errores de consola en escritorio', errors, [])
await desktop.close()

// ===========================================================================
// Siempre claro
// ===========================================================================
// La consola tiene un solo tema. Se comprueba contra todo lo que alguna vez
// pudo oscurecerla, a la vez: el sistema en modo oscuro, la clave de tema de
// la primera version, un `theme: 'dark'` guardado por la version intermedia
// que si tenia selector, y la clase `dark` puesta a mano en <html>.
//
// No se mira una clase ni un atributo: se mide lo que de verdad se pinta. Que
// <html> no lleve `.dark` no demuestra nada si algo mas tine la pagina.
const paintedLight = (target) =>
  target.evaluate(() => {
    // Luminancia aproximada de un `rgb(...)` ya resuelto: 0 negro, 1 blanco.
    const lightness = (element) => {
      const [r, g, b] = getComputedStyle(element).backgroundColor.match(/[\d.]+/g).map(Number)
      return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
    }
    const ink = getComputedStyle(document.querySelector('h1')).color.match(/[\d.]+/g).map(Number)
    const scheme = getComputedStyle(document.documentElement).colorScheme
    return {
      panelClaro: lightness(document.querySelector('main')) > 0.85,
      tarjetaClara: lightness(document.querySelector('section[aria-labelledby="carga-titulo"]')) > 0.85,
      textoOscuro: Math.max(...ink.slice(0, 3)) < 60,
      soloClaro: scheme.includes('light') && scheme.includes('only') && !scheme.includes('dark'),
    }
  })
const ALL_LIGHT = { panelClaro: true, tarjetaClara: true, textoOscuro: true, soloClaro: true }

const darkSystem = await browser.newContext({ viewport: { width: 1280, height: 800 }, colorScheme: 'dark' })
const visitor = await darkSystem.newPage()
watch(visitor)
await visitor.addInitScript(() => {
  localStorage.setItem('centinela:theme', 'dark')
  localStorage.setItem('centinela:settings', JSON.stringify({ theme: 'dark', accent: 'forest' }))
})
await open(visitor, '/')
check('claro con el sistema en oscuro y un tema oscuro guardado', await paintedLight(visitor), ALL_LIGHT)
check('la clave de tema antigua se borra', await visitor.evaluate(() => localStorage.getItem('centinela:theme')), null)
await visitor.evaluate(() => document.documentElement.classList.add('dark'))
check('claro aunque <html> lleve la clase dark', await paintedLight(visitor), ALL_LIGHT)
check('no hay boton de cambio de tema', await visitor.getByRole('button', { name: /tema (claro|oscuro)/i }).count(), 0)
await visitor.keyboard.press('Control+k')
await visitor.keyboard.type('tema')
await visitor.waitForTimeout(200)
check('la paleta no ofrece cambiar de tema', await visitor.getByRole('option', { name: /tema (claro|oscuro)/i }).count(), 0)
await visitor.keyboard.press('Escape')
await darkSystem.close()

// ===========================================================================
// Contraste
// ===========================================================================
// El gris "parece" bien hasta que se mide. Se mide en el navegador, con los
// colores ya resueltos —varios salen de `color-mix`—, pintando cada uno en un
// canvas de un pixel: la alternativa era reimplementar la conversion a sRGB a
// mano y equivocarse en ella.
const TEXT_ON_SURFACES = ['--text-primary', '--text-secondary', '--text-muted'].flatMap((text) =>
  ['--surface-card', '--surface-panel', '--surface-sunken', '--surface-hover', '--surface-overlay'].map((surface) => [text, surface]),
)
const PAIRS = [
  ...TEXT_ON_SURFACES,
  ['--accent-contrast', '--accent'],
  ['--accent-text', '--surface-card'],
  ['--accent-text', '--accent-soft'],
  ['--severity-critical', '--severity-critical-bg'],
  ['--severity-high', '--severity-high-bg'],
  ['--severity-medium', '--severity-medium-bg'],
  ['--severity-low', '--severity-low-bg'],
  ['--status-open', '--surface-card'],
  ['--status-investigating', '--surface-card'],
  ['--status-contained', '--surface-card'],
  ['--status-resolved', '--surface-card'],
  ['--status-resolved', '--surface-sunken'],
  ['--severity-critical', '--surface-card'],
  ['--severity-high', '--surface-card'],
]

async function contrastReport(accent) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const probe = await context.newPage()
  await probe.addInitScript((accent) => {
    localStorage.setItem('centinela:settings', JSON.stringify({ accent }))
  }, accent)
  await open(probe, '/')

  const report = await probe.evaluate((pairs) => {
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    const surface = canvas.getContext('2d', { willReadFrequently: true })
    const sample = document.createElement('span')
    document.body.append(sample)

    const rgb = (token) => {
      sample.style.color = `var(${token})`
      surface.clearRect(0, 0, 1, 1)
      surface.fillStyle = getComputedStyle(sample).color
      surface.fillRect(0, 0, 1, 1)
      const [r, g, b] = surface.getImageData(0, 0, 1, 1).data
      return [r, g, b]
    }
    const luminance = ([r, g, b]) =>
      [r, g, b]
        .map((value) => value / 255)
        .map((value) => (value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4))
        .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0)

    return pairs.map(([foreground, background]) => {
      const [hi, lo] = [luminance(rgb(foreground)), luminance(rgb(background))].sort((a, b) => b - a)
      return { pair: `${foreground} sobre ${background}`, ratio: Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100 }
    })
  }, PAIRS)

  await context.close()
  return report
}

for (const accent of ['forest', 'ocean', 'plum', 'ember']) {
  const report = await contrastReport(accent)
  const failing = report.filter((entry) => entry.ratio < 4.5)
  const worst = report.reduce((a, b) => (a.ratio <= b.ratio ? a : b))
  check(`contraste AA · ${accent} (peor: ${worst.pair} = ${worst.ratio})`, failing.map((entry) => `${entry.pair} = ${entry.ratio}`), [])
}

// ===========================================================================
// Movimiento reducido
// ===========================================================================
const calm = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' })
const still = await calm.newPage()
watch(still)
await still.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
await still.waitForSelector('main article p.tabular')
const immediate = await still.locator('main article p.tabular').first().innerText()
await still.waitForTimeout(1200)
check('con movimiento reducido el contador no anima', immediate, await still.locator('main article p.tabular').first().innerText())
check('con movimiento reducido nada queda a medio entrar', await still.evaluate(() =>
  [...document.querySelectorAll('.rise')].every((node) => getComputedStyle(node).opacity === '1'),
))
await calm.close()

// ===========================================================================
// Movil
// ===========================================================================
const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true })
const phone = await mobile.newPage()
watch(phone)

for (const path of ['/', '/incidentes', '/tablero', '/calendario', '/analitica', '/equipo', '/ajustes']) {
  await open(phone, path)
  check(`movil: ${path} no desborda`, await noOverflow(phone))
}

await open(phone, '/incidentes')
check('movil: lista en vez de tabla', [await phone.locator('main table').count(), (await phone.locator('main ul li button[aria-label^="Ver detalle"]').count()) > 0], [0, true])
await phone.getByRole('button', { name: 'Abrir la navegación', exact: true }).click()
await phone.waitForSelector('dialog[open]')
check('movil: el cajon trae la misma navegacion', await phone.locator('dialog[open] nav a').count(), 7)
await phone.locator('dialog[open]').getByRole('link', { name: 'Equipo' }).click()
await phone.waitForTimeout(400)
check('movil: el cajon navega y se cierra', [await location(phone), await phone.locator('dialog[open]').count()], ['/equipo', 0])

await open(phone, '/tablero')
const phoneCard = phone.locator('main li[data-flip]').first()
const phoneCardId = await phoneCard.getAttribute('data-flip')
await phoneCard.getByRole('button', { name: `Acciones de ${phoneCardId}`, exact: true }).click()
check('movil: el tablero se mueve con el menu, sin arrastrar', await phone.getByRole('menuitem').count(), 4)
await phone.keyboard.press('Escape')
check('sin errores de consola en movil', errors, [])

// ===========================================================================
// Capturas del README (solo con --shots)
// ===========================================================================
if (WITH_SHOTS) {
  const shots = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 })
  const shot = await shots.newPage()
  const capture = async (name) => shot.screenshot({ path: `${OUT}/${name}.png` })
  const settings = (value) => shot.evaluate((value) => localStorage.setItem('centinela:settings', JSON.stringify(value)), value)

  await open(shot, '/')
  await capture('panel-claro')

  await open(shot, '/incidentes?sev=critical,high&estado=open,investigating,contained')
  await capture('incidentes')
  await rows(shot).first().getByRole('button').click()
  await shot.waitForTimeout(700)
  await capture('detalle')
  await shot.keyboard.press('Escape')

  await open(shot, '/tablero')
  await capture('tablero')

  await open(shot, '/calendario')
  await capture('calendario')

  await open(shot, '/analitica')
  await capture('analitica')

  await open(shot, '/equipo')
  await capture('equipo')

  await open(shot, '/')
  await shot.keyboard.press('Control+k')
  await shot.keyboard.type('ransom')
  await shot.waitForTimeout(600)
  await capture('paleta')
  await shot.keyboard.press('Escape')

  await settings({ accent: 'ocean' })
  await open(shot, '/analitica')
  await capture('acento-oceano')
  await shots.close()

  await open(phone, '/')
  await phone.screenshot({ path: `${OUT}/movil.png` })
  await open(phone, '/tablero')
  await phone.screenshot({ path: `${OUT}/movil-tablero.png` })
}

await mobile.close()
await browser.close()

console.log(results.join('\n'))
const failed = results.filter((result) => result.startsWith('FAIL')).length
console.log(`\n${results.length - failed}/${results.length} comprobaciones OK`)
process.exit(failed > 0 ? 1 : 0)
