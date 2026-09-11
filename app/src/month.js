import { weekDates, weekRows } from './db'
import { fmtH } from './store'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const keyOf = (r) => (r.task_name || '').trim().toLowerCase() || `#${r.task_id}`

/** One row per working week that touches the month, with its total and top task. */
export async function monthSummary(year, month) {
  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0)

  // Walk Mondays from the one on or before the 1st until we pass month end.
  const monday = new Date(first)
  monday.setDate(first.getDate() - ((first.getDay() + 6) % 7))

  const weeks = []
  while (monday <= last) {
    const dates = weekDates(monday)
    const rows = await weekRows(dates)

    const byTask = new Map()
    let total = 0
    for (const r of rows) {
      const k = keyOf(r)
      const hit = byTask.get(k) || { name: r.task_name || 'Untitled task', color: r.color, hours: 0 }
      hit.hours += r.seconds / 3600
      hit.name = r.task_name || hit.name
      byTask.set(k, hit)
      total += r.seconds / 3600
    }
    const top = [...byTask.values()].sort((a, b) => b.hours - a.hours)[0] || null

    weeks.push({
      weekStart: dates[0],
      label: `Week of ${monday.getDate()} ${SHORT[monday.getMonth()]}`,
      totalHours: total,
      hours: fmtH(total),
      count: byTask.size,
      top: top ? { name: top.name, color: top.color, hours: fmtH(top.hours), pct: total ? Math.round((top.hours / total) * 100) : 0 } : null,
    })
    monday.setDate(monday.getDate() + 7)
  }

  const totalHours = weeks.reduce((a, w) => a + w.totalHours, 0)
  const busiest = Math.max(0, ...weeks.map((w) => w.totalHours))
  const worked = weeks.filter((w) => w.totalHours > 0)

  return {
    label: `${MONTHS[month]} ${year}`,
    year,
    month,
    empty: totalHours === 0,
    totalHours,
    total: fmtH(totalHours),
    avg: worked.length ? fmtH(totalHours / worked.length) : '—',
    weeks: weeks.map((w) => ({
      ...w,
      barW: busiest > 0 ? `${((w.totalHours / busiest) * 100).toFixed(1)}%` : '0%',
      busiest: w.totalHours === busiest && busiest > 0,
    })),
  }
}
