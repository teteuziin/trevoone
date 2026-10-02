-- Migration: 044_nutrition_v2_clean_corrupt_aliases.sql
-- Description: Idempotent data repair for corrupt food aliases caused by legacy cross-environment integer ID offsets.
-- Ensures that aliases map only to semantically compatible foods based on normalized_alias and source identity.

DELETE a FROM nutrition_v2_food_aliases a
JOIN nutrition_v2_foods f ON f.id = a.food_id
WHERE (
    -- Bad alias: 'leite integral' mapped to non-dairy/non-milk items (e.g. anchovies)
    (a.normalized_alias = 'leite integral' AND f.name NOT LIKE '%Milk%' AND f.name NOT LIKE '%Leite%')
    
    -- Bad alias: 'oleo de coco' mapped to non-coconut items (e.g. cheese)
    OR (a.normalized_alias = 'oleo de coco' AND f.name NOT LIKE '%coconut%' AND f.name NOT LIKE '%coco%')
    
    -- Bad alias: 'polvo' mapped to non-octopus items (e.g. trout)
    OR (a.normalized_alias = 'polvo' AND f.name NOT LIKE '%Octopus%' AND f.name NOT LIKE '%Polvo%')
    
    -- Bad alias: 'presunto de peru' mapped to non-turkey items (e.g. generic sausage)
    OR (a.normalized_alias LIKE 'presunto de peru%' AND f.name NOT LIKE '%Turkey ham%' AND f.name NOT LIKE '%Presunto de peru%')
    
    -- Bad alias: 'edamame' mapped to non-edamame items (e.g. bean cake)
    OR (a.normalized_alias LIKE 'edamame%' AND f.name NOT LIKE '%Edamame%')
    
    -- Bad alias: 'arroz branco' mapped to mixed peas/beans instead of white rice
    OR (a.normalized_alias = 'arroz branco' AND f.source_external_code = '2708999')
    OR (a.normalized_alias = 'arroz branco com outros vegetais, teor de gordura nao especificado' AND f.source_external_code = '2708999')
);
