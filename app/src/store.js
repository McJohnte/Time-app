import { useEffect, useRef, useState } from 'react'
import { emit, listen } from '@tauri-apps/api/event'
import * as db from './db'
import { loadSettings, saveSetting } from './settings'

export const PALETTE = ['#4500ff', '#9300ff', '#b300ff', '#ffaf00', '#34d39a', '#6aa6ff']

/** Which screen edges each dock orientation can sit on. */
export const EDGES = { vertical: ['right', 'left'], horizontal: ['top', 'bottom'] }

export function pad(n) {
  return n < 10 ? '0' + n : '' + n
}

export function fmt(s) {
  s = Math.max(0, Math.floor(s))
  return Math.floor(s / 3600) + ':' + pad(Math.floor(s / 60) % 60) + ':' + pad(s % 60)
}

export function fmtH(h) {
  const m = Math.round(h * 60)
  return Math.floor(m / 60) + 'h ' + pad(m % 60) + 'm'
}

const uid = () => Math.random().toString(36).slice(2, 10)

/** Parses "17:30" / "5:30 PM" into {h, m}. */
function parseTime(str) {
  const s = String(str).trim()
  const ampm = /(am|pm)$/i.exec(s)
  const [hRaw, mRaw] = s.replace(/\s*(am|pm)$/i, '').split(':')
  let h = parseInt(hRaw, 10) || 0
  const m = parseInt(mRaw, 10) || 0
  if (ampm) {
    const pm = ampm[1].toLowerCase() === 'pm'
    if (pm && h < 12) h += 12
    if (!pm && h === 12) h = 0
  }
  return { h, m }
}

export function useTimer() {
  const [ready, setReady] = useState(false)
  const [tasks, setTasks] = useState([])
  const [running, setRunning] = useState(null)
  const [general, setGeneral] = useState(0)
  const [idle, setIdle] = useState(false)
  const [usage, setUsage] = useState(false)
  const [reminder, setReminder] = useState(false)
  const [settings, setSettings] = useState(null)

  const tasksRef = useRef(tasks)
  const runningRef = useRef(running)
  const generalRef = useRef(general)
  const dayRef = useRef(db.today())
  const hideTimer = useRef(null)
  const firedRef = useRef(null)
  /**
   * Wall-clock anchor for the running task: when it started and what the task
   * and daily totals were at that moment. Elapsed time is derived from this
   * rather than counted a tick at a time, because the webview's timers are
   * throttled or suspended whenever the window is occluded — on another Space,
   * covered by another app, or with the display asleep — and every tick that
   * does not fire would otherwise be time silently lost.
   */
  const anchorRef = useRef(null)

  tasksRef.current = tasks
  runningRef.current = running
  generalRef.current = general

  useEffect(() => {
    ;(async () => {
      const s = await loadSettings()
      setSettings(s)
      const day = db.today()
      const storedDay = await db.getState('day')
      let loaded = (await db.loadTasks()).filter((t) => t.tracked)
      if (storedDay && storedDay !== day) {
        loaded = await rollover(loaded, day, storedDay)
      } else {
        const g = await db.getState('general')
        if (g) setGeneral(parseInt(g, 10) || 0)
      }
      await db.setState('day', day)
      dayRef.current = day
      setTasks(loaded)
      setReady(true)
    })()
  }, [])

  /** Tell the other windows the task list changed. */
  function notify() {
    emit('tie://tasks-changed', { from: 'widget' }).catch(() => {})
  }

  /**
   * Re-read tasks after another window edited them. The running task keeps
   * its live seconds — the database only has the last 15s flush, and the
   * next tick would recompute from the anchor anyway.
   */
  async function reloadTasks() {
    const fresh = (await db.loadTasks()).filter((t) => t.tracked)
    const run = runningRef.current
    const runFresh = fresh.find((t) => t.id === run)
    // Stop the clock if the other window removed the running task or ticked it off.
    if (run && (!runFresh || runFresh.done)) {
      if (runFresh) await flush(run)
      setRunning(null)
      anchor(null)
    }
    setTasks((cur) => {
      const live = cur.find((t) => t.id === run)
      return fresh.map((t) => {
        const prev = cur.find((x) => x.id === t.id)
        const seconds = t.id === run && live ? live.seconds : t.seconds
        return { ...t, seconds, expanded: prev ? prev.expanded : false }
      })
    })
  }

  useEffect(() => {
    const un = listen('tie://tasks-changed', (e) => {
      if (e.payload?.from !== 'widget') reloadTasks()
    })
    return () => {
      un.then((f) => f())
    }
  }, [])

  /** Re-base the wall-clock anchor on the currently running task. */
  function anchor(id) {
    const t = id ? tasksRef.current.find((x) => x.id === id) : null
    anchorRef.current = t
      ? { id, at: Date.now(), taskBase: t.seconds, generalBase: generalRef.current }
      : null
  }

  /** Carry over: unticked tasks (and their notes/steps) survive with clocks back at zero. */
  async function rollover(list, day, closingDay = dayRef.current) {
    const kept = list.filter((t) => !t.done)
    for (const t of list) {
      if (t.seconds > 0) await db.logSeconds(closingDay, t)
      if (t.done) await db.deleteTask(t.id)
      else await db.updateTask(t.id, { seconds: 0 })
    }
    await db.setState('general', 0)
    await db.setState('day', day)
    setGeneral(0)
    setRunning(null)
    anchorRef.current = null
    return kept.map((t) => ({ ...t, seconds: 0 }))
  }

  useEffect(() => {
    const id = setInterval(async () => {
      const day = db.today()
      if (day !== dayRef.current) {
        const closing = dayRef.current
        dayRef.current = day
        setTasks(await rollover(tasksRef.current, day, closing))
        return
      }
      const run = runningRef.current
      const a = anchorRef.current
      if (!run || !a || a.id !== run) return
      const elapsed = Math.max(0, Math.round((Date.now() - a.at) / 1000))
      setGeneral(a.generalBase + elapsed)
      setTasks((list) =>
        list.map((t) => (t.id === run ? { ...t, seconds: a.taskBase + elapsed } : t))
      )
    }, 1000)
    return () => clearInterval(id)
  }, [])

  // Flush to SQLite periodically rather than every tick.
  useEffect(() => {
    const id = setInterval(async () => {
      if (!ready) return
      const run = runningRef.current
      await db.setState('general', generalRef.current)
      if (!run) return
      const t = tasksRef.current.find((x) => x.id === run)
      if (t) {
        await db.updateTask(t.id, { seconds: t.seconds })
        await db.logSeconds(dayRef.current, t)
      }
    }, 15000)
    return () => clearInterval(id)
  }, [ready])

  // End-of-day reminder — fires once per day at the configured time.
  useEffect(() => {
    if (!settings) return
    const id = setInterval(() => {
      const { h, m } = parseTime(settings.reminderTime)
      const now = new Date()
      const key = db.today()
      if (firedRef.current === key) return
      if (now.getHours() > h || (now.getHours() === h && now.getMinutes() >= m)) {
        firedRef.current = key
        setReminder(true)
        window.dispatchEvent(new CustomEvent('tie://reminder'))
      }
    }, 20000)
    return () => clearInterval(id)
  }, [settings])

  function autoHide() {
    clearTimeout(hideTimer.current)
    const delay = (settings?.autoHideSeconds ?? 6) * 1000
    hideTimer.current = setTimeout(() => setIdle(true), delay)
  }

  function wake() {
    setIdle(false)
    autoHide()
  }

  function sleep() {
    clearTimeout(hideTimer.current)
    setIdle(true)
    setUsage(false)
  }

  /**
   * The usage card has its own close button, so waking (which mouse movement
   * does constantly) must not dismiss it — that made the card vanish the moment
   * the cursor moved. Closing it restarts the auto-hide countdown instead.
   */
  function openUsage(on) {
    clearTimeout(hideTimer.current)
    setUsage(on)
    if (!on) wake()
  }

  async function flush(id) {
    const t = tasksRef.current.find((x) => x.id === id)
    if (!t) return
    await db.updateTask(t.id, { seconds: t.seconds })
    await db.logSeconds(dayRef.current, t)
    await db.setState('general', generalRef.current)
  }

  async function toggle(id) {
    wake()
    const was = runningRef.current
    const next = was === id ? null : id
    setRunning(next)
    if (was) await flush(was)
    anchor(next)
  }

  async function add() {
    wake()
    const t = {
      id: uid(),
      name: '',
      note: '',
      color: PALETTE[tasksRef.current.length % PALETTE.length],
      seconds: 0,
      done: false,
      tracked: true,
      expanded: true,
      items: [],
    }
    setTasks((l) => l.concat([t]))
    await db.insertTask(t, tasksRef.current.length)
    notify()
  }

  async function edit(id, fields) {
    setTasks((l) => l.map((t) => (t.id === id ? { ...t, ...fields } : t)))
    const persist = { ...fields }
    delete persist.expanded
    if (Object.keys(persist).length) {
      await db.updateTask(id, persist)
      notify()
    }
  }

  async function setDone(id, done) {
    if (done && runningRef.current === id) {
      setRunning(null)
      await flush(id)
      anchor(null)
    }
    let next = tasksRef.current.map((t) => (t.id === id ? { ...t, done } : t))
    if (done) {
      // Finished work sinks to the bottom so what is still open stays in reach.
      const i = next.findIndex((t) => t.id === id)
      const [moved] = next.splice(i, 1)
      next = next.concat([moved])
    }
    setTasks(next)
    await db.updateTask(id, { done })
    if (done) await db.savePositions(next.map((t) => t.id))
    notify()
  }

  /** Drag-and-drop: move `fromId` to where `toId` sits. */
  async function reorder(fromId, toId) {
    const cur = tasksRef.current
    const from = cur.findIndex((t) => t.id === fromId)
    const to = cur.findIndex((t) => t.id === toId)
    if (from < 0 || to < 0 || from === to) return
    const next = cur.slice()
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    setTasks(next)
    await db.savePositions(next.map((t) => t.id))
    notify()
  }

  async function allDone() {
    const run = runningRef.current
    if (run) {
      setRunning(null)
      await flush(run)
      anchor(null)
    }
    setTasks((l) => l.map((t) => ({ ...t, done: true })))
    for (const t of tasksRef.current) await db.updateTask(t.id, { done: true })
    notify()
  }

  async function mutateItems(id, fn) {
    const cur = tasksRef.current.find((t) => t.id === id)
    if (!cur) return
    const next = fn(cur.items || [])
    setTasks((l) => l.map((t) => (t.id === id ? { ...t, items: next } : t)))
    await db.replaceItems(id, next)
    notify()
  }

  async function remove(id) {
    wake()
    if (runningRef.current === id) {
      setRunning(null)
      anchor(null)
    }
    setTasks((l) => l.filter((t) => t.id !== id))
    await db.deleteTask(id)
    notify()
  }

  /**
   * Carry Over closes out the reminder without touching the clocks. Today's
   * time is already logged incrementally and stays on the tasks until the
   * midnight rollover, which is what actually starts the next day at zero —
   * so yesterday's hours are recorded but never counted against tomorrow.
   *
   * Zeroing here was a data-loss bug: the reset clock's next flush overwrote
   * the day's log with the post-reset figure.
   */
  async function carryOver() {
    const run = runningRef.current
    if (run) {
      setRunning(null)
      await flush(run)
      anchor(null)
    }
    setReminder(false)
  }

  async function update(key, value) {
    setSettings((s) => ({ ...s, [key]: value }))
    await saveSetting(key, value)
  }

  /** Orientation and edge move together — a vertical dock can't sit on the top edge. */
  async function setDock(orientation, edge) {
    const valid = EDGES[orientation]
    const next = valid.includes(edge) ? edge : valid[0]
    setSettings((s) => ({ ...s, orientation, edge: next }))
    await saveSetting('orientation', orientation)
    await saveSetting('edge', next)
  }

  return {
    ready,
    tasks,
    running,
    general,
    idle,
    usage,
    reminder,
    settings,
    wake,
    sleep,
    openUsage,
    toggle,
    add,
    edit,
    setDone,
    allDone,
    mutateItems,
    remove,
    reorder,
    carryOver,
    setReminder,
    update,
    setDock,
  }
}
