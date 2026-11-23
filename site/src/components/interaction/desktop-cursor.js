// Cursor do mouse (computador): no VR ele fica desligado, para o raio do
// mouse (parado na última posição do ponteiro) não acender botões nem
// pokébolas sozinho. Fica na mesma entidade do "cursor" (rayOrigin: mouse).
AFRAME.registerComponent("desktop-cursor", {
  init() {
    this.onEnterVr = () => this.setEnabled(false);
    this.onExitVr = () => this.setEnabled(true);
    this.el.sceneEl.addEventListener("enter-vr", this.onEnterVr);
    this.el.sceneEl.addEventListener("exit-vr", this.onExitVr);
  },

  setEnabled(enabled) {
    this.el.setAttribute("raycaster", "enabled", enabled);
  },

  remove() {
    this.el.sceneEl.removeEventListener("enter-vr", this.onEnterVr);
    this.el.sceneEl.removeEventListener("exit-vr", this.onExitVr);
  },
});
