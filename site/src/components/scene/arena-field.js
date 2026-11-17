import { APRON, COLORS, FIELD, FLOOR_LAYER, GROUND_SIZE, LINE_WIDTH, TRAINER_BOX_Z } from "../../config/arena.js";
import { createEntity, vec3 } from "../../utils/entity.js";

// Chão da arena: grama, campo de terra, linhas, símbolo central e os
// boxes dos treinadores.

const layer = (index) => +(index * FLOOR_LAYER).toFixed(3);

function floorPlane({ x = 0, z = 0, level, width, height, color }) {
  return createEntity("a-plane", {
    position: vec3(x, layer(level), z),
    rotation: "-90 0 0",
    width,
    height,
    color,
  });
}

function fieldLines() {
  const halfW = FIELD.width / 2;
  const halfL = FIELD.length / 2;
  const line = (x, z, width, height) =>
    floorPlane({ x, z, level: 3, width, height, color: COLORS.line });

  return createEntity("a-entity", { class: "field-lines" }, [
    line(-halfW, 0, LINE_WIDTH, FIELD.length + LINE_WIDTH),
    line(halfW, 0, LINE_WIDTH, FIELD.length + LINE_WIDTH),
    line(0, -halfL, FIELD.width + LINE_WIDTH, LINE_WIDTH),
    line(0, halfL, FIELD.width + LINE_WIDTH, LINE_WIDTH),
    line(0, 0, FIELD.width, LINE_WIDTH),
  ]);
}

// Símbolo da pokébola no meio do campo. O grupo está deitado no chão,
// então o "z" local de cada peça é a altura.
function centerEmblem() {
  const radius = 1.6;
  const at = (level) => vec3(0, 0, layer(level));
  const half = (start, color) => createEntity("a-circle", {
    position: at(4), radius, "theta-start": start, "theta-length": 180, segments: 64, color,
  });

  return createEntity("a-entity", { class: "center-emblem", rotation: "-90 0 0" }, [
    createEntity("a-ring", {
      position: at(4), "radius-inner": radius, "radius-outer": 1.75, "segments-theta": 64, color: COLORS.line,
    }),
    half(0, COLORS.emblemRed),
    half(180, COLORS.emblemWhite),
    createEntity("a-plane", { position: at(5), width: radius * 2, height: 0.2, color: COLORS.emblemBlack }),
    createEntity("a-circle", { position: at(6), radius: 0.48, segments: 48, color: COLORS.emblemBlack }),
    createEntity("a-circle", { position: at(7), radius: 0.34, segments: 48, color: COLORS.emblemWhite }),
  ]);
}

// Retângulo branco com o miolo de terra.
function trainerBox(z) {
  return createEntity("a-entity", { class: "trainer-box", position: vec3(0, 0, z) }, [
    floorPlane({ level: 3, width: 2.2, height: 1.6, color: COLORS.line }),
    floorPlane({ level: 4, width: 2, height: 1.4, color: COLORS.dirt }),
  ]);
}

AFRAME.registerComponent("arena-field", {
  init() {
    [
      floorPlane({ level: 0, width: GROUND_SIZE, height: GROUND_SIZE, color: COLORS.grass }),
      floorPlane({ level: 1, width: APRON.width, height: APRON.length, color: COLORS.apron }),
      floorPlane({ level: 2, width: FIELD.width, height: FIELD.length, color: COLORS.dirt }),
      fieldLines(),
      centerEmblem(),
      trainerBox(TRAINER_BOX_Z),
      trainerBox(-TRAINER_BOX_Z),
    ].forEach((child) => this.el.appendChild(child));
  },
});
