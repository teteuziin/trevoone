-- Migration: 032_nutrition_v2_patient_records.sql
-- Description: Professional patient record, clinical history, anthropometrics and pregnancy (Release H)

-- 1. nutrition_v2_patient_records: clinical & lifestyle root record per student in consultancy
CREATE TABLE IF NOT EXISTS nutrition_v2_patient_records (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    public_id CHAR(36) NOT NULL,
    consultancy_id BIGINT UNSIGNED NOT NULL,
    student_membership_id BIGINT UNSIGNED NOT NULL,
    created_by_membership_id BIGINT UNSIGNED NOT NULL,

    -- Basic Clinical Information
    occupation VARCHAR(255) NULL DEFAULT NULL,
    routine_notes TEXT NULL DEFAULT NULL,
    follow_up_reason TEXT NULL DEFAULT NULL,
    main_objective TEXT NULL DEFAULT NULL,
    clinical_observations TEXT NULL DEFAULT NULL,

    -- Health History
    diagnosed_conditions TEXT NULL DEFAULT NULL,
    previous_surgeries TEXT NULL DEFAULT NULL,
    hospitalizations TEXT NULL DEFAULT NULL,
    allergies TEXT NULL DEFAULT NULL,
    food_allergies_intolerances TEXT NULL DEFAULT NULL,
    current_medications TEXT NULL DEFAULT NULL,
    supplements TEXT NULL DEFAULT NULL,
    family_history TEXT NULL DEFAULT NULL,
    gastrointestinal_notes TEXT NULL DEFAULT NULL,
    bowel_habit VARCHAR(100) NULL DEFAULT NULL,
    sleep_notes TEXT NULL DEFAULT NULL,
    hydration_notes TEXT NULL DEFAULT NULL,

    -- Nutritional History
    food_preferences TEXT NULL DEFAULT NULL,
    disliked_foods TEXT NULL DEFAULT NULL,
    dietary_restrictions TEXT NULL DEFAULT NULL,
    usual_eating_routine TEXT NULL DEFAULT NULL,
    meal_schedule_notes TEXT NULL DEFAULT NULL,
    appetite_notes TEXT NULL DEFAULT NULL,
    difficulties_adherence_notes TEXT NULL DEFAULT NULL,

    -- Lifestyle
    physical_activity_notes TEXT NULL DEFAULT NULL,
    smoking_status VARCHAR(50) NULL DEFAULT NULL,
    alcohol_notes TEXT NULL DEFAULT NULL,
    sleep_routine TEXT NULL DEFAULT NULL,
    work_study_routine TEXT NULL DEFAULT NULL,

    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at DATETIME(3) NULL DEFAULT NULL,

    PRIMARY KEY (id),

    CONSTRAINT uq_nutrition_v2_patient_records_public_id
        UNIQUE (public_id),

    CONSTRAINT uq_n2pr_consultancy_student
        UNIQUE (consultancy_id, student_membership_id),

    INDEX idx_n2pr_student (student_membership_id),

    CONSTRAINT fk_n2pr_consultancy
        FOREIGN KEY (consultancy_id)
        REFERENCES consultancies (id)
        ON DELETE CASCADE,

    CONSTRAINT fk_n2pr_student_membership
        FOREIGN KEY (student_membership_id)
        REFERENCES consultancy_members (id)
        ON DELETE CASCADE,

    CONSTRAINT fk_n2pr_created_by
        FOREIGN KEY (created_by_membership_id)
        REFERENCES consultancy_members (id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci;

-- 2. nutrition_v2_patient_anthropometrics: historical measurements
CREATE TABLE IF NOT EXISTS nutrition_v2_patient_anthropometrics (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    public_id CHAR(36) NOT NULL,
    patient_record_id BIGINT UNSIGNED NOT NULL,
    measurement_date DATE NOT NULL,
    weight_kg DECIMAL(6,2) NULL DEFAULT NULL,
    height_cm DECIMAL(6,2) NULL DEFAULT NULL,
    waist_cm DECIMAL(6,2) NULL DEFAULT NULL,
    hip_cm DECIMAL(6,2) NULL DEFAULT NULL,
    arm_cm DECIMAL(6,2) NULL DEFAULT NULL,
    thigh_cm DECIMAL(6,2) NULL DEFAULT NULL,
    calf_cm DECIMAL(6,2) NULL DEFAULT NULL,
    chest_cm DECIMAL(6,2) NULL DEFAULT NULL,
    notes VARCHAR(500) NULL DEFAULT NULL,
    created_by_membership_id BIGINT UNSIGNED NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),

    CONSTRAINT uq_nutrition_v2_patient_anthropometrics_public_id
        UNIQUE (public_id),

    INDEX idx_n2pa_record_date (patient_record_id, measurement_date DESC),

    CONSTRAINT fk_n2pa_patient_record
        FOREIGN KEY (patient_record_id)
        REFERENCES nutrition_v2_patient_records (id)
        ON DELETE CASCADE,

    CONSTRAINT fk_n2pa_created_by
        FOREIGN KEY (created_by_membership_id)
        REFERENCES consultancy_members (id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci;

-- 3. nutrition_v2_patient_pregnancy: dedicated pregnancy/gestation and postpartum tracking
CREATE TABLE IF NOT EXISTS nutrition_v2_patient_pregnancy (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    public_id CHAR(36) NOT NULL,
    patient_record_id BIGINT UNSIGNED NOT NULL,
    pregnancy_status VARCHAR(30) NOT NULL DEFAULT 'NOT_APPLICABLE',
    estimated_due_date DATE NULL DEFAULT NULL,
    gestational_weeks INT NULL DEFAULT NULL,
    last_menstrual_period_date DATE NULL DEFAULT NULL,
    pre_pregnancy_weight_kg DECIMAL(6,2) NULL DEFAULT NULL,
    current_pregnancy_weight_kg DECIMAL(6,2) NULL DEFAULT NULL,
    pregnancy_type VARCHAR(50) NULL DEFAULT NULL,
    pregnancy_notes TEXT NULL DEFAULT NULL,
    obstetric_notes TEXT NULL DEFAULT NULL,
    supplementation_notes TEXT NULL DEFAULT NULL,
    delivery_date DATE NULL DEFAULT NULL,
    breastfeeding_status VARCHAR(50) NULL DEFAULT NULL,
    postpartum_notes TEXT NULL DEFAULT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),

    CONSTRAINT uq_nutrition_v2_patient_pregnancy_public_id
        UNIQUE (public_id),

    CONSTRAINT uq_n2pp_patient_record
        UNIQUE (patient_record_id),

    CONSTRAINT fk_n2pp_patient_record
        FOREIGN KEY (patient_record_id)
        REFERENCES nutrition_v2_patient_records (id)
        ON DELETE CASCADE
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci;
