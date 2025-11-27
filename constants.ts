import { AlertOption } from './types';

export const BRAZILIAN_STATES = [
  { sigla: 'AC', nome: 'Acre' },
  { sigla: 'AL', nome: 'Alagoas' },
  { sigla: 'AP', nome: 'Amapá' },
  { sigla: 'AM', nome: 'Amazonas' },
  { sigla: 'BA', nome: 'Bahia' },
  { sigla: 'CE', nome: 'Ceará' },
  { sigla: 'DF', nome: 'Distrito Federal' },
  { sigla: 'ES', nome: 'Espírito Santo' },
  { sigla: 'GO', nome: 'Goiás' },
  { sigla: 'MA', nome: 'Maranhão' },
  { sigla: 'MT', nome: 'Mato Grosso' },
  { sigla: 'MS', nome: 'Mato Grosso do Sul' },
  { sigla: 'MG', nome: 'Minas Gerais' },
  { sigla: 'PA', nome: 'Pará' },
  { sigla: 'PB', nome: 'Paraíba' },
  { sigla: 'PR', nome: 'Paraná' },
  { sigla: 'PE', nome: 'Pernambuco' },
  { sigla: 'PI', nome: 'Piauí' },
  { sigla: 'RJ', nome: 'Rio de Janeiro' },
  { sigla: 'RN', nome: 'Rio Grande do Norte' },
  { sigla: 'RS', nome: 'Rio Grande do Sul' },
  { sigla: 'RO', nome: 'Rondônia' },
  { sigla: 'RR', nome: 'Roraima' },
  { sigla: 'SC', nome: 'Santa Catarina' },
  { sigla: 'SP', nome: 'São Paulo' },
  { sigla: 'SE', nome: 'Sergipe' },
  { sigla: 'TO', nome: 'Tocantins' }
];

export const PREDEFINED_ALERTS: AlertOption[] = [
  { id: 'urgent_exit', label: 'Preciso sair com urgência!', iconName: 'Siren', category: 'urgent' },
  { id: 'blocking', label: 'Seu carro está bloqueando a saída', iconName: 'Ban', category: 'urgent' },
  { id: 'lights_on', label: 'Farol aceso!', iconName: 'Lightbulb', category: 'warning' },
  { id: 'trunk_open', label: 'Porta-malas aberto!', iconName: 'Unlock', category: 'warning' },
  { id: 'alarm', label: 'Alarme acionado!', iconName: 'BellRing', category: 'urgent' },
  { id: 'flat_tire', label: 'Pneu murcho', iconName: 'CircleDashed', category: 'warning' },
  { id: 'window_open', label: 'Janela aberta!', iconName: 'Wind', category: 'info' },
];