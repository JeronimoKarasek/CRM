# CRM Farol (MVP sem Edge Functions)

## 0) Pré-requisitos
- Node.js LTS (>= 18): https://nodejs.org
- Git: https://git-scm.com
- Conta Supabase e projeto criado
- Conta Vercel

---
## 1) Supabase — SQL (copiar e colar no SQL Editor, por blocos)

### 1A) Perfis (tabela `profiles`)
```sql
create table if not exists public.profiles (
  user_id uuid primary key,
  nome text,
  telefone text,
  role text check (role in ('superadmin','gestor','admin','cliente')) not null default 'cliente',
  org text not null default 'foco01',
  allowed_columns text[] default array['id','nome','telefone','cpf','status','saldo','pago','horario_da_ultima_resposta','instancia','banco_simulado','uf','cidade'],
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
```

### 1B) RLS na tabela **Farol**
> ATENÇÃO: Colunas com espaços precisam estar entre aspas duplas.
```sql
alter table public."Farol" enable row level security;

drop policy if exists farol_select_by_org on public."Farol";
create policy farol_select_by_org on public."Farol"
  for select using (
    exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid()
        and p.is_active
        and p.org = "cliente"
    )
  );
```

### 1C) Views (aliases e agregados)
```sql
-- View de leitura (aliases úteis)
create or replace view public.farol_view as
select
  f."id" as id,
  f."Name" as nome,
  f."telefone" as telefone,
  f."cpf" as cpf,
  f."status" as status,
  cast(f."saldo" as numeric) as saldo,
  f."pago" as pago,
  f."horario da ultima resposta" as horario_da_ultima_resposta,
  f."instancia" as instancia,
  f."banco simulado" as banco_simulado,
  f."UF" as uf,
  f."cidade" as cidade,
  f."cliente" as cliente
from public."Farol" f;

-- Soma(saldo) por status (filtrar org no front opcional; RLS garante segurança)
create or replace view public.farol_status_sum as
select
  f."cliente" as cliente,
  f."status" as status,
  sum(coalesce(cast(f."saldo" as numeric),0)) as saldo_sum
from public."Farol" f
group by 1,2;

-- Soma(saldo) onde pago não é nulo
create or replace view public.farol_paid_sum as
select
  f."cliente" as cliente,
  sum(coalesce(cast(f."saldo" as numeric),0)) as total
from public."Farol" f
where f."pago" is not null
group by 1;
```

### 1D) Índices (recomendado)
```sql
create extension if not exists pg_trgm;

create index if not exists farol_status_idx on public."Farol" ("status");
create index if not exists farol_pago_idx on public."Farol" ("pago");
create index if not exists farol_cliente_idx on public."Farol" ("cliente");
create index if not exists farol_hultima_idx on public."Farol" ("horario da ultima resposta");
create index if not exists farol_nome_trgm on public."Farol" using gin ("Name" gin_trgm_ops);
create index if not exists farol_tel_trgm on public."Farol" using gin ("telefone" gin_trgm_ops);
create index if not exists farol_cpf_trgm on public."Farol" using gin ("cpf" gin_trgm_ops);
```

---
## 2) Criar seu usuário e perfil
1. Supabase → **Auth → Users → Add user** → Preencha seu email e **Send invitation** (ele define a senha por email).
2. Após criado, clique no usuário → **App Metadata** e coloque:
   ```json
   { "role": "superadmin", "org": "foco01" }
   ```
3. Copie o **UUID** do usuário e rode no SQL Editor:
   ```sql
   insert into public.profiles (user_id, nome, role, org)
   values ('COLE_AQUI_O_UUID', 'Jeronimo', 'superadmin', 'foco01');
   ```

---
## 3) Configurar o projeto local
1. Baixe este repositório e, no terminal:
   ```bash
   npm install
   cp .env.example .env
   ```
2. Edite `.env` e cole suas chaves:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://<...>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
   ```
3. Rode:
   ```bash
   npm run dev
   ```
   Acesse http://localhost:3000/login

---
## 4) Enviar para GitHub e Vercel
1. Crie um repositório vazio no GitHub (ex.: `crm-farol`).
2. No terminal, dentro da pasta do projeto:
   ```bash
   git init
   git add .
   git commit -m "init"
   git branch -M main
   git remote add origin https://github.com/SEU_USUARIO/crm-farol.git
   git push -u origin main
   ```
3. Vercel → **Add New Project** → Importar do GitHub → Configure as envs:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy. Depois, em **Settings → Domains**, adicione `crm.farolchat.com` e siga a instrução de **CNAME** no seu DNS (Hostinger).

---
## 5) Teste rápido
- Popule algumas linhas na tabela `Farol` com `cliente='foco01'`, `saldo>0` e alguns `pago` não nulos.
- Logue com seu email e senha → veja **Dashboard** e **Clientes**.
