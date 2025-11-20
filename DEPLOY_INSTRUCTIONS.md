# Instruções para Deploy no Render

## Configuração Inicial

1. **Criar conta no Render**:
   - Acesse https://render.com e crie uma conta gratuita

2. **Criar conta no GitHub** (se não tiver):
   - Conecte sua conta do GitHub ao Render

## Deploy do Backend

1. **Fork do repositório** no GitHub
2. **No Render Dashboard**:
   - Clique em "New +" e selecione "Web Service"
   - Conecte ao seu repositório forkado
   - Nome: `javoucar-backend`
   - Environment: `Node`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
   - Instance Type: `Free`

3. **Configurar variáveis de ambiente**:
   - `DATABASE_URL` - Será preenchida automaticamente pelo Render PostgreSQL
   - `VAPID_PUBLIC_KEY` - Gere com `npx web-push generate-vapid-keys`
   - `VAPID_PRIVATE_KEY` - Gere com `npx web-push generate-vapid-keys`
   - `NODE_ENV` - `production`

## Deploy do Banco de Dados PostgreSQL

1. **No Render Dashboard**:
   - Clique em "New +" e selecione "PostgreSQL"
   - Nome: `javoucar-db`
   - Database Name: `javoucar`
   - User: `javoucar`
   - Instance Type: `Free`

2. **Conectar ao Backend**:
   - Após criar o banco, copie a `External Database URL`
   - Cole na variável `DATABASE_URL` do serviço backend

## Deploy do Frontend

1. **No Render Dashboard**:
   - Clique em "New +" e selecione "Static Site"
   - Conecte ao mesmo repositório
   - Nome: `javoucar-frontend`
   - Build Command: `npm install && npm run build`
   - Publish Directory: `dist`
   - Instance Type: `Free`

## Configuração de Domínios (Opcional)

- O Render fornece URLs automáticas:
  - Backend: `https://javoucar-backend.onrender.com`
  - Frontend: `https://javoucar-frontend.onrender.com`

## Geração de Chaves VAPID para Push Notifications

```bash
npx web-push generate-vapid-keys
```

## Escalabilidade

- **Plano Gratuito**:
  - 500 horas de execução por mês
  - Banco de dados de 500MB
  - Sleep automático após 15 minutos de inatividade

## Monitoramento

- Logs em tempo real no dashboard do Render
- Health checks automáticos
- Alertas de falhas por email

## Atualizações

- Deploy automático em pushes para a branch principal
- Rollback possível para versões anteriores