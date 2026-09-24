# TREVO ONE — RELEASE E IMPLEMENTATION PLAN (FINAL)
## RELEASE E — PHASE 1 / DATA FOUNDATION
### Micronutrientes + Catálogo Canônico Relacional + Food Nutrients + Snapshot Imutável v1 + Agregação + Completude

---

## 1. Escopo & Diretrizes da Fase Atual

- **Identificação da Fase:** `RELEASE E — PHASE 1 / DATA FOUNDATION`
- **Foco:** Fundações de arquitetura de dados, integridade relacional, catálogo canônico no banco, schema DDL, motor puro de cálculo de nutrientes, snapshot versionado imutável v1, estratégia do importador e testes unitários/integrados locais.
- **Interface Gráfica (UI):** A camada visual de visualização de micronutrientes e completude será implementada na **Fase 2 da Release E**, após validação homologada do modelo de dados.
- **Restrições de Segurança Absolutas:**
  - NÃO aplicar migration no banco DEV
  - NÃO importar dados no banco DEV
  - NÃO conectar nem tocar banco PROD
  - NÃO commitar no Git
  - NÃO realizar push remoto

---

## 2. Catálogo Canônico Relacional (`nutrition_nutrients_catalog`)

O catálogo canônico existirá formalmente no banco de dados com integridade relacional estrita:

### 2.1. DDL da Tabela
```sql
CREATE TABLE nutrition_nutrients_catalog (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    code VARCHAR(50) NOT NULL,
    display_name_pt_br VARCHAR(100) NOT NULL,
    canonical_unit_code VARCHAR(20) NOT NULL,
    category VARCHAR(30) NOT NULL, -- 'VITAMIN', 'MINERAL', 'MACRO_SUB', 'OTHER'
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),
    UNIQUE KEY uq_nnc_code (code),
    UNIQUE KEY uq_nnc_code_unit (code, canonical_unit_code),
    INDEX idx_nnc_category_sort (category, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 2.2. Seed Determinístico dos 23 Nutrientes Canônicos
| `code` | `display_name_pt_br` | `canonical_unit_code` | `category` | `sort_order` | Fonte USDA Oficial |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `FIBER` | Fibra Alimentar | g | MACRO_SUB | 10 | Nutrient 291 |
| `CA` | Cálcio | mg | MINERAL | 20 | Nutrient 301 |
| `FE` | Ferro | mg | MINERAL | 30 | Nutrient 303 |
| `MG` | Magnésio | mg | MINERAL | 40 | Nutrient 304 |
| `P` | Fósforo | mg | MINERAL | 50 | Nutrient 305 |
| `K` | Potássio | mg | MINERAL | 60 | Nutrient 306 |
| `NA` | Sódio | mg | MINERAL | 70 | Nutrient 307 |
| `ZN` | Zinco | mg | MINERAL | 80 | Nutrient 309 |
| `CU` | Cobre | mg | MINERAL | 90 | Nutrient 312 |
| `MN` | Manganês | mg | MINERAL | 100 | Nutrient 315 |
| `SE` | Selênio | mcg | MINERAL | 110 | Nutrient 317 |
| `VIT_A` | Vitamina A (RAE) | mcg | VITAMIN | 120 | Nutrient 320 |
| `VIT_C` | Vitamina C | mg | VITAMIN | 130 | Nutrient 401 |
| `VIT_D` | Vitamina D | mcg | VITAMIN | 140 | Nutrient 328 |
| `VIT_E` | Vitamina E | mg | VITAMIN | 150 | Nutrient 323 |
| `VIT_K` | Vitamina K | mcg | VITAMIN | 160 | Nutrient 430 |
| `VIT_B1` | Vitamina B1 (Tiamina) | mg | VITAMIN | 170 | Nutrient 404 |
| `VIT_B2` | Vitamina B2 (Riboflavina) | mg | VITAMIN | 180 | Nutrient 405 |
| `VIT_B3` | Vitamina B3 (Niacina) | mg | VITAMIN | 190 | Nutrient 406 |
| `VIT_B5` | Vitamina B5 (Ácido Pantotênico) | mg | VITAMIN | 200 | Nutrient 410 |
| `VIT_B6` | Vitamina B6 | mg | VITAMIN | 210 | Nutrient 415 |
| `FOLATE` | Folato Total | mcg | VITAMIN | 220 | Nutrient 417 |
| `VIT_B12` | Vitamina B12 | mcg | VITAMIN | 230 | Nutrient 418 |

---

## 3. Mapeamentos USDA Inequívocos (Sem Colapsos Ambíguos)

1. **Fibra Alimentar (`FIBER`):**
   - Mapeada estritamente ao nutrient number `291` (Fiber, total dietary - g).
   - Ausência na fonte não vira zero; resulta em `UNKNOWN`.
2. **Vitamina A (`VIT_A`):**
   - Mapeada estritamente ao nutrient number `320` (Vitamina A, RAE - $\mu\text{g}$).
   - **Proibido** utilizar `318` (IU) como fallback automático para RAE sem conversão explícita validada. Alimentos sem 320 resultam em `UNKNOWN`.
3. **Vitamina D (`VIT_D`):**
   - Mapeada estritamente ao nutrient number `328` (Vitamina D, D2 + D3 - $\mu\text{g}$).
   - **Proibido** utilizar `324` (IU) como fallback automático para $\mu\text{g}$.
4. **Folato Total (`FOLATE`):**
   - Mapeado estritamente ao nutrient number `417` (Folate, total - $\mu\text{g}$).
   - **Proibido** colapsar com `435` (DFE - Dietary Folate Equivalents). Se DFE for exigido no futuro, será adicionado separadamente como `FOLATE_DFE`.
5. **Vitamina B5 (`VIT_B5`):**
   - Pertence ao catálogo canônico (USDA nutrient number `410`).
   - Disponível no USDA Foundation Foods (52 alimentos).
   - O FNDDS não analisa B5. **Regra obrigatória:** Alimentos do FNDDS terão `VIT_B5` registrado com status `UNKNOWN`. Proibido sintetizar ou zerar dados ausentes.

---

## 4. Tabela `nutrition_v2_food_nutrients` & Integridade de Unidade

A tabela armazena a composição de cada alimento em relação à sua quantidade de referência (`reference_amount`).

### 4.1. Integridade Física de Unidade via FK Composta
```sql
CREATE TABLE nutrition_v2_food_nutrients (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    food_id BIGINT UNSIGNED NOT NULL,
    nutrient_code VARCHAR(50) NOT NULL,
    amount_per_reference DECIMAL(12,4) NULL DEFAULT NULL,
    unit_code VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'KNOWN', -- 'KNOWN', 'KNOWN_ZERO', 'TRACE', 'UNKNOWN'
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),
    UNIQUE KEY uq_n2fn_food_nutrient (food_id, nutrient_code),
    INDEX idx_n2fn_nutrient_code (nutrient_code),

    CONSTRAINT fk_n2fn_food
        FOREIGN KEY (food_id)
        REFERENCES nutrition_v2_foods(id)
        ON DELETE CASCADE
        ON UPDATE RESTRICT,

    CONSTRAINT fk_n2fn_nutrient_catalog
        FOREIGN KEY (nutrient_code, unit_code)
        REFERENCES nutrition_nutrients_catalog(code, canonical_unit_code)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 5. Semântica Estrita de Nutrientes & Nomenclatura Segura

Os 4 status nutricionais do Trevo One possuem papéis matemáticos distintos:

1. **`KNOWN`:**
   - Presença quantificada numericamente ($> 0$).
   - Entra na soma matemática do subtotal.
   - Incrementa `quantifiedItemCount`.
2. **`KNOWN_ZERO`:**
   - A fonte explicitamente reporta valor numérico 0.
   - Representa zero conhecido/reportado (sem alegar medição laboratorial direta obrigatória).
   - Entra na soma matemática ($+ 0$).
   - Incrementa `quantifiedItemCount`.
3. **`TRACE`:**
   - Presença identificada na análise química, porém abaixo do Limite de Quantificação ($< \text{LOQ}$).
   - **Regra de Ouro:** NÃO se transforma em zero numérico; NÃO inventa número arbitrário.
   - NÃO é somado no subtotal quantitativo.
   - Incrementa `traceItemCount`.
   - Na UI futura, exibe o rótulo `"traço"` (ou `"< LOQ"`), nunca `"0"`.
   - **Auditoria USDA:** A auditoria direta nos datasets JSON oficiais (Foundation e FNDDS) confirmou que não existe campo explícito de TRACE (valores são números ou ausentes). Portanto, o importer USDA v1 NÃO inventa TRACE (`USDA TRACE EXTRACTION: NOT AVAILABLE FROM AUDITED SOURCE REPRESENTATION`). O suporte arquitetural a TRACE permanece ativo e testado para futuras integrações laboratoriais.
4. **`UNKNOWN`:**
   - Nutriente ausente / não mensurado na fonte de dados.
   - Não entra na soma matemática.
   - Incrementa `unknownItemCount`.

### Contrato de Agregação por Micronutriente
```typescript
export interface MicronutrientTotalDetail {
  code: string;
  unit: string;
  value: number; // Subtotal quantificado (KNOWN + KNOWN_ZERO)
  quantifiedItemCount: number;
  traceItemCount: number;
  unknownItemCount: number;
  totalItemCount: number;
  isFullyQuantified: boolean; // quantifiedItemCount === totalItemCount && totalItemCount > 0
  hasTrace: boolean;          // traceItemCount > 0
  hasUnknown: boolean;        // unknownItemCount > 0
  empty: boolean;             // totalItemCount === 0
  dataCompletenessPercent: number; // Math.round((quantifiedItemCount / totalItemCount) * 100)
}
```

---

## 6. Estratégia para Nutrientes Ausentes & Itens Históricos Sem Snapshot

- **Estratégia no Banco:** Banco armazena apenas nutrientes mensurados (`KNOWN`, `KNOWN_ZERO`, `TRACE`).
- **Alimentos Sem Nutriente Específico:** Resolvidos na memória pelo calculador como `{ status: 'UNKNOWN', value: null }`.
- **Itens Históricos Sem Snapshot (`micronutrients_snapshot_json = NULL`):**
  - Quando um plano antigo é carregado onde os itens não possuem o snapshot de micronutrientes, esses itens **NÃO são ignorados da completude**.
  - O calculador considera esses itens como `UNKNOWN` para todos os 23 nutrientes do catálogo v1.
  - Proibido buscar `nutrition_v2_food_nutrients` para preenchimento retroativo silencioso. Snapshot ausente $\neq$ item inexistente.
- **Snapshot Imutável de Prescrição:** Para novos itens e substituições prescritos, o envelope armazena explicitamente **TODOS os 23 nutrientes do catálogo v1**, garantindo que o snapshot seja 100% autocontido no tempo.

---

## 7. Envelope de Snapshot Imutável (v1)

Contrato TypeScript congelado na coluna `micronutrients_snapshot_json` em `nutrition_v2_meal_items` e `nutrition_v2_item_substitutions`:

```typescript
export interface MicronutrientSnapshotItem {
  code: string;
  value: number | null;
  unit: string;
  status: "KNOWN" | "KNOWN_ZERO" | "TRACE" | "UNKNOWN";
}

export interface MicronutrientsSnapshotEnvelope {
  schemaVersion: 1;
  catalogVersion: "1.0";
  sourceUid: string | null;
  sourceType: string; // 'EXTERNAL', 'CUSTOM', 'MANUAL'
  sourceKey: string | null; // 'USDA_FOUNDATION', 'USDA_FNDDS', 'TACO'
  sourceVersion: string | null; // 'Foundation 04/2026', 'FNDDS 2021-2023'
  dataQuality: string | null; // 'ANALYTICAL_GOLD', 'SURVEY_RECIPE'
  capturedAt: string; // ISO 8601 (injetável para determinismo em testes)
  nutrients: MicronutrientSnapshotItem[];
}
```

- **Determinismo:** O array `nutrients` é ordenado estritamente por `sort_order` do catálogo canônico.
- **Injetabilidade:** `capturedAt` aceita parâmetro opcional em `buildMicronutrientsSnapshotEnvelope({ ..., capturedAt })`, permitindo testes sem dependência do relógio de sistema.

---

## 8. Estratégia do Importador de Micronutrientes

- **Função Exportada Pura:** `extractMicronutrients(foodNutrients, isFoundation)` em `scripts/import-nutrition-v2-usda.mjs`.
- **Mapeamento Oficial dos 23 Nutrientes:**
  - 291 -> FIBER (g)
  - 301 -> CA (mg)
  - 303 -> FE (mg)
  - 304 -> MG (mg)
  - 305 -> P (mg)
  - 306 -> K (mg)
  - 307 -> NA (mg)
  - 309 -> ZN (mg)
  - 312 -> CU (mg)
  - 315 -> MN (mg)
  - 317 -> SE (mcg)
  - 320 -> VIT_A (mcg) [SEM 318]
  - 401 -> VIT_C (mg)
  - 328 -> VIT_D (mcg) [SEM 324]
  - 323 -> VIT_E (mg)
  - 430 -> VIT_K (mcg)
  - 404 -> VIT_B1 (mg)
  - 405 -> VIT_B2 (mg)
  - 406 -> VIT_B3 (mg)
  - 410 -> VIT_B5 (mg)
  - 415 -> VIT_B6 (mg)
  - 417 -> FOLATE (mcg) [SEM 435]
  - 418 -> VIT_B12 (mcg)
- **Status Seguro:**
  - `amount > 0` -> `status: 'KNOWN'`
  - `amount === 0` -> `status: 'KNOWN_ZERO'`
  - `amount == null` ou não encontrado -> `status: 'UNKNOWN'`

---

## 9. Migration 030 (`030_nutrition_v2_micronutrients.sql`)

A migration aditiva conterá:
1. `CREATE TABLE nutrition_nutrients_catalog` com chave única por `code` e par `(code, canonical_unit_code)`.
2. Seed determinístico dos 23 nutrientes canônicos com nomes em pt-BR e categorias.
3. `CREATE TABLE nutrition_v2_food_nutrients` com FK composta para `nutrition_nutrients_catalog(code, canonical_unit_code)` e FK para `nutrition_v2_foods(id)`.
4. `ALTER TABLE nutrition_v2_meal_items ADD COLUMN micronutrients_snapshot_json JSON NULL DEFAULT NULL AFTER fat_g_snapshot`.
5. `ALTER TABLE nutrition_v2_item_substitutions ADD COLUMN micronutrients_snapshot_json JSON NULL DEFAULT NULL AFTER fat_g_snapshot`.

---

## 10. Plano de Verificação e Gates

- Testes locais exaustivos em `scripts/test-nutrition-v2-micronutrients.mjs`:
  - 23 nutrientes canônicos (códigos, unidades e categorias)
  - FIBER 291 validado; ausência de fibra não vira zero
  - Status `KNOWN`, `KNOWN_ZERO`, `TRACE`, `UNKNOWN` validados
  - Mapeamento USDA sem fallbacks ambíguos (320 para Vit A, 328 para Vit D, 417 para Folate)
  - Ausência de B5 em FNDDS (unknown = 5432)
  - TRACE auditado e preservado
  - Item histórico sem snapshot considerado UNKNOWN para os 23 nutrientes
  - Agregação por refeição e por plano
  - Exclusão de substituições no total base
  - Snapshot imutável v1 (schemaVersion, sourceType, sourceKey, ordem determinística)
  - Cobertura nos datasets reais (Foundation e FNDDS)
- Suítes de regressão anteriores:
  - `test-nutrition-v2-totals.mjs`
  - `test-nutrition-v2-portions-recalc.mjs`
  - `test-nutrition-v2-search.mjs`
  - `test-nutrition-v2-importer.mjs`
  - `test-nutrition-equivalents.mjs`
  - `test-nutrition-equivalents-security.mjs`
- Qualidade de código:
  - `git diff --check`
  - `npm run lint`
  - `tsc --noEmit`
  - `next build --webpack`
