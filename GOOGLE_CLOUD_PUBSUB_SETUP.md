# Configuração do Google Cloud Pub/Sub para JávouCar

Este guia explica como configurar o Google Cloud Pub/Sub para o sistema JávouCar.

## Pré-requisitos

1. Uma conta no Google Cloud Platform (GCP)
2. Um projeto criado no GCP
3. Permissões adequadas para criar tópicos e assinaturas no Pub/Sub

## Passos para Configuração

### 1. Criar um Projeto no Google Cloud

1. Acesse o [Console do Google Cloud](https://console.cloud.google.com/)
2. Crie um novo projeto ou selecione um projeto existente
3. Anote o **Project ID** do seu projeto

### 2. Ativar a API do Pub/Sub

1. No Console do Google Cloud, vá para **APIs & Services > Library**
2. Pesquise por "Cloud Pub/Sub API"
3. Clique na API e depois clique em **Enable**

### 3. Criar uma Conta de Serviço

1. No Console do Google Cloud, vá para **IAM & Admin > Service Accounts**
2. Clique em **Create Service Account**
3. Dê um nome à conta de serviço (ex: "javoucar-pubsub")
4. Clique em **Create and Continue**
5. Adicione a role **Pub/Sub Editor**
6. Clique em **Continue** e depois **Done**

### 4. Criar uma Chave para a Conta de Serviço

1. Na página de contas de serviço, clique na conta que você criou
2. Vá para a aba **Keys**
3. Clique em **Add Key > Create New Key**
4. Selecione **JSON** como tipo de chave
5. Clique em **Create**
6. Salve o arquivo em um local seguro (você precisará dele depois)

### 5. Configurar Variáveis de Ambiente

Você precisará definir as seguintes variáveis de ambiente no Render:

```bash
GOOGLE_CLOUD_PROJECT_ID=seu-project-id-aqui
GOOGLE_APPLICATION_CREDENTIALS=/caminho/para/sua/chave.json
```

### 6. Configurar Permissões

Certifique-se de que sua conta de serviço tem as seguintes permissões:
- `pubsub.topics.create`
- `pubsub.topics.publish`
- `pubsub.subscriptions.create`
- `pubsub.subscriptions.consume`

## Estrutura do Pub/Sub no JávouCar

O sistema JávouCar usa a seguinte estrutura:

### Tópicos
- `javoucar-alerts`: Tópico principal para todos os alertas

### Assinaturas
- `javoucar-alerts-sub`: Assinatura para consumir mensagens do tópico de alertas

### Formato das Mensagens

#### Alertas Direcionados
```json
{
  "data": {
    "plate": "ABC1234",
    "model": "Fiat Uno",
    "color": "Branco",
    "message": "Alerta de segurança",
    "iconName": "BellRing",
    "category": "info",
    "timestamp": "2023-01-01T00:00:00.000Z"
  },
  "attributes": {
    "type": "targeted_alert",
    "targetPlate": "ABC1234"
  }
}
```

#### Alertas em Broadcast
```json
{
  "data": {
    "message": "Mensagem para todos os usuários",
    "iconName": "Broadcast",
    "category": "info",
    "timestamp": "2023-01-01T00:00:00.000Z"
  },
  "attributes": {
    "type": "broadcast_alert"
  }
}
```

## Testando a Configuração

1. Após implantar no Render, verifique os logs para garantir que:
   - O serviço Pub/Sub foi inicializado corretamente
   - Os tópicos e assinaturas foram criados
   - Não há erros de autenticação

2. Teste o envio de um alerta:
   - Acesse o aplicativo
   - Registre um usuário com uma placa
   - Envie um alerta para essa placa
   - Verifique se o alerta é recebido

## Solução de Problemas

### Erros de Autenticação
Se você vir erros de autenticação:
1. Verifique se a variável `GOOGLE_APPLICATION_CREDENTIALS` está definida corretamente
2. Certifique-se de que o arquivo de chave existe e é acessível
3. Verifique se a conta de serviço tem as permissões necessárias

### Erros de Criação de Tópicos/Assinaturas
Se você vir erros ao criar tópicos ou assinaturas:
1. Verifique se a API do Pub/Sub está ativada
2. Certifique-se de que a conta de serviço tem permissões suficientes
3. Verifique se o Project ID está correto

### Problemas de Conectividade
Se os alertas não estão sendo entregues:
1. Verifique os logs do servidor para erros
2. Certifique-se de que os clientes estão se registrando corretamente
3. Verifique se o Server-Sent Events está funcionando

## Considerações de Segurança

1. Mantenha o arquivo de chave da conta de serviço em segurança
2. Não inclua chaves em repositórios públicos
3. Use permissões mínimas necessárias para a conta de serviço
4. Considere rotacionar as chaves periodicamente

## Escalabilidade

O Pub/Sub do Google Cloud é altamente escalável e pode lidar com milhões de mensagens por segundo. Para cargas de trabalho maiores, considere:
1. Ajustar o número de assinaturas para balancear a carga
2. Usar filtros de mensagens para roteamento mais eficiente
3. Monitorar métricas de uso no Console do Google Cloud