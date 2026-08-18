import {
  getCurrentWindow,
  LogicalPosition,
  LogicalSize,
  currentMonitor,
  primaryMonitor,
} from '@tauri-apps/api/window'

export const PANEL = { vertical: { w: 286, h: 720 }, horizontal: { w: 900, h: 148 } }
export const PEEK = { vertical: { w: 250, h: 46 }, horizontal: { w: 250, h: 46 } }
export const REST = { vertical: { w: 14, h: 130 }, horizontal: { w: 130, h: 14 } }

/** Overlay cards (settings, reminder, usage) need this much room to read properly. */
export const OVERLAY_MIN_H = 560
/** An expanded row adds swatches, a note field and the step list below the clock. */
export const EXPANDED_MIN_H = 330

const MARGIN = 12
/** Fallback inset for the macOS menu bar if a monitor reports no work area. */
const MENU_BAR_FALLBACK = navigator.userAgent.includes('Mac') ? 26 : 0

export function sizeFor(state, orientation, minH = 0) {
  if (state !== 'panel') return (state === 'peek' ? PEEK : REST)[orientation]
  const base = PANEL[orientation]
  // The horizontal bar is far too short to hold a card or an expanded row —
  // grow it to whatever the current content needs.
  return minH > base.h ? { w: base.w, h: minH } : base
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

export async function applyGeometry(state, orientation, edge, minH = 0) {
  const win = getCurrentWindow()
  // Anchor to the menu-bar screen. Without this the dock lands on whichever
  // monitor the window happened to open on, which can be off to one side.
  const mon = (await primaryMonitor()) || (await currentMonitor())
  if (!mon) return
  const scale = mon.scaleFactor || 1
  // The work area already excludes the macOS menu bar and Dock and the Windows
  // taskbar, so an always-on-top dock does not end up sitting under them.
  const wa = mon.workArea
  const area = wa
    ? {
        x: wa.position.x / scale,
        y: wa.position.y / scale,
        width: wa.size.width / scale,
        height: wa.size.height / scale,
      }
    : {
        x: mon.position.x / scale,
        y: mon.position.y / scale + MENU_BAR_FALLBACK,
        width: mon.size.width / scale,
        height: mon.size.height / scale - MENU_BAR_FALLBACK,
      }
  const base = sizeFor(state, orientation, minH)
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
