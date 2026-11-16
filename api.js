// Feather Journal API: a shared daily journal for small birds, stored in SQLite
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DATA = path.join(__dirname, 'data');
try { fs.mkdirSync(DATA, { recursive: true }); } catch (e) {}
const db = new Database(path.join(DATA, 'journal.db'));
db.pragma('journal_mode = WAL');
// migrate an older weather-journal table if it is still there
try {
  const cols = db.prepare("PRAGMA table_info(entries)").all().map(c => c.name);
  if (cols.length && cols.indexOf('title') === -1) {
    db.exec('ALTER TABLE entries RENAME TO entries_legacy');
  }
} catch (e) {}
db.exec(`
  CREATE TABLE IF NOT EXISTS entries (
    id TEXT PRIMARY KEY,
    day TEXT NOT NULL,
    title TEXT NOT NULL DEFAULT '',
    body TEXT NOT NULL DEFAULT '',
    mood TEXT NOT NULL DEFAULT '',
    bird TEXT NOT NULL DEFAULT 'gurt',
    created TEXT NOT NULL
  );
`);

const stmt = {
  list: db.prepare('SELECT * FROM entries ORDER BY day DESC, created DESC LIMIT 300'),
  get: db.prepare('SELECT * FROM entries WHERE id = ?'),
  insert: db.prepare('INSERT INTO entries (id,day,title,body,mood,bird,created) VALUES (@id,@day,@title,@body,@mood,@bird,@created)'),
  remove: db.prepare('DELETE FROM entries WHERE id = ?')
};

function json(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(obj));
}
function readBody(req, cb) {
  let raw = '';
  req.on('data', c => { raw += c; if (raw.length > 100000) req.destroy(); });
  req.on('end', () => {
    let body = {};
    try { body = JSON.parse(raw || '{}'); } catch (e) { body = {}; }
    cb(body);
  });
}

module.exports = function handler(req, res, seg) {
  const route = seg[0];

  if (req.method === 'GET' && route === 'entries') {
    const entries = stmt.list.all();
    const days = {};
    const birds = {};
    const moods = {};
    entries.forEach(e => {
      days[e.day] = (days[e.day] || 0) + 1;
      birds[e.bird] = (birds[e.bird] || 0) + 1;
      moods[e.mood] = (moods[e.mood] || 0) + 1;
    });
    return json(res, 200, {
      entries, total: entries.length,
      days: Object.keys(days).length,
      birds: Object.keys(birds).length,
      moods
    });
  }

  if (req.method === 'POST' && route === 'entry' && seg[1] === 'new') {
    readBody(req, body => {
      const text = String(body.body || '').trim().slice(0, 2000);
      const title = String(body.title || '').trim().slice(0, 120);
      if (!text && !title) return json(res, 400, { error: 'write something first' });
      const day = /^\d{4}-\d{2}-\d{2}$/.test(String(body.day || '')) ? String(body.day) : new Date().toISOString().slice(0, 10);
      const entry = {
        id: 'FJ-' + Math.random().toString(36).slice(2, 8).toUpperCase(),
        day,
        title,
        body: text,
        mood: String(body.mood || '').trim().slice(0, 30),
        bird: String(body.bird || 'gurt').trim().slice(0, 40) || 'gurt',
        created: new Date().toISOString()
      };
      stmt.insert.run(entry);
      return json(res, 200, { ok: true, entry });
    });
    return true;
  }

  if (req.method === 'POST' && route === 'entry' && seg[1] && seg[2] === 'delete') {
    const row = stmt.get.get(seg[1]);
    if (!row) return json(res, 404, { error: 'no such entry' });
    stmt.remove.run(seg[1]);
    return json(res, 200, { ok: true, removed: seg[1] });
  }

  return false;
};
