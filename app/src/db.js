import Database from '@tauri-apps/plugin-sql'

let db = null

export async function open() {
  if (!db) db = await Database.load('sqlite:tie-timer.db')
  return db
}

export function today() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export async function loadTasks() {
  const d = await open()
  const rows = await d.select('SELECT * FROM tasks ORDER BY position ASC, created_at ASC')
  const items = await d.select('SELECT * FROM checklist_items ORDER BY position ASC')
  return rows.map((t) => ({
    id: t.id,
    name: t.name,
    note: t.note,
    color: t.color,
    seconds: t.seconds,
    done: !!t.done,
    expanded: false,
    items: items
      .filter((i) => i.task_id === t.id)
      .map((i) => ({ id: i.id, text: i.text, done: !!i.done })),
  }))
}

export async function insertTask(t, position) {
  const d = await open()
  await d.execute(
    'INSERT INTO tasks (id, name, note, color, seconds, done, position, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
    [t.id, t.name, t.note, t.color, t.seconds, t.done ? 1 : 0, position, new Date().toISOString()]
  )
}

export async function updateTask(id, fields) {
  const d = await open()
  const cols = []
  const vals = []
  for (const [k, v] of Object.entries(fields)) {
    if (!['name', 'note', 'color', 'seconds', 'done'].includes(k)) continue
    cols.push(`${k} = $${cols.length + 1}`)
    vals.push(typeof v === 'boolean' ? (v ? 1 : 0) : v)
  }
  if (!cols.length) return
  vals.push(id)
  await d.execute(`UPDATE tasks SET ${cols.join(', ')} WHERE id = $${vals.length}`, vals)
}

export async function deleteTask(id) {
  const d = await open()
  await d.execute('DELETE FROM checklist_items WHERE task_id = $1', [id])
  await d.execute('DELETE FROM tasks WHERE id = $1', [id])
}

export async function replaceItems(taskId, items) {
  const d = await open()
  await d.execute('DELETE FROM checklist_items WHERE task_id = $1', [taskId])
  for (let i = 0; i < items.length; i++) {
    const it = items[i]
    await d.execute(
      'INSERT INTO checklist_items (id, task_id, text, done, position) VALUES ($1,$2,$3,$4,$5)',
      [it.id, taskId, it.text, it.done ? 1 : 0, i]
    )
  }
}

/** Incremental so history survives a crash and doesn't depend on being open at midnight. */
export async function logSeconds(date, task) {
  const d = await open()
  await d.execute(
    `INSERT INTO time_logs (date, task_id, task_name, color, seconds) VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT(date, task_id) DO UPDATE SET seconds = excluded.seconds, task_name = excluded.task_name, color = excluded.color`,
    [date, task.id, task.name || 'Untitled task', task.color, task.seconds]
  )
}

export async function getState(key) {
  const d = await open()
  const rows = await d.select('SELECT value FROM app_state WHERE key = $1', [key])
  return rows.length ? rows[0].value : null
}

export async function setState(key, value) {
  const d = await open()
  await d.execute(
    'INSERT INTO app_state (key, value) VALUES ($1,$2) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    [key, String(value)]
  )
}

/** Monday-start week containing `ref`, as YYYY-MM-DD strings for Mon..Fri. */
export function weekDates(ref = new Date()) {
  const d = new Date(ref)
  const dow = (d.getDay() + 6) % 7
  const monday = new Date(d)
  monday.setDate(d.getDate() - dow)
  return Array.from({ length: 5 }, (_, i) => {
    const x = new Date(monday)
    x.setDate(monday.getDate() + i)
    return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
  })
}

export async function weekRows(dates) {
  const d = await open()
  const ph = dates.map((_, i) => `$${i + 1}`).join(',')
  return d.select(
    `SELECT date, task_id, task_name, color, seconds FROM time_logs WHERE date IN (${ph}) AND seconds > 0`,
    dates
  )
}
