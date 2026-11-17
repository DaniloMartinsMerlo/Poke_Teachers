/**
 * Item mais próximo de `origin` dentro de `maxDistance` (ou null).
 * @template T
 * @param {T[]} items
 * @param {{distanceTo(p: any): number}} origin
 * @param {number} maxDistance
 * @param {(item: T) => any} positionOf
 * @returns {T | null}
 */
export function findNearest(items, origin, maxDistance, positionOf) {
  let nearest = null;
  let nearestDistance = maxDistance;
  for (const item of items) {
    const distance = origin.distanceTo(positionOf(item));
    if (distance < nearestDistance) {
      nearest = item;
      nearestDistance = distance;
    }
  }
  return nearest;
}
