import { EVENTS } from "../../config/constants.js";
import {
  FLASH_DURATION,
  POKEMON_LOOKS,
  POKEMON_SIZE,
  POP_DURATION,
  RELEASE_SURFACE,
} from "../../config/pokemon.js";
import { TEACHER_IMAGES } from "../../config/teachers.js";
import { pickByName, releasesPokemon } from "../../domain/landing.js";
import { createEntity, vec3 } from "../../utils/entity.js";

// Soltura do pokémon: quando a pokébola pousa no chão, um pokémon
// genérico aparece ao lado dela, virado para o adversário, com um "pop" e um
// clarão. Ao pegar a bola de novo (ou resetar), ele volta para dentro.
//
// O pokémon é filho da cena, e não da bola: a bola tem escala 0,01 e gira.
AFRAME.registerComponent("pokemon-release", {
  schema: {
    // Define o visual (sempre o mesmo para o mesmo nome).
    name: { type: "string", default: "" },
    // Ponto (mundo) para onde o pokémon olha: o box do adversário.
    facing: { type: "vec3", default: { x: 0, y: 0, z: 0 } },
    // Distância do centro da bola até o pokémon, na direção de "facing".
    offset: { default: 0.35 },
  },

  init() {
    this.creature = null;
    this.ballPosition = new THREE.Vector3();
    this.onLanded = (event) => {
      if (releasesPokemon(event.detail.surface, RELEASE_SURFACE)) {
        this.release();
      }
    };
    this.onTakeOff = () => this.recall();
    this.el.addEventListener(EVENTS.BALL_LANDED, this.onLanded);
    this.el.addEventListener(EVENTS.BALL_TAKEOFF, this.onTakeOff);
  },

  release() {
    if (this.creature) {
      return;
    }
    const sceneEl = this.el.sceneEl;
    this.el.object3D.getWorldPosition(this.ballPosition);
    const { facing } = this.data;

    // Vira para o adversário e fica um pouco à frente da bola.
    const yaw = Math.atan2(
      facing.x - this.ballPosition.x,
      facing.z - this.ballPosition.z);
    const x = this.ballPosition.x + Math.sin(yaw) * this.data.offset;
    const z = this.ballPosition.z + Math.cos(yaw) * this.data.offset;

    const look = pickByName(this.data.name, POKEMON_LOOKS, Object.keys(TEACHER_IMAGES));
    this.creature = createEntity("a-entity", {
      class: "released-pokemon",
      position: vec3(x, 0, z),
      rotation: vec3(0, THREE.MathUtils.radToDeg(yaw), 0),
    }, [
      createEntity("a-entity", {
        scale: "0.01 0.01 0.01",
        animation__pop: `property: scale; to: 1 1 1; dur: ${POP_DURATION}; easing: easeOutBack`,
      }),
      createEntity("a-sphere", {
        class: "release-flash",
        position: vec3(0, POKEMON_SIZE / 2, 0),
        radius: POKEMON_SIZE * 0.6,
        material: "color: #ffffff; shader: flat; transparent: true; opacity: 0.9",
        animation__grow: `property: scale; from: 0.2 0.2 0.2; to: 1.4 1.4 1.4; dur: ${FLASH_DURATION}; easing: easeOutQuad`,
        animation__fade: `property: material.opacity; to: 0; dur: ${FLASH_DURATION}; easing: easeOutQuad`,
      }),
    ]);
    // Objeto direto no setAttribute (createEntity converteria em texto).
    this.creature.firstChild.setAttribute("generic-pokemon", { ...look, size: POKEMON_SIZE });
    const flash = this.creature.lastChild;
    flash.addEventListener("animationcomplete__fade", () => flash.remove(), { once: true });
    sceneEl.appendChild(this.creature);
    this.el.emit("pokemonreleased", { creature: this.creature }, false);
  },

  recall() {
    if (!this.creature) {
      return;
    }
    this.creature.remove();
    this.creature = null;
  },

  remove() {
    this.el.removeEventListener(EVENTS.BALL_LANDED, this.onLanded);
    this.el.removeEventListener(EVENTS.BALL_TAKEOFF, this.onTakeOff);
    this.recall();
  },
});
