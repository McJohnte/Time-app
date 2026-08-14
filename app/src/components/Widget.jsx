import { useEffect, useRef, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import TaskRow from './TaskRow'
import ReminderOverlay from './ReminderOverlay'
import { useTimer, fmt, fmtH } from '../store'
import { applyGeometry, show } from '../windowGeometry'
import { notifyReminder, ensurePermission } from '../notifications'
import { weekSummary } from '../week'
import { Logo, Plus, Stop } from '../icons'

export default function Widget() {
  const s = useTimer()
  const [week, setWeek] = useState(null)
  const geo = useRef('')

  const orientation = s.settings?.orientation ?? 'vertical'
  const edge = s.settings?.edge ?? 'right'
  const dim = s.settings?.idleOpacity ?? 0.55
  const active = !!s.running
  const cur = s.tasks.find((t) => t.id === s.running)

  const state = s.reminder || !s.idle || s.usage ? 'panel' : active ? 'peek' : 'rest'

  useEffect(() => {
    if (!s.ready) return
    const key = `${state}|${orientation}|${edge}`
    if (geo.current === key) return
    geo.current = key
    applyGeometry(state, orientation, edge).then(show)
  }, [s.ready, state, orientation, edge])

  useEffect(() => {
    ensurePermission()
    const un = listen('tie://wake', () => s.wake())
    return () => {
      un.then((f) => f())
    }
  }, [])

  useEffect(() => {
    const h = () => notifyReminder(s.tasks.filter((t) => !t.done).length)
    window.addEventListener('tie://reminder', h)
    return () => window.removeEventListener('tie://reminder', h)
  }, [s.tasks])

  useEffect(() => {
    if (s.usage) weekSummary().then(setWeek)
  }, [s.usage])

  if (!s.ready) return null

  if (state === 'rest') {
    return (
      <div
        className={`sliver ${orientation}`}
        title="Nothing tracking · click to open"
        onClick={s.wake}
        style={{ width: '100%', height: '100%', opacity: dim, borderRadius: 7 }}
      />
    )
  }

  if (state === 'peek') {
    return (
      <div className="peek" onClick={s.wake} style={{ opacity: dim }}>
        <span
          style={{
            flex: 'none',
            width: 8,
            height: 8,
            borderRadius: 2,
            transform: 'rotate(45deg)',
            background: cur ? cur.color : '#ffaf00',
            animation: 'tiePulse 2s ease-in-out infinite',
          }}
        />
        <span className="peekName">{cur ? cur.name || 'Untitled task' : ''}</span>
        <span className="peekTime">{cur ? fmt(cur.seconds) : ''}</span>
        <button
          className="stopBtn"
          title="Stop"
          onClick={(e) => {
            e.stopPropagation()
            s.toggle(s.running)
          }}
        >
          <Stop size={8} />
        </button>
      </div>
    )
  }

  const doneCount = s.tasks.filter((t) => t.done).length
  const countLabel =
    s.tasks.length + (s.tasks.length === 1 ? ' task' : ' tasks') + (doneCount ? ` · ${doneCount} done` : '')

  const header = (
    <>
      <div className="brandRow" data-tauri-drag-region>
        <Logo />
        <span className="brand">TIE Timer</span>
        <span className="spacer" />
        <span
          className="statusDot"
          style={{
            background: active ? '#ffaf00' : 'rgba(255,255,255,0.25)',
            animation: active ? 'tiePulse 2s ease-in-out infinite' : 'none',
          }}
        />
        <span className="statusLabel">{active ? 'Tracking' : 'Paused'}</span>
      </div>

      <div className="totalCard">
        <span className="label">Total today</span>
        <span className="totalTime" style={{ color: active ? '#fff' : 'rgba(255,255,255,0.42)' }}>
          {fmt(s.general)}
        </span>
        <div className="rainbowTrack">
          <div className="rainbow" style={{ opacity: active ? 1 : 0.2 }} />
        </div>
      </div>
    </>
  )

  const list = (
    <div className={`taskList ${orientation}`}>
      {s.tasks.map((t) => (
        <TaskRow
          key={t.id}
          task={t}
          running={t.id === s.running}
          onToggle={() => s.toggle(t.id)}
          onEdit={(f) => s.edit(t.id, f)}
          onDone={(d) => s.setDone(t.id, d)}
          onRemove={() => s.remove(t.id)}
          onItems={(fn) => s.mutateItems(t.id, fn)}
        />
      ))}
      {!s.tasks.length && (
        <div
          style={{
            padding: 18,
            borderRadius: 14,
            border: '1px dashed rgba(147,0,255,0.28)',
            color: 'rgba(255,255,255,0.45)',
            fontSize: 12.5,
            lineHeight: 1.5,
          }}
        >
          No tasks yet. Add one to start tracking the day.
        </div>
      )}
    </div>
  )

  const addBtn = (
    <button className="addBtn" onClick={s.add}>
      <Plus />
      Add a Task
    </button>
  )

  const footer = (
    <div className="footer">
      <span className="label" style={{ letterSpacing: '0.13em' }}>
        {countLabel}
      </span>
      <span className="spacer" />
      <button className="linkBtn" onClick={() => s.openUsage(true)}>
        Usage
      </button>
      <button className="linkBtn" onClick={() => invoke('open_review')}>
        Review
      </button>
    </div>
  )

  return (
    <div
      className={`panel ${orientation}`}
      onMouseEnter={s.wake}
      onMouseMove={s.wake}
      onMouseDown={s.wake}
      style={{ position: 'relative' }}
    >
      {orientation === 'vertical' ? (
        <>
          {header}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '0 3px' }}>
            <span className="label">Tasks</span>
          </div>
          {list}
          {addBtn}
          {footer}
        </>
      ) : (
        <>
          <div
            style={{
              flex: 'none',
              width: 178,
              display: 'flex',
              flexDirection: 'column',
              gap: 7,
              paddingRight: 16,
              borderRight: '1px solid rgba(147,0,255,0.2)',
            }}
          >
            {header}
            {footer}
          </div>
          {list}
          {addBtn}
        </>
      )}

      {s.usage && (
        <div className="overlay">
          <div className="card">
            <div className="brandRow">
              <span className="brand">This Week</span>
              <span className="spacer" />
              <button className="iconBtn" style={{ color: 'rgba(255,255,255,0.4)' }} onClick={() => s.openUsage(false)}>
                ✕
              </button>
            </div>
            <span
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 30,
                fontWeight: 500,
                letterSpacing: '-0.03em',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {week ? fmtH(week.totalHours) : '—'}
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(week?.tasks ?? []).slice(0, 3).map((w) => (
                <div key={w.name} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="diamond" style={{ width: 8, height: 8, background: w.color }} />
                    <span
                      style={{
                        flex: 1,
                        minWidth: 0,
                        fontFamily: 'var(--sans)',
                        fontWeight: 500,
                        fontSize: 12.5,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        color: 'rgba(255,255,255,0.86)',
                      }}
                    >
                      {w.name}
                    </span>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
                      {w.hours}
                    </span>
                  </div>
                  <div className="barTrack" style={{ height: 5, border: 'none' }}>
                    <div style={{ height: '100%', borderRadius: 999, width: w.barW, background: w.color }} />
                  </div>
                </div>
              ))}
              {week && !week.tasks.length && (
                <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>
                  Nothing tracked yet this week.
                </span>
              )}
            </div>
            <button className="pillBtn ghost" onClick={() => invoke('open_review')}>
              Open Full Review
            </button>
          </div>
        </div>
      )}

      {s.reminder && (
        <ReminderOverlay
          time={s.settings?.reminderTime}
          tasks={s.tasks.filter((t) => !t.done)}
          onDismiss={() => s.setReminder(false)}
          onDone={(id) => s.setDone(id, true)}
          onCarry={s.carryOver}
          onAllDone={async () => {
            await s.allDone()
            s.setReminder(false)
          }}
        />
      )}
    </div>
  )
}
