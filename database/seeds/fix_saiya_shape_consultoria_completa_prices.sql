-- ============================================================================
-- TREVO ONE — CORREÇÃO DOS 5 PREÇOS DE CONSULTORIA COMPLETA (SAIYA SHAPE)
-- Banco de Dados: u406031981_trevoone
-- Consultoria: Saiya Shape (id = 2, slug = 'saiya-shape')
-- Objetivo: Corrigir exclusivamente os 5 planos de Consultoria Completa (10x -> 1x)
-- Valores corrigidos (amount_cents):
--   - Mensal:     350000  ->  35000  (R$ 350,00)
--   - Bimestral:  550000  ->  55000  (R$ 550,00)
--   - Trimestral: 850000  ->  85000  (R$ 850,00)
--   - Semestral: 1350000  -> 135000  (R$ 1.350,00)
--   - Anual:     2800000  -> 280000  (R$ 2.800,00)
-- Segurança: Procedimento Transacional com verificação de vínculos (cobranças/
-- assinaturas), validação dos valores anteriores, auditoria pós-update dos 15
-- planos oficiais e ROLLBACK automático se qualquer inconsistência for detectada.
-- ============================================================================

DELIMITER $$

DROP PROCEDURE IF EXISTS sp_fix_saiya_shape_completa_prices $$

CREATE PROCEDURE sp_fix_saiya_shape_completa_prices()
BEGIN
    DECLARE v_consultancy_id BIGINT UNSIGNED DEFAULT NULL;
    DECLARE v_linked_subscriptions INT DEFAULT 0;
    DECLARE v_linked_charges INT DEFAULT 0;
    DECLARE v_has_charge_plan_id_col INT DEFAULT 0;
    DECLARE v_previous_plans_count INT DEFAULT 0;
    DECLARE v_valid_individual_plans INT DEFAULT 0;
    DECLARE v_total_plans INT DEFAULT 0;
    DECLARE v_distinct_names INT DEFAULT 0;
    DECLARE v_total_cents BIGINT DEFAULT 0;

    -- HANDLER DE ERRO SQL: Qualquer erro imprevisto aciona ROLLBACK imediato e relança o erro
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    -- Início explícito da transação
    START TRANSACTION;

    -- ------------------------------------------------------------------------
    -- 1. VALIDAÇÃO DE IDENTIFICAÇÃO: Consultoria id = 2 e slug = 'saiya-shape'
    -- ------------------------------------------------------------------------
    SELECT id INTO v_consultancy_id
    FROM consultancies
    WHERE id = 2 AND slug = 'saiya-shape'
    LIMIT 1;

    IF v_consultancy_id IS NULL OR v_consultancy_id != 2 THEN
        ROLLBACK;
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'ERRO: Consultoria Saiya Shape (id=2, slug=saiya-shape) nao encontrada. Transacao revertida.';
    END IF;

    -- ------------------------------------------------------------------------
    -- 2. VERIFICAÇÃO DE VÍNCULOS: Cobranças ou Assinaturas que possam ser afetadas
    -- ------------------------------------------------------------------------
    -- A) Verifica assinaturas vinculadas na tabela student_plan_subscriptions
    SELECT COUNT(*) INTO v_linked_subscriptions
    FROM student_plan_subscriptions
    WHERE consultancy_id = 2
      AND plan_id IN (
          SELECT id 
          FROM consultancy_plans 
          WHERE consultancy_id = 2 
            AND name LIKE 'Consultoria Completa%'
      );

    -- B) Verifica cobranças vinculadas na tabela student_charges (caso a coluna plan_id exista)
    SELECT COUNT(*) INTO v_has_charge_plan_id_col
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'student_charges'
      AND COLUMN_NAME = 'plan_id';

    IF v_has_charge_plan_id_col > 0 THEN
        SET @sql_charges_check = 'SELECT COUNT(*) INTO @dynamic_charges_count FROM student_charges WHERE consultancy_id = 2 AND plan_id IN (SELECT id FROM consultancy_plans WHERE consultancy_id = 2 AND name LIKE \'Consultoria Completa%\')';
        PREPARE stmt_charges FROM @sql_charges_check;
        EXECUTE stmt_charges;
        DEALLOCATE PREPARE stmt_charges;
        SET v_linked_charges = @dynamic_charges_count;
    END IF;

    -- Se houver qualquer assinatura ou cobrança vinculada, aborta a operação por segurança
    IF v_linked_subscriptions > 0 OR v_linked_charges > 0 THEN
        ROLLBACK;
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'ERRO: Existem assinaturas ou cobrancas ativas vinculadas aos planos de Consultoria Completa. Revertido.';
    END IF;

    -- ------------------------------------------------------------------------
    -- 3. VALIDAÇÃO DOS VALORES ANTERIORES (Garante que os 5 planos estão em 10x)
    -- ------------------------------------------------------------------------
    SELECT COUNT(*) INTO v_previous_plans_count
    FROM consultancy_plans
    WHERE consultancy_id = 2
      AND status = 'ACTIVE'
      AND (
          (name = 'Consultoria Completa — Mensal' AND amount_cents = 350000) OR
          (name = 'Consultoria Completa — Bimestral' AND amount_cents = 550000) OR
          (name = 'Consultoria Completa — Trimestral' AND amount_cents = 850000) OR
          (name = 'Consultoria Completa — Semestral' AND amount_cents = 1350000) OR
          (name = 'Consultoria Completa — Anual' AND amount_cents = 2800000)
      );

    IF v_previous_plans_count != 5 THEN
        ROLLBACK;
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'ERRO: Os 5 planos de Consultoria Completa nao estao com os valores anteriores esperados (10x). Revertido.';
    END IF;

    -- ------------------------------------------------------------------------
    -- 4. ATUALIZAÇÃO RESTRITA DOS 5 PREÇOS (CONSULTORIA 2 EXCLUSIVA)
    -- ------------------------------------------------------------------------
    -- 1. Consultoria Completa — Mensal (350000 -> 35000)
    UPDATE consultancy_plans
    SET amount_cents = 35000,
        updated_at = NOW(3)
    WHERE consultancy_id = 2
      AND name = 'Consultoria Completa — Mensal'
      AND amount_cents = 350000;

    -- 2. Consultoria Completa — Bimestral (550000 -> 55000)
    UPDATE consultancy_plans
    SET amount_cents = 55000,
        updated_at = NOW(3)
    WHERE consultancy_id = 2
      AND name = 'Consultoria Completa — Bimestral'
      AND amount_cents = 550000;

    -- 3. Consultoria Completa — Trimestral (850000 -> 85000)
    UPDATE consultancy_plans
    SET amount_cents = 85000,
        updated_at = NOW(3)
    WHERE consultancy_id = 2
      AND name = 'Consultoria Completa — Trimestral'
      AND amount_cents = 850000;

    -- 4. Consultoria Completa — Semestral (1350000 -> 135000)
    UPDATE consultancy_plans
    SET amount_cents = 135000,
        updated_at = NOW(3)
    WHERE consultancy_id = 2
      AND name = 'Consultoria Completa — Semestral'
      AND amount_cents = 1350000;

    -- 5. Consultoria Completa — Anual (2800000 -> 280000)
    UPDATE consultancy_plans
    SET amount_cents = 280000,
        updated_at = NOW(3)
    WHERE consultancy_id = 2
      AND name = 'Consultoria Completa — Anual'
      AND amount_cents = 2800000;

    -- ------------------------------------------------------------------------
    -- 5. AUDITORIA INDIVIDUAL E CONJUNTA DOS 15 PLANOS OFICIAIS ANTES DO COMMIT
    -- ------------------------------------------------------------------------
    -- Validação individual estrita de cada um dos 15 planos da consultoria 2
    SELECT COUNT(*) INTO v_valid_individual_plans
    FROM consultancy_plans
    WHERE consultancy_id = 2
      AND status = 'ACTIVE'
      AND (
          -- Treino (100% preservados)
          (name = 'Treino — Mensal' AND duration_months = 1 AND amount_cents = 20000) OR
          (name = 'Treino — Bimestral' AND duration_months = 2 AND amount_cents = 30000) OR
          (name = 'Treino — Trimestral' AND duration_months = 3 AND amount_cents = 50000) OR
          (name = 'Treino — Semestral' AND duration_months = 6 AND amount_cents = 80000) OR
          (name = 'Treino — Anual' AND duration_months = 12 AND amount_cents = 170000) OR
          -- Nutrição (100% preservados)
          (name = 'Nutrição — Mensal' AND duration_months = 1 AND amount_cents = 20000) OR
          (name = 'Nutrição — Bimestral' AND duration_months = 2 AND amount_cents = 30000) OR
          (name = 'Nutrição — Trimestral' AND duration_months = 3 AND amount_cents = 50000) OR
          (name = 'Nutrição — Semestral' AND duration_months = 6 AND amount_cents = 80000) OR
          (name = 'Nutrição — Anual' AND duration_months = 12 AND amount_cents = 170000) OR
          -- Consultoria Completa (Valores corrigidos)
          (name = 'Consultoria Completa — Mensal' AND duration_months = 1 AND amount_cents = 35000) OR
          (name = 'Consultoria Completa — Bimestral' AND duration_months = 2 AND amount_cents = 55000) OR
          (name = 'Consultoria Completa — Trimestral' AND duration_months = 3 AND amount_cents = 85000) OR
          (name = 'Consultoria Completa — Semestral' AND duration_months = 6 AND amount_cents = 135000) OR
          (name = 'Consultoria Completa — Anual' AND duration_months = 12 AND amount_cents = 280000)
      );

    -- Auditoria de totais, contagem de nomes e soma de centavos
    SELECT 
        COUNT(*),
        COUNT(DISTINCT name),
        IFNULL(SUM(amount_cents), 0)
    INTO 
        v_total_plans,
        v_distinct_names,
        v_total_cents
    FROM consultancy_plans
    WHERE consultancy_id = 2;

    -- BLOQUEIO 1: Auditoria individual falhou
    IF v_valid_individual_plans != 15 THEN
        ROLLBACK;
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'ERRO: Auditoria individual falhou. Os 15 planos nao estao com precos/duracoes oficiais. Revertido.';
    END IF;

    -- BLOQUEIO 2: Contagem total ou nomes únicos diferente de 15
    IF v_total_plans != 15 OR v_distinct_names != 15 THEN
        ROLLBACK;
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'ERRO: Quantidade total ou nomes unicos diferente de 15 na consultoria 2. Transacao revertida.';
    END IF;

    -- BLOQUEIO 3: Soma total de centavos diverge de R$ 12.900,00
    IF v_total_cents != 1290000 THEN
        ROLLBACK;
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'ERRO: Soma total diverge de R$ 12.900,00 (esperado 1290000 centavos). Transacao revertida.';
    END IF;

    -- ------------------------------------------------------------------------
    -- 6. EFETIVAÇÃO DA TRANSAÇÃO (COMMIT EXCLUSIVO COM 100% DE SUCESSO)
    -- ------------------------------------------------------------------------
    COMMIT;

    -- Retorna relatório de confirmação
    SELECT 
        'SUCESSO' AS status_execucao,
        5 AS planos_corrigidos,
        v_valid_individual_plans AS planos_validados_individualmente,
        v_total_plans AS total_planos_consultoria_2,
        v_total_cents AS soma_centavos,
        'R$ 12.900,00' AS soma_formatada,
        'COMMIT EFETUADO COM SUCESSO' AS transacao;

END $$

DELIMITER ;

-- Executa o procedimento de correção segura
CALL sp_fix_saiya_shape_completa_prices();

-- Limpeza: remove o procedimento temporário após a execução
DROP PROCEDURE IF EXISTS sp_fix_saiya_shape_completa_prices;

-- ----------------------------------------------------------------------------
-- CONSULTA DE VERIFICAÇÃO FINAL: Lista detalhada dos 15 planos da Saiya Shape
-- ----------------------------------------------------------------------------
SELECT 
    cp.id,
    cp.name AS plano_nome,
    cp.duration_months AS meses,
    cp.amount_cents,
    CONCAT('R$ ', FORMAT(cp.amount_cents / 100, 2, 'de_DE')) AS preco_reais,
    cp.status,
    c.name AS consultoria_nome,
    DATE_FORMAT(cp.updated_at, '%d/%m/%Y %H:%i:%s') AS ultima_atualizacao
FROM consultancy_plans cp
JOIN consultancies c ON c.id = cp.consultancy_id
WHERE cp.consultancy_id = 2
ORDER BY 
    CASE 
        WHEN cp.name LIKE 'Treino%' THEN 1
        WHEN cp.name LIKE 'Nutrição%' THEN 2
        WHEN cp.name LIKE 'Consultoria Completa%' THEN 3
        ELSE 4
    END,
    cp.duration_months ASC;
