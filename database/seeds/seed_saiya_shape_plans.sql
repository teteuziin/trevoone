-- ============================================================================
-- TREVO ONE — CADASTRO DOS 15 PLANOS COMERCIAIS OFICIAIS DA SAIYA SHAPE
-- Banco de Dados: u406031981_trevoone
-- Consultoria: Saiya Shape (id = 2, slug = 'saiya-shape')
-- Administrador: user_id = 1 (Papel CONSULTANCY_ADMIN, Membro ACTIVE, Usuário ACTIVE)
-- Segurança: Procedimento Transacional Atômico com ROLLBACK Real e SIGNAL <= 128 chars
-- ============================================================================
-- NOTA ARQUITETURAL SOBRE TRANSAÇÕES NO PHPMYADMIN:
-- Requisições web no phpMyAdmin são HTTP stateless (cada execução utiliza uma
-- conexão independente). Dividir START TRANSACTION, INSERTs e COMMIT em cliques
-- separados NÃO é seguro, pois a conexão é encerrada ao fim da requisição HTTP
-- e o motor desfaz transações não confirmadas.
-- Portanto, a atomicidade real exige execução em sessão única via Stored Procedure
-- (ou sessão persistente via CLI/SSH com mysql cliente).
-- ============================================================================

DELIMITER $$

DROP PROCEDURE IF EXISTS sp_seed_saiya_shape_plans $$

CREATE PROCEDURE sp_seed_saiya_shape_plans()
BEGIN
    DECLARE v_consultancy_id BIGINT UNSIGNED DEFAULT NULL;
    DECLARE v_admin_user_id BIGINT UNSIGNED DEFAULT NULL;
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
    -- 1. VALIDAÇÃO DE PRÉ-CONDIÇÃO: Consultoria id = 2 e slug = 'saiya-shape'
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
    -- 2. VALIDAÇÃO DE PRÉ-CONDIÇÃO: Administrador user_id = 1 com perfil CONSULTANCY_ADMIN
    -- ------------------------------------------------------------------------
    SELECT cm.user_id INTO v_admin_user_id
    FROM consultancy_members cm
    INNER JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id
    INNER JOIN users u ON u.id = cm.user_id
    WHERE cm.consultancy_id = 2
      AND cm.user_id = 1
      AND cmr.role = 'CONSULTANCY_ADMIN'
      AND cm.status = 'ACTIVE'
      AND u.status = 'ACTIVE'
    LIMIT 1;

    IF v_admin_user_id IS NULL OR v_admin_user_id != 1 THEN
        ROLLBACK;
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'ERRO: Admin user_id=1 nao ativo com perfil CONSULTANCY_ADMIN na consultoria 2. Transacao revertida.';
    END IF;

    -- ------------------------------------------------------------------------
    -- 3. INSERÇÃO DOS 15 PLANOS COM IDEMPOTÊNCIA E ANCORAGEM RESTRITA
    -- ------------------------------------------------------------------------

    -- Categoria 1: Treino (Valores totais do pacote)
    -- 1. Treino — Mensal (1 mês | R$ 200,00 | 20000 centavos)
    INSERT INTO consultancy_plans (
        public_id, consultancy_id, name, description, amount_cents,
        currency_code, duration_days, duration_months, billing_cycle,
        assured_installments, is_available_for_purchase, payment_methods,
        status, created_by_user_id, created_at, updated_at
    )
    SELECT 
        UUID(), 2, 'Treino — Mensal', 'Acompanhamento de treino personalizado (1 mês)', 20000,
        'BRL', NULL, 1, 'MONTHLY',
        0, 1, 'PIX_AND_CARD',
        'ACTIVE', 1, NOW(3), NOW(3)
    WHERE NOT EXISTS (
        SELECT 1 FROM consultancy_plans 
        WHERE consultancy_id = 2 AND name = 'Treino — Mensal'
    );

    -- 2. Treino — Bimestral (2 meses | R$ 300,00 | 30000 centavos)
    INSERT INTO consultancy_plans (
        public_id, consultancy_id, name, description, amount_cents,
        currency_code, duration_days, duration_months, billing_cycle,
        assured_installments, is_available_for_purchase, payment_methods,
        status, created_by_user_id, created_at, updated_at
    )
    SELECT 
        UUID(), 2, 'Treino — Bimestral', 'Acompanhamento de treino personalizado (2 meses)', 30000,
        'BRL', NULL, 2, 'CUSTOM',
        0, 1, 'PIX_AND_CARD',
        'ACTIVE', 1, NOW(3), NOW(3)
    WHERE NOT EXISTS (
        SELECT 1 FROM consultancy_plans 
        WHERE consultancy_id = 2 AND name = 'Treino — Bimestral'
    );

    -- 3. Treino — Trimestral (3 meses | R$ 500,00 | 50000 centavos)
    INSERT INTO consultancy_plans (
        public_id, consultancy_id, name, description, amount_cents,
        currency_code, duration_days, duration_months, billing_cycle,
        assured_installments, is_available_for_purchase, payment_methods,
        status, created_by_user_id, created_at, updated_at
    )
    SELECT 
        UUID(), 2, 'Treino — Trimestral', 'Acompanhamento de treino personalizado (3 meses)', 50000,
        'BRL', NULL, 3, 'QUARTERLY',
        0, 1, 'PIX_AND_CARD',
        'ACTIVE', 1, NOW(3), NOW(3)
    WHERE NOT EXISTS (
        SELECT 1 FROM consultancy_plans 
        WHERE consultancy_id = 2 AND name = 'Treino — Trimestral'
    );

    -- 4. Treino — Semestral (6 meses | R$ 800,00 | 80000 centavos)
    INSERT INTO consultancy_plans (
        public_id, consultancy_id, name, description, amount_cents,
        currency_code, duration_days, duration_months, billing_cycle,
        assured_installments, is_available_for_purchase, payment_methods,
        status, created_by_user_id, created_at, updated_at
    )
    SELECT 
        UUID(), 2, 'Treino — Semestral', 'Acompanhamento de treino personalizado (6 meses)', 80000,
        'BRL', NULL, 6, 'SEMIANNUALLY',
        0, 1, 'PIX_AND_CARD',
        'ACTIVE', 1, NOW(3), NOW(3)
    WHERE NOT EXISTS (
        SELECT 1 FROM consultancy_plans 
        WHERE consultancy_id = 2 AND name = 'Treino — Semestral'
    );

    -- 5. Treino — Anual (12 meses | R$ 1.700,00 | 170000 centavos)
    INSERT INTO consultancy_plans (
        public_id, consultancy_id, name, description, amount_cents,
        currency_code, duration_days, duration_months, billing_cycle,
        assured_installments, is_available_for_purchase, payment_methods,
        status, created_by_user_id, created_at, updated_at
    )
    SELECT 
        UUID(), 2, 'Treino — Anual', 'Acompanhamento de treino personalizado (12 meses)', 170000,
        'BRL', NULL, 12, 'YEARLY',
        0, 1, 'PIX_AND_CARD',
        'ACTIVE', 1, NOW(3), NOW(3)
    WHERE NOT EXISTS (
        SELECT 1 FROM consultancy_plans 
        WHERE consultancy_id = 2 AND name = 'Treino — Anual'
    );

    -- Categoria 2: Nutrição (Valores totais do pacote)
    -- 6. Nutrição — Mensal (1 mês | R$ 200,00 | 20000 centavos)
    INSERT INTO consultancy_plans (
        public_id, consultancy_id, name, description, amount_cents,
        currency_code, duration_days, duration_months, billing_cycle,
        assured_installments, is_available_for_purchase, payment_methods,
        status, created_by_user_id, created_at, updated_at
    )
    SELECT 
        UUID(), 2, 'Nutrição — Mensal', 'Planejamento e acompanhamento nutricional personalizado (1 mês)', 20000,
        'BRL', NULL, 1, 'MONTHLY',
        0, 1, 'PIX_AND_CARD',
        'ACTIVE', 1, NOW(3), NOW(3)
    WHERE NOT EXISTS (
        SELECT 1 FROM consultancy_plans 
        WHERE consultancy_id = 2 AND name = 'Nutrição — Mensal'
    );

    -- 7. Nutrição — Bimestral (2 meses | R$ 300,00 | 30000 centavos)
    INSERT INTO consultancy_plans (
        public_id, consultancy_id, name, description, amount_cents,
        currency_code, duration_days, duration_months, billing_cycle,
        assured_installments, is_available_for_purchase, payment_methods,
        status, created_by_user_id, created_at, updated_at
    )
    SELECT 
        UUID(), 2, 'Nutrição — Bimestral', 'Planejamento e acompanhamento nutricional personalizado (2 meses)', 30000,
        'BRL', NULL, 2, 'CUSTOM',
        0, 1, 'PIX_AND_CARD',
        'ACTIVE', 1, NOW(3), NOW(3)
    WHERE NOT EXISTS (
        SELECT 1 FROM consultancy_plans 
        WHERE consultancy_id = 2 AND name = 'Nutrição — Bimestral'
    );

    -- 8. Nutrição — Trimestral (3 meses | R$ 500,00 | 50000 centavos)
    INSERT INTO consultancy_plans (
        public_id, consultancy_id, name, description, amount_cents,
        currency_code, duration_days, duration_months, billing_cycle,
        assured_installments, is_available_for_purchase, payment_methods,
        status, created_by_user_id, created_at, updated_at
    )
    SELECT 
        UUID(), 2, 'Nutrição — Trimestral', 'Planejamento e acompanhamento nutricional personalizado (3 meses)', 50000,
        'BRL', NULL, 3, 'QUARTERLY',
        0, 1, 'PIX_AND_CARD',
        'ACTIVE', 1, NOW(3), NOW(3)
    WHERE NOT EXISTS (
        SELECT 1 FROM consultancy_plans 
        WHERE consultancy_id = 2 AND name = 'Nutrição — Trimestral'
    );

    -- 9. Nutrição — Semestral (6 meses | R$ 800,00 | 80000 centavos)
    INSERT INTO consultancy_plans (
        public_id, consultancy_id, name, description, amount_cents,
        currency_code, duration_days, duration_months, billing_cycle,
        assured_installments, is_available_for_purchase, payment_methods,
        status, created_by_user_id, created_at, updated_at
    )
    SELECT 
        UUID(), 2, 'Nutrição — Semestral', 'Planejamento e acompanhamento nutricional personalizado (6 meses)', 80000,
        'BRL', NULL, 6, 'SEMIANNUALLY',
        0, 1, 'PIX_AND_CARD',
        'ACTIVE', 1, NOW(3), NOW(3)
    WHERE NOT EXISTS (
        SELECT 1 FROM consultancy_plans 
        WHERE consultancy_id = 2 AND name = 'Nutrição — Semestral'
    );

    -- 10. Nutrição — Anual (12 meses | R$ 1.700,00 | 170000 centavos)
    INSERT INTO consultancy_plans (
        public_id, consultancy_id, name, description, amount_cents,
        currency_code, duration_days, duration_months, billing_cycle,
        assured_installments, is_available_for_purchase, payment_methods,
        status, created_by_user_id, created_at, updated_at
    )
    SELECT 
        UUID(), 2, 'Nutrição — Anual', 'Planejamento e acompanhamento nutricional personalizado (12 meses)', 170000,
        'BRL', NULL, 12, 'YEARLY',
        0, 1, 'PIX_AND_CARD',
        'ACTIVE', 1, NOW(3), NOW(3)
    WHERE NOT EXISTS (
        SELECT 1 FROM consultancy_plans 
        WHERE consultancy_id = 2 AND name = 'Nutrição — Anual'
    );

    -- Categoria 3: Consultoria Completa (Valores totais do pacote)
    -- 11. Consultoria Completa — Mensal (1 mês | R$ 350,00 | 35000 centavos)
    INSERT INTO consultancy_plans (
        public_id, consultancy_id, name, description, amount_cents,
        currency_code, duration_days, duration_months, billing_cycle,
        assured_installments, is_available_for_purchase, payment_methods,
        status, created_by_user_id, created_at, updated_at
    )
    SELECT 
        UUID(), 2, 'Consultoria Completa — Mensal', 'Acompanhamento completo: treino e nutrição integrados (1 mês)', 35000,
        'BRL', NULL, 1, 'MONTHLY',
        0, 1, 'PIX_AND_CARD',
        'ACTIVE', 1, NOW(3), NOW(3)
    WHERE NOT EXISTS (
        SELECT 1 FROM consultancy_plans 
        WHERE consultancy_id = 2 AND name = 'Consultoria Completa — Mensal'
    );

    -- 12. Consultoria Completa — Bimestral (2 meses | R$ 550,00 | 55000 centavos)
    INSERT INTO consultancy_plans (
        public_id, consultancy_id, name, description, amount_cents,
        currency_code, duration_days, duration_months, billing_cycle,
        assured_installments, is_available_for_purchase, payment_methods,
        status, created_by_user_id, created_at, updated_at
    )
    SELECT 
        UUID(), 2, 'Consultoria Completa — Bimestral', 'Acompanhamento completo: treino e nutrição integrados (2 meses)', 55000,
        'BRL', NULL, 2, 'CUSTOM',
        0, 1, 'PIX_AND_CARD',
        'ACTIVE', 1, NOW(3), NOW(3)
    WHERE NOT EXISTS (
        SELECT 1 FROM consultancy_plans 
        WHERE consultancy_id = 2 AND name = 'Consultoria Completa — Bimestral'
    );

    -- 13. Consultoria Completa — Trimestral (3 meses | R$ 850,00 | 85000 centavos)
    INSERT INTO consultancy_plans (
        public_id, consultancy_id, name, description, amount_cents,
        currency_code, duration_days, duration_months, billing_cycle,
        assured_installments, is_available_for_purchase, payment_methods,
        status, created_by_user_id, created_at, updated_at
    )
    SELECT 
        UUID(), 2, 'Consultoria Completa — Trimestral', 'Acompanhamento completo: treino e nutrição integrados (3 meses)', 85000,
        'BRL', NULL, 3, 'QUARTERLY',
        0, 1, 'PIX_AND_CARD',
        'ACTIVE', 1, NOW(3), NOW(3)
    WHERE NOT EXISTS (
        SELECT 1 FROM consultancy_plans 
        WHERE consultancy_id = 2 AND name = 'Consultoria Completa — Trimestral'
    );

    -- 14. Consultoria Completa — Semestral (6 meses | R$ 1.350,00 | 135000 centavos)
    INSERT INTO consultancy_plans (
        public_id, consultancy_id, name, description, amount_cents,
        currency_code, duration_days, duration_months, billing_cycle,
        assured_installments, is_available_for_purchase, payment_methods,
        status, created_by_user_id, created_at, updated_at
    )
    SELECT 
        UUID(), 2, 'Consultoria Completa — Semestral', 'Acompanhamento completo: treino e nutrição integrados (6 meses)', 135000,
        'BRL', NULL, 6, 'SEMIANNUALLY',
        0, 1, 'PIX_AND_CARD',
        'ACTIVE', 1, NOW(3), NOW(3)
    WHERE NOT EXISTS (
        SELECT 1 FROM consultancy_plans 
        WHERE consultancy_id = 2 AND name = 'Consultoria Completa — Semestral'
    );

    -- 15. Consultoria Completa — Anual (12 meses | R$ 2.800,00 | 280000 centavos)
    INSERT INTO consultancy_plans (
        public_id, consultancy_id, name, description, amount_cents,
        currency_code, duration_days, duration_months, billing_cycle,
        assured_installments, is_available_for_purchase, payment_methods,
        status, created_by_user_id, created_at, updated_at
    )
    SELECT 
        UUID(), 2, 'Consultoria Completa — Anual', 'Acompanhamento completo: treino e nutrição integrados (12 meses)', 280000,
        'BRL', NULL, 12, 'YEARLY',
        0, 1, 'PIX_AND_CARD',
        'ACTIVE', 1, NOW(3), NOW(3)
    WHERE NOT EXISTS (
        SELECT 1 FROM consultancy_plans 
        WHERE consultancy_id = 2 AND name = 'Consultoria Completa — Anual'
    );

    -- ------------------------------------------------------------------------
    -- 4. VALIDAÇÃO INDIVIDUAL RIGOROSA DOS 15 PLANOS ANTES DO COMMIT
    -- ------------------------------------------------------------------------
    SELECT COUNT(*) INTO v_valid_individual_plans
    FROM consultancy_plans
    WHERE consultancy_id = 2
      AND status = 'ACTIVE'
      AND (
          (name = 'Treino — Mensal' AND duration_months = 1 AND billing_cycle = 'MONTHLY' AND amount_cents = 20000) OR
          (name = 'Treino — Bimestral' AND duration_months = 2 AND billing_cycle = 'CUSTOM' AND amount_cents = 30000) OR
          (name = 'Treino — Trimestral' AND duration_months = 3 AND billing_cycle = 'QUARTERLY' AND amount_cents = 50000) OR
          (name = 'Treino — Semestral' AND duration_months = 6 AND billing_cycle = 'SEMIANNUALLY' AND amount_cents = 80000) OR
          (name = 'Treino — Anual' AND duration_months = 12 AND billing_cycle = 'YEARLY' AND amount_cents = 170000) OR
          (name = 'Nutrição — Mensal' AND duration_months = 1 AND billing_cycle = 'MONTHLY' AND amount_cents = 20000) OR
          (name = 'Nutrição — Bimestral' AND duration_months = 2 AND billing_cycle = 'CUSTOM' AND amount_cents = 30000) OR
          (name = 'Nutrição — Trimestral' AND duration_months = 3 AND billing_cycle = 'QUARTERLY' AND amount_cents = 50000) OR
          (name = 'Nutrição — Semestral' AND duration_months = 6 AND billing_cycle = 'SEMIANNUALLY' AND amount_cents = 80000) OR
          (name = 'Nutrição — Anual' AND duration_months = 12 AND billing_cycle = 'YEARLY' AND amount_cents = 170000) OR
          (name = 'Consultoria Completa — Mensal' AND duration_months = 1 AND billing_cycle = 'MONTHLY' AND amount_cents = 35000) OR
          (name = 'Consultoria Completa — Bimestral' AND duration_months = 2 AND billing_cycle = 'CUSTOM' AND amount_cents = 55000) OR
          (name = 'Consultoria Completa — Trimestral' AND duration_months = 3 AND billing_cycle = 'QUARTERLY' AND amount_cents = 85000) OR
          (name = 'Consultoria Completa — Semestral' AND duration_months = 6 AND billing_cycle = 'SEMIANNUALLY' AND amount_cents = 135000) OR
          (name = 'Consultoria Completa — Anual' AND duration_months = 12 AND billing_cycle = 'YEARLY' AND amount_cents = 280000)
      );

    -- ------------------------------------------------------------------------
    -- 5. AUDITORIA GERAL DE INTEGRIDADE (QUANTIDADE, UNICIDADE E SOMA)
    -- ------------------------------------------------------------------------
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

    -- BLOQUEIO 1: Algum dos 15 planos falhou na verificação individual
    IF v_valid_individual_plans != 15 THEN
        ROLLBACK;
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'ERRO: Auditoria individual falhou. Planos ausentes ou divergentes em preco/duracao. Revertido.';
    END IF;

    -- BLOQUEIO 2: Quantidade total diferente de 15 ou nomes duplicados
    IF v_total_plans != 15 OR v_distinct_names != 15 THEN
        ROLLBACK;
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'ERRO: Quantidade total ou nomes unicos diferente de 15 na consultoria 2. Transacao revertida.';
    END IF;

    -- BLOQUEIO 3: Soma total de centavos diferente de 1290000 (R$ 12.900,00)
    IF v_total_cents != 1290000 THEN
        ROLLBACK;
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'ERRO: Soma total diverge de R$ 12.900,00 (esperado 1290000 centavos). Transacao revertida.';
    END IF;

    -- ------------------------------------------------------------------------
    -- 6. EFETIVAÇÃO DA TRANSAÇÃO (COMMIT EXCLUSIVO COM 100% DE CONFORMIDADE)
    -- ------------------------------------------------------------------------
    COMMIT;

    -- Retorna relatório final consolidado
    SELECT 
        'SUCESSO' AS status_execucao,
        v_valid_individual_plans AS planos_validados_individualmente,
        v_total_plans AS total_planos_consultoria_2,
        v_total_cents AS soma_centavos,
        'R$ 12.900,00' AS soma_formatada,
        'COMMIT EFETUADO COM SUCESSO' AS transacao;

END $$

DELIMITER ;

-- Executa o procedimento transacional seguro
CALL sp_seed_saiya_shape_plans();

-- Limpeza: remove o procedimento temporário após a execução
DROP PROCEDURE IF EXISTS sp_seed_saiya_shape_plans;
