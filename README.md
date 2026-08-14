# TIE Timer

A desktop time-tracking widget for macOS and Windows. One task runs at a time, the day's total keeps
time while something is tracking, and the panel slides off your chosen screen edge when you leave it
alone — leaving a translucent peek of whatever is still running, or a bare sliver when nothing is.

Built with [Tauri v2](https://tauri.app) (Rust + system webview) and React. All data lives in one
local SQLite file; nothing leaves your machine.

## Layout

```
TIE Timer.dc.html      the original design canvas (reference, not shipped)
assets/                the TIE logo
app/                   the actual application
  src/                 React front end
  src-tauri/           Rust shell: tray, windows, SQLite migrations
.github/workflows/     CI that builds installers for both platforms
```

## Running it in development

You need [Node](https://nodejs.org) 20+ and [Rust](https://rustup.rs).

```bash
cd app && npm install && npm run tauri dev
```

## Building installers

```bash
cd app && npm run tauri build
```

Artifacts land in `app/src-tauri/target/release/bundle/` — `.dmg` and `.app` on macOS, `.msi` and an
NSIS `.exe` on Windows. A build only produces installers for the platform it runs on, so the Windows
installer is produced by CI rather than from a Mac.

### Release builds via CI

Pushing a `v*` tag runs `.github/workflows/release.yml`, which builds on both `macos-latest` and
`windows-latest` and attaches the installers to a **draft** GitHub Release:

```bash
git tag v0.1.0 && git push origin v0.1.0
```

Review the draft release, then publish it.

Builds are **unsigned** (no paid Apple/Windows certificate is configured), so first launch needs a
nudge:

- **macOS** — right-click the app → Open, then confirm. Or `xattr -cr "/Applications/TIE Timer.app"`.
- **Windows** — SmartScreen shows "Windows protected your PC" → More info → Run anyway.

To sign properly later, add the relevant secrets and fill in `bundle.macOS.signingIdentity` /
`bundle.windows.certificateThumbprint` in `app/src-tauri/tauri.conf.json`.

## How it behaves

**The dock.** The widget pins itself to a screen edge and is always on top, with no taskbar or Dock
entry — it lives in the tray/menu bar. It has three resting states:

| State | When | What you see |
| --- | --- | --- |
| Panel | You're using it | The full task list |
| Peek | Idle, something tracking | A pill with the running task, its colour and clock, and a stop button |
| Sliver | Idle, nothing tracking | A 7px gradient sliver; click to bring the panel back |

Auto-hide kicks in after `autoHideSeconds` (default 6) without interaction.

**Tasks.** Name them, give each a colour and a note, and break them into steps with their own
checkboxes. Exactly one task runs at a time; starting another stops the first. The task checkbox and
the reminder read the same list.

**End of day.** At `reminderTime` (default 17:30) the app fires a native notification and shows the
reminder card in the widget with everything still open. *Carry Over* keeps the unticked tasks and
their notes for tomorrow with the clocks back at zero; *Mark All Done* closes the day out.

**Midnight.** The same carry-over runs automatically when the date changes: ticked tasks are cleared,
unticked ones survive with their clocks reset, and the day is written to history.

**Weekly review.** A separate real window (tray → Weekly Review, or *Review* in the widget footer)
showing the current Mon–Fri: time per task, a stacked per-day chart, and a few observations. It reads
logged history, so it fills in as the week goes on.

## Settings

Stored in `settings.json` in the app's data directory.

| Key | Default | Meaning |
| --- | --- | --- |
| `orientation` | `vertical` | `vertical` (side dock) or `horizontal` (top/bottom bar) |
| `edge` | `right` | `left`/`right` when vertical, `top`/`bottom` when horizontal |
| `autoHideSeconds` | `6` | Idle delay before the panel slides away |
| `idleOpacity` | `0.55` | Opacity of the peek and sliver states |
| `reminderTime` | `17:30` | When the end-of-day reminder fires |

## Data

One SQLite file (`tie-timer.db`) in the app's data directory:

- `tasks` / `checklist_items` — the current list
- `time_logs` — one row per task per day, written incrementally every 15s so history survives a crash
  and doesn't depend on the app being open exactly at midnight
- `app_state` — the running day total and last-seen date

Deleting that file resets the app.
