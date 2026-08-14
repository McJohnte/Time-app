import { PALETTE, fmt } from '../store'
import { Tick, Chevron, Cross, Stop, Play } from '../icons'

const uid = () => Math.random().toString(36).slice(2, 10)

export default function TaskRow({ task: t, running, onToggle, onEdit, onDone, onRemove, onItems }) {
  const run = running
  const items = t.items || []
  const ticked = items.filter((i) => i.done).length

  return (
    <div
      className="row"
      style={{
        background: run ? 'rgba(147,0,255,0.14)' : 'rgba(12,8,36,0.42)',
        border: `1px solid ${run ? 'rgba(147,0,255,0.5)' : 'rgba(147,0,255,0.14)'}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <button
          className="check"
          title="Mark done"
          onClick={() => onDone(!t.done)}
          style={{ background: t.done ? t.color : 'transparent', border: `1.5px solid ${t.color}` }}
        >
          {t.done && <Tick />}
        </button>
        <input
          className="nameInput"
          value={t.name}
          onChange={(e) => onEdit({ name: e.target.value })}
          placeholder="Name this task"
          spellCheck={false}
          style={{ textDecoration: t.done ? 'line-through' : 'none', opacity: t.done ? 0.42 : 1 }}
        />
        <button
          className="iconBtn chev"
          title="Colour and note"
          onClick={() => onEdit({ expanded: !t.expanded })}
          style={{
            color: t.expanded ? '#ffaf00' : 'rgba(255,255,255,0.28)',
            transform: t.expanded ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        >
          <Chevron />
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className="taskTime" style={{ color: run ? '#fff' : 'rgba(255,255,255,0.5)' }}>
          {fmt(t.seconds)}
        </span>
        <span className="spacer" />
        <button className="iconBtn removeBtn" title="Remove task" onClick={onRemove}>
          <Cross />
        </button>
        <button
          className="playBtn"
          title={run ? 'Stop' : 'Start'}
          onClick={onToggle}
          style={{
            background: run ? 'linear-gradient(135deg, #4500ff, #b300ff)' : 'transparent',
            border: `1.5px solid ${run ? 'rgba(179,0,255,0.9)' : 'rgba(147,0,255,0.4)'}`,
            boxShadow: run ? '0 0 22px rgba(147,0,255,0.55)' : 'none',
          }}
        >
          {run ? <Stop /> : <Play />}
        </button>
      </div>

      {t.expanded && (
        <div className="expandArea">
          <div style={{ display: 'flex', gap: 7 }}>
            {PALETTE.map((c) => (
              <button
                key={c}
                className="swatch"
                title={c}
                onClick={() => onEdit({ color: c })}
                style={{ background: c, border: `2px solid ${c === t.color ? '#fff' : 'transparent'}` }}
              />
            ))}
          </div>
          <input
            className="noteInput"
            value={t.note}
            onChange={(e) => onEdit({ note: e.target.value })}
            placeholder="Add a note"
          />
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
                  onChange={(e) =>
                    onItems((l) => l.map((x) => (x.id === i.id ? { ...x, text: e.target.value } : x)))
                  }
                  style={{ textDecoration: i.done ? 'line-through' : 'none', opacity: i.done ? 0.45 : 1 }}
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
              <span
                style={{
                  flex: 'none',
                  width: 14,
                  height: 14,
                  borderRadius: 4,
                  border: '1.5px dashed rgba(147,0,255,0.4)',
                }}
              />
              <input
                className="stepInput"
                style={{ color: '#fff' }}
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
      )}

      {!t.expanded && !!t.note && (
        <span
          style={{
            fontSize: 11.5,
            lineHeight: 1.4,
            color: 'rgba(255,255,255,0.4)',
            paddingLeft: 26,
            marginTop: -3,
          }}
        >
          {t.note}
        </span>
      )}

      {!t.expanded && items.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 26, marginTop: -3 }}>
          <div
            style={{
              flex: 'none',
              width: 66,
              height: 3,
              borderRadius: 999,
              overflow: 'hidden',
              background: 'rgba(12,8,36,0.75)',
            }}
          >
            <div
              style={{
                height: '100%',
                borderRadius: 999,
                transition: 'width 300ms ease',
                width: `${(ticked / items.length) * 100}%`,
                background: t.color,
              }}
            />
          </div>
          <span
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 10.5,
              fontVariantNumeric: 'tabular-nums',
              color: 'rgba(255,255,255,0.42)',
            }}
          >
            {ticked}/{items.length} steps
          </span>
        </div>
      )}

      {run && (
        <div className="sweepTrack">
          <div className="sweep" />
        </div>
      )}
    </div>
  )
}
