CREATE TABLE consultation_signaling_sessions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    public_id CHAR(36) NOT NULL,
    consultancy_id BIGINT UNSIGNED NOT NULL,
    consultation_id BIGINT UNSIGNED NOT NULL,
    generation INT UNSIGNED NOT NULL DEFAULT 1,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    expires_at DATETIME(3) NOT NULL,
    closed_at DATETIME(3) NULL DEFAULT NULL,

    PRIMARY KEY (id),

    CONSTRAINT uq_signaling_sessions_public_id
        UNIQUE (public_id),

    CONSTRAINT uq_signaling_sessions_consultation_gen
        UNIQUE (consultation_id, generation),

    KEY idx_signaling_sessions_active
        (consultation_id, closed_at, expires_at),

    KEY idx_signaling_sessions_tenant
        (consultancy_id),

    CONSTRAINT fk_signaling_sessions_consultancy
        FOREIGN KEY (consultancy_id)
        REFERENCES consultancies(id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT,

    CONSTRAINT fk_signaling_sessions_consultation
        FOREIGN KEY (consultation_id)
        REFERENCES consultations(id)
        ON DELETE CASCADE
        ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci;

CREATE TABLE consultation_signaling_messages (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    signaling_session_id BIGINT UNSIGNED NOT NULL,
    sender_membership_id BIGINT UNSIGNED NOT NULL,
    client_message_id CHAR(36) NOT NULL,
    message_type VARCHAR(20) NOT NULL,
    payload TEXT NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    expires_at DATETIME(3) NOT NULL,

    PRIMARY KEY (id),

    CONSTRAINT uq_signaling_messages_idempotency
        UNIQUE (signaling_session_id, sender_membership_id, client_message_id),

    KEY idx_signaling_messages_poll
        (signaling_session_id, sender_membership_id, id, expires_at),

    KEY idx_signaling_messages_expiry
        (expires_at),

    CONSTRAINT fk_signaling_messages_session
        FOREIGN KEY (signaling_session_id)
        REFERENCES consultation_signaling_sessions(id)
        ON DELETE CASCADE
        ON UPDATE RESTRICT,

    CONSTRAINT fk_signaling_messages_sender
        FOREIGN KEY (sender_membership_id)
        REFERENCES consultancy_members(id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci;
