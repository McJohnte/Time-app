import { useEffect, useRef, useState } from 'react'
import * as db from './db'
import { loadSettings, saveSetting } from './settings'

export const PALETTE = ['#4500ff', '#9300ff', '#b300ff', '#ffaf00', '#34d39a', '#6aa6ff']

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

  tasksRef.current = tasks
  runningRef.current = running
  generalRef.current = general

  useEffect(() => {
    ;(async () => {
      const s = await loadSettings()
      setSettings(s)
      const day = db.today()
      const storedDay = await db.getState('day')
      let loaded = await db.loadTasks()
      if (storedDay && storedDay !== day) {
        loaded = await rollover(loaded, day)
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
      if (!run) return
      setGeneral((g) => g + 1)
      setTasks((list) => list.map((t) => (t.id === run ? { ...t, seconds: t.seconds + 1 } : t)))
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
    setUsage(false)
    autoHide()
  }

  function sleep() {
    clearTimeout(hideTimer.current)
    setIdle(true)
    setUsage(false)
  }

  function openUsage(on) {
    clearTimeout(hideTimer.current)
    setIdle(true)
    setUsage(on)
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
    setRunning(was === id ? null : id)
    if (was) await flush(was)
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
      expanded: true,
      items: [],
    }
    setTasks((l) => l.concat([t]))
    await db.insertTask(t, tasksRef.current.length)
  }

  async function edit(id, fields) {
    setTasks((l) => l.map((t) => (t.id === id ? { ...t, ...fields } : t)))
    const persist = { ...fields }
    delete persist.expanded
    if (Object.keys(persist).length) await db.updateTask(id, persist)
  }

  async function setDone(id, done) {
    if (done && runningRef.current === id) {
      setRunning(null)
      await flush(id)
    }
    setTasks((l) => l.map((t) => (t.id === id ? { ...t, done } : t)))
    await db.updateTask(id, { done })
  }

  async function allDone() {
    const run = runningRef.current
    if (run) {
      setRunning(null)
      await flush(run)
    }
    setTasks((l) => l.map((t) => ({ ...t, done: true })))
    for (const t of tasksRef.current) await db.updateTask(t.id, { done: true })
  }

  async function mutateItems(id, fn) {
    const cur = tasksRef.current.find((t) => t.id === id)
    if (!cur) return
    const next = fn(cur.items || [])
    setTasks((l) => l.map((t) => (t.id === id ? { ...t, items: next } : t)))
    await db.replaceItems(id, next)
  }

  async function remove(id) {
    wake()
    if (runningRef.current === id) setRunning(null)
    setTasks((l) => l.filter((t) => t.id !== id))
    await db.deleteTask(id)
  }

  async function carryOver() {
    setReminder(false)
    setTasks(await rollover(tasksRef.current, db.today()))
  }

  async function update(key, value) {
    setSettings((s) => ({ ...s, [key]: value }))
    await saveSetting(key, value)
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
    carryOver,
    setReminder,
    update,
  }
}
