import { useEffect, useRef, useState } from 'react'
import { emit, listen } from '@tauri-apps/api/event'
import * as db from '../db'
import { PALETTE, fmt } from '../store'
import { Logo, Plus, Tick, Cross } from '../icons'

const uid = () => Math.random().toString(36).slice(2, 10)

/**
 * Standalone to-do list. It talks to SQLite directly rather than running a
 * second copy of the timer, and announces every change so the widget reloads.
 * Edits coming the other way arrive on the same event.
 */
export default function TodoWindow() {
  const [tasks, setTasks] = useState([])
  const [ready, setReady] = useState(false)
  const tasksRef = useRef(tasks)
  tasksRef.current = tasks

  async function reload() {
    setTasks(await db.loadTasks())
    setReady(true)
  }

  useEffect(() => {
    document.body.classList.add('solid')
    reload()
    const a = listen('tie://tasks-changed', (e) => {
      if (e.payload?.from !== 'todo') reload()
    })
    const b = listen('tie://refresh', reload)
    return () => {
      a.then((f) => f())
      b.then((f) => f())
    }
  }, [])

  function notify() {
    emit('tie://tasks-changed', { from: 'todo' }).catch(() => {})
  }

  async function add() {
    const t = {
      id: uid(),
      name: '',
      note: '',
      color: PALETTE[tasksRef.current.length % PALETTE.length],
      seconds: 0,
      done: false,
      // The list is a backlog: nothing reaches the widget until Track is ticked.
      tracked: false,
      items: [],
    }
    await db.insertTask(t, tasksRef.current.length)
    setTasks((l) => l.concat([{ ...t, expanded: true }]))
    notify()
  }

  async function edit(id, fields) {
    setTasks((l) => l.map((t) => (t.id === id ? { ...t, ...fields } : t)))
    await db.updateTask(id, fields)
    notify()
  }

  async function remove(id) {
    setTasks((l) => l.filter((t) => t.id !== id))
    await db.deleteTask(id)
    notify()
  }

  async function setItems(id, fn) {
    const cur = tasksRef.current.find((t) => t.id === id)
    if (!cur) return
    const next = fn(cur.items || [])
    setTasks((l) => l.map((t) => (t.id === id ? { ...t, items: next } : t)))
    await db.replaceItems(id, next)
    notify()
  }

  if (!ready) return null

  const open = tasks.filter((t) => !t.done)
  const done = tasks.filter((t) => t.done)

  return (
    <div className="todoPage">
      <div className="brandRow">
        <Logo size={15} />
        <span className="brand">To Do List</span>
        <span className="spacer" />
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
          {tasks.length
            ? `${open.length} open · ${tasks.filter((t) => t.tracked && !t.done).length} tracked · ${done.length} done`
            : 'nothing yet'}
        </span>
      </div>

      <button className="addBtn" onClick={add}>
        <Plus />
        Add a Task
      </button>

      <div className="todoList">
        {[...open, ...done].map((t) => (
          <TodoItem
            key={t.id}
            task={t}
            onEdit={(f) => edit(t.id, f)}
            onRemove={() => remove(t.id)}
            onItems={(fn) => setItems(t.id, fn)}
          />
        ))}
        {!tasks.length && (
          <div className="empty" style={{ padding: '30px 0' }}>
            This is your backlog. Add tasks here, then tick Track on the ones you want on the widget.
          </div>
        )}
      </div>
    </div>
  )
}

function TodoItem({ task: t, onEdit, onRemove, onItems }) {
  const items = t.items || []
  const ticked = items.filter((i) => i.done).length

  return (
    <div className="todoCard" style={{ opacity: t.done ? 0.55 : 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <button
          className="check"
          title={t.done ? 'Reopen' : 'Mark done'}
          onClick={() => onEdit({ done: !t.done })}
          style={{
            background: t.done ? t.color : 'transparent',
            border: `1.5px solid ${t.color}`,
          }}
        >
          {t.done && <Tick />}
        </button>
        <input
          className="nameInput"
          value={t.name}
          placeholder="Name this task"
          spellCheck={false}
          onChange={(e) => onEdit({ name: e.target.value })}
          style={{ color: t.color, textDecoration: t.done ? 'line-through' : 'none' }}
        />
        {t.tracked && (
          <span
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 12,
              fontVariantNumeric: 'tabular-nums',
              color: 'rgba(255,255,255,0.45)',
            }}
          >
            {fmt(t.seconds)}
          </span>
        )}
        <label className={`trackToggle${t.tracked ? ' on' : ''}`} title={t.tracked ? 'On the widget — untick to send it back to the backlog' : 'Add to the widget tracker'}>
          <input type="checkbox" checked={!!t.tracked} onChange={(e) => onEdit({ tracked: e.target.checked })} />
          {t.tracked ? 'Tracking' : 'Track'}
        </label>
        <button className="iconBtn removeBtn" title="Remove task" onClick={onRemove} style={{ width: 22, height: 22 }}>
          <Cross size={10} />
        </button>
      </div>

      <input
        className="noteInput"
        value={t.note}
        placeholder="Add a note"
        onChange={(e) => onEdit({ note: e.target.value })}
      />

      {!!items.length && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="barTrack" style={{ flex: 1, height: 4 }}>
            <div
              style={{
                height: '100%',
                borderRadius: 999,
                width: `${(ticked / items.length) * 100}%`,
                background: t.color,
              }}
            />
          </div>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'rgba(255,255,255,0.42)' }}>
            {ticked}/{items.length}
          </span>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {items.map((i) => (
          <div key={i.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              className="stepCheck"
              title="Tick off"
              onClick={() => onItems((l) => l.map((x) => (x.id === i.id ? { ...x, done: !x.done } : x)))}
              style={{ background: i.done ? t.color : 'transparent' }}
            >
              {i.done && <Tick size={8} w={4} />}
            </button>
            <input
              className="stepInput"
              value={i.text}
              spellCheck={false}
              onChange={(e) => onItems((l) => l.map((x) => (x.id === i.id ? { ...x, text: e.target.value } : x)))}
              style={{ textDecoration: i.done ? 'line-through' : 'none', opacity: i.done ? 0.5 : 1 }}
            />
            <button
              className="iconBtn"
              title="Remove step"
              onClick={() => onItems((l) => l.filter((x) => x.id !== i.id))}
              style={{ width: 14, height: 14, color: 'rgba(255,255,255,0.2)' }}
            >
              <Cross size={9} w={2.6} />
            </button>
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="stepCheck" style={{ border: '1.5px dashed rgba(147,0,255,0.4)', cursor: 'default' }} />
          <input
            className="stepInput"
            placeholder="Add a step, press Enter"
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return
              const v = e.target.value.trim()
              if (!v) return
              e.target.value = ''
              onItems((l) => l.concat([{ id: uid(), text: v, done: false }]))
            }}
          />
        </div>
      </div>
    </div>
  )
}
