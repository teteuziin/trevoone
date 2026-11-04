# TREVO ONE — CHECKLIST DE GO-LIVE DO PILOTO ASAAS
## Consultoria Piloto: Saiya Shape (`saiya-shape`) — Fase Sandbox Real na Hostinger

Este documento estabelece o procedimento operacional padrão para a virada assistida do piloto de cobrança integrada Asaas para alunos da **Saiya Shape** na infraestrutura da Hostinger.

> [!IMPORTANT]
> **ESTE DOCUMENTO É APENAS UM GUIA DE PLANEJAMENTO.**
> Nenhuma ação descrita neste checklist deve ser executada sem autorização explícita e agendamento prévio. A branch de trabalho permanece `feat/asaas-pilot-saiya-shape` até homologação final aprovada.

---

## 1. Infraestrutura e Webhook

- [ ] **Suporte HTTPS da Hostinger:**
  - A hospedagem Business Node.js da Hostinger opera atrás de terminação TLS/SSL válida com certificado ativo.
  - A rota do Next.js App Router `app/api/webhooks/asaas/route.ts` aceita requisições `POST` públicas externas diretamente, sem necessidade de túneis ou intermediários.
- [ ] **URL Oficial para Cadastro no Painel Asaas:**
  - **Ambiente de Testes / Sandbox:**
    ```text
    https://trevoone.com.br/api/webhooks/asaas
    ```
    *(ou o domínio primário configurado na variável `APP_URL` do ambiente de produção)*
- [ ] **Parâmetros de Configuração do Webhook no Asaas:**
  - **Nome:** `Trevo One - Saiya Shape Webhook`
  - **Versão da API:** `3`
  - **Tipo de Envio:** `Não Sequencial` (Paralelo / Assíncrono) — *Garante que falhas temporárias em cobranças órfãs não bloqueiem a entrega de novos pagamentos.*
  - **Autenticação:** Ativar token de autenticação via cabeçalho `asaas-access-token`.
  - **Eventos Obrigatórios:**
    - `PAYMENT_RECEIVED` (Liquidação e baixa automática imediata)
    - `PAYMENT_CONFIRMED` (Confirmação de pagamento, aguardando compensação bancária)
    - `PAYMENT_REFUNDED` (Estorno com preenchimento de `refunded_at` para auditoria)

---

## 2. Variáveis de Ambiente no Servidor da Hostinger

Configurar as seguintes variáveis no painel da Hostinger (seção *Node.js -> Environment Variables* ou `.env.local` seguro da aplicação):

| Variável | Valor de Configuração | Finalidade / Regra de Segurança |
|---|---|---|
| `ASAAS_API_KEY` | `$aact_...` *(chave do Asaas Sandbox)* | Chave de autenticação da API. **Atenção:** Em variáveis de ambiente Node.js, valores iniciados por `$` são protegidos pelo runtime do Trevo One via `resolveAsaasApiKey()` contra expansão indevida. |
| `ASAAS_ENVIRONMENT` | `sandbox` | **Obrigatório:** Mantém o gateway restrito a testes reais. Trava de segurança no código rejeita qualquer execução se configurado como `production` nesta etapa. |
| `ASAAS_WEBHOOK_TOKEN` | *Token secreto exclusivo de 64 caracteres* | Token aleatório de alta entropia exclusivo para o webhook da Hostinger. **Nunca** reutilizar tokens usados em ambientes locais de desenvolvimento. |

---

## 3. Procedimento de Aplicação da Migration 075

A migration `075_asaas_integration.sql` prepara a estrutura de dados sem perda ou bloqueio destrutivo.

### Passo 1: Backup Prévio Obrigatório
1. Acessar o phpMyAdmin da Hostinger ou executar `mysqldump` do banco de produção.
2. Gerar dump completo (estrutura + dados) compactado com data e hora:
   ```bash
   mysqldump -u usuario_hostinger -p --single-transaction --quick trevo_one_prod > backup_pre_migration_075_$(date +%Y%m%d_%H%M%S).sql
   ```
3. Confirmar que o arquivo de backup foi gravado com sucesso e possui tamanho condizente.

### Passo 2: Janela de Baixo Tráfego
- Agendar a execução em horário de baixa utilização (ex: entre 00:00 e 05:00).

### Passo 3: Execução da Migration
- Executar o runner de migrations do projeto:
  ```bash
  node scripts/migrate-db.mjs --apply
  ```
- O runner executa idempotentemente até a versão `075`.

### Passo 4: Verificação Pós-Aplicação no MySQL
Confirmar no banco que as seguintes alterações foram consolidadas:
1. `consultancy_finance_settings`: colunas `asaas_enabled`, `asaas_api_key`, `asaas_environment`, `asaas_wallet_id`.
2. `student_charges`: colunas `asaas_payment_id`, `asaas_subscription_id`, `payment_method`, `asaas_invoice_url`, `asaas_status_raw`.
3. `student_payments`: colunas `receipt_id` anulável, `confirmed_by_user_id` anulável, `asaas_payment_id` e `refunded_at`.
4. Tabelas novas criadas: `asaas_customers` e `asaas_webhook_events`.

---

## 4. Flag de Ativação e Tenancy Estrito

Por padrão, a migration 075 define `asaas_enabled = 0` para todas as consultorias existentes.

### Habilitação Exclusiva da Saiya Shape:
```sql
UPDATE consultancy_finance_settings
SET asaas_enabled = 1,
    asaas_environment = 'SANDBOX',
    updated_at = CURRENT_TIMESTAMP(3)
WHERE consultancy_id = (SELECT id FROM consultancies WHERE slug = 'saiya-shape');
```

### Verificação de Tenancy Seguro:
Executar a query de auditoria abaixo para confirmar que **nenhuma outra consultoria** foi ativada acidentalmente:
```sql
SELECT c.id, c.slug, c.name, cfs.asaas_enabled, cfs.asaas_environment
FROM consultancies c
LEFT JOIN consultancy_finance_settings cfs ON cfs.consultancy_id = c.id;
```
*Critério de aceite:* Apenas `slug = 'saiya-shape'` deve retornar `asaas_enabled = 1`. Todas as demais devem constar como `0` ou `NULL`.

---

## 5. Plano de Rollback e Contingência

Se for necessário interromper o piloto imediatamente, seguir os passos abaixo:

### 1. Desativação Imediata (< 1 segundo)
Executar a query de desligamento no MySQL da Hostinger:
```sql
UPDATE consultancy_finance_settings
SET asaas_enabled = 0,
    updated_at = CURRENT_TIMESTAMP(3)
WHERE consultancy_id = (SELECT id FROM consultancies WHERE slug = 'saiya-shape');
```

### 2. Comportamento Operacional Pós-Rollback (Validado)
- **Novas Cobranças:** Passam a ser emitidas instantaneamente no fluxo legado de **Pix Manual com Comprovante**, sem erros de runtime.
- **Cobranças Asaas Já Abertas:** Não são duplicadas. O aluno continua visualizando o link/QR Code da cobrança emitida no Asaas e não é induzido a transferir para chave manual.
- **Webhooks Pendentes:** Continuam sendo processados normalmente pela rota `/api/webhooks/asaas`, permitindo que pagamentos realizados pelo aluno continuem recebendo baixa automática no sistema.

---

## 6. Monitoramento Inicial (Primeiras 48 a 72 Horas)

Durante os primeiros dias de operação do piloto na Hostinger:

1. **Auditoria de Eventos de Webhook:**
   Executar periodicamente para monitorar a taxa de processamento:
   ```sql
   SELECT id, asaas_payment_id, event_type, status, processed, processing_error, received_at
   FROM asaas_webhook_events
   ORDER BY id DESC
   LIMIT 30;
   ```
   *Objetivo:* Garantir `status = 'PROCESSED'`, `processed = 1` e `processing_error IS NULL` para todos os eventos da Saiya Shape.

2. **Detecção e Alerta de Cobranças Órfãs (`IGNORED_ORPHAN`):**
   Conferir se algum evento recebido do Asaas não encontrou correspondência no Trevo One:
   ```sql
   SELECT id, asaas_payment_id, event_type, status, processing_error, received_at
   FROM asaas_webhook_events
   WHERE status = 'IGNORED_ORPHAN'
   ORDER BY received_at DESC;
   ```
   - **Garantia contra Race Condition:** No fluxo normal da aplicação ([`lib/consultancies/finance.ts`](file:///c:/Users/User/trevo-one/lib/consultancies/finance.ts)), a cobrança é inserida e comitada no MariaDB (`await connection.commit()`) **antes** de enviar a chamada HTTP para criar a cobrança no Asaas. Além disso, o Asaas recebe `externalReference = charge.public_id`, e o webhook busca por `WHERE sc.asaas_payment_id = ? OR sc.public_id = ?`. Portanto, a cobrança já existe no banco no instante em que o Asaas gera a fatura.
   - **Salvaguarda de Reprocessamento Automático:** Caso ocorra uma anomalia (ex: timeout de rede no retorno da criação ou cobrança gerada avulsa), foi implementado o endpoint:
     `POST /api/internal/asaas-reprocess-orphans` (autenticado com `x-cron-secret` ou `asaas-access-token`) que reavalia eventos órfãos das últimas 24h e dá baixa automática assim que a cobrança estiver disponível no banco.
   - **Frequência Mínima no MVP:** Nos primeiros 3 dias de operação com alunos reais da Saiya Shape, executar a query acima manualmente **a cada 4 a 6 horas** (ou 2x ao dia). Caso algum registro seja retornado, acionar o endpoint de reprocessamento ou verificar se foi criado link avulso no painel do Asaas.

3. **Conciliação de Cobranças Emitidas e Liquidadas:**
   Conferir cobranças que possam ter divergência entre gateway e banco:
   ```sql
   SELECT sc.id, sc.public_id, sc.asaas_payment_id, sc.state, sc.asaas_status_raw, sp.id AS payment_id
   FROM student_charges sc
   LEFT JOIN student_payments sp ON sp.charge_id = sc.id
   WHERE sc.asaas_payment_id IS NOT NULL;
   ```

4. **Logs da Aplicação:**
   Acompanhar no painel da Hostinger para identificar eventuais respostas `401 Unauthorized` (indicação de token incorreto), `[Asaas Webhook WARN - ORPHAN]` ou `500 Internal Server Error`.

---

## 7. Critérios de Sucesso para Expansão

O piloto para a Saiya Shape será considerado bem-sucedido e elegível para expansão para outras consultorias após atender a todos os seguintes critérios:

- [ ] **Volume Mínimo:** 10 a 15 cobranças emitidas e liquidadas com sucesso via Pix e Boleto Asaas.
- [ ] **Baixa Instantânea:** 100% das liquidações ocorrendo em menos de 10 segundos após a confirmação no banco do aluno.
- [ ] **Zero Ação Manual:** Nenhuma necessidade de upload de comprovante de pagamento pelos alunos participantes do piloto.
- [ ] **Zero Regressão:** Nenhuma interferência nas operações de consultorias não participantes.
- [ ] **Auditoria Financeira:** Conciliação bancária 100% precisa entre os valores informados pelo Asaas e as baixas registradas no Trevo One.
