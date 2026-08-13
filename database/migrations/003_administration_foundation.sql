CREATE TABLE platform_admins (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    granted_by_user_id BIGINT UNSIGNED NULL DEFAULT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),

    CONSTRAINT uq_platform_admins_user
        UNIQUE (user_id),

    INDEX idx_platform_admins_status (
        status
    ),

    INDEX idx_platform_admins_granted_by_user (
        granted_by_user_id
    ),

    CONSTRAINT fk_platform_admins_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT,

    CONSTRAINT fk_platform_admins_granted_by_user
        FOREIGN KEY (granted_by_user_id)
        REFERENCES users(id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci;

CREATE TABLE consultancy_invitations (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    public_id CHAR(36) NOT NULL,
    consultancy_id BIGINT UNSIGNED NOT NULL,
    email VARCHAR(254) NOT NULL,
    token_hash CHAR(64)
        CHARACTER SET ascii
        COLLATE ascii_bin
        NOT NULL,
    created_by_user_id BIGINT UNSIGNED NOT NULL,
    expires_at DATETIME(3) NOT NULL,
    accepted_at DATETIME(3) NULL DEFAULT NULL,
    accepted_by_user_id BIGINT UNSIGNED NULL DEFAULT NULL,
    revoked_at DATETIME(3) NULL DEFAULT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),

    CONSTRAINT uq_consultancy_invitations_public_id
        UNIQUE (public_id),

    CONSTRAINT uq_consultancy_invitations_token_hash
        UNIQUE (token_hash),

    INDEX idx_consultancy_invitations_consultancy_created (
        consultancy_id,
        created_at
    ),

    INDEX idx_consultancy_invitations_email_expires (
        email,
        expires_at
    ),

    INDEX idx_consultancy_invitations_expires_at (
        expires_at
    ),

    INDEX idx_consultancy_invitations_created_by (
        created_by_user_id
    ),

    INDEX idx_consultancy_invitations_accepted_by (
        accepted_by_user_id
    ),

    CONSTRAINT fk_consultancy_invitations_consultancy
        FOREIGN KEY (consultancy_id)
        REFERENCES consultancies(id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT,

    CONSTRAINT fk_consultancy_invitations_created_by
        FOREIGN KEY (created_by_user_id)
        REFERENCES users(id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT,

    CONSTRAINT fk_consultancy_invitations_accepted_by
        FOREIGN KEY (accepted_by_user_id)
        REFERENCES users(id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci;

CREATE TABLE consultancy_invitation_roles (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    invitation_id BIGINT UNSIGNED NOT NULL,
    role VARCHAR(32) NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),

    CONSTRAINT uq_consultancy_invitation_roles_invitation_role
        UNIQUE (
            invitation_id,
            role
        ),

    CONSTRAINT fk_consultancy_invitation_roles_invitation
        FOREIGN KEY (invitation_id)
        REFERENCES consultancy_invitations(id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci;

CREATE TABLE audit_events (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    public_id CHAR(36) NOT NULL,
    actor_user_id BIGINT UNSIGNED NULL DEFAULT NULL,
    consultancy_id BIGINT UNSIGNED NULL DEFAULT NULL,
    action VARCHAR(80) NOT NULL,
    target_type VARCHAR(50) NOT NULL,
    target_public_id CHAR(36) NULL DEFAULT NULL,
    metadata_json TEXT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),

    CONSTRAINT uq_audit_events_public_id
        UNIQUE (public_id),

    INDEX idx_audit_events_actor_created (
        actor_user_id,
        created_at
    ),

    INDEX idx_audit_events_consultancy_created (
        consultancy_id,
        created_at
    ),

    INDEX idx_audit_events_target (
        target_type,
        target_public_id,
        created_at
    ),

    INDEX idx_audit_events_action_created (
        action,
        created_at
    ),

    CONSTRAINT fk_audit_events_actor
        FOREIGN KEY (actor_user_id)
        REFERENCES users(id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT,

    CONSTRAINT fk_audit_events_consultancy
        FOREIGN KEY (consultancy_id)
        REFERENCES consultancies(id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci;
