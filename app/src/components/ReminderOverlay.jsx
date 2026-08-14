import { fmt } from '../store'
import { Logo, Cross } from '../icons'

export default function ReminderOverlay({ time, tasks, onDismiss, onDone, onCarry, onAllDone }) {
  const open = tasks.length

  return (
    <div className="overlay">
      <div className="card" style={{ gap: 13 }}>
        <div className="brandRow">
          <Logo size={16} />
          <span className="brand" style={{ fontSize: 10 }}>
            TIE Timer
          </span>
          <span className="spacer" />
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: '#ffaf00' }}>{time}</span>
          <button
            className="iconBtn"
            title="Dismiss"
            onClick={onDismiss}
            style={{ width: 18, height: 18, color: 'rgba(255,255,255,0.3)' }}
          >
            <Cross size={10} w={2.6} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <h4
            style={{
              margin: 0,
              fontFamily: 'var(--sans)',
              fontWeight: 600,
              fontSize: 16.5,
              lineHeight: 1.25,
            }}
          >
            {open ? `${open} ${open === 1 ? 'task is' : 'tasks are'} still open` : 'The day is closed out'}
          </h4>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: 'rgba(255,255,255,0.6)' }}>
            {open
              ? 'Carry them into tomorrow, or tick off anything you actually finished.'
              : 'Every task on today’s list is ticked. Nothing to carry over.'}
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {tasks.map((t) => (
            <div
              key={t.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 9,
                padding: '9px 11px',
                borderRadius: 11,
                background: 'rgba(12,8,36,0.5)',
                border: '1px solid rgba(147,0,255,0.16)',
              }}
            >
              <button
                className="check"
                title="Mark done"
                onClick={() => onDone(t.id)}
                style={{ width: 15, height: 15, borderRadius: 4, background: 'transparent', border: `1.5px solid ${t.color}` }}
              />
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
                  color: 'rgba(255,255,255,0.88)',
                }}
              >
                {t.name || 'Untitled task'}
              </span>
              <span
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: 11.5,
                  fontVariantNumeric: 'tabular-nums',
                  color: 'rgba(255,255,255,0.45)',
                }}
              >
                {fmt(t.seconds)}
              </span>
            </div>
          ))}
          {!open && (
            <div
              style={{
                padding: '14px 11px',
                borderRadius: 11,
                background: 'rgba(52,211,154,0.1)',
                border: '1px solid rgba(52,211,154,0.3)',
                fontSize: 12.5,
                lineHeight: 1.45,
                color: 'rgba(255,255,255,0.8)',
              }}
            >
              Everything on today's list is ticked off. Nothing carries over.
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button className="pillBtn" onClick={onCarry}>
            Carry Over
          </button>
          <button className="pillBtn ghost" onClick={onAllDone}>
            Mark All Done
          </button>
        </div>
      </div>
    </div>
  )
}
