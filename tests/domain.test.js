import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveCircleAgainstRects, overlapsHeight } from "../site/src/domain/collision.js";
import { findNearest } from "../site/src/domain/nearest.js";
import { reelAlongRay, reelDistance, thumbstickReel } from "../site/src/domain/reel.js";

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

import { approachAngle, arcPoint, canSendOut, returnSlot } from "../site/src/domain/battle.js";
import { chooseHudOption, pullWithin, pullWithin1D } from "../site/src/domain/hud.js";

test("batalha: um pokémon por jogador, jogadores independentes", () => {
  const active = { p1: "bolaA" };
  assert.equal(canSendOut(active, "p1", "bolaB"), false);
  assert.equal(canSendOut(active, "p1", "bolaA"), true);
  assert.equal(canSendOut(active, "p2", "bolaC"), true);
  assert.equal(canSendOut({}, "p1", "bolaB"), true);
});

test("bola volta para o próprio encaixe ou para o primeiro livre", () => {
  assert.equal(returnSlot(1, [true, false, true]), 1);
  assert.equal(returnSlot(1, [false, true, false]), 0);
  assert.equal(returnSlot(2, [true, true, true]), 2);
});

test("arco de retorno começa e termina nos pontos e sobe no meio", () => {
  const from = { x: 0, y: 0, z: 0 };
  const to = { x: 2, y: 1, z: -2 };
  assert.deepEqual(arcPoint(from, to, 0, 1), from);
  const end = arcPoint(from, to, 1, 1);
  assert.ok(Math.abs(end.x - 2) < 1e-9 && Math.abs(end.y - 1) < 1e-9 && Math.abs(end.z + 2) < 1e-9);
  assert.ok(arcPoint(from, to, 0.5, 1).y > 1.4);
});

test("giro do HUD vai pelo caminho mais curto", () => {
  const near = approachAngle(3, -3, 1);
  assert.ok(Math.abs(Math.cos(near) - Math.cos(-3)) < 1e-9);
  assert.ok(Math.abs(approachAngle(3, -3, 0.5) - (3 + (2 * Math.PI - 6) / 2)) < 1e-9);
});

test("HUD: navegação entre páginas e ações anunciadas", () => {
  assert.deepEqual(chooseHudOption("main", { action: "attack" }), { page: "attack", emit: null });
  assert.deepEqual(chooseHudOption("main", { action: "powerup" }), { page: "powerup", emit: null });
  assert.deepEqual(chooseHudOption("main", { action: "switch" }), { page: "main", emit: { action: "switch" } });
  assert.deepEqual(chooseHudOption("attack", { action: "back" }), { page: "main", emit: null });
  assert.deepEqual(chooseHudOption("attack", { id: "chamada-oral" }),
    { page: "main", emit: { action: "attack", id: "chamada-oral" } });
  assert.deepEqual(chooseHudOption("powerup", { id: "feriado" }),
    { page: "main", emit: { action: "powerup", id: "feriado" } });
});

test("HUD: folga ignora inclinar a cabeça e arrasta ao andar", () => {
  assert.deepEqual(pullWithin({ x: 0, z: 0 }, { x: 0.2, z: 0 }, 0.3), { x: 0, z: 0 });
  const moved = pullWithin({ x: 0, z: 0 }, { x: 1, z: 0 }, 0.3);
  assert.ok(Math.abs(moved.x - 0.7) < 1e-9 && moved.z === 0);
  assert.equal(pullWithin1D(1.6, 1.7, 0.15), 1.6);
  assert.ok(Math.abs(pullWithin1D(1.6, 1.2, 0.15) - 1.35) < 1e-9);
});

test("carretilha anda paralela ao laser inclinado, mantendo o desvio", () => {
  const dir = { x: 0, y: -Math.SQRT1_2, z: -Math.SQRT1_2 };
  const origin = { x: 0, y: 0.01, z: 0 };
  const start = { x: 0.05, y: -0.3, z: -0.3 };
  const p = reelAlongRay(start, origin, dir, 1, 0.15, 15);
  assert.ok(Math.abs(p.x - 0.05) < 1e-9);
  assert.ok(Math.abs((p.y - start.y) - (p.z - start.z)) < 1e-9);
  const along = (q) => (q.x - origin.x) * dir.x + (q.y - origin.y) * dir.y + (q.z - origin.z) * dir.z;
  assert.ok(Math.abs(along(p) - along(start) - 1) < 1e-9);
  const close = reelAlongRay(start, origin, dir, -5, 0.15, 15);
  assert.ok(Math.abs(along(close) - 0.15) < 1e-9);
});
