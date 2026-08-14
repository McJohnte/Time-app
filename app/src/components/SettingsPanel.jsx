import { EDGES } from '../store'
import { Cross } from '../icons'

function Chip({ on, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        padding: '8px 10px',
        borderRadius: 999,
        cursor: 'pointer',
        fontFamily: 'var(--sans)',
        fontWeight: 600,
        fontSize: 12,
        transition: 'all 180ms ease',
        border: `1px solid ${on ? 'transparent' : 'rgba(147,0,255,0.35)'}`,
        background: on ? 'linear-gradient(135deg, #4500ff, #b300ff)' : 'transparent',
        color: on ? '#fff' : 'rgba(255,255,255,0.6)',
      }}
    >
      {children}
    </button>
  )
}

function Field({ label, hint, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      <span className="label">{label}</span>
      {children}
      {hint && (
        <span style={{ fontSize: 11, lineHeight: 1.4, color: 'rgba(255,255,255,0.35)' }}>{hint}</span>
      )}
    </div>
  )
}

const EDGE_LABEL = { left: 'Left', right: 'Right', top: 'Top', bottom: 'Bottom' }

export default function SettingsPanel({ settings, onDock, onChange, onClose }) {
  const orientation = settings?.orientation ?? 'vertical'
  const edge = settings?.edge ?? 'right'

  return (
    <div className="overlay">
      <div className="card" style={{ gap: 16, maxHeight: '100%', overflowY: 'auto' }}>
        <div className="brandRow">
          <span className="brand">Settings</span>
          <span className="spacer" />
          <button
            className="iconBtn"
            title="Close"
            onClick={onClose}
            style={{ width: 18, height: 18, color: 'rgba(255,255,255,0.35)' }}
          >
            <Cross size={10} w={2.6} />
          </button>
        </div>

        <Field label="Dock" hint="Vertical sits on a side edge, horizontal spans the top or bottom.">
          <div style={{ display: 'flex', gap: 8 }}>
            <Chip on={orientation === 'vertical'} onClick={() => onDock('vertical', edge)}>
              Vertical
            </Chip>
            <Chip on={orientation === 'horizontal'} onClick={() => onDock('horizontal', edge)}>
              Horizontal
            </Chip>
          </div>
        </Field>

        <Field label="Edge">
          <div style={{ display: 'flex', gap: 8 }}>
            {EDGES[orientation].map((e) => (
              <Chip key={e} on={edge === e} onClick={() => onDock(orientation, e)}>
                {EDGE_LABEL[e]}
              </Chip>
            ))}
          </div>
        </Field>

        <Field label="Hide after" hint="Seconds of no interaction before the panel slides away.">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              type="range"
              min="2"
              max="30"
              step="1"
              value={settings?.autoHideSeconds ?? 6}
              onChange={(e) => onChange('autoHideSeconds', Number(e.target.value))}
              style={{ flex: 1, accentColor: '#b300ff' }}
            />
            <span
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 12,
                minWidth: 34,
                textAlign: 'right',
                color: 'rgba(255,255,255,0.75)',
              }}
            >
              {settings?.autoHideSeconds ?? 6}s
            </span>
          </div>
        </Field>

        <Field label="Resting opacity" hint="How faint the peek pill and sliver look when idle.">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              type="range"
              min="0.15"
              max="1"
              step="0.05"
              value={settings?.idleOpacity ?? 0.55}
              onChange={(e) => onChange('idleOpacity', Number(e.target.value))}
              style={{ flex: 1, accentColor: '#b300ff' }}
            />
            <span
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 12,
                minWidth: 34,
                textAlign: 'right',
                color: 'rgba(255,255,255,0.75)',
              }}
            >
              {Math.round((settings?.idleOpacity ?? 0.55) * 100)}%
            </span>
          </div>
        </Field>

        <Field label="End-of-day reminder" hint="24-hour time, e.g. 17:30.">
          <input
            className="noteInput"
            value={settings?.reminderTime ?? '17:30'}
            onChange={(e) => onChange('reminderTime', e.target.value)}
            placeholder="17:30"
            spellCheck={false}
            style={{ fontFamily: 'var(--mono)' }}
          />
        </Field>
      </div>
    </div>
  )
}
