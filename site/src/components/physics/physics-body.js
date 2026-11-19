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
import { EVENTS } from "../../config/constants.js";
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
    // Encaixada no suporte: ignora impulsos até ser pega de novo.
    this.snapped = false;
    // Movida por animação (bola voltando ao suporte): a física só segue.
    this.scripted = false;
    this.landed = false;
    // Material da última superfície em que pousou (null = no ar/na mão).
    this.landedOn = null;
    // Bola segurada empurrada para fora de uma parede neste quadro:
    // { desired, applied } (posições locais). Ver keepOutOfWalls.
    this.holdClamp = null;
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
    if (this.snapped) {
      return;
    }
    if (this.wasHeld) {
      this.pendingImpulse.add(vector);
      return;
    }
    this.body.velocity.vadd(new CANNON.Vec3(vector.x, vector.y, vector.z), this.body.velocity);
    this.body.wakeUp();
  },

  /**
   * Arremesso sem mão (CPU): sai de `position` (mundo) com `velocity`.
   */
  launch(position, velocity) {
    if (isHeld(this.el)) {
      return;
    }
    this.scripted = false;
    this.snapped = false;
    this.wasHeld = false;
    this.pendingImpulse.set(0, 0, 0);
    this.el.object3D.position.set(position.x, position.y, position.z);
    this.body.type = CANNON.Body.DYNAMIC;
    this.body.collisionResponse = true;
    this.syncBodyToEntity();
    this.takeOff();
    this.body.velocity.set(velocity.x, velocity.y, velocity.z);
    this.body.angularVelocity.set(0, 0, 0);
    this.body.wakeUp();
  },

  // Caiu em cima de algo: corta o rolamento para a bola parar ali e
  // avisa em que superfície pousou (o primeiro pouso pode ser no tampo e
  // a bola rolar depois para o chão).
  handleCollision(event) {
    if (isHeld(this.el) || !isLandingNormal(event.contact.ni, LANDING_MIN_UP)) {
      return;
    }
    if (!this.landed) {
      this.land();
    }
    const surface = event.body.material?.name ?? null;
    if (surface !== this.landedOn) {
      this.landedOn = surface;
      this.el.emit(EVENTS.BALL_LANDED, { surface }, false);
    }
  },

  land() {
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
    if (this.landedOn !== null) {
      this.landedOn = null;
      this.el.emit(EVENTS.BALL_TAKEOFF, null, false);
    }
    this.body.linearDamping = FLYING_LINEAR_DAMPING;
    this.body.angularDamping = FLYING_ANGULAR_DAMPING;
  },

  /**
   * Passa a ser movida por animação: corpo cinemático, sem colisão, que
   * acompanha a entidade até o próximo `placeAt`/`reset`.
   */
  beginScripted() {
    this.scripted = true;
    this.wasHeld = false;
    this.snapped = false;
    this.pendingImpulse.set(0, 0, 0);
    this.body.type = CANNON.Body.KINEMATIC;
    this.body.collisionResponse = false;
    this.stop();
    this.takeOff();
  },

  /** Põe a bola parada em `position` (mundo), em pé; usada no encaixe. */
  placeAt(position) {
    this.scripted = false;
    this.el.object3D.position.copy(position);
    this.el.object3D.quaternion.copy(this.startQuaternion);
    this.wasHeld = false;
    this.snapped = true;
    this.pendingImpulse.set(0, 0, 0);
    this.body.type = CANNON.Body.DYNAMIC;
    this.body.collisionResponse = true;
    this.syncBodyToEntity();
    this.stop();
    this.takeOff();
    this.body.sleep();
  },

  reset() {
    if (this.isStatic() || isHeld(this.el)) {
      return;
    }
    this.el.object3D.position.copy(this.startPosition);
    this.el.object3D.quaternion.copy(this.startQuaternion);
    if (this.scripted) {
      this.scripted = false;
      this.body.type = CANNON.Body.DYNAMIC;
      this.body.collisionResponse = true;
    }
    this.syncBodyToEntity();
    this.stop();
    this.takeOff();
    this.body.wakeUp();
  },

  beforeStep(dt) {
    if (this.isStatic()) {
      return;
    }
    if (this.scripted) {
      this.syncBodyToEntity();
      return;
    }
    if (isHeld(this.el)) {
      this.followHand(dt);
      return;
    }
    this.holdClamp = null;
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
    const object = this.el.object3D;
    // Quadro anterior empurrou a bola para fora de uma parede e ninguém a
    // moveu desde então: volta à posição pedida pela mão (assim a "pegada"
    // do controle/mouse não muda) e testa de novo.
    if (this.holdClamp && object.position.equals(this.holdClamp.applied)) {
      object.position.copy(this.holdClamp.desired);
    }
    this.holdClamp = null;
    object.getWorldPosition(this.worldPosition);
    if (this.wasHeld) {
      this.keepOutOfWalls(this.lastPosition);
      const instant = this.worldPosition.clone().sub(this.lastPosition).divideScalar(dt);
      this.heldVelocity.lerp(instant, 0.5);
    } else {
      this.snapped = false;
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

  // A mão pode atravessar parede, chão e móveis; a bola não. Ela vai até
  // onde dá, deslizando rente à superfície, a partir da última posição
  // válida (`from`). Roda no sistema de física, depois dos "tick" dos
  // pegadores, então o quadro desenhado já mostra a posição corrigida.
  keepOutOfWalls(from) {
    const object = this.el.object3D;
    const safe = this.system.constrainHeldMove(from, this.worldPosition, this.data.radius);
    if (this.worldPosition.distanceToSquared(safe) < 1e-12) {
      return;
    }
    const desired = object.position.clone();
    // A bola pode ser filha do controle/câmera: converte para o espaço do pai.
    object.position.copy(object.parent.worldToLocal(new THREE.Vector3(safe.x, safe.y, safe.z)));
    this.holdClamp = { desired, applied: object.position.clone() };
    this.worldPosition.set(safe.x, safe.y, safe.z);
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
    if (this.isStatic() || this.scripted || isHeld(this.el)) {
      return;
    }
    this.syncEntityToBody();
  },

  remove() {
    this.body.removeEventListener("collide", this.onCollide);
    this.system.unregister(this);
  },
});
