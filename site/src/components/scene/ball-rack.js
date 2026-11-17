import { GRABBABLE_CLASS } from "../../config/constants.js";
import { createEntity, vec3, whenSceneLoaded } from "../../utils/entity.js";

// Suporte das pokébolas. Monta o móvel e coloca uma pokébola de cada
// modelo em fila sobre o tampo (eixo x local do suporte).
//
// As pokébolas são filhas da cena, e não do suporte: os pegadores e a
// física trabalham com objetos soltos no mundo.
AFRAME.registerComponent("ball-rack", {
  schema: {
    models: { type: "array", default: ["#pokeball-model", "#greatball-model", "#masterball-model"] },
    width: { default: 0.9 },
    height: { default: 0.9 },
    depth: { default: 0.35 },
    spacing: { default: 0.28 },
    ballScale: { default: 0.01 },
    // Altura do centro da bola acima do tampo.
    ballLift: { default: 0.11 },
  },

  init() {
    this.buildStand();
    whenSceneLoaded(this.el.sceneEl, () => this.spawnBalls());
  },

  buildStand() {
    const { width, height, depth } = this.data;
    [
      createEntity("a-box", {
        position: vec3(0, height / 2, 0),
        width, height, depth,
        color: "#f4f4f4",
        "physics-body": "shape: box; mass: 0; material: wood",
      }),
      createEntity("a-box", {
        position: vec3(0, height + 0.01, 0),
        width: width + 0.02, height: 0.02, depth: depth + 0.02,
        color: "#e3350d",
      }),
    ].forEach((child) => this.el.appendChild(child));
  },

  spawnBalls() {
    const { models, spacing, height, ballLift, ballScale } = this.data;
    const firstX = -spacing * (models.length - 1) / 2;
    this.el.object3D.updateMatrixWorld(true);

    models.forEach((model, index) => {
      const position = this.el.object3D.localToWorld(
        new THREE.Vector3(firstX + index * spacing, height + ballLift, 0));
      this.el.sceneEl.appendChild(createEntity("a-entity", {
        class: GRABBABLE_CLASS,
        position: vec3(position.x, position.y, position.z),
        scale: vec3(ballScale, ballScale, ballScale),
        "gltf-model": model,
        "physics-body": "",
        "cursor-grabber": "",
      }));
    });
  },
});
