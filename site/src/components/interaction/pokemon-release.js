import { ARENA_BOUNDS } from "../../config/arena.js";
import { EVENTS } from "../../config/constants.js";
import { playerInfo } from "../../config/players.js";
import {
  FLASH_DURATION,
  OWNER_RING_RADIUS,
  OWNER_TAG_HEIGHT,
  POKEMON_LOOKS,
  POKEMON_SIZE,
  POP_DURATION,
  RECALL_DURATION,
  RECALL_FLASH_COLOR,
  RELEASE_SURFACE,
} from "../../config/pokemon.js";
import { TEACHER_NAMES } from "../../config/teachers.js";
import { isOutsideArena } from "../../domain/battle.js";
import { pickByName, releasesPokemon } from "../../domain/landing.js";
import { createEntity, vec3 } from "../../utils/entity.js";

// Soltura do pokémon: quando a pokébola pousa no chão, um pokémon
// genérico aparece ao lado dela, virado para o adversário, com um "pop" e um
// clarão. Ao pegar a bola de novo (ou resetar), ele volta para dentro.
//
// Cada jogador só tem um pokémon em campo (sistema "battle"): se já houver
// um, a bola não abre e a cena recebe SEND_OUT_BLOCKED (o suporte a traz
// de volta). Professor desmaiado (vida 0) também não sai até o reset do
// jogo (reason "fainted"). Bola fora da arena (além das muretas) não abre:
// o suporte a traz de volta. O pokémon leva a cor e o rótulo do dono (anel no chão e
// plaquinha), para distinguir os dois lados.
//
// O pokémon é filho da cena, e não da bola: a bola tem escala 0,01 e gira.
AFRAME.registerComponent("pokemon-release", {
  schema: {
    // Define o visual (sempre o mesmo para o mesmo nome).
    name: { type: "string", default: "" },
    // Dono da bola (ver config/players.js).
    player: { type: "string", default: "p1" },
    // Ponto (mundo) para onde o pokémon olha: o box do adversário.
    facing: { type: "vec3", default: { x: 0, y: 0, z: 0 } },
    // Distância do centro da bola até o pokémon, na direção de "facing".
    offset: { default: 0.35 },
  },

  init() {
    this.creature = null;
    this.tag = null;
    this.leaving = new Set();
    this.ballPosition = new THREE.Vector3();
    this.cameraPosition = new THREE.Vector3();
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
    this.el.object3D.getWorldPosition(this.ballPosition);
    if (isOutsideArena(this.ballPosition, ARENA_BOUNDS)) {
      return;
    }
    const sceneEl = this.el.sceneEl;
    const { player } = this.data;
    const blockedBy = this.el.components.pokeprof?.prof.isFainted()
      ? "fainted"
      : !sceneEl.systems.battle.canSendOut(player, this.el) && "one-at-a-time";
    if (blockedBy) {
      sceneEl.emit(EVENTS.SEND_OUT_BLOCKED, { player, ball: this.el, reason: blockedBy }, false);
      return;
    }
    const { facing } = this.data;

    // Vira para o adversário e fica um pouco à frente da bola.
    const yaw = Math.atan2(
      facing.x - this.ballPosition.x,
      facing.z - this.ballPosition.z);
    const x = this.ballPosition.x + Math.sin(yaw) * this.data.offset;
    const z = this.ballPosition.z + Math.cos(yaw) * this.data.offset;

    const look = pickByName(this.data.name, POKEMON_LOOKS, TEACHER_NAMES);
    const owner = playerInfo(player);
    this.tag = this.buildOwnerTag(owner);
    this.creature = createEntity("a-entity", {
      class: "released-pokemon",
      "data-player": player,
      position: vec3(x, 0, z),
      rotation: vec3(0, THREE.MathUtils.radToDeg(yaw), 0),
    }, [
      createEntity("a-entity", {
        scale: "0.01 0.01 0.01",
        animation__pop: `property: scale; to: 1 1 1; dur: ${POP_DURATION}; easing: easeOutBack`,
      }),
      createEntity("a-ring", {
        class: "owner-ring",
        position: "0 0.012 0",
        rotation: "-90 0 0",
        "radius-inner": OWNER_RING_RADIUS - 0.05,
        "radius-outer": OWNER_RING_RADIUS,
        "segments-theta": 40,
        material: `color: ${owner.color}; shader: flat; transparent: true; opacity: 0.85`,
      }),
      this.tag,
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
    sceneEl.emit(EVENTS.POKEMON_RELEASED, { player, ball: this.el, creature: this.creature }, false);
  },

  // Plaquinha "J1 Nome" na cor do dono, sempre virada para a câmera.
  buildOwnerTag(owner) {
    const label = `${owner.label} ${this.data.name}`.trim();
    return createEntity("a-entity", { class: "owner-tag", position: vec3(0, OWNER_TAG_HEIGHT, 0) }, [
      createEntity("a-plane", {
        width: 0.08 + label.length * 0.035, height: 0.1,
        material: `color: ${owner.color}; shader: flat; side: double`,
      }),
      createEntity("a-text", {
        value: label, align: "center", color: "#ffffff", width: 1, position: "0 0 0.002",
      }),
    ]);
  },

  tick() {
    const camera = this.el.sceneEl.camera;
    if (this.tag && camera) {
      camera.getWorldPosition(this.cameraPosition);
      this.tag.object3D.lookAt(this.cameraPosition);
    }
  },

  /**
   * Recolhe o pokémon. Com `animated`, ele encolhe com um clarão vermelho
   * antes de sumir (usado ao trocar de pokémon pelo HUD).
   */
  recall(animated = false) {
    if (!this.creature) {
      return;
    }
    const creature = this.creature;
    this.creature = null;
    this.tag = null;
    if (animated) {
      this.leaving.add(creature);
      creature.appendChild(createEntity("a-sphere", {
        position: vec3(0, POKEMON_SIZE / 2, 0),
        radius: POKEMON_SIZE * 0.7,
        material: `color: ${RECALL_FLASH_COLOR}; shader: flat; transparent: true; opacity: 0.6`,
      }));
      creature.setAttribute("animation__recall",
        `property: scale; to: 0.01 0.01 0.01; dur: ${RECALL_DURATION}; easing: easeInBack`);
      creature.addEventListener("animationcomplete__recall", () => {
        this.leaving.delete(creature);
        creature.remove();
      }, { once: true });
    } else {
      creature.remove();
    }
    this.el.sceneEl.emit(EVENTS.POKEMON_RECALLED, { player: this.data.player, ball: this.el }, false);
  },

  remove() {
    this.el.removeEventListener(EVENTS.BALL_LANDED, this.onLanded);
    this.el.removeEventListener(EVENTS.BALL_TAKEOFF, this.onTakeOff);
    this.recall();
    this.leaving.forEach((creature) => creature.remove());
  },
});
