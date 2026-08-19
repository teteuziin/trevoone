-- Migration 014: Missions Module Schema
-- Implements Missions foundation for Influenciador / VIP and Consultancy Admins

-- 1. Missions Table
CREATE TABLE IF NOT EXISTS missions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    public_id CHAR(36) NOT NULL,
    consultancy_id BIGINT UNSIGNED NOT NULL,
    assignee_membership_id BIGINT UNSIGNED NOT NULL,
    title VARCHAR(160) NOT NULL,
    objective VARCHAR(2000) NOT NULL,
    instructions TEXT NOT NULL,
    priority VARCHAR(16) NOT NULL DEFAULT 'NORMAL',
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    due_at_utc DATETIME(3) NOT NULL,
    timezone_snapshot VARCHAR(64) NOT NULL,
    created_by_user_id BIGINT UNSIGNED NOT NULL,
    started_at DATETIME(3) NULL,
    canceled_by_user_id BIGINT UNSIGNED NULL,
    canceled_at DATETIME(3) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_missions_public_id (public_id),
    KEY idx_missions_tenant_status (consultancy_id, status, due_at_utc),
    KEY idx_missions_assignee (assignee_membership_id, status, due_at_utc),
    CONSTRAINT fk_missions_consultancy FOREIGN KEY (consultancy_id) REFERENCES consultancies (id) ON DELETE RESTRICT,
    CONSTRAINT fk_missions_assignee FOREIGN KEY (assignee_membership_id) REFERENCES consultancy_members (id) ON DELETE RESTRICT,
    CONSTRAINT fk_missions_created_by FOREIGN KEY (created_by_user_id) REFERENCES users (id) ON DELETE RESTRICT,
    CONSTRAINT fk_missions_canceled_by FOREIGN KEY (canceled_by_user_id) REFERENCES users (id) ON DELETE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci;

-- 2. Mission Admin Reference Attachments Table
CREATE TABLE IF NOT EXISTS mission_attachments (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    public_id CHAR(36) NOT NULL,
    mission_id BIGINT UNSIGNED NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size_bytes INT UNSIGNED NOT NULL,
    mime_type VARCHAR(120) NOT NULL,
    sha256_hash CHAR(64) NOT NULL,
    storage_key VARCHAR(500) NOT NULL,
    uploaded_by_user_id BIGINT UNSIGNED NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_mission_attachments_public_id (public_id),
    KEY idx_mission_attachments_mission (mission_id),
    CONSTRAINT fk_mission_attachments_mission FOREIGN KEY (mission_id) REFERENCES missions (id) ON DELETE RESTRICT,
    CONSTRAINT fk_mission_attachments_uploader FOREIGN KEY (uploaded_by_user_id) REFERENCES users (id) ON DELETE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci;

-- 3. Mission Submissions Table (Append-only delivery history)
CREATE TABLE IF NOT EXISTS mission_submissions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    public_id CHAR(36) NOT NULL,
    mission_id BIGINT UNSIGNED NOT NULL,
    sequence_no INT UNSIGNED NOT NULL,
    notes TEXT NULL,
    submitted_by_user_id BIGINT UNSIGNED NOT NULL,
    review_decision VARCHAR(32) NULL,
    review_note VARCHAR(2000) NULL,
    reviewed_by_user_id BIGINT UNSIGNED NULL,
    reviewed_at DATETIME(3) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_mission_submissions_public_id (public_id),
    UNIQUE KEY uq_mission_submissions_seq (mission_id, sequence_no),
    KEY idx_mission_submissions_mission (mission_id, sequence_no DESC),
    CONSTRAINT fk_mission_submissions_mission FOREIGN KEY (mission_id) REFERENCES missions (id) ON DELETE RESTRICT,
    CONSTRAINT fk_mission_submissions_submitter FOREIGN KEY (submitted_by_user_id) REFERENCES users (id) ON DELETE RESTRICT,
    CONSTRAINT fk_mission_submissions_reviewer FOREIGN KEY (reviewed_by_user_id) REFERENCES users (id) ON DELETE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci;

-- 4. Mission Submission External Links Table
CREATE TABLE IF NOT EXISTS mission_submission_links (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    submission_id BIGINT UNSIGNED NOT NULL,
    url VARCHAR(2048) NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    KEY idx_submission_links_sub (submission_id),
    CONSTRAINT fk_submission_links_sub FOREIGN KEY (submission_id) REFERENCES mission_submissions (id) ON DELETE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci;

-- 5. Mission Submission Attachments Table
CREATE TABLE IF NOT EXISTS mission_submission_attachments (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    public_id CHAR(36) NOT NULL,
    submission_id BIGINT UNSIGNED NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size_bytes INT UNSIGNED NOT NULL,
    mime_type VARCHAR(120) NOT NULL,
    sha256_hash CHAR(64) NOT NULL,
    storage_key VARCHAR(500) NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_submission_attachments_public_id (public_id),
    KEY idx_submission_attachments_sub (submission_id),
    CONSTRAINT fk_submission_attachments_sub FOREIGN KEY (submission_id) REFERENCES mission_submissions (id) ON DELETE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci;
