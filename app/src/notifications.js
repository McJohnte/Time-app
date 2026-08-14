import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification'

export async function ensurePermission() {
  let granted = await isPermissionGranted()
  if (!granted) granted = (await requestPermission()) === 'granted'
  return granted
}

export async function notifyReminder(openCount) {
  if (!(await ensurePermission())) return
  sendNotification({
    title: 'TIE Timer',
    body: openCount
      ? `${openCount} ${openCount === 1 ? 'task is' : 'tasks are'} still open. Carry them over or tick them off.`
      : 'The day is closed out. Nothing to carry over.',
  })
}
