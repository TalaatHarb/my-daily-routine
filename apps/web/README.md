# My Daily Routine — Web

React 19 + Vite single-page app, installable as a PWA, in English and Arabic (RTL).

```powershell
cp .env.example .env     # optional, defaults target the local stack
npm run dev              # http://localhost:5173
npm run lint             # oxlint
npm run test             # vitest
npm run build            # type-check + production build (dist/)
npm run preview          # serve dist/ on http://localhost:4173 (service worker active)
npm run generate-pwa-assets   # regenerate icons from public/favicon.svg
```

## Structure

```text
src/
  main.tsx            providers: theme → OIDC auth → react-query → toasts → router
  App.tsx             auth gate (landing / splash / error) → GET /me → routes
  components/         Layout + Sidebar, QuickAdd, TaskList/TaskItem, TaskEditor, ActionMenu, Dialog,
                      LabelInputs (category/tag comboboxes), LabelBadge, ColorPicker, Toaster, Icon
  pages/              DayPage, TaskCollectionPage (upcoming/overdue/all), LabelsPage, SettingsPage, LandingPage
  hooks/              queries.ts (API hooks + optimistic mutations), useBrowser.ts (media queries, online, today)
  lib/                api client, auth config, runtime environment, dates, colors, theme, toasts
  i18n/               i18next setup and locales/en.json, locales/ar.json
  types/api.ts        API contracts
```

## Notes

- **Translations:** add every user-facing string to both `en.json` and `ar.json`.
- **RTL:** use CSS logical properties (`margin-inline-start`, `inset-inline-end`, …). Icons that point in a
  direction are listed in `Icon.tsx` and mirrored automatically in RTL.
- **Runtime configuration:** the container's `docker-entrypoint.sh` writes `/env-config.js` from the `VITE_*`
  variables, so a single image works in every environment.
- **Today:** "today" is the browser's local date. The UI always sends explicit dates to the API.
