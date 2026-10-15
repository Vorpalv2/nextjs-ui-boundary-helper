# Changelog

Notable changes to `ui-boundary-helper` are documented here. Entries under **Unreleased** will be assigned a version and release date when that version is published.

## Unreleased

### Added

- Added popup minimize and expand controls. Minimize and transparency preferences apply to all boundary popups, while pinning remains independent for each popup.
- Added a darker tint for the boundary whose popup is open. The highlight follows the background tint settings and stays active while the popup is pinned or minimized.
- Added persistent settings for boundary visibility, background tint, per-kind visibility and tint, popup minimize and transparency, and toolbar appearance.
- Added a **Reset UI settings** control to restore the default boundary, popup, filter, and toolbar settings.
- Added install commands for npm, pnpm, Yarn, and Bun, with troubleshooting for npm's `Cannot read properties of null (reading 'matches')` error.

### Changed

- Clarified that `BoundaryProvider` belongs as the first direct child of `<body>` in the root layout.
- Delay boundary annotations until saved settings have loaded, preventing default settings from briefly appearing on refresh.
