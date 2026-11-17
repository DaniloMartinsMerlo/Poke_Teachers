// Mão rastreada (sem controle): modelo da mão + pegar com a pinça.
AFRAME.registerComponent("player-hand", {
  schema: {
    hand: { default: "left", oneOf: ["left", "right"] },
    color: { default: "#f0b18a", type: "color" },
  },

  init() {
    const { hand, color } = this.data;
    this.el.setAttribute("hand-tracking-controls", { hand, modelColor: color });
    this.el.setAttribute("hand-grabber", { hand });
  },
});
