-- ResQSync - SQLite version of the schema (fallback when MySQL is not running)
-- Same 10 tables, 4 views and triggers as schema.mysql.sql.
-- SQLite has no stored procedures and no session variables, so:
--   * the two procedures are written in server/resDb.js (same steps, same locks order)
--   * txn_context (one row) tells the audit trigger which transaction is running

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('admin','ngo','restaurant','volunteer')),
  zone          TEXT NOT NULL DEFAULT 'Zone A' CHECK (zone IN ('Zone A','Zone B','Zone C','Zone D')),
  phone         TEXT,
  created_at    TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

CREATE TABLE IF NOT EXISTS organisations (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  org_name   TEXT NOT NULL,
  org_type   TEXT NOT NULL CHECK (org_type IN ('NGO','Emergency Shelter','Community Kitchen','Restaurant')),
  zone       TEXT NOT NULL,
  address    TEXT NOT NULL,
  capacity   INTEGER NOT NULL DEFAULT 100,
  status     TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','verified','rejected')),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_org_status ON organisations(status);

CREATE TABLE IF NOT EXISTS volunteers (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id            INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  skills             TEXT NOT NULL DEFAULT 'First aid',
  availability       TEXT NOT NULL DEFAULT 'available' CHECK (availability IN ('available','busy','offline')),
  xp                 INTEGER NOT NULL DEFAULT 0,
  coins              INTEGER NOT NULL DEFAULT 0,
  badge              TEXT NOT NULL DEFAULT 'Novice Responder',
  completed_missions INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS resources (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  zone          TEXT NOT NULL CHECK (zone IN ('Zone A','Zone B','Zone C','Zone D')),
  resource_type TEXT NOT NULL CHECK (resource_type IN ('food','water','medicine','cots','vehicles')),
  available     INTEGER NOT NULL DEFAULT 0 CHECK (available >= 0),
  allocated     INTEGER NOT NULL DEFAULT 0,
  unit_name     TEXT NOT NULL,
  UNIQUE (zone, resource_type)
);

CREATE TABLE IF NOT EXISTS emergency_cases (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  process_id   TEXT NOT NULL UNIQUE,
  title        TEXT NOT NULL,
  case_type    TEXT NOT NULL CHECK (case_type IN ('flood','fire','earthquake','medical','other')),
  priority     INTEGER NOT NULL CHECK (priority BETWEEN 1 AND 4),
  zone         TEXT NOT NULL CHECK (zone IN ('Zone A','Zone B','Zone C','Zone D')),
  location     TEXT NOT NULL,
  food         INTEGER NOT NULL DEFAULT 0 CHECK (food >= 0),
  water        INTEGER NOT NULL DEFAULT 0 CHECK (water >= 0),
  medicine     INTEGER NOT NULL DEFAULT 0 CHECK (medicine >= 0),
  cots         INTEGER NOT NULL DEFAULT 0 CHECK (cots >= 0),
  vehicles     INTEGER NOT NULL DEFAULT 0 CHECK (vehicles >= 0),
  burst_time   INTEGER NOT NULL DEFAULT 30,
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','waiting','fulfilled')),
  reported_by  INTEGER NOT NULL REFERENCES users(id),
  created_at   TEXT DEFAULT CURRENT_TIMESTAMP,
  fulfilled_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_case_queue ON emergency_cases(status, priority, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS uq_open_case ON emergency_cases(zone, lower(trim(title))) WHERE status <> 'fulfilled';

CREATE TABLE IF NOT EXISTS resource_requests (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  process_id   TEXT NOT NULL UNIQUE,
  ngo_id       INTEGER NOT NULL REFERENCES users(id),
  title        TEXT NOT NULL,
  zone         TEXT NOT NULL CHECK (zone IN ('Zone A','Zone B','Zone C','Zone D')),
  priority     INTEGER NOT NULL DEFAULT 2 CHECK (priority BETWEEN 1 AND 4),
  food         INTEGER NOT NULL DEFAULT 0 CHECK (food >= 0),
  water        INTEGER NOT NULL DEFAULT 0 CHECK (water >= 0),
  medicine     INTEGER NOT NULL DEFAULT 0 CHECK (medicine >= 0),
  cots         INTEGER NOT NULL DEFAULT 0 CHECK (cots >= 0),
  vehicles     INTEGER NOT NULL DEFAULT 0 CHECK (vehicles >= 0),
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','waiting','fulfilled')),
  notes        TEXT,
  created_at   TEXT DEFAULT CURRENT_TIMESTAMP,
  fulfilled_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_req_queue ON resource_requests(status, priority, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS uq_open_request ON resource_requests(ngo_id, zone, lower(trim(title))) WHERE status <> 'fulfilled';

CREATE TABLE IF NOT EXISTS surplus_food (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  restaurant_id INTEGER NOT NULL REFERENCES users(id),
  title         TEXT NOT NULL,
  food_type     TEXT NOT NULL DEFAULT 'Cooked meals',
  servings      INTEGER NOT NULL CHECK (servings > 0),
  zone          TEXT NOT NULL CHECK (zone IN ('Zone A','Zone B','Zone C','Zone D')),
  expiry_time   TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'available'
                CHECK (status IN ('available','reserved','picked_up','delivered','added_to_stock','expired')),
  claimed_by    INTEGER REFERENCES users(id),
  created_at    TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at    TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_food_status ON surplus_food(status, zone);

CREATE TABLE IF NOT EXISTS rescue_missions (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  kind         TEXT NOT NULL CHECK (kind IN ('case','request')),
  target_id    INTEGER NOT NULL,
  process_id   TEXT NOT NULL,
  zone         TEXT NOT NULL,
  food         INTEGER NOT NULL DEFAULT 0,
  water        INTEGER NOT NULL DEFAULT 0,
  medicine     INTEGER NOT NULL DEFAULT 0,
  cots         INTEGER NOT NULL DEFAULT 0,
  vehicles     INTEGER NOT NULL DEFAULT 0,
  status       TEXT NOT NULL DEFAULT 'open'
               CHECK (status IN ('open','assigned','pickup','in_transit','delivered','completed')),
  volunteer_id INTEGER REFERENCES users(id),
  worker       TEXT NOT NULL,
  txn_id       INTEGER NOT NULL,
  picked_at    INTEGER NOT NULL,
  started_at   INTEGER NOT NULL,
  finished_at  INTEGER NOT NULL DEFAULT 0,
  result       TEXT NOT NULL DEFAULT 'partial' CHECK (result IN ('fulfilled','partial')),
  created_at   TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at   TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_mis_status ON rescue_missions(status);
CREATE INDEX IF NOT EXISTS idx_mis_target ON rescue_missions(kind, target_id);

CREATE TABLE IF NOT EXISTS notifications (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  recipient_role TEXT NOT NULL DEFAULT 'all' CHECK (recipient_role IN ('all','admin','ngo','restaurant','volunteer')),
  recipient_id   INTEGER,
  type           TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('critical','alert','info','success')),
  title          TEXT NOT NULL,
  message        TEXT NOT NULL,
  is_read        INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_note_target ON notifications(recipient_role, recipient_id);

CREATE TABLE IF NOT EXISTS audit_logs (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  txn_id        INTEGER,
  action        TEXT NOT NULL,
  entity_type   TEXT NOT NULL,
  entity_id     INTEGER NOT NULL,
  actor         TEXT NOT NULL,
  zone          TEXT,
  resource_type TEXT,
  old_value     INTEGER,
  new_value     INTEGER,
  details       TEXT NOT NULL,
  os_concept    TEXT,
  dbms_concept  TEXT,
  created_at    TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_audit_txn ON audit_logs(txn_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);

-- helper row for the audit trigger (MySQL uses @session variables instead)
CREATE TABLE IF NOT EXISTS txn_context (
  id     INTEGER PRIMARY KEY CHECK (id = 1),
  txn_id INTEGER,
  actor  TEXT,
  target TEXT
);
INSERT OR IGNORE INTO txn_context (id, txn_id, actor, target) VALUES (1, NULL, NULL, NULL);

-- ---------------------------------------------------------------- views
DROP VIEW IF EXISTS v_priority_queue;
CREATE VIEW v_priority_queue AS
  SELECT 'case' AS kind, id, process_id, title, zone, priority, status,
         food, water, medicine, cots, vehicles, created_at
  FROM emergency_cases WHERE status <> 'fulfilled'
  UNION ALL
  SELECT 'request', id, process_id, title, zone, priority, status,
         food, water, medicine, cots, vehicles, created_at
  FROM resource_requests WHERE status <> 'fulfilled'
  ORDER BY priority, created_at;

DROP VIEW IF EXISTS v_zone_stock;
CREATE VIEW v_zone_stock AS
  SELECT zone, resource_type, available, allocated,
         (100 * available) / MAX(available + allocated, 1) AS percent_left
  FROM resources;

DROP VIEW IF EXISTS v_volunteer_leaderboard;
CREATE VIEW v_volunteer_leaderboard AS
  SELECT u.id AS user_id, u.name, u.zone, v.xp, v.coins, v.badge,
         v.completed_missions, (v.xp / 100) + 1 AS level, v.availability
  FROM volunteers v JOIN users u ON u.id = v.user_id
  WHERE u.email NOT LIKE '%@lab.local'
  ORDER BY v.xp DESC;

DROP VIEW IF EXISTS v_mission_board;
CREATE VIEW v_mission_board AS
  SELECT m.*, u.name AS volunteer_name,
         COALESCE(c.title, r.title) AS title,
         COALESCE(c.priority, r.priority) AS priority
  FROM rescue_missions m
  LEFT JOIN users u ON u.id = m.volunteer_id
  LEFT JOIN emergency_cases c ON m.kind = 'case' AND c.id = m.target_id
  LEFT JOIN resource_requests r ON m.kind = 'request' AND r.id = m.target_id;

-- ---------------------------------------------------------------- triggers
DROP TRIGGER IF EXISTS trg_resource_underflow;
CREATE TRIGGER trg_resource_underflow BEFORE UPDATE OF available ON resources
WHEN NEW.available < 0
BEGIN
  SELECT RAISE(ABORT, 'Stock cannot go negative');
END;

DROP TRIGGER IF EXISTS trg_resource_audit;
CREATE TRIGGER trg_resource_audit AFTER UPDATE OF available ON resources
WHEN NEW.available <> OLD.available
BEGIN
  INSERT INTO audit_logs (txn_id, action, entity_type, entity_id, actor, zone, resource_type,
                          old_value, new_value, details, os_concept, dbms_concept)
  SELECT txn_id,
         CASE WHEN NEW.available < OLD.available THEN 'STOCK_ALLOCATED' ELSE 'STOCK_ADDED' END,
         'resources', NEW.id, COALESCE(actor, 'system'), NEW.zone, NEW.resource_type,
         OLD.available, NEW.available,
         NEW.zone || ' ' || NEW.resource_type || ': ' || OLD.available ||
           CASE WHEN NEW.available < OLD.available THEN ' - ' ELSE ' + ' END ||
           abs(NEW.available - OLD.available) || ' = ' || NEW.available ||
           CASE WHEN target IS NULL THEN '' ELSE ' (' || target || ')' END,
         'Critical section', 'AFTER UPDATE trigger'
  FROM txn_context WHERE id = 1;
END;

DROP TRIGGER IF EXISTS trg_surplus_food_alert;
CREATE TRIGGER trg_surplus_food_alert AFTER INSERT ON surplus_food
WHEN NEW.servings >= 80
BEGIN
  INSERT INTO notifications (recipient_role, type, title, message)
  VALUES ('ngo', 'alert', 'Large surplus food available',
          NEW.servings || ' servings of ' || NEW.title || ' in ' || NEW.zone || '. Reserve it before it expires.');
END;

DROP TRIGGER IF EXISTS trg_case_status_audit;
CREATE TRIGGER trg_case_status_audit AFTER UPDATE OF status ON emergency_cases
WHEN OLD.status <> NEW.status
BEGIN
  INSERT INTO audit_logs (txn_id, action, entity_type, entity_id, actor, zone, details, os_concept, dbms_concept)
  SELECT txn_id, 'CASE_STATUS', 'emergency_cases', NEW.id, COALESCE(actor, 'system'), NEW.zone,
         NEW.process_id || ': ' || OLD.status || ' -> ' || NEW.status,
         'Process state transition', 'AFTER UPDATE trigger'
  FROM txn_context WHERE id = 1;
END;

DROP TRIGGER IF EXISTS trg_case_fulfilled;
CREATE TRIGGER trg_case_fulfilled AFTER UPDATE OF food, water, medicine, cots, vehicles ON emergency_cases
WHEN NEW.food = 0 AND NEW.water = 0 AND NEW.medicine = 0 AND NEW.cots = 0 AND NEW.vehicles = 0
     AND NEW.status <> 'fulfilled'
BEGIN
  UPDATE emergency_cases SET status = 'fulfilled', fulfilled_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

DROP TRIGGER IF EXISTS trg_request_fulfilled;
CREATE TRIGGER trg_request_fulfilled AFTER UPDATE OF food, water, medicine, cots, vehicles ON resource_requests
WHEN NEW.food = 0 AND NEW.water = 0 AND NEW.medicine = 0 AND NEW.cots = 0 AND NEW.vehicles = 0
     AND NEW.status <> 'fulfilled'
BEGIN
  UPDATE resource_requests SET status = 'fulfilled', fulfilled_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

DROP TRIGGER IF EXISTS trg_mission_reward;
CREATE TRIGGER trg_mission_reward AFTER UPDATE OF status ON rescue_missions
WHEN OLD.status <> 'completed' AND NEW.status = 'completed' AND NEW.volunteer_id IS NOT NULL
BEGIN
  UPDATE volunteers
     SET xp = xp + 50,
         coins = coins + 20,
         completed_missions = completed_missions + 1,
         availability = 'available',
         badge = CASE
                   WHEN xp + 50 >= 500 THEN 'Gold Guardian'
                   WHEN xp + 50 >= 250 THEN 'Silver Vanguard'
                   WHEN xp + 50 >= 100 THEN 'Bronze Responder'
                   ELSE 'Novice Responder'
                 END
   WHERE user_id = NEW.volunteer_id;
  INSERT INTO audit_logs (action, entity_type, entity_id, actor, zone, details, os_concept, dbms_concept)
  VALUES ('VOLUNTEER_REWARD', 'rescue_missions', NEW.id, 'Gamification', NEW.zone,
          'Mission ' || NEW.id || ' completed: +50 XP, +20 coins', 'Process termination', 'AFTER UPDATE trigger');
END;
