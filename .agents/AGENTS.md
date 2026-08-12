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
