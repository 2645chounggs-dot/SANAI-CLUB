# V6.4.7 security candidate — do not publish before validation

This candidate reduces actual attack surface, not antivirus detection. A detection may persist; verify the original and new signed APK independently and obtain the scanner's reason. Do not bypass protection.

- Same application ID, legacy WebView home origin, storage keys and release signing workflow. No data deletion/migration is intended; only obsolete OTA metadata and cached installer are removed.
- Remove installation and overlay permissions, stop in-app APK installation and OTA JavaScript execution, use official signed release page; full-screen rest alert works only while app is foreground. Background alert needs user-enabled notification permission.
- Target SDK 35 and explicit notification request; exact alarms remain optional for the timer.
- Restrict WebView file access and remote requests; external pages open outside app. Check real-device food search (file-origin CORS), backup import/export and Android 15+ edge-to-edge before release.

## Release gates (not yet completed)
1. Candidate checks and compilation pass. Existing tests must pass.
2. On a test device with an independently verified V6.4.6 APK and representative non-sensitive records: export backup, install same-cert signed candidate as an upgrade, verify all workout/food records, widgets, backup import/export, offline and online food entry, sync, foreground/background timer, alert permission and display layout. Never uninstall to force upgrade.
3. Compare signer certificate and SHA-256, audit dependencies/build provenance, inspect scanner detection reason and submit false-positive review only if independently established. No claim of malware-free or data preservation from static checks alone.
4. Only merge/publish after review. Existing main and production release are not changed by this candidate.
