# MegaHertz Studio v3

Run `node --test tests/megahertz-studio-core.test.cjs` (Node 20+).

The console loads `aire/megahertz-studio-core.js` before its existing transport. No external runtime or account service is added.

- AIR uses one Web Audio destination. CUE uses separate media elements and requires a distinct physical output. Missing or aliased CUE outputs are rejected; there is no fallback to AIR.
- Advertising spots and breaks have separate persistent records. Only naturally completed, unskipped spots with full playback coverage count as complete. Interrupted, failed, skipped and muted playback remain separate. Preview is excluded.
- Events support dates, weekdays, multiple times, priority, exact/end-of-track policies and maximum recovery age. Pending occurrences persist; running occurrences recovered after a reload become interrupted, never complete. Expired events require explicit manual replay. Station time defaults to America/Argentina/Buenos_Aires.
- Institutional events can interrupt/resume or overlay music with ducking. Programs and start/stop commands use the same occurrence journal. Browser autoplay policies still require a user gesture after opening the console.
- Fade, overlap, duck attack/release, RMS AGC, master gain and compressor settings are configurable. Metering observes the final AIR bus. The compressor is not a true-peak limiter or certified loudness processor.
- Configuration uses one draft for Save/Cancel, including media, institutional schedules, events, language and weather selection. Database-write failures restore the previous libraries and settings. Existing live playback is not stopped by opening configuration.
- Local administrator/operator permissions use a salted PBKDF2 verifier. No default password is created. The owner must set their own password under Permissions. This protects console controls on that browser, not the server or other computers; it is not multi-user authentication.
- Full `.mhbackup` files contain saved configuration, four playlists, commercial assets, institutional assets, occurrence state and emission logs. Audio is deduplicated and checked with SHA-256. Restore is staged until Save, requires stopped playback, preserves the current administrator password, and rolls back on write failure. Older configuration JSON files remain importable.
- Web Locks prevents simultaneous playback/scheduling in two modern-browser tabs on the same origin. The console must remain open; this is not a server-side scheduler. Storage and backups belong to the browser/origin where they are created. Use the canonical www address consistently.

Manual QA performed with generated WAV fixtures: playback and display, exact 12 dB ducking, complete and interrupted advertising, CSV export, fail-closed preview, institutional event execution, Save/Cancel. Archive integrity/corruption, timezones, recovery, expiry, priority, password verification and graph topology also have automated coverage. Physical dual-output routing requires two audio devices on the station computer.
