import { PLAYER_OBSTACLE_SELECTOR } from "../../config/constants.js";
import { overlapsHeight, rectFromBox, resolveCircleAgainstRects } from "../../domain/collision.js";
import { whenSceneLoaded } from "../../utils/entity.js";

// Impede o jogador de atravessar obstáculos (as muretas da arena).
// O corpo do jogador é um círculo em volta da cabeça, visto de cima.
// Vale para todo tipo de movimento: teclado, analógico e também andar de
// verdade com o headset (nesse caso o rig é empurrado de volta).
//
// Os obstáculos são lidos uma vez, quando a cena carrega: precisam ser
// estáticos e ter a classe "player-obstacle".
AFRAME.registerComponent("player-collision", {
  schema: {
    radius: { default: 0.25 },
    obstacles: { default: PLAYER_OBSTACLE_SELECTOR },
  },

  init() {
    this.rects = [];
    this.head = new THREE.Vector3();
    // Última posição da cabeça (x, z) sem colisão.
    this.lastSafeHead = null;
    whenSceneLoaded(this.el.sceneEl, () => this.collectObstacles());
  },

  collectObstacles() {
    const sceneEl = this.el.sceneEl;
    sceneEl.object3D.updateMatrixWorld(true);
    this.rects = [...sceneEl.querySelectorAll(this.data.obstacles)]
      .map((el) => rectFromBox(new THREE.Box3().setFromObject(el.object3D)))
      .filter((rect) => Number.isFinite(rect.minX));
  },

  // Cobre o movimento que não passa pelo "player-rig": teclado
  // (wasd-controls) e o jogador andando fisicamente.
  tick() {
    this.resolve();
  },

  resolve() {
    const camera = this.el.sceneEl.camera;
    if (!camera || !this.rects.length) {
      return;
    }
    camera.getWorldPosition(this.head);
    const feetY = this.el.object3D.position.y;
    const nearby = this.rects.filter((rect) => overlapsHeight(rect, feetY, this.head.y));
    const correction = resolveCircleAgainstRects(
      this.head, this.data.radius, nearby, this.lastSafeHead);
    this.el.object3D.position.x += correction.x;
    this.el.object3D.position.z += correction.z;
    this.lastSafeHead = { x: this.head.x + correction.x, z: this.head.z + correction.z };
  },
});
