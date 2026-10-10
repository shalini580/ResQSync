-- ==============================================================================
-- ResQSync: Resource Coordination & Emergency Relief System
-- Complete MySQL Relational Database Schema & Seed Data
-- ==============================================================================

CREATE DATABASE IF NOT EXISTS resqsync_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE resqsync_db;

-- ------------------------------------------------------------------------------
-- 1. USERS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  email VARCHAR(191) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'restaurant', 'ngo', 'volunteer') NOT NULL,
  name VARCHAR(128) NOT NULL,
  phone VARCHAR(32),
  zone ENUM('Zone A', 'Zone B', 'Zone C', 'Zone D') NOT NULL DEFAULT 'Zone A',
  avatar VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_role (role),
  INDEX idx_users_zone (zone)
) ENGINE=InnoDB;

-- ------------------------------------------------------------------------------
-- 2. EMERGENCY CASES TABLE (Modeled as OS Processes with Priority Scheduling)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS emergency_cases (
  id VARCHAR(64) PRIMARY KEY,
  process_id VARCHAR(32) NOT NULL UNIQUE, -- OS PID (e.g. PID-101)
  title VARCHAR(191) NOT NULL,
  type ENUM('flood', 'fire', 'earthquake', 'medical', 'other') NOT NULL,
  priority ENUM('P1 - Critical', 'P2 - High', 'P3 - Medium', 'P4 - Low') NOT NULL,
  priority_score INT NOT NULL DEFAULT 1, -- 1 (Highest) to 4 (Lowest)
  zone ENUM('Zone A', 'Zone B', 'Zone C', 'Zone D') NOT NULL,
  location VARCHAR(255) NOT NULL,
  status ENUM('pending', 'allocated', 'in_progress', 'resolved') NOT NULL DEFAULT 'pending',
  required_food INT NOT NULL DEFAULT 0,
  required_water INT NOT NULL DEFAULT 0,
  required_medicine INT NOT NULL DEFAULT 0,
  required_vehicles INT NOT NULL DEFAULT 0,
  required_volunteers INT NOT NULL DEFAULT 0,
  arrival_time VARCHAR(32) NOT NULL,
  burst_time INT NOT NULL DEFAULT 45, -- in minutes
  reported_by VARCHAR(128),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_emergency_priority (priority),
  INDEX idx_emergency_status (status),
  INDEX idx_emergency_zone (zone)
) ENGINE=InnoDB;

-- ------------------------------------------------------------------------------
-- 3. MUNICIPAL RESOURCES TABLE (Resource Vector for Banker's Algorithm)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS resources (
  id VARCHAR(64) PRIMARY KEY,
  zone ENUM('Zone A', 'Zone B', 'Zone C', 'Zone D') NOT NULL,
  resource_type ENUM('food', 'water', 'medicine', 'vehicles', 'cots') NOT NULL,
  total_capacity INT NOT NULL,
  available_units INT NOT NULL,
  allocated_units INT NOT NULL DEFAULT 0,
  unit_name VARCHAR(64) NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_zone_resource (zone, resource_type)
) ENGINE=InnoDB;

-- ------------------------------------------------------------------------------
-- 4. SURPLUS FOOD DONATIONS TABLE (Restaurant Surplus Rescue Pipeline)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS surplus_food (
  id VARCHAR(64) PRIMARY KEY,
  restaurant_id VARCHAR(64),
  restaurant_name VARCHAR(128) NOT NULL,
  title VARCHAR(191) NOT NULL,
  quantity_servings INT NOT NULL,
  food_type VARCHAR(64) NOT NULL,
  zone ENUM('Zone A', 'Zone B', 'Zone C', 'Zone D') NOT NULL DEFAULT 'Zone A',
  preparation_time VARCHAR(32) NOT NULL,
  expiry_time VARCHAR(32) NOT NULL,
  pickup_window VARCHAR(64) NOT NULL,
  status ENUM('available', 'reserved', 'picked_up', 'delivered', 'expired') NOT NULL DEFAULT 'available',
  claimed_by_ngo_id VARCHAR(64),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_surplus_status (status),
  INDEX idx_surplus_zone (zone)
) ENGINE=InnoDB;

-- ------------------------------------------------------------------------------
-- 5. RESCUE MISSIONS TABLE (Protected with Mutex Concurrency)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rescue_missions (
  id VARCHAR(64) PRIMARY KEY,
  emergency_id VARCHAR(64),
  volunteer_id VARCHAR(64),
  volunteer_name VARCHAR(128),
  title VARCHAR(191) NOT NULL,
  status ENUM('assigned', 'pickup', 'in_transit', 'delivered', 'completed') NOT NULL DEFAULT 'assigned',
  priority ENUM('P1 - Critical', 'P2 - High', 'P3 - Medium', 'P4 - Low') NOT NULL DEFAULT 'P2 - High',
  pickup_location VARCHAR(255) NOT NULL,
  delivery_location VARCHAR(255) NOT NULL,
  zone ENUM('Zone A', 'Zone B', 'Zone C', 'Zone D') NOT NULL,
  mutex_lock_token VARCHAR(64), -- Concurrency Mutex Lock Token
  eta_minutes INT NOT NULL DEFAULT 20,
  allocated_food INT NOT NULL DEFAULT 0,
  allocated_water INT NOT NULL DEFAULT 0,
  allocated_medicine INT NOT NULL DEFAULT 0,
  allocated_vehicles INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_mission_status (status),
  INDEX idx_mission_volunteer (volunteer_id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------------------------
-- 6. VOLUNTEER PROFILES TABLE (Responder XP, Badges, Availability)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS volunteers (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(128) NOT NULL,
  email VARCHAR(191) NOT NULL,
  phone VARCHAR(32),
  zone ENUM('Zone A', 'Zone B', 'Zone C', 'Zone D') NOT NULL,
  skills TEXT NOT NULL,
  availability ENUM('Available', 'Busy', 'Offline') NOT NULL DEFAULT 'Available',
  active_mission_id VARCHAR(64),
  xp INT NOT NULL DEFAULT 0,
  coins INT NOT NULL DEFAULT 0,
  badge VARCHAR(64) NOT NULL DEFAULT 'Novice Responder',
  completed_missions_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ------------------------------------------------------------------------------
-- 7. ORGANISATIONS TABLE (NGOs, Shelters & Food Kitchens)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS organisations (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64),
  org_name VARCHAR(128) NOT NULL,
  org_type ENUM('NGO', 'Emergency Shelter', 'Community Kitchen', 'Restaurant') NOT NULL,
  zone ENUM('Zone A', 'Zone B', 'Zone C', 'Zone D') NOT NULL,
  address VARCHAR(255) NOT NULL,
  contact_person VARCHAR(128),
  contact_phone VARCHAR(32),
  capacity INT NOT NULL DEFAULT 100,
  current_occupancy INT NOT NULL DEFAULT 0,
  status ENUM('active', 'verified', 'pending') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ------------------------------------------------------------------------------
-- 8. RESOURCE REQUESTS TABLE (Shelter petitions for food/water/cots)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS resource_requests (
  id VARCHAR(64) PRIMARY KEY,
  ngo_id VARCHAR(64) NOT NULL,
  ngo_name VARCHAR(128) NOT NULL,
  zone ENUM('Zone A', 'Zone B', 'Zone C', 'Zone D') NOT NULL,
  requested_food INT NOT NULL DEFAULT 0,
  requested_water INT NOT NULL DEFAULT 0,
  requested_medicine INT NOT NULL DEFAULT 0,
  requested_cots INT NOT NULL DEFAULT 0,
  priority ENUM('P1 - Critical', 'P2 - High', 'P3 - Medium', 'P4 - Low') NOT NULL DEFAULT 'P2 - High',
  status ENUM('pending', 'approved', 'dispatched', 'delivered') NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ------------------------------------------------------------------------------
-- 9. NOTIFICATIONS & AUDIT LEDGER (DBMS Event Log)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS system_notifications (
  id VARCHAR(64) PRIMARY KEY,
  type ENUM('critical', 'alert', 'info', 'success') NOT NULL DEFAULT 'info',
  title VARCHAR(191) NOT NULL,
  message TEXT NOT NULL,
  recipient_role VARCHAR(32), -- 'all', 'admin', 'restaurant', 'ngo', 'volunteer'
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  action VARCHAR(64) NOT NULL,
  entity_type VARCHAR(64) NOT NULL,
  entity_id VARCHAR(64) NOT NULL,
  actor VARCHAR(128) NOT NULL,
  details TEXT,
  os_concept VARCHAR(64),
  dbms_concept VARCHAR(64),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ------------------------------------------------------------------------------
-- INITIAL SEED DATA
-- ------------------------------------------------------------------------------

-- Seed Users
INSERT INTO users (id, email, password, role, name, phone, zone) VALUES
('u_admin', 'admin@gmail.com', 'admin123', 'admin', 'Chief Controller Marcus Vance', '+1 555-0101', 'Zone A'),
('u_rest', 'marcus@gmail.com', 'password123', 'restaurant', 'Marcus Delano (Metro Kitchen)', '+1 555-0102', 'Zone A'),
('u_ngo', 'shantingo@gmail.com', 'password123', 'ngo', 'Shanti Shelter Coordinator', '+1 555-0103', 'Zone B'),
('u_vol', 'alex@gmail.com', 'password123', 'volunteer', 'Alex Rivera (First Responder)', '+1 555-0104', 'Zone A')
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- Seed Municipal Resources
INSERT INTO resources (id, zone, resource_type, total_capacity, available_units, allocated_units, unit_name) VALUES
('res_a_food', 'Zone A', 'food', 500, 320, 180, 'Ration Meals'),
('res_a_water', 'Zone A', 'water', 600, 450, 150, 'Potable Crates (20L)'),
('res_a_med', 'Zone A', 'medicine', 200, 140, 60, 'Trauma Kits'),
('res_a_veh', 'Zone A', 'vehicles', 25, 18, 7, 'Rescue Vans'),
('res_a_cot', 'Zone A', 'cots', 300, 220, 80, 'Emergency Cots'),

('res_b_food', 'Zone B', 'food', 400, 260, 140, 'Ration Meals'),
('res_b_water', 'Zone B', 'water', 500, 310, 190, 'Potable Crates (20L)'),
('res_b_med', 'Zone B', 'medicine', 150, 95, 55, 'Trauma Kits'),
('res_b_veh', 'Zone B', 'vehicles', 20, 12, 8, 'Rescue Vans'),
('res_b_cot', 'Zone B', 'cots', 250, 175, 75, 'Emergency Cots'),

('res_c_food', 'Zone C', 'food', 350, 200, 150, 'Ration Meals'),
('res_c_water', 'Zone C', 'water', 450, 290, 160, 'Potable Crates (20L)'),
('res_c_med', 'Zone C', 'medicine', 180, 120, 60, 'Trauma Kits'),
('res_c_veh', 'Zone C', 'vehicles', 15, 9, 6, 'Rescue Vans'),
('res_c_cot', 'Zone C', 'cots', 200, 130, 70, 'Emergency Cots'),

('res_d_food', 'Zone D', 'food', 300, 180, 120, 'Ration Meals'),
('res_d_water', 'Zone D', 'water', 400, 230, 170, 'Potable Crates (20L)'),
('res_d_med', 'Zone D', 'medicine', 120, 75, 45, 'Trauma Kits'),
('res_d_veh', 'Zone D', 'vehicles', 12, 8, 4, 'Rescue Vans'),
('res_d_cot', 'Zone D', 'cots', 150, 95, 55, 'Emergency Cots')
ON DUPLICATE KEY UPDATE available_units=VALUES(available_units);

-- Seed Emergency Cases
INSERT INTO emergency_cases (id, process_id, title, type, priority, priority_score, zone, location, status, required_food, required_water, required_medicine, required_vehicles, required_volunteers, arrival_time, burst_time, reported_by) VALUES
('em_1', 'PID-101', 'Flash Flood River Overflow at Sector 4', 'flood', 'P1 - Critical', 1, 'Zone A', 'North Riverside Crossing', 'in_progress', 60, 80, 25, 4, 8, '10:14 AM', 60, 'Civil Defense Beacon'),
('em_2', 'PID-102', 'Commercial Kitchen Chemical Fire', 'fire', 'P1 - Critical', 1, 'Zone B', 'Market Street Block 12', 'in_progress', 20, 40, 30, 3, 6, '10:28 AM', 45, 'Emergency 911 Dispatch'),
('em_3', 'PID-103', 'Apartment Building Structural Tremor Damage', 'earthquake', 'P2 - High', 2, 'Zone C', 'Highland Ridge Complex', 'allocated', 50, 60, 20, 2, 5, '10:45 AM', 50, 'Municipal Structural Sensor'),
('em_4', 'PID-104', 'Mass Heatstroke at Central Relief Center', 'medical', 'P1 - Critical', 1, 'Zone A', 'Central Plaza Shelter', 'pending', 30, 70, 40, 2, 7, '11:05 AM', 35, 'Shelter Medical Officer'),
('em_5', 'PID-105', 'Secondary Supply Shortage at East Camp', 'other', 'P3 - Medium', 3, 'Zone D', 'East District High School', 'pending', 40, 50, 10, 1, 3, '11:20 AM', 25, 'Zone D Relief Volunteers')
ON DUPLICATE KEY UPDATE title=VALUES(title);

-- Seed Surplus Food
INSERT INTO surplus_food (id, restaurant_id, restaurant_name, title, quantity_servings, food_type, zone, preparation_time, expiry_time, pickup_window, status) VALUES
('food_1', 'u_rest', 'Metro Central Kitchen', 'Nutritious Steamed Rice & Lentil Stew', 75, 'Fresh Cooked Meals', 'Zone A', '09:30 AM', '02:00 PM', '11:00 AM - 01:00 PM', 'available'),
('food_2', 'u_rest', 'Grand Plaza Buffet', 'Artisan Bread Rolls & Vegetable Medley', 110, 'Baked & Produce', 'Zone B', '08:45 AM', '03:30 PM', '11:30 AM - 01:30 PM', 'reserved'),
('food_3', 'u_rest', 'Green Garden Bistro', 'Packed Protein Sandwiches & Clean Juices', 60, 'Packaged Lunch', 'Zone A', '10:00 AM', '04:00 PM', '12:00 PM - 02:00 PM', 'available')
ON DUPLICATE KEY UPDATE title=VALUES(title);

-- Seed Rescue Missions
INSERT INTO rescue_missions (id, emergency_id, volunteer_id, volunteer_name, title, status, priority, pickup_location, delivery_location, zone, eta_minutes, allocated_food, allocated_water, allocated_medicine, allocated_vehicles) VALUES
('ms_1', 'em_1', 'u_vol', 'Alex Rivera', 'Urgent Flood Evacuation & Potable Water Delivery', 'in_transit', 'P1 - Critical', 'Central Depot A', 'North Riverside Crossing', 'Zone A', 12, 60, 80, 25, 2),
('ms_2', 'em_2', NULL, NULL, 'Medical Trauma Kit Deployment to Sector 12 Fire', 'assigned', 'P1 - Critical', 'Hospital Warehouse B', 'Market Street Block 12', 'Zone B', 18, 0, 40, 30, 1)
ON DUPLICATE KEY UPDATE title=VALUES(title);

-- Seed Volunteer
INSERT INTO volunteers (id, user_id, name, email, phone, zone, skills, availability, active_mission_id, xp, coins, badge, completed_missions_count) VALUES
('vol_1', 'u_vol', 'Alex Rivera', 'alex@gmail.com', '+1 555-0104', 'Zone A', 'EMT Certified, Water Rescue, Van Driver', 'Busy', 'ms_1', 480, 120, 'Silver Vanguard', 14)
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- Seed Organisation
INSERT INTO organisations (id, user_id, org_name, org_type, zone, address, contact_person, contact_phone, capacity, current_occupancy, status) VALUES
('org_1', 'u_ngo', 'Shanti Emergency Relief Shelter', 'Emergency Shelter', 'Zone B', '452 Relief Way, Zone B', 'Shanti Sharma', '+1 555-0103', 150, 94, 'verified'),
('org_2', 'u_rest', 'Metro Central Kitchen', 'Restaurant', 'Zone A', '12 Commercial Blvd, Zone A', 'Marcus Delano', '+1 555-0102', 300, 0, 'verified')
ON DUPLICATE KEY UPDATE org_name=VALUES(org_name);

-- Seed Notifications
INSERT INTO system_notifications (id, type, title, message, recipient_role) VALUES
('nt_1', 'critical', 'Flood Alarm in Zone A', 'Water level crossed safety barrier at Sector 4. Priority 1 triage active.', 'all'),
('nt_2', 'alert', 'Perishable Food Expiry in 2.5h', '75 servings at Metro Central Kitchen require pickup dispatch before 02:00 PM.', 'restaurant'),
('nt_3', 'success', 'Safe Resource Allocation Verified', 'Banker Algorithm verified state safe. 140 units allocated with zero deadlock risk.', 'admin');

-- ==============================================================================
-- 11. ADVANCED DATABASE INDEXING (B-Tree Composite & Covering Indexes)
-- ==============================================================================
-- Multi-column composite index for lightning-fast Emergency Triage queries
CREATE INDEX IF NOT EXISTS idx_em_zone_priority_status
  ON emergency_cases (zone, priority_score, status);

-- Composite index for surplus food expiry monitoring (Range queries)
CREATE INDEX IF NOT EXISTS idx_surplus_zone_status_expiry
  ON surplus_food (zone, status, expiry_time);

-- Composite index for volunteer dispatcher search
CREATE INDEX IF NOT EXISTS idx_vol_zone_avail_xp
  ON volunteers (zone, availability, xp);

-- Covering index for municipal resource inventory queries
CREATE INDEX IF NOT EXISTS idx_resources_zone_avail
  ON resources (zone, available_units);

-- ==============================================================================
-- 12. DATABASE VIEWS (Virtual Tables for Role-Based Aggregations)
-- ==============================================================================

-- VIEW 1: Active Critical Emergencies Summary
CREATE OR REPLACE VIEW v_active_emergencies_summary AS
SELECT
  e.id,
  e.process_id,
  e.title,
  e.priority,
  e.zone,
  e.status,
  e.required_food + e.required_water + e.required_medicine AS total_supplies_needed,
  e.required_vehicles,
  e.required_volunteers,
  COUNT(m.id) AS assigned_missions_count
FROM emergency_cases e
LEFT JOIN rescue_missions m ON e.id = m.emergency_id
WHERE e.status IN ('pending', 'allocated', 'in_progress')
GROUP BY e.id, e.process_id, e.title, e.priority, e.zone, e.status, e.required_food, e.required_water, e.required_medicine, e.required_vehicles, e.required_volunteers;

-- VIEW 2: Zone Municipal Resource Deficit & Availability Rates
CREATE OR REPLACE VIEW v_zone_resource_deficits AS
SELECT
  zone,
  resource_type,
  total_capacity,
  available_units,
  allocated_units,
  ROUND((available_units / total_capacity) * 100, 1) AS availability_pct,
  CASE
    WHEN available_units < (total_capacity * 0.25) THEN 'CRITICAL_DEFICIT'
    WHEN available_units < (total_capacity * 0.50) THEN 'MODERATE_STOCK'
    ELSE 'HEALTHY_STOCK'
  END AS inventory_health
FROM resources;

-- VIEW 3: Volunteer Leaderboard & Readiness View
CREATE OR REPLACE VIEW v_volunteer_leaderboard AS
SELECT
  id,
  name,
  zone,
  availability,
  xp,
  coins,
  badge,
  completed_missions_count,
  DENSE_RANK() OVER (ORDER BY xp DESC) AS civic_rank
FROM volunteers;

-- VIEW 4: Restaurant Surplus Rescue Pipeline Overview
CREATE OR REPLACE VIEW v_food_rescue_stats AS
SELECT
  restaurant_name,
  zone,
  COUNT(*) AS total_donations,
  SUM(quantity_servings) AS total_servings_donated,
  SUM(CASE WHEN status = 'delivered' THEN quantity_servings ELSE 0 END) AS servings_delivered,
  SUM(CASE WHEN status = 'available' THEN quantity_servings ELSE 0 END) AS servings_awaiting_pickup
FROM surplus_food
GROUP BY restaurant_name, zone;

-- ==============================================================================
-- 13. DATABASE TRIGGERS (Automated Business Logic & Invariant Enforcement)
-- ==============================================================================
DELIMITER //

-- TRIGGER 1: Check Resource Invariant Before Update (Prevents Underflow/Negative Inventory)
CREATE TRIGGER IF NOT EXISTS trg_prevent_resource_underflow
BEFORE UPDATE ON resources
FOR EACH ROW
BEGIN
  IF NEW.available_units < 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'DBMS TRIGGER ERROR: Available resource units cannot be negative. Allocation violates inventory constraint.';
  END IF;
END //

-- TRIGGER 2: Automatic Audit Logging on Emergency Status Change
CREATE TRIGGER IF NOT EXISTS trg_audit_emergency_status_update
AFTER UPDATE ON emergency_cases
FOR EACH ROW
BEGIN
  IF OLD.status <> NEW.status THEN
    INSERT INTO audit_logs (id, timestamp, actor, role, action, target_entity, details)
    VALUES (
      UUID(),
      NOW(),
      'DBMS Kernel Trigger',
      'system',
      'TRIGGER_STATUS_TRANSITION',
      CONCAT('emergency_case:', NEW.id),
      CONCAT('Automatic audit log: Status transitioned from [', OLD.status, '] to [', NEW.status, ']')
    );
  END IF;
END //

-- TRIGGER 3: Surplus Food Expiry Auto-Alert Notification
CREATE TRIGGER IF NOT EXISTS trg_surplus_food_auto_alert
AFTER INSERT ON surplus_food
FOR EACH ROW
BEGIN
  IF NEW.quantity_servings >= 50 THEN
    INSERT INTO system_notifications (id, type, title, message, recipient_role)
    VALUES (
      UUID(),
      'alert',
      CONCAT('High-Volume Food Surplus in ', NEW.zone),
      CONCAT(NEW.restaurant_name, ' reported ', NEW.quantity_servings, ' servings of ', NEW.title, '. Immediate shelter pickup recommended.'),
      'ngo'
    );
  END IF;
END //

-- ==============================================================================
-- 14. STORED PROCEDURES (Atomic Transactions & ACID Compliance)
-- ==============================================================================

-- STORED PROCEDURE 1: Atomic Emergency Resource Allocation (ACID Transaction with Row Locks)
CREATE PROCEDURE IF NOT EXISTS sp_allocate_emergency_resources(
  IN p_case_id VARCHAR(64),
  IN p_actor VARCHAR(128),
  OUT p_status_code INT,
  OUT p_status_msg VARCHAR(255)
)
proc_label: BEGIN
  DECLARE v_zone VARCHAR(32);
  DECLARE v_req_food INT;
  DECLARE v_req_water INT;
  DECLARE v_req_med INT;
  DECLARE v_req_veh INT;
  DECLARE v_avail_food INT;
  DECLARE v_avail_water INT;
  DECLARE v_avail_med INT;
  DECLARE v_avail_veh INT;

  -- Error handler for automatic rollback
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    SET p_status_code = 500;
    SET p_status_msg = 'TRANSACTION ROLLED BACK: Exception occurred during atomic resource allocation.';
  END;

  -- START TRANSACTION (Atomicity & Isolation)
  START TRANSACTION;

  -- Fetch required amounts and lock the emergency case row (Pessimistic concurrency lock)
  SELECT zone, required_food, required_water, required_medicine, required_vehicles
  INTO v_zone, v_req_food, v_req_water, v_req_med, v_req_veh
  FROM emergency_cases
  WHERE id = p_case_id
  FOR UPDATE;

  -- Fetch and lock resource rows using SELECT ... FOR UPDATE (Prevents race conditions)
  SELECT available_units INTO v_avail_food FROM resources WHERE zone = v_zone AND resource_type = 'food' FOR UPDATE;
  SELECT available_units INTO v_avail_water FROM resources WHERE zone = v_zone AND resource_type = 'water' FOR UPDATE;
  SELECT available_units INTO v_avail_med FROM resources WHERE zone = v_zone AND resource_type = 'medicine' FOR UPDATE;
  SELECT available_units INTO v_avail_veh FROM resources WHERE zone = v_zone AND resource_type = 'vehicles' FOR UPDATE;

  -- Verify sufficient inventory exists (Consistency)
  IF v_avail_food < v_req_food OR v_avail_water < v_req_water OR v_avail_med < v_req_med OR v_avail_veh < v_req_veh THEN
    ROLLBACK;
    SET p_status_code = 409;
    SET p_status_msg = 'ALLOCATION REJECTED: Insufficient municipal inventory in target zone. Transaction aborted.';
    LEAVE proc_label;
  END IF;

  -- Deduct allocated amounts from available inventory
  UPDATE resources SET available_units = available_units - v_req_food, allocated_units = allocated_units + v_req_food WHERE zone = v_zone AND resource_type = 'food';
  UPDATE resources SET available_units = available_units - v_req_water, allocated_units = allocated_units + v_req_water WHERE zone = v_zone AND resource_type = 'water';
  UPDATE resources SET available_units = available_units - v_req_med, allocated_units = allocated_units + v_req_med WHERE zone = v_zone AND resource_type = 'medicine';
  UPDATE resources SET available_units = available_units - v_req_veh, allocated_units = allocated_units + v_req_veh WHERE zone = v_zone AND resource_type = 'vehicles';

  -- Update emergency case state
  UPDATE emergency_cases SET status = 'allocated' WHERE id = p_case_id;

  -- Create persistent audit trail (Durability)
  INSERT INTO audit_logs (id, timestamp, actor, role, action, target_entity, details)
  VALUES (
    UUID(),
    NOW(),
    p_actor,
    'admin',
    'STORED_PROCEDURE_ALLOCATE',
    CONCAT('case:', p_case_id),
    CONCAT('Atomic allocation completed: Food=', v_req_food, ', Water=', v_req_water, ', Medicine=', v_req_med, ', Vehicles=', v_req_veh)
  );

  -- Commit changes atomically
  COMMIT;
  SET p_status_code = 200;
  SET p_status_msg = 'TRANSACTION COMMITTED: Municipal resources allocated atomically under strict isolation.';
END //

-- STORED PROCEDURE 2: Concurrency-Safe Mission Claiming (Mutex Simulation via MySQL Row Lock)
CREATE PROCEDURE IF NOT EXISTS sp_claim_rescue_mission(
  IN p_mission_id VARCHAR(64),
  IN p_volunteer_id VARCHAR(64),
  IN p_volunteer_name VARCHAR(128),
  OUT p_success INT,
  OUT p_message VARCHAR(255)
)
BEGIN
  DECLARE v_current_status VARCHAR(32);
  DECLARE v_assigned_vol VARCHAR(64);

  START TRANSACTION;

  -- Lock specific mission row exclusively (FOR UPDATE)
  SELECT status, volunteer_id
  INTO v_current_status, v_assigned_vol
  FROM rescue_missions
  WHERE id = p_mission_id
  FOR UPDATE;

  -- Verify mutual exclusion
  IF v_current_status <> 'assigned' OR v_assigned_vol IS NOT NULL THEN
    ROLLBACK;
    SET p_success = 0;
    SET p_message = 'MUTEX LOCK CONTENTION: Mission already claimed by another concurrent responder.';
  ELSE
    UPDATE rescue_missions
    SET volunteer_id = p_volunteer_id,
        volunteer_name = p_volunteer_name,
        status = 'in_transit'
    WHERE id = p_mission_id;

    UPDATE volunteers
    SET availability = 'Busy', active_mission_id = p_mission_id
    WHERE id = p_volunteer_id;

    COMMIT;
    SET p_success = 1;
    SET p_message = 'MISSION SECURED: Row lock held, claim committed atomically.';
  END IF;
END //

DELIMITER ;
