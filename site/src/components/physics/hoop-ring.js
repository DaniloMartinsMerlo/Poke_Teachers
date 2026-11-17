import { whenSceneLoaded } from "../../utils/entity.js";

// Aro da cesta: anel de caixinhas estáticas com o meio vazio, para a bola
// poder bater no aro ou passar por dentro dele.
AFRAME.registerComponent("hoop-ring", {
  schema: {
    radius: { default: 0.294 },
    tube: { default: 0.03 },
    segments: { default: 16 },
  },

  init() {
    this.system = this.el.sceneEl.systems.physics;
    this.body = this.createRingBody();
    this.system.addStaticBody(this.body);

    // Posição de mundo só é confiável depois que a cena carrega.
    whenSceneLoaded(this.el.sceneEl, () => this.placeBody());
  },

  createRingBody() {
    const { radius, tube, segments } = this.data;
    const body = new CANNON.Body({ mass: 0, material: this.system.materials.wood });
    // Segmentos um pouco mais longos que o arco, para não deixar frestas.
    const segmentLength = (2 * Math.PI * radius / segments) * 1.15;
    const halfExtents = new CANNON.Vec3(tube / 2, tube / 2, segmentLength / 2);

    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const orientation = new CANNON.Quaternion();
      orientation.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), -angle);
      body.addShape(
        new CANNON.Box(halfExtents),
        new CANNON.Vec3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius),
        orientation,
      );
    }
    return body;
  },

  placeBody() {
    const center = new THREE.Vector3();
    this.el.object3D.getWorldPosition(center);
    this.body.position.set(center.x, center.y, center.z);
  },

  remove() {
    this.system.removeStaticBody(this.body);
  },
});
