import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ⚠️ SUBSTITUA PELAS SUAS CREDENCIAIS DO SUPABASE QUANDO TIVER O PROJETO CRIADO
// Enquanto estiver com os valores abaixo, o sistema rodará em MODO SIMULAÇÃO (Mock)
declare const process: {
  env: {
    VITE_SUPABASE_URL?: string;
    VITE_SUPABASE_ANON_KEY?: string;
  };
};

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'SUA_URL_DO_SUPABASE_AQUI';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'SUA_CHAVE_ANONIMA_AQUI';

const isMockMode = SUPABASE_URL === 'SUA_URL_DO_SUPABASE_AQUI';

let client: any;

if (!isMockMode) {
  client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    realtime: {
      params: {
        eventsPerSecond: 10, // Otimização para redes móveis
      },
    },
  });
} else {
  console.warn("⚠️ JávouCar rodando em MODO SIMULAÇÃO (Sem Backend Real). Login e Alertas são simulados.");
  
  // --- MOCK CLIENT IMPLEMENTATION ---
  // Simula o comportamento do Supabase usando LocalStorage e BroadcastChannel
  
  const MOCK_STORAGE_KEY = 'javoucar-mock-session';
  const broadcast = new BroadcastChannel('javoucar-mock-realtime');

  // Helpers para simular sessão
  const getMockSession = () => {
    const stored = localStorage.getItem(MOCK_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  };

  const listeners: Function[] = [];

  client = {
    auth: {
      getSession: async () => {
        return { data: { session: getMockSession() }, error: null };
      },
      getUser: async () => {
        const session = getMockSession();
        return { data: { user: session?.user || null }, error: null };
      },
      signInWithPassword: async ({ email }: { email: string }) => {
        // Simula login com sucesso para qualquer email
        const user = { id: 'mock-user-id', email };
        const session = { access_token: 'mock-token', user };
        localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(session));
        
        // Notifica listeners
        listeners.forEach(l => l('SIGNED_IN', session));
        return { data: { user, session }, error: null };
      },
      signUp: async ({ email, options }: any) => {
        // Simula cadastro e login imediato
        const user = { 
            id: 'mock-user-id-' + Date.now(), 
            email, 
            user_metadata: options?.data 
        };
        const session = { access_token: 'mock-token', user };
        localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(session));
        
        listeners.forEach(l => l('SIGNED_IN', session));
        return { data: { user, session }, error: null };
      },
      signOut: async () => {
        localStorage.removeItem(MOCK_STORAGE_KEY);
        listeners.forEach(l => l('SIGNED_OUT', null));
        return { error: null };
      },
      resetPasswordForEmail: async () => {
        return { error: null }; // Sempre sucesso
      },
      onAuthStateChange: (callback: Function) => {
        listeners.push(callback);
        return { data: { subscription: { unsubscribe: () => {} } } };
      }
    },
    // Mock do Realtime (Canais)
    channel: (channelName: string) => {
      let eventCallback: Function | null = null;

      // Escuta mensagens de outras abas via BroadcastChannel
      broadcast.onmessage = (event) => {
        if (event.data.type === 'broadcast' && eventCallback) {
            // Repassa para o callback registrado no componente
            eventCallback(event.data.payload); 
        }
      };

      return {
        on: (type: string, filter: any, callback: Function) => {
          // Registra o callback (ex: quando chegar um 'alert')
          eventCallback = (payload: any) => {
             // O formato do payload do Supabase Realtime é { payload: ... }
             callback({ payload });
          };
          return { subscribe: () => {} };
        },
        // Atualizado para aceitar callback de status (compatibilidade com código real)
        subscribe: (callback?: (status: string) => void) => {
           if (callback) {
             // Simula conexão rápida
             setTimeout(() => callback('SUBSCRIBED'), 100);
           }
        },
        send: async (message: any) => {
          // Quando envia, dispara para o BroadcastChannel (outras abas)
          broadcast.postMessage(message);
          
          // E TAMBÉM dispara localmente para a própria aba ver o resultado (demo)
          if (eventCallback) {
             eventCallback(message.payload); 
          }
          return {};
        }
      };
    },
    removeChannel: () => {
        // Cleanup simulado
    },
    // Adicionando método from para simular consultas ao banco de dados
    from: (table: string) => {
      // Objeto para armazenar os filtros encadeados
      let filters: { column: string, value: string }[] = [];
      let columns: string = '*';
      
      return {
        select: function(columnsParam: string = '*') {
          // Armazena as colunas selecionadas
          columns = columnsParam;
          
          // Reset filters for new query
          filters = [];
          
          const queryObject = {
            eq: function(column: string, value: string) {
              // Adiciona filtro ao array
              filters.push({ column, value });
              // Retorna o próprio objeto para encadeamento
              return this;
            },
            maybeSingle: function() {
              return this;
            },
            single: function() {
              return this;
            }
          };
          
          // Se for uma consulta real, adicionamos um método then para executar a consulta
          if (table === 'vehicles' || table === 'profiles') {
            // @ts-ignore
            queryObject.then = async function(resolve, reject) {
              try {
                // Simulação de resultados baseados nos filtros
                let result: any = null;
                let error: any = null;
                
                if (table === 'vehicles') {
                  // Simula alguns veículos para teste
                  const mockVehicles: any = {
                    'ABC1234': { plate: 'ABC1234', model: 'Honda Civic', color: 'Prata', state: 'SP', user_id: 'mock-user-id' },
                    'XYZ5678': { plate: 'XYZ5678', model: 'Toyota Corolla', color: 'Preto', state: 'RJ', user_id: 'mock-user-id-2' },
                    'DEF9012': { plate: 'DEF9012', model: 'Porsche 911', color: 'Amarelo Racing', state: 'MG', user_id: 'mock-user-id-3' }
                  };
                  
                  // Aplica filtros
                  if (filters.length > 0) {
                    // Para simplificação, vamos verificar apenas o primeiro filtro
                    const firstFilter = filters[0];
                    if (firstFilter.column === 'plate') {
                      result = mockVehicles[firstFilter.value.toUpperCase()] || null;
                    } else if (firstFilter.column === 'user_id') {
                      // Encontra veículo pelo user_id
                      const vehicles = Object.values(mockVehicles);
                      // @ts-ignore
                      result = vehicles.find(v => v.user_id === firstFilter.value) || null;
                    }
                  } else {
                    // Retorna todos os veículos
                    result = Object.values(mockVehicles);
                  }
                } else if (table === 'profiles') {
                  // Simula alguns perfis para teste
                  const mockProfiles: any = {
                    'mock-user-id': { id: 'mock-user-id', name: 'João Silva', phone: '(11) 99999-9999' },
                    'mock-user-id-2': { id: 'mock-user-id-2', name: 'Maria Oliveira', phone: '(21) 98888-8888' },
                    'mock-user-id-3': { id: 'mock-user-id-3', name: 'Carlos Souza', phone: '(31) 97777-7777' }
                  };
                  
                  // Aplica filtros
                  if (filters.length > 0) {
                    const firstFilter = filters[0];
                    if (firstFilter.column === 'id') {
                      result = mockProfiles[firstFilter.value] || null;
                    }
                  } else {
                    // Retorna todos os perfis
                    result = Object.values(mockProfiles);
                  }
                }
                
                resolve({ data: result, error });
              } catch (err) {
                reject(err);
              }
            };
          }
          
          return queryObject;
        },
        insert: async (data: any[]) => {
          // Simula inserção de veículo
          console.log('Veículo registrado:', data[0]);
          return { data: null, error: null };
        },
        update: async (data: any) => {
          // Simula atualização de veículo
          return {
            eq: async (column: string, value: string) => {
              console.log('Veículo atualizado:', data);
              return { data: null, error: null };
            }
          };
        }
      };
    }
  };
}

export const supabase = client;