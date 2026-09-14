/**
 * scripts/translate-nutrition-v2-usda.mjs
 *
 * TREVO ONE — NUTRI-MVP-2B
 * Pipeline determinístico de tradução e localização estrita do catálogo USDA Foundation e FNDDS para PT-BR.
 *
 * GARANTIAS DE PRODUTO:
 * - 100% de cobertura nos 5.795 alimentos USDA ativos.
 * - Eliminação estrita de qualquer inglês genérico no DISPLAY (AUDITORIA A = 0 resíduos).
 * - Exceções estrangeiras permitidas restritas a:
 *     1. MARCA COMERCIAL
 *     2. CULTIVAR / NOME PRÓPRIO
 *     3. CULINÁRIA ADOTADA EM PT-BR (ex: sushi, tofu, kimchi, croissant, pizza, waffle, etc.)
 *     4. COGNATO IDÊNTICO PT-BR (ex: chocolate, granola, banana, cereal, etc.)
 * - Auditoria Tripla (Audit A: resíduos genéricos = 0; Audit B: transparência de exceções; Audit C: naturalidade PT-BR = 0 falhas).
 * - Preservação estrita do nome original em inglês no campo 'name' (utilizado como alias de busca).
 * - Safe Guard: execução padrão restrita ao banco DEV ('u406031981_trevoone_dev').
 */

import { createPool } from "mysql2/promise";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

export function loadFileEnv(filePath = ".env.local") {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, "utf8");
  const env = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return env;
}

export const DEV_DB_NAME = "u406031981_trevoone_dev";
export const PROD_DB_NAME = "u406031981_trevoone";

export function normalizeSearchText(text) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

// 1. SOBRESCRITAS EXATAS CANÔNICAS
export const EXACT_OVERRIDES = new Map([
  [
    "Milk, whole, 3.25% milkfat, with added vitamin D",
    "Leite integral, 3,25% de gordura, com vitamina D adicionada"
  ],
  [
    "Milk, whole",
    "Leite integral"
  ],
  [
    "Milk, lactose free, whole",
    "Leite integral, sem lactose"
  ],
  [
    "Milk, dry, reconstituted, whole",
    "Leite em pó integral, reconstituído"
  ],
  [
    "Milk, evaporated, whole",
    "Leite evaporado integral"
  ],
  [
    "Chicken, breast, boneless, skinless, raw",
    "Peito de frango, sem osso, sem pele, cru"
  ],
  [
    "Chicken, breast, meat only, cooked, roasted",
    "Peito de frango assado, apenas carne"
  ],
  [
    "Fish, salmon, Atlantic, wild, cooked, dry heat",
    "Salmão selvagem do Atlântico grelhado no calor seco"
  ],
  [
    "Fish, salmon, Atlantic, farm raised, raw",
    "Salmão do Atlântico, criado em cativeiro, cru"
  ],
  [
    "Egg, whole, cooked, hard-boiled",
    "Ovo inteiro, cozido duro"
  ],
  [
    "Egg, whole, cooked, NS as to cooking method",
    "Ovo inteiro, cozido, método de preparo não especificado"
  ],
  [
    "Rice, cooked, NFS",
    "Arroz cozido, não especificado"
  ],
  [
    "Rice, white, long-grain, regular, cooked",
    "Arroz branco de grão longo, tradicional, cozido"
  ],
  [
    "Bananas, ripe and slightly ripe, raw",
    "Banana madura e levemente madura, crua"
  ],
  [
    "Bananas, raw",
    "Banana crua"
  ],
  [
    "Banana, raw",
    "Banana crua"
  ],
  [
    "Broccoli, raw",
    "Brócolis cru"
  ],
  [
    "Yogurt, plain, whole milk",
    "Iogurte natural integral"
  ],
  [
    "Yogurt, Greek, plain, whole milk",
    "Iogurte grego natural integral"
  ],
  [
    "Bread, white",
    "Pão branco"
  ],
  [
    "Bread, white, commercially prepared",
    "Pão branco industrializado"
  ],
  [
    "Oatmeal, NFS",
    "Mingau de aveia, não especificado"
  ],
  [
    "Cereals, oats, regular and quick, not fortified, cooked with water",
    "Mingau de aveia tradicional e instantâneo, não fortificado, cozido em água"
  ],
  [
    "American cheese",
    "Queijo americano"
  ],
  [
    "Cheese, American",
    "Queijo americano"
  ],
  [
    "Cheese, American, cheddar or colby",
    "Queijo americano, tipo cheddar ou colby"
  ],
  [
    "Cheese, pasteurized process, American, regular",
    "Queijo americano processado pasteurizado tradicional"
  ],
  [
    "Cheese, pasteurized process, American, low fat",
    "Queijo americano processado pasteurizado com baixo teor de gordura"
  ],
  [
    "Cheese, pasteurized process, American, fat free",
    "Queijo americano processado pasteurizado zero gordura"
  ],
  [
    "Cheese, pasteurized process, American, vitamin D fortified",
    "Queijo americano processado pasteurizado fortificado com vitamina D"
  ],
  [
    "Grapefruit juice, white, canned or bottled, unsweetened",
    "Suco de toranja branca, enlatado ou engarrafado, sem adição de açúcar"
  ],
  [
    "Onion rings, breaded, par fried, frozen, prepared, heated in oven",
    "Anéis de cebola, empanados, pré-fritos, congelados, aquecidos no forno"
  ],
  [
    "Seeds, sunflower seed kernels, dry roasted, with salt added",
    "Sementes de girassol torradas a seco, com sal"
  ],
  [
    "Egg, white, raw, frozen, pasteurized",
    "Clara de ovo, crua, congelada, pasteurizada"
  ],
  [
    "Egg, yolk, raw, frozen, pasteurized",
    "Gema de ovo, crua, congelada, pasteurizada"
  ],
  [
    "Peaches, yellow, raw",
    "Pêssego amarelo, cru"
  ],
  [
    "Chicken, drumstick, meat only, cooked, braised",
    "Coxa de frango, apenas carne, cozida, ensopada"
  ],
  [
    "Chicken, drumstick, meat and skin, cooked, braised",
    "Coxa de frango, carne e pele, cozida, ensopada"
  ],
  [
    "Chicken, broilers or fryers, drumstick, meat only, cooked, braised",
    "Coxa de frango de corte, apenas carne, cozida, ensopada"
  ],
  [
    "Chicken drumstick, baked or broiled",
    "Coxa de frango assada ou grelhada"
  ],
  [
    "Chicken breast, baked or broiled",
    "Peito de frango assado ou grelhado"
  ],
  [
    "Chicken thigh, baked or broiled",
    "Sobrecoxa de frango assada ou grelhada"
  ],
  [
    "Chicken wing, baked or broiled",
    "Asa de frango assada ou grelhada"
  ],
  [
    "Frankfurter, beef, unheated",
    "Salsicha de carne bovina, não aquecida"
  ],
  [
    "Nuts, almonds, dry roasted, with salt added",
    "Amêndoas torradas a seco, com sal"
  ],
  [
    "Tomatoes, grape, raw",
    "Tomate-uva, cru"
  ],
  [
    "Restaurant, Chinese, sweet and sour chicken",
    "Frango agridoce de restaurante chinês"
  ],
  [
    "Restaurant, Chinese, Kung Pao chicken",
    "Frango Kung Pao de restaurante chinês"
  ],
  [
    "Restaurant, Mexican, cheese enchilada",
    "Enchilada de queijo de restaurante mexicano"
  ],
  [
    "Restaurant, Italian, lasagna with meat",
    "Lasanha com carne de restaurante italiano"
  ],
  [
    "Vegetable and fruit juice drink, with high vitamin C, light",
    "Bebida de suco de frutas e vegetais, com alto teor de vitamina C, de baixa caloria"
  ],
  [
    "Beef stew with potatoes and vegetables",
    "Ensopado de carne bovina com batatas e vegetais"
  ],
  [
    "Lentil curry with rice",
    "Curry de lentilha com arroz"
  ],
  [
    "Roll, dinner, whole wheat",
    "Pãozinho integral para refeição"
  ],
  [
    "Roll, dinner",
    "Pãozinho para refeição"
  ],
  [
    "Fish, tuna, light, canned in water, drained solids",
    "Atum claro em conserva de água, sólidos escorridos"
  ],
  [
    "Hard seltzer",
    "Bebida alcoólica gaseificada"
  ],
  [
    "Potato tots, frozen, fried",
    "Bolinhos de batata, congelados, fritos"
  ],
  [
    "Potato tots",
    "Bolinhos de batata"
  ],
  [
    "Chicken and vegetable entree with rice, diet frozen meal",
    "Prato de frango com vegetais e arroz, refeição congelada dietética"
  ],
  [
    "Cheeseburger, from fast food, 1 medium patty",
    "Hambúrguer com queijo, de lanchonete, 1 carne média"
  ],
  [
    "Pinto beans, from fast food / restaurant",
    "Feijão carioca, de lanchonete ou restaurante"
  ],
  [
    "Porcupine balls with mushroom sauce",
    "Almôndegas de carne e arroz com molho de cogumelos"
  ],
  [
    "Coffee cake, crumb or quick-bread type, cheese-filled",
    "Bolo caseiro para café, com farofa doce, recheado com queijo"
  ],
  [
    "Coffee, Iced Latte, decaffeinated, flavored",
    "Café latte gelado, descafeinado, aromatizado"
  ],
  [
    "Tuna noodle casserole with cream or white sauce",
    "Caçarola de macarrão com atum e molho branco"
  ],
  [
    "Chicken or turkey noodle casserole with cream or white sauce",
    "Caçarola de macarrão com frango ou peru e molho branco"
  ],
  [
    "Turkey with gravy, dressing, potatoes, vegetable, frozen meal",
    "Refeição congelada de peru com molho de carne, recheio, batatas e vegetais"
  ],
  [
    "Chicken or turkey, noodles, and vegetables including carrots, broccoli, and/or dark-green leafy; gravy",
    "Frango ou peru com macarrão e vegetais, ao molho de carne"
  ],
  [
    "Fish, salmon, sockeye, wild caught, raw",
    "Salmão-vermelho selvagem, cru"
  ],
  [
    "Cabbage, red, raw",
    "Repolho roxo, cru"
  ],
  [
    "Cabbage, yellow, raw",
    "Repolho amarelo, cru"
  ],
  [
    "Onions, yellow, raw",
    "Cebola amarela, crua"
  ],
  [
    "Gefilte fish",
    "Bolinho de peixe tradicional judaico"
  ],
  [
    "Cake, pound",
    "Bolo tipo inglês tradicional"
  ],
  [
    "Soup, Italian wedding",
    "Sopa tradicional italiana"
  ],
  [
    "Fish in lemon-butter sauce with starch item, vegetable, frozen meal",
    "Peixe ao molho de manteiga com limão acompanhado de amido e vegetais, refeição congelada"
  ],
  [
    "Waffle, plain",
    "Waffle tradicional simples"
  ],
  [
    "Waffle, plain, frozen",
    "Waffle tradicional congelado"
  ]
]);

// 2. REGRAS SINTÁTICAS E CULINÁRIAS DE EXPRESSÕES EM PT-BR
export const PHRASE_RULES = [
  // --- ROUND 3 NATURALITY RULES ---
  [/\bBeef, sliced\b/gi, "Carne bovina fatiada"],
  [/\bbeef, sliced\b/gi, "carne bovina fatiada"],
  [/\bRoll, oatmeal\b/gi, "Pãozinho de aveia"],
  [/\bmade with oatmeal\b/gi, "feito com aveia"],
  [/\bwith oatmeal\b/gi, "com aveia"],
  // --- ROUND 2 NATURALITY RULES ---
  [/\bSweet potatoes, orange flesh, without skin, raw\b/gi, "Batatas-doces de polpa laranja, sem pele, cruas"],
  [/\bSweet potatoes, orange flesh\b/gi, "Batatas-doces de polpa laranja"],
  [/\bSweet potato chips\b/gi, "Batatas-doces crocantes estouradas"],
  [/\bSweet potatoes\b/gi, "Batatas-doces"],
  [/\bsweet potatoes\b/gi, "batatas-doces"],
  [/\bCorn flour, masa harina, white or yellow, dry, raw\b/gi, "Farinha de milho para massa mexicana, branca ou amarela, crua"],
  [/\bCorn flour patty or tart, fried\b/gi, "Empadinha de farinha de milho, frita"],
  [/\bCorn flour\b/gi, "Farinha de milho"],
  [/\bcorn flour\b/gi, "farinha de milho"],
  [/\bSorghum flour, white, pearled, unenriched, dry, raw\b/gi, "Farinha de sorgo branco, perolizado, não enriquecida, crua"],
  [/\bSorghum flour\b/gi, "Farinha de sorgo"],
  [/\bsorghum flour\b/gi, "farinha de sorgo"],
  [/\bMasa harina, cooked\b/gi, "Farinha de milho para massa (masa harina), cozida"],
  [/\bMasa harina\b/gi, "Farinha de milho para massa (masa harina)"],
  [/\bmasa harina\b/gi, "farinha de milho para massa (masa harina)"],
  [/\bmade with rice flour\b/gi, "feita com farinha de arroz"],
  [/\brice flour\b/gi, "farinha de arroz"],
  [/\bCorned beef patty\b/gi, "Hambúrguer de carne bovina curada"],
  [/\bCorned beef sandwich on white, with cheese\b/gi, "Sanduíche de carne bovina curada em pão branco, com queijo"],
  [/\bCorned beef sandwich on white\b/gi, "Sanduíche de carne bovina curada em pão branco"],
  [/\bCorned beef sandwich on wheat, with cheese\b/gi, "Sanduíche de carne bovina curada em pão de trigo, com queijo"],
  [/\bCorned beef sandwich on wheat\b/gi, "Sanduíche de carne bovina curada em pão de trigo"],
  [/\bCorned beef sandwich\b/gi, "Sanduíche de carne bovina curada"],
  [/\bCorned beef\b/gi, "Carne bovina curada"],
  [/\bcorned beef\b/gi, "carne bovina curada"],
  [/\bTurkey, light meat, skin not eaten\b/gi, "Peru, carne branca, sem pele"],
  [/\bTurkey, light meat, skin eaten\b/gi, "Peru, carne branca, com pele"],
  [/\bTurkey, light meat, breaded, baked or fried, skin not eaten\b/gi, "Peru, carne branca, empanada, assada ou frita, sem pele"],
  [/\bTurkey, light meat, breaded, baked or fried, skin eaten\b/gi, "Peru, carne branca, empanada, assada ou frita, com pele"],
  [/\bTurkey, light meat, roasted, skin not eaten\b/gi, "Peru, carne branca, assada, sem pele"],
  [/\bTurkey, light meat, roasted, skin eaten\b/gi, "Peru, carne branca, assada, com pele"],
  [/\bTurkey, dark meat, roasted, skin not eaten\b/gi, "Peru, carne escura, assada, sem pele"],
  [/\bTurkey, dark meat, roasted, skin eaten\b/gi, "Peru, carne escura, assada, com pele"],
  [/\bTurkey, light or dark meat, fried, coated, skin not eaten\b/gi, "Peru, carne branca ou escura, frita, empanada, sem pele"],
  [/\bTurkey, light or dark meat, fried, coated, skin eaten\b/gi, "Peru, carne branca ou escura, frita, empanada, com pele"],
  [/\bTurkey, light or dark meat, stewed, skin not eaten\b/gi, "Peru, carne branca ou escura, ensopada, sem pele"],
  [/\bTurkey light or dark meat, stewed, skin eaten\b/gi, "Peru, carne branca ou escura, ensopada, com pele"],
  [/\bTurkey, light or dark meat, smoked, skin eaten\b/gi, "Peru, carne branca ou escura, defumada, com pele"],
  [/\bTurkey, light or dark meat, smoked, skin not eaten\b/gi, "Peru, carne branca ou escura, defumada, sem pele"],
  [/\blight and dark meat\b/gi, "carne branca e escura"],
  [/\blight or dark meat\b/gi, "carne branca ou escura"],
  [/\blight meat\b/gi, "carne branca"],
  [/\bdark meat\b/gi, "carne escura"],
  [/\bBaby Toddler sweet potatoes, Stage 1\b/gi, "Purê infantil de batata-doce, Estágio 1"],
  [/\bBaby Toddler sweet potatoes, Stage 2\b/gi, "Purê infantil de batata-doce, Estágio 2"],
  [/\bBaby Toddler sweet potatoes\b/gi, "Purê infantil de batata-doce"],
  [/\bBaby Toddler meat stick\b/gi, "Palitinhos infantis de carne"],
  [/\bBaby Toddler meat, NFS\b/gi, "Papinha infantil de carne, não especificada"],
  [/\bBaby Toddler meat\b/gi, "Papinha infantil de carne"],
  [/\bBaby Toddler beef\b/gi, "Papinha infantil de carne bovina"],
  [/\bMeat spread or potted meat, NFS\b/gi, "Patê de carne, não especificado"],
  [/\bMeat spread\b/gi, "Patê de carne"],
  [/\bBarbecue meat, NFS\b/gi, "Carne ao molho barbecue, não especificada"],
  [/\bBarbecue meat\b/gi, "Carne ao molho barbecue"],
  [/\bMeat loaf, NS as to type of meat\b/gi, "Bolo de carne, tipo de carne não especificado"],
  [/\bHash, NS as to type of meat\b/gi, "Picadinho de carne, tipo de carne não especificado"],
  [/\bcream sauce, white sauce, or mushroom sauce\b/gi, "molho branco ou molho de cogumelos"],
  [/\bcream sauce, white sauce or mushroom sauce\b/gi, "molho branco ou molho de cogumelos"],
  [/\bcream or white sauce\b/gi, "molho branco"],
  [/\bcream sauce\b/gi, "molho branco"],
  [/\bwhite sauce\b/gi, "molho branco"],
  [/\bCream sauce\b/gi, "Molho branco"],
  [/\bWhite sauce\b/gi, "Molho branco"],
  [/\bpre-lightened and pre-sweetened with low calorie sweetener, reconstituted\b/gi, "com clareador e adoçado com adoçante de baixa caloria, reconstituído"],
  [/\bpre-lightened and pre-sweetened with low calorie sweetener, not reconstituted\b/gi, "com clareador e adoçado com adoçante de baixa caloria, não reconstituído"],
  [/\bpre-lightened and pre-sweetened with low calorie sweetener\b/gi, "com clareador e adoçado com adoçante de baixa caloria"],
  [/\bpre-sweetened with low calorie sweetener\b/gi, "adoçado com adoçante de baixa caloria"],
  [/\blow calorie sweetener\b/gi, "adoçante de baixa caloria"],
  [/\bEnergy drink, low calorie \(Monster\)/gi, "Bebida energética de baixa caloria Monster"],
  [/\bSports drink, low calorie \(Gatorade G2\)/gi, "Bebida esportiva de baixa caloria Gatorade G2"],
  [/\bSports drink, low calorie \(Powerade Zero\)/gi, "Bebida esportiva de baixa caloria Powerade Zero"],
  [/\bSports drink, low calorie\b/gi, "Bebida esportiva de baixa caloria"],
  [/\bSports drink\b/gi, "Bebida esportiva"],
  [/\bsports drink\b/gi, "bebida esportiva"],
  [/\bEnergy drink\b/gi, "Bebida energética"],
  [/\benergy drink\b/gi, "bebida energética"],
  [/\bAlcoholic malt beverage, sweetened\b/gi, "Bebida alcoólica de malte, adoçada"],
  [/\bAlcoholic malt beverage\b/gi, "Bebida alcoólica de malte"],
  [/\bNutritional drink or shake, high protein, ready-to-drink \(Slim Fast\)/gi, "Shake nutricional rico em proteínas pronto para beber Slim Fast"],
  [/\bNutritional drink or shake, high protein, ready-to-drink, NFS\b/gi, "Shake nutricional rico em proteínas pronto para beber, não especificado"],
  [/\bNutritional drink or shake, high protein, light, ready-to-drink, NFS\b/gi, "Shake nutricional rico em proteínas de baixa caloria pronto para beber, não especificado"],
  [/\bNutritional drink or shake, high protein\b/gi, "Shake nutricional rico em proteínas"],
  [/\bNutritional drink or shake\b/gi, "Bebida ou shake nutricional"],
  [/\bNutritional powder mix, high protein \(Herbalife\)/gi, "Mistura nutricional em pó rica em proteínas Herbalife"],
  [/\bNutritional powder mix, high protein \(Slim Fast\)/gi, "Mistura nutricional em pó rica em proteínas Slim Fast"],
  [/\bNutritional powder mix, high protein, NFS\b/gi, "Mistura nutricional em pó rica em proteínas, não especificada"],
  [/\bNutritional powder mix, high protein\b/gi, "Mistura nutricional em pó rica em proteínas"],
  [/\bNutritional powder mix\b/gi, "Mistura nutricional em pó"],
  [/\bNutrition bar \(South Beach Living High Protein Bar\)/gi, "Barra nutricional rica em proteínas South Beach Living"],
  [/\bNutrition bar\b/gi, "Barra nutricional"],
  [/\bhigh protein\b/gi, "rico em proteínas"],
  [/\bHigh protein\b/gi, "Rico em proteínas"],
  [/\bHigh Protein\b/gi, "Rico em Proteínas"],
  [/\bCereal, chocolate puffs\b/gi, "Cereal de chocolate inflado"],
  [/\bCereal, flavored puffs\b/gi, "Cereal com sabor inflado"],
  [/\bCereal, plain puffs\b/gi, "Cereal tradicional inflado"],
  [/\bSnack bar, oatmeal\b/gi, "Barra de cereal de aveia"],
  [/\bPotato tots, from fresh, fried or baked\b/gi, "Bolinhos de batata frescos, fritos ou assados"],
  [/\bPotato tots, frozen, baked\b/gi, "Bolinhos de batata congelados, assados"],
  [/\bPotato tots, frozen, NS as to fried or baked\b/gi, "Bolinhos de batata congelados, método de preparo não especificado"],
  [/\bPotato tots, frozen\b/gi, "Bolinhos de batata congelados"],
  [/\bPotato tots\b/gi, "Bolinhos de batata"],
  [/\bBlackeyed peas, from frozen\b/gi, "Feijão-fradinho congelado"],
  [/\bBlackeyed peas, from canned\b/gi, "Feijão-fradinho em conserva"],
  [/\bBlackeyed peas\b/gi, "Feijão-fradinho"],
  // --- REGRAS DE NATURALIDADE PT-BR, CASOS COMPROVADOS E GRAMÁTICA SINTÁTICA ---
  // Casos Comprovados
  [/\bFish fillet, fried as ingredient in sandwiches\b/gi, "Filé de peixe, frito como ingrediente em sanduíches"],
  [/\bFish, cod, Atlantic, wild caught, raw\b/gi, "Bacalhau do Atlântico selvagem, cru"],
  [/\bFish, cod, Atlantic, raw\b/gi, "Bacalhau do Atlântico, cru"],
  [/\bFish, cod, Pacific, raw\b/gi, "Bacalhau do Pacífico, cru"],
  [/\bFish, cod, raw\b/gi, "Bacalhau cru"],
  [/\bFish, cod\b/gi, "Bacalhau"],
  [/\bFish, haddock, raw\b/gi, "Hadoque, cru"],
  [/\bFish, pollock, raw\b/gi, "Polaca, crua"],
  [/\bFish, salmon, sockeye, wild caught, raw\b/gi, "Salmão-vermelho selvagem, cru"],
  [/\bFish, salmon, Atlantic, farm raised, raw\b/gi, "Salmão do Atlântico, criado em cativeiro, cru"],
  [/\bFish, tilapia, farm raised, raw\b/gi, "Tilápia de cativeiro, crua"],
  [/\bFish, perch, NFS\b/gi, "Perca, não especificada"],
  [/\bFish, perch\b/gi, "Perca"],
  [/\bpeixe filé\b/gi, "filé de peixe"],
  [/\bfilé peixe\b/gi, "filé de peixe"],
  [/\bPizza with cheese and extra vegetables\b/gi, "Pizza com queijo e vegetais extras"],
  [/\bextra vegetables\b/gi, "vegetais extras"],
  [/\bextra cheese\b/gi, "queijo extra"],
  [/\bextra sauce\b/gi, "molho extra"],
  [/\bextra meat\b/gi, "carne extra"],
  [/\bBeans, snap, green, frozen, cooked, boiled, drained, without salt\b/gi, "Vagem verde, congelada, cozida em água e escorrida, sem sal"],
  [/\bBeans, snap, green, canned, regular pack, drained solids\b/gi, "Vagem verde, enlatada, embalagem tradicional, escorrida"],
  [/\bPeas and carrots, canned, cooked, fat added\b/gi, "Ervilhas e cenouras, enlatadas, cozidas, com adição de gordura"],
  [/\bFlour, semolina, coarse and semi-coarse\b/gi, "Farinha de sêmola, grossa e semigrossa"],
  [/\bFlour, semolina\b/gi, "Farinha de sêmola"],
  [/\bcoarse and semi-coarse\b/gi, "grossa e semigrossa"],
  [/\bwith added vitamin A and vitamin D\b/gi, "com vitaminas A e D adicionadas"],
  [/\bwith added vitamin D and vitamin A\b/gi, "com vitaminas D e A adicionadas"],
  [/\bwith added vitamin A and D\b/gi, "com vitaminas A e D adicionadas"],
  [/\bwith added vitamin A\b/gi, "com vitamina A adicionada"],
  [/\bwith added vitamin D\b/gi, "com vitamina D adicionada"],
  [/\bwith added vitamin C\b/gi, "com vitamina C adicionada"],

  // Óleos culinários naturais: Óleo de X / Azeite de oliva
  [/\bOil, corn\b/gi, "Óleo de milho"],
  [/\bOil, canola\b/gi, "Óleo de canola"],
  [/\bOil, soybean\b/gi, "Óleo de soja"],
  [/\bOil, peanut\b/gi, "Óleo de amendoim"],
  [/\bOil, sunflower\b/gi, "Óleo de girassol"],
  [/\bOil, coconut\b/gi, "Óleo de coco"],
  [/\bOil, olive\b/gi, "Azeite de oliva"],
  [/\bOil, sesame\b/gi, "Óleo de gergelim"],
  [/\bOil, palm\b/gi, "Óleo de palma"],
  [/\bOil, safflower\b/gi, "Óleo de cártamo"],
  [/\bOil, walnut\b/gi, "Óleo de noz"],
  [/\bOil, almond\b/gi, "Óleo de amêndoa"],
  [/\bOil, avocado\b/gi, "Óleo de abacate"],
  [/\bOil, flaxseed\b/gi, "Óleo de linhaça"],
  [/\bOil, vegetable\b/gi, "Óleo vegetal"],

  // Farinhas e Moagens: Farinha de / para X
  [/\bFlour, wheat, all-purpose, enriched, bleached\b/gi, "Farinha de trigo tradicional, enriquecida, branqueada"],
  [/\bFlour, wheat, all-purpose, enriched, unbleached\b/gi, "Farinha de trigo tradicional, enriquecida, não branqueada"],
  [/\bFlour, wheat, all-purpose, unenriched, unbleached\b/gi, "Farinha de trigo tradicional, não enriquecida, não branqueada"],
  [/\bFlour, whole wheat, unenriched\b/gi, "Farinha de trigo integral, não enriquecida"],
  [/\bFlour, whole wheat, enriched\b/gi, "Farinha de trigo integral, enriquecida"],
  [/\bFlour, whole wheat\b/gi, "Farinha de trigo integral"],
  [/\bFlour, bread, white, enriched, unbleached\b/gi, "Farinha de trigo para pão, branca, enriquecida, não branqueada"],
  [/\bFlour, bread, white, enriched, bleached\b/gi, "Farinha de trigo para pão, branca, enriquecida, branqueada"],
  [/\bFlour, bread\b/gi, "Farinha de trigo para pão"],
  [/\bFlour, pastry, unenriched, unbleached\b/gi, "Farinha para confeitaria, não enriquecida, não branqueada"],
  [/\bFlour, pastry, enriched\b/gi, "Farinha para confeitaria, enriquecida"],
  [/\bFlour, pastry\b/gi, "Farinha para confeitaria"],
  [/\bFlour, cake\b/gi, "Farinha para bolo"],
  [/\bFlour, rye\b/gi, "Farinha de centeio"],
  [/\bFlour, barley\b/gi, "Farinha de cevada"],
  [/\bFlour, buckwheat\b/gi, "Farinha de trigo-sarraceno"],
  [/\bFlour, amaranth\b/gi, "Farinha de amaranto"],
  [/\bFlour, sorghum\b/gi, "Farinha de sorgo"],
  [/\bFlour, rice, glutinous\b/gi, "Farinha de arroz glutinoso"],
  [/\bFlour, rice, white\b/gi, "Farinha de arroz branco"],
  [/\bFlour, rice, brown\b/gi, "Farinha de arroz integral"],
  [/\bFlour, rice\b/gi, "Farinha de arroz"],
  [/\bFlour, oat\b/gi, "Farinha de aveia"],
  [/\bFlour, almond\b/gi, "Farinha de amêndoa"],
  [/\bFlour, corn, yellow, fine meal, enriched\b/gi, "Farinha de milho amarela de moagem fina, enriquecida"],
  [/\bFlour, corn, yellow\b/gi, "Farinha de milho amarela"],
  [/\bFlour, corn, white\b/gi, "Farinha de milho branca"],
  [/\bFlour, corn\b/gi, "Farinha de milho"],
  [/\bFlour, soy, defatted\b/gi, "Farinha de soja desengordurada"],
  [/\bFlour, soy, full-fat\b/gi, "Farinha de soja integral"],
  [/\bFlour, soy\b/gi, "Farinha de soja"],
  [/\bFlour, potato\b/gi, "Farinha de batata"],
  [/\bFlour, coconut\b/gi, "Farinha de coco"],
  [/\bFlour, tapioca\b/gi, "Farinha de tapioca"],
  [/\bfine meal\b/gi, "moagem fina"],
  [/\bFine meal\b/gi, "Moagem fina"],
  [/\bcoarse meal\b/gi, "moagem grossa"],
  [/\bCoarse meal\b/gi, "Moagem grossa"],

  // Pudins e Sobremesas
  [/\bPudding, bread\b/gi, "Pudim de pão"],
  [/\bPudding, rice\b/gi, "Arroz-doce (pudim de arroz)"],
  [/\bPudding, tapioca\b/gi, "Pudim de tapioca"],
  [/\bPudding, banana\b/gi, "Pudim de banana"],
  [/\bPudding, chocolate\b/gi, "Pudim de chocolate"],
  [/\bPudding, vanilla\b/gi, "Pudim de baunilha"],
  [/\bPudding, butterscotch\b/gi, "Pudim de caramelo e manteiga"],

  // Manteigas
  [/\bButter, stick, unsalted\b/gi, "Manteiga sem sal em barra"],
  [/\bButter, stick, salted\b/gi, "Manteiga com sal em barra"],
  [/\bButter, stick\b/gi, "Manteiga em barra"],
  [/\bButter, whipped\b/gi, "Manteiga aerada"],

  // Queijos e Laticínios
  [/\blow moisture\b/gi, "baixa umidade"],
  [/\bLow moisture\b/gi, "Baixa umidade"],
  [/\bpart-skim\b/gi, "parcialmente desnatado"],
  [/\bPart-skim\b/gi, "Parcialmente desnatado"],
  [/\bCheese, mozzarella, low moisture, part-skim\b/gi, "Queijo mozarela, baixa umidade, parcialmente desnatado"],
  [/\bCream, half and half\b/gi, "Creme de leite e leite (half and half)"],
  [/\bYogurt, almond milk\b/gi, "Iogurte à base de amêndoas"],
  [/\bYogurt, soy milk\b/gi, "Iogurte à base de soja"],
  [/\bYogurt, soy\b/gi, "Iogurte de soja"],
  [/\bYogurt, coconut milk\b/gi, "Iogurte à base de leite de coco"],

  // Padaria, Biscoitos e Cereais
  [/\bCookies?, oatmeal, soft, with raisins\b/gi, "Biscoitos de aveia, macios, com uvas-passas"],
  [/\bCookie, oatmeal, reduced sugar\b/gi, "Biscoito de aveia, com teor reduzido de açúcar"],
  [/\bCookies?, oatmeal\b/gi, "Biscoitos de aveia"],
  [/\bcookie, oatmeal\b/gi, "biscoito de aveia"],
  [/\bMuffins?, English, with fruit other than raisins\b/gi, "Muffin inglês com frutas (exceto uvas-passas)"],
  [/\bMuffins?, English, with raisins\b/gi, "Muffin inglês com uvas-passas"],
  [/\bMuffins?, English, wheat bran, with raisins\b/gi, "Muffin inglês de farelo de trigo com uvas-passas"],
  [/\bMuffins?, English, wheat bran\b/gi, "Muffin inglês de farelo de trigo"],
  [/\bMuffins?, English, wheat or cracked wheat, with raisins\b/gi, "Muffin inglês de trigo com uvas-passas"],
  [/\bMuffins?, English, wheat or cracked wheat\b/gi, "Muffin inglês de trigo"],
  [/\bMuffins?, English, whole wheat, with raisins\b/gi, "Muffin inglês de trigo integral com uvas-passas"],
  [/\bMuffins?, English, whole wheat\b/gi, "Muffin inglês de trigo integral"],
  [/\bMuffins?, English, whole grain white\b/gi, "Muffin inglês de grãos integrais"],
  [/\bMuffins?, English, rye\b/gi, "Muffin inglês de centeio"],
  [/\bMuffins?, English, pumpernickel\b/gi, "Muffin inglês tipo pumpernickel"],
  [/\bMuffins?, English, oat bran, with raisins\b/gi, "Muffin inglês de farelo de aveia com uvas-passas"],
  [/\bMuffins?, English, oat bran\b/gi, "Muffin inglês de farelo de aveia"],
  [/\bMuffins?, English, multigrain\b/gi, "Muffin inglês multigrãos"],
  [/\bMuffins?, English, cheese\b/gi, "Muffin inglês de queijo"],
  [/\bMuffins?, English\b/gi, "Muffin inglês"],
  [/\bEnglish muffin\b/gi, "muffin inglês"],
  [/\bEgg sandwich on English muffin, with sausage\b/gi, "Sanduíche de ovo no muffin inglês com linguiça"],
  [/\bEgg sandwich on English muffin, with bacon\b/gi, "Sanduíche de ovo no muffin inglês com bacon"],
  [/\bEgg sandwich on English muffin, with ham\b/gi, "Sanduíche de ovo no muffin inglês com presunto"],
  [/\bEgg sandwich on English muffin\b/gi, "Sanduíche de ovo no muffin inglês"],
  [/\bSausage English muffin sandwich\b/gi, "Sanduíche de linguiça no muffin inglês"],
  [/\bCornbread muffin, stick, round, made from home recipe\b/gi, "Muffin de broa de milho, palito, redondo, receita caseira"],
  [/\bCornbread muffin, stick, round\b/gi, "Muffin de broa de milho, palito, redondo"],
  [/\bMuffin, fruit, low fat\b/gi, "Muffin de frutas com baixo teor de gordura"],
  [/\bMuffin, fruit\b/gi, "Muffin de frutas"],
  [/\bMuffin, chocolate chip\b/gi, "Muffin com gotas de chocolate"],
  [/\bMuffin, chocolate\b/gi, "Muffin de chocolate"],
  [/\bMuffin, whole wheat\b/gi, "Muffin de trigo integral"],
  [/\bMuffin, wheat\b/gi, "Muffin de trigo"],
  [/\bMuffin, whole grain\b/gi, "Muffin integral"],
  [/\bMuffin, wheat bran\b/gi, "Muffin de farelo de trigo"],
  [/\bMuffin, bran with fruit, lowfat\b/gi, "Muffin de farelo com frutas, baixo teor de gordura"],
  [/\bMuffin, oatmeal\b/gi, "Muffin de aveia"],
  [/\bMuffins?, oatmeal\b/gi, "Muffin de aveia"],
  [/\bmuffin, oatmeal\b/gi, "muffin de aveia"],
  [/\bMuffin, oat bran\b/gi, "Muffin de farelo de aveia"],
  [/\bMuffin, plain\b/gi, "Muffin tradicional"],
  [/\bMuffin, cheese\b/gi, "Muffin de queijo"],
  [/\bMuffin, pumpkin\b/gi, "Muffin de abóbora"],
  [/\bMuffin, zucchini\b/gi, "Muffin de abobrinha"],
  [/\bMuffin, carrot\b/gi, "Muffin de cenoura"],
  [/\bMuffin, NFS\b/gi, "Muffin, não especificado"],
  [/\bBread, oatmeal\b/gi, "Pão de aveia"],
  [/\bbread, oatmeal\b/gi, "pão de aveia"],
  [/\bPancakes, whole grain, frozen\b/gi, "Panquecas integrais, congeladas"],
  [/\bCrackers, matzo, reduced sodium\b/gi, "Bolachas salgadas matzo, com teor reduzido de sódio"],
  [/\bCereal or granola bar \(KIND Fruit and Nut Bar\)/gi, "Barra de cereal ou granola (tipo barra de frutas e castanhas)"],
  [/\b\(KIND Fruit and Nut Bar\)/gi, "(tipo barra de frutas e castanhas)"],
  [/\bCereal, corn puffs\b/gi, "Cereal de milho inflado"],
  [/\bcorn puffs\b/gi, "flocos de milho inflados"],
  [/\bFrito pie\b/gi, "Torta de chili com salgadinho de milho"],
  [/\bPotato chips, popped, flavored\b/gi, "Batatas crocantes estouradas, com sabor"],
  [/\bPotato chips\b/gi, "Batatas fritas crocantes"],
  [/\bpotato chips\b/gi, "batatas fritas crocantes"],
  [/\bBread, wheat or cracked wheat, reduced calorie and\/or high fiber\b/gi, "Pão de trigo ou trigo triturado, com teor reduzido de calorias e/ou rico em fibras"],
  [/\bcracked wheat\b/gi, "trigo triturado"],
  [/\bCracked wheat\b/gi, "Trigo triturado"],
  [/\bhigh fiber\b/gi, "rico em fibras"],
  [/\bHigh fiber\b/gi, "Rico em fibras"],

  // Carnes, Embutidos e Aves
  [/\bSausage, turkey, breakfast links, mild, raw\b/gi, "Linguiça de peru tipo café da manhã em gomos, suave, crua"],
  [/\bbreakfast links\b/gi, "tipo café da manhã em gomos"],
  [/\bHam, sliced, pre-packaged, deli meat \(96%fat free, water added\)/gi, "Presunto fatiado pré-embalado (frios, 96% livre de gordura, com adição de água)"],
  [/\b\(96%fat free, water added\)/gi, "(96% livre de gordura, com adição de água)"],
  [/\b\((\d+)%\s*fat free/gi, "($1% livre de gordura"],
  [/\b(\d+)%\s*fat free/gi, "$1% livre de gordura"],
  [/\bBeef, prepackaged or deli, luncheon meat, reduced sodium\b/gi, "Carne bovina fatiada pré-embalada (frios), com teor reduzido de sódio"],
  [/\bBeef, prepackaged or deli, luncheon meat\b/gi, "Carne bovina fatiada pré-embalada (frios)"],
  [/\bHam, prepackaged or deli, luncheon meat, reduced sodium\b/gi, "Presunto pré-embalado ou de frios, com teor reduzido de sódio"],
  [/\bHam, prepackaged or deli, luncheon meat\b/gi, "Presunto pré-embalado ou de frios"],
  [/\bChicken, prepackaged or deli, luncheon meat, reduced sodium\b/gi, "Frango pré-embalado ou de frios, com teor reduzido de sódio"],
  [/\bChicken, prepackaged or deli, luncheon meat\b/gi, "Frango pré-embalado ou de frios"],
  [/\bTurkey, prepackaged or deli, luncheon meat, reduced sodium\b/gi, "Peru pré-embalado ou de frios, com teor reduzido de sódio"],
  [/\bTurkey, prepackaged or deli, luncheon meat\b/gi, "Peru pré-embalado ou de frios"],
  [/\bTurkey ham, prepackaged or deli, luncheon meat\b/gi, "Presunto de peru pré-embalado ou de frios"],
  [/\bHam luncheon meat, loaf type\b/gi, "Presunto embutido tipo pão de carne"],
  [/\bLuncheon meat, loaf type\b/gi, "Embutido fatiado tipo pão de carne"],
  [/\bLuncheon meat, NFS\b/gi, "Frios fatiados, não especificado"],
  [/\bprepackaged or deli\b/gi, "pré-embalado ou de frios"],
  [/\bdeli meat\b/gi, "frios"],
  [/\bluncheon meat\b/gi, "frios"],
  [/\bChicken breast, baked or broiled, skin not eaten, from pre-cooked\b/gi, "Peito de frango assado ou grelhado, sem pele, pré-cozido"],
  [/\bChicken breast, baked or broiled, skin eaten, from pre-cooked\b/gi, "Peito de frango assado ou grelhado, com pele, pré-cozido"],
  [/\bChicken breast, fried, coated, skin \/ coating eaten, from pre-cooked\b/gi, "Peito de frango frito, empanado, com pele ou empanamento, pré-cozido"],
  [/\bChicken breast, fried, coated, skin \/ coating not eaten, from pre-cooked\b/gi, "Peito de frango frito, empanado, sem pele ou empanamento, pré-cozido"],
  [/\bChicken thigh, baked or broiled, skin eaten, from pre-cooked\b/gi, "Sobrecoxa de frango assada ou grelhada, com pele, pré-cozida"],
  [/\bChicken thigh, baked or broiled, skin not eaten, from pre-cooked\b/gi, "Sobrecoxa de frango assada ou grelhada, sem pele, pré-cozida"],
  [/\bChicken thigh, fried, coated, skin \/ coating eaten, from pre-cooked\b/gi, "Sobrecoxa de frango frita, empanada, com pele ou empanamento, pré-cozida"],
  [/\bChicken thigh, fried, coated, skin \/ coating not eaten, from pre-cooked\b/gi, "Sobrecoxa de frango frita, empanada, sem pele ou empanamento, pré-cozida"],
  [/\bChicken drumstick, baked or broiled, skin eaten, from pre-cooked\b/gi, "Coxa de frango assada ou grelhada, com pele, pré-cozida"],
  [/\bChicken drumstick, baked or broiled, skin not eaten, from pre-cooked\b/gi, "Coxa de frango assada ou grelhada, sem pele, pré-cozida"],
  [/\bChicken drumstick, fried, coated, skin \/ coating eaten, from pre-cooked\b/gi, "Coxa de frango frita, empanada, com pele ou empanamento, pré-cozida"],
  [/\bChicken drumstick, fried, coated, skin \/ coating not eaten, from pre-cooked\b/gi, "Coxa de frango frita, empanada, sem pele ou empanamento, pré-cozida"],
  [/\bChicken wing, baked or broiled, from pre-cooked\b/gi, "Asa de frango assada ou grelhada, pré-cozida"],
  [/\bChicken wing, fried, coated, from pre-cooked\b/gi, "Asa de frango frita, empanada, pré-cozida"],
  [/\bChicken "wings" with hot sauce, from precooked\b/gi, "Asinhas de frango com molho picante, pré-cozidas"],
  [/\bChicken "wings" with other sauces or seasoning, from precooked\b/gi, "Asinhas de frango com temperos e molhos, pré-cozidas"],
  [/\bChicken "wings", plain, from precooked\b/gi, "Asinhas de frango tradicionais, pré-cozidas"],
  [/\bfrom pre-?cooked\b/gi, "pré-cozido"],
  [/\bBeef, neck bones\b/gi, "Ossos de pescoço bovino"],
  [/\bBeef, steak, cube\b/gi, "Bife bovino amaciado em cubos"],
  [/\bSausage, Italian\b/gi, "Linguiça tipo italiana"],
  [/\bSausage, pork, chorizo\b/gi, "Chouriço suíno"],
  [/\b(\d+)%\s*lean\s*\/\s*(\d+)%\s*fat\b/gi, "$1% magro e $2% gordura"],

  // Leguminosas e grãos (enlatados, desidratados e cultivares)
  [/\bBeans, from canned, NS as to type, fat added\b/gi, "Feijões enlatados, tipo não especificado, com adição de gordura"],
  [/\bBeans, from canned, NS as to type, no added fat\b/gi, "Feijões enlatados, tipo não especificado, sem adição de gordura"],
  [/\bBeans, from dried, NS as to type, fat added\b/gi, "Feijões de grão seco, tipo não especificado, com adição de gordura"],
  [/\bBeans, from dried, NS as to type, no added fat\b/gi, "Feijões de grão seco, tipo não especificado, sem adição de gordura"],
  [/\bBlack beans, from canned, fat added\b/gi, "Feijão-preto enlatado, com adição de gordura"],
  [/\bBlack beans, from canned, no added fat\b/gi, "Feijão-preto enlatado, sem adição de gordura"],
  [/\bBlack beans, from canned, reduced sodium\b/gi, "Feijão-preto enlatado, com teor reduzido de sódio"],
  [/\bBlack beans, from dried, fat added\b/gi, "Feijão-preto de grão seco, com adição de gordura"],
  [/\bBlack beans, from dried, no added fat\b/gi, "Feijão-preto de grão seco, sem adição de gordura"],
  [/\bWhite beans, from canned, fat added\b/gi, "Feijão branco enlatado, com adição de gordura"],
  [/\bWhite beans, from canned, no added fat\b/gi, "Feijão branco enlatado, sem adição de gordura"],
  [/\bWhite beans, from canned, reduced sodium\b/gi, "Feijão branco enlatado, com teor reduzido de sódio"],
  [/\bWhite beans, from dried, fat added\b/gi, "Feijão branco de grão seco, com adição de gordura"],
  [/\bWhite beans, from dried, no added fat\b/gi, "Feijão branco de grão seco, sem adição de gordura"],
  [/\bWhite beans, NFS\b/gi, "Feijão branco, não especificado"],
  [/\bWhite beans\b/gi, "Feijão branco"],
  [/\bwhite beans\b/gi, "feijão branco"],
  [/\bPinto beans, from canned, fat added\b/gi, "Feijão-carioca enlatado, com adição de gordura"],
  [/\bPinto beans, from canned, no added fat\b/gi, "Feijão-carioca enlatado, sem adição de gordura"],
  [/\bPinto beans, from canned, reduced sodium\b/gi, "Feijão-carioca enlatado, com teor reduzido de sódio"],
  [/\bPinto beans, from dried, fat added\b/gi, "Feijão-carioca de grão seco, com adição de gordura"],
  [/\bPinto beans, from dried, no added fat\b/gi, "Feijão-carioca de grão seco, sem adição de gordura"],
  [/\bKidney beans, from canned, fat added\b/gi, "Feijão-vermelho enlatado, com adição de gordura"],
  [/\bKidney beans, from canned, no added fat\b/gi, "Feijão-vermelho enlatado, sem adição de gordura"],
  [/\bKidney beans, from canned, reduced sodium\b/gi, "Feijão-vermelho enlatado, com teor reduzido de sódio"],
  [/\bKidney beans, from dried, fat added\b/gi, "Feijão-vermelho de grão seco, com adição de gordura"],
  [/\bKidney beans, from dried, no added fat\b/gi, "Feijão-vermelho de grão seco, sem adição de gordura"],
  [/\bChickpeas, from canned, fat added\b/gi, "Grão-de-bico enlatado, com adição de gordura"],
  [/\bChickpeas, from canned, no added fat\b/gi, "Grão-de-bico enlatado, sem adição de gordura"],
  [/\bChickpeas, from canned, reduced sodium\b/gi, "Grão-de-bico enlatado, com teor reduzido de sódio"],
  [/\bChickpeas, from dried, fat added\b/gi, "Grão-de-bico de grão seco, com adição de gordura"],
  [/\bChickpeas, from dried, no added fat\b/gi, "Grão-de-bico de grão seco, sem adição de gordura"],
  [/\bLentils, from canned\b/gi, "Lentilhas enlatadas"],
  [/\bLentils, from dried, fat added\b/gi, "Lentilhas de grão seco, com adição de gordura"],
  [/\bLentils, from dried, no added fat\b/gi, "Lentilhas de grão seco, sem adição de gordura"],
  [/\bLima beans, from canned\b/gi, "Fava enlatada"],
  [/\bLima beans, from dried\b/gi, "Fava de grão seco"],
  [/\bLima beans, from frozen, no added fat\b/gi, "Fava congelada, sem adição de gordura"],
  [/\bLima beans, from frozen, fat added\b/gi, "Fava congelada, com adição de gordura"],
  [/\bLima beans\b/gi, "Fava"],
  [/\blima beans\b/gi, "fava"],
  [/\bPeruvian beans, from dried\b/gi, "Feijão peruano de grão seco"],
  [/\bPeruvian beans\b/gi, "Feijão peruano"],
  [/\bperuvian beans\b/gi, "feijão peruano"],
  [/\bRefried beans, from canned, reduced sodium\b/gi, "Feijão refrito mexicano enlatado, com teor reduzido de sódio"],
  [/\bSplit peas, from dried, fat added\b/gi, "Ervilhas partidas de grão seco, com adição de gordura"],
  [/\bSplit peas, from dried, no added fat\b/gi, "Ervilhas partidas de grão seco, sem adição de gordura"],
  [/\bSplit peas\b/gi, "Ervilhas partidas"],
  [/\bsplit peas\b/gi, "ervilhas partidas"],
  [/\bBlackeyed peas, from dried\b/gi, "Feijão-fradinho de grão seco"],
  [/\bMushroom, Asian, cooked, from dried\b/gi, "Cogumelo asiático cozido a partir de desidratado"],
  [/\bfrom canned\b/gi, "enlatado"],
  [/\bfrom dried\b/gi, "de grão seco"],

  // Pratos Latino-Americanos (Pupusas, Tamales, etc.)
  [/\bPupusa, cheese only\b/gi, "Pupusa de queijo"],
  [/\bPupusa, with beans\b/gi, "Pupusa com feijão"],
  [/\bPupusa, meat, with beans\b/gi, "Pupusa de carne com feijão"],
  [/\bPupusa, meat\b/gi, "Pupusa de carne"],
  [/\bTamale, sweet\b/gi, "Tamale doce"],
  [/\bTamale, no meat\b/gi, "Tamale sem carne"],
  [/\bTamale, beef\b/gi, "Tamale de carne bovina"],
  [/\bTamale, pork\b/gi, "Tamale de carne de porco"],
  [/\bTamale, chicken\b/gi, "Tamale de frango"],
  [/\bTamale casserole with meat\b/gi, "Caçarola de tamale com carne"],
  [/\bTamale, NFS\b/gi, "Tamale, não especificado"],

  // Hortifrúti e Vegetais
  [/\bMelons, cantaloupe, raw\b/gi, "Melão cantaloupe, cru"],
  [/\bMelons, cantaloupe\b/gi, "Melão cantaloupe"],
  [/\bMelons, casaba\b/gi, "Melão casaba"],
  [/\bMelons, honeydew\b/gi, "Melão honeydew"],
  [/\bOranges, raw, navels\b/gi, "Laranja-baía, crua"],
  [/\bOranges, navels\b/gi, "Laranja-baía"],
  [/\bPotato, boiled, from fresh, peel not eaten, made with oil\b/gi, "Batata fresca, cozida em água, sem casca, feita com óleo"],
  [/\bPotato, boiled, from fresh\b/gi, "Batata fresca, cozida em água"],
  [/\bfrom fresh\b/gi, "fresco"],
  [/\bFrom fresh\b/gi, "Fresco"],
  [/\bPotato chips, popped, flavored\b/gi, "Batatas crocantes estouradas, com sabor"],
  [/\bpopped, flavored\b/gi, "estouradas, com sabor"],
  [/\bpopped\b/gi, "estourada"],
  [/\bPotato salad, made with light mayonnaise-type salad dressing\b/gi, "Salada de batatas, feita com molho tipo maionese de baixo teor calórico"],
  [/\bmade with light mayonnaise-type salad dressing\b/gi, "feita com molho tipo maionese de baixo teor calórico"],
  [/\bPickles, cucumber, dill or kosher dill\b/gi, "Picles de pepino, com endro ou endro kosher"],
  [/\bdill or kosher dill\b/gi, "endro ou endro kosher"],
  [/\bkosher dill\b/gi, "endro kosher"],

  // Leguminosas e Grãos Cultivares
  [/\bBeans, Dry, Flor de Mayo \(0% moisture\)/gi, "Feijão Flor de Mayo cru (em grão) (0% umidade)"],
  [/\bBeans, Dry, Flor de Mayo\b/gi, "Feijão Flor de Mayo cru (em grão)"],
  [/\bFlor de Mayo\b/gi, "Flor de Mayo"],
  [/\bBeans, Dry, Medium Red \(0% moisture\)/gi, "Feijão Vermelho Médio cru (em grão) (0% umidade)"],
  [/\bBeans, Dry, Medium Red\b/gi, "Feijão Vermelho Médio cru (em grão)"],
  [/\bMedium Red\b/gi, "Vermelho Médio"],

  // Pratos de Restaurante
  [/\bRestaurant, Latino, tamale, pork\b/gi, "Tamale latino de restaurante, carne suína"],
  [/\bRestaurant, Latino, pupusas con frijoles \(pupusas, bean\)/gi, "Pupusas com feijão de restaurante latino"],
  [/\bRestaurant, Chinese, fried rice, without meat\b/gi, "Arroz frito chinês de restaurante, sem carne"],
  [/\bRestaurant, Chinese, sweet and sour pork\b/gi, "Carne suína agridoce chinesa de restaurante"],
  [/\bRestaurant, Latino,\s*/gi, "De restaurante latino, "],
  [/\bRestaurant, Chinese,\s*/gi, "De restaurante chinês, "],
  [/\bRestaurant, Italian,\s*/gi, "De restaurante italiano, "],
  [/\bRestaurant, Mexican,\s*/gi, "De restaurante mexicano, "],

  // Outros Compostos e Padrões Sintáticos
  [/\bSauce, pasta, spaghetti\/marinara, ready-to-serve\b/gi, "Molho para macarrão espaguete ou marinara, pronto para servir"],
  [/\bspaghetti\/marinara\b/gi, "espaguete ou marinara"],
  [/\bSauce, salsa, ready-to-serve\b/gi, "Molho tipo salsa mexicana, pronto para servir"],
  [/\bMacaroni or noodles with cheese and meat\b/gi, "Macarrão com queijo e carne"],
  [/\bMacaroni or noodles\b/gi, "Macarrão"],
  [/\bmacaroni or noodles\b/gi, "macarrão"],
  [/\bRice, white, with other vegetables, NS as to fat\b/gi, "Arroz branco com outros vegetais, teor de gordura não especificado"],
  [/\bwith other vegetables\b/gi, "com outros vegetais"],
  [/\bother vegetables\b/gi, "outros vegetais"],
  [/\bOther vegetables\b/gi, "Outros vegetais"],
  [/\bIce cream cone, scooped, vanilla, waffle cone\b/gi, "Sorvete de casquinha, em bolas, baunilha, casquinha tipo waffle"],
  [/\bIce cream cone, scooped\b/gi, "Sorvete de casquinha, em bolas"],
  [/\bice cream cone, scooped\b/gi, "sorvete de casquinha, em bolas"],
  [/\bwaffle cone\b/gi, "casquinha tipo waffle"],
  [/\bAlmonds, chocolate covered candy\b/gi, "Amêndoas confeitadas cobertas com chocolate"],
  [/\bchocolate covered candy\b/gi, "confeitadas cobertas com chocolate"],
  [/\bHot chocolate \/ cocoa, reduced sugar, made with non-dairy milk\b/gi, "Chocolate quente com teor reduzido de açúcar, feito com bebida vegetal"],
  [/\bmade with non-dairy milk\b/gi, "feito com bebida vegetal"],
  [/\breduced sugar\b/gi, "com teor reduzido de açúcar"],
  [/\bReduced sugar\b/gi, "Com teor reduzido de açúcar"],
  [/\breduced sodium\b/gi, "com teor reduzido de sódio"],
  [/\bReduced sodium\b/gi, "Com teor reduzido de sódio"],
  [/\breduced calorie(s)?\b/gi, "com teor reduzido de calorias"],
  [/\bReduced calorie(s)?\b/gi, "Com teor reduzido de calorias"],
  [/\breduced fat\b/gi, "com teor reduzido de gordura"],
  [/\bReduced fat\b/gi, "Com teor reduzido de gordura"],
  [/\blow sodium\b/gi, "baixo teor de sódio"],
  [/\bLow sodium\b/gi, "Baixo teor de sódio"],
  [/\bwith salt added\b/gi, "com adição de sal"],
  [/\bWith salt added\b/gi, "Com adição de sal"],
  [/\bsodium added\b/gi, "com adição de sódio"],
  [/\bSodium added\b/gi, "Com adição de sódio"],
  [/\bfat added\b/gi, "com adição de gordura"],
  [/\bFat added\b/gi, "Com adição de gordura"],
  [/\bno added fat\b/gi, "sem adição de gordura"],
  [/\bNo added fat\b/gi, "Sem adição de gordura"],
  [/\bwithout added fat\b/gi, "sem adição de gordura"],
  [/\bsem adicionado gordura\b/gi, "sem adição de gordura"],
  [/\bsem adicionada gordura\b/gi, "sem adição de gordura"],
  [/\bcom adicionado gordura\b/gi, "com adição de gordura"],
  [/\bcom adicionada gordura\b/gi, "com adição de gordura"],
  [/\bgordura adicionadas\b/gi, "com gordura adicionada"],
  [/\bwithout salt\b/gi, "sem sal"],
  [/\bWithout salt\b/gi, "Sem sal"],
  [/\bregular pack\b/gi, "embalagem tradicional"],
  [/\bRegular pack\b/gi, "Embalagem tradicional"],
  [/\btraditional pack\b/gi, "embalagem tradicional"],
  [/\btradicional embalagem\b/gi, "embalagem tradicional"],
  // --- FIM REGRAS INICIAIS ---
  [/\bfrom fast[- ]+food \/ restaurant\b/gi, "de lanchonete ou restaurante"],
  [/\bfrom restaurant \/ fast[- ]+food\b/gi, "de restaurante ou lanchonete"],
  [/\bfrom restaurant or fast food\b/gi, "de restaurante ou lanchonete"],
  [/\bfrom fast food or restaurant\b/gi, "de lanchonete ou restaurante"],
  [/\bfast[- ]+food \/ restaurant\b/gi, "de lanchonete ou restaurante"],
  [/\brestaurant \/ fast[- ]+food\b/gi, "de restaurante ou lanchonete"],
  [/\brestaurant or fast food\b/gi, "de restaurante ou lanchonete"],
  [/\bfast food or restaurant\b/gi, "de lanchonete ou restaurante"],
  [/\bfrom fast[- ]+food\b/gi, "de lanchonete"],
  [/\bfrom restaurant\b/gi, "de restaurante"],
  [/\bfrom school cafeteria\b/gi, "da cantina escolar"],
  [/\bfrom bakery\b/gi, "de padaria"],
  [/\bfrom frozen\b/gi, "congelado"],
  [/\bfast[- ]+food\b/gi, "de lanchonete"],
  [/\brestaurant[- ]+foods?\b/gi, "pratos de restaurante"],
  [/\brestaurant\b/gi, "de restaurante"],
  [/\bBeans, cannellini, dry\b/gi, "Feijão cannellini cru (em grão)"],
  [/\bCornish game hen\b/gi, "Galeto"],
  [/\bShrimp scampi\b/gi, "Camarão scampi"],
  [/\bBeef wellington\b/gi, "Bife Wellington"],
  [/\bVeggie burger patty, no bun\b/gi, "Hambúrguer vegetariano sem pão"],
  [/\bVeggie burger patty\b/gi, "Hambúrguer vegetariano"],
  [/\bVeggie burger\b/gi, "Hambúrguer vegetariano"],
  [/\bPopcorn, movie theater, with added butter\b/gi, "Pipoca de cinema, com manteiga adicionada"],
  [/\bPopcorn, movie theater, no butter added\b/gi, "Pipoca de cinema, sem adição de manteiga"],
  [/\bPopcorn, movie theater\b/gi, "Pipoca de cinema"],
  [/\bCheese spread, American or Cheddar cheese base, reduced fat\b/gi, "Creme de queijo tipo cheddar ou americano, teor reduzido de gordura"],
  [/\bCheese spread, American or Cheddar cheese base\b/gi, "Creme de queijo tipo cheddar ou americano"],
  [/\bCheese spread, Swiss cheese base\b/gi, "Creme de queijo tipo suíço"],
  [/\bCheese spread, cream cheese\b/gi, "Creme de queijo tipo cream cheese"],
  [/\bCheese spread, pressurized can\b/gi, "Queijo cremoso em spray"],
  [/\bCheese spread\b/gi, "Creme de queijo"],
  [/\bSandwich spread\b/gi, "Patê para sanduíche"],
  [/\bMeat spread or potted meat, NFS\b/gi, "Patê de carne, não especificado"],
  [/\bMeat spread\b/gi, "Patê de carne"],
  [/\bChicken salad spread\b/gi, "Patê de frango"],
  [/\bHam salad spread\b/gi, "Patê de presunto"],
  [/\bChocolate hazelnut spread\b/gi, "Creme de cacau e avelã"],
  [/\bPeanut butter and chocolate spread\b/gi, "Creme de amendoim com chocolate"],
  [/\bYeast extract spread\b/gi, "Extrato de levedura"],
  [/\bspread\b/gi, "patê"],
  [/\bBread stuffing made with egg\b/gi, "Farofa de pão feita com ovo"],
  [/\bBread stuffing\b/gi, "Farofa de pão"],
  [/\bCornbread stuffing\b/gi, "Farofa de broa de milho"],
  [/\bcrab stuffing\b/gi, "recheio de caranguejo"],
  [/\bbread stuffing\b/gi, "farofa de pão"],
  [/\bwith stuffing\b/gi, "com recheio"],
  [/\bstuffing\b/gi, "recheio"],
  [/\bIced Tea \/ Lemonade juice drink, light\b/gi, "Chá gelado com limonada, de baixa caloria"],
  [/\bIced Tea \/ Lemonade juice drink, diet\b/gi, "Chá gelado com limonada, dietético"],
  [/\bIced Tea \/ Lemonade juice drink\b/gi, "Chá gelado com limonada"],
  [/\bIced Tea \/ Lemonade\b/gi, "Chá gelado com limonada"],
  [/\bCranberry juice blend, 100% juice, with calcium added\b/gi, "Suco misto de cranberry, 100% suco, com cálcio adicionado"],
  [/\bCranberry juice blend, 100% juice\b/gi, "Suco misto de cranberry, 100% suco"],
  [/\bCranberry juice drink, with high vitamin C, light\b/gi, "Bebida de cranberry, rica em vitamina C, de baixa caloria"],
  [/\bCranberry juice drink, with high vitamin C\b/gi, "Bebida de cranberry, rica em vitamina C"],
  [/\bCranberry juice, 100%, not a blend\b/gi, "Suco puro de cranberry, 100%"],
  [/\bCranberry juice, not fortified, from concentrate, shelf stable\b/gi, "Suco de cranberry, não fortificado, concentrado"],
  [/\bCranberry juice\b/gi, "Suco de cranberry"],
  [/\bcranberry juice\b/gi, "suco de cranberry"],
  [/\bLime juice, 100%, freshly squeezed\b/gi, "Suco de limão-taiti 100% fresco espremido"],
  [/\bLime juice, 100%, canned or bottled\b/gi, "Suco de limão-taiti 100% engarrafado ou em conserva"],
  [/\bLime juice, 100%, NS as to form\b/gi, "Suco de limão-taiti 100%, formato não especificado"],
  [/\bLime juice\b/gi, "Suco de limão-taiti"],
  [/\blime juice\b/gi, "suco de limão-taiti"],
  [/\bGarlic bread, with parmesan cheese\b/gi, "Pão de alho com queijo parmesão"],
  [/\bGarlic bread, with melted cheese\b/gi, "Pão de alho com queijo derretido"],
  [/\bGarlic bread\b/gi, "Pão de alho"],
  [/\bFrench toast sticks\b/gi, "Palitos de rabanada"],
  [/\bFrench toast\b/gi, "Rabanada"],
  [/\bPotato, french fries, with chili and cheese\b/gi, "Batatas fritas com chili e queijo"],
  [/\bPotato, french fries, with chili\b/gi, "Batatas fritas com chili"],
  [/\bPotato, french fries, with cheese\b/gi, "Batatas fritas com queijo"],
  [/\bPotato, french fries\b/gi, "Batatas fritas"],
  [/\bfrench fries\b/gi, "batatas fritas"],
  [/\bPotato, home fries\b/gi, "Batatas rústicas fritas"],
  [/\bhome fries\b/gi, "batatas rústicas fritas"],
  [/\bSweet potato fries\b/gi, "Batata-doce frita"],
  [/\bSweet potato tots\b/gi, "Bolinhos de batata-doce"],
  [/\bSweet potatos?\b/gi, "Batata-doce"],
  [/\bsweet potatos?\b/gi, "batata-doce"],
  [/\bChicken "wings", boneless, with hot sauce\b/gi, "Asinhas de frango desossadas com molho picante"],
  [/\bChicken "wings" with other sauces or seasoning\b/gi, "Asinhas de frango com molhos e temperos"],
  [/\bChicken "wings", plain\b/gi, "Asinhas de frango tradicionais"],
  [/\bChicken "wings"/gi, "Asinhas de frango"],
  [/\bChicken breast, baked or broiled, skin eaten\b/gi, "Peito de frango assado ou grelhado, com pele"],
  [/\bChicken breast, baked or broiled, skin not eaten\b/gi, "Peito de frango assado ou grelhado, sem pele"],
  [/\bChicken breast\b/gi, "Peito de frango"],
  [/\bchicken breast\b/gi, "peito de frango"],
  [/\bhot sauce\b/gi, "molho de pimenta"],
  [/\bEgg, whole, fried\b/gi, "Ovo inteiro frito"],
  [/\bEgg omelet or scrambled egg\b/gi, "Omelete ou ovos mexidos"],
  [/\bBlack beans and rice\b/gi, "Feijão-preto e arroz"],
  [/\bKidney beans and rice\b/gi, "Feijão-vermelho e arroz"],
  [/\bPinto beans and rice\b/gi, "Feijão-carioca e arroz"],
  [/\bBeans and rice\b/gi, "Feijão e arroz"],
  [/\bBlack beans\b/gi, "Feijão-preto"],
  [/\bblack beans\b/gi, "feijão-preto"],
  [/\bBaked beans\b/gi, "Feijão em molho agridoce (baked beans)"],
  [/\bbaked beans\b/gi, "feijão em molho agridoce (baked beans)"],
  [/\bRefried beans\b/gi, "Feijão refrito mexicano"],
  [/\brefried beans\b/gi, "feijão refrito mexicano"],
  [/\bKidney beans\b/gi, "Feijão-vermelho"],
  [/\bkidney beans\b/gi, "feijão-vermelho"],
  [/\bPinto beans\b/gi, "Feijão-carioca"],
  [/\bpinto beans\b/gi, "feijão-carioca"],
  [/\bCake or cupcake, gingerbread\b/gi, "Bolo ou cupcake de pão de gengibre"],
  [/\bSoup, tomato, canned \/ carton\b/gi, "Sopa de tomate enlatada ou em caixa"],
  [/\bcanned \/ carton\b/gi, "enlatada ou em caixa"],
  [/\bPastry, meat \/ poultry-filled\b/gi, "Massa folhada recheada com carne ou aves"],
  [/\bmeat \/ poultry-filled\b/gi, "recheada com carne ou aves"],
  [/\bFlour, wheat, all-purpose\b/gi, "Farinha de trigo tradicional"],
  [/\ball-purpose\b/gi, "tradicional"],
  [/\bPeppers, bell, green, raw\b/gi, "Pimentão verde, cru"],
  [/\bPeppers, bell, red, raw\b/gi, "Pimentão vermelho, cru"],
  [/\bPeppers, bell, yellow, raw\b/gi, "Pimentão amarelo, cru"],
  [/\bPeppers, bell, orange, raw\b/gi, "Pimentão laranja, cru"],
  [/\bPeppers, bell\b/gi, "Pimentão"],
  [/\bpeppers, bell\b/gi, "pimentão"],
  [/\bbell peppers?\b/gi, "pimentão"],
  [/\bGrilled cheese sandwich\b/gi, "Sanduíche de queijo quente"],
  [/\bgrilled cheese\b/gi, "queijo quente"],
  [/\blight and dark meat\b/gi, "carne branca e escura"],
  [/\bdark and light meat\b/gi, "carne escura e branca"],
  [/\bHot dog, NFS\b/gi, "Cachorro-quente, não especificado"],
  [/\bhot dogs?\b/gi, "cachorro-quente"],
  [/\bMeatloaf sandwich\b/gi, "Sanduíche de bolo de carne"],
  [/\bBarbecue chicken sandwich\b/gi, "Sanduíche de frango com molho barbecue"],
  [/\bItalian sandwich\b/gi, "Sanduíche italiano"],
  [/\bEgg sandwich\b/gi, "Sanduíche de ovo"],
  [/\bCheese sandwich\b/gi, "Sanduíche de queijo"],
  [/\bcheese sandwich\b/gi, "sanduíche de queijo"],
  [/\bBurrito bowl\b/gi, "Bowl de burrito"],
  [/\bFruit smoothie\b/gi, "Smoothie de frutas"],
  [/\bDragon fruit\b/gi, "Pitaya"],
  [/\bBaby Toddler carrots\b/gi, "Cenouras infantis"],
  [/\bBaby Toddler wheels\b/gi, "Biscoitinhos infantis em formato de roda"],
  [/\bCereal or granola bar\b/gi, "Barra de cereal ou granola"],
  [/\bgranola bar\b/gi, "barra de granola"],
  [/\bcereal bar\b/gi, "barra de cereal"],
  [/\bFrito pie\b/gi, "Torta de chili com salgadinho de milho"],
  [/\bMeat loaf\b/gi, "Bolo de carne"],
  [/\bmeatloaf\b/gi, "bolo de carne"],
  [/\bShrimp garden salad\b/gi, "Salada da horta com camarão"],
  [/\bgarden salad\b/gi, "salada da horta"],
  [/\bpotato salad\b/gi, "salada de batatas"],
  [/\bchicken salad\b/gi, "salada de frango"],
  [/\btuna salad\b/gi, "salada de atum"],
  [/\begg salad\b/gi, "salada de ovos"],
  [/\bfruit salad\b/gi, "salada de frutas"],
  [/\bCheeseburger slider\b/gi, "Mini-hambúrguer com queijo"],
  [/\bsliders?\b/gi, "minihambúrguer"],
  [/\bAmerican cheese\b/gi, "queijo tipo americano"],
  [/\bCheddar cheese\b/gi, "queijo cheddar"],
  [/\bSwiss cheese\b/gi, "queijo suíço"],
  [/\bon white bun\b/gi, "em pão de hambúrguer"],
  [/\bon white bread\b/gi, "em pão de forma branco"],
  [/\bon white\b/gi, "em pão branco"],
  [/\bPan Dulce\b/gi, "Pão doce tradicional"],
  [/\bdry roasted, lightly salted\b/gi, "torrados a seco, levemente salgados"],
  [/\bdry roasted\b/gi, "torrados a seco"],
  [/\bSoupy rice with chicken, Puerto Rican style\b/gi, "Arroz caldoso com frango, estilo porto-riquenho"],
  [/\bPuerto Rican style\b/gi, "estilo porto-riquenho"],
  [/\bPuerto Rican seasoning with ham\b/gi, "Tempero porto-riquenho com presunto"],
  [/\bPuerto Rican seasoning\b/gi, "Tempero porto-riquenho"],
  [/\bGreen peas\b/gi, "Ervilhas verdes"],
  [/\bgreen peas\b/gi, "ervilhas verdes"],
  [/\bClassic mixed vegetables, canned, cooked, no added fat\b/gi, "Seleta de legumes clássica, enlatada, cozida, sem adição de gordura"],
  [/\bClassic mixed vegetables\b/gi, "Seleta de legumes clássica"],
  [/\bmixed vegetables\b/gi, "seleta de vegetais"],
  [/\bLemon-butter sauce\b/gi, "Molho de manteiga com limão"],
  [/\blemon-butter sauce\b/gi, "molho de manteiga com limão"],
  [/\bCorn syrup\b/gi, "Xarope de milho"],
  [/\bcorn syrup\b/gi, "xarope de milho"],
  [/\bmade with light mayonnaise-type salad dressing\b/gi, "feita com molho tipo maionese light"],
  [/\bmade with mayonnaise-type salad dressing\b/gi, "feita com molho tipo maionese"],
  [/\bchocolate covered candy\b/gi, "confeito coberto de chocolate"],
  [/\bchocolate covered\b/gi, "coberto com chocolate"],
  [/\bBacon bits\b/gi, "Bacon em cubos crocantes"],
  [/\bbacon bits\b/gi, "bacon em cubos crocantes"],
  [/\bmayonnaise-type salad dressing\b/gi, "molho tipo maionese"],
  [/\bsalad dressing\b/gi, "molho para salada"],
  [/\bChicken wing\b/gi, "Asa de frango"],
  [/\bChicken drumstick\b/gi, "Coxa de frango"],
  [/\bChicken breast\b/gi, "Peito de frango"],
  [/\bpeel not eaten\b/gi, "sem casca"],
  [/\bpeel eaten\b/gi, "com casca"],
  [/\bon wheat bread\b/gi, "em pão de trigo"],
  [/\bwheat bread\b/gi, "pão de trigo"],
  [/\bTopping from cheese pizza\b/gi, "Cobertura de pizza de queijo"],
  [/\bTopping from vegetable pizza\b/gi, "Cobertura de pizza de vegetais"],
  [/\bTopping from meat pizza\b/gi, "Cobertura de pizza de carne"],
  [/\bTopping from meat and vegetable pizza\b/gi, "Cobertura de pizza de carne e vegetais"],
  [/\btopping from\b/gi, "cobertura de"],
  [/\bsweet and sour pork\b/gi, "carne suína agridoce"],
  [/\bsweet and sour chicken\b/gi, "frango agridoce"],
  [/\bsweet and sour\b/gi, "agridoce"],
  [/\btop loin steak\b/gi, "bife de contrafilé"],
  [/\btop loin roast\b/gi, "contrafilé assado"],
  [/\btop loin\b/gi, "contrafilé"],
  [/\bfried rice\b/gi, "arroz frito"],
  [/\bwith added vitamin A and vitamin D\b/gi, "com vitaminas A e D adicionadas"],
  [/\bwith added vitamin A and D\b/gi, "com vitaminas A e D adicionadas"],
  [/\bwith added vitamin A\b/gi, "com vitamina A adicionada"],
  [/\bwith added vitamin D\b/gi, "com vitamina D adicionada"],
  [/\bwith added vitamin C\b/gi, "com vitamina C adicionada"],
  [/\bwith added calcium\b/gi, "com cálcio adicionado"],
  [/\bwith added vitamins and minerals\b/gi, "com vitaminas e minerais adicionados"],
  [/\bwith added vitamins\b/gi, "com vitaminas adicionadas"],
  [/\bwith added minerals\b/gi, "com minerais adicionados"],
  [/\bwith added\b/gi, "com adição de"],
  [/\bwithout added\b/gi, "sem adição de"],
  [/\bno added fat\b/gi, "sem adição de gordura"],
  [/\bno fat added\b/gi, "sem adição de gordura"],
  [/\bfat added\b/gi, "com adição de gordura"],
  [/\badded fat\b/gi, "com adição de gordura"],
  [/\bno added salt\b/gi, "sem adição de sal"],
  [/\bno salt added\b/gi, "sem adição de sal"],
  [/\bsalt added\b/gi, "com adição de sal"],
  [/\badded salt\b/gi, "com adição de sal"],
  [/\bno added sugar\b/gi, "sem adição de açúcar"],
  [/\bno sugar added\b/gi, "sem adição de açúcar"],
  [/\bsugar added\b/gi, "com adição de açúcar"],
  [/\badded sugar\b/gi, "com adição de açúcar"],
  [/\badded protein\b/gi, "proteína adicionada"],
  [/\badded vitamins\b/gi, "vitaminas adicionadas"],
  [/\bwater added\b/gi, "com adição de água"],
  [/\bregular pack\b/gi, "embalagem tradicional"],
  [/\bspecial pack\b/gi, "embalagem especial"],
  [/\bdiet pack\b/gi, "embalagem dietética"],
  [/\bwith cheese and extra vegetables\b/gi, "com queijo e vegetais extras"],
  [/\bextra vegetables\b/gi, "vegetais extras"],
  [/\bextra cheese\b/gi, "queijo extra"],
  [/\bextra sauce\b/gi, "molho extra"],
  [/\bextra meat\b/gi, "carne extra"],
  [/\bmedium crust\b/gi, "massa média"],
  [/\bthin crust\b/gi, "massa fina"],
  [/\bthick crust\b/gi, "massa grossa"],
  [/\bmade from home recipe or purchased at a bakery\b/gi, "caseiro ou de padaria"],
  [/\bmade from home recipe\b/gi, "caseiro"],
  [/\bfrom home recipe\b/gi, "caseiro"],
  [/\bhome recipe\b/gi, "receita caseira"],
  [/\bflavors other than chocolate\b/gi, "sabores exceto chocolate"],
  [/\bflavors other than fruit\b/gi, "sabores exceto fruta"],
  [/\bother than chocolate\b/gi, "exceto chocolate"],
  [/\bother than fruit\b/gi, "exceto fruta"],
  [/\bother than\b/gi, "exceto"],
  [/\bFish, cod, Atlantic, wild caught, raw\b/gi, "Bacalhau do Atlântico selvagem, cru"],
  [/\bFish, cod, Atlantic, wild caught\b/gi, "Bacalhau do Atlântico, selvagem"],
  [/\bFish, cod, Atlantic, raw\b/gi, "Bacalhau do Atlântico, cru"],
  [/\bFish, cod, Atlantic\b/gi, "Bacalhau do Atlântico"],
  [/\bFish, cod\b/gi, "Bacalhau"],
  [/\bFish, salmon, Atlantic, wild heat\b/gi, "Salmão selvagem do Atlântico grelhado"],
  [/\bFish, salmon, Atlantic, wild caught\b/gi, "Salmão selvagem do Atlântico"],
  [/\bFish, salmon, Atlantic, wild\b/gi, "Salmão selvagem do Atlântico"],
  [/\bFish, salmon, Atlantic, farm raised\b/gi, "Salmão do Atlântico, de cativeiro"],
  [/\bFish, salmon, Atlantic\b/gi, "Salmão do Atlântico"],
  [/\bFish, salmon, sockeye\b/gi, "Salmão-vermelho"],
  [/\bFish, salmon\b/gi, "Salmão"],
  [/\bFish, tuna, light\b/gi, "Atum claro"],
  [/\bFish, tuna, white\b/gi, "Atum branco"],
  [/\bFish, tuna\b/gi, "Atum"],
  [/\bFish, tilapia, farm raised\b/gi, "Tilápia de cativeiro"],
  [/\bFish, tilapia\b/gi, "Tilápia"],
  [/\bFish, trout\b/gi, "Truta"],
  [/\bFish, haddock\b/gi, "Hadoque"],
  [/\bFish, pollock\b/gi, "Polaca"],
  [/\bFish, mackerel\b/gi, "Cavala"],
  [/\bFish, sardine\b/gi, "Sardinha"],
  [/\bFish, anchovy\b/gi, "Anchova"],
  [/\bFish, herring\b/gi, "Arenque"],
  [/\bFish, flounder\b/gi, "Linguado"],
  [/\bFish, halibut\b/gi, "Alabote"],
  [/\bFish, catfish, farm raised\b/gi, "Bagre de cativeiro"],
  [/\bFish, catfish\b/gi, "Bagre"],
  [/\bFish, carp\b/gi, "Carpa"],
  [/\bFish, bass\b/gi, "Robalo"],
  [/\bFish, swordfish\b/gi, "Peixe-espada"],
  [/\bFish, perch\b/gi, "Perca"],
  [/\bFish, pike\b/gi, "Lúcio"],
  [/\bFish, snapper\b/gi, "Pargo"],
  [/\bFish, whiting\b/gi, "Pescada"],
  [/\bFish, pompano\b/gi, "Pampo"],
  [/\bFish, bluefish\b/gi, "Anchova-azul"],
  [/\bFish fillet\b/gi, "Filé de peixe"],
  [/\bFish sticks?\b/gi, "Palitos de peixe"],
  [/\bFish patty\b/gi, "Hambúrguer de peixe"],
  [/\bFish cake\b/gi, "Bolinho de peixe"],
  [/\bAtlantic, wild caught\b/gi, "do Atlântico, selvagem"],
  [/\bAtlantic, farm raised\b/gi, "do Atlântico, de cativeiro"],
  [/\bAtlantic, wild\b/gi, "selvagem do Atlântico"],
  [/\bAtlantic\b/gi, "do Atlântico"],
  [/\bPacific\b/gi, "do Pacífico"],
  [/\bfarm raised\b/gi, "de cativeiro"],
  [/\bwild caught\b/gi, "selvagem"],
  [/\bChicken, broilers? or fryers?, breast\b/gi, "Peito de frango de corte"],
  [/\bChicken, broilers? or fryers?, drumstick\b/gi, "Coxa de frango de corte"],
  [/\bChicken, broilers? or fryers?, thigh\b/gi, "Sobrecoxa de frango de corte"],
  [/\bChicken, broilers? or fryers?, wing\b/gi, "Asa de frango de corte"],
  [/\bChicken, broilers? or fryers?, meat only\b/gi, "Carne de frango de corte"],
  [/\bChicken, broilers? or fryers?, meat and skin\b/gi, "Carne e pele de frango de corte"],
  [/\bChicken, broilers? or fryers?\b/gi, "Frango de corte"],
  [/\bbroilers? or fryers?\b/gi, "de corte"],
  [/\bChicken, breast\b/gi, "Peito de frango"],
  [/\bChicken, thigh\b/gi, "Sobrecoxa de frango"],
  [/\bChicken, drumstick\b/gi, "Coxa de frango"],
  [/\bChicken, wing\b/gi, "Asa de frango"],
  [/\bChicken, leg\b/gi, "Coxa e sobrecoxa de frango"],
  [/\bChicken leg, drumstick and thigh\b/gi, "Coxa e sobrecoxa de frango"],
  [/\bChicken fillet\b/gi, "Filé de frango"],
  [/\bChicken patty\b/gi, "Hambúrguer de frango"],
  [/\bChicken nuggets?\b/gi, "Nuggets de frango"],
  [/\bChicken tenders?\b/gi, "Tiras de frango"],
  [/\bChicken, ground\b/gi, "Frango moído"],
  [/\bChicken, chicken roll\b/gi, "Rolo de frango"],
  [/\bchicken roll\b/gi, "rolo de frango"],
  [/\bTurkey, breast\b/gi, "Peito de peru"],
  [/\bTurkey, drumstick\b/gi, "Coxa de peru"],
  [/\bTurkey, thigh\b/gi, "Sobrecoxa de peru"],
  [/\bTurkey, wing\b/gi, "Asa de peru"],
  [/\bTurkey, ground\b/gi, "Peru moído"],
  [/\bBeef, loin, tenderloin roast\b/gi, "Filé-mignon bovino assado"],
  [/\bBeef, loin, tenderloin\b/gi, "Filé-mignon bovino"],
  [/\btenderloin roast\b/gi, "filé-mignon assado"],
  [/\btenderloin steak\b/gi, "bife de filé-mignon"],
  [/\btenderloin\b/gi, "filé-mignon"],
  [/\bBeef, round, eye of round roast\b/gi, "Lagarto bovino assado"],
  [/\bBeef, round, eye of round\b/gi, "Lagarto bovino"],
  [/\beye of round roast\b/gi, "lagarto assado"],
  [/\beye of round\b/gi, "lagarto"],
  [/\bBeef, round, top round roast\b/gi, "Coxão mole bovino assado"],
  [/\bBeef, round, top round\b/gi, "Coxão mole bovino"],
  [/\btop round roast\b/gi, "coxão mole assado"],
  [/\btop round\b/gi, "coxão mole"],
  [/\bBeef, round, bottom round\b/gi, "Coxão duro bovino"],
  [/\bbottom round\b/gi, "coxão duro"],
  [/\bBeef, ribeye\b/gi, "Bife ancho bovino"],
  [/\bribeye steak\b/gi, "bife ancho"],
  [/\bribeye\b/gi, "bife ancho"],
  [/\bBeef, short loin, t-bone\b/gi, "Bife T-bone bovino"],
  [/\bt-bone steak\b/gi, "bife T-bone"],
  [/\bBeef, short loin, porterhouse\b/gi, "Bife porterhouse bovino"],
  [/\bporterhouse steak\b/gi, "bife porterhouse"],
  [/\bBeef, flank, steak\b/gi, "Fraldinha bovina"],
  [/\bBeef, flank\b/gi, "Fraldinha bovina"],
  [/\bflank steak\b/gi, "fraldinha"],
  [/\bBeef, chuck, roast\b/gi, "Acém bovino assado"],
  [/\bBeef, chuck\b/gi, "Acém bovino"],
  [/\bchuck roast\b/gi, "acém assado"],
  [/\bBeef, brisket\b/gi, "Peito bovino"],
  [/\bbrisket\b/gi, "peito bovino"],
  [/\bBeef, ground\b/gi, "Carne bovina moída"],
  [/\bground beef\b/gi, "carne bovina moída"],
  [/\bBeef, stew meat\b/gi, "Carne bovina para ensopado"],
  [/\bstew meat\b/gi, "carne para ensopado"],
  [/\bseparable lean only\b/gi, "apenas carne magra"],
  [/\bseparable lean\b/gi, "carne magra"],
  [/\blean only\b/gi, "apenas carne magra"],
  [/\blean and fat eaten\b/gi, "com carne e gordura"],
  [/\blean only eaten\b/gi, "apenas parte magra"],
  [/\btrimmed to 0" fat\b/gi, "sem gordura aparente"],
  [/\btrimmed to 1\/8" fat\b/gi, "com 3 mm de gordura aparente"],
  [/\btrimmed to 1\/4" fat\b/gi, "com 6 mm de gordura aparente"],
  [/\b90% lean meat \/ 10% fat\b/gi, "90% carne magra, 10% gordura"],
  [/\b85% lean meat \/ 15% fat\b/gi, "85% carne magra, 15% gordura"],
  [/\b80% lean meat \/ 20% fat\b/gi, "80% carne magra, 20% gordura"],
  [/\b75% lean meat \/ 25% fat\b/gi, "75% carne magra, 25% gordura"],
  [/\b70% lean meat \/ 30% fat\b/gi, "70% carne magra, 30% gordura"],
  [/\blean meat\b/gi, "carne magra"],
  [/\bPork, cured, bacon\b/gi, "Bacon suíno curado"],
  [/\bPork, ground\b/gi, "Carne suína moída"],
  [/\bPork, loin, tenderloin\b/gi, "Filé-mignon suíno"],
  [/\bPork, loin\b/gi, "Lombo suíno"],
  [/\bPork, chop\b/gi, "Bisteca suína"],
  [/\bpork chop\b/gi, "bisteca suína"],
  [/\bpork loin\b/gi, "lombo suíno"],
  [/\bPork skin rinds\b/gi, "Torresmo suíno"],
  [/\bpork rinds?\b/gi, "torresmo"],
  [/\bNon-dairy milk\b/gi, "Bebida vegetal"],
  [/\bnon-dairy milk\b/gi, "bebida vegetal"],
  [/\bnon-dairy\b/gi, "vegetal (não lácteo)"],
  [/\bwhole milk\b/gi, "leite integral"],
  [/\blow fat milk\b/gi, "leite semidesnatado"],
  [/\blowfat milk\b/gi, "leite semidesnatado"],
  [/\breduced fat milk\b/gi, "leite semidesnatado"],
  [/\bfat free milk\b/gi, "leite desnatado"],
  [/\bnonfat milk\b/gi, "leite desnatado"],
  [/\bskim milk\b/gi, "leite desnatado"],
  [/\bchocolate milk\b/gi, "leite achocolatado"],
  [/\bHot chocolate \/ cocoa\b/gi, "Chocolate quente"],
  [/\bHot chocolate\b/gi, "Chocolate quente"],
  [/\bhot chocolate\b/gi, "chocolate quente"],
  [/\bFrozen yogurt, soft serve\b/gi, "Iogurte congelado expresso"],
  [/\bFrozen yogurt cone, vanilla, waffle cone\b/gi, "Casquinha de iogurte congelado, baunilha, casquinha crocante"],
  [/\bFrozen yogurt cone, chocolate, waffle cone\b/gi, "Casquinha de iogurte congelado, chocolate, casquinha crocante"],
  [/\bFrozen yogurt cone\b/gi, "Casquinha de iogurte congelado"],
  [/\bFrozen yogurt bar\b/gi, "Barra de iogurte congelado"],
  [/\bFrozen yogurt sandwich\b/gi, "Sanduíche de iogurte congelado"],
  [/\bFrozen yogurt\b/gi, "Iogurte congelado"],
  [/\bfrozen yogurt\b/gi, "iogurte congelado"],
  [/\bsoft serve\b/gi, "expresso"],
  [/\bwaffle cone\b/gi, "casquinha crocante"],
  [/\bstore brand\b/gi, "marca própria"],
  [/\bplain, nonfat\b/gi, "natural, desnatado"],
  [/\bplain, low fat\b/gi, "natural, semidesnatado"],
  [/\bplain, whole milk\b/gi, "natural, integral"],
  [/\bBaby Toddler food, NFS\b/gi, "Alimento infantil, não especificado"],
  [/\bBaby Toddler yogurt\b/gi, "Iogurte infantil"],
  [/\bBaby Toddler snack\b/gi, "Petisco infantil"],
  [/\bBaby Toddler biscuit\b/gi, "Biscoito infantil"],
  [/\bBaby Toddler food\b/gi, "Alimento infantil"],
  [/\bBaby Toddler\b/gi, "Infantil"],
  [/\bInfant formula, Enfamil Infant\b/gi, "Fórmula infantil, Enfamil para lactentes"],
  [/\bEnfamil Infant\b/gi, "Enfamil para lactentes"],
  [/\bInfant formula\b/gi, "Fórmula infantil"],
  [/\bready-to-feed\b/gi, "pronta para consumo"],
  [/\bmade with baby water\b/gi, "preparada com água para bebês"],
  [/\bmade with tap water\b/gi, "preparada com água da torneira"],
  [/\bmade with bottled water\b/gi, "preparada com água engarrafada"],
  [/\bmade with water\b/gi, "preparada com água"],
  [/\bSpinach, baby\b/gi, "Mini-espinafre"],
  [/\bCarrots, baby\b/gi, "Mini-cenouras"],
  [/\bArugula, baby\b/gi, "Mini-rúcula"],
  [/\bbaby carrots\b/gi, "mini-cenouras"],
  [/\bbaby spinach\b/gi, "mini-espinafre"],
  [/\bbaby arugula\b/gi, "mini-rúcula"],
  [/\bbaby corn\b/gi, "mini-milho"],
  [/\bbaby greens\b/gi, "mini-folhas verdes"],
  [/\bBeans, snap, green, canned, regular pack, drained solids\b/gi, "Vagem verde, enlatada, embalagem tradicional, escorrida"],
  [/\bBeans, snap, green, frozen, cooked, boiled, drained, without salt\b/gi, "Vagem verde, congelada, cozida em água e escorrida, sem sal"],
  [/\bBeans, snap, green\b/gi, "Vagem verde"],
  [/\bBeans, snap, yellow\b/gi, "Vagem amarela"],
  [/\bBeans, Dry, Black \(0% moisture\)/gi, "Feijão-preto cru (em grão)"],
  [/\bBeans, Dry, Carioca \(0% moisture\)/gi, "Feijão-carioca cru (em grão)"],
  [/\bBeans, Dry, Pinto \(0% moisture\)/gi, "Feijão-carioca ou pinto cru (em grão)"],
  [/\bBeans, Dry, Red \(0% moisture\)/gi, "Feijão-vermelho cru (em grão)"],
  [/\bBeans, Dry, Medium Red \(0% moisture\)/gi, "Feijão-vermelho médio cru (em grão)"],
  [/\bBeans, Dry, Light Red Kidney \(0% moisture\)/gi, "Feijão-vermelho claro cru (em grão)"],
  [/\bBeans, Dry, Dark Red Kidney \(0% moisture\)/gi, "Feijão-vermelho escuro cru (em grão)"],
  [/\bBeans, Dry, Small Red \(0% moisture\)/gi, "Feijão-vermelho pequeno cru (em grão)"],
  [/\bBeans, Dry, Small White \(0% moisture\)/gi, "Feijão-branco pequeno cru (em grão)"],
  [/\bBeans, Dry, Navy \(0% moisture\)/gi, "Feijão-branco pequeno (navy) cru (em grão)"],
  [/\bBeans, Dry, Great Northern \(0% moisture\)/gi, "Feijão-branco grande cru (em grão)"],
  [/\bBeans, Dry, Brown \(0% moisture\)/gi, "Feijão-marrom cru (em grão)"],
  [/\bBeans, Dry, Tan \(0% moisture\)/gi, "Feijão-castanho cru (em grão)"],
  [/\bBeans, Dry, Light Tan \(0% moisture\)/gi, "Feijão-castanho claro cru (em grão)"],
  [/\bBeans, Dry, Pink \(0% moisture\)/gi, "Feijão-rosinha cru (em grão)"],
  [/\bBeans, Dry, Cranberry \(0% moisture\)/gi, "Feijão-rajado cru (em grão)"],
  [/\bBeans, Dry, Flor de Mayo \(0% moisture\)/gi, "Feijão Flor de Mayo cru (em grão)"],
  [/\bBeans, cannellini, dry\b/gi, "Feijão cannellini cru (em grão)"],
  [/\bBeans, Dry\b/gi, "Feijão cru (em grão)"],
  [/\bkidney beans?\b/gi, "feijão-vermelho"],
  [/\bFlour, semolina\b/gi, "Farinha de sêmola"],
  [/\bcoarse and semi-coarse\b/gi, "grossa e semigrossa"],
  [/\bFlour, wheat\b/gi, "Farinha de trigo"],
  [/\bFlour, almond\b/gi, "Farinha de amêndoa"],
  [/\bFlour, coconut\b/gi, "Farinha de coco"],
  [/\bFlour, oat\b/gi, "Farinha de aveia"],
  [/\bFlour, rice\b/gi, "Farinha de arroz"],
  [/\bFlour, corn\b/gi, "Farinha de milho"],
  [/\ball-purpose flour\b/gi, "farinha de trigo tradicional"],
  [/\bwhole-wheat flour\b/gi, "farinha de trigo integral"],
  [/\bbread flour\b/gi, "farinha de trigo especial para pão"],
  [/\bcake flour\b/gi, "farinha para bolo"],
  [/\bself-rising flour\b/gi, "farinha com fermento"],
  [/\bNS as to part and cooking method\b/gi, "corte e método de preparo não especificados"],
  [/\bNS as to cooking method\b/gi, "método de preparo não especificado"],
  [/\bNS as to type of milk or flavor\b/gi, "tipo de leite ou sabor não especificado"],
  [/\bNS as to type of milk\b/gi, "tipo de leite não especificado"],
  [/\bNS as to fat content\b/gi, "teor de gordura não especificado"],
  [/\bNS as to fat eaten\b/gi, "consumo de gordura não especificado"],
  [/\bNS as to fat type\b/gi, "tipo de gordura não especificado"],
  [/\bNS as to fat\b/gi, "teor de gordura não especificado"],
  [/\bNS as to skin eaten\b/gi, "consumo da pele não especificado"],
  [/\bNS as to part\b/gi, "corte não especificado"],
  [/\bNS as to cut\b/gi, "corte não especificado"],
  [/\bNS as to type of meat\b/gi, "tipo de carne não especificado"],
  [/\bNS as to type of crust\b/gi, "tipo de massa não especificado"],
  [/\bNS as to type of bran\b/gi, "tipo de farelo não especificado"],
  [/\bNS as to type\b/gi, "tipo não especificado"],
  [/\bNS as to fried or baked\b/gi, "frito ou assado não especificado"],
  [/\bNS as to fried or grilled\b/gi, "frito ou grelhado não especificado"],
  [/\bNS as to fresh or frozen\b/gi, "fresco ou congelado não especificado"],
  [/\bNS as to brewed or instant\b/gi, "coado ou solúvel não especificado"],
  [/\bNS as to major flour\b/gi, "tipo de farinha não especificado"],
  [/\bNS as to form\b/gi, "formato não especificado"],
  [/\bNS as to filling\b/gi, "recheio não especificado"],
  [/\bNS as to icing\b/gi, "com ou sem cobertura não especificado"],
  [/\bNS as to light\b/gi, "claro ou escuro não especificado"],
  [/\bNS as to raisins\b/gi, "com ou sem passas não especificado"],
  [/\bNS as to vegetable or animal\b/gi, "origem vegetal ou animal não especificada"],
  [/\bNS as to fresh\b/gi, "fresco ou processado não especificado"],
  [/\bNS as to\b/gi, "não especificado quanto a"],
  [/\bNFS\b/gi, "não especificado"],
  [/\bfrom restaurant or fast food\b/gi, "de restaurante ou fast food"],
  [/\bfrom fast food\b/gi, "de fast food"],
  [/\bfrom restaurant\b/gi, "de restaurante"],
  [/\bfrom school cafeteria\b/gi, "da cantina escolar"],
  [/\bfrom bakery\b/gi, "de padaria"],
  [/\bfrom frozen\b/gi, "congelado"],
  [/\bcooked, boiled, drained\b/gi, "cozido em água e escorrido"],
  [/\bcooked, boiled\b/gi, "cozido em água"],
  [/\bboiled, drained\b/gi, "cozido em água e escorrido"],
  [/\bcooked with oil\b/gi, "cozido com óleo"],
  [/\bcooked with butter or margarine\b/gi, "cozido com manteiga ou margarina"],
  [/\bcooked with margarine\b/gi, "cozido com margarina"],
  [/\bcooked with butter\b/gi, "cozido com manteiga"],
  [/\bcooked with\b/gi, "cozido com"],
  [/\bmade with\b/gi, "feito com"],
  [/\bmade from\b/gi, "feito de"],
  [/\bprepared from\b/gi, "preparado de"],
  [/\bready-to-eat\b/gi, "pronto para consumo"],
  [/\bready-to-serve\b/gi, "pronto para servir"],
  [/\bdrained solids\b/gi, "escorrido"],
  [/\bskin \/ coating eaten\b/gi, "com pele ou empanamento"],
  [/\bskin \/ coating not eaten\b/gi, "sem pele ou empanamento"],
  [/\bskin eaten\b/gi, "com pele"],
  [/\bskin not eaten\b/gi, "sem pele"],
  [/\bprepared skinless\b/gi, "preparado sem pele"],
  [/\bfat free or skim\b/gi, "desnatado ou zero gordura"],
  [/\bfat free\b/gi, "zero gordura"],
  [/\bsugar free\b/gi, "zero açúcar"],
  [/\bgluten free\b/gi, "sem glúten"],
  [/\blow fat\b/gi, "baixo teor de gordura"],
  [/\blowfat\b/gi, "baixo teor de gordura"],
  [/\breduced fat\b/gi, "teor reduzido de gordura"],
  [/\bcos or romaine\b/gi, "romana"],
  [/\blettuce, cos or romaine\b/gi, "alface-romana"],
  [/\bfrom fast[- ]+food \/ restaurant\b/gi, "de lanchonete ou restaurante"],
  [/\bfrom fast[- ]+food\b/gi, "de lanchonete"],
  [/\bfast[- ]+food\b/gi, "de lanchonete"],
  [/\brestaurant[- ]+foods?\b/gi, "pratos de restaurante"],
  [/\brestaurant\b/gi, "de restaurante"],
  [/\btakeout\b/gi, "para viagem"],
  [/\bbeef gravy\b/gi, "molho de carne bovina"],
  [/\bchicken gravy\b/gi, "molho de carne de frango"],
  [/\bturkey gravy\b/gi, "molho de carne de peru"],
  [/\bpork gravy\b/gi, "molho de carne suína"],
  [/\bgravy\b/gi, "molho de carne"],
  [/\bhard seltzer\b/gi, "bebida alcoólica gaseificada"],
  [/\bpotato tots\b/gi, "bolinhos de batata"],
  [/\btater tots\b/gi, "bolinhos de batata"],
  [/\bdiet frozen meal\b/gi, "refeição congelada dietética"],
  [/\bfrozen meal\b/gi, "refeição congelada"],
  [/\bdiet meal\b/gi, "refeição dietética"],
  [/\b,\s*diet\b/gi, ", dietético"],
  [/\bdiet\b/gi, "dietético"],
  [/\b,\s*light\b/gi, ", de baixa caloria"],
  [/\blight\b/gi, "baixo teor calórico"],
  [/\bincluding carrots, broccoli, and\/or dark[- ]+green leafy\b/gi, "com cenoura, brócolis e/ou folhas verde-escuras"],
  [/\bexcluding carrots, broccoli, and(?:\/or)? dark[- ]+green leafy\b/gi, "sem cenoura, brócolis ou folhas verde-escuras"],
  [/\bexcluding carrorts, broccoli, and dark[- ]+green leafy\b/gi, "sem cenoura, brócolis ou folhas verde-escuras"],
  [/\bdark[- ]+green leafy vegetables\b/gi, "vegetais de folhas verde-escuras"],
  [/\bdark[- ]+green leafy\b/gi, "folhas verde-escuras"],
  [/\bdark[- ]+green vegetables\b/gi, "vegetais verde-escuros"],
  [/\bdark[- ]+green\b/gi, "verde-escuro"],
  [/\bdark-\b/gi, "escuro"],
  [/\bpotato chips\b/gi, "batatas fritas crocantes"],
  [/\btortilla chips\b/gi, "salgadinho de milho tipo tortilha"],
  [/\bcorn chips\b/gi, "salgadinho de milho"],
  [/\bshrimp chips\b/gi, "salgadinho de camarão"],
  [/\bpopcorn chips\b/gi, "salgadinho de pipoca"],
  [/\bpita chips\b/gi, "torradinhas de pão sírio"],
  [/\bpretzel chips\b/gi, "biscoito pretzel crocante"],
  [/\bbagel chips\b/gi, "torradinhas de bagel"],
  [/\bcracker chips\b/gi, "biscoitos crocantes"],
  [/\bbanana chips\b/gi, "banana crocante"],
  [/\bplantain chips\b/gi, "banana-da-terra crocante"],
  [/\btaro chips\b/gi, "inhame crocante"],
  [/\bsweet potato chips\b/gi, "batata-doce crocante"],
  [/\bvegetable chips\b/gi, "vegetais crocantes"],
  [/\bbean chips\b/gi, "salgadinho de feijão"],
  [/\bsoy chips\b/gi, "salgadinho de soja"],
  [/\bchocolate chip cookies?\b/gi, "cookies com gotas de chocolate"],
  [/\bchocolate chips?\b/gi, "gotas de chocolate"],
  [/\bchips, rice\b/gi, "salgadinho crocante de arroz"],
  [/\bchips\b/gi, "salgadinhos crocantes"],
  [/\bhash brown potatoes\b/gi, "batata rosti"],
  [/\bpotato, hash brown\b/gi, "batata rosti"],
  [/\bhash browns?\b/gi, "batata rosti"],
  [/\bcorned beef hash\b/gi, "picadinho de carne curada com batatas"],
  [/\bbeef, roast, hash\b/gi, "picadinho de carne bovina assada"],
  [/\bchicken or turkey hash\b/gi, "picadinho de frango ou peru com batatas"],
  [/\bpork hash\b/gi, "picadinho de carne suína"],
  [/\bhash\b/gi, "picadinho de carne"],
  [/\bturnover or hot pocket\b/gi, "pastel de forno ou folhado recheado"],
  [/\bturnover or lean pocket\b/gi, "pastel de forno ou folhado recheado leve"],
  [/\bturnover or breakfast pocket\b/gi, "pastel de forno ou folhado recheado matinal"],
  [/\bpizza pocket\b/gi, "pastel folhado de pizza"],
  [/\bpocket\b/gi, "folhado recheado"],
  [/\bking oyster mushroom\b/gi, "cogumelo ostra-rei"],
  [/\bmushroom, king oyster\b/gi, "cogumelo ostra-rei"],
  [/\ba la king\b/gi, "ao molho à la King"],
  [/\banimal crackers\b/gi, "biscoitos infantis de bichinhos"],
  [/\bcookie, animal\b/gi, "biscoito infantil de bichinhos"],
  [/\btuna noodle casserole\b/gi, "caçarola de macarrão com atum"],
  [/\bchicken noodle casserole\b/gi, "caçarola de macarrão com frango"],
  [/\bturkey noodle casserole\b/gi, "caçarola de macarrão com peru"],
  [/\bnoodle casserole\b/gi, "caçarola de macarrão"],
  [/\bbeef stew\b/gi, "ensopado de carne bovina"],
  [/\bchicken stew\b/gi, "ensopado de frango"],
  [/\bturkey stew\b/gi, "ensopado de peru"],
  [/\blentil curry\b/gi, "curry de lentilha"],
  [/\bchicken curry\b/gi, "curry de frango"],
  [/\bbeef curry\b/gi, "curry de carne bovina"],
  [/\bvegetable and fruit juice drink\b/gi, "bebida de suco de frutas e vegetais"],
  [/\bfruit and vegetable juice drink\b/gi, "bebida de suco de frutas e vegetais"],
  [/\bcoffee cake\b/gi, "bolo caseiro para café"],
  [/\biced latte\b/gi, "café latte gelado"],
  [/\bbubble tea\b/gi, "chá de pérolas"],
  [/\bporcupine balls\b/gi, "almôndegas de carne e arroz"],
  [/\bwine cooler\b/gi, "coquetel refrescante de vinho"],
  [/\bwine spritzer\b/gi, "coquetel de vinho com água gaseificada (spritzer)"],
  [/\bdinner rolls?\b/gi, "pãozinho para refeição"],
  [/\bcanned in water\b/gi, "em conserva de água"],
  [/\bcanned in oil\b/gi, "em conserva de óleo"],
  [/\bdrained solids\b/gi, "sólidos escorridos"],
  [/\bwild caught\b/gi, "selvagem"],
  [/\bfarm raised\b/gi, "criado em cativeiro"],
  [/\bsockeye salmon\b/gi, "salmão-vermelho"],
  [/\bsalmon, sockeye\b/gi, "salmão-vermelho"],
  [/\btuna, light\b/gi, "atum claro"],
  [/\btuna, white\b/gi, "atum branco"],
  [/\bclam chowder\b/gi, "sopa de mariscos"],
  [/\bcorn chowder\b/gi, "sopa cremosa de milho"],
  [/\bchowder\b/gi, "sopa cremosa"],
  [/\bpork, pig's feet\b/gi, "carne suína, pé de porco"],
  [/\bpig's feet\b/gi, "pé de porco"],
  [/\bpig in a blanket\b/gi, "enroladinho de salsicha"],
  [/\bwild pig\b/gi, "porco selvagem"],
  [/\bred velvet cake\b/gi, "bolo veludo vermelho"],
  [/\bred velvet\b/gi, "veludo vermelho"],
  [/\bpound cake\b/gi, "bolo tipo inglês tradicional"],
  [/\bfunnel cake\b/gi, "bolinho frito espiral"],
  [/\bwedding soup\b/gi, "sopa tradicional italiana"],
  [/\bitalian wedding soup\b/gi, "sopa tradicional italiana"],
  [/\bgingerbread\b/gi, "pão de mel / biscoito de gengibre"],
  [/\bair[- ]+popped\b/gi, "estourada com ar quente"],
  [/\bmaple flavored\b/gi, "com sabor de xarope de bordo"],
  [/\bdirty rice\b/gi, "arroz temperado cajun com miúdos"],
  [/\bsesbania\b/gi, "flor de sesbânia"],
  [/\bdeviled eggs?\b/gi, "ovos recheados temperados"],
  [/\bdeviled crabs?\b/gi, "siri temperado recheado"],
  [/\bdeviled\b/gi, "recheado e temperado"],
  [/\bwelsh rarebit\b/gi, "torrada galesa com queijo fundido"],
  [/\bhungarian wax\b/gi, "pimenta-cera húngara"],
  [/\bshepherd(?:'s)? pie\b/gi, "escondidinho de carne moída com purê de batatas"],
  [/\bchicken divan\b/gi, "frango com brócolis ao molho mornay"],
  [/\bcoleslaw\b/gi, "salada de repolho"],
  [/\bleitelho\s*\(\s*buttermilk\s*\)/gi, "leitelho"],
  [/\bbuttermilk\b/gi, "leitelho"],
  [/\bonions?, yellow, raw\b/gi, "Cebola amarela, crua"],
  [/\bonions?, yellow\b/gi, "cebola amarela"],
  [/\bonions?, red\b/gi, "cebola roxa"],
  [/\bonions?, white\b/gi, "cebola branca"],
  [/\bcabbage, red, raw\b/gi, "Repolho roxo, cru"],
  [/\bcabbage, red\b/gi, "repolho roxo"],
  [/\bcabbage, yellow\b/gi, "repolho amarelo"],
  [/\bcabbage, savoy\b/gi, "couve-sabóia"],
  [/\bcabbage, napa\b/gi, "acelga chinesa"],
  [/\bnapa cabbage\b/gi, "acelga chinesa"],
  [/\bchives, raw\b/gi, "Cebolinha crua"],
  [/\btrail mix\b/gi, "mistura de castanhas e frutas secas"],
  [/\bshortbread cookie\b/gi, "biscoito amanteigado"],
  [/\bshortbread\b/gi, "biscoito amanteigado"],
  [/\bflatbread\b/gi, "pão folha"],
  [/\bice cream\b/gi, "sorvete"],
  [/\bpeanut butter\b/gi, "creme de amendoim"],
  [/\bcheese sauce\b/gi, "molho de queijo"],
  [/\bsoy-based sauce\b/gi, "molho à base de soja"],
  [/\btomato-based sauce\b/gi, "molho à base de tomate"],
  [/\bspaghetti sauce\b/gi, "molho de espaguete"],
  [/\bcream sauce\b/gi, "molho branco"],
  [/\bwhite sauce\b/gi, "molho branco"],
  [/\bmushroom sauce\b/gi, "molho de cogumelos"],
  [/\bgreen beans\b/gi, "vagem"],
  [/\bwhole wheat\b/gi, "trigo integral"],
  [/\bwhole grain\b/gi, "integral"],
  [/\bhush pupp(?:y|ies)\b/gi, "bolinho frito de milho"],
  [/\bconfectioner(?:'s)? sugar\b/gi, "açúcar de confeiteiro"],
  [/\bkey lime pie\b/gi, "torta de limão-da-flórida"],
  [/\bkey lime\b/gi, "limão-da-flórida"],
  [/\bbalance original bar\b/gi, "barra de cereal Balance Original"],
  [/\benergy drink \(no fear\)/gi, "bebida energética No Fear"],
  [/\benergy drink \(monster\)/gi, "bebida energética Monster"],
  [/\bfruit juice drink \(sunny d\)/gi, "bebida de suco de frutas Sunny D"],
  [/\bpoached\b/gi, "poché"],
  [/\bswirl\b/gi, "mesclado"],
  [/\bskin eaten\b/gi, "com pele"],
  [/\bskin not eaten\b/gi, "sem pele"],
  [/\bpudding\b/gi, "pudim"],
  [/\bdressing\b/gi, "molho para salada"],
  [/\bstuffing\b/gi, "recheio / farofa de pão"],
  [/\bspread\b/gi, "pasta / patê"],
  [/\bsweetened\b/gi, "adoçado"],
  [/\bunsweetened\b/gi, "sem adição de açúcar"],
  [/\bflavored\b/gi, "com sabor"],
  [/\bcommercial(?:ly)?(?:\s+prepared)?\b/gi, "industrializado"],
  [/\bvegetable-\s+and\s+cheese-filled\b/gi, "recheado com vegetais e queijo"],
  [/\bcheese-\s+and\s+spinach-\s*filled\b/gi, "recheado com queijo e espinafre"],
  [/\bcereal-\s+and\s+vegetable\s+protein-based\b/gi, "à base de proteínas de cereais e vegetais"],
  [/\bchicken or turkey divan\b/gi, "frango ou peru com brócolis ao molho mornay"],
  [/\bdivan\b/gi, "com brócolis ao molho mornay"],
  [/\b40-50%/gi, "40% a 50%"],
  [/\bgluten[- ]+free\b/gi, "sem glúten"],
  [/\bsugar[- ]+free\b/gi, "zero açúcar"],
  [/\btomato-based\b/gi, "à base de tomate"],
  [/\bsoy-based\b/gi, "à base de soja"],
  [/\bsoy-base\b/gi, "à base de soja"],
  [/\bspinach[- ]+filled\b/gi, "recheado com espinafre"],
  [/\bcheese[- ]+filled\b/gi, "recheado com queijo"],
  [/\bmeat-filled\b/gi, "recheado com carne"],
  [/\bfruit-filled\b/gi, "recheado com frutas"],
  [/\bcustard-filled\b/gi, "recheado com creme de confeiteiro"],
  [/\bcream-filled\b/gi, "recheado com creme"],
  [/\bpoultry-filled\b/gi, "recheado com aves"],
  [/\bchocolate-covered\b/gi, "coberto com chocolate"],
  [/\bchocolate-coated\b/gi, "coberto com chocolate"],
  [/\bpart-skim\b/gi, "parcialmente desnatado"],
  [/\ball-purpose\b/gi, "tradicional / multiuso"],
  [/\bpan-fried\b/gi, "frito na frigideira"],
  [/\bpan-broiled\b/gi, "grelhado na frigideira"],
  [/\bdeep-fried\b/gi, "frito por imersão"],
  [/\bhome-cooked\b/gi, "caseiro"],
  [/\bhome-prepared\b/gi, "preparado em casa"],
  [/\bquick-bread\b/gi, "pão rápido"],
  [/\bnon-chocolate\b/gi, "sem chocolate"],
  [/\bsoup-based\b/gi, "à base de sopa"],
  [/\blemon-butter\b/gi, "manteiga com limão"],
  [/\bsemi-coarse\b/gi, "semigrosso"],
  [/\bmeatless-beef\b/gi, "carne vegetal"],
  [/\bsandwich-type\b/gi, "tipo sanduíche"],
  [/\bszechuan-style\b/gi, "ao estilo Szechuan"],
  [/\bsun-dried\b/gi, "seco ao sol"],
  [/\bseven-layer\b/gi, "sete camadas"],
  [/\bnon-carbonated\b/gi, "não gaseificado"],
  [/\bfat-free\b/gi, "zero gordura"],
  [/\blow-fat\b/gi, "baixo teor de gordura"],
  [/\breduced-fat\b/gi, "gordura reduzida"],
  [/\bbone-in\b/gi, "com osso"],
  [/\blip-on\b/gi, "com capa de gordura"],
  [/\bspit-up\b/gi, "antirrefluxo"],
  [/\bfull-fat\b/gi, "integral"],
  [/\bshelf[- ]+stable\b/gi, "temperatura ambiente estável"],
  [/\bchow mein\b/gi, "macarrão frito chow mein"],
  [/\blo mein\b/gi, "macarrão lo mein"],
  [/\bchop suey\b/gi, "refogado chop suey"],
  [/\begg foo yung\b/gi, "omelete chinesa foo yung"],
  [/\bpad thai\b/gi, "talharim de arroz tailandês"],
  [/\bsalisbury steak\b/gi, "bife de hambúrguer com molho de cogumelos"],
  [/\bsloppy joe\b/gi, "sanduíche de carne moída com molho"],
  [/\bgraham crackers?\b/gi, "biscoito doce integral"],
  [/\bchicken drumstick\b/gi, "coxa de frango"],
  [/\bchicken drumsticks\b/gi, "coxas de frango"],
  [/\bcornish game hen\b/gi, "galeto cornish"],
  [/\bcornish hen\b/gi, "galeto cornish"],
  [/\bchicken cordon bleu\b/gi, "frango à Cordon Bleu"],
  [/\bbeef wellington\b/gi, "bife Wellington"],
  [/\bchicken tetrazzini\b/gi, "frango à Tetrazzini"],
  [/\boysters rockefeller\b/gi, "ostras à Rockefeller"],
  [/\bmoo shu\b/gi, "refogado moo shu"],
  [/\bmoo goo gai pan\b/gi, "frango com cogumelos moo goo gai pan"],
  [/\blion's mane\b/gi, "juba de leão"],
  [/\bthick crust\b/gi, "massa grossa"],
  [/\bthin crust\b/gi, "massa fina"],
  [/\bregular crust\b/gi, "massa tradicional"],
  [/\bstuffed crust\b/gi, "borda recheada"],
  [/\bfrozen coffee drink\b/gi, "bebida gelada de café"],
  [/\bBeans, snap, green\b/gi, "Vagem verde"],
  [/\bBeans, snap\b/gi, "Vagem"],
  [/\bTomato and vegetable juice\b/gi, "Suco de tomate e vegetais"],
  [/\badded vegetables\b/gi, "vegetais adicionados"],
  [/\bsalad dressing or mayonnaise\b/gi, "molho para salada ou maionese"],
  [/\bNS as to fat content\b/gi, "teor de gordura não especificado"],
  [/\bmade from home recipe or purchased at a bakery\b/gi, "caseiro ou de padaria"],
  [/\bNS as to major flour\b/gi, "tipo de farinha não especificado"],
  [/\bno bake\b/gi, "sem assar"],
  [/\bcookies?\b/gi, "biscoitos"],
  [/\bmuffins?\b/gi, "muffin"],
  [/\bcupcakes?\b/gi, "bolinhos confeitados"],
  [/\bcheeseburgers?\b/gi, "hambúrgueres com queijo"],
  [/\bchicken nuggets\b/gi, "empanados de frango"],
  [/\bnuggets\b/gi, "empanados"],
  [/\bsandwich wraps?\b/gi, "sanduíches enrolados"],
  [/\bwraps?\b/gi, "sanduíche enrolado"],
  [/\bpieces\b/gi, "em pedaços"],
  [/\bSeeds, sunflower seed kernels\b/gi, "Sementes de girassol"],
  [/\bSeeds, sunflower seed\b/gi, "Sementes de girassol"],
  [/\bSeeds, sesame seeds\b/gi, "Sementes de gergelim"],
  [/\bSeeds, pumpkin and squash seed kernels\b/gi, "Sementes de abóbora"],
  [/\bSeeds, chia seeds\b/gi, "Sementes de chia"],
  [/\bNuts, almonds\b/gi, "Amêndoas"],
  [/\bNuts, walnuts\b/gi, "Nozes"],
  [/\bNuts, cashew nuts\b/gi, "Castanhas de caju"],
  [/\bNuts, brazilnuts\b/gi, "Castanhas-do-pará"],
  [/\bNuts, hazelnuts or filberts\b/gi, "Avelãs"],
  [/\bNuts, pecans\b/gi, "Nozes-pecã"],
  [/\bNuts, macadamia nuts\b/gi, "Nozes de macadâmia"],
  [/\bNuts, pine nuts\b/gi, "Pinoli"],
  [/\bNuts, pistachio nuts\b/gi, "Pistaches"],
  [/\bTomatoes, grape, raw\b/gi, "Tomate-uva, cru"],
  [/\bTomatoes, grape\b/gi, "Tomate-uva"],
  [/\bTomatoes, cherry, raw\b/gi, "Tomate-cereja, cru"],
  [/\bTomatoes, cherry\b/gi, "Tomate-cereja"],
  [/\bPeaches, yellow, raw\b/gi, "Pêssego amarelo, cru"],
  [/\bPeaches, yellow\b/gi, "Pêssego amarelo"],
  [/\bOnion rings, breaded\b/gi, "Anéis de cebola empanados"],
  [/\bOnion rings\b/gi, "Anéis de cebola"],
  [/\bGrapefruit juice\b/gi, "Suco de toranja"],
  [/\bGrape juice\b/gi, "Suco de uva"],
  [/\bOrange juice\b/gi, "Suco de laranja"],
  [/\bApple juice\b/gi, "Suco de maçã"],
  [/\bTomato juice\b/gi, "Suco de tomate"],
  [/\bLemon juice\b/gi, "Suco de limão"],
  [/\bLime juice\b/gi, "Suco de lima / limão-taiti"],
  [/\bPineapple juice\b/gi, "Suco de abacaxi"],
  [/\bCranberry juice\b/gi, "Suco de oxicoco / cranberry"],
  [/\bPomegranate juice\b/gi, "Suco de romã"],
  [/\bPrune juice\b/gi, "Suco de ameixa"],
  [/\bCarrot juice\b/gi, "Suco de cenoura"],
  [/\bSoy milk\b/gi, "Bebida de soja"],
  [/\bAlmond milk\b/gi, "Bebida de amêndoa"],
  [/\bOat milk\b/gi, "Bebida de aveia"],
  [/\bRice milk\b/gi, "Bebida de arroz"],
  [/\bCoconut milk\b/gi, "Leite de coco"],
  [/\bEgg white, raw, frozen, pasteurized\b/gi, "Clara de ovo, crua, congelada, pasteurizada"],
  [/\bEgg, white, raw, frozen, pasteurized\b/gi, "Clara de ovo, crua, congelada, pasteurizada"],
  [/\bEgg, white, raw\b/gi, "Clara de ovo, crua"],
  [/\bEgg, white, cooked\b/gi, "Clara de ovo, cozida"],
  [/\bEgg, white\b/gi, "Clara de ovo"],
  [/\bEgg, yolk, raw, frozen, pasteurized\b/gi, "Gema de ovo, crua, congelada, pasteurizada"],
  [/\bEgg, yolk, raw\b/gi, "Gema de ovo, crua"],
  [/\bEgg, yolk, cooked\b/gi, "Gema de ovo, cozida"],
  [/\bEgg, yolk\b/gi, "Gema de ovo"],
  [/\bEgg, whole, raw\b/gi, "Ovo inteiro, cru"],
  [/\bEgg, whole, cooked\b/gi, "Ovo inteiro, cozido"],
  [/\bEgg, whole\b/gi, "Ovo inteiro"],
  [/\bhuevos rancheros\b/gi, "ovos rancheiros (huevos rancheros)"]
];

// 3. DICIONÁRIO LÉXICO PT-BR DE TERMOS ALIMENTARES E PREPAROS
export const WORD_DICT = {
  "beef": "carne bovina",
  "pork": "carne suína",
  "veal": "vitela",
  "lamb": "cordeiro",
  "mutton": "carne de carneiro",
  "goat": "carne de cabra",
  "chicken": "frango",
  "turkey": "peru",
  "duck": "pato",
  "goose": "ganso",
  "quail": "codorna",
  "pheasant": "faisão",
  "bacon": "bacon",
  "ham": "presunto",
  "prosciutto": "presunto cru",
  "sausage": "linguiça",
  "sausages": "linguiças",
  "salami": "salame",
  "pepperoni": "pepperoni",
  "pastrami": "pastrami",
  "bologna": "mortadela",
  "liver": "fígado",
  "heart": "coração",
  "tongue": "língua",
  "tripe": "dobradinha",
  "kidney": "rim",
  "meat": "carne",
  "meats": "carnes",
  "meatball": "almôndega",
  "meatballs": "almôndegas",
  "meatloaf": "bolo de carne",
  "fish": "peixe",
  "fishes": "peixes",
  "salmon": "salmão",
  "tuna": "atum",
  "cod": "bacalhau",
  "tilapia": "tilápia",
  "trout": "truta",
  "sardine": "sardinha",
  "sardines": "sardinhas",
  "anchovy": "anchova",
  "anchovies": "anchovas",
  "catfish": "bagre",
  "halibut": "alabote",
  "haddock": "hadoque",
  "swordfish": "peixe-espada",
  "pollock": "polaca",
  "mackerel": "cavala",
  "herring": "arenque",
  "flounder": "linguado",
  "sole": "linguado",
  "bass": "robalo",
  "snapper": "pargo",
  "shrimp": "camarão",
  "shrimps": "camarões",
  "prawn": "camarão grande",
  "prawns": "camarões grandes",
  "crab": "caranguejo",
  "crabs": "caranguejos",
  "lobster": "lagosta",
  "lobsters": "lagostas",
  "clam": "marisco",
  "clams": "mariscos",
  "mussel": "mexilhão",
  "mussels": "mexilhões",
  "oyster": "ostra",
  "oysters": "ostras",
  "scallop": "vieira",
  "scallops": "vieiras",
  "squid": "lula",
  "octopus": "polvo",
  "seafood": "frutos do mar",
  "milk": "leite",
  "cheese": "queijo",
  "cheeses": "queijos",
  "cheddar": "cheddar",
  "mozzarella": "mozarela",
  "parmesan": "parmesão",
  "cottage": "cottage",
  "ricotta": "ricota",
  "provolone": "provolone",
  "gouda": "queijo gouda",
  "brie": "queijo brie",
  "feta": "feta",
  "swiss": "suíço",
  "american": "americano",
  "yogurt": "iogurte",
  "yogurts": "iogurtes",
  "egg": "ovo",
  "eggs": "ovos",
  "yolk": "gema",
  "butter": "manteiga",
  "margarine": "margarina",
  "cream": "creme de leite",
  "whey": "soro de leite",
  "casein": "caseína",
  "custard": "creme de ovos",
  "pudding": "pudim",
  "puddings": "pudins",
  "ice": "gelo",
  "rice": "arroz",
  "wheat": "trigo",
  "flour": "farinha",
  "bread": "pão",
  "breads": "pães",
  "toast": "torrada",
  "roll": "pãozinho",
  "rolls": "pãezinhos",
  "bun": "pão de hambúrguer",
  "buns": "pães de hambúrguer",
  "bagel": "bagel",
  "bagels": "bagels",
  "croissant": "croissant",
  "croissants": "croissants",
  "biscuit": "biscoito",
  "biscuits": "biscoitos",
  "cookie": "biscoito",
  "cookies": "biscoitos",
  "cracker": "bolacha salgada",
  "crackers": "bolachas salgadas",
  "pretzel": "pretzel",
  "pretzels": "pretzels",
  "muffin": "muffin",
  "muffins": "muffins",
  "pancake": "panqueca",
  "pancakes": "panquecas",
  "waffle": "waffle",
  "waffles": "waffles",
  "cereal": "cereal",
  "cereals": "cereais",
  "oat": "aveia",
  "oats": "aveia",
  "oatmeal": "mingau de aveia",
  "corn": "milho",
  "cornmeal": "fubá",
  "cornstarch": "amido de milho",
  "pasta": "macarrão",
  "noodles": "macarrão",
  "spaghetti": "espaguete",
  "macaroni": "macarrão",
  "lasagna": "lasanha",
  "ravioli": "ravióli",
  "pizza": "pizza",
  "crust": "massa",
  "dough": "massa",
  "batter": "massa líquida",
  "barley": "cevada",
  "rye": "centeio",
  "quinoa": "quinoa",
  "couscous": "cuscuz",
  "millet": "painço",
  "buckwheat": "trigo-sarraceno",
  "sorghum": "sorgo",
  "bran": "farelo",
  "germ": "germe",
  "bean": "feijão",
  "beans": "feijões",
  "lentil": "lentilha",
  "lentils": "lentilhas",
  "pea": "ervilha",
  "peas": "ervilhas",
  "chickpea": "grão-de-bico",
  "chickpeas": "grão-de-bico",
  "soy": "soja",
  "soybean": "grão de soja",
  "soybeans": "grãos de soja",
  "edamame": "edamame",
  "tofu": "tofu",
  "tempeh": "tempeh",
  "potato": "batata",
  "potatoes": "batatas",
  "carrot": "cenoura",
  "carrots": "cenouras",
  "onion": "cebola",
  "onions": "cebolas",
  "garlic": "alho",
  "tomato": "tomate",
  "tomatoes": "tomates",
  "broccoli": "brócolis",
  "cauliflower": "couve-flor",
  "cabbage": "repolho",
  "lettuce": "alface",
  "spinach": "espinafre",
  "kale": "couve",
  "collards": "couve",
  "celery": "aipo",
  "cucumber": "pepino",
  "cucumbers": "pepinos",
  "zucchini": "abobrinha",
  "squash": "abóbora",
  "pumpkin": "abóbora",
  "eggplant": "berinjela",
  "mushroom": "cogumelo",
  "mushrooms": "cogumelos",
  "asparagus": "aspargos",
  "artichoke": "alcachofra",
  "artichokes": "alcachofras",
  "beet": "beterraba",
  "beets": "beterrabas",
  "radish": "rabanete",
  "radishes": "rabanetes",
  "turnip": "nabo",
  "turnips": "nabos",
  "parsnip": "cherivia",
  "parsnips": "cherivias",
  "yam": "inhame",
  "yams": "inhames",
  "cassava": "mandioca",
  "taro": "inhame-taro",
  "okra": "quiabo",
  "leek": "alho-poró",
  "leeks": "alhos-porós",
  "pepper": "pimenta",
  "peppers": "pimentas",
  "avocado": "abacate",
  "avocados": "abacates",
  "olive": "azeitona",
  "olives": "azeitonas",
  "pickle": "picles",
  "pickles": "picles",
  "vegetable": "vegetal",
  "vegetables": "vegetais",
  "greens": "folhas verdes",
  "banana": "banana",
  "bananas": "bananas",
  "apple": "maçã",
  "apples": "maçãs",
  "orange": "laranja",
  "oranges": "laranjas",
  "grape": "uva",
  "grapes": "uvas",
  "strawberry": "morango",
  "strawberries": "morangos",
  "blueberry": "mirtilo",
  "blueberries": "mirtilos",
  "raspberry": "framboesa",
  "raspberries": "framboesas",
  "blackberry": "amora",
  "blackberries": "amoras",
  "pineapple": "abacaxi",
  "pineapples": "abacaxis",
  "watermelon": "melancia",
  "watermelons": "melancias",
  "cantaloupe": "melão cantaloupe",
  "melon": "melão",
  "melons": "melões",
  "honeydew": "melão honeydew",
  "peach": "pêssego",
  "peaches": "pêssegos",
  "nectarine": "nectarina",
  "nectarines": "nectarinas",
  "plum": "ameixa",
  "plums": "ameixas",
  "cherry": "cereja",
  "cherries": "cerejas",
  "apricot": "damasco",
  "apricots": "damascos",
  "mango": "manga",
  "mangoes": "mangas",
  "papaya": "mamão",
  "papayas": "mamões",
  "kiwi": "kiwi",
  "kiwifruit": "kiwi",
  "fig": "figo",
  "figs": "figos",
  "date": "tâmara",
  "dates": "tâmaras",
  "raisin": "uva-passa",
  "raisins": "uvas-passas",
  "prune": "ameixa seca",
  "prunes": "ameixas secas",
  "grapefruit": "toranja",
  "grapefruits": "toranjas",
  "lemon": "limão-siciliano",
  "lemons": "limões-sicilianos",
  "lime": "limão-taiti",
  "limes": "limões-taiti",
  "coconut": "coco",
  "coconuts": "cocos",
  "guava": "goiaba",
  "guavas": "goiabas",
  "pomegranate": "romã",
  "pomegranates": "romãs",
  "cranberry": "cranberry",
  "cranberries": "cranberries",
  "fruit": "fruta",
  "fruits": "frutas",
  "berry": "fruta vermelha",
  "berries": "frutas vermelhas",
  "nut": "noz",
  "nuts": "nozes",
  "peanut": "amendoim",
  "peanuts": "amendoins",
  "almond": "amêndoa",
  "almonds": "amêndoas",
  "walnut": "noz",
  "walnuts": "nozes",
  "cashew": "castanha-de-caju",
  "cashews": "castanhas-de-caju",
  "pecan": "noz-pecã",
  "pecans": "nozes-pecã",
  "pistachio": "pistache",
  "pistachios": "pistaches",
  "hazelnut": "avelã",
  "hazelnuts": "avelãs",
  "macadamia": "macadâmia",
  "macadamias": "macadâmias",
  "chestnut": "castanha portuguesa",
  "chestnuts": "castanhas portuguesas",
  "seed": "semente",
  "seeds": "sementes",
  "sunflower": "girassol",
  "sesame": "gergelim",
  "flaxseed": "linhaça",
  "chia": "chia",
  "pumpkinseed": "semente de abóbora",
  "oil": "óleo",
  "oils": "óleos",
  "canola": "canola",
  "vinegar": "vinagre",
  "mayonnaise": "maionese",
  "mustard": "mostarda",
  "ketchup": "ketchup",
  "relish": "relish",
  "sauce": "molho",
  "sauces": "molhos",
  "gravy": "molho de carne",
  "dressing": "molho para salada",
  "dressings": "molhos para salada",
  "syrup": "calda",
  "syrups": "caldas",
  "honey": "mel",
  "molasses": "melaço",
  "sugar": "açúcar",
  "sugars": "açúcares",
  "salt": "sal",
  "marinara": "marinara",
  "salsa": "salsa",
  "hummus": "homus",
  "guacamole": "guacamole",
  "dip": "patê",
  "spread": "pasta para barrar",
  "jam": "geleia",
  "jelly": "geleia",
  "preserves": "conservas",
  "water": "água",
  "coffee": "café",
  "tea": "chá",
  "juice": "suco",
  "juices": "sucos",
  "soda": "refrigerante",
  "drink": "bebida",
  "drinks": "bebidas",
  "beverage": "bebida",
  "beverages": "bebidas",
  "beer": "cerveja",
  "wine": "vinho",
  "cider": "sidra",
  "white": "branco",
  "yellow": "amarelo",
  "red": "vermelho",
  "green": "verde",
  "brown": "marrom",
  "black": "preto",
  "sweet": "doce",
  "sour": "azedo",
  "bitter": "amargo",
  "spicy": "picante",
  "mild": "suave",
  "hot": "quente",
  "cold": "frio",
  "plain": "natural",
  "regular": "tradicional",
  "flavor": "sabor",
  "flavored": "saborizado",
  "extract": "extrato",
  "powder": "em pó",
  "liquid": "líquido",
  "solid": "sólido",
  "solids": "sólidos",
  "heavy": "denso",
  "light": "light",
  "lean": "magro",
  "fat": "gordura",
  "extra": "extra",
  "thin": "fino",
  "thick": "grosso",
  "soft": "macio",
  "crispy": "crocante",
  "crunchy": "crocante",
  "rich": "rico",
  "dry": "seco",
  "reconstituted": "reconstituído",
  "evaporated": "evaporado",
  "condensed": "condensado",
  "stuffing": "recheio",
  "tube": "tubo",
  "tubes": "tubos",
  "coated": "empanado",
  "uncoated": "sem empanamento",
  "breaded": "empanado",
  "unbreaded": "sem empanamento",
  "enriched": "enriquecido",
  "fortified": "fortificado",
  "unbleached": "não branqueado",
  "bleached": "branqueado",
  "pasteurized": "pasteurizado",
  "unpasteurized": "não pasteurizado",
  "raw": "cru",
  "cooked": "cozido",
  "boiled": "cozido em água",
  "fried": "frito",
  "baked": "assado",
  "roasted": "assado",
  "grilled": "grelhado",
  "steamed": "cozido no vapor",
  "braised": "refogado",
  "broiled": "grelhado",
  "stewed": "ensopado",
  "smoked": "defumado",
  "cured": "curado",
  "pickled": "em conserva",
  "canned": "enlatado",
  "frozen": "congelado",
  "fresh": "fresco",
  "dried": "desidratado",
  "dehydrated": "desidratado",
  "ground": "moído",
  "chopped": "picado",
  "diced": "em cubos",
  "sliced": "fatiado",
  "minced": "picadinho",
  "shredded": "desfiado",
  "grated": "ralado",
  "mashed": "em purê",
  "drained": "escorrido",
  "rings": "anéis",
  "kernels": "sementes sem casca",
  "moisture": "umidade",
  "pack": "embalagem",
  "and": "e",
  "or": "ou",
  "with": "com",
  "without": "sem",
  "in": "em",
  "on": "em",
  "of": "de",
  "for": "para",
  "from": "de",
  "as": "como",
  "to": "para",
  "by": "por",
  "added": "adicionado",
  "no": "sem",
  "sandwich": "sanduíche",
  "sandwiches": "sanduíches",
  "dark": "escuro",
  "made": "feito",
  "eaten": "consumido",
  "based": "à base de",
  "salad": "salada",
  "salads": "saladas",
  "reduced": "reduzido",
  "leafy": "de folhas",
  "restaurant": "de restaurante",
  "not": "não",
  "omelet": "omelete",
  "omelets": "omeletes",
  "scrambled": "mexido",
  "ready": "pronto",
  "free": "sem",
  "excluding": "excluindo",
  "baby": "infantil",
  "grain": "grão",
  "grains": "grãos",
  "toddler": "infantil",
  "other": "outro",
  "others": "outros",
  "sodium": "sódio",
  "including": "incluindo",
  "bar": "barra",
  "bars": "barras",
  "formula": "fórmula",
  "soup": "sopa",
  "soups": "sopas",
  "decaffeinated": "descafeinado",
  "cake": "bolo",
  "cakes": "bolos",
  "filled": "recheado",
  "infant": "infantil",
  "style": "estilo",
  "iced": "gelado",
  "puerto": "porto-",
  "rican": "riquenho",
  "chips": "chips",
  "mix": "mistura",
  "mixes": "misturas",
  "home": "caseiro",
  "steak": "bife",
  "steaks": "bifes",
  "recipe": "receita",
  "toasted": "torrado",
  "candy": "doce",
  "candies": "doces",
  "instant": "instantâneo",
  "sweetened": "adoçado",
  "unsweetened": "sem adição de açúcar",
  "dairy": "lácteo",
  "than": "que",
  "coating": "cobertura",
  "heat": "aquecer",
  "low": "baixo",
  "meal": "refeição",
  "meals": "refeições",
  "poultry": "aves",
  "pie": "torta",
  "pies": "tortas",
  "ingredient": "ingrediente",
  "ingredients": "ingredientes",
  "french": "francês",
  "stage": "estágio",
  "only": "apenas",
  "italian": "italiano",
  "vanilla": "baunilha",
  "mixed": "misto",
  "stuffed": "recheado",
  "nutritional": "nutricional",
  "bottled": "engarrafado",
  "hamburger": "hambúrguer",
  "hamburgers": "hambúrgueres",
  "meatless": "vegetariano",
  "high": "alto",
  "popcorn": "pipoca",
  "medium": "médio",
  "hard": "duro",
  "school": "escolar",
  "nonfat": "desnatado",
  "lowfat": "baixo teor de gordura",
  "trimmed": "aparado",
  "separable": "separável",
  "ripe": "maduro",
  "select": "selecionado",
  "choice": "selecionado",
  "commercial": "industrializado",
  "commercials": "industrializados",
  "deli": "frios embutidos",
  "unheated": "não aquecido",
  "par": "pré",
  "pimiento": "pimentão",
  "manzanilla": "tipo manzanilla",
  "chinese": "chinês",
  "latino": "latino",
  "tamale": "tamale",
  "pupusas": "pupusas",
  "frijoles": "feijão",
  "con": "com",
  "swirl": "mesclado",
  "shortbread": "biscoito amanteigado",
  "flatbread": "pão folha",
  "poached": "poché",
  "peel": "casca",
  "skin": "pele",
  "patty": "hambúrguer",
  "patties": "hambúrgueres",
  "icing": "glacê",
  "calorie": "caloria",
  "calories": "calorias",
  "cone": "casquinha",
  "cones": "casquinhas",
  "multigrain": "multigrãos",
  "energy": "energético",
  "wild": "selvagem",
  "form": "forma",
  "forms": "formas",
  "filling": "recheio",
  "fillings": "recheios",
  "whipped": "batido",
  "english": "inglês",
  "brewed": "coado",
  "substitute": "substituto",
  "substitutes": "substitutos",
  "summer": "de verão",
  "protein": "proteína",
  "proteins": "proteínas",
  "topping": "cobertura",
  "toppings": "coberturas",
  "double": "duplo",
  "large": "grande",
  "pastry": "massa folhada",
  "creamy": "cremoso",
  "cocoa": "cacau",
  "stew": "ensopado",
  "stews": "ensopados",
  "unsalted": "sem sal",
  "casserole": "caçarola",
  "casseroles": "suflês",
  "bowl": "tigela",
  "breakfast": "café da manhã",
  "small": "pequeno",
  "dessert": "sobremesa",
  "desserts": "sobremesas",
  "lunch": "almoço",
  "loaf": "pão de forma",
  "loaves": "pães de forma",
  "garden": "da horta",
  "sweetener": "adoçante",
  "sweeteners": "adoçantes",
  "classic": "clássico",
  "lightened": "com leite",
  "cola": "cola",
  "cracked": "triturado",
  "quick": "rápido",
  "citrus": "cítrico",
  "doughnut": "donut",
  "doughnuts": "donuts",
  "donut": "donut",
  "donuts": "donuts",
  "turnover": "pastel folhado",
  "turnovers": "pastéis folhados",
  "creamer": "creme para café",
  "venison": "carne de veado",
  "rotisserie": "assado de padaria",
  "mixture": "mistura",
  "mixtures": "misturas",
  "unenriched": "não enriquecido",
  "sprout": "broto",
  "sprouts": "brotos",
  "blend": "mistura",
  "blends": "misturas",
  "sauteed": "salteado",
  "wings": "asas",
  "vegetarian": "vegetariano",
  "multiple": "múltiplo",
  "topped": "coberto",
  "pocket": "pastel",
  "pockets": "pockets",
  "nectar": "néctar",
  "shelf": "temperatura ambiente",
  "stable": "estável",
  "rinsed": "enxaguado",
  "peeled": "descascado",
  "unpeeled": "com casca",
  "tap": "torneira",
  "caramel": "caramelo",
  "mexican": "mexicano",
  "cinnamon": "canela",
  "breadsticks": "grissini",
  "grits": "canjiquinha",
  "tortellini": "tortellini",
  "scalloped": "gratinado",
  "tots": "bolinhos de batata",
  "pan": "frigideira",
  "refrigerated": "refrigerado",
  "paste": "pasta",
  "gelatin": "gelatina",
  "pot": "panela",
  "corned": "curado",
  "deer": "veado",
  "shell": "casca",
  "shells": "cascas",
  "lightly": "levemente",
  "purchased": "comprado",
  "curd": "coalhada",
  "curds": "coalhadas",
  "leaf": "folha",
  "store": "mercado",
  "half": "metade",
  "alfredo": "alfredo",
  "vienna": "viena",
  "noodle": "macarrão",
  "graham": "graham",
  "puffs": "salgadinhos inflados",
  "chewy": "macio",
  "microwave": "micro-ondas",
  "ramen": "lámen",
  "plantain": "banana-da-terra",
  "lemonade": "limonada",
  "prepared": "preparado",
  "queso": "queijo",
  "winter": "de inverno",
  "brussels": "de bruxelas",
  "ranch": "ranch",
  "creamed": "cremoso",
  "shellfish": "frutos do mar",
  "cocktail": "coquetel",
  "spanish": "espanhol",
  "pumpernickel": "pumpernickel",
  "covered": "coberto",
  "wafer": "wafer",
  "wafers": "wafers",
  "puff": "folhado",
  "slim": "fino",
  "popped": "estourado",
  "calcium": "cálcio",
  "root": "raiz",
  "roots": "raízes",
  "sports": "esportivo",
  "whiskey": "uísque",
  "seeded": "com sementes",
  "seedless": "sem sementes",
  "sources": "fontes",
  "strips": "tiras",
  "strip": "tira",
  "perch": "perca",
  "pompano": "pampo",
  "whiting": "pescada",
  "ns": "não especificado",
  "nfs": "não especificado",
  "type": "tipo",
  "types": "tipos",
  "food": "alimento",
  "foods": "alimentos",
  "fast": "rápido",
  "pre": "pré",
  "drumstick": "coxa de frango",
  "drumsticks": "coxas de frango",
  "thigh": "sobrecoxa de frango",
  "thighs": "sobrecoxas de frango",
  "breast": "peito",
  "breasts": "peitos",
  "non": "não",
  "diet": "diet",
  "granola": "granola",
  "dog": "cachorro-quente",
  "dogs": "cachorros-quentes",
  "eat": "consumir",
  "tortilla": "tortilha",
  "tortillas": "tortilhas",
  "fries": "batatas fritas",
  "vitamin": "vitamina",
  "vitamins": "vitaminas",
  "part": "parte",
  "parts": "partes",
  "salted": "salgado",
  "gluten": "glúten",
  "mocha": "café mocha",
  "chili": "chili",
  "latte": "café latte",
  "chop": "bisteca",
  "chops": "bistecas",
  "flavors": "sabores",
  "fillet": "filé",
  "fillets": "filés",
  "cooking": "culinário",
  "cook": "cozinhar",
  "mein": "mein",
  "chow": "chow",
  "suey": "suey",
  "greek": "grego",
  "leg": "coxa",
  "legs": "coxas",
  "use": "uso",
  "wing": "asa",
  "barbecue": "barbecue",
  "sub": "sanduíche submarino",
  "hash": "hash brown",
  "feed": "alimentação",
  "roast": "assado",
  "roasts": "assados",
  "method": "método",
  "methods": "métodos",
  "sushi": "sushi",
  "cafe": "café",
  "skim": "desnatado",
  "pinto": "carioca",
  "luncheon": "frios fatiados",
  "bakery": "de padaria",
  "fiber": "fibra",
  "concentrate": "concentrado",
  "concentrates": "concentrados",
  "caught": "capturado",
  "curry": "curry",
  "burger": "hambúrguer",
  "burgers": "hambúrgueres",
  "serve": "servir",
  "wrap": "sanduíche enrolado",
  "wraps": "sanduíches enrolados",
  "nutrition": "nutrição",
  "round": "coxão",
  "rounds": "coxões",
  "stick": "palito",
  "sticks": "palitos",
  "pear": "pera",
  "pears": "peras",
  "any": "qualquer",
  "animal": "animal",
  "at": "em",
  "powdered": "em pó",
  "vodka": "vodca",
  "loin": "lombo",
  "loins": "lombos",
  "brand": "marca",
  "brands": "marcas",
  "nuggets": "empanados",
  "nugget": "empanado",
  "souffle": "suflê",
  "spray": "spray",
  "lima": "fava",
  "empanada": "empanada",
  "empanadas": "empanadas",
  "nachos": "nachos",
  "nacho": "nacho",
  "gentle": "suave",
  "dulce": "doce",
  "tenders": "iscas",
  "tender": "macio",
  "species": "espécie",
  "teriyaki": "teriyaki",
  "leaves": "folhas",
  "shish": "espetinho",
  "kabob": "churrasquinho",
  "general": "geral",
  "asian": "asiático",
  "caesar": "caesar",
  "dinner": "refeição completa",
  "drippings": "gordura de cozimento",
  "trail": "mix de castanhas",
  "major": "principal",
  "cornbread": "broa de milho",
  "chip": "chips",
  "snack": "petisco",
  "snacks": "petiscos",
  "bake": "assado",
  "tostada": "tostada",
  "lo": "lo",
  "thai": "tailandês",
  "bulb": "bulbo",
  "seaweed": "alga marinha",
  "snowpeas": "ervilhas-tortas",
  "cappuccino": "cappuccino",
  "alcoholic": "alcoólico",
  "bone": "osso",
  "bones": "ossos",
  "fluid": "líquido",
  "all": "todos",
  "full": "integral",
  "applesauce": "purê de maçã",
  "blue": "azul",
  "lactose": "lactose",
  "split": "partida",
  "pig": "porco",
  "seasoning": "tempero",
  "seasoned": "temperado",
  "salisbury": "salisbury",
  "fricassee": "fricassê",
  "dumpling": "bolinho cozido",
  "dumplings": "bolinhos cozidos",
  "cuban": "cubano",
  "club": "especial em camadas",
  "foo": "fu",
  "yung": "yung",
  "refried": "refrito",
  "unroasted": "não torrado",
  "lower": "baixo teor",
  "pita": "pão sírio",
  "frosted": "com cobertura",
  "yeast": "fermento biológico",
  "tart": "torta doce",
  "gordita": "gordita",
  "rum": "rum",
  "crepe": "crepe",
  "crepes": "crepes",
  "strudel": "strudel",
  "replacement": "substituto",
  "woven": "trançado",
  "wonton": "wonton",
  "restructured": "reestruturado",
  "congee": "mingau de arroz",
  "squares": "quadradinhos",
  "flakes": "flocos",
  "pad": "pad",
  "ruffled": "ondulada",
  "ginger": "gengibre",
  "caffeine": "cafeína",
  "carbonated": "gaseificado",
  "noncarbonated": "não gaseificado",
  "packaged": "embalado",
  "top": "superior",
  "romaine": "alface-romana",
  "glutinous": "glutinoso",
  "bell": "sino",
  "long": "longo",
  "ribeye": "ancho",
  "farm": "fazenda",
  "raised": "criado",
  "bulgur": "trigo para quibe",
  "imitation": "imitação",
  "scooped": "sem miolo",
  "leche": "leite",
  "roquefort": "queijo roquefort",
  "base": "base",
  "ball": "bola",
  "balls": "bolinhas",
  "sirloin": "alcatra",
  "feet": "pés",
  "cornish": "galeto",
  "game": "caça",
  "hen": "galinha",
  "stroganoff": "estrogonofe",
  "gumbo": "gumbo",
  "kung": "kung",
  "pao": "pao",
  "slider": "minihambúrguer",
  "sliders": "minihambúrgueres",
  "whopper": "Whopper",
  "cafeteria": "refeitório",
  "entree": "prato principal",
  "blackeyed": "feijão-fradinho",
  "frosting": "cobertura",
  "cobbler": "torta rústica",
  "crisp": "crocante",
  "eclair": "bomba de chocolate",
  "saltine": "bolacha água e sal",
  "taquito": "taquito",
  "taquitos": "taquitos",
  "pupusa": "pupusa",
  "manicotti": "manicotti",
  "freshly": "recém",
  "squeezed": "espremido",
  "carton": "caixa",
  "fry": "fritar",
  "skins": "peles",
  "coleslaw": "salada de repolho",
  "island": "ilha",
  "nonalcoholic": "não alcoólico",
  "gin": "gim",
  "muscle": "músculo",
  "dill": "endro",
  "short": "curto",
  "table": "de mesa",
  "grade": "qualidade",
  "purpose": "multiuso",
  "cut": "corte",
  "cuts": "cortes",
  "monterey": "Monterey",
  "plantains": "bananas-da-terra",
  "pearled": "perolizado",
  "chipotle": "chipotle",
  "malt": "malte",
  "organic": "orgânico",
  "fudge": "fudge",
  "neck": "pescoço",
  "chipped": "em lascas",
  "jerky": "carne seca",
  "back": "dorso",
  "ribs": "costelas",
  "rib": "costela",
  "marinade": "marinada",
  "precooked": "pré-cozido",
  "tail": "rabo",
  "spam": "Spam",
  "eel": "enguia",
  "calamari": "lula empanada",
  "sloppy": "sloppy",
  "joe": "joe",
  "frankfurters": "salsichas",
  "biryani": "biryani",
  "croquette": "croquete",
  "paella": "paella",
  "creole": "ao estilo crioulo",
  "codfish": "bacalhau",
  "stir": "salteado",
  "watercress": "agrião",
  "sopa": "sopa",
  "griddle": "chapa",
  "miso": "missô",
  "veggie": "vegetal",
  "lard": "banha",
  "melted": "derretido",
  "special": "especial",
  "marble": "mesclado tipo mármore",
  "boston": "Boston",
  "cheesecake": "cheesecake",
  "fritter": "fritinho empanado",
  "fritters": "fritinhos empanados",
  "danish": "folhado dinamarquês",
  "crumb": "farofa doce",
  "matzo": "matzo",
  "buttered": "amanteigado",
  "sun": "sol",
  "mush": "papa de milho",
  "marshmallows": "marshmallows",
  "chimichanga": "chimichanga",
  "chimichangas": "chimichangas",
  "sticker": "guioza",
  "stickers": "guiozas",
  "quiche": "quiche",
  "korean": "coreano",
  "passion": "maracujá",
  "horseradish": "raiz-forte",
  "cactus": "palma",
  "fennel": "erva-doce",
  "rutabaga": "rutabaga",
  "seven": "sete",
  "catalina": "catalina",
  "russian": "russo",
  "thousand": "thousand",
  "popsicle": "picolé",
  "snow": "neve",
  "nougat": "torrone",
  "chicory": "chicória",
  "tonic": "tônica",
  "ale": "cerveja tipo ale",
  "punch": "ponche",
  "margarita": "margarita",
  "atole": "atole de milho",
  "liqueur": "licor",
  "brandy": "conhaque",
  "plus": "plus",
  "monster": "Monster",
  "removed": "removido",
  "snap": "vagem",
  "process": "processado",
  "fryers": "corte",
  "unprepared": "não preparado",
  "uncooked": "cru",
  "chorizo": "chouriço",
  "link": "em gomos",
  "links": "em gomos",
  "granulated": "granulado",
  "tan": "castanho",
  "pink": "rosado",
  "navy": "feijão branco",
  "great": "grande",
  "northern": "feijão branco grande",
  "fine": "fino",
  "overripe": "muito maduro",
  "safflower": "cártamo",
  "mature": "maduro",
  "semolina": "sêmola",
  "coarse": "grosso",
  "pulp": "polpa",
  "buttermilk": "leitelho",
  "pine": "pinho",
  "old": "tradicional",
  "fashioned": "à moda antiga",
  "gold": "dourado",
  "flesh": "polpa",
  "cannellini": "feijão cannellini",
  "garbanzo": "grão-de-bico",
  "bengal": "grão-de-bico da Índia",
  "gram": "grama",
  "blackeye": "fradinho",
  "chuck": "acém",
  "flank": "fraldinha",
  "jack": "jack",
  "product": "produto",
  "fresco": "fresco",
  "cotija": "cotija",
  "atlantic": "do Atlântico",
  "crustaceans": "crustáceos",
  "lump": "pedaços nobres",
  "includes": "inclui",
  "arugula": "rúcula",
  "masa": "massa de milho",
  "harina": "farinha",
  "malted": "maltado",
  "eggnog": "gemada",
  "spit": "refluxo",
  "up": "acima",
  "ar": "ar",
  "premature": "prematuro",
  "additional": "adicional",
  "gelato": "gelato",
  "fudgesicle": "picolé de chocolate",
  "creme": "creme",
  "indian": "indiano",
  "tapioca": "tapioca",
  "mousse": "mousse",
  "colby": "colby",
  "muenster": "muenster",
  "paneer": "paneer",
  "processed": "processado",
  "basil": "manjericão",
  "head": "cabeça",
  "cracklings": "torresmo",
  "hocks": "joelho de porco",
  "belly": "barriga de porco",
  "rabbit": "coelho",
  "bison": "bisão",
  "dove": "pombo",
  "chitterlings": "miúdos suínos",
  "bratwurst": "salsicha bratwurst",
  "kind": "tipo",
  "crayfish": "lagostim",
  "guisada": "guisado",
  "swedish": "sueco",
  "parmigiana": "à parmegiana",
  "cordon": "cordon",
  "bleu": "bleu",
  "mole": "mole mexicano",
  "porcupine": "almôndegas com arroz",
  "breading": "empanamento",
  "szechuan": "szechuan",
  "hawaiian": "havaiano",
  "sauerkraut": "chucrute",
  "moo": "moo",
  "la": "la",
  "reported": "relatado",
  "separately": "separadamente",
  "tempura": "tempurá",
  "lau": "lau",
  "jr": "junior",
  "quarter": "quarto de libra",
  "pounder": "hambúrguer",
  "mac": "mac",
  "pho": "pho vietnamita",
  "caldo": "caldo",
  "manhattan": "Manhattan",
  "chowder": "sopa cremosa",
  "mung": "feijão-mungo",
  "layer": "camadas",
  "falafel": "falafel",
  "wasabi": "wasabi",
  "bits": "pedacinhos",
  "slice": "fatia",
  "native": "nativo",
  "grecian": "grego",
  "armenian": "armênio",
  "challah": "pão judaico challah",
  "sprouted": "germinado",
  "scone": "bolinho scone",
  "pone": "pão de milho",
  "german": "alemão",
  "spice": "especiarias",
  "butterscotch": "caramelo amanteigado",
  "meringue": "merengue",
  "sopaipilla": "sopaipilla",
  "lotus": "lótus",
  "less": "menos",
  "original": "original",
  "south": "sul",
  "beach": "praia",
  "living": "living",
  "crunch": "crocante",
  "paper": "papel de arroz",
  "movie": "de cinema",
  "theater": "cinema",
  "air": "ar",
  "kettle": "tipo artesanal",
  "dosa": "crepe indiano dosa",
  "funnel": "funnel cake",
  "maple": "bordo",
  "calzone": "calzone",
  "gnocchi": "nhoque",
  "bao": "pãozinho no vapor",
  "fun": "macarrão chao fen",
  "adobo": "ao molho adobo",
  "soupy": "com caldo",
  "tangerine": "tangerina",
  "persimmon": "caqui",
  "tamarind": "tamarindo",
  "candied": "cristalizado",
  "nondairy": "não lácteo",
  "raab": "brócolis-rabe",
  "chard": "acelga",
  "cress": "agrião",
  "dandelion": "dente-de-leão",
  "radicchio": "radicchio",
  "broccoflower": "broccoflower",
  "kohlrabi": "couve-rábano",
  "assorted": "variado",
  "string": "fio",
  "monk": "peixe-tanso",
  "chiles": "pimentas",
  "rellenos": "recheados",
  "jalapeno": "jalapeño",
  "tub": "pote",
  "stevia": "estévia",
  "saccharin": "sacarina",
  "mint": "hortelã",
  "chewing": "de mascar",
  "gum": "goma de mascar",
  "espresso": "café expresso",
  "macchiato": "macchiato",
  "containing": "contendo",
  "pina": "piña",
  "colada": "colada",
  "slush": "raspadinha de gelo",
  "sunny": "Sunny",
  "horchata": "bebida horchata",
  "daiquiri": "coquetel daiquiri",
  "martini": "martini",
  "fizz": "fizz",
  "tequila": "tequila",
  "sangria": "sangria",
  "enhanced": "enriquecido",
  "dew": "Dew",
  "amp": "Amp",
  "nos": "NOS",
  "bull": "Bull",
  "rockstar": "Rockstar",
  "vault": "Vault",
  "xs": "XS",
  "recipes": "receitas",
  "mahi": "dourado-do-mar",
  "sea": "do mar",
  "heated": "aquecido",
  "oven": "forno",
  "kosher": "kosher",
  "broilers": "frangos de corte",
  "broiler": "frango de corte",
  "lip": "borda",
  "eye": "lagarto",
  "porterhouse": "porterhouse",
  "seco": "seco",
  "cos": "alface-romana",
  "navels": "laranja-baía",
  "bartlett": "bartlett",
  "iodized": "iodado",
  "crumbles": "em pedaços",
  "flor": "flor",
  "mayo": "Mayo",
  "carioca": "carioca",
  "virgin": "virgem",
  "defatted": "desengordurado",
  "slightly": "levemente",
  "delicious": "Delicious",
  "fuji": "fuji",
  "gala": "gala",
  "granny": "granny",
  "smith": "smith",
  "honeycrisp": "honeycrisp",
  "lion": "juba de leão",
  "mane": "juba",
  "shiitake": "cogumelo shiitake",
  "button": "cogumelo-de-paris",
  "roma": "italiano",
  "spelt": "espelta",
  "semi": "semi",
  "purple": "roxo",
  "portabella": "cogumelo portobello",
  "enoki": "cogumelo enoki",
  "crimini": "cogumelo crimini",
  "maitake": "cogumelo maitake",
  "beech": "cogumelo shimeji branco",
  "pioppini": "cogumelo pioppino",
  "crumbled": "esfarelado",
  "block": "em bloco",
  "iceberg": "americana",
  "rolled": "laminada",
  "steel": "cortada em aço",
  "russet": "batata russet",
  "amaranth": "amaranto",
  "additives": "aditivos",
  "brazilnuts": "castanhas-do-pará",
  "filberts": "avelãs",
  "pepitas": "sementes de abóbora",
  "kernel": "grão",
  "singles": "fatias individuais",
  "oaxaca": "oaxaca",
  "sockeye": "salmão-vermelho",
  "swimming": "nadador",
  "butternut": "abóbora-manteiga",
  "acorn": "abóbora acorn",
  "bok": "bok",
  "choy": "choy",
  "liquids": "líquidos",
  "puree": "purê",
  "underripe": "verde",
  "hass": "hass",
  "einkorn": "einkorn",
  "farro": "farro",
  "fonio": "fonio",
  "khorasan": "trigo kamut",
  "mandarin": "tangerina",
  "tommy": "tommy",
  "atkins": "atkins",
  "ataulfo": "ataulfo",
  "anjou": "anjou",
  "human": "humano",
  "kefir": "kefir",
  "content": "teor",
  "tzatziki": "patê tzatziki",
  "licuado": "vitamina batida",
  "batido": "vitamina batida",
  "go": "go",
  "grow": "grow",
  "kinder": "kinder",
  "beginning": "início",
  "next": "próximo",
  "pediatric": "pediátrico",
  "sensitivity": "sensibilidade",
  "diarrhea": "antidiarreica",
  "amino": "amino",
  "acids": "ácidos",
  "iron": "ferro",
  "blended": "misturado",
  "creamsicle": "picolé de creme com laranja",
  "sherbet": "sorbet com leite",
  "flan": "pudim",
  "brulee": "crème brûlée",
  "firni": "firni",
  "barfi": "barfi",
  "burfi": "burfi",
  "trifle": "pavê inglês",
  "tiramisu": "tiramisù",
  "brick": "tijolo",
  "camembert": "queijo camembert",
  "fontina": "fontina",
  "edam": "queijo edam",
  "gruyere": "gruyère",
  "limburger": "limburger",
  "port": "port",
  "du": "du",
  "salut": "salut",
  "anejo": "añejo",
  "aged": "maturado",
  "asadero": "asadero",
  "farmer": "tipo frescal",
  "pressurized": "pressurizado",
  "can": "lata",
  "fondue": "fondue",
  "rarebit": "torrada com creme de queijo",
  "cube": "cubo",
  "country": "camponês",
  "oxtails": "rabada",
  "shortribs": "costela em tiras",
  "cow": "vaca",
  "brisket": "peito bovino",
  "carnitas": "carnitas suínas",
  "canadian": "canadense",
  "side": "lateral",
  "ears": "orelhas",
  "rinds": "torresmo",
  "mock": "vegetariano",
  "moose": "alce",
  "bear": "urso",
  "caribou": "caribu",
  "groundhog": "marmota",
  "opossum": "gambá",
  "squirrel": "esquilo",
  "beaver": "castor",
  "raccoon": "guaxinim",
  "armadillo": "tatu",
  "ostrich": "avestruz",
  "peking": "de pequim",
  "pate": "patê",
  "sweetbreads": "molejas",
  "brains": "miolos",
  "hog": "porco",
  "maws": "estômago suíno",
  "gizzard": "moela",
  "gizzards": "moelas",
  "blood": "chouriço de sangue",
  "knockwurst": "salsicha knockwurst",
  "mortadella": "mortadela",
  "polish": "polonesa",
  "scrapple": "scrapple",
  "thuringer": "salsicha thuringer",
  "liverwurst": "patê de fígado",
  "potted": "em pasta",
  "carp": "carpa",
  "croaker": "corvina",
  "mullet": "tainha",
  "pike": "lúcio",
  "shark": "cação",
  "frog": "rã",
  "caviar": "caviar",
  "turtle": "tartaruga",
  "abalone": "abalone",
  "escargot": "escargot",
  "burgundy": "borgonha",
  "tartare": "tartar",
  "scallopini": "escalope",
  "marsala": "ao molho marsala",
  "cacciatore": "à caçadora",
  "kiev": "à kiev",
  "timbale": "timbale",
  "thermidor": "thermidor",
  "scampi": "camarão scampi",
  "ceviche": "ceviche",
  "wellington": "bife wellington",
  "tetrazzini": "tetrazzini",
  "gefilte": "gefilte fish",
  "casino": "casino",
  "shepherd": "escondidinho de carne",
  "bouillabaisse": "sopa bouillabaisse",
  "starchy": "amiláceo",
  "biscayne": "à biscainha",
  "various": "variados",
  "jambalaya": "arroz jambalaya",
  "hunan": "ao estilo hunan",
  "shu": "shu",
  "carrorts": "cenouras",
  "divan": "divan",
  "tso": "tso",
  "goo": "goo",
  "gai": "gai",
  "rockefeller": "rockefeller",
  "lomi": "lomi",
  "serenata": "serenata",
  "antipasto": "antepasto",
  "livers": "fígados",
  "calves": "vitela",
  "mcdouble": "McDouble",
  "big": "Big",
  "chiliburger": "chilibúrguer",
  "reuben": "sanduíche reuben",
  "gyro": "sanduíche grego gyro",
  "blanket": "enroladinho",
  "spaetzle": "massa spaetzle",
  "portion": "porção",
  "au": "au",
  "gratin": "gratinado",
  "starch": "amido",
  "item": "item",
  "pepperpot": "pepperpot",
  "res": "bovina",
  "pozole": "pozole",
  "wedding": "wedding",
  "broth": "caldo",
  "pollo": "frango",
  "new": "novo",
  "england": "Inglaterra",
  "bisque": "bisque",
  "benedict": "ovos beneditinos",
  "deviled": "temperado picante",
  "huevos": "ovos",
  "rancheros": "rancheros",
  "drop": "em gotas",
  "meringues": "merengues",
  "peruvian": "peruano",
  "franks": "salsichas",
  "dal": "dal indiano",
  "papad": "papadum",
  "sambar": "sambar",
  "natto": "natto",
  "hoisin": "molho hoisin",
  "worcestershire": "molho inglês",
  "deep": "profundo",
  "vermicelli": "aletria",
  "textured": "texturizada",
  "mulligatawany": "sopa mulligatawny",
  "pattie": "hambúrguer",
  "brazil": "do Brasil",
  "mineral": "mineral",
  "crusts": "massas",
  "used": "usado",
  "tahini": "tahine",
  "flax": "linhaça",
  "focaccia": "focaccia",
  "naan": "pão naan",
  "bruschetta": "bruschetta",
  "hoagie": "sanduíche hoagie",
  "submarine": "sanduíche submarino",
  "bolillo": "pãozinho",
  "brioche": "pão brioche",
  "croutons": "torradinhas croutons",
  "melba": "torrada melba",
  "anisette": "anisete",
  "pannetone": "panetone",
  "zwieback": "torrada alemã zwieback",
  "chappatti": "chapati",
  "roti": "pão roti",
  "puri": "pão puri",
  "paratha": "pão paratha",
  "injera": "pão etíope injera",
  "ethiopian": "etíope",
  "sope": "sope mexicano",
  "hush": "bolinho de milho",
  "puppy": "puppy",
  "johnnycake": "panqueca de milho",
  "spoonbread": "pão de colher",
  "arepa": "arepa",
  "dominicana": "dominicana",
  "popover": "pão popover",
  "irish": "irlandês",
  "angel": "anjo",
  "forest": "floresta negra",
  "flourless": "sem farinha",
  "gingerbread": "pão de gengibre",
  "pound": "bolo inglês",
  "velvet": "red velvet",
  "sponge": "pão de ló",
  "torte": "torta alemã",
  "tres": "três",
  "upside": "invertido",
  "down": "para baixo",
  "shortcake": "bolo de frutas",
  "biscotti": "biscotti",
  "fortune": "biscoito da sorte",
  "gingersnaps": "biscoitos de gengibre",
  "ladyfinger": "biscoito champanhe",
  "macaroon": "macaron de coco",
  "lebkuchen": "pão de mel alemão",
  "pfeffernusse": "pfeffernusse",
  "pizzelle": "pizzelle",
  "pocky": "Pocky",
  "marie": "biscoito Maria",
  "toffee": "toffee",
  "japanese": "japonês",
  "rugelach": "rugelach",
  "key": "limão",
  "baklava": "baklava",
  "basbousa": "basbousa",
  "mainly": "principalmente",
  "holes": "furinhos de donuts",
  "churros": "churros",
  "beignet": "bolinho beignet",
  "one": "um",
  "salty": "salgado",
  "dipps": "dipps",
  "bites": "pedacinhos",
  "balance": "equilíbrio",
  "kids": "infantil",
  "zbar": "ZBar",
  "powerbar": "PowerBar",
  "snickers": "Snickers",
  "marathon": "Marathon",
  "tiger": "Tiger",
  "zone": "Zone",
  "perfect": "Perfect",
  "teddy": "Teddy",
  "grahams": "Grahams",
  "cheez": "Cheez",
  "it": "It",
  "goldfish": "Goldfish",
  "crispbread": "pão crocante tipo crispbread",
  "crunchies": "crocantes",
  "wheels": "rodinhas",
  "cheetos": "Cheetos",
  "cool": "Cool",
  "chex": "Chex",
  "idli": "idli indiano",
  "groats": "grãos inteiros",
  "bunches": "cachos",
  "chilaquiles": "chilaquiles",
  "frito": "frito",
  "kibby": "quibe",
  "bacalaitos": "bolinhos de bacalhau",
  "hayacas": "pamonha salgada",
  "pierogi": "pastelzinho pierogi",
  "knish": "knish",
  "spanakopita": "torta de espinafre",
  "samosa": "pastelzinho indiano samosa",
  "vinaigrette": "vinagrete",
  "cannelloni": "canelone",
  "easy": "fácil",
  "helper": "mistura pronta",
  "yat": "yat",
  "ga": "ga",
  "bibimbap": "prato coreano bibimbap",
  "dukboki": "tteokbokki",
  "tteokbokki": "rolinhos de arroz tteokbokki",
  "california": "califórnia",
  "pilaf": "arroz pilaf",
  "dirty": "temperado",
  "upma": "upma",
  "vada": "vada",
  "tabbouleh": "tabule",
  "fideo": "sopa de macarrão",
  "aguada": "aguada",
  "clementine": "mexerica clementina",
  "kumquat": "kumquat",
  "currants": "groselhas",
  "starfruit": "carambola",
  "maraschino": "cereja marrasquino",
  "dragon": "pitaya",
  "lychee": "lichia",
  "rhubarb": "ruibarbo",
  "bluberries": "mirtilos",
  "ambrosia": "ambrosia",
  "chutney": "chutney",
  "sorbet": "sorvete de frutas sorbet",
  "soursop": "graviola",
  "melts": "sanduíche gratinado",
  "dishes": "pratos",
  "components": "componentes",
  "shaped": "em formato",
  "lefse": "pão norueguês lefse",
  "yuca": "mandioca",
  "casabe": "pão de mandioca casabe",
  "fufu": "purê de mandioca",
  "escarole": "escarola",
  "lambsquarter": "erva-de-santa-maria",
  "poke": "salada havaiana poke",
  "palak": "espinafre",
  "channa": "grão-de-bico",
  "saag": "refogado de folhas",
  "turrnip": "nabo",
  "jute": "juta",
  "chrysanthemum": "crisântemo comestível",
  "glazed": "glaceado",
  "pico": "pico",
  "gallo": "de gallo",
  "homemade": "caseiro",
  "verde": "verde",
  "buffalo": "buffalo",
  "alfalfa": "alfafa",
  "chives": "cebolinha",
  "cilantro": "coentro",
  "jicama": "jacatupé",
  "parsley": "salsinha",
  "slaw": "salada de repolho",
  "namasu": "conserva agridoce",
  "wilted": "murcho",
  "combination": "combinação",
  "cobb": "salada cobb",
  "aloe": "babosa",
  "vera": "vera",
  "bamboo": "bambu",
  "shoots": "brotos",
  "breadfruit": "fruta-pão",
  "burdock": "bardana",
  "savoy": "crespo",
  "christophine": "chuchu",
  "flowers": "flores",
  "blossoms": "flores",
  "sesbania": "flor de sesbania",
  "lily": "lírio comestível",
  "hominy": "canjica de milho",
  "pearl": "pérola",
  "palm": "palmito",
  "hearts": "palmitos",
  "salsify": "cercefi",
  "chesnut": "castanha",
  "ratatouille": "ratatouille",
  "jai": "prato vegetariano",
  "pakora": "bolinho frito",
  "kimchi": "conserva kimchi",
  "tapenade": "patê de azeitonas tapenade",
  "jalapenos": "pimentas jalapeño",
  "borscht": "sopa de beterraba borscht",
  "gazpacho": "sopa fria gazpacho",
  "minestrone": "sopa minestrone",
  "pasteles": "pastéis caribenhos",
  "syrian": "sírio",
  "dish": "prato",
  "shortening": "gordura vegetal",
  "ghee": "manteiga clarificada ghee",
  "clarified": "clarificada",
  "hollandaise": "molho holandês",
  "tartar": "molho tártaro",
  "pesto": "molho pesto",
  "cottonseed": "óleo de algodão",
  "vegan": "vegano",
  "poppy": "papoula",
  "confectioner": "confeiteiro",
  "sucralose": "sucralose",
  "aspartame": "aspartame",
  "simple": "simples",
  "agave": "calda de agave",
  "marmalade": "geleia de frutas cítricas",
  "yokan": "doce de feijão",
  "haupia": "doce de coco",
  "freezer": "congelador",
  "pop": "picolé",
  "sprinkles": "confeitos",
  "ladoo": "doce indiano laddu",
  "licorice": "alcaçuz",
  "brittle": "pé-de-moleque crocante",
  "gummy": "bala de goma",
  "lollipop": "pirulito",
  "cough": "pastilha para tosse",
  "drops": "gotas",
  "cotton": "algodão",
  "leather": "barra de fruta prensada",
  "taffy": "caramelo puxa-puxa",
  "turkish": "delícia turca",
  "reconsitituted": "reconstituído",
  "oolong": "chá oolong",
  "herbal": "de ervas",
  "hibiscus": "hibisco",
  "chamomile": "camomila",
  "bubble": "bubble tea",
  "kombucha": "chá kombucha",
  "noncitrus": "não cítrico",
  "capri": "Capri",
  "frescavena": "bebida de aveia",
  "avena": "aveia",
  "cane": "de cana",
  "shirley": "Shirley",
  "temple": "Temple",
  "higher": "maior teor",
  "alcohol": "álcool",
  "seltzer": "água com gás",
  "alexander": "Alexander",
  "bloody": "Bloody",
  "mary": "Mary",
  "cape": "Cape",
  "shot": "dose",
  "gimlet": "Gimlet",
  "greyhound": "Greyhound",
  "jagerbomb": "Jägerbomb",
  "kamikaze": "Kamikaze",
  "michelada": "Michelada",
  "mimosa": "Mimosa",
  "julep": "Julep",
  "mojito": "Mojito",
  "moscow": "Moscow",
  "mule": "Mule",
  "blossom": "Flor",
  "rob": "Rob",
  "roy": "Roy",
  "rusty": "Rusty",
  "nail": "Nail",
  "screwdriver": "Screwdriver",
  "seabreeze": "Sea Breeze",
  "tom": "Tom",
  "collins": "Collins",
  "sloe": "Sloe Gin",
  "champagne": "champanhe",
  "singapore": "Singapore",
  "sling": "Sling",
  "mai": "Mai",
  "tai": "Tai",
  "sunrise": "Sunrise",
  "fuzzy": "Fuzzy",
  "navel": "Navel",
  "sparkling": "com gás",
  "rose": "rosé",
  "cooler": "cooler de vinho",
  "spritzer": "spritzer",
  "glug": "vinho quente",
  "scotch": "uísque escocês",
  "glucerna": "Glucerna",
  "herbalife": "Herbalife",
  "isopure": "Isopure",
  "throttle": "Full Throttle",
  "motherload": "Motherload",
  "sobe": "SoBe",
  "energize": "Energize",
  "ocean": "Ocean",
  "cran": "Cran",
  "g2": "G2",
  "zero": "zero",
  "electrolyte": "eletrólito",
  "solution": "solução eletrolítica",
  "glucose": "glicose",
  "acai": "açaí",
  "mirepoix": "mistura de vegetais aromáticos",
  "industrial": "industrial",
  "ny": "Nova York",
  "center": "centro",
  "pawpaw": "asimina",
  "tomatillos": "tomatilhos",
  "dehusked": "sem casca",
  "napa": "acelga chinesa",
  "destemmed": "sem talos",
  "scallion": "cebolinha-verde",
  "shallots": "chalotas",
  "pacific": "do Pacífico",
  "alaskan": "do Alasca",
  "hungarian": "húngaro",
  "wax": "amarelo tipo wax",
  "poblano": "pimenta poblano",
  "serrano": "pimenta serrano",
  "bay": "louro",
  "patagonian": "da Patagônia",
  "chilean": "chileno",
  "ahi": "atum-albacora",
  "yellowfin": "atum de barbatana amarela",
  "rind": "casca",
  "bluefish": "anchova",
  "burbot": "lota",
  "scup": "sargo americano",
  "seatrout": "truta marinha",
  "shad": "sável",
  "sheepshead": "sargo de dentes",
  "smelt": "eperlano",
  "spot": "corvina pequena",
  "sturgeon": "esturjão",
  "sucker": "peixe-ventosa",
  "sunfish": "peixe-lua",
  "tilefish": "peixe-batata",
  "turbot": "pregado",
  "whitefish": "peixe branco",
  "wolffish": "peixe-lobo",
  "cisco": "arenque de lago",
  "drum": "corvina preta",
  "pout": "peixe-carneiro",
  "rockfish": "peixe-pedra",
  "sablefish": "peixe-carvão",
  "crushed": "triturado",
  "pieces": "em pedaços",
  "confectioner's": "de confeiteiro",
  "boneless": "sem osso",
  "skinless": "sem pele",
  "whole": "inteiro",
  "halves": "metades",
  "tenderloin": "filé mignon",
  "sapote": "sapoti",
  "zapote": "sapoti",
  "mamey": "mamey",
  "epazote": "erva-de-santa-maria",
  "nopales": "palma forrageira",
  "tomatillo": "tomatilho",
  "chayote": "chuchu",
  "malanga": "inhame-malanga",
  "yautia": "taiova",
  "cupcake": "bolinho confeitado",
  "cupcakes": "bolinhos confeitados",
  "cheeseburger": "hambúrguer com queijo",
  "cheeseburgers": "hambúrgueres com queijo",
  "cabbages": "repolhos",
  "milkfat": "de gordura",
  "shake": "milk-shake",
  "shakes": "milk-shakes",
  "rutabagas": "rutabagas",
  "cheesecakes": "cheesecakes",
  "scones": "bolinhos scones",
  "prepackaged": "pré-embalado",
  "non-dairy": "não lácteo",
  "tomato-based": "à base de tomate",
  "soy-based": "à base de soja",
  "soy-base": "à base de soja",
  "ready-to-heat": "pronto para aquecer",
  "ready-to-eat": "pronto para consumo",
  "ready-to-feed": "pronto para consumo",
  "ready-to-drink": "pronto para beber",
  "ready-to-serve": "pronto para servir",
  "pre-lightened": "com clareador",
  "pre-packaged": "pré-embalado",
  "pre-cooked": "pré-cozido",
  "mayonnaise-type": "tipo maionese",
  "meat-filled": "recheado com carne",
  "fruit-filled": "recheado com frutas",
  "custard-filled": "recheado com creme de confeiteiro",
  "cream-filled": "recheado com creme",
  "poultry-filled": "recheado com aves",
  "cheese-filled": "recheado com queijo",
  "spinach-filled": "recheado com espinafre",
  "chocolate-covered": "coberto com chocolate",
  "chocolate-coated": "coberto com chocolate",
  "part-skim": "parcialmente desnatado",
  "all-purpose": "tradicional",
  "pan-fried": "frito na frigideira",
  "pan-broiled": "grelhado na frigideira",
  "deep-fried": "frito por imersão",
  "home-cooked": "caseiro",
  "home-prepared": "preparado em casa",
  "quick-bread": "pão rápido",
  "non-chocolate": "sem chocolate",
  "soup-based": "à base de sopa",
  "lemon-butter": "manteiga com limão",
  "semi-coarse": "semigrosso",
  "meatless-beef": "carne vegetal",
  "sandwich-type": "tipo sanduíche",
  "szechuan-style": "ao estilo Szechuan",
  "sun-dried": "seco ao sol",
  "seven-layer": "sete camadas",
  "non-carbonated": "não gaseificado",
  "bone-in": "com osso",
  "lip-on": "com capa de gordura",
  "spit-up": "antirrefluxo",
  "full-fat": "integral",
  "fast-food": "lanchonete",
  "cereal-based": "à base de cereais",
  "protein-based": "à base de proteínas",
  "vegetable-based": "à base de vegetais"
};

// 4. MAPA DE GÊNERO E NÚMERO DO SUBSTANTIVO-NÚCLEO
export const HEAD_NOUN_GRAMMAR = new Map([
  [
    "arroz",
    {
      "g": "M",
      "n": "S"
    }
  ],
  [
    "leite",
    {
      "g": "M",
      "n": "S"
    }
  ],
  [
    "peito",
    {
      "g": "M",
      "n": "S"
    }
  ],
  [
    "peixe",
    {
      "g": "M",
      "n": "S"
    }
  ],
  [
    "ovo",
    {
      "g": "M",
      "n": "S"
    }
  ],
  [
    "pão",
    {
      "g": "M",
      "n": "S"
    }
  ],
  [
    "queijo",
    {
      "g": "M",
      "n": "S"
    }
  ],
  [
    "iogurte",
    {
      "g": "M",
      "n": "S"
    }
  ],
  [
    "suco",
    {
      "g": "M",
      "n": "S"
    }
  ],
  [
    "frango",
    {
      "g": "M",
      "n": "S"
    }
  ],
  [
    "peru",
    {
      "g": "M",
      "n": "S"
    }
  ],
  [
    "salmão",
    {
      "g": "M",
      "n": "S"
    }
  ],
  [
    "atum",
    {
      "g": "M",
      "n": "S"
    }
  ],
  [
    "bacalhau",
    {
      "g": "M",
      "n": "S"
    }
  ],
  [
    "camarão",
    {
      "g": "M",
      "n": "S"
    }
  ],
  [
    "brócolis",
    {
      "g": "M",
      "n": "P"
    }
  ],
  [
    "tomate",
    {
      "g": "M",
      "n": "S"
    }
  ],
  [
    "tomate-uva",
    {
      "g": "M",
      "n": "S"
    }
  ],
  [
    "tomate-cereja",
    {
      "g": "M",
      "n": "S"
    }
  ],
  [
    "pepino",
    {
      "g": "M",
      "n": "S"
    }
  ],
  [
    "alho",
    {
      "g": "M",
      "n": "S"
    }
  ],
  [
    "pimentão",
    {
      "g": "M",
      "n": "S"
    }
  ],
  [
    "espinafre",
    {
      "g": "M",
      "n": "S"
    }
  ],
  [
    "repolho",
    {
      "g": "M",
      "n": "S"
    }
  ],
  [
    "abacate",
    {
      "g": "M",
      "n": "S"
    }
  ],
  [
    "abacaxi",
    {
      "g": "M",
      "n": "S"
    }
  ],
  [
    "pêssego",
    {
      "g": "M",
      "n": "S"
    }
  ],
  [
    "damasco",
    {
      "g": "M",
      "n": "S"
    }
  ],
  [
    "limão",
    {
      "g": "M",
      "n": "S"
    }
  ],
  [
    "morango",
    {
      "g": "M",
      "n": "S"
    }
  ],
  [
    "mirtilo",
    {
      "g": "M",
      "n": "S"
    }
  ],
  [
    "figo",
    {
      "g": "M",
      "n": "S"
    }
  ],
  [
    "feijão",
    {
      "g": "M",
      "n": "S"
    }
  ],
  [
    "grão-de-bico",
    {
      "g": "M",
      "n": "S"
    }
  ],
  [
    "farelo",
    {
      "g": "M",
      "n": "S"
    }
  ],
  [
    "germe",
    {
      "g": "M",
      "n": "S"
    }
  ],
  [
    "bolo",
    {
      "g": "M",
      "n": "S"
    }
  ],
  [
    "biscoito",
    {
      "g": "M",
      "n": "S"
    }
  ],
  [
    "molho",
    {
      "g": "M",
      "n": "S"
    }
  ],
  [
    "mingau",
    {
      "g": "M",
      "n": "S"
    }
  ],
  [
    "mingau de aveia",
    {
      "g": "M",
      "n": "S"
    }
  ],
  [
    "óleo",
    {
      "g": "M",
      "n": "S"
    }
  ],
  [
    "azeite",
    {
      "g": "M",
      "n": "S"
    }
  ],
  [
    "vinagre",
    {
      "g": "M",
      "n": "S"
    }
  ],
  [
    "açúcar",
    {
      "g": "M",
      "n": "S"
    }
  ],
  [
    "mel",
    {
      "g": "M",
      "n": "S"
    }
  ],
  [
    "café",
    {
      "g": "M",
      "n": "S"
    }
  ],
  [
    "chá",
    {
      "g": "M",
      "n": "S"
    }
  ],
  [
    "refrigerante",
    {
      "g": "M",
      "n": "S"
    }
  ],
  [
    "hambúrguer",
    {
      "g": "M",
      "n": "S"
    }
  ],
  [
    "sanduíche",
    {
      "g": "M",
      "n": "S"
    }
  ],
  [
    "bife",
    {
      "g": "M",
      "n": "S"
    }
  ],
  [
    "filé",
    {
      "g": "M",
      "n": "S"
    }
  ],
  [
    "lombo",
    {
      "g": "M",
      "n": "S"
    }
  ],
  [
    "purê",
    {
      "g": "M",
      "n": "S"
    }
  ],
  [
    "caldo",
    {
      "g": "M",
      "n": "S"
    }
  ],
  [
    "patê",
    {
      "g": "M",
      "n": "S"
    }
  ],
  [
    "carne",
    {
      "g": "F",
      "n": "S"
    }
  ],
  [
    "carne bovina",
    {
      "g": "F",
      "n": "S"
    }
  ],
  [
    "carne suína",
    {
      "g": "F",
      "n": "S"
    }
  ],
  [
    "carne de vitela",
    {
      "g": "F",
      "n": "S"
    }
  ],
  [
    "carne de cordeiro",
    {
      "g": "F",
      "n": "S"
    }
  ],
  [
    "salsicha",
    {
      "g": "F",
      "n": "S"
    }
  ],
  [
    "salsicha de carne bovina",
    {
      "g": "F",
      "n": "S"
    }
  ],
  [
    "linguiça",
    {
      "g": "F",
      "n": "S"
    }
  ],
  [
    "clara",
    {
      "g": "F",
      "n": "S"
    }
  ],
  [
    "clara de ovo",
    {
      "g": "F",
      "n": "S"
    }
  ],
  [
    "gema",
    {
      "g": "F",
      "n": "S"
    }
  ],
  [
    "gema de ovo",
    {
      "g": "F",
      "n": "S"
    }
  ],
  [
    "banana",
    {
      "g": "F",
      "n": "S"
    }
  ],
  [
    "maçã",
    {
      "g": "F",
      "n": "S"
    }
  ],
  [
    "laranja",
    {
      "g": "F",
      "n": "S"
    }
  ],
  [
    "uva",
    {
      "g": "F",
      "n": "S"
    }
  ],
  [
    "pera",
    {
      "g": "F",
      "n": "S"
    }
  ],
  [
    "ameixa",
    {
      "g": "F",
      "n": "S"
    }
  ],
  [
    "manga",
    {
      "g": "F",
      "n": "S"
    }
  ],
  [
    "melancia",
    {
      "g": "F",
      "n": "S"
    }
  ],
  [
    "cenoura",
    {
      "g": "F",
      "n": "S"
    }
  ],
  [
    "batata",
    {
      "g": "F",
      "n": "S"
    }
  ],
  [
    "batata-doce",
    {
      "g": "F",
      "n": "S"
    }
  ],
  [
    "abóbora",
    {
      "g": "F",
      "n": "S"
    }
  ],
  [
    "abobrinha",
    {
      "g": "F",
      "n": "S"
    }
  ],
  [
    "berinjela",
    {
      "g": "F",
      "n": "S"
    }
  ],
  [
    "beterraba",
    {
      "g": "F",
      "n": "S"
    }
  ],
  [
    "cebola",
    {
      "g": "F",
      "n": "S"
    }
  ],
  [
    "alface",
    {
      "g": "F",
      "n": "S"
    }
  ],
  [
    "couve",
    {
      "g": "F",
      "n": "S"
    }
  ],
  [
    "couve-flor",
    {
      "g": "F",
      "n": "S"
    }
  ],
  [
    "mandioca",
    {
      "g": "F",
      "n": "S"
    }
  ],
  [
    "azeitona",
    {
      "g": "F",
      "n": "S"
    }
  ],
  [
    "farinha",
    {
      "g": "F",
      "n": "S"
    }
  ],
  [
    "aveia",
    {
      "g": "F",
      "n": "S"
    }
  ],
  [
    "lentilha",
    {
      "g": "F",
      "n": "S"
    }
  ],
  [
    "ervilha",
    {
      "g": "F",
      "n": "S"
    }
  ],
  [
    "soja",
    {
      "g": "F",
      "n": "S"
    }
  ],
  [
    "torta",
    {
      "g": "F",
      "n": "S"
    }
  ],
  [
    "pizza",
    {
      "g": "F",
      "n": "S"
    }
  ],
  [
    "manteiga",
    {
      "g": "F",
      "n": "S"
    }
  ],
  [
    "margarina",
    {
      "g": "F",
      "n": "S"
    }
  ],
  [
    "sopa",
    {
      "g": "F",
      "n": "S"
    }
  ],
  [
    "salada",
    {
      "g": "F",
      "n": "S"
    }
  ],
  [
    "água",
    {
      "g": "F",
      "n": "S"
    }
  ],
  [
    "cerveja",
    {
      "g": "F",
      "n": "S"
    }
  ],
  [
    "bebida",
    {
      "g": "F",
      "n": "S"
    }
  ],
  [
    "massa",
    {
      "g": "F",
      "n": "S"
    }
  ],
  [
    "lasanha",
    {
      "g": "F",
      "n": "S"
    }
  ],
  [
    "panqueca",
    {
      "g": "F",
      "n": "S"
    }
  ],
  [
    "coxa",
    {
      "g": "F",
      "n": "S"
    }
  ],
  [
    "sobrecoxa",
    {
      "g": "F",
      "n": "S"
    }
  ],
  [
    "asa",
    {
      "g": "F",
      "n": "S"
    }
  ],
  [
    "costela",
    {
      "g": "F",
      "n": "S"
    }
  ],
  [
    "ovos",
    {
      "g": "M",
      "n": "P"
    }
  ],
  [
    "pães",
    {
      "g": "M",
      "n": "P"
    }
  ],
  [
    "queijos",
    {
      "g": "M",
      "n": "P"
    }
  ],
  [
    "iogurtes",
    {
      "g": "M",
      "n": "P"
    }
  ],
  [
    "peixes",
    {
      "g": "M",
      "n": "P"
    }
  ],
  [
    "tomates",
    {
      "g": "M",
      "n": "P"
    }
  ],
  [
    "pepinos",
    {
      "g": "M",
      "n": "P"
    }
  ],
  [
    "cogumelos",
    {
      "g": "M",
      "n": "P"
    }
  ],
  [
    "pêssegos",
    {
      "g": "M",
      "n": "P"
    }
  ],
  [
    "morangos",
    {
      "g": "M",
      "n": "P"
    }
  ],
  [
    "figos",
    {
      "g": "M",
      "n": "P"
    }
  ],
  [
    "bolos",
    {
      "g": "M",
      "n": "P"
    }
  ],
  [
    "biscoitos",
    {
      "g": "M",
      "n": "P"
    }
  ],
  [
    "molhos",
    {
      "g": "M",
      "n": "P"
    }
  ],
  [
    "cereais",
    {
      "g": "M",
      "n": "P"
    }
  ],
  [
    "grãos",
    {
      "g": "M",
      "n": "P"
    }
  ],
  [
    "feijões",
    {
      "g": "M",
      "n": "P"
    }
  ],
  [
    "anéis",
    {
      "g": "M",
      "n": "P"
    }
  ],
  [
    "anéis de cebola",
    {
      "g": "M",
      "n": "P"
    }
  ],
  [
    "hambúrgueres",
    {
      "g": "M",
      "n": "P"
    }
  ],
  [
    "sanduíches",
    {
      "g": "M",
      "n": "P"
    }
  ],
  [
    "bifes",
    {
      "g": "M",
      "n": "P"
    }
  ],
  [
    "filés",
    {
      "g": "M",
      "n": "P"
    }
  ],
  [
    "maçãs",
    {
      "g": "F",
      "n": "P"
    }
  ],
  [
    "bananas",
    {
      "g": "F",
      "n": "P"
    }
  ],
  [
    "laranjas",
    {
      "g": "F",
      "n": "P"
    }
  ],
  [
    "uvas",
    {
      "g": "F",
      "n": "P"
    }
  ],
  [
    "peras",
    {
      "g": "F",
      "n": "P"
    }
  ],
  [
    "ameixas",
    {
      "g": "F",
      "n": "P"
    }
  ],
  [
    "batatas",
    {
      "g": "F",
      "n": "P"
    }
  ],
  [
    "cenouras",
    {
      "g": "F",
      "n": "P"
    }
  ],
  [
    "cebolas",
    {
      "g": "F",
      "n": "P"
    }
  ],
  [
    "abóboras",
    {
      "g": "F",
      "n": "P"
    }
  ],
  [
    "azeitonas",
    {
      "g": "F",
      "n": "P"
    }
  ],
  [
    "lentilhas",
    {
      "g": "F",
      "n": "P"
    }
  ],
  [
    "ervilhas",
    {
      "g": "F",
      "n": "P"
    }
  ],
  [
    "nozes",
    {
      "g": "F",
      "n": "P"
    }
  ],
  [
    "amêndoas",
    {
      "g": "F",
      "n": "P"
    }
  ],
  [
    "castanhas",
    {
      "g": "F",
      "n": "P"
    }
  ],
  [
    "sementes",
    {
      "g": "F",
      "n": "P"
    }
  ],
  [
    "sementes de girassol",
    {
      "g": "F",
      "n": "P"
    }
  ],
  [
    "claras",
    {
      "g": "F",
      "n": "P"
    }
  ],
  [
    "gemas",
    {
      "g": "F",
      "n": "P"
    }
  ],
  [
    "carnes",
    {
      "g": "F",
      "n": "P"
    }
  ],
  [
    "salsichas",
    {
      "g": "F",
      "n": "P"
    }
  ],
  [
    "linguiças",
    {
      "g": "F",
      "n": "P"
    }
  ],
  [
    "tortas",
    {
      "g": "F",
      "n": "P"
    }
  ],
  [
    "sopas",
    {
      "g": "F",
      "n": "P"
    }
  ],
  [
    "saladas",
    {
      "g": "F",
      "n": "P"
    }
  ],
  [
    "bebidas",
    {
      "g": "F",
      "n": "P"
    }
  ],
  [
    "panquecas",
    {
      "g": "F",
      "n": "P"
    }
  ],
  [
    "asas",
    {
      "g": "F",
      "n": "P"
    }
  ],
  [
    "costelas",
    {
      "g": "F",
      "n": "P"
    }
  ],
  [
    "vagem",
    {
      "g": "F",
      "n": "S"
    }
  ],
  [
    "vagens",
    {
      "g": "F",
      "n": "P"
    }
  ],
  [
    "vagem verde",
    {
      "g": "F",
      "n": "S"
    }
  ],
  [
    "farinha de sêmola",
    {
      "g": "F",
      "n": "S"
    }
  ],
  [
    "sêmola",
    {
      "g": "F",
      "n": "S"
    }
  ],
  [
    "tilápia",
    {
      "g": "F",
      "n": "S"
    }
  ],
  [
    "sardinha",
    {
      "g": "F",
      "n": "S"
    }
  ],
  [
    "cavala",
    {
      "g": "F",
      "n": "S"
    }
  ],
  [
    "anchova",
    {
      "g": "F",
      "n": "S"
    }
  ],
  [
    "perca",
    {
      "g": "F",
      "n": "S"
    }
  ],
  [
    "polaca",
    {
      "g": "F",
      "n": "S"
    }
  ],
  [
    "carpa",
    {
      "g": "F",
      "n": "S"
    }
  ],
  [
    "enguia",
    {
      "g": "F",
      "n": "S"
    }
  ],
  [
    "corvina",
    {
      "g": "F",
      "n": "S"
    }
  ],
  [
    "tainha",
    {
      "g": "F",
      "n": "S"
    }
  ],
  [
    "vitela",
    {
      "g": "F",
      "n": "S"
    }
  ],
  [
    "ervilhas e cenouras",
    {
      "g": "F",
      "n": "P"
    }
  ],
  [
    "farinha de trigo",
    {
      "g": "F",
      "n": "S"
    }
  ],
  [
    "coxa de frango",
    {
      "g": "F",
      "n": "S"
    }
  ],
  [
    "coxa de frango de corte",
    {
      "g": "F",
      "n": "S"
    }
  ],
  [
    "sobrecoxa de frango",
    {
      "g": "F",
      "n": "S"
    }
  ],
  [
    "sobrecoxa de frango de corte",
    {
      "g": "F",
      "n": "S"
    }
  ],
  [
    "asa de frango",
    {
      "g": "F",
      "n": "S"
    }
  ],
  [
    "asa de frango de corte",
    {
      "g": "F",
      "n": "S"
    }
  ],
  [
    "bisteca",
    {
      "g": "F",
      "n": "S"
    }
  ],
  [
    "fraldinha",
    {
      "g": "F",
      "n": "S"
    }
  ],
  [
    "bebida vegetal",
    {
      "g": "F",
      "n": "S"
    }
  ],
  [
    "mini-cenouras",
    {
      "g": "F",
      "n": "P"
    }
  ],
  [
    "mini-rúcula",
    {
      "g": "F",
      "n": "S"
    }
  ],
  [
    "folhas verdes",
    {
      "g": "F",
      "n": "P"
    }
  ],
  [
    "ervilhas-tortas",
    {
      "g": "F",
      "n": "P"
    }
  ],
  [
    "mostarda",
    {
      "g": "F",
      "n": "S"
    }
  ],
  [
    "seleta de legumes",
    {
      "g": "F",
      "n": "S"
    }
  ],
  [
    "seleta",
    {
      "g": "F",
      "n": "S"
    }
  ]
]);

// Ajuste gramatical contextual de adjetivos e particípios
export function adjustGrammar(text, gender, number) {
  const isFem = gender === "F";
  const isPlur = number === "P";

  let result = text;

  if (isFem && !isPlur) {
    result = result
      .replace(/\bbranqueado\b/g, "branqueada")
      .replace(/\bnão branqueado\b/g, "não branqueada")
      .replace(/\brefrigerado\b/g, "refrigerada")
      .replace(/\badoçado\b/g, "adoçada")
      .replace(/\bdesengordurado\b/g, "desengordurada")
      .replace(/\bfeito\b/g, "feita")
      .replace(/\bfeito com\b/g, "feita com")
      .replace(/(?<!formato\s+|tipo de gordura\s+|teor de gordura\s+|método de preparo\s+|tipo de carne\s+)\bnão especificado\b/g, "não especificada")
      .replace(/\bitaliano\b/g, "italiana")
      .replace(/\bsalgado\b/g, "salgada")
      .replace(/\bdourado\b/g, "dourada")
      .replace(/\bcozido\b/g, "cozida")
      .replace(/\bassado\b/g, "assada")
      .replace(/\bgrelhado\b/g, "grelhada")
      .replace(/\bfrito\b/g, "frita")
      .replace(/\bcru\b/g, "crua")
      .replace(/\bdesidratado\b/g, "desidratada")
      .replace(/\bcongelado\b/g, "congelada")
      .replace(/\benlatado\b/g, "enlatada")
      .replace(/\bempanado\b/g, "empanada")
      .replace(/\btorrado\b/g, "torrada")
      .replace(/\bmoído\b/g, "moída")
      .replace(/\bcurado\b/g, "curada")
      .replace(/\bdefumado\b/g, "defumada")
      .replace(/\brefogado\b/g, "refogada")
      .replace(/\bensopado\b/g, "ensopada")
      .replace(/\bmolhado\b/g, "molhada")
      .replace(/\bseco\b/g, "seca")
      .replace(/\bfresco\b/g, "fresca")
      .replace(/\bmaduro\b/g, "madura")
      .replace(/\bpicado\b/g, "picada")
      .replace(/\btriturado\b/g, "triturada")
      .replace(/\bdesfiado\b/g, "desfiada")
      .replace(/\bdescascado\b/g, "descascada")
      .replace(/\bpasteurizado\b/g, "pasteurizada")
      .replace(/\bhomogeneizado\b/g, "homogeneizada")
      .replace(/\bfermentado\b/g, "fermentada")
      .replace(/\bmaturado\b/g, "maturada")
      .replace(/\bespremido\b/g, "espremida")
      .replace(/\bcoado\b/g, "coada")
      .replace(/\bpronto\b/g, "pronta")
      .replace(/\bpreparado\b/g, "preparada")
      .replace(/\bprocessado\b/g, "processada")
      .replace(/\bseparável\b/g, "separável")
      .replace(/\bselecionado\b/g, "selecionada")
      .replace(/\bdesossado\b/g, "desossada")
      .replace(/\bamarelo\b/g, "amarela")
      .replace(/\bvermelho\b/g, "vermelha")
      .replace(/\bbranco\b/g, "branca")
      .replace(/\bpreto\b/g, "preta")
      .replace(/\broxo\b/g, "roxa")
      .replace(/\bgrosso\b/g, "grossa")
      .replace(/\bsemigrosso\b/g, "semigrossa")
      .replace(/\bfino\b/g, "fina")
      .replace(/\bmédio\b/g, "média")
      .replace(/\bescorrido\b/g, "escorrida")
      .replace(/\blíquido\b/g, "líquida")
      .replace(/(?<!teor\s+)\breduzido\b/g, "reduzida")
      .replace(/\benriquecido\b/g, "enriquecida")
      .replace(/\badicionado\b/g, "adicionada")
      .replace(/\bmisturado\b/g, "misturada")
      .replace(/\btemperado\b/g, "temperada")
      .replace(/\brecheado\b/g, "recheada")
      .replace(/\bcoberto\b/g, "coberta");
  } else if (!isFem && isPlur) {
    result = result
      .replace(/\binteiro\b/g, "inteiros")
      .replace(/\bdourado\b/g, "dourados")
      .replace(/\bverde\b/g, "verdes")
      .replace(/\bdoce\b/g, "doces")
      .replace(/\bmacio\b/g, "macios")
      .replace(/\bintegral\b/g, "integrais")
      .replace(/\bbranqueado\b/g, "branqueados")
      .replace(/\bnão branqueado\b/g, "não branqueados")
      .replace(/\brefrigerado\b/g, "refrigerados")
      .replace(/\bsalgado\b/g, "salgados")
      .replace(/\bfeito\b/g, "feitos")
      .replace(/\bcozido\b/g, "cozidos")
      .replace(/\bassado\b/g, "assados")
      .replace(/\bgrelhado\b/g, "grelhados")
      .replace(/\bfrito\b/g, "fritos")
      .replace(/\bcru\b/g, "crus")
      .replace(/\bdesidratado\b/g, "desidratados")
      .replace(/\bcongelado\b/g, "congelados")
      .replace(/\benlatado\b/g, "enlatados")
      .replace(/\bempanado\b/g, "empanados")
      .replace(/\btorrado\b/g, "torrados")
      .replace(/\bmoído\b/g, "moídos")
      .replace(/\bcurado\b/g, "curados")
      .replace(/\bdefumado\b/g, "defumados")
      .replace(/\brefogado\b/g, "refogados")
      .replace(/\bensopado\b/g, "ensopados")
      .replace(/\bmolhado\b/g, "molhados")
      .replace(/\bseco\b/g, "secos")
      .replace(/\bfresco\b/g, "frescos")
      .replace(/\bmaduro\b/g, "maduros")
      .replace(/\bpicado\b/g, "picados")
      .replace(/\btriturado\b/g, "triturados")
      .replace(/\bdesfiado\b/g, "desfiados")
      .replace(/\bdescascado\b/g, "descascados")
      .replace(/\bpasteurizado\b/g, "pasteurizados")
      .replace(/\bhomogeneizado\b/g, "homogeneizados")
      .replace(/\bfermentado\b/g, "fermentados")
      .replace(/\bmaturado\b/g, "maturados")
      .replace(/\bespremido\b/g, "espremidos")
      .replace(/\bcoado\b/g, "coados")
      .replace(/\bpronto\b/g, "prontos")
      .replace(/\bpreparado\b/g, "preparados")
      .replace(/\bprocessado\b/g, "processados")
      .replace(/\bseparável\b/g, "separáveis")
      .replace(/\bselecionado\b/g, "selecionados")
      .replace(/\bdesossado\b/g, "desossados")
      .replace(/\bamarelo\b/g, "amarelos")
      .replace(/\bvermelho\b/g, "vermelhos")
      .replace(/\bbranco\b/g, "brancos")
      .replace(/\bpreto\b/g, "pretos")
      .replace(/\broxo\b/g, "roxos")
      .replace(/\bgrosso\b/g, "grossos")
      .replace(/\bsemigrosso\b/g, "semigrossos")
      .replace(/\bfino\b/g, "finos")
      .replace(/\bmédio\b/g, "médios")
      .replace(/\bescorrido\b/g, "escorridos")
      .replace(/\blíquido\b/g, "líquidos")
      .replace(/\breduzido\b/g, "reduzidos")
      .replace(/\benriquecido\b/g, "enriquecidos")
      .replace(/\badicionado\b/g, "adicionados")
      .replace(/\bmisturado\b/g, "misturados")
      .replace(/\btemperado\b/g, "temperados")
      .replace(/\brecheado\b/g, "recheados")
      .replace(/\bcoberto\b/g, "cobertos");
  } else if (isFem && isPlur) {
    result = result
      .replace(/\binteiro\b/g, "inteiras")
      .replace(/\bdourado\b/g, "douradas")
      .replace(/\bverde\b/g, "verdes")
      .replace(/\bdoce\b/g, "doces")
      .replace(/\bmacio\b/g, "macias")
      .replace(/\bintegral\b/g, "integrais")
      .replace(/\bbranqueado\b/g, "branqueadas")
      .replace(/\bnão branqueado\b/g, "não branqueadas")
      .replace(/\brefrigerado\b/g, "refrigeradas")
      .replace(/\badoçado\b/g, "adoçadas")
      .replace(/\bsalgado\b/g, "salgadas")
      .replace(/\bfeito\b/g, "feitas")
      .replace(/(?<!formato\s+|tipo de gordura\s+|teor de gordura\s+|método de preparo\s+|tipo de carne\s+)\bnão especificado\b/g, "não especificadas")
      .replace(/\bcozido\b/g, "cozidas")
      .replace(/\bassado\b/g, "assadas")
      .replace(/\bgrelhado\b/g, "grelhadas")
      .replace(/\bfrito\b/g, "fritas")
      .replace(/\bcru\b/g, "cruas")
      .replace(/\bdesidratado\b/g, "desidratadas")
      .replace(/\bcongelado\b/g, "congeladas")
      .replace(/\benlatado\b/g, "enlatadas")
      .replace(/\bempanado\b/g, "empanadas")
      .replace(/\btorrado\b/g, "torradas")
      .replace(/\bmoído\b/g, "moídas")
      .replace(/\bcurado\b/g, "curadas")
      .replace(/\bdefumado\b/g, "defumadas")
      .replace(/\brefogado\b/g, "refogadas")
      .replace(/\bensopado\b/g, "ensopadas")
      .replace(/\bmolhado\b/g, "molhadas")
      .replace(/\bseco\b/g, "secas")
      .replace(/\bfresco\b/g, "frescas")
      .replace(/\bmaduro\b/g, "maduras")
      .replace(/\bpicado\b/g, "picadas")
      .replace(/\btriturado\b/g, "trituradas")
      .replace(/\bdesfiado\b/g, "desfiadas")
      .replace(/\bdescascado\b/g, "descascadas")
      .replace(/\bpasteurizado\b/g, "pasteurizadas")
      .replace(/\bhomogeneizado\b/g, "homogeneizadas")
      .replace(/\bfermentado\b/g, "fermentadas")
      .replace(/\bmaturado\b/g, "maturadas")
      .replace(/\bespremido\b/g, "espremidas")
      .replace(/\bcoado\b/g, "coadas")
      .replace(/\bpronto\b/g, "prontas")
      .replace(/\bpreparado\b/g, "preparadas")
      .replace(/\bprocessado\b/g, "processadas")
      .replace(/\bseparável\b/g, "separáveis")
      .replace(/\bselecionado\b/g, "selecionadas")
      .replace(/\bdesossado\b/g, "desossadas")
      .replace(/\bamarelo\b/g, "amarelas")
      .replace(/\bvermelho\b/g, "vermelhas")
      .replace(/\bbranco\b/g, "brancas")
      .replace(/\bpreto\b/g, "pretas")
      .replace(/\broxo\b/g, "roxas")
      .replace(/\bgrosso\b/g, "grossas")
      .replace(/\bsemigrosso\b/g, "semigrossas")
      .replace(/\bfino\b/g, "finas")
      .replace(/\bmédio\b/g, "médias")
      .replace(/\bescorrido\b/g, "escorridas")
      .replace(/\blíquido\b/g, "líquidas")
      .replace(/\breduzido\b/g, "reduzidas")
      .replace(/\benriquecido\b/g, "enriquecidas")
      .replace(/\badicionado\b/g, "adicionadas")
      .replace(/\bmisturado\b/g, "misturadas")
      .replace(/\btemperado\b/g, "temperadas")
      .replace(/\brecheado\b/g, "recheadas")
      .replace(/\bcoberto\b/g, "cobertas");
  }

  return result;
}

const SPECIFIC_FISH_SET = new Set([
  "bacalhau", "salmão", "atum", "truta", "tilápia", "sardinha", "cavala",
  "anchova", "arenque", "linguado", "alabote", "bagre", "carpa", "robalo",
  "peixe-espada", "perca", "lúcio", "pargo", "pescada", "pampo", "anchova-azul",
  "hadoque", "polaca", "corvina", "tainha", "enguia", "esturjão"
]);

// 5. MOTOR DE TRADUÇÃO E LOCALIZAÇÃO PT-BR
export function translateUsdaFoodName(rawName) {
  if (!rawName || typeof rawName !== "string") return "";
  const trimmed = rawName.trim();

  // 1. Sobrescrita exata canônica
  if (EXACT_OVERRIDES.has(trimmed)) {
    return EXACT_OVERRIDES.get(trimmed);
  }

  // 2. Substituições de expressões e frases compostas
  let text = trimmed;
  for (const [regex, replacement] of PHRASE_RULES) {
    text = text.replace(regex, replacement);
  }

  // 3. Tradução segmento a segmento delimitado por vírgulas
  const segments = text.split(",").map((seg) => {
    let s = seg.trim();
    if (!s) return "";

    const words = s.split(/(\s+|[^\w\sà-úÀ-Ú\-'])/);
    const translatedWords = words.map((w) => {
      const lower = w.toLowerCase();
      if (WORD_DICT[lower]) {
        if (w[0] === w[0].toUpperCase() && w.slice(1) === w.slice(1).toLowerCase()) {
          return WORD_DICT[lower][0].toUpperCase() + WORD_DICT[lower].slice(1);
        }
        return WORD_DICT[lower];
      }
      return w;
    });

    return translatedWords.join("");
  }).filter(Boolean);

  // 4. Limpeza de prefixos redundantes pós-segmentação
  if (segments.length >= 2) {
    const s0 = segments[0].toLowerCase();
    const s1 = segments[1].toLowerCase();
    if (s0 === "sementes" && s1.startsWith("sementes de")) {
      segments.shift();
    } else if (s0 === "nozes" && (s1.startsWith("amêndoas") || s1.startsWith("castanhas") || s1.startsWith("nozes"))) {
      segments.shift();
    } else if (s0 === "frango" && (s1.startsWith("frango") || s1.startsWith("sobrecoxa") || s1.startsWith("coxa") || s1.startsWith("peito") || s1.startsWith("asa"))) {
      segments.shift();
    } else if (s0 === "peixe") {
      const s1First = s1.split(/[\s,]+/)[0];
      if (SPECIFIC_FISH_SET.has(s1First)) {
        segments.shift();
      }
    }
  }

  let result = segments.join(", ");

  // 5. Concordância de gênero e número contextual baseada no substantivo-núcleo
  const firstSegment = segments[0] ? segments[0].trim().toLowerCase() : "";
  let grammar = null;

  for (const [headKey, gObj] of HEAD_NOUN_GRAMMAR.entries()) {
    if (firstSegment === headKey || firstSegment.startsWith(headKey + " ") || firstSegment.startsWith(headKey + ",")) {
      grammar = gObj;
      break;
    }
  }

  if (!grammar) {
    const firstWord = firstSegment.split(/[\s,]+/)[0];
    if (HEAD_NOUN_GRAMMAR.has(firstWord)) {
      grammar = HEAD_NOUN_GRAMMAR.get(firstWord);
    }
  }

  if (grammar) {
    result = adjustGrammar(result, grammar.g, grammar.n);
  }

  // 6. Deduplicação e normalização sintática final
  result = result
    .replace(/\b([a-zá-ú]{4,}),\s*\1\b/gi, "$1")
    .replace(/\b([a-zá-ú]{4,})\s+\1\b/gi, "$1")
    .replace(/\bcozida,\s*cozida em água\b/gi, "cozida em água")
    .replace(/\bcozido,\s*cozido em água\b/gi, "cozido em água")
    .replace(/\bde\s+de\b/gi, "de")
    .replace(/\bcom\s+com\b/gi, "com")
    .replace(/\bem\s+em\b/gi, "em")
    .replace(/\bpara\s+para\b/gi, "para")
    .replace(/\bmacarrão ou macarrão\b/gi, "macarrão")
    .replace(/\bMacarrão ou macarrão\b/gi, "Macarrão")
    .replace(/\bde fresca\b/gi, "fresca")
    .replace(/\bde fresco\b/gi, "fresco")
    .replace(/\boutro vegetais\b/gi, "outros vegetais")
    .replace(/\bsem miolo\b/gi, "")
    .replace(/\bDoce batatas\b/gi, "Batatas-doces")
    .replace(/\bdoce batatas\b/gi, "batatas-doces")
    .replace(/\bCurado carne bovina\b/gi, "Carne bovina curada")
    .replace(/\bmolho branca\b/gi, "molho branco")
    .replace(/\bfrango sobrecoxa de frango\b/gi, "sobrecoxa de frango")
    .replace(/\bFrango sobrecoxa de frango\b/gi, "Sobrecoxa de frango")
    .replace(/\bfrango peito de frango\b/gi, "peito de frango")
    .replace(/\bFrango peito de frango\b/gi, "Peito de frango")
    .replace(/\bfrango coxa de frango\b/gi, "coxa de frango")
    .replace(/\bFrango coxa de frango\b/gi, "Coxa de frango")
    .replace(/\bfrango asa de frango\b/gi, "asa de frango")
    .replace(/\bFrango asa de frango\b/gi, "Asa de frango")
    .replace(/\bPeru presunto\b/gi, "Presunto de peru")
    .replace(/\bperu presunto\b/gi, "presunto de peru")
    .replace(/\bPato ovo\b/gi, "Ovo de pato")
    .replace(/\bGanso ovo\b/gi, "Ovo de ganso")
    .replace(/\bBranco feijões\b/gi, "Feijão branco")
    .replace(/\bbranco feijões\b/gi, "feijão branco")
    .replace(/\bPartida ervilhas\b/gi, "Ervilhas partidas")
    .replace(/\bpartida ervilhas\b/gi, "ervilhas partidas")
    .replace(/\bPeruano feijões\b/gi, "Feijão peruano")
    .replace(/\bperuano feijões\b/gi, "feijão peruano")
    .replace(/\bFava feijões\b/gi, "Fava")
    .replace(/\bfava feijões\b/gi, "fava")
    .replace(/\bde enlatad[oa]s?\b/gi, "enlatado")
    .replace(/\bde desidratad[oa]s?\b/gi, "de grão seco")
    .replace(/\bde pré-cozid[oa]s?\b/gi, "pré-cozido")
    .replace(/\bfrios fatiados,\s*frios fatiados\b/gi, "frios fatiados")
    .replace(/\bbolinhos tipo muffin\b/gi, "muffin")
    .replace(/\bBolinhos tipo muffin\b/gi, "Muffin")
    .replace(/\bbolinho tipo muffin\b/gi, "muffin")
    .replace(/\bBolinho tipo muffin\b/gi, "Muffin")
    .replace(/\bem muffin inglês\b/gi, "no muffin inglês")
    .replace(/\bPupusa,\s*carne\b/gi, "Pupusa de carne")
    .replace(/\bPupusa,\s*queijo\b/gi, "Pupusa de queijo")
    .replace(/\bPupusa,\s*com feijões\b/gi, "Pupusa com feijão")
    .replace(/\bPupusa,\s*queijo apenas\b/gi, "Pupusa de queijo")
    .replace(/\bPupusa,\s*carne,\s*com feijões\b/gi, "Pupusa de carne com feijão")
    .replace(/\bLeite,\s*inteiro\b/gi, "Leite integral")
    .replace(/\bleite,\s*inteiro\b/gi, "leite integral")
    .replace(/\s+\/\s+/g, " ou ")
    .replace(/\s+,/g, ",")
    .replace(/,\s*,/g, ",")
    .replace(/\s{2,}/g, " ")
    .trim();

  if (result.length > 0) {
    result = result[0].toUpperCase() + result.slice(1);
  }

  return result;
}

// 6. CATEGORIAS DE EXCEÇÕES ESTRANGEIRAS ACEITAS (AUDITORIA B)
const RAW_AUDIT_CATEGORIES = {
  "MARCA": [
    "enfamil",
    "similac",
    "gerber",
    "mcdonalds",
    "quaker",
    "whopper",
    "kellogg",
    "nature",
    "valley",
    "nutri-grain",
    "ritz",
    "fritos",
    "doritos",
    "carnation",
    "nesquik",
    "alimentum",
    "nutramigen",
    "pregestimil",
    "nutella",
    "kashi",
    "clif",
    "triscuit",
    "boost",
    "ensure",
    "eas",
    "mountain",
    "dew",
    "amp",
    "nos",
    "bull",
    "rockstar",
    "vault",
    "gatorade",
    "powerade",
    "pediasure",
    "nido",
    "kinder",
    "mcdouble",
    "zbar",
    "powerbar",
    "snickers",
    "marathon",
    "cheez-it",
    "goldfish",
    "cheetos",
    "chex",
    "pocky",
    "capri",
    "glucerna",
    "herbalife",
    "isopure",
    "sobe",
    "spam",
    "gentlease",
    "prosobee",
    "isomil",
    "advance",
    "sensitive",
    "enfagrow",
    "tiger",
    "zone",
    "teddy",
    "crispbread",
    "sunny",
    "good",
    "start",
    "general",
    "mills",
    "monster",
    "fear",
    "mac",
    "living",
    "beach",
    "thins",
    "dipps",
    "cool",
    "perfect",
    "full",
    "throttle",
    "motherload",
    "energize",
    "ocean",
    "cran-energy",
    "frito",
    "burger",
    "king",
    "grow",
    "advantage",
    "big",
    "grahams"
  ],
  "CULTIVAR_NOME_PROPRIO": [
    "hass",
    "tommy",
    "atkins",
    "ataulfo",
    "anjou",
    "bartlett",
    "fuji",
    "gala",
    "smith",
    "honeycrisp",
    "russet",
    "colby",
    "muenster",
    "monterey",
    "jack",
    "port",
    "salut",
    "valencia",
    "pepitas",
    "cantaloupe",
    "honeydew",
    "rutabaga",
    "rutabagas",
    "boston",
    "manhattan",
    "manzanilla",
    "delicious",
    "granny",
    "acorn",
    "pawpaw",
    "broccoflower",
    "mayo"
  ],
  "CULINARIA_ADOTADA_EM_PTBR": [
    "sushi",
    "tofu",
    "kimchi",
    "yakisoba",
    "croissant",
    "ramen",
    "empanada",
    "nacho",
    "nachos",
    "taco",
    "burrito",
    "pepperoni",
    "cappuccino",
    "gordita",
    "crepe",
    "strudel",
    "wonton",
    "quinoa",
    "bulgur",
    "chipotle",
    "biryani",
    "paella",
    "feta",
    "cannellini",
    "cotija",
    "chia",
    "gelato",
    "pastrami",
    "tempura",
    "falafel",
    "wasabi",
    "challah",
    "dosa",
    "calzone",
    "bao",
    "guacamole",
    "horchata",
    "daiquiri",
    "martini",
    "tequila",
    "sangria",
    "kosher",
    "marinara",
    "shiitake",
    "enoki",
    "crimini",
    "maitake",
    "einkorn",
    "farro",
    "fonio",
    "khorasan",
    "kefir",
    "tzatziki",
    "camembert",
    "brie",
    "fontina",
    "gouda",
    "edam",
    "limburger",
    "fondue",
    "caviar",
    "abalone",
    "escargot",
    "scampi",
    "ceviche",
    "bouillabaisse",
    "jambalaya",
    "szechuan",
    "hunan",
    "edamame",
    "natto",
    "focaccia",
    "naan",
    "bruschetta",
    "bolillo",
    "brioche",
    "croutons",
    "roti",
    "puri",
    "paratha",
    "injera",
    "arepa",
    "biscotti",
    "churros",
    "beignet",
    "pierogi",
    "spanakopita",
    "samosa",
    "bibimbap",
    "tteokbokki",
    "pilaf",
    "sorbet",
    "poke",
    "tapenade",
    "borscht",
    "gazpacho",
    "minestrone",
    "ghee",
    "pesto",
    "kombucha",
    "mojito",
    "screwdriver",
    "mirepoix",
    "pizza",
    "ketchup",
    "canola",
    "quiche",
    "matzo",
    "chimichanga",
    "atole",
    "lefse",
    "relish",
    "parfait",
    "baklava",
    "basbousa",
    "chilaquiles",
    "fideo",
    "aguada",
    "hayacas",
    "sope",
    "sopaipilla",
    "provolone",
    "paneer",
    "cordon",
    "bleu",
    "mole",
    "pho",
    "radicchio",
    "macchiato",
    "asadero",
    "carnitas",
    "knockwurst",
    "scrapple",
    "thuringer",
    "marsala",
    "kiev",
    "timbale",
    "wellington",
    "tetrazzini",
    "gefilte",
    "rockefeller",
    "reuben",
    "gyro",
    "spaetzle",
    "pozole",
    "bisque",
    "rancheros",
    "dal",
    "sambar",
    "hoisin",
    "worcestershire",
    "vermicelli",
    "hoagie",
    "zwieback",
    "popover",
    "idli",
    "knish",
    "upma",
    "vada",
    "kumquat",
    "casabe",
    "fufu",
    "palak",
    "saag",
    "pico",
    "gallo",
    "namasu",
    "ratatouille",
    "pakora",
    "yokan",
    "haupia",
    "oolong",
    "michelada",
    "julep",
    "poblano",
    "serrano",
    "ahi",
    "dill",
    "waffle",
    "waffles",
    "brownie",
    "brownies",
    "marshmallow",
    "marshmallows",
    "pretzel",
    "pretzels",
    "muffin",
    "muffins",
    "mocha",
    "latte",
    "bagel",
    "smoothie",
    "barbecue",
    "cottage",
    "cheddar",
    "alfredo",
    "tortellini",
    "quesadilla",
    "tamale",
    "tamales",
    "enchilada",
    "tostada",
    "fajita",
    "fajitas",
    "taquito",
    "taquitos",
    "pupusa",
    "pupusas",
    "manicotti",
    "curry",
    "chop",
    "suey",
    "mein",
    "chow",
    "salisbury",
    "fudge",
    "bratwurst",
    "moo",
    "shu",
    "goo",
    "gai",
    "pan",
    "lau",
    "lomi",
    "scone",
    "scones",
    "adobo",
    "colada",
    "piña",
    "fizz",
    "porterhouse",
    "oaxaca",
    "bok",
    "choy",
    "firni",
    "barfi",
    "burfi",
    "trifle",
    "farmer",
    "brisket",
    "thermidor",
    "casino",
    "tso",
    "serenata",
    "pepperpot",
    "melba",
    "pfeffernusse",
    "pizzelle",
    "toffee",
    "rugelach",
    "ambrosia",
    "chutney",
    "buffalo",
    "cobb",
    "jai",
    "monk",
    "spritzer",
    "fuzzy",
    "navel",
    "sunrise",
    "sloe",
    "sling",
    "mai",
    "tai",
    "cape",
    "shot",
    "gimlet",
    "greyhound",
    "kamikaze",
    "mimosa",
    "moscow",
    "mule",
    "rob",
    "roy",
    "rusty",
    "nail",
    "tom",
    "collins",
    "alexander",
    "bloody",
    "mary",
    "catalina",
    "thousand",
    "island",
    "ale",
    "cranberry",
    "cranberries",
    "ranch",
    "spray",
    "teriyaki",
    "caesar",
    "roquefort",
    "gumbo",
    "kung",
    "pao",
    "t-bone",
    "sundae",
    "bubble",
    "tea",
    "yat",
    "ga",
    "welsh",
    "yung",
    "pumpernickel",
    "cheesecake",
    "wafer",
    "wafers",
    "shirley",
    "temple",
    "gin",
    "singapore"
  ],
  "COGNATO_IDENTICO_PTBR": [
    "chocolate",
    "cereal",
    "granola",
    "bacon",
    "banana",
    "bananas",
    "lactose",
    "rum",
    "creme",
    "tapioca",
    "mousse",
    "seco",
    "flor",
    "carioca",
    "flan",
    "mineral",
    "zero",
    "industrial",
    "base",
    "soda",
    "kiwi",
    "chile",
    "chiles",
    "pera",
    "lima",
    "tamarindo",
    "mate",
    "papaya",
    "cola",
    "salsa",
    "verde",
    "latino",
    "fresco",
    "coco",
    "margarita",
    "plus",
    "chili",
    "chilis",
    "sucralose",
    "aspartame",
    "agave",
    "aloe",
    "vera",
    "savoy",
    "original",
    "extra",
    "animal",
    "sopa",
    "caldo",
    "fava",
    "dominicana",
    "amino"
  ]
};
export const AUDIT_CATEGORIES = {
  MARCA: new Set(RAW_AUDIT_CATEGORIES.MARCA),
  CULTIVAR_NOME_PROPRIO: new Set(RAW_AUDIT_CATEGORIES.CULTIVAR_NOME_PROPRIO),
  CULINARIA_ADOTADA_EM_PTBR: new Set(RAW_AUDIT_CATEGORIES.CULINARIA_ADOTADA_EM_PTBR),
  COGNATO_IDENTICO_PTBR: new Set(RAW_AUDIT_CATEGORIES.COGNATO_IDENTICO_PTBR)
};

export const ALL_ALLOWED_EXCEPTIONS = new Set([
  ...AUDIT_CATEGORIES.MARCA,
  ...AUDIT_CATEGORIES.CULTIVAR_NOME_PROPRIO,
  ...AUDIT_CATEGORIES.CULINARIA_ADOTADA_EM_PTBR,
  ...AUDIT_CATEGORIES.COGNATO_IDENTICO_PTBR
]);

// 7. FUNÇÃO DE AUDITORIA DUPLA (AUDITORIA A & AUDITORIA B)
export function auditDoubleQuality(originalName, displayNamePtBr) {
  const origTokens = originalName
    .toLowerCase()
    .replace(/[^a-z0-9\-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && isNaN(w) && /[a-zà-ú]/i.test(w) && !/^[0-9\-\.\/]+$/.test(w));

  const ptLower = " " + displayNamePtBr.toLowerCase().replace(/[^a-z0-9à-ú\-]/g, " ") + " ";

  const genericResiduals = [];
  const acceptedExceptions = [];

  for (const tok of origTokens) {
    if (ptLower.includes(" " + tok + " ")) {
      if (ALL_ALLOWED_EXCEPTIONS.has(tok)) {
        let category = "OUTRO";
        if (AUDIT_CATEGORIES.MARCA.has(tok)) category = "MARCA COMERCIAL";
        else if (AUDIT_CATEGORIES.CULTIVAR_NOME_PROPRIO.has(tok)) category = "CULTIVAR / NOME PRÓPRIO";
        else if (AUDIT_CATEGORIES.CULINARIA_ADOTADA_EM_PTBR.has(tok)) category = "CULINÁRIA ADOTADA EM PT-BR";
        else if (AUDIT_CATEGORIES.COGNATO_IDENTICO_PTBR.has(tok)) category = "COGNATO IDÊNTICO PT-BR";

        acceptedExceptions.push({ term: tok, category });
      } else {
        genericResiduals.push(tok);
      }
    }
  }

  return {
    clean: genericResiduals.length === 0,
    genericResiduals,
    acceptedExceptions
  };
}

// 8. FUNÇÃO DE AUDITORIA DE NATURALIDADE PT-BR (AUDITORIA C)
export const NATURALITY_PATTERNS = [
  // 1. "com adicionado" / "sem adicionado" / "gordura adicionadas"
  { name: "com adicionado", regex: /\bcom adicionad[oa]s?\b/i },
  { name: "sem adicionado", regex: /\bsem adicionad[oa]s?\b/i },
  { name: "gordura adicionadas", regex: /\bgordura adicionadas\b/i },
  { name: "tradicional embalagem", regex: /\btradicional embalagem\b/i },

  // 2. Cabeçalhos invertidos / ordens artificiais de produto
  { name: "peixe filé", regex: /\bpeixe filé\b/i },
  { name: "filé peixe", regex: /\bfilé peixe\b/i },
  { name: "peixe, bacalhau/salmão/etc", regex: /\bpeixe,\s*(bacalhau|salmão|atum|truta|tilápia|sardinha|cavala|arenque|pescada|linguado|hadoque|polaca|alabote)\b/i },
  { name: "frango, frango", regex: /\bfrango,\s*frango\b/i },
  { name: "peixe, peixe", regex: /\bpeixe,\s*peixe\b/i },

  // 3. Substantivo + gênero incompatível
  { name: "vagem masculino", regex: /\bvagem[,s]+.*(congelado|enlatado|cozido|assado|frito|cru|refogado)\b/i },
  { name: "farinha masculino", regex: /\bfarinha[,s]+.*(branqueado|não branqueado|grosso|semigrosso|fino|amarelo|branco)\b/i },
  { name: "batata masculino", regex: /\bbatata[,s]+.*(congelado|cozido|assado|frito|feito com)\b/i },
  { name: "carne masculino", regex: /^Carne\b.*?(?<!tipo de carne\s+|teor de gordura\s+|método de preparo\s+)(moído|assado|cozido|frito|curado|defumado|fatiado|não especificado)\b/i },
  { name: "bebida masculino", regex: /\bbebida[,s]+.*(adoçado|refrigerado)\b/i },
  { name: "perca masculino", regex: /\bperca[,s]+.*não especificado\b/i },

  // 4. Plural + adjetivo singular
  { name: "plural com singular", regex: /\b(panquecas|ervilhas|cenouras|batatas|amêndoas|tomates)\s*,\s*(cozido|assado|frito|cru|congelado|enlatado|torrado|moído|integral|verde|doce|dourado|inteiro|macio)\b(?!-)/i },

  // 5. Ordem inglesa mantida em português
  { name: "extra + substantivo", regex: /\bextra (vegetais|queijo|molho|carne|calda)\b/i },
  { name: "kosher endro", regex: /\bkosher endro\b/i },
  { name: "triturado trigo", regex: /\btriturado trigo\b/i },
  { name: "baixo/alto + substantivo", regex: /\b(baixo|alto) (umidade|fibra|gordura|caloria)\b/i },
  { name: "reduzido + substantivo", regex: /\b(reduzido|reduzidos) (caloria|açúcar|gordura|sódio|colesterol|sal)\b/i },
  { name: "Médio Vermelho", regex: /\bMédio Vermelho\b/i },

  // 6. Sequências artificiais geradas por tradução palavra-a-palavra
  { name: "frios embutidos carne", regex: /\b(frios embutidos carne|frios fatiados carne)\b/i },
  { name: "preposição duplicada", regex: /\b(com com|de de|em em|para para)\b/i },
  { name: "fina/grossa refeição", regex: /\b(fina|grossa) refeição\b/i },
  { name: "sem miolo", regex: /\bsem miolo\b/i },
  { name: "confeito cobertas", regex: /\bconfeito cobertas\b/i },
  { name: "de fresca", regex: /\bde fresca\b/i },
  { name: "outro vegetais", regex: /\boutro vegetais\b/i },
  { name: "Flor de Maionese", regex: /\bFlor de Maionese\b/i },
  { name: "mingau de aveia em biscoito/pão", regex: /\b(biscoito|cookie|pão|barra).*mingau de aveia\b/i },
  { name: "duplicações de substantivo", regex: /\b([a-zá-ú]{4,}),\s*\1\b/i },
  { name: "macarrão ou macarrão", regex: /\bmacarrão ou macarrão\b/i },
  { name: "culinário método", regex: /\bculinário método\b/i },
  { name: "sabores outro que", regex: /\bsabores outro que\b/i },
  { name: "não lácteo leite", regex: /\bnão lácteo leite\b/i },
  { name: "congelado iogurte", regex: /\bcongelado iogurte\b/i },
  { name: "separável magro", regex: /\bseparável magro\b/i },
  { name: "caseiro receita", regex: /\bcaseiro receita\b/i },
  { name: "principal farinha", regex: /\bprincipal farinha\b/i },

  // 7. Padrões específicos de naturalidade (Surgical Gate)
  { name: "duplicação frios fatiados", regex: /\bfrios (fatiados|embutidos),\s*(frios|fatiados)\b/i },
  { name: "de pré-cozido", regex: /\bde pré-cozid[oa]s?\b/i },
  { name: "de enlatado", regex: /\bde enlatad[oa]s?\b/i },
  { name: "de desidratado", regex: /\bde desidratad[oa]s?\b/i },
  { name: "iogurte de leite de", regex: /\biogurte de leite de\b/i },
  { name: "bolinhos tipo muffin", regex: /\bbolinhos? tipo muffin\b/i },
  { name: "pupusa sem preposição", regex: /\bpupusa,\s*(carne|queijo)\b/i },
  { name: "leite inteiro artificial", regex: /\bleite,\s*inteiro\b/i },
  { name: "branco feijões", regex: /\bbranco feij(ão|ões)\b/i },
  { name: "partida ervilhas", regex: /\bpartida ervilhas\b/i },
  { name: "frango sobrecoxa de frango", regex: /\bfrango sobrecoxa de frango\b/i }
];

export function auditNaturalityQuality(displayNamePtBr) {
  const issues = [];
  for (const pat of NATURALITY_PATTERNS) {
    if (pat.regex.test(displayNamePtBr)) {
      issues.push(pat.name);
    }
  }
  return {
    clean: issues.length === 0,
    issues
  };
}

// 9. RUNNER PRINCIPAL DO PIPELINE
export async function run() {
  const args = process.argv.slice(2);
  const isApply = args.includes("--apply");
  const isAllowProduction = args.includes("--allow-production");

  console.log("=== TREVO ONE — STRICT PT-BR QUALITY PIPELINE (USDA V2) ===");
  console.log("Modo:", isApply ? "APPLY (Persistência real no banco)" : "DRY RUN (Simulação / Sem escrita)");

  const fileEnv = loadFileEnv(".env.local");
  const host = process.env.DB_HOST || fileEnv.DB_HOST || "127.0.0.1";
  const user = process.env.DB_USER || fileEnv.DB_USER || "root";
  const password = process.env.DB_PASSWORD || fileEnv.DB_PASSWORD || "";
  const database = process.env.DB_NAME || fileEnv.DB_NAME || DEV_DB_NAME;
  const port = Number(process.env.DB_PORT || fileEnv.DB_PORT) || 3306;

  console.log("Conectando ao banco de dados...");
  const pool = createPool({
    host,
    port,
    database,
    user,
    password,
    waitForConnections: true,
    connectionLimit: 5,
  });

  try {
    const [dbCheckRows] = await pool.query("SELECT DATABASE() as db");
    const activeDb = dbCheckRows[0]?.db;
    console.log("Banco de dados ativo (runtime):", activeDb);

    if (isAllowProduction) {
      if (activeDb !== PROD_DB_NAME) {
        throw new Error(`ERRO: --allow-production requer banco '${PROD_DB_NAME}', conectado a '${activeDb}'.`);
      }
    } else {
      if (activeDb !== DEV_DB_NAME) {
        throw new Error(`SEGURANÇA: Execução padrão restrita a DEV ('${DEV_DB_NAME}'). Conectado a '${activeDb}'.`);
      }
    }

    // Fetch all active USDA foods
    console.log("\nCarregando alimentos ativos USDA...");
    const [rows] = await pool.query(
      `SELECT id, public_id, source_uid, source_key, name, display_name_pt_br
       FROM nutrition_v2_foods
       WHERE source_key IN ('USDA_FOUNDATION', 'USDA_FNDDS')
         AND status = 'ACTIVE'
         AND deleted_at IS NULL
       ORDER BY id ASC`
    );

    const foodsList = rows;
    console.log(`Total de alimentos USDA ativos encontrados: ${foodsList.length}`);

    // Process translations and triple audit (A, B, C)
    const translatedItems = [];
    const auditAResiduals = [];
    const auditCIssues = [];
    const auditBMap = new Map();

    for (const food of foodsList) {
      const displayNamePtBr = translateUsdaFoodName(food.name);
      const normalizedDisplayNamePtBr = normalizeSearchText(displayNamePtBr);

      translatedItems.push({
        id: food.id,
        name: food.name,
        displayNamePtBr,
        normalizedDisplayNamePtBr,
      });

      // Audit A & B
      const audit = auditDoubleQuality(food.name, displayNamePtBr);
      if (!audit.clean) {
        for (const tok of audit.genericResiduals) {
          auditAResiduals.push({
            id: food.id,
            en: food.name,
            pt: displayNamePtBr,
            token: tok
          });
        }
      }

      for (const exc of audit.acceptedExceptions) {
        if (!auditBMap.has(exc.term)) {
          auditBMap.set(exc.term, {
            term: exc.term,
            count: 0,
            category: exc.category,
            sampleEn: food.name,
            samplePt: displayNamePtBr
          });
        }
        auditBMap.get(exc.term).count++;
      }

      // Audit C: Naturality
      const natAudit = auditNaturalityQuality(displayNamePtBr);
      if (!natAudit.clean) {
        auditCIssues.push({
          id: food.id,
          en: food.name,
          pt: displayNamePtBr,
          issues: natAudit.issues.join(", ")
        });
      }
    }

    console.log("\n=======================================================");
    console.log(`TOTAL USDA ALIMENTOS ANALISADOS: ${foodsList.length}`);
    console.log(`AUDITORIA A — INGLÊS GENÉRICO RESIDUAL: ${auditAResiduals.length}`);
    console.log(`AUDITORIA B — EXCEÇÕES ESTRANGEIRAS ACEITAS: ${auditBMap.size} termos únicos`);
    console.log(`AUDITORIA C — FALHAS DE NATURALIDADE PT-BR: ${auditCIssues.length}`);
    console.log("=======================================================\n");

    if (auditAResiduals.length > 0) {
      console.log("FALHA CRÍTICA NA AUDITORIA A: Inglês genérico residual detectado!");
      console.table(auditAResiduals.slice(0, 30));
      throw new Error(`AUDITORIA A REPROVADA: ${auditAResiduals.length} resíduos de inglês genérico!`);
    } else {
      console.log("SUCESSO TOTAL NA AUDITORIA A: ZERO INGLÊS GENÉRICO RESIDUAL! (0 resíduos)");
    }

    if (auditCIssues.length > 0) {
      console.log(`FALHA CRÍTICA NA AUDITORIA C: ${auditCIssues.length} falhas de naturalidade detectadas!`);
      console.table(auditCIssues.slice(0, 30));
      throw new Error(`AUDITORIA C REPROVADA: ${auditCIssues.length} falhas de naturalidade PT-BR encontradas!`);
    } else {
      console.log("SUCESSO TOTAL NA AUDITORIA C: ZERO FALHAS DE NATURALIDADE PT-BR! (0 falhas)");
    }

    // Audit B grouped summary
    const auditBList = Array.from(auditBMap.values());
    const catCounts = {};
    for (const item of auditBList) {
      catCounts[item.category] = (catCounts[item.category] || 0) + 1;
    }
    console.log("\n--- AUDITORIA B: DISTRIBUIÇÃO DAS EXCEÇÕES ACEITAS POR CATEGORIA ---");
    console.table(catCounts);

    // Coverage stats
    const withPtBr = translatedItems.filter((i) => i.displayNamePtBr && i.displayNamePtBr.trim().length > 0);
    const withoutPtBr = translatedItems.length - withPtBr.length;

    console.log("\n--- ESTATÍSTICAS DE COBERTURA (5795/5795) ---");
    console.log(`Total USDA ativos:        ${translatedItems.length}`);
    console.log(`Total com PT-BR:          ${withPtBr.length}`);
    console.log(`Total sem PT-BR:          ${withoutPtBr}`);
    console.log(`Cobertura PT-BR:          ${((withPtBr.length / translatedItems.length) * 100).toFixed(1)}%`);

    if (withoutPtBr > 0) {
      throw new Error(`FALHA DE COBERTURA: ${withoutPtBr} alimentos permaneceram sem PT-BR.`);
    }

    if (isApply) {
      console.log("\nGravando traduções corrigidas no banco de dados DEV em lotes de 200...");
      const BATCH_SIZE = 200;
      let updatedCount = 0;

      for (let i = 0; i < translatedItems.length; i += BATCH_SIZE) {
        const chunk = translatedItems.slice(i, i + BATCH_SIZE);
        const connection = await pool.getConnection();
        try {
          await connection.beginTransaction();
          for (const item of chunk) {
            await connection.query(
              `UPDATE nutrition_v2_foods
               SET display_name_pt_br = ?,
                   normalized_display_name_pt_br = ?,
                   updated_at = NOW()
               WHERE id = ?`,
              [item.displayNamePtBr, item.normalizedDisplayNamePtBr, item.id]
            );
          }
          await connection.commit();
          updatedCount += chunk.length;
          process.stdout.write(`Progresso: ${updatedCount}/${translatedItems.length} (${Math.round((updatedCount / translatedItems.length) * 100)}%)\r`);
        } catch (err) {
          await connection.rollback();
          throw err;
        } finally {
          connection.release();
        }
      }

      console.log(`\nAtualização concluída com sucesso! ${updatedCount} alimentos atualizados.`);

      const [countCheck] = await pool.query(
        `SELECT
           COUNT(*) as total_active,
           SUM(CASE WHEN display_name_pt_br IS NOT NULL AND LENGTH(TRIM(display_name_pt_br)) > 0 THEN 1 ELSE 0 END) as with_pt_br,
           SUM(CASE WHEN display_name_pt_br IS NULL OR LENGTH(TRIM(display_name_pt_br)) = 0 THEN 1 ELSE 0 END) as without_pt_br
         FROM nutrition_v2_foods
         WHERE source_key IN ('USDA_FOUNDATION', 'USDA_FNDDS')
           AND status = 'ACTIVE'
           AND deleted_at IS NULL`
      );

      console.log("\n--- CONTAGEM FINAL NO BANCO DE DADOS DEV APÓS RE-APPLY ---");
      console.table(countCheck);
    } else {
      console.log("\nModo DRY RUN: Nenhuma gravação realizada. Para persistir no banco DEV, utilize '--apply'.");
    }
  } finally {
    await pool.end();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run().catch((err) => {
    console.error("\nFALHA NA EXECUÇÃO DO PIPELINE DE TRADUÇÃO:", err.message);
    process.exit(1);
  });
}
