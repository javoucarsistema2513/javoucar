# JávouCar - Sistema de Alerta para Motoristas

## Configuração do Supabase e Implantação

Para configurar corretamente o Supabase, Vercel e o servidor Socket.IO, consulte o guia detalhado:
[README_SUPABASE_VERCEL.md](README_SUPABASE_VERCEL.md)

## Configuração do Supabase

Antes de executar o projeto, você precisa configurar o Supabase:

1. Crie um projeto no [Supabase](https://supabase.io/)
2. Obtenha sua URL do projeto e chave anônima
3. Configure as tabelas necessárias (veja abaixo)
4. Adicione as variáveis de ambiente ao Vercel:

### Configuração no Vercel

Para configurar corretamente o Supabase no Vercel:

1. Acesse o dashboard do Vercel
2. Vá para Settings > Environment Variables
3. Adicione as seguintes variáveis:
   ```
   VITE_SUPABASE_URL=https://seu-projeto.supabase.co
   VITE_SUPABASE_ANON_KEY=sua_chave_anonima_aqui
   VITE_SOCKET_URL=https://url-do-seu-servidor-socket-io
   ```

### Estrutura do Banco de Dados

Crie as seguintes tabelas no seu projeto Supabase:

```sql
-- Tabela de usuários
CREATE TABLE users (
  id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  name TEXT,
  email TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de veículos
CREATE TABLE vehicles (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  plate TEXT UNIQUE NOT NULL,
  model TEXT,
  color TEXT,
  state TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de alertas
CREATE TABLE alerts (
  id SERIAL PRIMARY KEY,
  sender_user_id UUID REFERENCES auth.users NOT NULL,
  target_plate TEXT NOT NULL,
  message TEXT,
  alert_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_read BOOLEAN DEFAULT FALSE
);
```

## Melhorias de Responsividade

O aplicativo foi otimizado para funcionar bem em dispositivos móveis de todos os tamanhos, incluindo:

- Telas pequenas (iPhone SE, Galaxy Mini, etc.)
- Telas médias (iPhone 8, Galaxy S8, etc.)
- Telas grandes (iPhone Plus, tablets pequenos)

### Principais melhorias:
1. **Ajustes de layout responsivo** para diferentes tamanhos de tela
2. **Redução de espaçamentos e paddings** em telas menores
3. **Fontes escaláveis** que se adaptam ao tamanho da tela
4. **Botões e elementos de toque** com tamanho adequado para fácil interação
5. **Prevenção de zoom indesejado** em campos de entrada
6. **Melhor uso do espaço vertical** em dispositivos com altura limitada

## Execução do Projeto

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
2. Set the `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Vercel Environment Variables
3. Set the `VITE_SOCKET_URL` with your deployed Socket.IO server URL
4. Run the app:
   `npm run dev`
   
## Executando o Servidor Socket.IO

Para executar o servidor Socket.IO em tempo real:

1. Em um terminal, execute:
   `npm run dev:backend`
   
2. O servidor estará disponível em http://localhost:3001

## Testando o Servidor

Você pode testar o servidor Socket.IO executando o cliente de teste:

1. Em outro terminal, execute:
   `node server/test-client.js`

## Funcionalidades em Tempo Real

O sistema agora suporta comunicação em tempo real usando Socket.IO, permitindo:

- Envio imediato de alertas entre motoristas
- Recebimento instantâneo de notificações
- Salas de comunicação para grupos de usuários
- Identificação de veículos por placa em tempo real

## Testando os Sons de Bip

Para testar os sons de bip:

1. Abra duas janelas do navegador diferentes (ou aba anônima)
2. Em uma janela, faça login como um usuário
3. Na outra janela, faça login como outro usuário
4. Envie um alerta de uma janela para a outra
5. Você deve ouvir os bips contínuos na janela receptora
6. Clique em "Confirmar Recebimento" para parar os bips e ouvir os dois bips finais

### Comportamento dos Sons:
- **Ao receber um alerta**: Toca 3 bips contínuos até a confirmação
- **Ao confirmar o alerta**: Toca 2 bips finais como confirmação

## Teste Isolado dos Bips

Você também pode testar os sons de bip isoladamente:

1. Abra o arquivo `test-beeps.html` no navegador
2. Clique no botão "Tocar 3 Bips Contínuos" para ouvir a sequência
3. Clique em "Parar Bips" para interromper a reprodução
4. Clique em "Tocar Bips de Confirmação" para ouvir os 2 bips finais

## Testando a Responsividade

Para testar a responsividade do aplicativo:

1. Execute o aplicativo com `npm run dev`
2. Abra o navegador e pressione F12 para abrir as ferramentas de desenvolvedor
3. Clique no ícone de dispositivo móvel (Device Toolbar) na barra de ferramentas
4. Selecione diferentes dispositivos para testar:
   - iPhone SE (375x667)
   - iPhone 8 (414x736)
   - Galaxy S8+ (412x846)
   - Pixel 2 (411x731)
5. Ou defina dimensões personalizadas para testar telas muito pequenas (abaixo de 320px)
6. Verifique se todos os elementos estão visíveis e funcionais
7. Teste também em dispositivos físicos reais se possível

### Dicas para testes de responsividade:
- Verifique se o conteúdo não ultrapassa as bordas da tela
- Certifique-se de que os botões são clicáveis facilmente
- Confirme que o texto é legível sem zoom
- Teste a orientação paisagem e retrato
- Verifique o comportamento em conexões lentas

## Solução de Problemas

### Erro "Invalid supabaseUrl: Must be a valid HTTP or HTTPS URL"

Este erro ocorre quando as variáveis de ambiente do Supabase não estão configuradas corretamente no Vercel:

1. Verifique se você adicionou as variáveis de ambiente no dashboard do Vercel:
   - `VITE_SUPABASE_URL` com a URL completa do seu projeto Supabase (ex: https://seu-projeto.supabase.co)
   - `VITE_SUPABASE_ANON_KEY` com a chave anônima do seu projeto
   - `VITE_SOCKET_URL` com a URL do seu servidor Socket.IO implantado

2. Certifique-se de que os valores estão corretos e não contêm aspas ou espaços extras

3. Após adicionar as variáveis, faça um novo deploy do seu projeto

4. Verifique se o projeto está reconstruindo corretamente após a adição das variáveis

### Problemas comuns e soluções:

1. **Aplicativo em branco**: Verifique o console do navegador (F12) para erros
2. **Erros de CORS**: Certifique-se de que as URLs estão configuradas corretamente no Supabase e Socket.IO
3. **Problemas de autenticação**: Verifique se as chaves do Supabase estão corretas
4. **Dados não persistindo**: Confirme que o Supabase está configurado e acessível
5. **Tempo real não funcionando**: Verifique se o servidor Socket.IO está implantado e acessível

Se continuar tendo problemas, verifique:
- As variáveis de ambiente estão definidas no Vercel
- Os valores das variáveis estão corretos
- O projeto foi reconstruído após a adição das variáveis
- Não há erros de digitação nas URLs
- O servidor Socket.IO está acessível publicamente