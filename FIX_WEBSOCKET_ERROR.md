# Como Corrigir o Erro de Conexão WebSocket

## Problema
Você está vendo o seguinte erro no console do navegador:
```
WebSocket connection to 'wss://api.render.com/socket.io/?key=waBdd5VrOWA&EIO=4&transport=websocket' failed
```

Este erro ocorre porque a variável de ambiente `VITE_SOCKET_URL` não está configurada corretamente.

## Solução

### Passo 1: Implantar o Servidor Socket.IO no Render

1. Faça login no [Render](https://render.com/)
2. Crie um novo serviço web
3. Conecte seu repositório do JávouCar
4. Configure as seguintes opções:
   - **Name**: javoucar-socket-server
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `node server/server.js`
   - **Plan**: Free é suficiente para testes

5. Adicione as variáveis de ambiente necessárias:
   - `NODE_VERSION`: 18
   - `PORT`: 10000

6. Clique em "Create Web Service"

### Passo 2: Obter a URL do Servidor Implantado

Após a implantação ser concluída, o Render fornecerá uma URL para seu serviço, algo como:
```
https://javoucar-socket-server.onrender.com
```

### Passo 3: Configurar a Variável de Ambiente no Vercel

1. Acesse o dashboard do Vercel
2. Vá para o seu projeto JávouCar
3. Clique em "Settings" > "Environment Variables"
4. Adicione ou atualize a variável:
   - **KEY**: `VITE_SOCKET_URL`
   - **VALUE**: `https://javoucar-socket-server.onrender.com` (substitua pela sua URL real)

5. Clique em "Add"
6. Faça um novo deploy do seu projeto

### Passo 4: Verificar a Correção

1. Aguarde o deploy ser concluído
2. Acesse seu aplicativo
3. Abra as ferramentas de desenvolvedor do navegador (F12)
4. Verifique se o erro não aparece mais no console
5. Você deve ver uma mensagem de conexão bem-sucedida como:
   ```
   Conectando ao servidor Socket.IO: https://javoucar-socket-server.onrender.com
   ```

## Solução Alternativa para Desenvolvimento Local

Se você estiver testando localmente, certifique-se de que:

1. O arquivo `.env` contenha:
   ```
   VITE_SOCKET_URL=http://localhost:3003
   ```

2. O servidor Socket.IO esteja rodando:
   ```bash
   npm run dev:backend
   ```

3. O frontend esteja rodando:
   ```bash
   npm run dev
   ```

## Problemas Comuns e Soluções

### 1. Erro de CORS
Se você vir erros de CORS, verifique se a origem está adicionada na lista de permissões no arquivo `server/server.js`:
```javascript
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'https://javoucar.vercel.app',
  // Adicione a URL do seu aplicativo Vercel aqui
];
```

### 2. Conexão Falhando Continuamente
Se a conexão continuar falhando, verifique:
1. Se o servidor está realmente rodando
2. Se a URL está correta (incluindo protocolo https://)
3. Se o firewall não está bloqueando a conexão
4. Se as variáveis de ambiente foram recarregadas após a alteração

## Testando a Conexão

Você pode testar a conexão do servidor usando o cliente de teste:
```bash
node server/test-client.js
```

Isso ajudará a verificar se o servidor está respondendo corretamente.