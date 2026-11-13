// Feather Journal API: shared weather journal for small birds, stored in SQLite
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DATA = path.join(__dirname, 'data');
try { fs.mkdirSync(DATA, { recursive: true }); } catch (e) {}
const db = new Database(path.join(DATA, 'journal.db'));
db.pragma('journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS entries (
    id TEXT PRIMARY KEY,
    city TEXT NOT NULL,
    day TEXT NOT NULL,
    temp REAL NOT NULL DEFAULT 0,
    low REAL NOT NULL DEFAULT 0,
    high REAL NOT NULL DEFAULT 0,
    condition TEXT NOT NULL DEFAULT '',
    note TEXT NOT NULL DEFAULT '',
    bird TEXT NOT NULL DEFAULT 'gurt',
    created TEXT NOT NULL
  );
`);

const stmt = {
  list: db.prepare('SELECT * FROM entries ORDER BY day DESC, created DESC LIMIT 300'),
  get: db.prepare('SELECT * FROM entries WHERE id = ?'),
  insert: db.prepare('INSERT INTO entries (id,city,day,temp,low,high,condition,note,bird,created) VALUES (@id,@city,@day,@temp,@low,@high,@condition,@note,@bird,@created)'),
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
    entries.forEach(e => { days[e.day] = (days[e.day] || 0) + 1; });
    return json(res, 200, { entries, total: entries.length, days: Object.keys(days).length });
  }

  if (req.method === 'POST' && route === 'entry' && seg[1] === 'new') {
    readBody(req, body => {
      const city = String(body.city || '').trim().slice(0, 80);
      if (!city) return json(res, 400, { error: 'city required' });
      const day = /^\d{4}-\d{2}-\d{2}$/.test(String(body.day || '')) ? String(body.day) : new Date().toISOString().slice(0, 10);
      const num = v => { const n = Number(v); return isFinite(n) ? n : 0; };
      const entry = {
        id: 'jrn' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        city,
        day,
        temp: num(body.temp),
        low: num(body.low),
        high: num(body.high),
        condition: String(body.condition || '').trim().slice(0, 60),
        note: String(body.note || '').slice(0, 500),
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
