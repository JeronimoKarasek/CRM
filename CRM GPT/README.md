# CRM Farol (v2) – ajustes de build
- Sem '@/': imports relativos.
- React Query em client component (Providers).
- Middleware com createMiddlewareClient.
- Tailwind config em JS.

## Rodar local
1. `npm install`
2. Copie `.env.example` para `.env` e preencha `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY`
3. `npm run dev` e acesse http://localhost:3000/login

Importante: a rota de criação de usuários (`/api/admin/create-user`) usa a `SUPABASE_SERVICE_ROLE_KEY` e exige que o solicitante tenha `role = 'superadmin'` na tabela `profiles`.

## Supabase (RLS e funções)

Para que as permissões de visualização por tabela funcionem de ponta a ponta:
- Habilite RLS nas tabelas/views consultadas pelo app (por exemplo, `farol_view`).
- Garanta a existência da tabela `profiles` com as colunas: `user_id uuid`, `role text`, `allowed_tables text[]`, `default_table text`, `org text`, `orgs text[]`, `is_active boolean`.
- Crie políticas que filtrem linhas com base em `auth.uid()` e nas colunas de `profiles` (por exemplo, permitir acesso somente quando a tabela em questão está em `allowed_tables` e o usuário está ativo).
- As RPCs usadas pelo dashboard (`rpc_status_sum`, `rpc_monthly_growth`) devem considerar o usuário atual e, opcionalmente, a `default_table` do perfil para decidir de qual tabela/view agregar.

Observação: a página Configurações utiliza `rpc_list_crm_tables` e `rpc_distinct_clientes_for(_table)` para popular opções dinâmicas.

## Para fazer o push para o vercel

git add .
git commit -m "fix(api): correct route.ts paths and names"
git push

