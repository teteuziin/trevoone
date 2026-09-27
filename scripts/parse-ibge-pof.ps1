# scripts/parse-ibge-pof.ps1
# Parses official IBGE POF 2008-2009 nutritional tables (tabelacompleta.xls + tab01.xls)
# and generates canonical JSON dataset: data/nutrition/ibge-pof-2008-2009.json

$ErrorActionPreference = "Stop"

$baseDir = Split-Path -Parent $PSScriptRoot
$dataDir = Join-Path $baseDir "data\nutrition"
$tabelaCompletaPath = Join-Path $dataDir "tabelacompleta.xls"
$tab01Path = Join-Path $dataDir "tab01.xls"
$outputJsonPath = Join-Path $dataDir "ibge-pof-2008-2009.json"

Write-Host "=== INICIANDO PARSING DO DATASET OFICIAL IBGE POF 2008-2009 ==="

if (-not (Test-Path $tabelaCompletaPath)) {
    throw "Arquivo não encontrado: $tabelaCompletaPath"
}
if (-not (Test-Path $tab01Path)) {
    throw "Arquivo não encontrado: $tab01Path"
}

# 1. SHA-256 of source file
$sha256 = (Get-FileHash $tabelaCompletaPath -Algorithm SHA256).Hash.ToLower()
Write-Host "SHA-256 oficial tabelacompleta.xls: $sha256"

# 2. Build Category Map from tab01.xls
Write-Host "Mapeando categorias oficiais a partir de tab01.xls..."
$connTab01Str = "Provider=Microsoft.ACE.OLEDB.12.0;Data Source=$tab01Path;Extended Properties='Excel 8.0;HDR=NO;'"
$connTab01 = New-Object System.Data.OleDb.OleDbConnection($connTab01Str)
$connTab01.Open()
$cmdTab01 = $connTab01.CreateCommand()
$cmdTab01.CommandText = "SELECT * FROM ['Tabela1 $']"
$readerTab01 = $cmdTab01.ExecuteReader()

$currentCategory = "Miscelâneas"
$categoryMap = @{} # foodCode -> category

while ($readerTab01.Read()) {
    $c0 = $readerTab01.GetValue(0)
    $c1 = $readerTab01.GetValue(1)
    if ($c0 -ne [DBNull]::Value) {
        $t0 = $c0.ToString().Trim()
        if ($c1 -eq [DBNull]::Value) {
            if ($t0 -notmatch "Tabela|Código|Fonte|Notas") {
                $currentCategory = $t0
            }
        } else {
            if ($t0 -match "^\d+$") {
                $categoryMap[$t0] = $currentCategory
            }
        }
    }
}
$connTab01.Close()
Write-Host "Total de alimentos mapeados por categoria: $($categoryMap.Count)"

# Helper functions for text formatting
function To-TitleCasePtBr ($text) {
    if ([string]::IsNullOrWhiteSpace($text)) { return "" }
    $lower = $text.ToLower().Trim()
    $words = $lower -split '\s+'
    $lowerTokens = @("de", "da", "do", "das", "dos", "e", "em", "com", "sem", "ou", "para", "a", "o", "as", "os", "ao", "aos", "na", "no", "nas", "nos", "por")
    $resultWords = @()
    for ($i = 0; $i -lt $words.Length; $i++) {
        $w = $words[$i]
        if ($i -gt 0 -and $lowerTokens -contains $w) {
            $resultWords += $w
        } else {
            if ($w.Length -gt 1) {
                $resultWords += ($w.Substring(0, 1).ToUpper() + $w.Substring(1))
            } else {
                $resultWords += $w.ToUpper()
            }
        }
    }
    return ($resultWords -join " ")
}

function Clean-Preparation ($prepDesc) {
    if ([string]::IsNullOrWhiteSpace($prepDesc)) { return "" }
    $p = $prepDesc.Trim().ToUpper()
    if ($p -eq "NAO SE APLICA" -or $p -eq "NÃO SE APLICA") { return "" }
    if ($p -eq "CRU(A)") { return "cru" }
    if ($p -eq "COZIDO(A)") { return "cozido" }
    if ($p -eq "GRELHADO(A)/BRASA/CHURRASCO") { return "grelhado" }
    if ($p -eq "ASSADO(A)") { return "assado" }
    if ($p -eq "FRITO(A)") { return "frito" }
    if ($p -eq "REFOGADO(A)") { return "refogado" }
    if ($p -eq "EMPANADO(A)/A MILANESA") { return "à milanesa" }
    if ($p -eq "MOLHO VERMELHO") { return "ao molho vermelho" }
    if ($p -eq "MOLHO BRANCO") { return "ao molho branco" }
    if ($p -eq "ENSOPADO") { return "ensopado" }
    if ($p -eq "COZIDO NO VAPOR") { return "cozido no vapor" }
    if ($p -eq "CONCENTRADO") { return "concentrado" }
    if ($p -eq "DESIDRATADO") { return "desidratado" }
    return $p.ToLower()
}

function Parse-Num ($val) {
    if ($val -eq [DBNull]::Value) { return $null }
    $str = $val.ToString().Trim()
    if ($str -eq "" -or $str -eq "-" -or $str -eq "Tr" -or $str -eq "tr") { return $null }
    $clean = $str.Replace(",", ".")
    $num = 0.0
    if ([double]::TryParse($clean, [System.Globalization.NumberStyles]::Any, [System.Globalization.CultureInfo]::InvariantCulture, [ref]$num)) {
        return [Math]::Round($num, 2)
    }
    return $null
}

# 3. Read tabelacompleta.xls
Write-Host "Lendo tabelacompleta.xls via OLEDB..."
$connCompStr = "Provider=Microsoft.ACE.OLEDB.12.0;Data Source=$tabelaCompletaPath;Extended Properties='Excel 8.0;HDR=NO;'"
$connComp = New-Object System.Data.OleDb.OleDbConnection($connCompStr)
$connComp.Open()
$schemaComp = $connComp.GetOleDbSchemaTable([System.Data.OleDb.OleDbSchemaGuid]::Tables, $null)
$tableCompName = $schemaComp.Rows[2]["TABLE_NAME"]
$cmdComp = $connComp.CreateCommand()
$cmdComp.CommandText = "SELECT * FROM [$tableCompName]"
$readerComp = $cmdComp.ExecuteReader()

$foods = [System.Collections.Generic.List[object]]::new()
$r = 0

while ($readerComp.Read()) {
    if ($r -ge 4) {
        $rawCode = $readerComp.GetValue(0)
        $rawDesc = $readerComp.GetValue(1)
        $rawPrepCode = $readerComp.GetValue(2)
        $rawPrepDesc = $readerComp.GetValue(3)
        $rawRefCode = $readerComp.GetValue(4)
        $rawRefDesc = $readerComp.GetValue(5)

        if ($rawCode -ne [DBNull]::Value -and $rawDesc -ne [DBNull]::Value) {
            $foodCode = $rawCode.ToString().Trim()
            $foodDesc = $rawDesc.ToString().Trim()
            $prepCode = if ($rawPrepCode -ne [DBNull]::Value) { $rawPrepCode.ToString().Trim() } else { "99" }
            $prepDesc = if ($rawPrepDesc -ne [DBNull]::Value) { $rawPrepDesc.ToString().Trim() } else { "NAO SE APLICA" }
            $refCode = if ($rawRefCode -ne [DBNull]::Value) { $rawRefCode.ToString().Trim() } else { "" }
            $refDesc = if ($rawRefDesc -ne [DBNull]::Value) { $rawRefDesc.ToString().Trim() } else { "" }

            # Category
            $category = if ($categoryMap.ContainsKey($foodCode)) { $categoryMap[$foodCode] } else { "Outros" }

            # Format base name and display name
            $cleanBaseName = To-TitleCasePtBr $foodDesc
            $cleanPrep = Clean-Preparation $prepDesc

            $fullName = if ($cleanPrep -ne "") { "$cleanBaseName, $cleanPrep" } else { $cleanBaseName }

            # Custom aliases & display formatting for Brazilian staples
            $displayNamePtBr = $fullName
            $isTilapiaFish = ($foodCode -eq "7400101")
            $isOliveOil = ($foodCode -eq "8400101")

            if ($isTilapiaFish) {
                if ($cleanPrep -ne "") {
                    $displayNamePtBr = "Tilápia / Peixe de água doce, $cleanPrep"
                    $fullName = "Peixe de água doce (Tilápia, Saint Peter), $cleanPrep"
                } else {
                    $displayNamePtBr = "Tilápia / Peixe de água doce"
                    $fullName = "Peixe de água doce (Tilápia, Saint Peter)"
                }
            } elseif ($isOliveOil) {
                $displayNamePtBr = "Azeite de oliva"
                $fullName = "Azeite de oliva"
            }

            # Macros per 100g
            $kcal = Parse-Num $readerComp.GetValue(6)
            $prot = Parse-Num $readerComp.GetValue(7)
            $fat = Parse-Num $readerComp.GetValue(8)
            $carb = Parse-Num $readerComp.GetValue(9)
            $fiber = Parse-Num $readerComp.GetValue(10)

            # Essential minerals and vitamins
            $calcium = Parse-Num $readerComp.GetValue(11)
            $magnesium = Parse-Num $readerComp.GetValue(12)
            $phosphorus = Parse-Num $readerComp.GetValue(14)
            $iron = Parse-Num $readerComp.GetValue(15)
            $sodium = Parse-Num $readerComp.GetValue(16)
            $potassium = Parse-Num $readerComp.GetValue(18)
            $zinc = Parse-Num $readerComp.GetValue(20)
            $vitA = Parse-Num $readerComp.GetValue(23)
            $vitB1 = Parse-Num $readerComp.GetValue(24)
            $vitB2 = Parse-Num $readerComp.GetValue(25)
            $vitB3 = Parse-Num $readerComp.GetValue(26)
            $vitB6 = Parse-Num $readerComp.GetValue(28)
            $vitB12 = Parse-Num $readerComp.GetValue(29)
            $folate = Parse-Num $readerComp.GetValue(30)
            $vitD = Parse-Num $readerComp.GetValue(31)
            $vitE = Parse-Num $readerComp.GetValue(32)
            $vitC = Parse-Num $readerComp.GetValue(33)
            $cholesterol = Parse-Num $readerComp.GetValue(34)

            $sourceUid = "IBGE:POF 2008-2009:${foodCode}:${prepCode}"

            $foodObj = [ordered]@{
                source_external_code = "${foodCode}:${prepCode}"
                source_uid = $sourceUid
                food_code = $foodCode
                prep_code = $prepCode
                name = $fullName
                display_name_pt_br = $displayNamePtBr
                category = $category
                reference_amount = 100
                reference_unit_code = "G"
                calories_kcal = $kcal
                protein_g = $prot
                fat_g = $fat
                carbohydrate_g = $carb
                fiber_g = $fiber
                micronutrients = [ordered]@{
                    calcium_mg = $calcium
                    magnesium_mg = $magnesium
                    phosphorus_mg = $phosphorus
                    iron_mg = $iron
                    sodium_mg = $sodium
                    potassium_mg = $potassium
                    zinc_mg = $zinc
                    vitamin_a_mcg = $vitA
                    vitamin_b1_mg = $vitB1
                    vitamin_b2_mg = $vitB2
                    vitamin_b3_mg = $vitB3
                    vitamin_b6_mg = $vitB6
                    vitamin_b12_mcg = $vitB12
                    folate_mcg = $folate
                    vitamin_d_mcg = $vitD
                    vitamin_e_mg = $vitE
                    vitamin_c_mg = $vitC
                    cholesterol_mg = $cholesterol
                }
                ibge_meta = [ordered]@{
                    reference_code = $refCode
                    reference_description = $refDesc
                    is_taco_derived = ($refCode -eq "2")
                }
            }

            $foods.Add($foodObj)
        }
    }
    $r++
}
$connComp.Close()

Write-Host "Total de alimentos processados com sucesso: $($foods.Count)"

# 4. Generate JSON payload
$payload = [ordered]@{
    metadata = [ordered]@{
        source_key = "IBGE"
        source_label = "Tabela de Composição Nutricional dos Alimentos Consumidos no Brasil - IBGE / POF 2008-2009"
        edition = "1ª edição"
        year = 2011
        source_version = "POF 2008-2009 (2011)"
        source_reference = "IBGE - Pesquisa de Orçamentos Familiares 2008-2009 [SHA-256: $sha256]"
        source_imported_at = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        historical_source_sha256 = $sha256
        row_count = $foods.Count
    }
    foods = $foods
}

$jsonText = $payload | ConvertTo-Json -Depth 6
[System.IO.File]::WriteAllText($outputJsonPath, $jsonText, New-Object System.Text.UTF8Encoding($false))

Write-Host "Arquivo JSON gerado com sucesso em: $outputJsonPath"
Write-Host "Tamanho do arquivo: $((Get-Item $outputJsonPath).Length) bytes"
Write-Host "=== PARSING DO IBGE POF CONCLUÍDO COM SUCESSO ==="
