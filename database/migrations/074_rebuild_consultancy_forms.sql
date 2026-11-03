-- Migration 074: Rebuild Consultancy Forms
-- Replaces legacy custom-forms tables with modernized consultancy_forms and consultancy_form_assignments
-- Preserves audit history and multi-tenant isolation via consultancy_id.

-- 1. Create new consultancy_forms table
CREATE TABLE IF NOT EXISTS consultancy_forms (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  public_id CHAR(36) NOT NULL UNIQUE,
  consultancy_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT NULL,
  questions_json JSON NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
  is_recurring TINYINT(1) NOT NULL DEFAULT 0,
  recurrence_rule VARCHAR(50) NULL,
  created_by_user_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at DATETIME(3) NULL,
  CONSTRAINT fk_cf_consultancy FOREIGN KEY (consultancy_id) REFERENCES consultancies(id),
  INDEX idx_cf_tenant_status (consultancy_id, status, deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Create new consultancy_form_assignments table
CREATE TABLE IF NOT EXISTS consultancy_form_assignments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  public_id CHAR(36) NOT NULL UNIQUE,
  consultancy_id BIGINT UNSIGNED NOT NULL,
  form_id BIGINT UNSIGNED NOT NULL,
  student_membership_id BIGINT UNSIGNED NOT NULL,
  student_user_id BIGINT UNSIGNED NOT NULL,
  assigned_by_user_id BIGINT UNSIGNED NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  due_date DATE NULL,
  responses_json JSON NULL,
  reviewer_notes TEXT NULL,
  reviewed_by_user_id BIGINT UNSIGNED NULL,
  submitted_at DATETIME(3) NULL,
  reviewed_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_cfa_consultancy FOREIGN KEY (consultancy_id) REFERENCES consultancies(id),
  CONSTRAINT fk_cfa_form FOREIGN KEY (form_id) REFERENCES consultancy_forms(id),
  CONSTRAINT fk_cfa_member FOREIGN KEY (student_membership_id) REFERENCES consultancy_members(id),
  INDEX idx_cfa_tenant_status (consultancy_id, status),
  INDEX idx_cfa_student (student_user_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
