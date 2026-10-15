# Changelog

Notable changes to `ui-boundary-helper` are documented here. New work goes under **Unreleased** and moves into a versioned section when it is published.

## [0.1.3] - 2026-10-15

### Added

- Added a boundary navigator with search and selection that scrolls to a component and opens its popup.
- Added per-boundary render history with total render count, recent average, and the ten latest measurements.
- Added popup minimize and expand controls. Minimize and transparency preferences apply to all boundary popups, while pinning remains independent for each popup.
- Added a darker tint for the boundary whose popup is open. The highlight follows the background tint settings and stays active while the popup is pinned or minimized.
- Added persistent settings for boundary visibility, background tint, per-kind visibility and tint, popup minimize and transparency, and toolbar appearance.
- Added a **Reset UI settings** control to restore the default boundary, popup, filter, and toolbar settings.
- Added install commands for npm, pnpm, Yarn, and Bun, with troubleshooting for npm's `Cannot read properties of null (reading 'matches')` error.

### Changed

- Clarified that `BoundaryProvider` belongs as the first direct child of `<body>` in the root layout.
- Delay boundary annotations until saved settings have loaded, preventing default settings from briefly appearing on refresh.
