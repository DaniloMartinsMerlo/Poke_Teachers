import { COLORS, WALL } from "../../config/arena.js";
import { PLAYER_OBSTACLE_CLASS } from "../../config/constants.js";
import { createEntity, vec3 } from "../../utils/entity.js";

// Muretas em volta do campo. Cada uma tem:
//   - corpo físico: as pokébolas arremessadas ficam dentro da arena;
//   - classe "player-obstacle": o jogador não atravessa.

function wall({ x, z, width, depth }) {
  const { height, trimHeight } = WALL;
  return [
    createEntity("a-box", {
      class: PLAYER_OBSTACLE_CLASS,
      position: vec3(x, height / 2, z),
      width,
      height,
      depth,
      color: COLORS.wall,
      "physics-body": "shape: box; mass: 0; material: wood",
    }),
    // Faixa branca no topo.
    createEntity("a-box", {
      position: vec3(x, height + trimHeight / 2 - 0.005, z),
      width: width + 0.02,
      height: trimHeight,
      depth: depth + 0.02,
      color: COLORS.wallTrim,
    }),
  ];
}

AFRAME.registerComponent("arena-walls", {
  init() {
    const { innerHalfWidth, innerHalfLength, thickness } = WALL;
    const sideX = innerHalfWidth + thickness / 2;
    const endZ = innerHalfLength + thickness / 2;
    // As laterais vão até as quinas; as de fundo encaixam entre elas.
    const sideDepth = 2 * (innerHalfLength + thickness);
    const endWidth = 2 * innerHalfWidth;

    [
      wall({ x: -sideX, z: 0, width: thickness, depth: sideDepth }),
      wall({ x: sideX, z: 0, width: thickness, depth: sideDepth }),
      wall({ x: 0, z: -endZ, width: endWidth, depth: thickness }),
      wall({ x: 0, z: endZ, width: endWidth, depth: thickness }),
    ].flat().forEach((child) => this.el.appendChild(child));
  },
});
