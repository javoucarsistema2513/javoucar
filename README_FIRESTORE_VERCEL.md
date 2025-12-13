# Configuração do Firebase/Firestore com Vercel

## Visão Geral

Este guia explica como configurar o Firebase/Firestore para implantação com Vercel e conectar corretamente o servidor Socket.IO.

## Configuração do Firebase

### 1. Criar Projeto no Firebase

1. Acesse o [Firebase Console](https://console.firebase.google.com/)
2. Clique em "Criar projeto"
3. Insira um nome para o projeto (por exemplo, "javoucar")
4. Aceite os termos e clique em "Criar projeto"

### 2. Configurar Authentication

1. No painel do projeto, clique em "Authentication" no menu lateral
2. Clique em "Primeiros passos"
3. Na aba "Provedores de login", habilite "E-mail/senha"
4. Clique em "Salvar"

### 3. Configurar Firestore Database

1. No painel do projeto, clique em "Firestore Database" no menu lateral
2. Clique em "Criar banco de dados"
3. Selecione "Modo de teste" para desenvolvimento (ou "Modo bloqueado" para produção)
4. Escolha uma região próxima aos seus usuários
5. Clique em "Ativar"

### 4. Obter Chaves de Configuração

1. Clique no ícone de engrenagem (Configurações do projeto) ao lado de "Visão geral do projeto"
2. Na aba "Geral", registre seu aplicativo web:
   - Clique em "</>" (ícone do aplicativo web)
   - Insira um apelido (por exemplo, "javoucar-web")
   - Marque "Também configure o Firebase Hosting" (opcional)
   - Clique em "Registrar aplicativo"
3. Copie os valores de configuração:
   ```javascript
   const firebaseConfig = {
     apiKey: "sua_api_key_aqui",
     authDomain: "seu-projeto.firebaseapp.com",
     projectId: "seu-project-id",
     storageBucket: "seu-projeto.appspot.com",
     messagingSenderId: "1234567890",
     appId: "1:1234567890:web:abcdef123456"
   };
   ```

## Configuração no Vercel

### 1. Adicionar Variáveis de Ambiente

1. Acesse o dashboard do Vercel
2. Vá para Settings > Environment Variables
3. Adicione as seguintes variáveis com base nas chaves obtidas acima:
   ```
   VITE_FIREBASE_API_KEY=sua_api_key_aqui
   VITE_FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=seu-project-id
   VITE_FIREBASE_STORAGE_BUCKET=seu-projeto.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=1234567890
   VITE_FIREBASE_APP_ID=1:1234567890:web:abcdef123456
   VITE_SOCKET_URL=https://SEU-SERVIDOR-SOCKET.render.app
   ```

### 2. Configurar Regras de Segurança do Firestore

Para desenvolvimento, você pode usar estas regras básicas no Firestore:

1. No Firebase Console, vá para "Firestore Database" > "Regras"
2. Substitua pelas seguintes regras:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       // Permite leitura e escrita para usuários autenticados
       match /{document=**} {
         allow read, write: if request.auth != null;
       }
       
       // Permite leitura pública para certos dados (se necessário)
       match /public/{document=**} {
         allow read: if true;
       }
     }
   }
   ```

## Configuração do Servidor Socket.IO

### 1. Implantar no Render

1. Certifique-se de que o arquivo `render.yaml` está configurado corretamente:
   ```yaml
   services:
     - type: web
       name: javoucar-socket-server
       env: node
       buildCommand: npm install
       startCommand: node server/server.js
       envVars:
         - key: NODE_VERSION
           value: 18
         - key: PORT
           value: 10000
   ```

2. Conecte seu repositório ao Render.com
3. O Render implantará automaticamente o servidor

### 2. Configurar CORS (se necessário)

No arquivo `server/server.js`, certifique-se de que o CORS está configurado corretamente:
```javascript
const cors = require('cors');
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));
```

## Testando a Configuração

### 1. Teste Local

1. Crie um arquivo `.env` na raiz do projeto:
   ```
   VITE_FIREBASE_API_KEY=sua_api_key_real
   VITE_FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=seu-project-id
   VITE_FIREBASE_STORAGE_BUCKET=seu-projeto.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=1234567890
   VITE_FIREBASE_APP_ID=1:1234567890:web:abcdef123456
   VITE_SOCKET_URL=http://localhost:3001
   ```

2. Execute o frontend:
   ```bash
   npm run dev
   ```

3. Execute o backend:
   ```bash
   npm run dev:backend
   ```

### 2. Teste de Deploy

1. Faça push das alterações para o GitHub
2. O Vercel implantará automaticamente o frontend
3. Verifique se as variáveis de ambiente estão corretas no dashboard do Vercel
4. Acesse o site implantado e verifique se não há erros no console

## Solução de Problemas

### Erros Comuns

1. **"Firebase: Error (auth/invalid-api-key)"**
   - Verifique se a `VITE_FIREBASE_API_KEY` está correta
   
2. **"Missing or insufficient permissions"**
   - Verifique as regras de segurança do Firestore
   
3. **Erros de CORS**
   - Verifique se o `VITE_SOCKET_URL` está correto
   - Confirme se as origens permitidas estão configuradas no servidor

### Logs de Depuração

Para depurar problemas:

1. Verifique os logs do Vercel:
   - Vercel Dashboard > Seu projeto > Logs

2. Verifique os logs do Render:
   - Render Dashboard > Seu serviço > Logs

3. Use o console do navegador para verificar erros de JavaScript

## Segurança

### Práticas Recomendadas

1. **Não exponha chaves secretas** no código do cliente
2. **Use regras de segurança adequadas** no Firestore
3. **Implemente autenticação adequada** para todas as operações
4. **Monitore o uso** do seu projeto Firebase

### Configuração para Produção

1. Atualize as regras do Firestore para modo de produção:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       // Usuários podem ler e escrever seus próprios dados
       match /users/{userId} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }
       
       // Veículos podem ser lidos por qualquer usuário autenticado
       match /vehicles/{vehicleId} {
         allow read: if request.auth != null;
         allow write: if request.auth != null;
       }
       
       // Alertas podem ser lidos e escritos por usuários autenticados
       match /alerts/{alertId} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```

## Recursos Adicionais

- [Documentação do Firebase](https://firebase.google.com/docs)
- [Documentação do Firestore](https://firebase.google.com/docs/firestore)
- [Documentação do Vercel](https://vercel.com/docs)
- [Documentação do Render](https://render.com/docs)