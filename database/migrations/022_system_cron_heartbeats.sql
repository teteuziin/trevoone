-- Migration 022: System Cron Heartbeats
-- Bounded operational telemetry for background cron jobs (single row per job)

CREATE TABLE IF NOT EXISTS system_cron_heartbeats (
    job_name VARCHAR(64) NOT NULL,
    last_started_at DATETIME(3) NULL DEFAULT NULL,
    last_succeeded_at DATETIME(3) NULL DEFAULT NULL,
    last_failed_at DATETIME(3) NULL DEFAULT NULL,
    last_result VARCHAR(20) NOT NULL DEFAULT 'STARTED',
    processed_count INT UNSIGNED NOT NULL DEFAULT 0,
    created_count INT UNSIGNED NOT NULL DEFAULT 0,
    skipped_count INT UNSIGNED NOT NULL DEFAULT 0,
    last_error_code VARCHAR(64) NULL DEFAULT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (job_name)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci;
