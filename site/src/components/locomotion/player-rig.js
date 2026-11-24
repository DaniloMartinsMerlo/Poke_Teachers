import { EVENTS } from "../../config/constants.js";
import { playerInfo } from "../../config/players.js";

// Rig do jogador (entidade que contém câmera, mãos e controles).
// Toda locomoção artificial passa por aqui, para que a colisão seja
// aplicada no mesmo quadro do movimento. Na partida online, posiciona o
// convidado (J2) do outro lado do campo (z = -7, olhando para +z).
AFRAME.registerComponent("player-rig", {
  init() {
    this.head = new THREE.Vector3();
    this.up = new THREE.Vector3(0, 1, 0);
    this.onModeChanged = () => {
      const player = this.el.sceneEl.systems["game-flow"]?.localPlayer() || "p1";
      this.placeForPlayer(player);
    };
    this.el.sceneEl.addEventListener(EVENTS.GAME_MODE_CHANGED, this.onModeChanged);
  },

  /** Coloca o rig no box inicial de `player` (p1 em z = 7; p2 em z = -7). */
  placeForPlayer(player) {
    const { spawn } = playerInfo(player);
    if (!spawn) {
      return;
    }
    this.el.object3D.position.set(spawn.x, spawn.y, spawn.z);
    this.el.object3D.rotation.set(0, spawn.yaw, 0);
    this.el.object3D.updateMatrixWorld(true);
    const collision = this.el.components["player-collision"];
    if (collision) {
      collision.lastSafeHead = null;
      collision.resolve();
    }
  },

  /** Desloca o rig (vetor em coordenadas de mundo). */
  translate(offset) {
    this.el.object3D.position.add(offset);
    this.constrain();
  },

  /** Gira o rig em torno da cabeça, para o jogador não "deslizar". */
  rotateAroundHead(radians) {
    const camera = this.el.sceneEl.camera;
    if (!camera) {
      return;
    }
    camera.getWorldPosition(this.head);
    const rig = this.el.object3D;
    const fromHead = rig.position.clone().sub(this.head).applyAxisAngle(this.up, radians);
    rig.position.copy(this.head).add(fromHead);
    rig.rotation.y += radians;
  },

  constrain() {
    const collision = this.el.components["player-collision"];
    if (collision) {
      collision.resolve();
    }
  },

  remove() {
    this.el.sceneEl.removeEventListener(EVENTS.GAME_MODE_CHANGED, this.onModeChanged);
  },
});

/** Componente "player-rig" do rig que contém `el` (ou null). */
export function findPlayerRig(el) {
  const rigEl = el.closest("[player-rig]");
  return (rigEl && rigEl.components["player-rig"]) || null;
}
