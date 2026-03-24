"use client";

// Générateur de sons synthétiques avec Web Audio API
// Alternative aux fichiers audio MP3

export type SoundType = 
  | "notification" 
  | "success" 
  | "error" 
  | "warning" 
  | "reminder"
  | "payment"
  | "click";

// Configuration des fréquences et durées pour chaque type de son
const SOUND_CONFIGS: Record<SoundType, {
  frequencies: number[];
  duration: number;
  type: OscillatorType;
  volume: number;
}> = {
  notification: {
    frequencies: [523.25, 659.25, 783.99], // C5, E5, G5
    duration: 0.15,
    type: "sine",
    volume: 0.3,
  },
  success: {
    frequencies: [523.25, 659.25, 783.99, 1046.50], // C5, E5, G5, C6
    duration: 0.12,
    type: "sine",
    volume: 0.35,
  },
  error: {
    frequencies: [311.13, 293.66], // Eb4, D4
    duration: 0.2,
    type: "square",
    volume: 0.25,
  },
  warning: {
    frequencies: [440, 440], // A4
    duration: 0.1,
    type: "triangle",
    volume: 0.3,
  },
  reminder: {
    frequencies: [880, 1108.73, 1318.51], // A5, C#6, E6
    duration: 0.18,
    type: "sine",
    volume: 0.4,
  },
  payment: {
    frequencies: [523.25, 659.25, 783.99, 1046.50, 1318.51], // C major arpeggio
    duration: 0.1,
    type: "sine",
    volume: 0.35,
  },
  click: {
    frequencies: [1000],
    duration: 0.05,
    type: "sine",
    volume: 0.15,
  },
};

let audioContext: AudioContext | null = null;

// Obtenir ou créer le contexte audio
function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
}

// Jouer une note
function playNote(
  ctx: AudioContext,
  frequency: number,
  startTime: number,
  duration: number,
  type: OscillatorType,
  volume: number
) {
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startTime);

  // Envelope ADSR simple
  gainNode.gain.setValueAtTime(0, startTime);
  gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

  oscillator.start(startTime);
  oscillator.stop(startTime + duration);
}

// Fonction principale pour jouer un son
export function playSound(type: SoundType): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const ctx = getAudioContext();
      
      // Resume le contexte si suspendu (politique des navigateurs)
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      const config = SOUND_CONFIGS[type];
      const now = ctx.currentTime;

      // Jouer chaque note en séquence
      config.frequencies.forEach((freq, index) => {
        const startTime = now + index * config.duration;
        playNote(ctx, freq, startTime, config.duration, config.type, config.volume);
      });

      // Résoudre après la durée totale
      const totalDuration = config.frequencies.length * config.duration * 1000;
      setTimeout(resolve, totalDuration);
    } catch (error) {
      console.warn(`Failed to play sound: ${type}`, error);
      reject(error);
    }
  });
}

// Classe SoundManager pour une utilisation plus avancée
export class SoundManager {
  private enabled: boolean = true;
  private muted: boolean = false;
  private volume: number = 1.0;

  constructor() {
    // Charger les préférences
    if (typeof window !== "undefined") {
      const savedEnabled = localStorage.getItem("soundEnabled");
      const savedMuted = localStorage.getItem("soundMuted");
      const savedVolume = localStorage.getItem("soundVolume");

      if (savedEnabled !== null) this.enabled = savedEnabled === "true";
      if (savedMuted !== null) this.muted = savedMuted === "true";
      if (savedVolume !== null) this.volume = parseFloat(savedVolume);
    }
  }

  play(type: SoundType): void {
    if (!this.enabled || this.muted) return;
    playSound(type);
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    localStorage.setItem("soundEnabled", String(enabled));
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    localStorage.setItem("soundMuted", String(muted));
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    localStorage.setItem("soundVolume", String(this.volume));
  }

  getEnabled(): boolean {
    return this.enabled;
  }

  getMuted(): boolean {
    return this.muted;
  }

  getVolume(): number {
    return this.volume;
  }

  toggle(): boolean {
    this.setEnabled(!this.enabled);
    return this.enabled;
  }

  toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }
}

// Instance globale
export const soundManager = new SoundManager();

// Hook React pour les sons
export function useSound() {
  const play = (type: SoundType) => {
    soundManager.play(type);
  };

  return {
    play,
    enabled: soundManager.getEnabled(),
    muted: soundManager.getMuted(),
    volume: soundManager.getVolume(),
    setEnabled: (v: boolean) => soundManager.setEnabled(v),
    setMuted: (v: boolean) => soundManager.setMuted(v),
    setVolume: (v: number) => soundManager.setVolume(v),
    toggle: () => soundManager.toggle(),
    toggleMute: () => soundManager.toggleMute(),
  };
}

// Hook pour les notifications sonores
export function useNotificationSound() {
  const { play, enabled, muted } = useSound();

  return {
    playNotification: () => play("notification"),
    playSuccess: () => play("success"),
    playError: () => play("error"),
    playWarning: () => play("warning"),
    playReminder: () => play("reminder"),
    playPayment: () => play("payment"),
    playClick: () => play("click"),
    soundEnabled: enabled && !muted,
  };
}

export default soundManager;
