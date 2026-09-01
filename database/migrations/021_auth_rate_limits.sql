CREATE TABLE auth_rate_limits (
    scope VARCHAR(64) NOT NULL,
    key_hash CHAR(64)
        CHARACTER SET ascii
        COLLATE ascii_bin
        NOT NULL,
    attempts INT UNSIGNED NOT NULL DEFAULT 1,
    window_start_at DATETIME(3) NOT NULL,
    expires_at DATETIME(3) NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (scope, key_hash),

    INDEX idx_auth_rate_limits_expires_at (
        expires_at
    )
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci;
