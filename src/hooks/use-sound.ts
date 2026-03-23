"use client";

import { useCallback, useEffect, useState } from "react";
import Howler from "howler";

// Types de sons disponibles
export type SoundType = 
  | "notification" 
  | "success" 
  | "error" 
  | "warning" 
  | "reminder"
  | "payment"
  | "click";

// Configuration des sons
const SOUND_CONFIG: Record<SoundType, { file: string; volume: number }> = {
  notification: { file: "/sounds/notification.mp3", volume: 0.5 },
  success: { file: "/sounds/success.mp3", volume: 0.6 },
  error: { file: "/sounds/error.mp3", volume: 0.5 },
  warning: { file: "/sounds/warning.mp3", volume: 0.5 },
  reminder: { file: "/sounds/reminder.mp3", volume: 0.7 },
  payment: { file: "/sounds/payment.mp3", volume: 0.6 },
  click: { file: "/sounds/click.mp3", volume: 0.3 },
};

// Cache des sons chargés
const soundCache: Map<SoundType, Howler.Howl> = new Map();

// Charger un son
function loadSound(type: SoundType): Howler.Howl {
  if (soundCache.has(type)) {
    return soundCache.get(type)!;
  }

  const config = SOUND_CONFIG[type];
  const sound = new Howler.Howl({
    src: [config.file],
    volume: config.volume,
    preload: true,
    html5: true, // Meilleure compatibilité mobile
  });

  soundCache.set(type, sound);
  return sound;
}

// Fonction utilitaire pour lire les préférences
function getInitialSoundPrefs() {
  if (typeof window === "undefined") {
    return { enabled: true, isMuted: false };
  }
  const savedEnabled = localStorage.getItem("soundEnabled");
  const savedMuted = localStorage.getItem("soundMuted");
  return {
    enabled: savedEnabled !== "false",
    isMuted: savedMuted === "true",
  };
}

// Hook principal pour jouer des sons
export function useSound() {
  const [enabled, setEnabled] = useState(() => getInitialSoundPrefs().enabled);
  const [isMuted, setIsMuted] = useState(() => getInitialSoundPrefs().isMuted);

  // Sauvegarder les préférences
  useEffect(() => {
    localStorage.setItem("soundEnabled", String(enabled));
    localStorage.setItem("soundMuted", String(isMuted));
  }, [enabled, isMuted]);

  // Jouer un son
  const play = useCallback((type: SoundType) => {
    if (!enabled || isMuted) return;

    try {
      const sound = loadSound(type);
      sound.play();
    } catch (error) {
      console.warn(`Failed to play sound: ${type}`, error);
    }
  }, [enabled, isMuted]);

  // Activer/désactiver les sons
  const toggleSound = useCallback(() => {
    setEnabled((prev) => !prev);
  }, []);

  // Mute/unmute
  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  // Changer le volume global
  const setGlobalVolume = useCallback((volume: number) => {
    Howler.Howler.volume(Math.max(0, Math.min(1, volume)));
  }, []);

  return {
    play,
    enabled,
    isMuted,
    toggleSound,
    toggleMute,
    setGlobalVolume,
    setEnabled,
    setIsMuted,
  };
}

// Hook pour les notifications sonores automatiques
export function useNotificationSound() {
  const { play, enabled, isMuted } = useSound();

  // Jouer un son de notification
  const playNotification = useCallback(() => {
    play("notification");
  }, [play]);

  // Jouer un son de succès
  const playSuccess = useCallback(() => {
    play("success");
  }, [play]);

  // Jouer un son d'erreur
  const playError = useCallback(() => {
    play("error");
  }, [play]);

  // Jouer un son de warning
  const playWarning = useCallback(() => {
    play("warning");
  }, [play]);

  // Jouer un son de relance envoyée
  const playReminder = useCallback(() => {
    play("reminder");
  }, [play]);

  // Jouer un son de paiement reçu
  const playPayment = useCallback(() => {
    play("payment");
  }, [play]);

  return {
    playNotification,
    playSuccess,
    playError,
    playWarning,
    playReminder,
    playPayment,
    soundEnabled: enabled && !isMuted,
  };
}

export default useSound;
