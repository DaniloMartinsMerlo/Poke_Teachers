import { EVENTS, MAX_FRAME_MS } from "../../config/constants.js";
import { FIELD_CALLOUT } from "../../config/hud.js";
import { playerInfo } from "../../config/players.js";
import { calloutTexts } from "../../domain/hud.js";
import { createEntity, vec3 } from "../../utils/entity.js";

// Balões de batalha no campo: a cada ação do turno (TURN_ACTION), o nome
// do golpe/power-up aparece sobre o PokeProf que agiu (faixa na cor do
// dono) e o dano sobre quem levou, com "Super efetivo!"/"Desmaiou!" (ou
// "Errou!", em branco). Quem entrou trocando ganha "Vai, Nome!".
// Sobem e somem em FIELD_CALLOUT.duration; sempre virados para a câmera e
// maiores quanto mais longe (para ler o do outro lado do campo).
// Uma entidade na cena basta: <a-entity battle-callouts>.
AFRAME.registerComponent("battle-callouts", {
  init() {
    // { el, parts: [{el, kind}], base: Vector3, elapsed }
    this.items = [];
    this.cameraPosition = new THREE.Vector3();
    this.onAction = ({ detail }) => this.show(detail);
    this.onReset = () => this.clear();
    this.el.sceneEl.addEventListener(EVENTS.TURN_ACTION, this.onAction);
    this.el.sceneEl.addEventListener(EVENTS.GAME_RESET, this.onReset);
  },

  creatureOf(player) {
    const ball = this.el.sceneEl.systems.battle.activeBall(player);
    return ball?.components["pokemon-release"]?.creature || null;
  },

  show(detail) {
    const texts = calloutTexts(detail);
    const owner = playerInfo(detail.player);
    this.spawn(detail.player, [
      { value: texts.actor, color: "#ffffff", pill: owner.color },
    ]);
    if (texts.target) {
      this.spawn(detail.target, [
        { value: texts.target, color: detail.missed ? FIELD_CALLOUT.missColor : FIELD_CALLOUT.damageColor },
        ...(texts.note ? [{ value: texts.note, color: FIELD_CALLOUT.noteColor, small: true }] : []),
      ]);
    }
  },

  // Balão com uma ou mais linhas sobre o PokeProf de `player`.
  spawn(player, lines) {
    const creature = this.creatureOf(player);
    if (!creature) {
      return;
    }
    const base = creature.object3D.getWorldPosition(new THREE.Vector3());
    base.y += FIELD_CALLOUT.height;
    const root = createEntity("a-entity", { class: "battle-callout", "data-player": player });
    lines.forEach((line, index) => {
      const y = -index * FIELD_CALLOUT.noteOffset;
      if (line.pill) {
        root.appendChild(createEntity("a-plane", {
          position: vec3(0, y, -0.002),
          width: 0.12 + line.value.length * 0.052, height: 0.15,
          material: `color: ${line.pill}; shader: flat; transparent: true; opacity: 0.9; side: double`,
        }));
      }
      root.appendChild(createEntity("a-text", {
        class: "battle-callout-text",
        value: line.value, align: "center", color: line.color,
        width: line.small ? 1.1 : 1.5, "wrap-count": 22,
        position: vec3(0, y, 0), opacity: 1,
      }));
    });
    root.object3D.position.copy(base);
    this.el.sceneEl.appendChild(root);
    this.items.push({ el: root, base, elapsed: 0 });
  },

  tick(time, delta) {
    if (!this.items.length) {
      return;
    }
    const camera = this.el.sceneEl.camera;
    camera?.getWorldPosition(this.cameraPosition);
    const dt = Math.min(delta || 0, MAX_FRAME_MS);
    this.items = this.items.filter((item) => {
      item.elapsed += dt;
      const t = item.elapsed / FIELD_CALLOUT.duration;
      if (t >= 1) {
        item.el.remove();
        return false;
      }
      const object = item.el.object3D;
      object.position.copy(item.base).y += FIELD_CALLOUT.rise * t;
      if (camera) {
        const scale = Math.max(1, object.position.distanceTo(this.cameraPosition) * FIELD_CALLOUT.scalePerMeter);
        object.scale.setScalar(scale);
        object.lookAt(this.cameraPosition);
      }
      // Some no último terço.
      const opacity = t < 2 / 3 ? 1 : 3 * (1 - t);
      object.traverse((node) => this.fade(node.material, opacity));
      return true;
    });
  },

  // Opacidade relativa à original. O texto do A-Frame usa um shader com
  // o uniform "opacity"; os planos, a propriedade do material.
  fade(material, opacity) {
    if (!material) {
      return;
    }
    const uniform = material.uniforms?.opacity;
    const current = uniform ? uniform.value : material.opacity;
    const base = material.userData.baseOpacity ?? (material.userData.baseOpacity = current);
    material.transparent = true;
    if (uniform) {
      uniform.value = base * opacity;
    } else {
      material.opacity = base * opacity;
    }
  },

  clear() {
    this.items.forEach((item) => item.el.remove());
    this.items = [];
  },

  remove() {
    this.clear();
    this.el.sceneEl.removeEventListener(EVENTS.TURN_ACTION, this.onAction);
    this.el.sceneEl.removeEventListener(EVENTS.GAME_RESET, this.onReset);
  },
});
