import { teacherImage } from "../../config/teachers.js";
import { createEntity, vec3 } from "../../utils/entity.js";
import { isHeld } from "./grab-state.js";

// Prévia do professor guardado na pokébola: enquanto algum raio (mouse,
// laser do controle ou olhar no VR) aponta para a bola, um cartão com a
// foto e o nome aparece acima dela, sempre virado para o jogador.
//
// O cartão é filho da cena, e não da bola: a bola tem escala 0,01 e gira
// ao rolar.
AFRAME.registerComponent("pokemon-preview", {
  schema: {
    name: { type: "string" },
    size: { default: 0.32 },
    // Distância do centro da bola até o centro do cartão.
    lift: { default: 0.32 },
  },

  init() {
    this.pointers = new Set();
    this.ballPosition = new THREE.Vector3();
    this.cameraPosition = new THREE.Vector3();
    this.card = this.buildCard();
    this.el.sceneEl.appendChild(this.card);

    this.onPointed = (event) => this.pointers.add(event.detail.el);
    this.onUnpointed = (event) => this.pointers.delete(event.detail.el);
    this.el.addEventListener("raycaster-intersected", this.onPointed);
    this.el.addEventListener("raycaster-intersected-cleared", this.onUnpointed);
  },

  buildCard() {
    const { name, size } = this.data;
    const border = 0.02;
    const textHeight = 0.07;
    return createEntity("a-entity", { class: "pokemon-preview", visible: false }, [
      createEntity("a-plane", {
        position: vec3(0, -textHeight / 2, -0.002),
        width: size + border * 2,
        height: size + textHeight + border * 2,
        color: "#222222",
      }),
      // A imagem é carregada já na montagem para não piscar no 1º apontar.
      createEntity("a-image", { src: teacherImage(name), width: size, height: size }),
      createEntity("a-text", {
        value: name,
        align: "center",
        color: "#ffffff",
        width: size * 3,
        position: vec3(0, -size / 2 - textHeight / 2, 0.001),
      }),
    ]);
  },

  isShowing() {
    return this.pointers.size > 0 && !isHeld(this.el);
  },

  tick() {
    const showing = this.isShowing();
    this.card.object3D.visible = showing;
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
    this.card.remove();
  },
});
