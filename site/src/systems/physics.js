import {
  CONTACTS,
  FIXED_TIME_STEP,
  GRAVITY,
  MATERIALS,
  MAX_SUB_STEPS,
  SOLVER_ITERATIONS,
} from "../config/physics.js";
import { EVENTS } from "../config/constants.js";
import { extendSegment, planeDistance, pushOutOfPlane } from "../domain/held.js";
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

  /**
   * Primeiro corpo ESTÁTICO (parede, chão, suporte...) no segmento
   * `from` → `to` (mundo), ou null. Bolas e corpos sem colisão não contam.
   * @returns {{point:{x,y,z}, normal:{x,y,z}, distance:number} | null}
   */
  firstStaticHit(from, to) {
    let best = null;
    this.world.raycastAll(
      new CANNON.Vec3(from.x, from.y, from.z),
      new CANNON.Vec3(to.x, to.y, to.z),
      { skipBackfaces: true },
      (result) => {
        if (result.body.type !== CANNON.Body.STATIC || (best && best.distance <= result.distance)) {
          return;
        }
        const { hitPointWorld: point, hitNormalWorld: normal } = result;
        best = {
          point: { x: point.x, y: point.y, z: point.z },
          normal: { x: normal.x, y: normal.y, z: normal.z },
          distance: result.distance,
        };
      });
    return best;
  },

  /**
   * Bola segurada indo de `from` (posição válida) para `to`: devolve onde
   * ela pode ficar sem entrar em parede, chão ou móvel — desliza rente à
   * superfície (até 2 superfícies, ex. um canto); se ainda bater, fica em
   * `from`. Nunca abaixo do chão.
   */
  constrainHeldMove(from, to, radius) {
    let target = { x: to.x, y: to.y, z: to.z };
    for (let pass = 0; pass < 3; pass++) {
      const hit = this.firstStaticHit(from, extendSegment(from, target, radius));
      // Já encostada (a `radius` da superfície): só o prolongamento tocou.
      if (!hit || planeDistance(target, hit.point, hit.normal) >= radius - 1e-6) {
        target.y = Math.max(target.y, radius);
        return target;
      }
      if (pass === 2) {
        break;
      }
      target = pushOutOfPlane(target, hit.point, hit.normal, radius);
    }
    return { x: from.x, y: Math.max(from.y, radius), z: from.z };
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
