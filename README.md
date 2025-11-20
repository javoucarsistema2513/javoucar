# JávouCar - Sistema de Alerta para Motoristas

## Visão Geral

JávouCar é um sistema de alerta para motoristas que permite enviar notificações em tempo real para outros motoristas através da placa do veículo. O sistema é composto por um frontend React e um backend Node.js com WebSocket.

## Funcionalidades

1. **Registro de Usuários** - Cadastro de motoristas com nome, email, telefone e senha
2. **Registro de Veículos** - Associação de veículos às contas dos usuários
3. **Envio de Alertas** - Envio de mensagens para motoristas específicos através da placa do veículo
4. **Notificações em Tempo Real** - Recebimento imediato de alertas via WebSocket
5. **PWA (Progressive Web App)** - Funciona como aplicativo nativo em dispositivos móveis

## Tecnologias

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS
- **Backend**: Node.js, Express, Socket.IO, PostgreSQL (com mock para desenvolvimento)
- **PWA**: Service Worker, Manifest, Notificações Push

## Como Executar

### Frontend

1. Instale as dependências:
   ```
   npm install
   ```

2. Execute o frontend em modo de desenvolvimento:
   ```
   npm run dev
   ```

3. O frontend estará disponível em http://localhost:3000

### Backend

1. Navegue até o diretório backend:
   ```
   cd backend
   ```

2. Instale as dependências:
   ```
   npm install
   ```

3. Execute o servidor em modo de desenvolvimento:
   ```
   npm run dev
   ```

4. O servidor estará disponível em http://localhost:3001

## PWA (Progressive Web App)

O JávouCar está configurado como um PWA completo com as seguintes funcionalidades:

### Funcionalidades PWA:
- **Instalável** - Pode ser instalado como aplicativo nativo
- **Offline** - Funciona parcialmente offline graças ao Service Worker
- **Notificações Push** - Recebe alertas mesmo quando o app não está em foco
- **Responsivo** - Interface otimizada para dispositivos móveis
- **Modo Standalone** - Executa em tela cheia como aplicativo nativo

### Como Instalar como PWA:

1. Abra o aplicativo em um navegador moderno (Chrome, Edge, Firefox, Safari)
2. No Chrome/Edge, clique no ícone de instalação na barra de endereços
3. No Safari iOS, clique no botão Compartilhar e selecione "Adicionar à Tela Inicial"
4. O aplicativo será instalado e poderá ser acessado como um app nativo

### Arquivos PWA:

- **manifest.json** - Configuração do PWA
- **sw.js** - Service Worker para caching e notificações
- **ícones** - Ícones em diferentes tamanhos para instalação

## Estrutura do Backend

O backend implementa as seguintes rotas principais:

1. **POST /auth/register** - Registro de usuários
   - Recebe: nome, email, telefone, senha
   - Retorna: token de sessão

2. **POST /vehicles** - Registro de veículos
   - Recebe: placa, modelo, cor, estado
   - Vincula ao usuário logado

3. **POST /alerts/send** - Envio de alertas
   - Recebe: placa alvo e mensagem
   - Procura o dono da placa e envia notificação via WebSocket

## Funcionalidade em Tempo Real

O backend utiliza WebSockets (Socket.IO) para enviar notificações em tempo real aos usuários quando um alerta é recebido.

## Arquitetura

- **server.ts**: Ponto de entrada do servidor Express com Socket.IO
- **Mock Database**: Armazenamento em memória para demonstração
- **WebSocket**: Comunicação em tempo real para notificações