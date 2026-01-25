import { createClient } from '@supabase/supabase-js';

/**
 * One-time monday.com -> Supabase migration script.
 *
 * Run from scout-admin/:
 *   node --env-file=.env.monday scripts/monday-import.mjs
 *
 * Required env vars:
 *   MONDAY_TOKEN=...
 *   SUPABASE_URL=...                 (or NEXT_PUBLIC_SUPABASE_URL)
 *   SUPABASE_SERVICE_ROLE_KEY=...    (preferred) or NEXT_PUBLIC_SUPABASE_ANON_KEY
 *
 * Optional:
 *   MONDAY_CLIENTS_BOARD_ID=5090379230
 *   MONDAY_TASKS_BOARD_ID=5090379266
 *   DRY_RUN=1
 *   DUMP_ONLY=1
 */

const MONDAY_API_URL = 'https://api.monday.com/v2';
const DEFAULT_CLIENTS_BOARD_ID = 5090379230;
const DEFAULT_TASKS_BOARD_ID = 5090379266;
const PAGE_LIMIT = 500;

function env(name, fallback) {
  const v = process.env[name];
  return v === undefined || v === '' ? fallback : v;
}

function requireEnv(name) {
  const v = env(name, undefined);
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

function truthy(v) {
  return v === '1' || v === 'true' || v === 'TRUE' || v === 'yes' || v === 'YES';
}

function normalizeKey(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\p{L}\p{N} ]/gu, '');
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function pickColumn(columns, wantedMatchers) {
  // wantedMatchers: array of { test: (title, type) => boolean, weight: number }
  let best = null;
  for (const c of columns || []) {
    for (const m of wantedMatchers) {
      if (!m.test(c.title, c.type)) continue;
      const score = m.weight;
      if (!best || score > best.score) best = { col: c, score };
    }
  }
  return best?.col || null;
}

function getColText(item, colId) {
  if (!colId) return '';
  const cv = (item.column_values || []).find((x) => x.id === colId);
  return (cv?.text || '').trim();
}

function parseDateOnly(s) {
  const t = String(s || '').trim();
  // Accept: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  return null;
}

function mapProjectStatus(text) {
  const t = normalizeKey(text);
  if (!t) return 'active';
  if (t.includes('pause')) return 'paused';
  if (t.includes('cancel')) return 'cancelled';
  if (t.includes('complete') || t === 'done') return 'completed';
  return 'active';
}

function mapTaskStatus(text) {
  const t = normalizeKey(text);
  if (!t) return 'todo';
  if (t.includes('block') || t.includes('stuck')) return 'blocked';
  if (t.includes('done') || t.includes('complete') || t.includes('approved')) return 'done';
  if (t.includes('work') || t.includes('progress') || t.includes('doing')) return 'in_progress';
  return 'todo';
}

async function mondayGraphql(token, query, variables) {
  const res = await fetch(MONDAY_API_URL, {
    method: 'POST',
    headers: {
      Authorization: token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      `monday API HTTP ${res.status}: ${JSON.stringify(json).slice(0, 2000)}`
    );
  }
  if (json.errors?.length) {
    throw new Error(`monday GraphQL error: ${JSON.stringify(json.errors).slice(0, 2000)}`);
  }
  return json.data;
}

async function getBoardMeta(token, boardId) {
  const q = `
    query ($boardId: [ID!]) {
      boards(ids: $boardId) {
        id
        name
        columns { id title type }
      }
    }
  `;
  const data = await mondayGraphql(token, q, { boardId: [String(boardId)] });
  const b = data?.boards?.[0];
  if (!b) throw new Error(`Board not found: ${boardId}`);
  return b;
}

async function getBoardItemsWithCursor(token, boardId, { includeSubitems = true } = {}) {
  const items = [];

  const itemFields = `
    id
    name
    group { id title }
    column_values { id text value type }
    ${includeSubitems ? 'subitems { id name column_values { id text value type } }' : ''}
  `;

  const firstQ = `
    query ($boardId: [ID!], $limit: Int) {
      boards(ids: $boardId) {
        items_page(limit: $limit) {
          cursor
          items { ${itemFields} }
        }
      }
    }
  `;

  const nextQ = `
    query ($cursor: String!, $limit: Int) {
      next_items_page(cursor: $cursor, limit: $limit) {
        cursor
        items { ${itemFields} }
      }
    }
  `;

  let cursor = null;
  {
    const data = await mondayGraphql(token, firstQ, {
      boardId: [String(boardId)],
      limit: PAGE_LIMIT,
    });
    const page = data?.boards?.[0]?.items_page;
    for (const it of page?.items || []) items.push(it);
    cursor = page?.cursor || null;
  }

  while (cursor) {
    await sleep(150);
    const data = await mondayGraphql(token, nextQ, { cursor, limit: PAGE_LIMIT });
    const page = data?.next_items_page;
    for (const it of page?.items || []) items.push(it);
    cursor = page?.cursor || null;
  }

  return items;
}

function createSupabase() {
  const supabaseUrl = env('SUPABASE_URL', env('NEXT_PUBLIC_SUPABASE_URL', ''));
  const supabaseKey =
    env('SUPABASE_SERVICE_ROLE_KEY', '') || env('NEXT_PUBLIC_SUPABASE_ANON_KEY', '');
  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Missing Supabase env vars. Set SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY).'
    );
  }
  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function findOrCreateClient(supabase, { name, company, email }, { dryRun }) {
  const cleanEmail = String(email || '').trim().toLowerCase();
  if (!cleanEmail) throw new Error('Client email is required (cannot be empty).');

  const existing = await supabase
    .from('clients')
    .select('*')
    .eq('email', cleanEmail)
    .limit(1);

  if (existing.error) throw existing.error;
  if (existing.data?.[0]) return existing.data[0];

  if (dryRun) return { id: `dryrun-client:${cleanEmail}`, name, company, email: cleanEmail };

  const inserted = await supabase
    .from('clients')
    .insert([{ name, company, email: cleanEmail }])
    .select('*')
    .single();
  if (inserted.error) throw inserted.error;
  return inserted.data;
}

async function findOrCreateProject(
  supabase,
  { client_id, name, status, start_date, end_date },
  { dryRun }
) {
  const existing = await supabase
    .from('projects')
    .select('*')
    .eq('client_id', client_id)
    .eq('name', name)
    .limit(1);
  if (existing.error) throw existing.error;
  if (existing.data?.[0]) return existing.data[0];

  if (dryRun) {
    return { id: `dryrun-project:${client_id}:${name}`, client_id, name, status, start_date, end_date };
  }

  const inserted = await supabase
    .from('projects')
    .insert([
      {
        client_id,
        name,
        status,
        start_date,
        end_date,
        contract_value_cents: 0,
        currency: 'USD',
      },
    ])
    .select('*')
    .single();
  if (inserted.error) throw inserted.error;
  return inserted.data;
}

async function findOrCreateTask(
  supabase,
  { project_id, title, status, sort_order },
  { dryRun }
) {
  const existing = await supabase
    .from('tasks')
    .select('*')
    .eq('project_id', project_id)
    .eq('title', title)
    .limit(1);
  if (existing.error) throw existing.error;
  if (existing.data?.[0]) return existing.data[0];

  if (dryRun) return { id: `dryrun-task:${project_id}:${title}`, project_id, title, status, sort_order };

  const inserted = await supabase
    .from('tasks')
    .insert([{ project_id, title, status, sort_order }])
    .select('*')
    .single();
  if (inserted.error) throw inserted.error;
  return inserted.data;
}

async function findOrCreateSubtask(
  supabase,
  { task_id, title, status, sort_order },
  { dryRun }
) {
  const existing = await supabase
    .from('subtasks')
    .select('*')
    .eq('task_id', task_id)
    .eq('title', title)
    .limit(1);
  if (existing.error) throw existing.error;
  if (existing.data?.[0]) return existing.data[0];

  if (dryRun) {
    return { id: `dryrun-subtask:${task_id}:${title}`, task_id, title, status, sort_order };
  }

  const inserted = await supabase
    .from('subtasks')
    .insert([{ task_id, title, status, sort_order }])
    .select('*')
    .single();
  if (inserted.error) throw inserted.error;
  return inserted.data;
}

function extractLinkedItemIdsFromValue(value) {
  if (!value) return [];
  let parsed = value;
  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value);
    } catch {
      return [];
    }
  }
  const ids = [];
  const walk = (obj) => {
    if (!obj || typeof obj !== 'object') return;
    if (Array.isArray(obj)) return obj.forEach(walk);
    for (const [k, v] of Object.entries(obj)) {
      if (
        (k === 'linkedPulseIds' || k === 'linkedItemIds' || k === 'linked_pulse_ids') &&
        Array.isArray(v)
      ) {
        for (const entry of v) {
          if (typeof entry === 'number' || typeof entry === 'string') ids.push(String(entry));
          if (entry && typeof entry === 'object' && ('linkedPulseId' in entry || 'linkedItemId' in entry)) {
            const lp = entry.linkedPulseId ?? entry.linkedItemId;
            if (lp !== undefined && lp !== null) ids.push(String(lp));
          }
        }
      }
      walk(v);
    }
  };
  walk(parsed);
  return Array.from(new Set(ids));
}

async function main() {
  const token = requireEnv('MONDAY_TOKEN');
  const clientsBoardId = Number(env('MONDAY_CLIENTS_BOARD_ID', DEFAULT_CLIENTS_BOARD_ID));
  const tasksBoardId = Number(env('MONDAY_TASKS_BOARD_ID', DEFAULT_TASKS_BOARD_ID));
  const dryRun = truthy(env('DRY_RUN', '0'));
  const dumpOnly = truthy(env('DUMP_ONLY', '0'));

  const supabase = createSupabase();

  console.log('[monday-import] Fetching board metadata...');
  const [clientsBoard, tasksBoard] = await Promise.all([
    getBoardMeta(token, clientsBoardId),
    getBoardMeta(token, tasksBoardId),
  ]);

  console.log('[monday-import] Fetching clients board items + subitems...');
  const clientsItems = await getBoardItemsWithCursor(token, clientsBoardId, {
    includeSubitems: true,
  });

  console.log('[monday-import] Fetching tasks board items + subitems...');
  const tasksItems = await getBoardItemsWithCursor(token, tasksBoardId, {
    includeSubitems: true,
  });

  const clientsEmailCol = pickColumn(clientsBoard.columns, [
    { weight: 100, test: (t, type) => /email/i.test(t) || type === 'email' },
    { weight: 50, test: (t) => /mail/i.test(t) },
  ]);
  const clientsCompanyCol = pickColumn(clientsBoard.columns, [
    { weight: 100, test: (t) => /company/i.test(t) },
    { weight: 60, test: (t) => /org|organization|business/i.test(t) },
  ]);

  const projectsStatusCol = pickColumn(clientsBoard.columns, [
    { weight: 100, test: (t, type) => /status/i.test(t) || type === 'status' },
  ]);
  const projectsStartCol = pickColumn(clientsBoard.columns, [
    { weight: 100, test: (t, type) => /start/i.test(t) && (type === 'date' || /date/i.test(type)) },
    { weight: 60, test: (t) => /start date/i.test(t) },
  ]);
  const projectsEndCol = pickColumn(clientsBoard.columns, [
    { weight: 100, test: (t, type) => /end/i.test(t) && (type === 'date' || /date/i.test(type)) },
    { weight: 60, test: (t) => /end date/i.test(t) },
  ]);

  const tasksProjectCol = pickColumn(tasksBoard.columns, [
    { weight: 120, test: (t, type) => /project/i.test(t) && /connect|board_relation|relation|mirror/i.test(type) },
    { weight: 100, test: (t) => /^project$/i.test(t) },
    { weight: 80, test: (t) => /project/i.test(t) },
    { weight: 60, test: (t) => /client/i.test(t) },
  ]);
  const tasksStatusCol = pickColumn(tasksBoard.columns, [
    { weight: 100, test: (t, type) => /status/i.test(t) || type === 'status' },
  ]);

  console.log(
    '[monday-import] Picked columns:',
    JSON.stringify(
      {
        clients: { email: clientsEmailCol, company: clientsCompanyCol },
        projects: { status: projectsStatusCol, start: projectsStartCol, end: projectsEndCol },
        tasks: { project: tasksProjectCol, status: tasksStatusCol },
      },
      null,
      2
    )
  );
  console.log('[monday-import] Item counts:', {
    clients_items: clientsItems.length,
    tasks_items: tasksItems.length,
  });

  if (dumpOnly) {
    console.log('[monday-import] DUMP_ONLY=1 set; exiting without writing.');
    return;
  }

  const mondayProjectIdToDbProject = new Map(); // monday subitem id -> db project row
  const projectKeyToDbProject = new Map(); // normalized project name -> db project row (fallback)

  const stats = {
    clients_created_or_found: 0,
    projects_created_or_found: 0,
    tasks_created_or_found: 0,
    subtasks_created_or_found: 0,
    tasks_skipped_unmapped_project: 0,
  };

  console.log('[monday-import] Importing clients + projects from clients board...');
  for (const clientItem of clientsItems) {
    const email =
      getColText(clientItem, clientsEmailCol?.id) ||
      `monday-client-${clientItem.id}@placeholder.invalid`;
    const company = getColText(clientItem, clientsCompanyCol?.id) || clientItem.name;

    const clientRow = await findOrCreateClient(
      supabase,
      { name: clientItem.name, company, email },
      { dryRun }
    );
    stats.clients_created_or_found += 1;

    const subitems = clientItem.subitems || [];
    for (const [idx, proj] of subitems.entries()) {
      const statusText = getColText(proj, projectsStatusCol?.id) || '';
      const startText = getColText(proj, projectsStartCol?.id) || '';
      const endText = getColText(proj, projectsEndCol?.id) || '';

      const projectRow = await findOrCreateProject(
        supabase,
        {
          client_id: clientRow.id,
          name: proj.name,
          status: mapProjectStatus(statusText),
          start_date: parseDateOnly(startText),
          end_date: parseDateOnly(endText),
          sort_order: idx,
        },
        { dryRun }
      );
      stats.projects_created_or_found += 1;
      mondayProjectIdToDbProject.set(String(proj.id), projectRow);
      projectKeyToDbProject.set(normalizeKey(proj.name), projectRow);
    }
  }

  console.log('[monday-import] Importing tasks + subtasks from tasks board...');
  const unmapped = [];
  for (const [taskIdx, taskItem] of tasksItems.entries()) {
    let projectRow = null;

    if (tasksProjectCol) {
      const cv = (taskItem.column_values || []).find((x) => x.id === tasksProjectCol.id);
      const linkedIds = extractLinkedItemIdsFromValue(cv?.value);
      for (const lid of linkedIds) {
        if (mondayProjectIdToDbProject.has(lid)) {
          projectRow = mondayProjectIdToDbProject.get(lid);
          break;
        }
      }
      if (!projectRow) {
        const text = (cv?.text || '').trim();
        if (text) projectRow = projectKeyToDbProject.get(normalizeKey(text)) || null;
      }
    }

    if (!projectRow && taskItem.group?.title) {
      projectRow = projectKeyToDbProject.get(normalizeKey(taskItem.group.title)) || null;
    }

    if (!projectRow) {
      stats.tasks_skipped_unmapped_project += 1;
      unmapped.push({
        monday_task_id: taskItem.id,
        name: taskItem.name,
        group: taskItem.group?.title || null,
        project_column: tasksProjectCol?.title || null,
        project_column_text: tasksProjectCol ? getColText(taskItem, tasksProjectCol.id) : null,
      });
      continue;
    }

    const statusText = getColText(taskItem, tasksStatusCol?.id) || '';
    const taskRow = await findOrCreateTask(
      supabase,
      {
        project_id: projectRow.id,
        title: taskItem.name,
        status: mapTaskStatus(statusText),
        sort_order: taskIdx,
      },
      { dryRun }
    );
    stats.tasks_created_or_found += 1;

    const subs = taskItem.subitems || [];
    for (const [subIdx, st] of subs.entries()) {
      const subStatusText = getColText(st, tasksStatusCol?.id) || '';
      await findOrCreateSubtask(
        supabase,
        {
          task_id: taskRow.id,
          title: st.name,
          status: mapTaskStatus(subStatusText),
          sort_order: subIdx,
        },
        { dryRun }
      );
      stats.subtasks_created_or_found += 1;
    }

    if (taskIdx % 50 === 0 && taskIdx > 0) {
      console.log(`[monday-import] Progress: ${taskIdx}/${tasksItems.length} tasks processed`);
    }
  }

  if (unmapped.length) {
    console.warn(
      `[monday-import] WARNING: ${unmapped.length} task items could not be mapped to a project. Writing details to scripts/monday-import.unmapped-tasks.json`
    );
    const fs = await import('node:fs/promises');
    await fs.writeFile(
      new URL('./monday-import.unmapped-tasks.json', import.meta.url),
      JSON.stringify(unmapped, null, 2),
      'utf8'
    );
  }

  console.log('[monday-import] Done. Stats:', JSON.stringify(stats, null, 2));
  console.log(
    dryRun
      ? '[monday-import] DRY_RUN=1 was set; no writes were performed.'
      : '[monday-import] Migration completed (writes performed).'
  );
}

main().catch((err) => {
  console.error('[monday-import] FAILED:', err?.message || err);
  process.exitCode = 1;
});

