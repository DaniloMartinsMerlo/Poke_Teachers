import { LIGHT_TOWERS } from "../../config/arena.js";
import { createEntity, vec3 } from "../../utils/entity.js";

// Torres de iluminação nos quatro cantos da arena.

function lightTower(x, z) {
  const { height } = LIGHT_TOWERS;
  return createEntity("a-entity", { position: vec3(x, 0, z) }, [
    createEntity("a-cylinder", {
      position: vec3(0, height / 2, 0), radius: 0.15, height, color: "#7a7a7a",
    }),
    createEntity("a-box", {
      position: vec3(0, height + 0.2, 0),
      width: 1.6,
      height: 0.9,
      depth: 0.3,
      color: "#fffbe0",
      material: "emissive: #fff6c0; emissiveIntensity: 0.8",
    }),
  ]);
}

AFRAME.registerComponent("arena-light-towers", {
  init() {
    const { halfX, halfZ } = LIGHT_TOWERS;
    [[-1, -1], [1, -1], [-1, 1], [1, 1]]
      .map(([sx, sz]) => lightTower(sx * halfX, sz * halfZ))
      .forEach((tower) => this.el.appendChild(tower));
  },
});
