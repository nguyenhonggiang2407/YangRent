import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs'
import vm from 'node:vm'
import { readNotificationStream } from '../src/lib/notificationStream.js'

function response(chunks, status = 200, type = 'text/event-stream') {
  return new Response(new ReadableStream({ start(controller) {
    for (const chunk of chunks) controller.enqueue(new TextEncoder().encode(chunk))
    controller.close()
  } }), { status, headers: { 'Content-Type': type } })
}
test('SSE uses a bearer header without URL credentials and decodes split UTF-8/CRLF frames', async () => {
  let sent
  const output = [], controller = new AbortController()
  const bytes = new TextEncoder().encode('event: notification\r\ndata: {"unread_count":2,"title":"Thông báo"}\r\n\r\n')
  await readNotificationStream({ url: 'https://api.example.test/api/notifications/stream', token: 'fictional', signal: controller.signal, onNotification: data => output.push(data),
    fetchImpl: async (url, options) => {
      sent = { url, options }
      return new Response(new ReadableStream({ start(c) {
        for (const byte of bytes) c.enqueue(Uint8Array.of(byte))
        c.close()
      } }), { headers: { 'Content-Type': 'text/event-stream' } })
    } })
  assert.equal(sent.options.headers.Authorization, 'Bearer fictional')
  assert.equal(sent.options.signal, controller.signal)
  assert.equal(new URL(sent.url).search, '')
  assert.deepEqual(output, [{ unread_count: 2, title: 'Thông báo' }])
})
test('keepalive/malformed/other events do not suppress later valid notification', async () => {
  const output = []
  await readNotificationStream({ url: '/api/notifications/stream', token: 'fictional', signal: new AbortController().signal,
    onNotification: x => output.push(x), fetchImpl: async () => response([
      ': keepalive\n\nevent: notification\ndata: invalid\n\n',
      'event: other\ndata: {"unread_count":99}\n\nevent: notification\ndata: {"unread_count":-1}\n\n',
      'event: notification\ndata: {"unread_count":3}\n\n',
    ]) })
  assert.deepEqual(output, [{ unread_count: 3 }])
})
test('HTTP denial/non-stream response and oversized pending event reject for fallback', async () => {
  for (const [chunks, status, type] of [[[],401,'application/json'],[[],200,'text/html'],[['x'.repeat(65537)],200,'text/event-stream']]) {
    await assert.rejects(readNotificationStream({ url: '/api/notifications/stream', token: 'fictional', signal: new AbortController().signal,
      onNotification: () => assert.fail('No event expected'), fetchImpl: async () => response(chunks,status,type) }))
  }
})
test('abort cannot deliver another queued notification', async () => {
  const output = [], controller = new AbortController()
  await readNotificationStream({ url: '/api/notifications/stream', token: 'fictional', signal: controller.signal,
    onNotification: data => { output.push(data); controller.abort() }, fetchImpl: async () => response([
      'event: notification\ndata: {"unread_count":1}\n\nevent: notification\ndata: {"unread_count":2}\n\n',
    ]) })
  assert.deepEqual(output, [{ unread_count: 1 }])
})

function hookHarness() {
  const source = fs.readFileSync(new URL('../src/hooks/useNotificationStream.js', import.meta.url), 'utf8')
    .replace(/^import [^\r\n]*\r?\n/gm, '').replace('export function useNotificationStream', 'function useNotificationStream')
  const counts = [], intervals = new Set(), calls = [], pending = []
  let cleanup, stream
  const context = vm.createContext({ AbortController, clearInterval: id => intervals.delete(id), setInterval: fn => { intervals.add(fn); return fn },
    useState: () => [0, value => counts.push(value)], useRef: value => ({ current: value }), useEffect: fn => { cleanup = fn() },
    localStorage: { getItem: name => name === 'yangrent_token' ? 'fictional' : null },
    api: { defaults: { baseURL: 'https://api.example.test/api/' }, get: (...args) => { calls.push(args); return new Promise(resolve => pending.push(resolve)) } },
    readNotificationStream: options => { stream = options; return new Promise((resolve,reject) => { stream.resolve = resolve; stream.reject = reject }) },
  })
  vm.runInContext(source + '\nglobalThis.hook=useNotificationStream;', context)
  return { render: user => context.hook(user), counts, intervals, calls, pending, get stream() { return stream }, cleanup: () => cleanup?.() }
}
test('actual hook initializes count, falls back once and aborts/clears on owner disposal', async () => {
  const h = hookHarness(), handle = h.render({ id: 1 })
  assert.equal(h.calls.length, 1)
  assert.equal(h.stream.url, 'https://api.example.test/api/notifications/stream')
  h.pending.shift()({ data: { unread_count: 4 } }); await new Promise(resolve => setImmediate(resolve))
  assert.deepEqual(h.counts, [0,4])
  h.stream.reject(new Error('offline')); await new Promise(resolve => setImmediate(resolve))
  assert.equal(h.intervals.size, 1)
  const pendingRefresh = handle.refresh()
  h.cleanup()
  assert.equal(h.stream.signal.aborted, true)
  assert.equal(h.intervals.size, 0)
  h.pending.shift()({ data: { unread_count: 99 } }); await pendingRefresh
  h.stream.onNotification({ unread_count: 88 })
  assert.deepEqual(h.counts, [0,4])
})
test('actual hook does not start polling when an old stream ends after leaving', async () => {
  const h = hookHarness(); h.render({ id: 1 }); h.cleanup()
  h.stream.resolve(); await new Promise(resolve => setImmediate(resolve))
  h.pending.shift()({ data: { unread_count: 7 } }); await new Promise(resolve => setImmediate(resolve))
  assert.equal(h.intervals.size, 0)
  assert.deepEqual(h.counts, [0])
})
test('signed-out hook makes no notification request', () => {
  const h = hookHarness(); h.render(null)
  assert.equal(h.calls.length, 0)
  assert.equal(h.stream, undefined)
})
