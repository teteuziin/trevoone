-- Migration: 064_nutrition_v2_seed_canonical_portions.sql
-- Description: Seeds official Brazilian household measures (IBGE/POF, Pinheiro et al., TACO) for global foods.
-- Strictly additive and idempotent.

-- 1. ARROZ CRU (Cru != Cozido)
-- Ref: IBGE/POF & Pinheiro et al. (xícara 200g, copo americano 165g, colher sopa 20g)
INSERT INTO nutrition_v2_food_portions (
    public_id, food_id, label, equivalent_reference_amount, sort_order, status, scope, consultancy_id, created_by_user_id, notes
)
SELECT
    CONCAT(SUBSTR(MD5(CONCAT('trevo:canonical_portion:', f.id, ':xicara_de_cha')), 1, 8), '-',
           SUBSTR(MD5(CONCAT('trevo:canonical_portion:', f.id, ':xicara_de_cha')), 9, 4), '-4',
           SUBSTR(MD5(CONCAT('trevo:canonical_portion:', f.id, ':xicara_de_cha')), 14, 3), '-a',
           SUBSTR(MD5(CONCAT('trevo:canonical_portion:', f.id, ':xicara_de_cha')), 18, 3), '-',
           SUBSTR(MD5(CONCAT('trevo:canonical_portion:', f.id, ':xicara_de_cha')), 21, 12)) AS public_id,
    f.id AS food_id,
    'Xícara de chá' AS label,
    200.00 AS equivalent_reference_amount,
    0 AS sort_order,
    'ACTIVE' AS status,
    'GLOBAL' AS scope,
    NULL AS consultancy_id,
    NULL AS created_by_user_id,
    'Equivalência IBGE/Pinheiro para arroz cru' AS notes
FROM nutrition_v2_foods f
WHERE f.deleted_at IS NULL AND (f.scope = 'GLOBAL' OR f.scope IS NULL)
  AND LOWER(f.name) LIKE '%arroz%'
  AND (LOWER(f.name) LIKE '%cru%' OR LOWER(f.display_name_pt_br) LIKE '%cru%')
ON DUPLICATE KEY UPDATE status = 'ACTIVE';

INSERT INTO nutrition_v2_food_portions (
    public_id, food_id, label, equivalent_reference_amount, sort_order, status, scope, consultancy_id, created_by_user_id, notes
)
SELECT
    CONCAT(SUBSTR(MD5(CONCAT('trevo:canonical_portion:', f.id, ':copo_americano')), 1, 8), '-',
           SUBSTR(MD5(CONCAT('trevo:canonical_portion:', f.id, ':copo_americano')), 9, 4), '-4',
           SUBSTR(MD5(CONCAT('trevo:canonical_portion:', f.id, ':copo_americano')), 14, 3), '-a',
           SUBSTR(MD5(CONCAT('trevo:canonical_portion:', f.id, ':copo_americano')), 18, 3), '-',
           SUBSTR(MD5(CONCAT('trevo:canonical_portion:', f.id, ':copo_americano')), 21, 12)) AS public_id,
    f.id AS food_id,
    'Copo americano' AS label,
    165.00 AS equivalent_reference_amount,
    1 AS sort_order,
    'ACTIVE' AS status,
    'GLOBAL' AS scope,
    NULL AS consultancy_id,
    NULL AS created_by_user_id,
    'Equivalência IBGE/Pinheiro para arroz cru' AS notes
FROM nutrition_v2_foods f
WHERE f.deleted_at IS NULL AND (f.scope = 'GLOBAL' OR f.scope IS NULL)
  AND LOWER(f.name) LIKE '%arroz%'
  AND (LOWER(f.name) LIKE '%cru%' OR LOWER(f.display_name_pt_br) LIKE '%cru%')
ON DUPLICATE KEY UPDATE status = 'ACTIVE';

INSERT INTO nutrition_v2_food_portions (
    public_id, food_id, label, equivalent_reference_amount, sort_order, status, scope, consultancy_id, created_by_user_id, notes
)
SELECT
    CONCAT(SUBSTR(MD5(CONCAT('trevo:canonical_portion:', f.id, ':colher_de_sopa')), 1, 8), '-',
           SUBSTR(MD5(CONCAT('trevo:canonical_portion:', f.id, ':colher_de_sopa')), 9, 4), '-4',
           SUBSTR(MD5(CONCAT('trevo:canonical_portion:', f.id, ':colher_de_sopa')), 14, 3), '-a',
           SUBSTR(MD5(CONCAT('trevo:canonical_portion:', f.id, ':colher_de_sopa')), 18, 3), '-',
           SUBSTR(MD5(CONCAT('trevo:canonical_portion:', f.id, ':colher_de_sopa')), 21, 12)) AS public_id,
    f.id AS food_id,
    'Colher de sopa' AS label,
    20.00 AS equivalent_reference_amount,
    2 AS sort_order,
    'ACTIVE' AS status,
    'GLOBAL' AS scope,
    NULL AS consultancy_id,
    NULL AS created_by_user_id,
    'Equivalência IBGE/Pinheiro para arroz cru' AS notes
FROM nutrition_v2_foods f
WHERE f.deleted_at IS NULL AND (f.scope = 'GLOBAL' OR f.scope IS NULL)
  AND LOWER(f.name) LIKE '%arroz%'
  AND (LOWER(f.name) LIKE '%cru%' OR LOWER(f.display_name_pt_br) LIKE '%cru%')
ON DUPLICATE KEY UPDATE status = 'ACTIVE';

-- 2. ARROZ COZIDO / PREPARADO
-- Ref: TACO/IBGE/Pinheiro (colher de servir cheia 50g, colher de servir rasa 35g, colher sopa 25g, xícara 160g, escumadeira 60g)
INSERT INTO nutrition_v2_food_portions (
    public_id, food_id, label, equivalent_reference_amount, sort_order, status, scope, consultancy_id, created_by_user_id, notes
)
SELECT
    CONCAT(SUBSTR(MD5(CONCAT('trevo:canonical_portion:', f.id, ':colher_de_servir_cheia')), 1, 8), '-',
           SUBSTR(MD5(CONCAT('trevo:canonical_portion:', f.id, ':colher_de_servir_cheia')), 9, 4), '-4',
           SUBSTR(MD5(CONCAT('trevo:canonical_portion:', f.id, ':colher_de_servir_cheia')), 14, 3), '-a',
           SUBSTR(MD5(CONCAT('trevo:canonical_portion:', f.id, ':colher_de_servir_cheia')), 18, 3), '-',
           SUBSTR(MD5(CONCAT('trevo:canonical_portion:', f.id, ':colher_de_servir_cheia')), 21, 12)) AS public_id,
    f.id AS food_id,
    'Colher de servir cheia' AS label,
    50.00 AS equivalent_reference_amount,
    0 AS sort_order,
    'ACTIVE' AS status,
    'GLOBAL' AS scope,
    NULL AS consultancy_id,
    NULL AS created_by_user_id,
    'Equivalência TACO/IBGE/Pinheiro para arroz cozido' AS notes
FROM nutrition_v2_foods f
WHERE f.deleted_at IS NULL AND (f.scope = 'GLOBAL' OR f.scope IS NULL)
  AND LOWER(f.name) LIKE '%arroz%'
  AND LOWER(f.name) NOT LIKE '%cru%' AND (f.display_name_pt_br IS NULL OR LOWER(f.display_name_pt_br) NOT LIKE '%cru%')
ON DUPLICATE KEY UPDATE status = 'ACTIVE';

INSERT INTO nutrition_v2_food_portions (
    public_id, food_id, label, equivalent_reference_amount, sort_order, status, scope, consultancy_id, created_by_user_id, notes
)
SELECT
    CONCAT(SUBSTR(MD5(CONCAT('trevo:canonical_portion:', f.id, ':colher_de_servir_rasa')), 1, 8), '-',
           SUBSTR(MD5(CONCAT('trevo:canonical_portion:', f.id, ':colher_de_servir_rasa')), 9, 4), '-4',
           SUBSTR(MD5(CONCAT('trevo:canonical_portion:', f.id, ':colher_de_servir_rasa')), 14, 3), '-a',
           SUBSTR(MD5(CONCAT('trevo:canonical_portion:', f.id, ':colher_de_servir_rasa')), 18, 3), '-',
           SUBSTR(MD5(CONCAT('trevo:canonical_portion:', f.id, ':colher_de_servir_rasa')), 21, 12)) AS public_id,
    f.id AS food_id,
    'Colher de servir rasa' AS label,
    35.00 AS equivalent_reference_amount,
    1 AS sort_order,
    'ACTIVE' AS status,
    'GLOBAL' AS scope,
    NULL AS consultancy_id,
    NULL AS created_by_user_id,
    'Equivalência Pinheiro para arroz cozido' AS notes
FROM nutrition_v2_foods f
WHERE f.deleted_at IS NULL AND (f.scope = 'GLOBAL' OR f.scope IS NULL)
  AND LOWER(f.name) LIKE '%arroz%'
  AND LOWER(f.name) NOT LIKE '%cru%' AND (f.display_name_pt_br IS NULL OR LOWER(f.display_name_pt_br) NOT LIKE '%cru%')
ON DUPLICATE KEY UPDATE status = 'ACTIVE';

INSERT INTO nutrition_v2_food_portions (
    public_id, food_id, label, equivalent_reference_amount, sort_order, status, scope, consultancy_id, created_by_user_id, notes
)
SELECT
    CONCAT(SUBSTR(MD5(CONCAT('trevo:canonical_portion:', f.id, ':escumadeira')), 1, 8), '-',
           SUBSTR(MD5(CONCAT('trevo:canonical_portion:', f.id, ':escumadeira')), 9, 4), '-4',
           SUBSTR(MD5(CONCAT('trevo:canonical_portion:', f.id, ':escumadeira')), 14, 3), '-a',
           SUBSTR(MD5(CONCAT('trevo:canonical_portion:', f.id, ':escumadeira')), 18, 3), '-',
           SUBSTR(MD5(CONCAT('trevo:canonical_portion:', f.id, ':escumadeira')), 21, 12)) AS public_id,
    f.id AS food_id,
    'Escumadeira / Pegador' AS label,
    60.00 AS equivalent_reference_amount,
    2 AS sort_order,
    'ACTIVE' AS status,
    'GLOBAL' AS scope,
    NULL AS consultancy_id,
    NULL AS created_by_user_id,
    'Equivalência Pinheiro para arroz cozido' AS notes
FROM nutrition_v2_foods f
WHERE f.deleted_at IS NULL AND (f.scope = 'GLOBAL' OR f.scope IS NULL)
  AND LOWER(f.name) LIKE '%arroz%'
  AND LOWER(f.name) NOT LIKE '%cru%' AND (f.display_name_pt_br IS NULL OR LOWER(f.display_name_pt_br) NOT LIKE '%cru%')
ON DUPLICATE KEY UPDATE status = 'ACTIVE';

INSERT INTO nutrition_v2_food_portions (
    public_id, food_id, label, equivalent_reference_amount, sort_order, status, scope, consultancy_id, created_by_user_id, notes
)
SELECT
    CONCAT(SUBSTR(MD5(CONCAT('trevo:canonical_portion:', f.id, ':xicara_de_cha_cozido')), 1, 8), '-',
           SUBSTR(MD5(CONCAT('trevo:canonical_portion:', f.id, ':xicara_de_cha_cozido')), 9, 4), '-4',
           SUBSTR(MD5(CONCAT('trevo:canonical_portion:', f.id, ':xicara_de_cha_cozido')), 14, 3), '-a',
           SUBSTR(MD5(CONCAT('trevo:canonical_portion:', f.id, ':xicara_de_cha_cozido')), 18, 3), '-',
           SUBSTR(MD5(CONCAT('trevo:canonical_portion:', f.id, ':xicara_de_cha_cozido')), 21, 12)) AS public_id,
    f.id AS food_id,
    'Xícara de chá' AS label,
    160.00 AS equivalent_reference_amount,
    3 AS sort_order,
    'ACTIVE' AS status,
    'GLOBAL' AS scope,
    NULL AS consultancy_id,
    NULL AS created_by_user_id,
    'Equivalência Pinheiro para arroz cozido' AS notes
FROM nutrition_v2_foods f
WHERE f.deleted_at IS NULL AND (f.scope = 'GLOBAL' OR f.scope IS NULL)
  AND LOWER(f.name) LIKE '%arroz%'
  AND LOWER(f.name) NOT LIKE '%cru%' AND (f.display_name_pt_br IS NULL OR LOWER(f.display_name_pt_br) NOT LIKE '%cru%')
ON DUPLICATE KEY UPDATE status = 'ACTIVE';

-- 3. FEIJÃO COZIDO COM CALDO
-- Ref: IBGE/Pinheiro (concha média 130g, concha pequena 85g, concha grande 180g)
INSERT INTO nutrition_v2_food_portions (
    public_id, food_id, label, equivalent_reference_amount, sort_order, status, scope, consultancy_id, created_by_user_id, notes
)
SELECT
    CONCAT(SUBSTR(MD5(CONCAT('trevo:canonical_portion:', f.id, ':concha_media')), 1, 8), '-',
           SUBSTR(MD5(CONCAT('trevo:canonical_portion:', f.id, ':concha_media')), 9, 4), '-4',
           SUBSTR(MD5(CONCAT('trevo:canonical_portion:', f.id, ':concha_media')), 14, 3), '-a',
           SUBSTR(MD5(CONCAT('trevo:canonical_portion:', f.id, ':concha_media')), 18, 3), '-',
           SUBSTR(MD5(CONCAT('trevo:canonical_portion:', f.id, ':concha_media')), 21, 12)) AS public_id,
    f.id AS food_id,
    'Concha média' AS label,
    130.00 AS equivalent_reference_amount,
    0 AS sort_order,
    'ACTIVE' AS status,
    'GLOBAL' AS scope,
    NULL AS consultancy_id,
    NULL AS created_by_user_id,
    'Equivalência IBGE/Pinheiro (grãos + caldo)' AS notes
FROM nutrition_v2_foods f
WHERE f.deleted_at IS NULL AND (f.scope = 'GLOBAL' OR f.scope IS NULL)
  AND LOWER(f.name) LIKE '%feijao%'
  AND LOWER(f.name) NOT LIKE '%cru%' AND (f.display_name_pt_br IS NULL OR LOWER(f.display_name_pt_br) NOT LIKE '%cru%')
ON DUPLICATE KEY UPDATE status = 'ACTIVE';

INSERT INTO nutrition_v2_food_portions (
    public_id, food_id, label, equivalent_reference_amount, sort_order, status, scope, consultancy_id, created_by_user_id, notes
)
SELECT
    CONCAT(SUBSTR(MD5(CONCAT('trevo:canonical_portion:', f.id, ':concha_pequena')), 1, 8), '-',
           SUBSTR(MD5(CONCAT('trevo:canonical_portion:', f.id, ':concha_pequena')), 9, 4), '-4',
           SUBSTR(MD5(CONCAT('trevo:canonical_portion:', f.id, ':concha_pequena')), 14, 3), '-a',
           SUBSTR(MD5(CONCAT('trevo:canonical_portion:', f.id, ':concha_pequena')), 18, 3), '-',
           SUBSTR(MD5(CONCAT('trevo:canonical_portion:', f.id, ':concha_pequena')), 21, 12)) AS public_id,
    f.id AS food_id,
    'Concha pequena' AS label,
    85.00 AS equivalent_reference_amount,
    1 AS sort_order,
    'ACTIVE' AS status,
    'GLOBAL' AS scope,
    NULL AS consultancy_id,
    NULL AS created_by_user_id,
    'Equivalência Pinheiro' AS notes
FROM nutrition_v2_foods f
WHERE f.deleted_at IS NULL AND (f.scope = 'GLOBAL' OR f.scope IS NULL)
  AND LOWER(f.name) LIKE '%feijao%'
  AND LOWER(f.name) NOT LIKE '%cru%' AND (f.display_name_pt_br IS NULL OR LOWER(f.display_name_pt_br) NOT LIKE '%cru%')
ON DUPLICATE KEY UPDATE status = 'ACTIVE';
