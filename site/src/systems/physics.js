import {
  CONTACTS,
  FIXED_TIME_STEP,
  GRAVITY,
  MATERIALS,
  MAX_SUB_STEPS,
  SOLVER_ITERATIONS,
} from "../config/physics.js";
import { EVENTS } from "../config/constants.js";
import { frameSeconds } from "../utils/time.js";

// ----------------------------------------------------------------------
// Sistema "physics": dono do mundo do cannon.js.
// Cada entidade com "physics-body" se registra aqui. A cada quadro:
//   1. objetos segurados copiam a pose da mão para o corpo;
//   2. o mundo avança;
//   3. objetos soltos copiam a pose do corpo para a cena.
// ----------------------------------------------------------------------
AFRAME.registerSystem("physics", {
  init() {
    this.world = this.createWorld();
    this.materials = this.createMaterials();
    this.addInfiniteGround();
    this.components = [];

    this.onGameReset = () => this.resetAll();
    this.el.addEventListener(EVENTS.GAME_RESET, this.onGameReset);
  },

  createWorld() {
    const world = new CANNON.World();
    world.gravity.set(0, GRAVITY, 0);
    world.broadphase = new CANNON.NaiveBroadphase();
    world.solver.iterations = SOLVER_ITERATIONS;
    world.allowSleep = true;
    return world;
  },

  createMaterials() {
    const materials = Object.fromEntries(
      MATERIALS.map((name) => [name, new CANNON.Material(name)]),
    );
    CONTACTS.forEach(([a, b, friction, restitution]) => {
      this.world.addContactMaterial(
        new CANNON.ContactMaterial(materials[a], materials[b], { friction, restitution }),
      );
    });
    return materials;
  },

  // Chão infinito em y = 0.
  addInfiniteGround() {
    const ground = new CANNON.Body({ mass: 0, material: this.materials.ground });
    ground.addShape(new CANNON.Plane());
    ground.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    this.world.addBody(ground);
  },

  /** Corpo controlado por um componente "physics-body". */
  register(component) {
    this.components.push(component);
    this.world.addBody(component.body);
  },

  unregister(component) {
    this.components = this.components.filter((item) => item !== component);
    this.world.removeBody(component.body);
  },

  resetAll() {
    this.components.forEach((component) => component.reset());
  },

  tick(time, delta) {
    const dt = frameSeconds(delta);
    if (!dt) {
      return;
    }
    this.components.forEach((component) => component.beforeStep(dt));
    this.world.step(FIXED_TIME_STEP, dt, MAX_SUB_STEPS);
    this.components.forEach((component) => component.afterStep());
  },

  remove() {
    this.el.removeEventListener(EVENTS.GAME_RESET, this.onGameReset);
  },
});
