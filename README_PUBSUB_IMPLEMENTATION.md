# Implementação do Google Cloud Pub/Sub no JávouCar

Este documento descreve as mudanças feitas para migrar o sistema de mensagens do Socket.IO para o Google Cloud Pub/Sub.

## Visão Geral das Mudanças

### Backend
1. **Novo servidor Pub/Sub** ([backend/pubsub-server.js](backend/pubsub-server.js)):
   - Substitui o servidor Socket.IO anterior
   - Implementa endpoints REST para registro de usuários e envio de alertas
   - Adiciona suporte a Server-Sent Events (SSE) para entrega de mensagens em tempo real
   - Integra com o Google Cloud Pub/Sub para mensagens assíncronas

2. **Serviço Pub/Sub** ([services/pubsub.ts](services/pubsub.ts)):
   - Wrapper para o SDK do Google Cloud Pub/Sub
   - Gerencia tópicos e assinaturas automaticamente
   - Armazena usuários conectados (em memória - em produção usar Redis)
   - Publica e consome mensagens do Pub/Sub

### Frontend
1. **Componente AlertSystem** ([components/screens/AlertSystem.tsx](components/screens/AlertSystem.tsx)):
   - Substitui chamadas ao Socket.IO por chamadas REST
   - Usa Server-Sent Events para receber mensagens em tempo real
   - Mantém a mesma interface do usuário

2. **Serviço Pub/Sub Client** ([services/pubsub-client.ts](services/pubsub-client.ts)):
   - Cliente para Server-Sent Events
   - Gerencia reconexões automáticas
   - Notifica componentes sobre mensagens recebidas

### Configuração
1. **Render YAML** ([render.yaml](render.yaml)):
   - Atualizado para usar o novo servidor Pub/Sub
   - Adiciona variáveis de ambiente para credenciais do Google Cloud

## Arquitetura

```
[Firebase Auth] --> [Frontend]
                      |
                      | (REST API)
                      v
[Google Cloud Pub/Sub] <---> [Backend Pub/Sub Server] --> [Frontend SSE]
                      |
                      | (Server-Sent Events)
                      v
                   [Clientes Conectados]
```

### Fluxo de Envio de Alerta
1. Usuário envia alerta através do frontend
2. Frontend faz requisição REST para `/api/send-targeted-alert`
3. Backend publica mensagem no tópico Pub/Sub
4. Backend consome mensagem da assinatura Pub/Sub
5. Backend envia mensagem para clientes via Server-Sent Events
6. Frontend recebe mensagem e exibe notificação

### Fluxo de Registro de Usuário
1. Usuário se autentica no sistema
2. Frontend registra usuário via requisição REST para `/api/register`
3. Backend armazena usuário conectado em memória
4. Quando mensagens são recebidas, backend verifica usuários conectados

## Benefícios da Nova Arquitetura

1. **Escalabilidade**: O Google Cloud Pub/Sub pode escalar automaticamente para milhões de mensagens por segundo
2. **Confiabilidade**: Mensagens são persistidas e entregues mesmo se o servidor reiniciar
3. **Integração**: Fácil integração com outros serviços do Google Cloud
4. **Monitoramento**: Métricas e logs integrados com o Google Cloud Monitoring
5. **Custo**: Modelo de pagamento por uso

## Como Usar

### Desenvolvimento Local
1. Configure as credenciais do Google Cloud:
   ```bash
   export GOOGLE_CLOUD_PROJECT_ID=seu-project-id
   export GOOGLE_APPLICATION_CREDENTIALS=/caminho/para/sua/chave.json
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev:backend
   ```

4. Inicie o frontend:
   ```bash
   npm run dev
   ```

### Implantação no Render
1. Siga o guia em [GOOGLE_CLOUD_PUBSUB_SETUP.md](GOOGLE_CLOUD_PUBSUB_SETUP.md) para configurar o Pub/Sub
2. Defina as variáveis de ambiente no Render:
   - `GOOGLE_CLOUD_PROJECT_ID`
   - `GOOGLE_APPLICATION_CREDENTIALS`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Faça o deploy normalmente no Render

## Comparação com Socket.IO

| Recurso | Socket.IO | Google Cloud Pub/Sub |
|---------|-----------|----------------------|
| Persistência | Não | Sim |
| Escalabilidade | Limitada | Alta (milhões de msgs/s) |
| Confiabilidade | Dependente do servidor | Alta (garantias de entrega) |
| Monitoramento | Manual | Integrado |
| Custo | Gratuito | Pagamento por uso |
| Complexidade | Baixa | Média |

## Próximos Passos

1. **Implementar persistência de usuários conectados** com Redis
2. **Adicionar filtros de mensagens** no Pub/Sub para melhor roteamento
3. **Implementar métricas e monitoramento** com Google Cloud Monitoring
4. **Adicionar retry mechanism** para falhas de entrega
5. **Implementar dead letter queues** para mensagens não entregues

## Troubleshooting

### Problemas Comuns
1. **Erros de autenticação**: Verifique as credenciais do Google Cloud
2. **Tópicos não criados**: Verifique permissões da conta de serviço
3. **Mensagens não entregues**: Verifique conexão SSE no frontend
4. **Latência alta**: Verifique rede e localização dos recursos

### Logs Importantes
- `✅ Pub/Sub service initialized`: Serviço iniciado com sucesso
- `📤 Published targeted alert`: Mensagem publicada no Pub/Sub
- `📥 Received message`: Mensagem recebida da assinatura
- `🎯 Targeted alert for`: Alerta direcionado para usuário conectado
- `👂 Listening for Pub/Sub messages`: Assinatura ativa

## Segurança

1. **Credenciais**: Nunca commite credenciais no repositório
2. **Permissões**: Use princípio do menor privilégio nas contas de serviço
3. **Network**: Restrinja acesso ao servidor apenas pelas portas necessárias
4. **Logs**: Evite logar informações sensíveis nas mensagens