import { BLEACHERS, COLORS } from "../../config/arena.js";
import { createEntity, vec3 } from "../../utils/entity.js";

// Arquibancada lateral: degraus cada vez mais altos e um muro ao fundo.
// "side" escolhe o lado (e as cores): esquerda vermelha, direita azul.
AFRAME.registerComponent("arena-bleachers", {
  schema: {
    side: { default: "left", oneOf: ["left", "right"] },
  },

  init() {
    const direction = this.data.side === "left" ? -1 : 1;
    const [colorA, colorB] = BLEACHERS.colors[this.data.side];
    const { firstStepX, stepWidth, stepHeights, length, backWall } = BLEACHERS;

    const steps = stepHeights.map((height, index) => createEntity("a-box", {
      position: vec3(direction * (firstStepX + index * stepWidth), height / 2, 0),
      width: stepWidth,
      height,
      depth: length,
      color: index % 2 === 0 ? colorA : colorB,
    }));

    const back = createEntity("a-box", {
      position: vec3(direction * backWall.x, backWall.height / 2, 0),
      width: backWall.width,
      height: backWall.height,
      depth: length,
      color: COLORS.concrete,
    });

    [...steps, back].forEach((child) => this.el.appendChild(child));
  },
});
