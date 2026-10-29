import type { Day } from '../lib/dates.ts';
import { inTauri } from '../platform.ts';
import type { Repo } from './types.ts';

/** SQLite dentro de la app; localStorage al probar la interfaz en el navegador. */
export async function openRepo(today: Day): Promise<Repo> {
  if (inTauri) return (await import('./sqliteRepo.ts')).openSqliteRepo();
  return (await import('./browserRepo.ts')).openBrowserRepo(today);
}
