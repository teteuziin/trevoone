-- Migration 067: Prescribed Exercise Alternatives for Workout Block Items
-- Trevo One - Training V2
-- Stores personal-prescribed alternative exercises for workout block items.

ALTER TABLE `workout_block_items`
  ADD COLUMN IF NOT EXISTS `alternatives_json` JSON NULL DEFAULT NULL AFTER `method_config_json`;
