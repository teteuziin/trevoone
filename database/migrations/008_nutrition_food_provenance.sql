ALTER TABLE nutrition_foods
    ADD COLUMN source_type VARCHAR(20) NOT NULL DEFAULT 'MANUAL' AFTER status,
    ADD COLUMN source_key VARCHAR(100) NULL DEFAULT NULL AFTER source_type,
    ADD COLUMN source_version VARCHAR(100) NULL DEFAULT NULL AFTER source_external_code,
    ADD COLUMN source_reference VARCHAR(500) NULL DEFAULT NULL AFTER source_version,
    ADD COLUMN source_imported_at DATETIME(3) NULL DEFAULT NULL AFTER source_reference,
    ADD CONSTRAINT uq_nutrition_foods_external_identity
        UNIQUE (consultancy_id, source_key, source_external_code);
