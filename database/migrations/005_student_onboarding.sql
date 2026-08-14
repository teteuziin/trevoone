CREATE TABLE consultancy_onboarding_requirements (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    public_id CHAR(36) NOT NULL,
    consultancy_id BIGINT UNSIGNED NOT NULL,
    requirement_key VARCHAR(100) NOT NULL,
    title VARCHAR(200) NOT NULL,
    requirement_type VARCHAR(50) NOT NULL DEFAULT 'EXTERNAL_FORM',
    external_url VARCHAR(1000) NOT NULL,
    applies_to_role VARCHAR(32) NOT NULL DEFAULT 'STUDENT',
    sort_order INT NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at DATETIME(3) NULL DEFAULT NULL,

    PRIMARY KEY (id),

    CONSTRAINT uq_consultancy_onboarding_requirements_public_id
        UNIQUE (public_id),

    CONSTRAINT uq_consultancy_onboarding_requirements_consultancy_key
        UNIQUE (consultancy_id, requirement_key),

    INDEX idx_cor_consultancy_role_status (
        consultancy_id,
        applies_to_role,
        status,
        deleted_at,
        sort_order
    ),

    CONSTRAINT fk_cor_consultancy
        FOREIGN KEY (consultancy_id)
        REFERENCES consultancies(id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci;

CREATE TABLE consultancy_member_onboarding_requirements (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    public_id CHAR(36) NOT NULL,
    membership_id BIGINT UNSIGNED NOT NULL,
    requirement_id BIGINT UNSIGNED NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    submitted_at DATETIME(3) NULL DEFAULT NULL,
    confirmed_at DATETIME(3) NULL DEFAULT NULL,
    confirmed_by_user_id BIGINT UNSIGNED NULL DEFAULT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),

    CONSTRAINT uq_cmor_public_id
        UNIQUE (public_id),

    CONSTRAINT uq_cmor_membership_requirement
        UNIQUE (membership_id, requirement_id),

    INDEX idx_cmor_membership_status (
        membership_id,
        status
    ),

    INDEX idx_cmor_requirement_status (
        requirement_id,
        status
    ),

    INDEX idx_cmor_confirmed_by (
        confirmed_by_user_id
    ),

    CONSTRAINT fk_cmor_membership
        FOREIGN KEY (membership_id)
        REFERENCES consultancy_members(id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT,

    CONSTRAINT fk_cmor_requirement
        FOREIGN KEY (requirement_id)
        REFERENCES consultancy_onboarding_requirements(id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT,

    CONSTRAINT fk_cmor_confirmed_by
        FOREIGN KEY (confirmed_by_user_id)
        REFERENCES users(id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci;
