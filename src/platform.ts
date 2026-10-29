// Lo que depende de estar dentro de la app de escritorio (Tauri). En el navegador, todo esto no hace nada.
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type { Mood } from './lib/tones.ts';

export const inTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

/** Atajo global para anotar (se registra en src-tauri/src/lib.rs). */
export const SHORTCUT_KEYS = ['Ctrl', 'Alt', 'Espacio'];

/** Eventos que manda la bandeja o el atajo global. Devuelve la función para dejar de escuchar. */
export function onAppEvent(name: 'capture' | 'open-today', fn: () => void): () => void;
export function onAppEvent(name: 'mood', fn: (mood: Mood) => void): () => void;
export function onAppEvent(name: string, fn: (payload: never) => void): () => void {
  if (!inTauri) return () => {};
  const off = listen(name, (e) => fn(e.payload as never));
  return () => { off.then((f) => f()); };
}

/** Marca el mood elegido en el menú de la bandeja y explica si una marca lo está cambiando. */
export function syncTray(mood: Mood, note: string | null) {
  if (inTauri) invoke('tray_state', { mood, note }).catch(() => {});
}

/** Texto al pasar el mouse por el ícono de la bandeja (por ejemplo, el tiempo del pomodoro). */
export function setTrayTooltip(text: string) {
  if (inTauri) invoke('tray_tooltip', { text }).catch(() => {});
}

export async function notify(title: string, body?: string) {
  if (!inTauri) return;
  const n = await import('@tauri-apps/plugin-notification');
  let ok = await n.isPermissionGranted();
  if (!ok) ok = (await n.requestPermission()) === 'granted';
  if (ok) n.sendNotification({ title, body });
}
