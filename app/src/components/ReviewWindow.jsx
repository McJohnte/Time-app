import { useEffect, useState } from 'react'
import { listen } from '@tauri-apps/api/event'
import { weekSummary } from '../week'
import { monthSummary } from '../month'
import { fmtH } from '../store'
import { Logo } from '../icons'

function prettyWeek(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function ReviewWindow() {
  const [view, setView] = useState('week')
  const [wk, setWk] = useState(null)
  const [mo, setMo] = useState(null)
  // Month being viewed, as an offset from the current month (0 = this month).
  const [monthOff, setMonthOff] = useState(0)

  const monthRef = (() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth() + monthOff, 1)
  })()

  useEffect(() => {
    document.body.classList.add('solid')
    const refresh = () => {
      weekSummary().then(setWk)
      monthSummary(monthRef.getFullYear(), monthRef.getMonth()).then(setMo)
    }
    refresh()
    // The window is reused rather than rebuilt, so reopening it has to re-read
    // the database or it would keep showing whatever was true the first time.
    const un = listen('tie://refresh', refresh)
    return () => {
      un.then((f) => f())
    }
  }, [monthOff])

  if (!wk) return null

  return (
    <div className="review">
      <div className="brandRow">
        <Logo size={15} />
        <span className="brand">{view === 'week' ? 'Weekly Review' : 'Monthly Review'}</span>
        <span className="spacer" />
        <div className="tabs">
          <button className={`tab ${view === 'week' ? 'on' : ''}`} onClick={() => setView('week')}>
            Week
          </button>
          <button className={`tab ${view === 'month' ? 'on' : ''}`} onClick={() => setView('month')}>
            Month
          </button>
        </div>
      </div>

      {view === 'month' && mo && (
        <MonthView mo={mo} onPrev={() => setMonthOff((o) => o - 1)} onNext={() => setMonthOff((o) => o + 1)} atNow={monthOff === 0} />
      )}

      {view === 'week' && (
      <>
      <div className="reviewHead">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <span className="label">Week of {prettyWeek(wk.weekStart)}</span>
          <h1 className="reviewTitle">Where The Week Went</h1>
        </div>
        <span className="spacer" />
        {!wk.empty && (
          <div style={{ display: 'flex', gap: 26 }}>
            <div className="stat">
              <span className="label">Tracked</span>
              <span className="statVal">{fmtH(wk.totalHours)}</span>
            </div>
            <div className="stat">
              <span className="label">Daily average</span>
              <span className="statVal">{fmtH(wk.avgHours)}</span>
            </div>
            <div className="stat">
              <span className="label">Tasks</span>
              <span className="statVal">{wk.count}</span>
            </div>
          </div>
        )}
      </div>

      <div className="hr" />

      {wk.empty ? (
        <div className="empty">
          Nothing tracked yet this week.
          <br />
          Start a task in the widget and this review fills in as the week goes on.
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 30, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 320, display: 'flex', flexDirection: 'column', gap: 13 }}>
              <span className="label">By Task</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
                {wk.tasks.map((w) => (
                  <div key={w.name} style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      <span className="diamond" style={{ background: w.color }} />
                      <span
                        style={{
                          fontFamily: 'var(--sans)',
                          fontWeight: 600,
                          fontSize: 14,
                          color: w.nameColor,
                        }}
                      >
                        {w.name}
                      </span>
                      {w.top && (
                        <span
                          style={{
                            padding: '3px 9px',
                            borderRadius: 999,
                            border: '1px solid rgba(255,175,0,0.45)',
                            background: 'rgba(255,175,0,0.12)',
                            fontFamily: 'var(--sans)',
                            fontWeight: 600,
                            fontSize: 9,
                            letterSpacing: '0.12em',
                            textTransform: 'uppercase',
                            color: '#ffaf00',
                          }}
                        >
                          Most Time
                        </span>
                      )}
                      <span className="spacer" />
                      <span
                        style={{ fontFamily: 'var(--mono)', fontSize: 13.5, fontVariantNumeric: 'tabular-nums' }}
                      >
                        {w.hours}
                      </span>
                      <span
                        style={{
                          fontFamily: 'var(--sans)',
                          fontSize: 12,
                          minWidth: 38,
                          textAlign: 'right',
                          color: 'rgba(255,255,255,0.4)',
                        }}
                      >
                        {w.pct}
                      </span>
                    </div>
                    <div className="barTrack">
                      <div style={{ height: '100%', borderRadius: 999, width: w.barW, background: w.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ flex: 'none', width: 258, display: 'flex', flexDirection: 'column', gap: 13 }}>
              <span className="label">By Day</span>
              <div className="dayChart">
                {wk.days.map((d) => (
                  <div
                    key={d.label}
                    className="dayCol"
                    title={`${d.long} · ${d.total}`}
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'flex-end',
                      height: '100%',
                      gap: 7,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'flex-end',
                        gap: 2,
                        height: d.h,
                      }}
                    >
                      {d.segs.map((g, i) => (
                        <div
                          key={i}
                          className="seg"
                          title={`${g.name} · ${g.hours}`}
                          style={{ borderRadius: 2, height: g.h, background: g.color }}
                        />
                      ))}
                    </div>
                    <span
                      style={{
                        fontFamily: 'var(--sans)',
                        fontWeight: 600,
                        fontSize: 10,
                        textAlign: 'center',
                        letterSpacing: '0.06em',
                        color: d.labelColor,
                      }}
                    >
                      {d.label}
                    </span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 3px' }}>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Longest day</span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>
                  {wk.longest}
                </span>
              </div>
            </div>
          </div>

          {!!wk.notes.length && (
            <div className="notes">
              <span className="label">Worth Noticing</span>
              {wk.notes.map((n, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <span style={{ flex: 'none', fontSize: 12, lineHeight: 1.5, color: '#ffaf00' }}>◆</span>
                  <span style={{ fontSize: 14, lineHeight: 1.5, color: 'rgba(255,255,255,0.78)' }}>{n.text}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      </>
      )}
    </div>
  )
}

function MonthView({ mo, onPrev, onNext, atNow }) {
  return (
    <>
      <div className="reviewHead">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <span className="label">{mo.label}</span>
          <h1 className="reviewTitle">Where The Month Went</h1>
        </div>
        <span className="spacer" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 26 }}>
          {!mo.empty && (
            <>
              <div className="stat">
                <span className="label">Tracked</span>
                <span className="statVal">{mo.total}</span>
              </div>
              <div className="stat">
                <span className="label">Avg per week</span>
                <span className="statVal">{mo.avg}</span>
              </div>
            </>
          )}
          <div className="tabs">
            <button className="tab" title="Previous month" onClick={onPrev}>‹</button>
            <button className="tab" title="Next month" onClick={onNext} disabled={atNow} style={{ opacity: atNow ? 0.35 : 1 }}>›</button>
          </div>
        </div>
      </div>

      <div className="hr" />

      {mo.empty ? (
        <div className="empty">Nothing tracked in {mo.label}.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <span className="label">By Week</span>
          {mo.weeks.map((w) => (
            <div key={w.weekStart} className="weekRow" style={{ opacity: w.totalHours > 0 ? 1 : 0.4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontFamily: 'var(--sans)', fontWeight: 600, fontSize: 14.5, color: w.busiest ? '#fff' : 'rgba(255,255,255,0.85)' }}>
                  {w.label}
                </span>
                {w.busiest && <span className="pill">Busiest</span>}
                <span className="spacer" />
                <span style={{ fontFamily: 'var(--mono)', fontSize: 15, fontVariantNumeric: 'tabular-nums' }}>{w.hours}</span>
              </div>
              <div className="barTrack">
                <div style={{ height: '100%', borderRadius: 999, width: w.barW, background: 'linear-gradient(90deg, #4500ff, #b300ff)' }} />
              </div>
              {w.top ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'rgba(255,255,255,0.6)' }}>
                  <span className="diamond" style={{ background: w.top.color }} />
                  <span>
                    <span style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 500 }}>{w.top.name}</span> took the most time — {w.top.hours} ({w.top.pct}%) across {w.count} {w.count === 1 ? 'task' : 'tasks'}
                  </span>
                </div>
              ) : (
                <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.35)' }}>Nothing tracked this week.</span>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  )
}
