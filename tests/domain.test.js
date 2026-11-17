import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveCircleAgainstRects, overlapsHeight } from "../site/src/domain/collision.js";
import { findNearest } from "../site/src/domain/nearest.js";
import { reelDistance, thumbstickReel } from "../site/src/domain/reel.js";

// Mureta direita da arena: lado de dentro em x = 7.
const rightWall = { minX: 7, maxX: 7.3, minY: 0, maxY: 0.8, minZ: -10.3, maxZ: 10.3 };
const backWall = { minX: -7, maxX: 7, minY: 0, maxY: 0.8, minZ: 10, maxZ: 10.3 };

test("jogador longe da parede não é empurrado", () => {
  assert.deepEqual(resolveCircleAgainstRects({ x: 0, z: 0 }, 0.25, [rightWall]), { x: 0, z: 0 });
});

test("jogador encostando na parede é empurrado para dentro", () => {
  const c = resolveCircleAgainstRects({ x: 6.9, z: 0 }, 0.25, [rightWall]);
  assert.ok(Math.abs(6.9 + c.x - 6.75) < 1e-9);
  assert.equal(c.z, 0);
});

test("jogador dentro da parede sai pelo lado mais próximo", () => {
  const c = resolveCircleAgainstRects({ x: 7.1, z: 0 }, 0.25, [rightWall]);
  assert.ok(Math.abs(7.1 + c.x - 6.75) < 1e-9);
});

test("canto entre duas paredes empurra nos dois eixos", () => {
  const c = resolveCircleAgainstRects({ x: 6.95, z: 9.95 }, 0.25, [rightWall, backWall]);
  assert.ok(6.95 + c.x <= 6.75 + 1e-9);
  assert.ok(9.95 + c.z <= 9.75 + 1e-9);
});

test("passo grande que passa do meio da parede volta para dentro", () => {
  const previous = { x: 6.74, z: 0 };
  const c = resolveCircleAgainstRects({ x: 7.2, z: 0 }, 0.25, [rightWall], previous);
  assert.ok(Math.abs(7.2 + c.x - 6.75) < 1e-9);
  const beyond = resolveCircleAgainstRects({ x: 7.4, z: 0 }, 0.25, [rightWall], previous);
  assert.ok(Math.abs(7.4 + beyond.x - 6.75) < 1e-9);
});

test("deslizar ao longo da parede mantém o movimento paralelo", () => {
  const c = resolveCircleAgainstRects({ x: 6.8, z: 1.0 }, 0.25, [rightWall], { x: 6.75, z: 0.9 });
  assert.ok(Math.abs(6.8 + c.x - 6.75) < 1e-9);
  assert.equal(c.z, 0);
});

test("voando acima da mureta não colide", () => {
  assert.equal(overlapsHeight(rightWall, 1.0, 2.6), false);
  assert.equal(overlapsHeight(rightWall, 0, 1.6), true);
});

test("findNearest respeita a distância máxima", () => {
  const origin = { distanceTo: (p) => Math.abs(p) };
  assert.equal(findNearest([0.5, 0.1, 0.2], origin, 0.3, (p) => p), 0.1);
  assert.equal(findNearest([0.5], origin, 0.3, (p) => p), null);
});

import { isLandingNormal, pickByName, releasesPokemon } from "../site/src/domain/landing.js";

test("pouso: contato vindo de baixo conta, batida de lado não", () => {
  assert.equal(isLandingNormal({ x: 0, y: 1, z: 0 }, 0.7), true);
  assert.equal(isLandingNormal({ x: 0, y: -0.9, z: 0.4 }, 0.7), true);
  assert.equal(isLandingNormal({ x: 1, y: 0.1, z: 0 }, 0.7), false);
});

test("pokémon só sai quando a bola pousa na superfície de soltura", () => {
  assert.equal(releasesPokemon("ground", "ground"), true);
  assert.equal(releasesPokemon("wood", "ground"), false);
  assert.equal(releasesPokemon(null, "ground"), false);
});

test("mesmo nome escolhe sempre o mesmo visual", () => {
  const options = ["a", "b", "c", "d", "e"];
  assert.equal(pickByName("Fabi", options), pickByName("Fabi", options));
  assert.ok(options.includes(pickByName("", options)));
  const teachers = ["Fabi", "Murilo", "Rodinha"];
  const picked = new Set(teachers.map((n) => pickByName(n, options, teachers)));
  assert.equal(picked.size, 3);
});

test("carretilha respeita os limites de distância", () => {
  assert.equal(reelDistance(5, -1, 0.15, 15), 4);
  assert.equal(reelDistance(0.3, -1, 0.15, 15), 0.15);
  assert.equal(reelDistance(14.5, 2, 0.15, 15), 15);
});

test("analógico para frente afasta, para trás puxa, zona morta ignora", () => {
  assert.ok(thumbstickReel(-1, 4, 0.1, 0.15) > 0);
  assert.ok(thumbstickReel(1, 4, 0.1, 0.15) < 0);
  assert.equal(thumbstickReel(0.1, 4, 0.1, 0.15), 0);
});
