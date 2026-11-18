import { EVENTS } from "../../config/constants.js";
import { PokeprofCard } from "../game/pokeprof-card.js";
import { isHeld } from "./grab-state.js";

// Prévia do professor guardado na pokébola: enquanto algum raio (mouse,
// laser do controle ou olhar no VR) aponta para a bola, um cartão
// (PokeprofCard: foto, vida, atributos) aparece acima dela, sempre virado
// para o jogador. A vida vem do componente "pokeprof" da bola e é
// atualizada quando muda (POKEPROF_CHANGED).
//
// Com o professor em campo, a prévia não aparece: o cartão dele fica
// acima do HUD do dono (battle-hud).
//
// O cartão é filho da cena, e não da bola: a bola tem escala 0,01 e gira
// ao rolar.
AFRAME.registerComponent("pokemon-preview", {
  schema: {
    name: { type: "string" },
    // Distância do centro da bola até o centro da foto.
    lift: { default: 0.55 },
  },

  init() {
    this.pointers = new Set();
    this.ballPosition = new THREE.Vector3();
    this.cameraPosition = new THREE.Vector3();
    this.wasShowing = false;
    this.cardView = new PokeprofCard(this.data.name, "vertical");
    // Nome mantido: outros módulos e testes usam `card` como a entidade.
    this.card = this.cardView.el;
    this.card.classList.add("pokemon-preview");
    this.card.object3D.visible = false;
    this.el.sceneEl.appendChild(this.card);

    this.onPointed = (event) => this.pointers.add(event.detail.el);
    this.onUnpointed = (event) => this.pointers.delete(event.detail.el);
    this.onChanged = () => this.refresh();
    this.el.addEventListener("raycaster-intersected", this.onPointed);
    this.el.addEventListener("raycaster-intersected-cleared", this.onUnpointed);
    this.el.addEventListener(EVENTS.POKEPROF_CHANGED, this.onChanged);
  },

  refresh() {
    this.cardView.refresh(this.el.components.pokeprof?.prof);
  },

  isOnField() {
    return Boolean(this.el.components["pokemon-release"]?.creature);
  },

  isShowing() {
    return this.pointers.size > 0 && !isHeld(this.el) && !this.isOnField();
  },

  tick() {
    const showing = this.isShowing();
    this.card.object3D.visible = showing;
    if (showing && !this.wasShowing) {
      this.refresh();
    }
    this.wasShowing = showing;
    const camera = this.el.sceneEl.camera;
    if (!showing || !camera) {
      return;
    }
    this.el.object3D.getWorldPosition(this.ballPosition);
    camera.getWorldPosition(this.cameraPosition);
    this.card.object3D.position.copy(this.ballPosition).y += this.data.lift;
    this.card.object3D.lookAt(this.cameraPosition);
  },

  remove() {
    this.el.removeEventListener("raycaster-intersected", this.onPointed);
    this.el.removeEventListener("raycaster-intersected-cleared", this.onUnpointed);
    this.el.removeEventListener(EVENTS.POKEPROF_CHANGED, this.onChanged);
    this.cardView.remove();
  },
});
