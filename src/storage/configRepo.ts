import { readEncryptedJson, writeEncryptedJson } from './secureDb';

export interface AppConfig {
  maxTrimestres: 3 | 5;
  // Autres configurations futures
}

const CONFIG_KEY = 'db:config:v1';

const DEFAULT_CONFIG: AppConfig = {
  maxTrimestres: 5,
};

export async function getConfig(): Promise<AppConfig> {
  try {
    const config = await readEncryptedJson<AppConfig>(DEFAULT_CONFIG, CONFIG_KEY);
    return config || DEFAULT_CONFIG;
  } catch (error) {
    console.error('Erreur lecture configuration:', error);
    return DEFAULT_CONFIG;
  }
}

export async function setConfig(config: AppConfig): Promise<void> {
  try {
    await writeEncryptedJson(config, CONFIG_KEY);
  } catch (error) {
    console.error('Erreur sauvegarde configuration:', error);
  }
}

export async function updateMaxTrimestres(maxTrimestres: 3 | 5): Promise<void> {
  const config = await getConfig();
  await setConfig({ ...config, maxTrimestres });
}

export async function getMaxTrimestres(): Promise<3 | 5> {
  const config = await getConfig();
  return config.maxTrimestres;
}

export function getTrimestresArray(maxTrimestres: 3 | 5): number[] {
  return maxTrimestres === 3 ? [1, 2, 3] : [1, 2, 3, 4, 5];
}
