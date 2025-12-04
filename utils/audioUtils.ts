// Função para criar um bip sonoro usando Web Audio API
export const createBeepSound = (frequency: number = 800, duration: number = 200) => {
  try {
    // Verificar se o contexto de áudio está disponível
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) {
      console.warn('Web Audio API não suportada neste navegador');
      return null;
    }
    
    const audioContext = new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.type = 'square';
    oscillator.frequency.value = frequency;
    gainNode.gain.value = 0.3;
    
    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration / 1000);
    
    return audioContext;
  } catch (error) {
    console.error('Erro ao criar som de bip:', error);
    return null;
  }
};

// Classe simplificada para reproduzir bips
export class BeepPlayer {
  private audioContext: AudioContext | null = null;
  private isPlaying: boolean = false;
  private intervalId: any = null;
  
  // Reproduzir um único bip
  playSingleBeep(frequency: number = 800, duration: number = 200) {
    console.log('Reproduzindo bip simples - frequência:', frequency, 'duração:', duration);
    if (this.audioContext) {
      this.audioContext.close().catch(console.error);
    }
    this.audioContext = createBeepSound(frequency, duration) || null;
  }
  
  // Reproduzir três bips contínuos (para quando envia mensagem)
  playContinuousBeeps() {
    console.log('Iniciando bips contínuos');
    this.stopContinuousBeeps(); // Parar qualquer reprodução anterior
    
    // Reproduzir 3 bips rapidamente
    this.playSingleBeep(800, 150);
    
    setTimeout(() => {
      this.playSingleBeep(800, 150);
    }, 200);
    
    setTimeout(() => {
      this.playSingleBeep(800, 150);
    }, 400);
    
    // Continuar tocando até ser interrompido
    this.intervalId = setInterval(() => {
      this.playSingleBeep(800, 150);
    }, 1000);
  }
  
  // Parar os bips contínuos
  stopContinuousBeeps() {
    console.log('Parando bips contínuos');
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    // Fechar o contexto de áudio para liberar recursos
    if (this.audioContext) {
      this.audioContext.close().catch(console.error);
      this.audioContext = null;
    }
  }
  
  // Reproduzir dois bips curtos (confirmação)
  playConfirmationBeeps() {
    console.log('Reproduzindo dois bips de confirmação');
    this.playSingleBeep(600, 150);
    
    // Segundo bip após um pequeno intervalo
    setTimeout(() => {
      this.playSingleBeep(600, 150);
    }, 300);
  }
  
  // Limpar recursos ao destruir
  cleanup() {
    this.stopContinuousBeeps();
  }
}