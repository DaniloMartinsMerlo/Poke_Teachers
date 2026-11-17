import { createEntity, vec3 } from "../../utils/entity.js";

// Pokémon genérico: criatura redonda e original feita de primitivas.
// A frente fica em +z local. Em tamanho 1 tem ~0,5 m de altura; o
// componente aplica "size" como escala do grupo.
AFRAME.registerComponent("generic-pokemon", {
  schema: {
    body: { type: "color", default: "#7bc96f" },
    belly: { type: "color", default: "#e8f5c8" },
    accent: { type: "color", default: "#3f8f3a" },
    ears: { default: "pointy", oneOf: ["pointy", "round"] },
    size: { default: 1 },
  },

  // As peças são montadas uma vez; mudar as cores depois não as refaz.
  init() {
    // sizer: escala do tamanho; model: animação de respirar. A escala da
    // própria entidade fica livre para animações de quem a usa.
    this.model = createEntity("a-entity", { class: "generic-pokemon-model" }, this.buildParts());
    this.sizer = createEntity("a-entity", {}, [this.model]);
    this.el.appendChild(this.sizer);
    this.phase = Math.random() * Math.PI * 2;
  },

  update() {
    const s = this.data.size / 0.5;
    this.sizer.object3D.scale.set(s, s, s);
  },

  buildParts() {
    const { body, belly, accent, ears } = this.data;
    const part = createEntity;
    const sphere = (position, radius, color, scale = "1 1 1") =>
      part("a-sphere", { position, radius, color, scale, "segments-width": 24, "segments-height": 16 });

    const mirrored = (build) => [build(1), build(-1)];

    const eyes = mirrored((side) => createEntity("a-entity", { position: vec3(0.085 * side, 0.3, 0.165) }, [
      sphere("0 0 0", 0.055, "#ffffff", "1 1.15 0.6"),
      sphere("0 -0.004 0.024", 0.033, "#1d1d1d", "1 1.2 0.6"),
      sphere(vec3(0.012, 0.014, 0.046), 0.011, "#ffffff"),
    ]));

    const earParts = mirrored((side) => (ears === "pointy"
      ? part("a-cone", {
        position: vec3(0.11 * side, 0.45, -0.02),
        rotation: vec3(0, 0, -22 * side),
        "radius-bottom": 0.065, "radius-top": 0.005, height: 0.18, color: accent,
      })
      : sphere(vec3(0.15 * side, 0.4, -0.02), 0.075, accent, "1 1 0.45")));

    return [
      sphere("0 0.22 0", 0.22, body, "1 0.95 0.9"),
      sphere("0 0.18 0.1", 0.15, belly, "1 1 0.55"),
      ...eyes,
      ...mirrored((side) => sphere(vec3(0.145 * side, 0.235, 0.14), 0.028, "#ff8fa3", "1 0.6 0.4")),
      sphere("0 0.235 0.198", 0.016, "#3a1f1f", "1.6 0.7 0.5"),
      ...earParts,
      ...mirrored((side) => sphere(vec3(0.1 * side, 0.03, 0.07), 0.06, accent, "1 0.5 1.3")),
      ...mirrored((side) => sphere(vec3(0.2 * side, 0.18, 0.04), 0.045, body, "0.7 1 0.8")),
      sphere("0 0.12 -0.21", 0.06, accent),
    ];
  },

  // Respira: sobe e desce de leve, achatando um pouco no chão.
  tick(time) {
    const t = time / 1000 * 3 + this.phase;
    const bounce = Math.abs(Math.sin(t));
    this.model.object3D.position.y = bounce * 0.03;
    this.model.object3D.scale.set(1 + (1 - bounce) * 0.04, 1 - (1 - bounce) * 0.05, 1);
  },
});
