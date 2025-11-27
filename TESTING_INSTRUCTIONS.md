# Instruções para Testar o Sistema de Alertas

## Problema Identificado

O modal de alertas não estava aparecendo porque havia uma inconsistência entre a placa usada para registrar o usuário e a placa usada para enviar o alerta. O sistema agora foi corrigido para permitir que os usuários se registrem com suas próprias placas.

## Como Testar o Sistema

### 1. Registro de Veículo

1. Faça login no sistema
2. Na primeira vez que acessar o sistema de alertas, você será solicitado a registrar seu veículo
3. Digite a placa do seu veículo (ex: ABC1234)
4. Clique em "Registrar Veículo"
5. Você verá uma confirmação de que seu veículo foi registrado

### 2. Envio de Alerta

1. Após registrar seu veículo, você terá acesso ao sistema de alertas
2. Digite a placa do veículo destinatário no campo "Destinatário"
3. Selecione um alerta rápido ou escreva uma mensagem personalizada
4. Clique em "Enviar Alerta"
5. O sistema enviará o alerta para o veículo com a placa especificada

### 3. Recebimento de Alerta

1. Para testar o recebimento de alertas, você precisa ter dois dispositivos ou duas instâncias do navegador
2. Em um dispositivo, registre um veículo com uma placa específica (ex: ABC1234)
3. Em outro dispositivo, envie um alerta para essa mesma placa
4. O dispositivo que registrou a placa ABC1234 deve receber o alerta no modal

## Cenário de Teste Recomendado

### Teste 1: Registro e Envio Simples

1. Abra o aplicativo e faça login
2. Registre seu veículo com a placa "ABC1234"
3. Envie um alerta para a mesma placa "ABC1234"
4. Verifique se o modal aparece

### Teste 2: Envio para Outro Usuário

1. Em dois dispositivos diferentes:
   - Dispositivo 1: Registre o veículo com placa "XYZ5678"
   - Dispositivo 2: Registre o veículo com placa "ABC1234"
2. Do dispositivo 1, envie um alerta para a placa "ABC1234"
3. Verifique se o dispositivo 2 recebe o alerta no modal

## Solução Implementada

1. **Componente VehicleRegistration**: Adicionado um novo componente que permite aos usuários registrarem seus próprios veículos
2. **Fluxo de Registro**: O sistema agora requer que os usuários registrem seus veículos antes de usar o sistema de alertas
3. **Normalização de Placas**: O backend agora normaliza as placas (maiúsculas e sem espaços) para garantir correspondência correta
4. **Gerenciamento de Estado**: O App.tsx agora gerencia o estado da placa registrada do usuário

## Verificação de Logs

Para depurar problemas, verifique os seguintes logs:

### Frontend (Console do Navegador)
- "Registrando usuário com placa: [PLACA]"
- "Socket.IO conectado"
- "Enviando alerta para placa: [PLACA]"
- "🔔 Alerta recebido via Socket.IO:"

### Backend (Terminal do Servidor)
- "Novo cliente conectado: [SOCKET_ID]"
- "Usuário registrado: [USER_ID] com placa: [PLACA]"
- "Alerta direcionado recebido:"
- "Verificando usuário: [PLACA_USUARIO] comparando com: [PLACA_DESTINO]"
- "Comparando placas normalizadas: [PLACA_NORMALIZADA_USUARIO] com [PLACA_NORMALIZADA_DESTINO]"
- "Enviando alerta para socket: [SOCKET_ID]"

## Problemas Comuns e Soluções

### 1. Modal não aparece
- Verifique se o usuário está registrado com a placa correta
- Verifique se as placas estão escritas exatamente iguais (mesmo que em maiúsculas/minúsculas)
- Verifique os logs do frontend e backend para ver se o alerta está sendo enviado e recebido

### 2. Erro de conexão
- Verifique se o servidor está rodando
- Verifique se há conectividade de rede
- Verifique se as portas estão corretamente configuradas

### 3. Placas não correspondem
- O sistema agora normaliza as placas automaticamente
- Certifique-se de digitar as placas corretamente

## Próximos Passos

1. Teste o sistema com múltiplos usuários simultaneamente
2. Verifique o comportamento em diferentes condições de rede
3. Teste a persistência de registros após recarregar a página