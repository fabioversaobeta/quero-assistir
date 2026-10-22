# ADR 0001 — Monorepo pnpm e stack TypeScript

**Status:** aceita

**Contexto:** API, painel admin e app mobile evoluem juntos, mantidos por uma pessoa com apoio do Claude Code. Hospedagem: Railway (backend + banco) e Vercel (front).

**Decisão:** monorepo **pnpm workspaces**, tudo em **TypeScript**: API **NestJS + Prisma + PostgreSQL**; admin **Next.js** (Vercel); mobile **Expo/React Native** (um código para Android e iOS); tipos compartilhados em `packages/contracts`.

**Consequências:**
- (+) Um idioma, contratos tipados de ponta a ponta, CI único, contexto simples para o Claude Code.
- (+) NestJS favorece módulos/DI, alinhados a DDD/SOLID; Prisma dá migrations e tipagem.
- (−) Expo muda rápido entre SDKs; exige development build por causa do Google Sign-In nativo.
- (−) pnpm + React Native exige atenção (o Expo SDK ≥ 54 já suporta o layout isolado do pnpm).
