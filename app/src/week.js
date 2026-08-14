import { weekDates, weekRows } from './db'
import { fmtH } from './store'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
const DAY_LONG = { Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday' }

export async function weekSummary(ref = new Date()) {
  const dates = weekDates(ref)
  const rows = await weekRows(dates)

  const byTask = new Map()
  for (const r of rows) {
    const hit = byTask.get(r.task_id) || {
      name: r.task_name || 'Untitled task',
      color: r.color,
      h: [0, 0, 0, 0, 0],
      total: 0,
    }
    const idx = dates.indexOf(r.date)
    const hours = r.seconds / 3600
    if (idx >= 0) hit.h[idx] += hours
    hit.total += hours
    hit.name = r.task_name || hit.name
    hit.color = r.color || hit.color
    byTask.set(r.task_id, hit)
  }

  const tasks = [...byTask.values()].sort((a, b) => b.total - a.total)
  const totalHours = tasks.reduce((a, t) => a + t.total, 0)
  const dayTotals = dates.map((_, i) => tasks.reduce((a, t) => a + t.h[i], 0))
  const maxDay = Math.max(0, ...dayTotals)
  const weekStart = dates[0]

  if (!tasks.length) {
    return { empty: true, weekStart, dates, tasks: [], days: [], totalHours: 0, notes: [] }
  }

  const nonZero = dayTotals.filter((v) => v > 0)
  const minDay = nonZero.length ? Math.min(...nonZero) : 0
  const spread = tasks.filter((t) => t.h.every((v) => v > 0)).sort((a, b) => Math.max(...a.h) - Math.max(...b.h))[0]

  const notes = []
  notes.push({
    text: `${tasks[0].name} took ${Math.round((tasks[0].total / totalHours) * 100)}% of the week${
      tasks[1] ? `, ${fmtH(tasks[0].total - tasks[1].total)} more than anything else.` : '.'
    }`,
  })
  if (spread) {
    notes.push({
      text: `${spread.name} showed up on all five days but never for longer than ${fmtH(
        Math.max(...spread.h)
      )} at a stretch. Worth batching.`,
    })
  }
  if (maxDay > 0 && minDay > 0 && maxDay !== minDay) {
    notes.push({
      text: `${DAY_LONG[DAYS[dayTotals.indexOf(minDay)]]} was the lightest day at ${fmtH(
        minDay
      )}, against a ${fmtH(maxDay)} peak on ${DAY_LONG[DAYS[dayTotals.indexOf(maxDay)]]}.`,
    })
  }

  return {
    empty: false,
    weekStart,
    dates,
    totalHours,
    avgHours: totalHours / DAYS.length,
    count: tasks.length,
    longest: maxDay > 0 ? `${DAYS[dayTotals.indexOf(maxDay)]} · ${fmtH(maxDay)}` : '—',
    tasks: tasks.map((t, i) => ({
      name: t.name,
      color: t.color,
      hours: fmtH(t.total),
      pct: `${Math.round((t.total / totalHours) * 100)}%`,
      barW: `${((t.total / tasks[0].total) * 100).toFixed(1)}%`,
      top: i === 0,
      nameColor: i === 0 ? '#ffffff' : 'rgba(255,255,255,0.82)',
    })),
    days: DAYS.map((d, i) => ({
      label: d,
      h: maxDay > 0 ? `${((dayTotals[i] / maxDay) * 100).toFixed(1)}%` : '0%',
      labelColor: dayTotals[i] === maxDay && maxDay > 0 ? '#ffaf00' : 'rgba(255,255,255,0.45)',
      segs: tasks
        .filter((t) => t.h[i] > 0)
        .map((t) => ({ color: t.color, h: `${((t.h[i] / dayTotals[i]) * 100).toFixed(1)}%` })),
    })),
    notes,
  }
}
