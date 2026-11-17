import { COLORS } from "../../config/arena.js";
import { createEntity, vec3 } from "../../utils/entity.js";

// Painel com o nome da arena, sobre dois postes.
AFRAME.registerComponent("arena-scoreboard", {
  schema: {
    title: { default: "ARENA POKEMON" },
    width: { default: 8 },
  },

  init() {
    const { title, width } = this.data;
    const postX = width / 2 - 0.6;
    const post = (x) => createEntity("a-cylinder", {
      position: vec3(x, 1.6, 0), radius: 0.1, height: 3.2, color: COLORS.pole,
    });

    [
      post(-postX),
      post(postX),
      createEntity("a-box", { position: "0 3.6 0", width, height: 1.8, depth: 0.2, color: "#1f2a44" }),
      createEntity("a-box", { position: "0 3.6 0.11", width: width - 0.3, height: 1.5, depth: 0.02, color: "#ffcb05" }),
      createEntity("a-text", { value: title, position: "0 3.6 0.13", align: "center", color: "#2a4b9b", width: 12 }),
    ].forEach((child) => this.el.appendChild(child));
  },
});
