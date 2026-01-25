# One-time monday.com migration

Run these scripts locally (do not deploy them).

## monday → Supabase (clients/projects/tasks/subtasks)

Script: `scripts/monday-import.mjs`

### Create env file (not committed)

Create `scout-admin/.env.monday`:

```bash
MONDAY_TOKEN=...
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

### Run

From `scout-admin/`:

```bash
npm run migrate:monday
```

### Notes

- Uses monday cursor pagination (`items_page` + `next_items_page`).
- Clients board: items = clients, subitems = projects.
- Tasks board: items = tasks, subitems = subtasks.
- Tasks are matched to projects by a “Project” column (if present), otherwise by group title.
- Unmapped tasks are saved to `scripts/monday-import.unmapped-tasks.json`.

