# Future improvements

Ideas collected for later, many adapted from the activity-dag project. Each one is meant to keep the default
"type a task, tick it off" experience as simple as it is today.

## Views

- **Board view:** a Kanban board grouped by status (To do / In progress / Done) or by category, with drag & drop
  between columns to change status or category.
- **Calendar view:** 3-day, week and month layouts. Drag tasks to reschedule them, and resize timed tasks to change
  their duration (the end time is calculated from start time + duration).
- **Timeline of the day:** timed tasks placed on an hour grid next to the untimed list.
- **Scheduled / unscheduled split:** a filter or section for tasks with and without a start time.

## Planning helpers

- **Recurring tasks:** daily, weekdays, weekly or monthly routines generated automatically. This fits the "daily
  routine" theme well.
- **Projects / lists:** optional groups above categories for larger goals, with duplicate-project support (copy a
  list of tasks to a new date range).
- **Reorder by drag:** a manual order within a day using the existing `sortOrder` field.
- **Smart quick add:** parse phrases such as "Gym tomorrow 7am #health" into date, time and category (English and
  Arabic).
- **Carry-over prompt:** at the start of a day, offer to move yesterday's unfinished tasks to today.
- **Bulk actions:** multi-select to move, complete, recategorize or delete.

## Filters & search

- **Filter chips** for status, category and tag on every view, combinable and persisted in the URL.
- **Search suggestions** from task names, categories and tags while typing.
- **Saved filters** pinned in the sidebar.

## Reminders & offline

- **Reminders / notifications** via web push from the PWA, with snooze options (5 min, 1 hour, tomorrow).
- **Offline queue:** let mutations made offline sync automatically when back online (background sync).

## Data

- **JSON import/export** of tasks, categories and tags (backup and migration), plus CSV export.
- **Statistics:** completion streaks, done-per-day chart, and time spent per category (from durations).
- **Task history:** a simple audit of status changes and moves.

## Platform

- Account deletion and data export from Settings (GDPR-friendly).
- More languages. The i18n setup and RTL support already make this a matter of adding translation files.
- Keyboard shortcuts (e.g. `n` new task, `t` today, `/` search).
