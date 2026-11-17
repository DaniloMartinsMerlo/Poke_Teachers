// Pouso da pokébola: decide se um contato é "caiu em cima de algo"
// (chão, tampo) e não uma batida de lado (parede).

/**
 * @param {{y: number}} normal normal do contato (unitária)
 * @param {number} minUp quanto a normal precisa apontar para cima/baixo
 */
export function isLandingNormal(normal, minUp) {
  return Math.abs(normal.y) >= minUp;
}

/** O pokémon só sai da bola quando ela pousa nesta superfície. */
export function releasesPokemon(surface, releaseSurface) {
  return surface === releaseSurface;
}

/**
 * Escolhe sempre o mesmo item da lista para o mesmo nome, para cada
 * professor ter "seu" pokémon. Nomes em `knownNames` seguem a ordem da
 * lista (visuais diferentes entre si); os demais usam um hash simples.
 * @template T
 * @param {string} name
 * @param {readonly T[]} options
 * @param {readonly string[]} [knownNames]
 * @returns {T}
 */
export function pickByName(name, options, knownNames = []) {
  const known = knownNames.indexOf(name);
  if (known >= 0) {
    return options[known % options.length];
  }
  let hash = 0;
  for (const char of String(name)) {
    hash = (hash * 31 + char.codePointAt(0)) >>> 0;
  }
  return options[hash % options.length];
}
