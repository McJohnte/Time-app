import { load } from '@tauri-apps/plugin-store'

const DEFAULTS = {
  idleOpacity: 0.55,
  autoHideSeconds: 6,
  reminderTime: '17:30',
  orientation: 'vertical',
  edge: 'right',
}

let store = null

export async function loadSettings() {
  store = await load('settings.json', { autoSave: true })
  const out = { ...DEFAULTS }
  for (const k of Object.keys(DEFAULTS)) {
    const v = await store.get(k)
    if (v !== undefined && v !== null) out[k] = v
  }
  return out
}

export async function saveSetting(key, value) {
  if (!store) store = await load('settings.json', { autoSave: true })
  await store.set(key, value)
}
