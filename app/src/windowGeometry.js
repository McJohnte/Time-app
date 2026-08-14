import { getCurrentWindow, LogicalPosition, LogicalSize, currentMonitor } from '@tauri-apps/api/window'

export const PANEL = { vertical: { w: 286, h: 720 }, horizontal: { w: 900, h: 148 } }
export const PEEK = { vertical: { w: 250, h: 46 }, horizontal: { w: 250, h: 46 } }
export const REST = { vertical: { w: 14, h: 130 }, horizontal: { w: 130, h: 14 } }

const MARGIN = 12

export function sizeFor(state, orientation) {
  const table = state === 'panel' ? PANEL : state === 'peek' ? PEEK : REST
  return table[orientation]
}

/** Top-left position that pins `size` against `edge` on the work area. */
function positionFor(size, edge, area) {
  const { x, y, width, height } = area
  switch (edge) {
    case 'left':
      return { x: x + MARGIN, y: y + Math.round((height - size.h) / 2) }
    case 'right':
      return { x: x + width - size.w - MARGIN, y: y + Math.round((height - size.h) / 2) }
    case 'top':
      return { x: x + Math.round((width - size.w) / 2), y: y + MARGIN }
    default:
      return { x: x + Math.round((width - size.w) / 2), y: y + height - size.h - MARGIN }
  }
}

export async function applyGeometry(state, orientation, edge) {
  const win = getCurrentWindow()
  const mon = await currentMonitor()
  if (!mon) return
  const scale = mon.scaleFactor || 1
  const area = {
    x: mon.position.x / scale,
    y: mon.position.y / scale,
    width: mon.size.width / scale,
    height: mon.size.height / scale,
  }
  const base = sizeFor(state, orientation)
  const size = {
    w: Math.min(base.w, area.width - MARGIN * 2),
    h: Math.min(base.h, area.height - MARGIN * 2),
  }
  const pos = positionFor(size, edge, area)
  await win.setSize(new LogicalSize(size.w, size.h))
  await win.setPosition(new LogicalPosition(pos.x, pos.y))
}

export async function show() {
  const win = getCurrentWindow()
  await win.show()
}
