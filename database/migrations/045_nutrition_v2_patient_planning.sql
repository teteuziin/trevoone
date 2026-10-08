-- Migration: 045_nutrition_v2_patient_planning.sql
-- Description: Patient nutritional planning (Metabolic calculations, calorie and macro targets, input snapshots, stale detection)
-- Rules: UNKNOWN != ZERO | No silent clinical defaults | Safe UPSERT per student | Strict multi-tenancy

CREATE TABLE IF NOT EXISTS nutrition_v2_patient_planning (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    public_id CHAR(36) NOT NULL,
    consultancy_id BIGINT UNSIGNED NOT NULL,
    student_membership_id BIGINT UNSIGNED NOT NULL,
    patient_record_id BIGINT UNSIGNED NULL DEFAULT NULL,
    created_by_membership_id BIGINT UNSIGNED NOT NULL,
    updated_by_membership_id BIGINT UNSIGNED NULL DEFAULT NULL,

    -- Timestamp de quando os cálculos foram formalmente realizados pelo profissional
    calculated_at DATETIME(3) NULL DEFAULT NULL,

    -- Snapshot dos dados fisiológicos/antropométricos no momento do cálculo (Seções 11 e 17)
    -- Preserva a base clínica original mesmo se o paciente registrar novas medições posteriormente
    snapshot_weight_kg DECIMAL(6,2) NULL DEFAULT NULL,
    snapshot_height_cm DECIMAL(6,2) NULL DEFAULT NULL,
    snapshot_age_years INT UNSIGNED NULL DEFAULT NULL,
    snapshot_biological_sex VARCHAR(20) NULL DEFAULT NULL,

    -- Cálculo Metabólico Basal (TMB / BMR)
    -- Versionado e auditável (ex: 'MIFFLIN_ST_JEOR_V1', 'HARRIS_BENEDICT_REVISED_1984_V1')
    bmr_formula VARCHAR(50) NULL DEFAULT NULL,
    bmr_kcal DECIMAL(8,2) NULL DEFAULT NULL,

    -- Fator de Atividade & Gasto Energético Total (GET / TDEE)
    -- Sem defaults automáticos (Seção 2: UNKNOWN != SEDENTARY)
    activity_level VARCHAR(50) NULL DEFAULT NULL,
    activity_factor DECIMAL(4,3) NULL DEFAULT NULL,
    tdee_kcal DECIMAL(8,2) NULL DEFAULT NULL,

    -- Objetivo & Meta Calórica
    -- Sem defaults automáticos (Seção 3: Manutenção é decisão profissional explícita)
    goal_type VARCHAR(50) NULL DEFAULT NULL,
    calorie_adjustment_kcal DECIMAL(8,2) NULL DEFAULT NULL,
    calculated_target_calories_kcal DECIMAL(8,2) NULL DEFAULT NULL,
    target_calories_kcal DECIMAL(8,2) NULL DEFAULT NULL,
    target_calories_source VARCHAR(20) NULL DEFAULT NULL, -- 'CALCULATED' ou 'MANUAL'

    -- Metas de Macronutrientes (em gramas)
    -- Nullable: permite salvar planejamento em etapas sem obrigar preenchimento simultâneo
    target_protein_g DECIMAL(8,2) NULL DEFAULT NULL,
    target_carbs_g DECIMAL(8,2) NULL DEFAULT NULL,
    target_fats_g DECIMAL(8,2) NULL DEFAULT NULL,

    -- Anotações e conduta clínica do profissional
    clinical_notes TEXT NULL DEFAULT NULL,

    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),

    CONSTRAINT uq_n2plan_public_id
        UNIQUE (public_id),

    -- Um planejamento ativo por aluno na consultoria (estratégia estável de UPSERT sem conflito de soft-delete)
    CONSTRAINT uq_n2plan_consultancy_student
        UNIQUE (consultancy_id, student_membership_id),

    INDEX idx_n2plan_patient_record (patient_record_id),

    CONSTRAINT fk_n2plan_consultancy
        FOREIGN KEY (consultancy_id)
        REFERENCES consultancies (id)
        ON DELETE CASCADE,

    CONSTRAINT fk_n2plan_student_membership
        FOREIGN KEY (student_membership_id)
        REFERENCES consultancy_members (id)
        ON DELETE CASCADE,

    CONSTRAINT fk_n2plan_patient_record
        FOREIGN KEY (patient_record_id)
        REFERENCES nutrition_v2_patient_records (id)
        ON DELETE SET NULL,

    CONSTRAINT fk_n2plan_created_by
        FOREIGN KEY (created_by_membership_id)
        REFERENCES consultancy_members (id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_n2plan_updated_by
        FOREIGN KEY (updated_by_membership_id)
        REFERENCES consultancy_members (id)
        ON DELETE SET NULL
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci;
