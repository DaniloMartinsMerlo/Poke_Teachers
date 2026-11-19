import { TYPES, TYPE_BEATS, teacherImage, teacherType, typeLabel } from "../../config/teachers.js";
import { createEntity, vec3 } from "../../utils/entity.js";

const HP_COLORS = Object.freeze({ high: "#4cd964", mid: "#ffd23f", low: "#ff3b30", empty: "#444444" });
const BACKGROUND = "#222222";
const STRONG_COLOR = "#9fd3ff";
const BOOST_COLOR = "#ffd23f";
// Faixa na borda esquerda com a cor do dono (m).
const OWNER_STRIPE = 0.006;

// Medidas de cada formato (m). Textos sem acento (fonte do A-Frame).
//   vertical:   foto em cima, dados embaixo — prévia sobre a pokébola.
//               A origem é o centro da foto.
//   horizontal: foto à esquerda, dados à direita — acima do HUD.
//               A origem é o centro do cartão.
const LAYOUTS = Object.freeze({
  vertical: Object.freeze({ image: 0.32, border: 0.02 }),
  horizontal: Object.freeze({ width: 0.44, image: 0.13, padding: 0.012, gap: 0.015 }),
});

/** Cor da barra conforme a fração de vida. */
export function hpColor(ratio) {
  if (ratio <= 0.2) return HP_COLORS.low;
  if (ratio <= 0.5) return HP_COLORS.mid;
  return HP_COLORS.high;
}

/** Texto do power-up de atributo (ativo ou para o próximo turno), ou "". */
export function boostLabel(prof) {
  const boost = prof?.activeBoost || prof?.pendingBoost;
  if (!boost) {
    return "";
  }
  // Curto: a coluna de texto do cartão tem ~26 caracteres.
  const when = prof.activeBoost ? "ativo" : "prox. turno";
  return `${boost.short} +${boost.percent}% ${when}`;
}

/**
 * Cartão de um PokeProf: foto, nome, barra e número de vida, ATQ/DEF/VEL
 * (com o power-up ativo), tipo e contra qual tipo é forte; no formato
 * horizontal (em campo), também o power-up. Não é um componente: quem usa (prévia da pokébola,
 * HUD) põe `card.el` na cena e chama `refresh(prof)` quando a vida muda.
 */
export class PokeprofCard {
  /**
   * @param {string} name professor
   * @param {"vertical" | "horizontal"} layout
   * @param {{width?: number, owner?: {label: string, color: string}}} [options]
   *   width: largura do formato horizontal; owner: dono (rótulo ao lado
   *   do nome e faixa na cor dele, para distinguir os jogadores)
   */
  constructor(name, layout = "vertical", options = {}) {
    this.name = name;
    this.type = teacherType(name);
    this.layout = layout;
    this.width = options.width || LAYOUTS.horizontal.width;
    this.owner = options.owner || null;
    this.el = layout === "horizontal" ? this.buildHorizontal() : this.buildVertical();
  }

  /** Altura total do cartão (m). */
  height() {
    if (this.layout === "horizontal") {
      const { image, padding } = LAYOUTS.horizontal;
      return image + padding * 2;
    }
    const { image, border } = LAYOUTS.vertical;
    return image + border + 0.205 + border;
  }

  buildVertical() {
    const { image: size, border } = LAYOUTS.vertical;
    const top = size / 2 + border;
    const bottom = -size / 2 - 0.205;
    const row = (y, value, extra = {}) => createEntity("a-text", {
      value, align: "center", color: "#ffffff", "wrap-count": 24, width: size,
      position: vec3(0, y, 0.001), ...extra,
    });
    this.barWidth = size;
    this.barX = 0;
    return this.assemble({
      width: size + border * 2,
      height: top - bottom,
      centerY: (top + bottom) / 2,
      image: { x: 0, size },
      name: createEntity("a-text", {
        value: this.name, align: "center", color: "#ffffff", width: size * 3,
        position: vec3(0, -size / 2 - 0.04, 0.001),
      }),
      barY: -size / 2 - 0.08,
      barHeight: 0.022,
      hpText: row(-size / 2 - 0.115, ""),
      statsText: row(-size / 2 - 0.15, ""),
      strongText: row(-size / 2 - 0.185, this.strongLabel(), { color: this.typeColor() }),
    });
  }

  buildHorizontal() {
    const { image, padding, gap } = LAYOUTS.horizontal;
    const { width } = this;
    const left = -width / 2 + padding + image + gap;
    const columnWidth = width / 2 - padding - left;
    const row = (y, value, extra = {}) => createEntity("a-text", {
      value, anchor: "left", align: "left", color: "#ffffff", "wrap-count": 26, width: columnWidth,
      position: vec3(left, y, 0.001), ...extra,
    });
    this.barWidth = columnWidth;
    this.barX = left + columnWidth / 2;
    return this.assemble({
      width,
      height: this.height(),
      centerY: 0,
      image: { x: -width / 2 + padding + image / 2, size: image },
      name: row(0.05, this.owner ? `${this.name} (${this.owner.label})` : this.name, { "wrap-count": 14 }),
      barY: 0.028,
      barHeight: 0.012,
      hpText: row(0.006, ""),
      statsText: row(-0.016, ""),
      strongText: row(-0.038, this.strongLabel(), { color: this.typeColor() }),
      boostText: row(-0.06, "", { color: BOOST_COLOR }),
    });
  }

  assemble(parts) {
    this.barY = parts.barY;
    this.hpBar = createEntity("a-plane", {
      class: "hp-bar",
      position: vec3(this.barX, parts.barY, 0.002),
      width: this.barWidth, height: parts.barHeight,
      material: `color: ${HP_COLORS.high}; shader: flat`,
    });
    this.hpText = parts.hpText;
    this.hpText.classList.add("hp-text");
    this.statsText = parts.statsText;
    this.statsText.classList.add("stats-text");
    this.boostText = parts.boostText || null;
    this.boostText?.classList.add("boost-text");
    const ownerStripe = this.owner ? [createEntity("a-plane", {
      class: "owner-stripe",
      position: vec3(-parts.width / 2 + OWNER_STRIPE / 2, parts.centerY, -0.001),
      width: OWNER_STRIPE, height: parts.height,
      material: `color: ${this.owner.color}; shader: flat`,
    })] : [];
    return createEntity("a-entity", { class: `pokeprof-card pokeprof-card-${this.layout}` }, [
      createEntity("a-plane", {
        position: vec3(0, parts.centerY, -0.002),
        width: parts.width, height: parts.height, color: BACKGROUND,
      }),
      ...ownerStripe,
      createEntity("a-image", {
        src: teacherImage(this.name),
        position: vec3(parts.image.x, 0, 0),
        width: parts.image.size, height: parts.image.size,
      }),
      parts.name,
      // Fundo da barra de vida (a parte vazia).
      createEntity("a-plane", {
        position: vec3(this.barX, parts.barY, 0.001),
        width: this.barWidth, height: parts.barHeight,
        material: `color: ${HP_COLORS.empty}; shader: flat`,
      }),
      this.hpBar,
      this.hpText,
      this.statsText,
      parts.strongText,
      ...(this.boostText ? [this.boostText] : []),
    ]);
  }

  // "Tipo Fogo > Grama" (forte contra Grama).
  strongLabel() {
    if (!this.type) {
      return "";
    }
    const beats = TYPE_BEATS[this.type];
    return beats ? `Tipo ${typeLabel(this.type)} > ${typeLabel(beats)}` : `Tipo ${typeLabel(this.type)}`;
  }

  typeColor() {
    return TYPES[this.type]?.color || STRONG_COLOR;
  }

  /** Atualiza vida e atributos. @param {import("../../domain/pokeprof.js").Pokeprof} prof */
  refresh(prof) {
    if (!prof) {
      return;
    }
    const ratio = prof.hpRatio();
    const { attack, defense, speed } = prof.effectiveStats ? prof.effectiveStats() : prof.stats;
    this.hpText.setAttribute("value", prof.isFainted()
      ? `HP 0/${prof.maxHp()} - Desmaiado`
      : `HP ${prof.hp}/${prof.maxHp()}`);
    this.statsText.setAttribute("value", `ATQ ${attack}  DEF ${defense}  VEL ${speed}`);
    this.boostText?.setAttribute("value", boostLabel(prof));
    // A barra encolhe para a esquerda. Via setAttribute (e não object3D)
    // para valer mesmo se a entidade ainda não carregou: ao carregar, o
    // A-Frame reaplicaria a posição do atributo.
    this.hpBar.setAttribute("position", { x: this.barX - this.barWidth * (1 - ratio) / 2, y: this.barY, z: 0.002 });
    this.hpBar.setAttribute("scale", { x: Math.max(ratio, 0.0001), y: 1, z: 1 });
    this.hpBar.setAttribute("visible", ratio > 0);
    this.hpBar.setAttribute("material", "color", hpColor(ratio));
  }

  remove() {
    this.el.remove();
  }
}
