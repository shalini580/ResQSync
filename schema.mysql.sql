-- ResQSync - Resource Coordination & Emergency Relief System
-- MySQL schema (MySQL 8 / MariaDB 10.5+, InnoDB)
--
-- The server runs this file by itself when it starts, so normally you
-- don't have to import it. If you want to do it by hand:
--     mysql -u root -p < database/schema.mysql.sql
--
-- 10 tables, 4 views, 7 triggers, 2 stored procedures.

CREATE DATABASE IF NOT EXISTS resqsync_final CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE resqsync_final;

-- 1. users - everyone who can log in (4 roles)
CREATE TABLE IF NOT EXISTS users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(100) NOT NULL,
  role          ENUM('admin','ngo','restaurant','volunteer') NOT NULL,
  zone          ENUM('Zone A','Zone B','Zone C','Zone D') NOT NULL DEFAULT 'Zone A',
  phone         VARCHAR(20),
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_users_role (role)
) ENGINE=InnoDB;

-- 2. organisations - NGOs, shelters and restaurants (admin verifies them)
CREATE TABLE IF NOT EXISTS organisations (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT NOT NULL UNIQUE,
  org_name   VARCHAR(120) NOT NULL,
  org_type   ENUM('NGO','Emergency Shelter','Community Kitchen','Restaurant') NOT NULL,
  zone       ENUM('Zone A','Zone B','Zone C','Zone D') NOT NULL,
  address    VARCHAR(200) NOT NULL,
  capacity   INT NOT NULL DEFAULT 100,
  status     ENUM('pending','verified','rejected') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_org_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_org_status (status)
) ENGINE=InnoDB;

-- 3. volunteers - responder profile + gamification
CREATE TABLE IF NOT EXISTS volunteers (
  id                 INT AUTO_INCREMENT PRIMARY KEY,
  user_id            INT NOT NULL UNIQUE,
  skills             VARCHAR(200) NOT NULL DEFAULT 'First aid',
  availability       ENUM('available','busy','offline') NOT NULL DEFAULT 'available',
  xp                 INT NOT NULL DEFAULT 0,
  coins              INT NOT NULL DEFAULT 0,
  badge              VARCHAR(40) NOT NULL DEFAULT 'Novice Responder',
  completed_missions INT NOT NULL DEFAULT 0,
  CONSTRAINT fk_vol_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 4. resources - stock of each zone (the shared data workers fight over)
CREATE TABLE IF NOT EXISTS resources (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  zone          ENUM('Zone A','Zone B','Zone C','Zone D') NOT NULL,
  resource_type ENUM('food','water','medicine','cots','vehicles') NOT NULL,
  available     INT NOT NULL DEFAULT 0,
  allocated     INT NOT NULL DEFAULT 0,
  unit_name     VARCHAR(40) NOT NULL,
  UNIQUE KEY uq_zone_type (zone, resource_type),
  CONSTRAINT chk_res_available CHECK (available >= 0)
) ENGINE=InnoDB;

-- 5. emergency_cases - logged by the admin, each one is a "process"
--    food..vehicles = what is STILL needed, they count down to 0
CREATE TABLE IF NOT EXISTS emergency_cases (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  process_id   VARCHAR(12) NOT NULL UNIQUE,
  title        VARCHAR(150) NOT NULL,
  case_type    ENUM('flood','fire','earthquake','medical','other') NOT NULL,
  priority     TINYINT NOT NULL,
  zone         ENUM('Zone A','Zone B','Zone C','Zone D') NOT NULL,
  location     VARCHAR(150) NOT NULL,
  food         INT NOT NULL DEFAULT 0,
  water        INT NOT NULL DEFAULT 0,
  medicine     INT NOT NULL DEFAULT 0,
  cots         INT NOT NULL DEFAULT 0,
  vehicles     INT NOT NULL DEFAULT 0,
  burst_time   INT NOT NULL DEFAULT 30,
  status       ENUM('pending','waiting','fulfilled') NOT NULL DEFAULT 'pending',
  reported_by  INT NOT NULL,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fulfilled_at TIMESTAMP NULL DEFAULT NULL,
  -- one open case per title per zone (stops double entries)
  open_key     VARCHAR(200) GENERATED ALWAYS AS
               (CASE WHEN status <> 'fulfilled' THEN CONCAT(zone, '|', LOWER(TRIM(title))) END) STORED,
  UNIQUE KEY uq_open_case (open_key),
  CONSTRAINT fk_case_user FOREIGN KEY (reported_by) REFERENCES users(id),
  CONSTRAINT chk_case_priority CHECK (priority BETWEEN 1 AND 4),
  CONSTRAINT chk_case_qty CHECK (food >= 0 AND water >= 0 AND medicine >= 0 AND cots >= 0 AND vehicles >= 0),
  INDEX idx_case_queue (status, priority, created_at)
) ENGINE=InnoDB;

-- 6. resource_requests - raised by NGOs / shelters
CREATE TABLE IF NOT EXISTS resource_requests (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  process_id   VARCHAR(12) NOT NULL UNIQUE,
  ngo_id       INT NOT NULL,
  title        VARCHAR(150) NOT NULL,
  zone         ENUM('Zone A','Zone B','Zone C','Zone D') NOT NULL,
  priority     TINYINT NOT NULL DEFAULT 2,
  food         INT NOT NULL DEFAULT 0,
  water        INT NOT NULL DEFAULT 0,
  medicine     INT NOT NULL DEFAULT 0,
  cots         INT NOT NULL DEFAULT 0,
  vehicles     INT NOT NULL DEFAULT 0,
  status       ENUM('pending','waiting','fulfilled') NOT NULL DEFAULT 'pending',
  notes        VARCHAR(255),
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fulfilled_at TIMESTAMP NULL DEFAULT NULL,
  open_key     VARCHAR(220) GENERATED ALWAYS AS
               (CASE WHEN status <> 'fulfilled' THEN CONCAT(ngo_id, '|', zone, '|', LOWER(TRIM(title))) END) STORED,
  UNIQUE KEY uq_open_request (open_key),
  CONSTRAINT fk_req_ngo FOREIGN KEY (ngo_id) REFERENCES users(id),
  CONSTRAINT chk_req_priority CHECK (priority BETWEEN 1 AND 4),
  CONSTRAINT chk_req_qty CHECK (food >= 0 AND water >= 0 AND medicine >= 0 AND cots >= 0 AND vehicles >= 0),
  INDEX idx_req_queue (status, priority, created_at)
) ENGINE=InnoDB;

-- 7. surplus_food - restaurant donations and their pickup status
CREATE TABLE IF NOT EXISTS surplus_food (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  restaurant_id INT NOT NULL,
  title         VARCHAR(150) NOT NULL,
  food_type     VARCHAR(60) NOT NULL DEFAULT 'Cooked meals',
  servings      INT NOT NULL,
  zone          ENUM('Zone A','Zone B','Zone C','Zone D') NOT NULL,
  expiry_time   DATETIME NOT NULL,
  status        ENUM('available','reserved','picked_up','delivered','added_to_stock','expired') NOT NULL DEFAULT 'available',
  claimed_by    INT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_food_rest FOREIGN KEY (restaurant_id) REFERENCES users(id),
  CONSTRAINT fk_food_ngo FOREIGN KEY (claimed_by) REFERENCES users(id),
  CONSTRAINT chk_food_servings CHECK (servings > 0),
  INDEX idx_food_status (status, zone)
) ENGINE=InnoDB;

-- 8. rescue_missions - one per allocation; volunteers claim and deliver it.
--    Also keeps the execution trace (worker, txn, timings) for the Gantt chart.
CREATE TABLE IF NOT EXISTS rescue_missions (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  kind         ENUM('case','request') NOT NULL,
  target_id    INT NOT NULL,
  process_id   VARCHAR(12) NOT NULL,
  zone         ENUM('Zone A','Zone B','Zone C','Zone D') NOT NULL,
  food         INT NOT NULL DEFAULT 0,
  water        INT NOT NULL DEFAULT 0,
  medicine     INT NOT NULL DEFAULT 0,
  cots         INT NOT NULL DEFAULT 0,
  vehicles     INT NOT NULL DEFAULT 0,
  status       ENUM('open','assigned','pickup','in_transit','delivered','completed') NOT NULL DEFAULT 'open',
  volunteer_id INT NULL,
  worker       VARCHAR(20) NOT NULL,
  txn_id       INT NOT NULL,
  picked_at    BIGINT NOT NULL,
  started_at   BIGINT NOT NULL,
  finished_at  BIGINT NOT NULL DEFAULT 0,
  result       ENUM('fulfilled','partial') NOT NULL DEFAULT 'partial',
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_mis_vol FOREIGN KEY (volunteer_id) REFERENCES users(id),
  INDEX idx_mis_status (status),
  INDEX idx_mis_target (kind, target_id)
) ENGINE=InnoDB;

-- 9. notifications
CREATE TABLE IF NOT EXISTS notifications (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  recipient_role ENUM('all','admin','ngo','restaurant','volunteer') NOT NULL DEFAULT 'all',
  recipient_id   INT NULL,
  type           ENUM('critical','alert','info','success') NOT NULL DEFAULT 'info',
  title          VARCHAR(150) NOT NULL,
  message        VARCHAR(255) NOT NULL,
  is_read        TINYINT NOT NULL DEFAULT 0,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_note_target (recipient_role, recipient_id)
) ENGINE=InnoDB;

-- 10. audit_logs - every stock change and status change (mostly written by triggers)
CREATE TABLE IF NOT EXISTS audit_logs (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  txn_id        INT NULL,
  action        VARCHAR(40) NOT NULL,
  entity_type   VARCHAR(40) NOT NULL,
  entity_id     INT NOT NULL,
  actor         VARCHAR(80) NOT NULL,
  zone          VARCHAR(10),
  resource_type VARCHAR(12),
  old_value     INT,
  new_value     INT,
  details       VARCHAR(255) NOT NULL,
  os_concept    VARCHAR(60),
  dbms_concept  VARCHAR(60),
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_txn (txn_id),
  INDEX idx_audit_action (action)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------- views

-- everything still waiting for stock, in the order the scheduler serves it
CREATE OR REPLACE VIEW v_priority_queue AS
  SELECT 'case' AS kind, id, process_id, title, zone, priority, status,
         food, water, medicine, cots, vehicles, created_at
  FROM emergency_cases WHERE status <> 'fulfilled'
  UNION ALL
  SELECT 'request', id, process_id, title, zone, priority, status,
         food, water, medicine, cots, vehicles, created_at
  FROM resource_requests WHERE status <> 'fulfilled'
  ORDER BY priority, created_at;

CREATE OR REPLACE VIEW v_zone_stock AS
  SELECT zone, resource_type, available, allocated,
         ROUND(100 * available / GREATEST(available + allocated, 1)) AS percent_left
  FROM resources;

CREATE OR REPLACE VIEW v_volunteer_leaderboard AS
  SELECT u.id AS user_id, u.name, u.zone, v.xp, v.coins, v.badge,
         v.completed_missions, FLOOR(v.xp / 100) + 1 AS level, v.availability
  FROM volunteers v JOIN users u ON u.id = v.user_id
  WHERE u.email NOT LIKE '%@lab.local'   -- hide the DBMS-lab race clients
  ORDER BY v.xp DESC;

CREATE OR REPLACE VIEW v_mission_board AS
  SELECT m.*, u.name AS volunteer_name,
         COALESCE(c.title, r.title) AS title,
         COALESCE(c.priority, r.priority) AS priority
  FROM rescue_missions m
  LEFT JOIN users u ON u.id = m.volunteer_id
  LEFT JOIN emergency_cases c ON m.kind = 'case' AND c.id = m.target_id
  LEFT JOIN resource_requests r ON m.kind = 'request' AND r.id = m.target_id;

-- ---------------------------------------------------------------- triggers
DELIMITER $$

-- T1: stock can never go below zero
DROP TRIGGER IF EXISTS trg_resource_underflow$$
CREATE TRIGGER trg_resource_underflow BEFORE UPDATE ON resources
FOR EACH ROW
BEGIN
  IF NEW.available < 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Stock cannot go negative';
  END IF;
END$$

-- T2: every stock change goes into audit_logs as  old -/+ change = new.
--     @res_txn_id / @res_actor / @res_target are set by the transaction.
DROP TRIGGER IF EXISTS trg_resource_audit$$
CREATE TRIGGER trg_resource_audit AFTER UPDATE ON resources
FOR EACH ROW
BEGIN
  IF NEW.available <> OLD.available THEN
    INSERT INTO audit_logs (txn_id, action, entity_type, entity_id, actor, zone, resource_type,
                            old_value, new_value, details, os_concept, dbms_concept)
    VALUES (@res_txn_id,
            IF(NEW.available < OLD.available, 'STOCK_ALLOCATED', 'STOCK_ADDED'),
            'resources', NEW.id, COALESCE(@res_actor, 'system'), NEW.zone, NEW.resource_type,
            OLD.available, NEW.available,
            CONCAT(NEW.zone, ' ', NEW.resource_type, ': ', OLD.available,
                   IF(NEW.available < OLD.available, ' - ', ' + '), ABS(NEW.available - OLD.available),
                   ' = ', NEW.available, IF(@res_target IS NULL, '', CONCAT(' (', @res_target, ')'))),
            'Critical section', 'AFTER UPDATE trigger');
  END IF;
END$$

-- T3: big surplus donation -> alert every NGO
DROP TRIGGER IF EXISTS trg_surplus_food_alert$$
CREATE TRIGGER trg_surplus_food_alert AFTER INSERT ON surplus_food
FOR EACH ROW
BEGIN
  IF NEW.servings >= 80 THEN
    INSERT INTO notifications (recipient_role, type, title, message)
    VALUES ('ngo', 'alert', 'Large surplus food available',
            CONCAT(NEW.servings, ' servings of ', NEW.title, ' in ', NEW.zone, '. Reserve it before it expires.'));
  END IF;
END$$

-- T4: emergency case changed state -> audit row (process state transition)
DROP TRIGGER IF EXISTS trg_case_status_audit$$
CREATE TRIGGER trg_case_status_audit AFTER UPDATE ON emergency_cases
FOR EACH ROW
BEGIN
  IF OLD.status <> NEW.status THEN
    INSERT INTO audit_logs (txn_id, action, entity_type, entity_id, actor, zone, details, os_concept, dbms_concept)
    VALUES (@res_txn_id, 'CASE_STATUS', 'emergency_cases', NEW.id, COALESCE(@res_actor, 'system'), NEW.zone,
            CONCAT(NEW.process_id, ': ', OLD.status, ' -> ', NEW.status),
            'Process state transition', 'AFTER UPDATE trigger');
  END IF;
END$$

-- T5 / T6: when all quantities hit 0 the case / request is fulfilled
DROP TRIGGER IF EXISTS trg_case_fulfilled$$
CREATE TRIGGER trg_case_fulfilled BEFORE UPDATE ON emergency_cases
FOR EACH ROW
BEGIN
  IF NEW.food = 0 AND NEW.water = 0 AND NEW.medicine = 0 AND NEW.cots = 0 AND NEW.vehicles = 0
     AND NEW.status <> 'fulfilled' THEN
    SET NEW.status = 'fulfilled', NEW.fulfilled_at = NOW();
  END IF;
END$$

DROP TRIGGER IF EXISTS trg_request_fulfilled$$
CREATE TRIGGER trg_request_fulfilled BEFORE UPDATE ON resource_requests
FOR EACH ROW
BEGIN
  IF NEW.food = 0 AND NEW.water = 0 AND NEW.medicine = 0 AND NEW.cots = 0 AND NEW.vehicles = 0
     AND NEW.status <> 'fulfilled' THEN
    SET NEW.status = 'fulfilled', NEW.fulfilled_at = NOW();
  END IF;
END$$

-- T7: mission completed -> volunteer gets XP, coins and maybe a new badge
DROP TRIGGER IF EXISTS trg_mission_reward$$
CREATE TRIGGER trg_mission_reward AFTER UPDATE ON rescue_missions
FOR EACH ROW
BEGIN
  IF OLD.status <> 'completed' AND NEW.status = 'completed' AND NEW.volunteer_id IS NOT NULL THEN
    UPDATE volunteers
       SET xp = xp + 50,
           coins = coins + 20,
           completed_missions = completed_missions + 1,
           availability = 'available',
           -- MySQL assigns left to right, so xp here is already the new value
           badge = CASE
                     WHEN xp >= 500 THEN 'Gold Guardian'
                     WHEN xp >= 250 THEN 'Silver Vanguard'
                     WHEN xp >= 100 THEN 'Bronze Responder'
                     ELSE 'Novice Responder'
                   END
     WHERE user_id = NEW.volunteer_id;
    INSERT INTO audit_logs (action, entity_type, entity_id, actor, zone, details, os_concept, dbms_concept)
    VALUES ('VOLUNTEER_REWARD', 'rescue_missions', NEW.id, 'Gamification', NEW.zone,
            CONCAT('Mission ', NEW.id, ' completed: +50 XP, +20 coins'),
            'Process termination', 'AFTER UPDATE trigger');
  END IF;
END$$

-- ---------------------------------------------------------------- stored procedures

-- P1: allocate stock to one case/request inside ONE transaction.
--     Locks the case row, then the zone's stock rows (SELECT ... FOR UPDATE),
--     gives MIN(needed, available) of each resource, counts the case down
--     and creates the rescue mission. Any error -> ROLLBACK.
DROP PROCEDURE IF EXISTS sp_AllocateEmergencyResources$$
CREATE PROCEDURE sp_AllocateEmergencyResources(
  IN  p_kind    VARCHAR(10),
  IN  p_id      INT,
  IN  p_worker  VARCHAR(20),
  IN  p_txn     INT,
  IN  p_picked  BIGINT,
  IN  p_started BIGINT,
  OUT p_mission INT,
  OUT p_status  VARCHAR(12)
)
BEGIN
  DECLARE v_zone VARCHAR(10) DEFAULT NULL;
  DECLARE v_pid  VARCHAR(12);
  DECLARE n_food, n_water, n_med, n_cots, n_veh INT DEFAULT 0;
  DECLARE a_food, a_water, a_med, a_cots, a_veh INT DEFAULT 0;
  DECLARE g_food, g_water, g_med, g_cots, g_veh INT DEFAULT 0;

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    SET @res_txn_id = NULL, @res_actor = NULL, @res_target = NULL;
    RESIGNAL;
  END;

  SET p_mission = NULL, p_status = 'gone';
  SET @res_txn_id = p_txn, @res_actor = p_worker;

  START TRANSACTION;

  IF p_kind = 'case' THEN
    SELECT zone, process_id, food, water, medicine, cots, vehicles
      INTO v_zone, v_pid, n_food, n_water, n_med, n_cots, n_veh
      FROM emergency_cases WHERE id = p_id AND status <> 'fulfilled' FOR UPDATE;
  ELSE
    SELECT zone, process_id, food, water, medicine, cots, vehicles
      INTO v_zone, v_pid, n_food, n_water, n_med, n_cots, n_veh
      FROM resource_requests WHERE id = p_id AND status <> 'fulfilled' FOR UPDATE;
  END IF;

  IF v_zone IS NULL THEN
    ROLLBACK;
  ELSE
    SET @res_target = v_pid;

    -- lock this zone's stock rows (always read through the same index -> same order)
    SELECT SUM(IF(resource_type = 'food', available, 0)),
           SUM(IF(resource_type = 'water', available, 0)),
           SUM(IF(resource_type = 'medicine', available, 0)),
           SUM(IF(resource_type = 'cots', available, 0)),
           SUM(IF(resource_type = 'vehicles', available, 0))
      INTO a_food, a_water, a_med, a_cots, a_veh
      FROM resources WHERE zone = v_zone FOR UPDATE;

    SET g_food = LEAST(n_food, a_food), g_water = LEAST(n_water, a_water),
        g_med = LEAST(n_med, a_med), g_cots = LEAST(n_cots, a_cots), g_veh = LEAST(n_veh, a_veh);

    IF g_food + g_water + g_med + g_cots + g_veh > 0 THEN
      UPDATE resources SET available = available - g_food,  allocated = allocated + g_food  WHERE zone = v_zone AND resource_type = 'food';
      UPDATE resources SET available = available - g_water, allocated = allocated + g_water WHERE zone = v_zone AND resource_type = 'water';
      UPDATE resources SET available = available - g_med,   allocated = allocated + g_med   WHERE zone = v_zone AND resource_type = 'medicine';
      UPDATE resources SET available = available - g_cots,  allocated = allocated + g_cots  WHERE zone = v_zone AND resource_type = 'cots';
      UPDATE resources SET available = available - g_veh,   allocated = allocated + g_veh   WHERE zone = v_zone AND resource_type = 'vehicles';

      INSERT INTO rescue_missions (kind, target_id, process_id, zone, food, water, medicine, cots, vehicles,
                                   worker, txn_id, picked_at, started_at)
      VALUES (p_kind, p_id, v_pid, v_zone, g_food, g_water, g_med, g_cots, g_veh,
              p_worker, p_txn, p_picked, p_started);
      SET p_mission = LAST_INSERT_ID();
    END IF;

    -- count down; trg_*_fulfilled flips status to 'fulfilled' at zero
    IF p_kind = 'case' THEN
      UPDATE emergency_cases
         SET food = food - g_food, water = water - g_water, medicine = medicine - g_med,
             cots = cots - g_cots, vehicles = vehicles - g_veh, status = 'waiting'
       WHERE id = p_id;
      SELECT status INTO p_status FROM emergency_cases WHERE id = p_id;
    ELSE
      UPDATE resource_requests
         SET food = food - g_food, water = water - g_water, medicine = medicine - g_med,
             cots = cots - g_cots, vehicles = vehicles - g_veh, status = 'waiting'
       WHERE id = p_id;
      SELECT status INTO p_status FROM resource_requests WHERE id = p_id;
    END IF;

    IF p_mission IS NOT NULL THEN
      UPDATE rescue_missions
         SET result = IF(p_status = 'fulfilled', 'fulfilled', 'partial'),
             finished_at = ROUND(UNIX_TIMESTAMP(NOW(3)) * 1000)
       WHERE id = p_mission;
    END IF;

    COMMIT;
  END IF;

  SET @res_txn_id = NULL, @res_actor = NULL, @res_target = NULL;
END$$

-- P2: a volunteer claims a mission. Row lock = only one winner.
DROP PROCEDURE IF EXISTS sp_DispatchRescueMission$$
CREATE PROCEDURE sp_DispatchRescueMission(
  IN  p_mission   INT,
  IN  p_volunteer INT,
  OUT p_result    VARCHAR(12)
)
BEGIN
  DECLARE v_status VARCHAR(12) DEFAULT NULL;
  DECLARE v_busy INT DEFAULT 0;

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;
  SELECT status INTO v_status FROM rescue_missions WHERE id = p_mission FOR UPDATE;
  SELECT COUNT(*) INTO v_busy FROM rescue_missions
   WHERE volunteer_id = p_volunteer AND status IN ('assigned', 'pickup', 'in_transit');

  IF v_status IS NULL THEN
    ROLLBACK; SET p_result = 'NOT_FOUND';
  ELSEIF v_status <> 'open' THEN
    ROLLBACK; SET p_result = 'TAKEN';
  ELSEIF v_busy > 0 THEN
    ROLLBACK; SET p_result = 'BUSY';
  ELSE
    UPDATE rescue_missions SET volunteer_id = p_volunteer, status = 'assigned' WHERE id = p_mission;
    UPDATE volunteers SET availability = 'busy' WHERE user_id = p_volunteer;
    COMMIT; SET p_result = 'OK';
  END IF;
END$$

DELIMITER ;
