# TREVO ONE — PROMPT MESTRE DO PROJETO

Este documento contém as **regras permanentes de arquitetura, desenvolvimento, segurança, organização e qualidade do projeto**.

---

# 1. VISÃO GERAL DO PRODUTO
- Aplicação PWA responsiva multi-consultoria voltada ao nicho de saúde.
- Perfis de usuário: Aluno (STUDENT), Personal Trainer (PERSONAL), Nutricionista (NUTRITIONIST), Administrador da Consultoria (CONSULTANCY_ADMIN), Super Administrador do Trevo One (PLATFORM_ADMIN).
- Fluxo inicial: Splash/Loading -> Login -> Criar conta -> Recuperar senha -> Seleção de consultoria -> Identificação do papel -> Redirecionamento ao painel.

# 2. OBJETIVO TÉCNICO PRINCIPAL
- Aplicação Full-Stack Next.js ÚNICA (Next.js App Router).
- Interface React, Server Components, Server Actions, regras de negócio, Services, Repositories, MySQL (Hostinger).

# 3. STACK OFICIAL
- Next.js (App Router)
- React
- TypeScript
- Tailwind CSS
- Node.js 24 LTS
- MySQL (mysql2/promise com createPool)
- Git & GitHub
- Hostinger (Hospedagem Business)
- PWA

# 4. TECNOLOGIAS PROIBIDAS SEM AUTORIZAÇÃO EXPLÍCITA
- Vite, Express, NestJS, Fastify, Laravel, Firebase, Supabase, MongoDB, PostgreSQL, Prisma, Drizzle, Sequelize, GraphQL, tRPC, microservices, backend separado, frontend separado, Docker, Redis, Axios para comunicação interna.

# 5. REGRA SOBRE APIs
- SEM API REST/externa separada entre frontend e backend.
- Para operações internas preferir: Server Component / Client Component -> Server Action -> Service -> Repository -> MySQL.
- Route Handlers somente para webhooks ou integrações externas exigidas por terceiros.

# 6 & 7. BANCO DE DADOS E CONEXÃO
- MySQL da Hostinger.
- Conexão via `mysql2/promise` com `createPool()` centralizado (`src/lib/db/connection.ts`).

# 8 & 9. VARIÁVEIS DE AMBIENTE E SEGURANÇA
- Utilizar `.env.local` (nunca versionar secretas). Nunca usar `NEXT_PUBLIC_` para dados sensíveis ou credenciais de banco.
- O navegador NUNCA conversa diretamente com o MySQL.

# 10, 11 & 12. ESTRUTURA MULTI-CONSULTORIA, PERFIS E SEGREGAÇÃO
- Arquitetura multi-tenant onde 1 Usuário possui Participação + Papel em cada Consultoria.
- Roles centralizadas: `STUDENT`, `PERSONAL`, `NUTRITIONIST`, `CONSULTANCY_ADMIN`, `PLATFORM_ADMIN`.
- Segregação estrita por `consultancy_id` verificada no SERVIDOR.

# 13 & 14. DADOS DE SAÚDE E AUTENTICAÇÃO
- Tratar dados de saúde como informações altamente sensíveis. Mínimo acesso, autorização server-side.
- Nunca expor senhas, tokens ou dados de saúde em logs ou console de produção.
- Autenticação e autorização inteiramente server-side.

# 15. ORGANIZAÇÃO DO PROJETO
- Arquitetura por responsabilidade (`app/`, `components/`, `features/`, `lib/`, `services/`, `repositories/`, `types/`, `utils/`).
- Criar pastas conforme a necessidade da etapa.

# 16 & 17. SERVER COMPONENTS E SERVER ACTIONS
- Usar Server Components por padrão. `"use client";` apenas quando estritamente necessário.
- Server Actions acionam Services -> Repositories -> MySQL.

# 18 & 19. VALIDAÇÃO E PREVENÇÃO DE SQL INJECTION
- Validação server-side obrigatória para todas as entradas relevantes.
- NUNCA concatenar SQL. Usar sempre parâmetros preparados/placeholders `?`.

# 20 & 21. PERFORMANCE E PREVENÇÃO DE ERROS 504
- Pool de conexões, consultas otimizadas, sem queries desnecessárias/em loops. Buscar apenas campos necessários (evitar `SELECT *`).

# 22. PREVENÇÃO DE ERROS 404
- Usar Next.js App Router oficial. Testar rotas por navegação, acesso direto, F5 e build de produção.

# 23 & 24. HOSTINGER E DEPLOY
- Manter compatível com Hospedagem Business Node.js Hostinger.
- Executar `npm run lint` e `npm run build` antes de qualquer deploy. NUNCA usar `output: export` sem autorização.

# 25. TRATAMENTO DE ERROS
- Tratar erros sem revelar stack trace, SQL ou credenciais ao usuário. Exibir mensagens amigáveis.

# 26 & 27. DESIGN E MOBILE FIRST
- Saúde, confiança, modernidade. Predominância de branco, verde Trevo One como destaque, cinzas neutros, visual limpo.
- Mobile First (PWA). Testar 360px, 375px, 390px, 768px, 1024px, 1440px.

# 28, 29 & 30. PWA, ACESSIBILIDADE E COMPONENTES
- Manifest, ícones, display standalone, theme color.
- Acessibilidade: semântica HTML, rótulos, alto contraste, teclado.
- Reutilização sem abstração excessiva.

# 31, 32 & 33. TYPESCRIPT, QUALIDADE E DEPENDÊNCIAS
- Evitar `any` e `// @ts-ignore`.
- Código limpo, simples e sustentável.
- NUNCA instalar bibliotecas desnecessárias sem autorização.

# 34, 35 & 35. ESCOPO E PRESERVAÇÃO
- Focar exclusivamente na tarefa solicitada. Não alterar o que está funcionando.

# 36, 37 & 38. PROCESSO, VALIDAÇÕES E GIT
- Executar `npm run lint` e `npm run build`.
- Não fazer commit ou push automático sem permissão.

# 39 & 40. BANCO DE PRODUÇÃO E AMBIENTE
- NUNCA executar DROP, TRUNCATE ou alterações destrutivas em produção.

# 42, 43, 44 & 45. NOMENCLATURA, DATAS, MOEDA, TIMEZONE
- Código em inglês, UI em Português do Brasil.
- Formato de datas em UI: DD/MM/AAAA. Moeda: BRL / R$.

# 47 & 48. ESTADOS DE INTERFACE E MENSAGENS DE ERRO
- Sempre tratar estados: `loading`, `success`, `empty`, `error`.
- Mensagens amigáveis no front-end, logs técnicos no servidor sem expor secrets.

# 55. POLÍTICA DE CACHE, PWA E ATUALIZAÇÕES
- **REGRA DE OURO DE ATUALIZAÇÃO**: O Trevo One deve receber novas versões em produção sem exigir que o usuário limpe manualmente o cache do navegador ou utilize atalhos de atualização forçada (ex: Ctrl + F5). Exigir limpeza manual de cache nunca será aceito como solução normal de produto.
- **Cache de Assets Estáticos**: Assets imutáveis e versionados pelo build do Next.js (JS, CSS, chunks, fontes) devem utilizar cache eficiente com estratégias seguras de invalidação.
- **Navegação e Páginas HTML**: Páginas e rotas da aplicação (`/`, `/login`, `/cadastro`, `/recuperar-senha`, `/app`, painéis) não devem utilizar cache permanente que impeça o carregamento da versão atualizada após novos deploys.
- **Dados Autenticados e de Saúde**: Dados de usuários, vínculos com consultorias, treinos, dietas, avaliações e informações de saúde devem priorizar dados atualizados do servidor. É proibido aplicar cache offline automático para dados sensíveis de saúde sem análise prévia de segurança, criptografia, expiração e conformidade com a LGPD.
- **Service Worker e Bibliotecas PWA**: É proibido criar Service Worker (`sw.js`, `service-worker.js`) ou instalar bibliotecas PWA (`next-pwa`, `workbox`, `serwist`) sem planejamento e autorização explícita.
- **Versionamento de Cache e Purga**: Quando o Service Worker for implementado, os caches devem utilizar chaves versionadas (ex: `trevo-one-v1`) e incluir remoção automática de versões velhas obsoletas no evento de ativação.
- **Experiência de Atualização (UX)**: A detecção de nova versão deve notificar o usuário discretamente ("Nova versão disponível" -> "Atualizar"), recarregando de forma controlada sem interromper o preenchimento de formulários ou tarefas em andamento.
- **Segurança de Sessão e Logout**: O cache client-side jamais determina permissões ou papéis (ex: `localStorage.role`). A autorização ocorre 100% no servidor. O logout deve limpar qualquer armazenamento local associado à sessão no dispositivo.

# 56. REGRA MÁXIMA — ZERO PERDA DE QUALIDADE (HARDENING & PERFORMANCE)
- **Objetivo Central**: Tornar o Trevo One MAIS RÁPIDO + MAIS ESTÁVEL + MAIS COMPATÍVEL com a MESMA OU MELHOR QUALIDADE PERCEBIDA. Hardening NUNCA é simplificação.
- **Proibições Estritas**: É expressamente proibido melhorar performance através de:
  - Remoção de funcionalidades aprovadas
  - Redução de qualidade visual ou simplificação de layouts premium
  - Retirada de informações úteis
  - Remoção de imagens necessárias ou redução de resolução de originais de fotos privadas
  - Remoção de gráficos ou animações úteis sem justificativa
  - Desativação de offline ou PWA
  - Redução de segurança, histórico ou conteúdo (treinos/nutrição)
  - Mudança de identidade visual ou substituição de componentes premium por versões genéricas
- **Imagens**: Preservar original em qualidade total. Usar thumbnails, previews compactos e lazy loading apenas para evitar downloads desnecessários nas listagens; ao abrir zoom ou fullscreen, servir a qualidade original apropriada.
- **UI / Design**: O resultado visual após qualquer hardening deve ser equivalente ou superior ao atual. Validar regressões visuais em espaçamento, tipografia, wallpaper, cards, sombras, bordas, responsividade, Dark Mode, Light Mode, carrosséis, modais, drawers e navegação.
- **Animações**: Otimizar (transform, opacity, requestAnimationFrame, reduced-motion) em vez de remover arbitrariamente. Preservar a sensação fluida e premium.
- **Dados & Backend**: Priorizar queries eficientes com índices, deduplicação, paginação, paralelização segura (`Promise.all`), carregamento progressivo e Server Components em vez de cortar dados úteis.
- **Bundle & JS**: Reduzir JavaScript por code splitting, `dynamic import()`, Server Components e tree shaking, sem nunca cortar recursos para bater métricas.
- **Percepção do Usuário**: A experiência deve transmitir: *"é o mesmo Trevo One, só que mais rápido"*, e nunca *"o app ficou mais simples"*.
- **Regression Gate**: Toda rota otimizada deve manter funcionalidade (igual/melhor), visual (igual/melhor), velocidade (melhor/equivalente), estabilidade (melhor) e segurança (igual/melhor).
- **STOP RULE**: Se qualquer otimização de performance exigir trade-off visível de qualidade ou funcionalidade, NÃO implementar automaticamente. Reportar: (1) ganho estimado, (2) perda de qualidade e (3) alternativa sem perda, aguardando aprovação explícita.

# 57. REGRA DE NÃO REGRESSÃO — OBRIGATÓRIA

## 1. Princípio Fundamental & Objetivo Permanente
- Esta alteração **NÃO pode piorar a experiência atual dos usuários**.
- **Objetivo Permanente**: O usuário existente deve perceber: *"algo melhorou"*, e nunca: *"algo que funcionava parou de funcionar"*.

## 2. Perfis Protegidos
Toda análise de impacto deve considerar explicitamente e sem omissões:
- `STUDENT`
- `PERSONAL`
- `NUTRITIONIST`
- `CONSULTANCY_ADMIN`
- `INFLUENCER` / `VIP`
- `PLATFORM_ADMIN`
*Nenhum perfil pode ser omitido.*

## 3. Multi-Role & Modo Efetivo
Usuários com múltiplos papéis precisam ser tratados como cenário obrigatório de regressão. Toda alteração relacionada a:
- Dashboard
- Navegação
- Permissões
- Consultoria
- Aluno
- Treino
- Nutrição
- Evolução
- Financeiro

Deve verificar obrigatoriamente:
- Active role
- Effective mode
- Troca de modo
- Refresh após troca de modo
- Deep links
- Acesso direto por URL
*Regra*: Uma alteração em um modo não pode vazar comportamento visual ou autorização para outro.

## 4. Tenancy & Isolamento
É obrigatório garantir que alterações não permitam:
- Acesso cross-tenant
- Acesso de ex-membro
- Acesso a aluno não vinculado
- Dados de outra consultoria
- Reutilização indevida de IDs em URL
*A autorização deve continuar sendo estritamente revalidada no destino (servidor).*

## 5. Sessão Existente
Não testar somente usuário recém-logado. Sempre que a mudança puder afetar runtime, auth, PWA ou shell, testar também:
- Usuário já autenticado antes do deploy
- Usuário com aba aberta durante o deploy
- Refresh após deploy
- Fechar e reabrir aplicação
- Mudança de Wi-Fi para dados móveis quando relevante

## 6. iOS — Base Protegida
O estado atual de produção em iOS deve ser considerado **BASE PROTEGIDA**.
- Não reativar Service Worker no iOS incidentalmente.
- **Proibido alterar sem tarefa explícita e auditoria própria**:
  - iOS Safe Mode
  - Two-layer self-heal
  - Comportamento de SW
  - `/sw.js`
  - Cache/CDN relacionado
  - Ciclo de vida PWA

## 7. Alterações Globais
- Qualquer arquivo compartilhado por múltiplos perfis deve ser marcado como: **GLOBAL IMPACT**.
- Antes de editá-lo, perguntar: *"Consigo resolver isso no componente específico da feature?"*
  - Se SIM: usar solução isolada.
  - Só alterar componente global quando tecnicamente necessário.

## 8. Runtime > Build (Separação de Evidências)
PASS de lint, build, typecheck e testes automatizados **NÃO significa RELEASE PASS**.
Para mudanças relevantes, manter essas três evidências obrigatoriamente separadas:
`LOCAL PASS` ≠ `PROD PASS` ≠ `REAL USER PASS`.

## 9. Rollback & Contingência
Antes de todo release relevante registrar explicitamente:
- **BASE PROD**: `<commit>`
- **NEW RELEASE**: `<commit>`
- **ROLLBACK TARGET**: `<commit>`
- **FILES CHANGED**: `...`
*Diretriz de crise*: Se ocorrer regressão real, **restaurar o serviço primeiro**; investigar a causa depois.

## 10. Não Regressão Visual
Redesign de uma role não pode:
- Alterar wallpaper global
- Alterar shell global
- Alterar spacing global
- Alterar labels de outras roles
- Alterar navegação de outras roles
*Sem autorização explícita.*

## 11. Checklist de Conclusão (Regra Final)
A mudança só pode ser considerada concluída quando:
- [ ] **FUNCIONALIDADE NOVA**: PASS
- [ ] **FLUXO ANTERIOR**: PASS
- [ ] **PERFIS NÃO RELACIONADOS**: PASS
- [ ] **MOBILE**: PASS
- [ ] **DESKTOP**: PASS
- [ ] **TENANCY/RBAC**: PASS (quando aplicável)
- [ ] **REAL USER**: PASS (quando a alteração justificar teste humano)

# 54. FORMATO DO RELATÓRIO OBRIGATÓRIO AO TERMINAR TAREFA
```text
TAREFA CONCLUÍDA

Arquivos criados:
- ...

Arquivos alterados:
- ...

Dependências instaladas:
- nenhuma

O que foi implementado:
- ...

Testes executados:
- npm run lint
- npm run build

Resultado:
- ...

Observações:
- ...

Próximo passo sugerido:
- ...
```
