CREATE TABLE auth_sessions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL,
    token_hash CHAR(64)
        CHARACTER SET ascii
        COLLATE ascii_bin
        NOT NULL,
    remember_me TINYINT(1) NOT NULL DEFAULT 0,
    expires_at DATETIME(3) NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    revoked_at DATETIME(3) NULL DEFAULT NULL,

    PRIMARY KEY (id),

    CONSTRAINT uq_auth_sessions_token_hash
        UNIQUE (token_hash),

    INDEX idx_auth_sessions_expires_at (
        expires_at
    ),

    INDEX idx_auth_sessions_user_state_expiry (
        user_id,
        revoked_at,
        expires_at
    ),

    CONSTRAINT fk_auth_sessions_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci;
