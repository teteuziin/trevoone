-- Migration 054: Training V2 - Seed initial exercise aliases for popular Brazilian gym search terms
-- Additive only: preserves existing exercises, media, workouts and snapshots.

-- Cadeira Extensora
INSERT IGNORE INTO `exercise_aliases` (`exercise_id`, `alias`, `normalized_alias`, `scope`, `consultancy_id`)
SELECT e.id, 'extensora', 'extensora', e.scope, e.consultancy_id
FROM `exercises` e
WHERE e.normalized_name LIKE '%cadeira extensora%' OR e.normalized_name LIKE '%extensao de joelho%';

INSERT IGNORE INTO `exercise_aliases` (`exercise_id`, `alias`, `normalized_alias`, `scope`, `consultancy_id`)
SELECT e.id, 'extensão de pernas', 'extensao de pernas', e.scope, e.consultancy_id
FROM `exercises` e
WHERE e.normalized_name LIKE '%cadeira extensora%';

-- Cadeira Flexora
INSERT IGNORE INTO `exercise_aliases` (`exercise_id`, `alias`, `normalized_alias`, `scope`, `consultancy_id`)
SELECT e.id, 'flexora', 'flexora', e.scope, e.consultancy_id
FROM `exercises` e
WHERE e.normalized_name LIKE '%cadeira flexora%' OR e.normalized_name LIKE '%mesa flexora%';

INSERT IGNORE INTO `exercise_aliases` (`exercise_id`, `alias`, `normalized_alias`, `scope`, `consultancy_id`)
SELECT e.id, 'flexora sentada', 'flexora sentada', e.scope, e.consultancy_id
FROM `exercises` e
WHERE e.normalized_name LIKE '%cadeira flexora%';

-- Mesa Flexora
INSERT IGNORE INTO `exercise_aliases` (`exercise_id`, `alias`, `normalized_alias`, `scope`, `consultancy_id`)
SELECT e.id, 'flexora deitada', 'flexora deitada', e.scope, e.consultancy_id
FROM `exercises` e
WHERE e.normalized_name LIKE '%mesa flexora%';

-- Leg Press 45
INSERT IGNORE INTO `exercise_aliases` (`exercise_id`, `alias`, `normalized_alias`, `scope`, `consultancy_id`)
SELECT e.id, 'leg 45', 'leg 45', e.scope, e.consultancy_id
FROM `exercises` e
WHERE e.normalized_name LIKE '%leg press 45%';

INSERT IGNORE INTO `exercise_aliases` (`exercise_id`, `alias`, `normalized_alias`, `scope`, `consultancy_id`)
SELECT e.id, 'legpress', 'legpress', e.scope, e.consultancy_id
FROM `exercises` e
WHERE e.normalized_name LIKE '%leg press%';

-- Peck Deck / Voador
INSERT IGNORE INTO `exercise_aliases` (`exercise_id`, `alias`, `normalized_alias`, `scope`, `consultancy_id`)
SELECT e.id, 'voador', 'voador', e.scope, e.consultancy_id
FROM `exercises` e
WHERE e.normalized_name LIKE '%peck deck%' OR e.normalized_name LIKE '%fly%';

INSERT IGNORE INTO `exercise_aliases` (`exercise_id`, `alias`, `normalized_alias`, `scope`, `consultancy_id`)
SELECT e.id, 'borboleta', 'borboleta', e.scope, e.consultancy_id
FROM `exercises` e
WHERE e.normalized_name LIKE '%peck deck%' OR e.normalized_name LIKE '%voador%';

INSERT IGNORE INTO `exercise_aliases` (`exercise_id`, `alias`, `normalized_alias`, `scope`, `consultancy_id`)
SELECT e.id, 'peck deck', 'peck deck', e.scope, e.consultancy_id
FROM `exercises` e
WHERE e.normalized_name LIKE '%voador%';

-- Remada Unilateral (Serrote)
INSERT IGNORE INTO `exercise_aliases` (`exercise_id`, `alias`, `normalized_alias`, `scope`, `consultancy_id`)
SELECT e.id, 'serrote', 'serrote', e.scope, e.consultancy_id
FROM `exercises` e
WHERE e.normalized_name LIKE '%remada unilateral%';

INSERT IGNORE INTO `exercise_aliases` (`exercise_id`, `alias`, `normalized_alias`, `scope`, `consultancy_id`)
SELECT e.id, 'remada serrote', 'remada serrote', e.scope, e.consultancy_id
FROM `exercises` e
WHERE e.normalized_name LIKE '%remada unilateral%';

-- Agachamento Sumô
INSERT IGNORE INTO `exercise_aliases` (`exercise_id`, `alias`, `normalized_alias`, `scope`, `consultancy_id`)
SELECT e.id, 'sumô', 'sumo', e.scope, e.consultancy_id
FROM `exercises` e
WHERE e.normalized_name LIKE '%agachamento sumo%';

-- Agachamento Búlgaro
INSERT IGNORE INTO `exercise_aliases` (`exercise_id`, `alias`, `normalized_alias`, `scope`, `consultancy_id`)
SELECT e.id, 'búlgaro', 'bulgaro', e.scope, e.consultancy_id
FROM `exercises` e
WHERE e.normalized_name LIKE '%agachamento bulgaro%';

-- Agachamento Livre
INSERT IGNORE INTO `exercise_aliases` (`exercise_id`, `alias`, `normalized_alias`, `scope`, `consultancy_id`)
SELECT e.id, 'agacho', 'agacho', e.scope, e.consultancy_id
FROM `exercises` e
WHERE e.normalized_name LIKE '%agachamento livre%';

-- Levantamento Terra
INSERT IGNORE INTO `exercise_aliases` (`exercise_id`, `alias`, `normalized_alias`, `scope`, `consultancy_id`)
SELECT e.id, 'terra', 'terra', e.scope, e.consultancy_id
FROM `exercises` e
WHERE e.normalized_name LIKE '%levantamento terra%';

-- Stiff
INSERT IGNORE INTO `exercise_aliases` (`exercise_id`, `alias`, `normalized_alias`, `scope`, `consultancy_id`)
SELECT e.id, 'levantamento stiff', 'levantamento stiff', e.scope, e.consultancy_id
FROM `exercises` e
WHERE e.normalized_name LIKE '%stiff%';

-- Desenvolvimento Militar
INSERT IGNORE INTO `exercise_aliases` (`exercise_id`, `alias`, `normalized_alias`, `scope`, `consultancy_id`)
SELECT e.id, 'militar', 'militar', e.scope, e.consultancy_id
FROM `exercises` e
WHERE e.normalized_name LIKE '%desenvolvimento com barra%';

-- Rosca Martelo
INSERT IGNORE INTO `exercise_aliases` (`exercise_id`, `alias`, `normalized_alias`, `scope`, `consultancy_id`)
SELECT e.id, 'martelo', 'martelo', e.scope, e.consultancy_id
FROM `exercises` e
WHERE e.normalized_name LIKE '%rosca martelo%';

-- Rosca Scott
INSERT IGNORE INTO `exercise_aliases` (`exercise_id`, `alias`, `normalized_alias`, `scope`, `consultancy_id`)
SELECT e.id, 'scott', 'scott', e.scope, e.consultancy_id
FROM `exercises` e
WHERE e.normalized_name LIKE '%rosca scott%' OR e.normalized_name LIKE '%banco scott%';

-- Tríceps Corda
INSERT IGNORE INTO `exercise_aliases` (`exercise_id`, `alias`, `normalized_alias`, `scope`, `consultancy_id`)
SELECT e.id, 'corda', 'corda', e.scope, e.consultancy_id
FROM `exercises` e
WHERE e.normalized_name LIKE '%triceps corda%';

-- Tríceps Testa
INSERT IGNORE INTO `exercise_aliases` (`exercise_id`, `alias`, `normalized_alias`, `scope`, `consultancy_id`)
SELECT e.id, 'testa', 'testa', e.scope, e.consultancy_id
FROM `exercises` e
WHERE e.normalized_name LIKE '%triceps testa%';

-- Tríceps Francês
INSERT IGNORE INTO `exercise_aliases` (`exercise_id`, `alias`, `normalized_alias`, `scope`, `consultancy_id`)
SELECT e.id, 'francês', 'frances', e.scope, e.consultancy_id
FROM `exercises` e
WHERE e.normalized_name LIKE '%triceps frances%';

-- Abdominal Infra
INSERT IGNORE INTO `exercise_aliases` (`exercise_id`, `alias`, `normalized_alias`, `scope`, `consultancy_id`)
SELECT e.id, 'infra', 'infra', e.scope, e.consultancy_id
FROM `exercises` e
WHERE e.normalized_name LIKE '%abdominal infra%';

-- Abdominal Supra
INSERT IGNORE INTO `exercise_aliases` (`exercise_id`, `alias`, `normalized_alias`, `scope`, `consultancy_id`)
SELECT e.id, 'supra', 'supra', e.scope, e.consultancy_id
FROM `exercises` e
WHERE e.normalized_name LIKE '%abdominal supra%';

-- Abdominal Prancha
INSERT IGNORE INTO `exercise_aliases` (`exercise_id`, `alias`, `normalized_alias`, `scope`, `consultancy_id`)
SELECT e.id, 'prancha', 'prancha', e.scope, e.consultancy_id
FROM `exercises` e
WHERE e.normalized_name LIKE '%abdominal prancha%';

-- Elevação Pélvica
INSERT IGNORE INTO `exercise_aliases` (`exercise_id`, `alias`, `normalized_alias`, `scope`, `consultancy_id`)
SELECT e.id, 'hip thrust', 'hip thrust', e.scope, e.consultancy_id
FROM `exercises` e
WHERE e.normalized_name LIKE '%elevacao pelvica%';

-- Puxada Frontal
INSERT IGNORE INTO `exercise_aliases` (`exercise_id`, `alias`, `normalized_alias`, `scope`, `consultancy_id`)
SELECT e.id, 'puxada', 'puxada', e.scope, e.consultancy_id
FROM `exercises` e
WHERE e.normalized_name LIKE '%puxada frontal%' OR e.normalized_name LIKE '%puxada alta%';

-- Remada Baixa
INSERT IGNORE INTO `exercise_aliases` (`exercise_id`, `alias`, `normalized_alias`, `scope`, `consultancy_id`)
SELECT e.id, 'pulley baixo', 'pulley baixo', e.scope, e.consultancy_id
FROM `exercises` e
WHERE e.normalized_name LIKE '%remada baixa%';

-- Cadeira Abdutora
INSERT IGNORE INTO `exercise_aliases` (`exercise_id`, `alias`, `normalized_alias`, `scope`, `consultancy_id`)
SELECT e.id, 'abdutora', 'abdutora', e.scope, e.consultancy_id
FROM `exercises` e
WHERE e.normalized_name LIKE '%cadeira abdutora%' OR e.normalized_name LIKE '%abducao%';

INSERT IGNORE INTO `exercise_aliases` (`exercise_id`, `alias`, `normalized_alias`, `scope`, `consultancy_id`)
SELECT e.id, 'abdução de quadril', 'abducao de quadril', e.scope, e.consultancy_id
FROM `exercises` e
WHERE e.normalized_name LIKE '%cadeira abdutora%';

-- Cadeira Adutora
INSERT IGNORE INTO `exercise_aliases` (`exercise_id`, `alias`, `normalized_alias`, `scope`, `consultancy_id`)
SELECT e.id, 'adutora', 'adutora', e.scope, e.consultancy_id
FROM `exercises` e
WHERE e.normalized_name LIKE '%cadeira adutora%' OR e.normalized_name LIKE '%aducao%';

INSERT IGNORE INTO `exercise_aliases` (`exercise_id`, `alias`, `normalized_alias`, `scope`, `consultancy_id`)
SELECT e.id, 'adução de quadril', 'aducao de quadril', e.scope, e.consultancy_id
FROM `exercises` e
WHERE e.normalized_name LIKE '%cadeira adutora%';

