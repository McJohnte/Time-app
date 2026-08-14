import { useEffect, useState } from 'react'
import { weekSummary } from '../week'
import { fmtH } from '../store'
import { Logo } from '../icons'

function prettyWeek(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function ReviewWindow() {
  const [wk, setWk] = useState(null)

  useEffect(() => {
    document.body.classList.add('solid')
    weekSummary().then(setWk)
  }, [])

  if (!wk) return null

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
    </div>
  )
}
