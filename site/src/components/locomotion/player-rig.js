// Rig do jogador (entidade que contém câmera, mãos e controles).
// Toda locomoção artificial passa por aqui, para que a colisão seja
// aplicada no mesmo quadro do movimento.
AFRAME.registerComponent("player-rig", {
  init() {
    this.head = new THREE.Vector3();
    this.up = new THREE.Vector3(0, 1, 0);
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
});

/** Componente "player-rig" do rig que contém `el` (ou null). */
export function findPlayerRig(el) {
  const rigEl = el.closest("[player-rig]");
  return (rigEl && rigEl.components["player-rig"]) || null;
}
