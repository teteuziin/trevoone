import fs from "node:fs";

const dataset = JSON.parse(fs.readFileSync("data/nutrition/ibge-pof-2008-2009.json", "utf8"));
const foods = dataset.foods;

const foodCodes = new Set();
const prepCodes = new Set();
const combinations = new Set();
const descriptions = new Set();

let energyCount = 0;
let proteinCount = 0;
let carbCount = 0;
let fatCount = 0;
let fiberCount = 0;
let sodiumCount = 0;
let calciumCount = 0;
let ironCount = 0;
let potassiumCount = 0;

for (const f of foods) {
  foodCodes.add(f.food_code);
  prepCodes.add(f.prep_code);
  combinations.add(`${f.food_code}:${f.prep_code}`);
  descriptions.add(f.name);
  if (f.calories_kcal != null) energyCount++;
  if (f.protein_g != null) proteinCount++;
  if (f.carbohydrate_g != null) carbCount++;
  if (f.fat_g != null) fatCount++;
  if (f.fiber_g != null) fiberCount++;
  if (f.micronutrients?.sodium_mg != null) sodiumCount++;
  if (f.micronutrients?.calcium_mg != null) calciumCount++;
  if (f.micronutrients?.iron_mg != null) ironCount++;
  if (f.micronutrients?.potassium_mg != null) potassiumCount++;
}

console.log("=== IBGE POF 2008-2009 AUDIT COUNTS ===");
console.log("TOTAL_RECORDS:", foods.length);
console.log("RAW_FOOD_CODES:", foodCodes.size);
console.log("RAW_PREPARATION_CODES:", prepCodes.size);
console.log("FOOD_PREPARATION_COMBINATIONS:", combinations.size);
console.log("UNIQUE_FOOD_DESCRIPTIONS:", descriptions.size);
console.log("ENERGY_COUNT:", energyCount);
console.log("PROTEIN_COUNT:", proteinCount);
console.log("CARB_COUNT:", carbCount);
console.log("FAT_COUNT:", fatCount);
console.log("FIBER_COUNT:", fiberCount);
console.log("SODIUM_COUNT:", sodiumCount);
console.log("CALCIUM_COUNT:", calciumCount);
console.log("IRON_COUNT:", ironCount);
console.log("POTASSIUM_COUNT:", potassiumCount);
