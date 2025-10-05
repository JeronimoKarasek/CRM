# CRM Farol (v2) — ajustes de build
- Sem '@/': imports relativos.
- React Query em client component (Providers).
- Middleware com createMiddlewareClient.
- Tailwind config em JS.

## Rodar local
1. `npm install`
2. Copie `.env.example` para `.env` e preencha `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. `npm run dev` e acesse http://localhost:3000/login

## Para fazer o push para o vercel

git add .
git commit -m 
git push
