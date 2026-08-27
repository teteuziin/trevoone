-- Migration 020: Global User Profiles
-- Establishes 1:1 global user profile metadata with unique custom username and private profile photo storage

CREATE TABLE IF NOT EXISTS `user_profiles` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `public_id` CHAR(36) NOT NULL,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `username` VARCHAR(30) NULL DEFAULT NULL,
    `profile_photo_storage_key` VARCHAR(255) NULL DEFAULT NULL,
    `profile_photo_mime` VARCHAR(50) NULL DEFAULT NULL,
    `profile_photo_size_bytes` INT UNSIGNED NULL DEFAULT NULL,
    `profile_photo_sha256` CHAR(64) NULL DEFAULT NULL,
    `profile_photo_updated_at` DATETIME(3) NULL DEFAULT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`),
    CONSTRAINT `uq_user_profiles_public_id` UNIQUE (`public_id`),
    CONSTRAINT `uq_user_profiles_user_id` UNIQUE (`user_id`),
    CONSTRAINT `uq_user_profiles_username` UNIQUE (`username`),
    CONSTRAINT `fk_user_profiles_user`
        FOREIGN KEY (`user_id`)
        REFERENCES `users` (`id`)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci;
