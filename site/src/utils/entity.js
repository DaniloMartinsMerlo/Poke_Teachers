/**
 * Cria uma entidade A-Frame a partir de atributos e filhos.
 * Os valores dos atributos são strings, no mesmo formato usado no HTML.
 *
 * @param {string} tag ex.: "a-box", "a-entity"
 * @param {Record<string, string | number | boolean>} [attributes]
 * @param {Element[]} [children]
 */
export function createEntity(tag, attributes = {}, children = []) {
  const el = document.createElement(tag);
  Object.entries(attributes).forEach(([name, value]) => el.setAttribute(name, String(value)));
  children.forEach((child) => el.appendChild(child));
  return el;
}

export const vec3 = (x, y, z) => `${x} ${y} ${z}`;

/** Executa `callback` assim que a cena terminar de carregar. */
export function whenSceneLoaded(sceneEl, callback) {
  if (sceneEl.hasLoaded) {
    callback();
  } else {
    sceneEl.addEventListener("loaded", callback, { once: true });
  }
}
