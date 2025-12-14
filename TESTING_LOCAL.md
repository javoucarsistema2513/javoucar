# Testando a Configuração Localmente

## 1. Pré-requisitos

Certifique-se de ter instalado:
- Node.js (versão 16 ou superior)
- npm ou yarn

## 2. Configuração Inicial

1. Instale as dependências:
   ```bash
   npm install
   ```

2. Crie um arquivo `.env` na raiz do projeto com o seguinte conteúdo:
   ```env
   # Supabase Configuration (valores de teste)
   VITE_SUPABASE_URL=http://localhost:54321
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
   
   # Socket.IO Server URL
   VITE_SOCKET_URL=http://localhost:3001
   ```

## 3. Iniciando os Serviços Localmente

### Terminal 1: Frontend
```bash
npm run dev
```
O frontend estará disponível em: http://localhost:3000

### Terminal 2: Backend (Servidor Socket.IO)
```bash
npm run dev:backend
```
O servidor Socket.IO estará disponível em: http://localhost:3001

## 4. Testando a Comunicação

### Teste 1: Verificar Conexão Socket.IO

1. Abra o navegador e acesse http://localhost:3000
2. Abra as Ferramentas de Desenvolvedor (F12)
3. Vá para a aba Console
4. Verifique se há mensagens de conexão bem-sucedida:
   ```
   Conectando ao servidor Socket.IO: http://localhost:3001
   ```

### Teste 2: Teste de Cliente Socket.IO

1. Em um novo terminal, execute:
   ```bash
   node server/test-client.js
   ```

2. Você deve ver mensagens como:
   ```
   Conectado ao servidor com ID: xxxxxx
   Usuário entrou: { userId: 'test_user_1', message: 'test_user_1 entrou na sala' }
   Alerta recebido: { ... }
   ```

## 5. Testando Funcionalidades do JávouCar

### Teste de Registro e Login

1. Acesse http://localhost:3000
2. Clique em "Começar Agora"
3. Tente registrar um novo usuário
4. Faça login com o usuário registrado
5. Registre um veículo
6. Acesse o sistema de alertas

### Teste de Alertas em Tempo Real

1. Abra duas janelas do navegador diferentes
2. Em cada janela, faça login com usuários diferentes
3. Registre veículos diferentes em cada conta
4. Em uma janela, envie um alerta para o veículo da outra janela
5. Verifique se:
   - O alerta aparece na janela destinatária
   - Os sons de bip são reproduzidos
   - A confirmação funciona corretamente

## 6. Verificando Erros Comuns

### Erro: "SUPABASE_ANON_KEY não está configurada corretamente"

Verifique:
1. Se o arquivo `.env` existe na raiz do projeto
2. Se as variáveis estão corretamente nomeadas
3. Se não há espaços extras ou caracteres especiais

### Erro: CORS - "No 'Access-Control-Allow-Origin' header"

Verifique:
1. Se ambos os serviços (frontend e backend) estão rodando
2. Se as URLs estão corretas
3. Se a configuração de CORS no servidor está permitindo a origem

### Erro: Conexão Socket.IO falhando

Verifique:
1. Se o servidor Socket.IO está rodando na porta correta
2. Se não há firewalls bloqueando a conexão
3. Se as variáveis de ambiente estão configuradas corretamente

## 7. Debug Avançado

### Adicionar Logs de Debug

No arquivo `hooks/useSocket.js`, adicione mais logs:

```javascript
// Lidar com eventos de conexão
socketRef.current.on('connect', () => {
  console.log('Socket.IO conectado com sucesso');
});

socketRef.current.on('disconnect', (reason) => {
  console.log('Socket.IO desconectado:', reason);
});

socketRef.current.on('reconnect', (attemptNumber) => {
  console.log('Socket.IO reconectado na tentativa:', attemptNumber);
});
```

### Verificar Estado da Conexão

No componente `AlertSystem.tsx`, adicione:

```javascript
useEffect(() => {
  if (socket) {
    console.log('Estado da conexão Socket.IO:', socket.connected);
    console.log('ID do socket:', socket.id);
    
    // Verificar reconexões
    socket.on('reconnect_attempt', (attempt) => {
      console.log('Tentativa de reconexão:', attempt);
    });
  }
}, [socket]);
```

## 8. Testes Automatizados

### Teste de Conexão com Supabase

Crie um arquivo `test-supabase.js`:

```javascript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Variáveis de ambiente do Supabase não configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('Testando conexão com Supabase...');
supabase.from('users').select('count').then(({ data, error }) => {
  if (error) {
    console.error('Erro ao conectar ao Supabase:', error);
  } else {
    console.log('Conexão com Supabase bem-sucedida');
  }
});
```

Execute com:
```bash
node test-supabase.js
```

Seguindo estes passos, você poderá testar toda a funcionalidade do JávouCar localmente antes de implantar em produção.