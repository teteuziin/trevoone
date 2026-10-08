-- Migration: 046_nutrition_v2_patient_records_physiological.sql
-- Description: Adds canonical physiological fields (birth date and biological sex) to patient clinical records
-- Rules: UNKNOWN != ZERO | No clinical defaults | Nullable | Tenant isolated via nutrition_v2_patient_records

ALTER TABLE nutrition_v2_patient_records
  ADD COLUMN birth_date DATE NULL DEFAULT NULL AFTER student_membership_id,
  ADD COLUMN biological_sex VARCHAR(20) NULL DEFAULT NULL AFTER birth_date;
