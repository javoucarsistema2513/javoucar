import { AlertOption } from './types';

export const BRAZILIAN_STATES = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", 
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"
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
