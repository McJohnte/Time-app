import { useEffect, useState } from 'react'
import { listen } from '@tauri-apps/api/event'
import { weekSummary } from '../week'
import { loadTasks } from '../db'
import { fmt, fmtH } from '../store'
import { Logo, Tick } from '../icons'

function prettyWeek(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function ReviewWindow() {
  const [wk, setWk] = useState(null)
  const [todos, setTodos] = useState([])

  useEffect(() => {
    document.body.classList.add('solid')
    const refresh = () => {
      weekSummary().then(setWk)
      loadTasks().then(setTodos)
    }
    refresh()
    // The window is reused rather than rebuilt, so reopening it has to re-read
    // the database or it would keep showing whatever was true the first time.
    const un = listen('tie://refresh', refresh)
    return () => {
      un.then((f) => f())
    }
  }, [])

  if (!wk) return null

  const open = todos.filter((t) => !t.done)
  const done = todos.filter((t) => t.done)

  return (
    <div className="review">
      <div className="brandRow">
        <Logo size={15} />
        <span className="brand">Weekly Review</span>
      </div>

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
                        <div key={i} style={{ borderRadius: 2, height: g.h, background: g.color }} />
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

      <div className="todos">
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span className="label">To-Dos</span>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
            {todos.length
              ? `${open.length} open · ${done.length} done`
              : 'nothing on the list'}
          </span>
        </div>

        {!todos.length && (
          <span style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.45)' }}>
            Tasks you add in the widget show up here, with their steps.
          </span>
        )}

        <div className="todoGrid">
          {[...open, ...done].map((t) => {
            const ticked = t.items.filter((i) => i.done).length
            return (
              <div key={t.id} className="todoCard" style={{ opacity: t.done ? 0.55 : 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <span
                    className="todoBox"
                    style={{
                      background: t.done ? t.color : 'transparent',
                      borderColor: t.color,
                    }}
                  >
                    {t.done && <Tick size={9} />}
                  </span>
                  <span
                    style={{
                      flex: 1,
                      minWidth: 0,
                      fontFamily: 'var(--sans)',
                      fontWeight: 600,
                      fontSize: 13.5,
                      color: '#fff',
                      textDecoration: t.done ? 'line-through' : 'none',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {t.name || 'Untitled task'}
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--mono)',
                      fontSize: 12.5,
                      fontVariantNumeric: 'tabular-nums',
                      color: 'rgba(255,255,255,0.5)',
                    }}
                  >
                    {fmt(t.seconds)}
                  </span>
                </div>

                {!!t.note && (
                  <span style={{ fontSize: 12, lineHeight: 1.45, color: 'rgba(255,255,255,0.4)' }}>
                    {t.note}
                  </span>
                )}

                {!!t.items.length && (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="barTrack" style={{ flex: 1, height: 4 }}>
                        <div
                          style={{
                            height: '100%',
                            borderRadius: 999,
                            width: `${(ticked / t.items.length) * 100}%`,
                            background: t.color,
                          }}
                        />
                      </div>
                      <span
                        style={{
                          fontFamily: 'var(--mono)',
                          fontSize: 11,
                          color: 'rgba(255,255,255,0.42)',
                        }}
                      >
                        {ticked}/{t.items.length}
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      {t.items.map((i) => (
                        <div key={i.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span
                            className="todoBox sm"
                            style={{
                              background: i.done ? t.color : 'transparent',
                              borderColor: i.done ? t.color : 'rgba(147,0,255,0.45)',
                            }}
                          >
                            {i.done && <Tick size={7} w={4.2} />}
                          </span>
                          <span
                            style={{
                              fontSize: 12,
                              color: 'rgba(255,255,255,0.78)',
                              textDecoration: i.done ? 'line-through' : 'none',
                              opacity: i.done ? 0.55 : 1,
                            }}
                          >
                            {i.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
