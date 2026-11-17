import {
  FALL_RESET_HEIGHT,
  FLYING_ANGULAR_DAMPING,
  FLYING_LINEAR_DAMPING,
  LANDED_ANGULAR_DAMPING,
  LANDED_LINEAR_DAMPING,
  LANDING_KEEP,
  LANDING_MIN_UP,
  MAX_THROW_SPEED,
  SLEEP_SPEED_LIMIT,
  SLEEP_TIME_LIMIT,
} from "../../config/physics.js";
import { isLandingNormal } from "../../domain/landing.js";
import { isHeld } from "../interaction/grab-state.js";
import { whenSceneLoaded } from "../../utils/entity.js";

// Corpo rígido ligado a uma entidade.
//   sphere: usa "radius" (pokébolas)
//   box:    usa a geometria da própria entidade (paredes, suportes)
// Massa 0 = corpo estático, nunca se move.
AFRAME.registerComponent("physics-body", {
  schema: {
    shape: { default: "sphere", oneOf: ["sphere", "box"] },
    mass: { default: 0.2 },
    radius: { default: 0.088 },
    material: { default: "ball" },
    // Fração da velocidade da mão aplicada ao soltar.
    throwBoost: { default: 1 },
  },

  init() {
    this.system = this.el.sceneEl.systems.physics;
    this.heldVelocity = new THREE.Vector3();
    this.pendingImpulse = new THREE.Vector3();
    this.lastPosition = new THREE.Vector3();
    this.worldPosition = new THREE.Vector3();
    this.worldQuaternion = new THREE.Quaternion();
    this.wasHeld = false;
    this.landed = false;
    this.onCollide = (event) => this.handleCollision(event);

    this.startPosition = this.el.object3D.position.clone();
    this.startQuaternion = this.el.object3D.quaternion.clone();

    this.body = this.createBody();
    if (!this.isStatic()) {
      this.body.addEventListener("collide", this.onCollide);
    }
    this.syncBodyToEntity();
    this.system.register(this);

    // Entidades filhas inicializam antes do pai receber a posição;
    // quando a cena termina de carregar, a posição de mundo é a certa.
    whenSceneLoaded(this.el.sceneEl, () => this.syncBodyToEntity());
  },

  createBody() {
    const { mass, material, shape, radius } = this.data;
    const body = new CANNON.Body({ mass, material: this.system.materials[material] });
    body.sleepSpeedLimit = SLEEP_SPEED_LIMIT;
    body.sleepTimeLimit = SLEEP_TIME_LIMIT;

    if (shape === "sphere") {
      body.addShape(new CANNON.Sphere(radius));
      body.linearDamping = FLYING_LINEAR_DAMPING;
      body.angularDamping = FLYING_ANGULAR_DAMPING;
    } else {
      const { width, height, depth } = this.el.getAttribute("geometry");
      body.addShape(new CANNON.Box(new CANNON.Vec3(width / 2, height / 2, depth / 2)));
    }
    return body;
  },

  isStatic() {
    return this.data.mass === 0;
  },

  syncBodyToEntity() {
    const object = this.el.object3D;
    object.getWorldPosition(this.worldPosition);
    object.getWorldQuaternion(this.worldQuaternion);
    this.body.position.set(this.worldPosition.x, this.worldPosition.y, this.worldPosition.z);
    this.body.quaternion.set(
      this.worldQuaternion.x, this.worldQuaternion.y,
      this.worldQuaternion.z, this.worldQuaternion.w);
  },

  syncEntityToBody() {
    const { position, quaternion } = this.body;
    this.el.object3D.position.set(position.x, position.y, position.z);
    this.el.object3D.quaternion.set(quaternion.x, quaternion.y, quaternion.z, quaternion.w);
  },

  stop() {
    this.body.velocity.set(0, 0, 0);
    this.body.angularVelocity.set(0, 0, 0);
  },

  /** Arremesso do computador: impulso extra aplicado na soltura. */
  addVelocity(vector) {
    if (this.wasHeld) {
      this.pendingImpulse.add(vector);
      return;
    }
    this.body.velocity.vadd(new CANNON.Vec3(vector.x, vector.y, vector.z), this.body.velocity);
    this.body.wakeUp();
  },

  // Caiu em cima de algo: corta o rolamento para a bola parar ali.
  handleCollision(event) {
    if (this.landed || isHeld(this.el) || !isLandingNormal(event.contact.ni, LANDING_MIN_UP)) {
      return;
    }
    this.landed = true;
    const { velocity, angularVelocity } = this.body;
    velocity.x *= LANDING_KEEP;
    velocity.z *= LANDING_KEEP;
    angularVelocity.scale(LANDING_KEEP, angularVelocity);
    this.body.linearDamping = LANDED_LINEAR_DAMPING;
    this.body.angularDamping = LANDED_ANGULAR_DAMPING;
  },

  // Pegou ou resetou: volta a voar livre até o próximo pouso.
  takeOff() {
    this.landed = false;
    this.body.linearDamping = FLYING_LINEAR_DAMPING;
    this.body.angularDamping = FLYING_ANGULAR_DAMPING;
  },

  reset() {
    if (this.isStatic() || isHeld(this.el)) {
      return;
    }
    this.el.object3D.position.copy(this.startPosition);
    this.el.object3D.quaternion.copy(this.startQuaternion);
    this.syncBodyToEntity();
    this.stop();
    this.takeOff();
    this.body.wakeUp();
  },

  beforeStep(dt) {
    if (this.isStatic()) {
      return;
    }
    if (isHeld(this.el)) {
      this.followHand(dt);
      return;
    }
    if (this.wasHeld) {
      this.throwFromHand();
    }
    if (this.body.position.y < FALL_RESET_HEIGHT) {
      this.reset();
    }
  },

  // Segurado: o corpo vira cinemático, segue a mão e mede a velocidade
  // dela para o arremesso.
  followHand(dt) {
    this.el.object3D.getWorldPosition(this.worldPosition);
    if (this.wasHeld) {
      const instant = this.worldPosition.clone().sub(this.lastPosition).divideScalar(dt);
      this.heldVelocity.lerp(instant, 0.5);
    } else {
      this.heldVelocity.set(0, 0, 0);
      this.body.type = CANNON.Body.KINEMATIC;
      this.body.collisionResponse = false;
      this.takeOff();
    }
    this.lastPosition.copy(this.worldPosition);
    this.syncBodyToEntity();
    this.stop();
    this.wasHeld = true;
  },

  // Acabou de soltar: volta a ser dinâmico com a velocidade da mão.
  throwFromHand() {
    this.wasHeld = false;
    const velocity = this.heldVelocity.clone()
      .multiplyScalar(this.data.throwBoost)
      .add(this.pendingImpulse)
      .clampLength(0, MAX_THROW_SPEED);
    this.pendingImpulse.set(0, 0, 0);

    this.syncBodyToEntity();
    this.body.type = CANNON.Body.DYNAMIC;
    this.body.collisionResponse = true;
    this.body.velocity.set(velocity.x, velocity.y, velocity.z);
    this.body.wakeUp();
  },

  afterStep() {
    if (this.isStatic() || isHeld(this.el)) {
      return;
    }
    this.syncEntityToBody();
  },

  remove() {
    this.body.removeEventListener("collide", this.onCollide);
    this.system.unregister(this);
  },
});
