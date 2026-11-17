import { COLORS } from "../../config/arena.js";
import { createEntity } from "../../utils/entity.js";

// Cesta de basquete (provisória). O centro do aro fica em (0, 2.8, 0)
// relativo à entidade: para mudar a altura, mexa só no "y" dela.
//
// Partes:
//   - modelo do Blender (#cesta-model), escalado e alinhado ao aro;
//   - poste (o modelo é de parede, então ganhou um suporte);
//   - colisores invisíveis do poste e da tabela;
//   - aro físico + contador de cestas + placar.
const STATIC_BOX = "shape: box; mass: 0; material: wood";

AFRAME.registerComponent("basketball-hoop", {
  schema: {
    model: { default: "#cesta-model" },
  },

  init() {
    [
      createEntity("a-entity", {
        "gltf-model": this.data.model,
        position: "0.06 1.99 -0.092",
        scale: "0.12 0.12 0.12",
      }),
      createEntity("a-cylinder", {
        position: "0 1.5 -0.43", radius: 0.08, height: 3.6, color: COLORS.pole,
      }),
      createEntity("a-box", {
        visible: false,
        position: "0 1.5 -0.43",
        width: 0.16, height: 3.6, depth: 0.16,
        "physics-body": STATIC_BOX,
      }),
      createEntity("a-box", {
        visible: false,
        position: "0 3.06 -0.314",
        width: 1.05, height: 0.85, depth: 0.06,
        "physics-body": STATIC_BOX,
      }),
      createEntity("a-entity", { position: "0 2.8 0", "hoop-ring": "", "hoop-score": "" }),
      createEntity("a-text", {
        position: "0 3.7 -0.3", align: "center", width: 4, "score-display": "",
      }),
    ].forEach((child) => this.el.appendChild(child));
  },
});
