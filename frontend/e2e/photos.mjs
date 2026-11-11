import test, { before, after } from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { mkdir } from 'node:fs/promises'
import { chromium, expect } from '@playwright/test'

const base = 'http://127.0.0.1:4178'
let server, browser
before(async () => {
  server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4178', '--strictPort'], { stdio: ['ignore', 'pipe', 'pipe'] })
  let ready = false
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try { if ((await fetch(base)).ok) { ready = true; break } } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  assert.ok(ready, 'Built frontend preview must start')
  browser = await chromium.launch({ headless: true })
  await mkdir('../docs/screenshots', { recursive: true })
})
after(async () => {
  await browser?.close()
  if (server && server.exitCode === null) { const exited = once(server, 'exit'); server.kill('SIGTERM'); await exited }
})

function fixtures(broken = false) {
  return ['rental-bedroom', 'studio-open-plan', 'shared-kitchen'].map((slug, index) => ({
    id: index + 1,
    title: `Chỗ ở minh họa ${index + 1} — dữ liệu hư cấu`,
    room_type: ['RENTAL_ROOM', 'STUDIO', 'SHARED_ROOM'][index],
    price: 2800000 + index * 600000,
    area: 20 + index * 4,
    district: 'Khu vực minh họa', city: 'Hà Nội',
    status: 'AVAILABLE', bathroom_type: 'PRIVATE', max_occupants: 2,
    is_verified: false, is_featured: false, amenities: ['Wi-Fi', 'Bếp'],
    images: [{ id: index + 1, image_url: broken ? '/missing-owner-photo.jpg' : `/images/housing/${slug}-960.webp`, is_primary: true }],
  }))
}

async function pageFor(viewport, broken = false) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 })
  const page = await context.newPage()
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url())
    if (url.origin !== base) return route.abort()
    if (url.pathname.startsWith('/api/')) {
      const rooms = fixtures(broken)
      const data = url.pathname.endsWith('/rooms/featured') ? rooms : { items: rooms, total: rooms.length }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data, message: 'Fictional browser-test fixture' }) })
    }
    if (url.pathname === '/missing-owner-photo.jpg') return route.fulfill({ status: 404, body: '' })
    return route.continue()
  })
  return { context, page }
}

for (const [name, viewport] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  test(`${name}: bundled photographs decode, fit the layout and link to their credits`, async () => {
    const { context, page } = await pageFor(viewport)
    const errors = []
    page.on('pageerror', (error) => errors.push(error.message))
    try {
      await page.goto(base)
      await expect(page.locator('img[data-housing-photo]')).toHaveCount(7)
      for (const image of await page.locator('img[data-housing-photo]').all()) {
        await image.scrollIntoViewIfNeeded()
        await expect(image).toHaveJSProperty('complete', true)
        const decoded = await image.evaluate((element) => ({ width: element.naturalWidth, src: element.currentSrc }))
        // naturalWidth is density-corrected when a width-descriptor srcset is used.
        assert.ok(decoded.width > 0, `Photograph must decode: ${JSON.stringify(decoded)}`)
        assert.ok(decoded.src.startsWith(`${base}/images/housing/`) && decoded.src.endsWith('.webp'), 'Photography must be bundled, without external image hotlinks')
        assert.ok(Number(decoded.src.match(/-(\d+)\.webp$/)?.[1]) >= 480, 'A responsive photograph must use a 480px-or-larger source file')
      }
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'No horizontal overflow')
      await page.evaluate(() => scrollTo(0, 0))
      await page.screenshot({ path: `../docs/screenshots/home-photos-${name}.png`, fullPage: true })
      await page.getByRole('link', { name: 'Ảnh chụp minh họa · Nguồn ảnh', exact: true }).click()
      await expect(page).toHaveURL(`${base}/photo-credits`)
      await expect(page.getByRole('link', { name: 'Nguồn ảnh đã lưu', exact: true })).toHaveCount(7)
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Credits remain readable on mobile')
      assert.deepEqual(errors, [])
    } catch (error) {
      await page.screenshot({ path: `../docs/screenshots/home-photos-${name}.png`, fullPage: true })
      throw error
    } finally { await context.close() }
  })
}

test('missing listing photos retain an explicit empty state instead of borrowing a stock photograph', async () => {
  const { context, page } = await pageFor({ width: 390, height: 844 }, true)
  try {
    await page.goto(base)
    const image = page.getByRole('img', { name: /Chỗ ở minh họa 1/ }).first()
    await image.scrollIntoViewIfNeeded()
    await expect(image).toHaveAttribute('alt', /chưa có hình ảnh/)
    await expect(image).toHaveJSProperty('complete', true)
    const decoded = await image.evaluate((element) => ({ width: element.naturalWidth, src: element.currentSrc }))
    assert.ok(decoded.width > 0)
    assert.ok(decoded.src.endsWith('/images/yangrent-placeholder.svg'))
  } finally { await context.close() }
})

test('home search sends the selected room type and monthly budget from a narrow screen', async () => {
  const { context, page } = await pageFor({ width: 320, height: 800 })
  try {
    await page.goto(base)
    const search = page.getByRole('form', { name: 'Tìm chỗ ở' })
    await expect(search.getByText('Khu vực hoặc từ khóa', { exact: true })).toBeVisible()
    await expect(search.getByText('Loại chỗ ở', { exact: true })).toBeVisible()
    await expect(search.getByText('Giá mỗi tháng', { exact: true })).toBeVisible()
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Search form must fit at 320px')

    await search.getByRole('searchbox', { name: 'Khu vực hoặc từ khóa' }).fill('  Cầu Giấy  ')
    await search.getByRole('combobox', { name: 'Loại chỗ ở' }).selectOption('STUDIO')
    await search.getByRole('combobox', { name: 'Giá mỗi tháng' }).selectOption('3000000-5000000')
    const request = page.waitForRequest((req) => {
      const url = new URL(req.url())
      return url.pathname === '/api/rooms' && url.searchParams.get('room_type') === 'STUDIO'
    })
    await search.getByRole('button', { name: 'Tìm chỗ ở', exact: true }).press('Enter')
    await expect(page).toHaveURL(/\/rooms\?/)
    const query = new URL((await request).url()).searchParams
    assert.equal(query.get('keyword'), 'Cầu Giấy')
    assert.equal(query.get('price_min'), '3000000')
    assert.equal(query.get('price_max'), '5000000')
  } finally { await context.close() }
})
