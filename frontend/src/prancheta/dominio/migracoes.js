import { SCHEMA_VERSION } from './schema.js';

/**
 * Cadeia de migração aplicada na LEITURA.
 *
 * Existe com uma versão só de propósito. Escrever agora custa minutos;
 * escrever depois de haver jogadas salvas custa um fim de semana.
 */
export function migrar(jogada) {
  if (!jogada) return null;
  let j = structuredClone(jogada);

  if (j.schemaVersion > SCHEMA_VERSION) {
    throw new Error(
      `Jogada em schemaVersion ${j.schemaVersion}, mais nova que a suportada ` +
      `(${SCHEMA_VERSION}). Atualize a página.`);
  }

  // if (j.schemaVersion < 2) j = v1paraV2(j);

  return j;
}
