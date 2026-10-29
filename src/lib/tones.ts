// Moods (temas de color) y marcas de las tareas. Los colores están en src/styles/colores.css.

export type Mood = 'calma' | 'energia' | 'concentracion' | 'fucsia';

export const MOODS: { id: Mood; name: string }[] = [
  { id: 'calma', name: 'Calma' },
  { id: 'energia', name: 'Energía' },
  { id: 'concentracion', name: 'Concentración' },
  { id: 'fucsia', name: 'Fucsia' },
];

export const isMood = (s: unknown): s is Mood => MOODS.some((m) => m.id === s);

export type Tone = 'urgente' | 'rapido' | 'tiempo' | 'calma';

// Marcas opcionales (matriz de Eisenhower). Cuando la lleva el bloque de "Ahora", la página toma su mood.
export const TONES: { id: Tone; name: string; mood: Mood }[] = [
  { id: 'urgente', name: 'Hoy sin falta', mood: 'fucsia' }, // urgente e importante
  { id: 'rapido', name: 'Rrrrápido', mood: 'energia' }, // urgente, no importante
  { id: 'tiempo', name: 'Con tiempo', mood: 'concentracion' }, // importante, no urgente
  { id: 'calma', name: 'Con calma', mood: 'calma' }, // ni urgente ni importante
];

export const toneOf = (tone: Tone | null | undefined) => TONES.find((t) => t.id === tone);
