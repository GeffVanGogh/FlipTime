# FlipTime

FlipTime is a Windows desktop flip clock and clock tools suite. The clock face is the home screen: two large flip panels with the date and AM/PM on the hour card, and the weekday and live seconds on the minute card. The packaged desktop window is frameless, transparent around the cards, draggable, and always on top. Settings open from the gear; timers and other tools stay in a separate tools drawer.

## Included

- Live split-flap style clock with 12/24-hour time, seconds, date, themes, flip styles, horizontal or vertical layout, size, and corner radius.
- Full-screen clock preview and an optional idle-triggered full-screen mode while the desktop app is open.
- Focus study timer, configurable countdown timer, stopwatch with lap marks, event countdown, and alarms.
- World clock using the time zones available in the desktop runtime.
- Holiday calendars for the United States, United Kingdom, and Kenya, with dates calculated for the selected year.
- Locally saved appearance settings, alarms, and world clock locations.

## Run on Windows

For an app-style preview using Microsoft Edge, double-click `Open FlipTime.cmd`. This does not install anything. Keep the project folder in place so the launcher can find the clock files. Edge cannot make its native window transparent; use the packaged Electron desktop app for the transparent floating window.

Install Node.js (which includes npm), open a terminal in this folder, then run:

```powershell
npm install
npm start
```

To make a Windows installer:

```powershell
npm run dist
```

The installer is created in the `dist` folder. Electron and electron-builder are downloaded by `npm install`, so an internet connection is needed for the initial setup.

## Notes

This is an original implementation of the general flip-clock idea and contains no third-party clock code, branding, or assets. The idle display is managed by the app while it is running; Windows does not yet launch it as a native `.scr` screensaver. Alarm reminders also require the app to remain open. Holidays are a practical calendar selection rather than a complete official public-holiday feed.
