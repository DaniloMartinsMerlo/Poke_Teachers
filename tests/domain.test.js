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

import { approachAngle, arcPoint, canSendOut, isOutsideArena, returnSlot } from "../site/src/domain/battle.js";
import { ARENA_BOUNDS } from "../site/src/config/arena.js";
import {
  calloutTexts, chooseHudOption, effectivenessNote, logLine, optionDetail, pullWithin, pullWithin1D,
} from "../site/src/domain/hud.js";

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
  assert.deepEqual(chooseHudOption("gameover", { action: "playagain" }),
    { page: "main", emit: { action: "playagain" } });
  assert.deepEqual(chooseHudOption("gameover", { action: "menu" }),
    { page: "main", emit: { action: "menu" } });
  assert.deepEqual(chooseHudOption("gameover", { action: "attack" }), { page: "gameover", emit: null });
});

test("HUD: poder/dano, precisão e PP embaixo dos ataques; efeito no badge dos power-ups", () => {
  assert.equal(optionDetail({ id: "x", power: 60 }), "Poder 60");
  assert.equal(optionDetail({ id: "x", power: 60 }, 32), "~32 dano");
  const move = { id: "x", power: 60, accuracy: 65, pp: 5 };
  assert.equal(optionDetail(move), "Poder 60 | 65% | PP 5/5");
  assert.equal(optionDetail(move, 32, 2), "~32 dano | 65% | PP 2/5");
  // Cabe numa linha do botão (wrap-count 30), no pior caso.
  for (const a of ATTACKS) {
    assert.ok(optionDetail(a, 999, a.pp).length <= 30);
    assert.ok(optionDetail(a).length <= 30);
  }
  assert.equal(optionDetail({ effect: "heal", percent: 35 }), "Cura 35% HP");
  assert.equal(optionDetail({ effect: "boost", short: "VEL", percent: 80 }), "VEL +80% (1 turno)");
  assert.equal(optionDetail({ action: "back" }), "");
});

test("balões e registro: golpe, dano, efetividade, desmaio, power-up", () => {
  const hit = { kind: "attack", player: "p2", target: "p1", actorName: "Rodinha", label: "Chamada Oral", damage: 16, multiplier: 1.5, fainted: false };
  assert.deepEqual(calloutTexts(hit), { actor: "Chamada Oral!", target: "-16 HP", note: "Super efetivo!" });
  assert.equal(calloutTexts({ ...hit, multiplier: 1, fainted: true }).note, "Desmaiou!");
  assert.equal(effectivenessNote(0.67), "Pouco efetivo...");
  assert.equal(effectivenessNote(1), "");
  assert.equal(logLine(hit, "J2"), "J2 Rodinha: Chamada Oral -16 (super)");
  const heal = { kind: "powerup", actorName: "Fabi", label: "Intervalo", healed: 35, powerup: { effect: "heal" } };
  assert.deepEqual(calloutTexts(heal), { actor: "Intervalo! +35 HP", target: null, note: "" });
  const boost = { kind: "powerup", actorName: "Murilo", label: "Feriado", powerup: { effect: "boost", short: "DEF", percent: 100 } };
  assert.equal(logLine(boost, "J1"), "J1 Murilo: Feriado DEF +100%");
  // Errou e troca.
  assert.deepEqual(calloutTexts({ ...hit, damage: 0, missed: true }), { actor: "Chamada Oral!", target: "Errou!", note: "" });
  assert.equal(logLine({ ...hit, damage: 0, missed: true }, "J2"), "J2 Rodinha: Chamada Oral errou!");
  const swap = { kind: "switch", player: "p1", target: "p2", actorName: "Murilo", label: "Troca" };
  assert.deepEqual(calloutTexts(swap), { actor: "Vai, Murilo!", target: null, note: "" });
  assert.equal(logLine(swap, "J1"), "J1 trocou: Murilo entrou");
  // Todas as linhas possíveis cabem numa linha do registro (HUD_LOG.wrapCount).
  for (const t of ["Fabi", "Murilo", "Rodinha"]) {
    for (const a of ATTACKS) {
      assert.ok(logLine({ ...hit, actorName: t, label: a.label, damage: 99, multiplier: 0.67 }, "J2").length <= 44);
    }
  }
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

import { Pokeprof } from "../site/src/domain/pokeprof.js";
import {
  advantageMultiplier, calculateDamage, isAdvantageCycle, simulateDuel, turnOrder,
} from "../site/src/domain/combat.js";
import {
  TEACHER_NAMES, TYPES, TYPE_BEATS, teacherStats, teacherType,
} from "../site/src/config/teachers.js";
import { ATTACKS, BALANCE_TEST_POWER, DAMAGE_RULES, POWERUPS } from "../site/src/config/battle.js";
import {
  ACTION_KINDS, SWITCH_CHOICE, TurnChoices, isTeamDefeated, performAction, planTurn, resolveTurn, rollHit,
} from "../site/src/domain/turn.js";
import {
  CPU_EFFECTS, CPU_STATES, ballisticVelocity, nextCpuState, pickAction, pickProf,
} from "../site/src/domain/cpu.js";
import { extendSegment, pushOutOfPlane } from "../site/src/domain/held.js";

test("PokeProf: dano não passa de 0, cura não passa do máximo", () => {
  const p = new Pokeprof("X", { hp: 100, attack: 50, defense: 50, speed: 50 });
  assert.equal(p.takeDamage(30), 30);
  assert.equal(p.hp, 70);
  assert.equal(p.hpRatio(), 0.7);
  assert.equal(p.takeDamage(500), 70);
  assert.ok(p.isFainted());
  assert.equal(p.heal(), 100);
  assert.equal(p.hp, 100);
});

test("dano: defesa reduz com retorno decrescente, vantagem de tipo multiplica", () => {
  const rules = { attackScale: 50, defenseScale: 100, strong: 1.5, weak: 0.5, minDamage: 1 };
  const atk = { type: "fogo", stats: { attack: 50 } };
  const def = (defense, type = "x") => ({ type, stats: { defense } });
  const beats = { fogo: "grama" };
  assert.equal(calculateDamage(atk, def(0), 40, beats, rules), 40);
  assert.equal(calculateDamage(atk, def(100), 40, beats, rules), 20);
  assert.equal(calculateDamage(atk, def(100, "grama"), 40, beats, rules), 30);
  assert.equal(calculateDamage({ ...atk, type: "grama" }, def(100, "fogo"), 40, beats, rules), 10);
  assert.equal(calculateDamage(atk, def(100000), 40, beats, rules), 1);
  assert.equal(advantageMultiplier("fogo", "fogo", beats, rules), 1);
  assert.equal(advantageMultiplier(null, "grama", beats, rules), 1);
});

test("tipos: Rodinha fogo, Fabi grama, Murilo agua; Fogo > Grama > Agua > Fogo", () => {
  assert.equal(teacherType("Rodinha"), "fogo");
  assert.equal(teacherType("Fabi"), "grama");
  assert.equal(teacherType("Murilo"), "agua");
  assert.equal(TYPE_BEATS.fogo, "grama");
  assert.equal(TYPE_BEATS.grama, "agua");
  assert.equal(TYPE_BEATS.agua, "fogo");
  assert.ok(isAdvantageCycle(TYPE_BEATS, Object.keys(TYPES)));
  assert.equal(isAdvantageCycle({ A: "B", B: "A", C: "A" }, ["A", "B", "C"]), false);
});

test("velocidade: o mais rápido ataca primeiro; empate sorteia", () => {
  const fast = { stats: { speed: 70 } };
  const slow = { stats: { speed: 40 } };
  assert.deepEqual(turnOrder(slow, fast), [fast, slow]);
  const tieA = { stats: { speed: 50 } };
  const tieB = { stats: { speed: 50 } };
  assert.deepEqual(turnOrder(tieA, tieB, () => 0.1), [tieA, tieB]);
  assert.deepEqual(turnOrder(tieA, tieB, () => 0.9), [tieB, tieA]);
});

// Rode `npm test` depois de mudar config/teachers.js ou config/battle.js:
// cada tipo vence o tipo que ele bate, nos dois sentidos.
const fighterOf = (name) => ({ name, type: teacherType(name), stats: teacherStats(name) });
for (const winner of TEACHER_NAMES) {
  const loser = TEACHER_NAMES.find((name) => teacherType(name) === TYPE_BEATS[teacherType(winner)]);
  test(`balanceamento: ${winner} vence ${loser} nos dois sentidos`, () => {
    const args = [BALANCE_TEST_POWER, TYPE_BEATS, DAMAGE_RULES];
    assert.equal(simulateDuel(fighterOf(winner), fighterOf(loser), ...args), winner);
    assert.equal(simulateDuel(fighterOf(loser), fighterOf(winner), ...args), winner);
  });
}

// ---------------------------------------------------------------- turnos
const RULES = { attacks: ATTACKS, powerups: POWERUPS, typeBeats: TYPE_BEATS, rules: DAMAGE_RULES };
// Sorteio que sempre acerta (0 < precisão) e, no empate, põe o 1º lado na frente.
const HIT = () => 0;
const MISS = () => 0.9999;
const prof = (name) => new Pokeprof(name, teacherStats(name), teacherType(name));
const side = (player, p, kind, id) => ({ player, prof: p, choice: { kind, id } });
const attack = (player, p, id = "prova-surpresa") => side(player, p, ACTION_KINDS.ATTACK, id);
const powerup = (player, p, id) => side(player, p, ACTION_KINDS.POWERUP, id);

test("turno: espera as duas escolhas; uma escolha por jogador", () => {
  const choices = new TurnChoices();
  assert.equal(choices.isReady(["p1", "p2"]), false);
  assert.equal(choices.choose("p1", { kind: "attack", id: "a" }), true);
  assert.equal(choices.choose("p1", { kind: "attack", id: "b" }), false);
  assert.equal(choices.get("p1").id, "a");
  assert.equal(choices.isReady(["p1", "p2"]), false);
  choices.choose("p2", { kind: "powerup", id: "c" });
  assert.equal(choices.isReady(["p1", "p2"]), true);
  choices.clear("p1");
  assert.equal(choices.isReady(["p1", "p2"]), false);
  choices.clear();
  assert.equal(choices.has("p2"), false);
});

test("turno: o mais rápido age primeiro e os dois atacam", () => {
  const rodinha = prof("Rodinha"); // VEL 70
  const murilo = prof("Murilo"); // VEL 40
  const results = resolveTurn([attack("p1", murilo), attack("p2", rodinha)], RULES, HIT);
  assert.deepEqual(results.map((r) => r.player), ["p2", "p1"]);
  assert.ok(rodinha.hp < rodinha.maxHp() && murilo.hp < murilo.maxHp());
  assert.equal(results[0].damage, murilo.maxHp() - murilo.hp);
});

test("turno: se o primeiro derruba o outro, o segundo não age", () => {
  const rodinha = prof("Rodinha");
  const murilo = prof("Murilo");
  murilo.takeDamage(murilo.hp - 1);
  const results = resolveTurn([attack("p1", murilo), attack("p2", rodinha)], RULES, HIT);
  assert.equal(results.length, 1);
  assert.equal(results[0].fainted, true);
  assert.equal(rodinha.hp, rodinha.maxHp());
});

test("power-up: não vale no turno do uso; vale no seguinte; expira depois", () => {
  const fabi = prof("Fabi");
  const murilo = prof("Murilo");
  // Turno 1: Murilo usa Feriado (DEF +100%) e Fabi ataca: dano normal.
  const normal = resolveTurn([attack("p1", fabi), powerup("p2", murilo, "feriado")], RULES, HIT)[0].damage;
  assert.equal(murilo.activeBoost.id, "feriado");
  assert.equal(murilo.effectiveStats().defense, 120);
  // Turno 2: com a defesa dobrada, o mesmo ataque tira menos.
  const before = murilo.hp;
  resolveTurn([attack("p1", fabi), attack("p2", murilo, "chamada-oral")], RULES, HIT);
  assert.ok(before - murilo.hp < normal);
  // Turno 3: expirou.
  assert.equal(murilo.activeBoost, null);
  assert.equal(murilo.effectiveStats().defense, 60);
});

test("power-up: velocidade faz o mais lento agir primeiro no turno seguinte", () => {
  const rodinha = prof("Rodinha"); // 70
  const murilo = prof("Murilo"); // 40 → 72 com Cola Liberada
  const first = resolveTurn([powerup("p1", murilo, "cola-liberada"), attack("p2", rodinha)], RULES, HIT);
  assert.equal(first[0].player, "p2"); // no turno do uso, ainda é o mais lento
  assert.equal(murilo.effectiveStats().speed, 72);
  const order = planTurn([attack("p1", murilo), attack("p2", rodinha)]);
  assert.equal(order[0][0].player, "p1");
});

test("power-up: ataque aumentado tira mais; cura vale na hora sem passar do máximo", () => {
  const fabi = prof("Fabi");
  const plain = prof("Murilo");
  const boosted = prof("Murilo");
  const target = () => prof("Rodinha");
  const t1 = target();
  const dmgPlain = performAction(attack("p1", plain), side("p2", t1), RULES, HIT).damage;
  boosted.queueBoost(POWERUPS.find((p) => p.id === "ponto-extra"));
  boosted.endTurn();
  const t2 = target();
  const dmgBoosted = performAction(attack("p1", boosted), side("p2", t2), RULES, HIT).damage;
  assert.ok(dmgBoosted > dmgPlain);
  fabi.takeDamage(10);
  const heal = performAction(powerup("p1", fabi, "intervalo"), side("p2", t1), RULES, HIT);
  assert.equal(heal.healed, 10);
  assert.equal(fabi.hp, fabi.maxHp());
  fabi.takeDamage(90);
  assert.equal(performAction(powerup("p1", fabi, "intervalo"), side("p2", t1), RULES, HIT).healed, 35);
});

test("precisão: sorteio abaixo da precisão acerta; 100% sempre acerta", () => {
  assert.equal(rollHit(65, () => 0.64), true);
  assert.equal(rollHit(65, () => 0.65), false);
  assert.equal(rollHit(100, () => 0.9999), true);
  assert.equal(rollHit(undefined, () => 0.9999), true);
});

test("precisão: ataque que erra não tira vida, mas gasta o PP e o turno", () => {
  const fabi = prof("Fabi");
  const murilo = prof("Murilo");
  const move = ATTACKS.find((a) => a.id === "reprovacao");
  const result = performAction(attack("p1", fabi, "reprovacao"), side("p2", murilo), RULES, MISS);
  assert.equal(result.missed, true);
  assert.equal(result.damage, 0);
  assert.equal(murilo.hp, murilo.maxHp());
  assert.equal(fabi.ppLeft(move), move.pp - 1);
  assert.equal(result.ppLeft, move.pp - 1);
});

test("precisão: mais dano, menos precisão e menos PP", () => {
  const byPower = [...ATTACKS].sort((a, b) => a.power - b.power);
  for (let i = 1; i < byPower.length; i++) {
    assert.ok(byPower[i].accuracy <= byPower[i - 1].accuracy, `${byPower[i].id} precisão`);
    assert.ok(byPower[i].pp <= byPower[i - 1].pp, `${byPower[i].id} PP`);
    assert.ok(byPower[i].accuracy < byPower[i - 1].accuracy || byPower[i].pp < byPower[i - 1].pp);
  }
});

test("PP: acaba depois de N usos, por PokeProf; sem PP não ataca; reset devolve", () => {
  const fabi = prof("Fabi");
  const outra = prof("Fabi");
  const move = ATTACKS.find((a) => a.id === "reprovacao");
  for (let i = 0; i < move.pp; i++) {
    assert.ok(performAction(attack("p1", fabi, "reprovacao"), side("p2", prof("Murilo")), RULES, HIT));
  }
  assert.equal(fabi.ppLeft(move), 0);
  assert.equal(fabi.hasPp(move), false);
  assert.equal(outra.ppLeft(move), move.pp);
  const target = prof("Murilo");
  assert.equal(performAction(attack("p1", fabi, "reprovacao"), side("p2", target), RULES, HIT), null);
  assert.equal(target.hp, target.maxHp());
  fabi.restorePp();
  assert.equal(fabi.ppLeft(move), move.pp);
});

test("PP: ataque em alvo desmaiado não acontece nem gasta PP", () => {
  const fabi = prof("Fabi");
  const murilo = prof("Murilo");
  murilo.takeDamage(1000);
  const move = ATTACKS.find((a) => a.id === "chamada-oral");
  assert.equal(performAction(attack("p1", fabi, "chamada-oral"), side("p2", murilo), RULES, HIT), null);
  assert.equal(fabi.ppLeft(move), move.pp);
});

test("troca: vai primeiro mesmo sendo mais lento e o adversário ataca quem entrou", () => {
  const rodinha = prof("Rodinha"); // VEL 70
  const murilo = prof("Murilo"); // VEL 40, acabou de entrar
  const swap = { player: "p1", prof: murilo, choice: SWITCH_CHOICE };
  const order = planTurn([swap, attack("p2", rodinha)]);
  assert.equal(order[0][0].player, "p1");
  const results = resolveTurn([swap, attack("p2", rodinha)], RULES, HIT);
  assert.deepEqual(results.map((r) => r.kind), ["switch", "attack"]);
  assert.ok(murilo.hp < murilo.maxHp());
  assert.equal(rodinha.hp, rodinha.maxHp());
});

test("fim de jogo: time perde quando todos desmaiam", () => {
  const a = prof("Fabi");
  const b = prof("Murilo");
  assert.equal(isTeamDefeated([a, b]), false);
  a.takeDamage(1000);
  assert.equal(isTeamDefeated([a, b]), false);
  b.takeDamage(1000);
  assert.equal(isTeamDefeated([a, b]), true);
  assert.equal(isTeamDefeated([]), false);
});

// ------------------------------------------------------------------- CPU
const view = (extra = {}) => ({
  gameOver: false, opponentOnField: false, ownOnField: false, ballInFlight: false,
  canChoose: false, hasChosen: false, ready: false, ...extra,
});

test("CPU: espera o jogador, escolhe e arremessa um PokeProf", () => {
  assert.equal(nextCpuState(CPU_STATES.WAITING, view()).state, CPU_STATES.WAITING);
  assert.equal(nextCpuState(CPU_STATES.WAITING, view({ opponentOnField: true })).state, CPU_STATES.CHOOSE_PROF);
  assert.deepEqual(nextCpuState(CPU_STATES.CHOOSE_PROF, view({ opponentOnField: true })),
    { state: CPU_STATES.CHOOSE_PROF, effect: null });
  assert.deepEqual(nextCpuState(CPU_STATES.CHOOSE_PROF, view({ ready: true })),
    { state: CPU_STATES.THROWING, effect: CPU_EFFECTS.THROW });
  assert.equal(nextCpuState(CPU_STATES.THROWING, view({ ballInFlight: true })).state, CPU_STATES.THROWING);
  assert.equal(nextCpuState(CPU_STATES.THROWING, view({ ownOnField: true })).state, CPU_STATES.CHOOSE_ACTION);
  // Não soltou a tempo: tenta de novo.
  assert.equal(nextCpuState(CPU_STATES.THROWING, view()).state, CPU_STATES.CHOOSE_PROF);
});

test("CPU: pensa, escolhe, espera o turno e volta a escolher", () => {
  const onField = { ownOnField: true, opponentOnField: true };
  assert.equal(nextCpuState(CPU_STATES.CHOOSE_ACTION, view({ ...onField, canChoose: true })).state,
    CPU_STATES.CHOOSE_ACTION);
  assert.deepEqual(nextCpuState(CPU_STATES.CHOOSE_ACTION, view({ ...onField, canChoose: true, ready: true })),
    { state: CPU_STATES.WAIT_TURN, effect: CPU_EFFECTS.CHOOSE });
  // Adversário sem PokeProf (desmaiou): não escolhe.
  assert.equal(nextCpuState(CPU_STATES.CHOOSE_ACTION, view({ ownOnField: true, ready: true })).state,
    CPU_STATES.CHOOSE_ACTION);
  assert.equal(nextCpuState(CPU_STATES.WAIT_TURN, view({ ...onField, hasChosen: true })).state, CPU_STATES.WAIT_TURN);
  assert.equal(nextCpuState(CPU_STATES.WAIT_TURN, view(onField)).state, CPU_STATES.WAIT_TURN); // resolvendo
  assert.equal(nextCpuState(CPU_STATES.WAIT_TURN, view({ ...onField, canChoose: true })).state,
    CPU_STATES.CHOOSE_ACTION);
});

test("CPU: PokeProf derrotado → escolhe outro; fim de jogo para; reset recomeça", () => {
  assert.equal(nextCpuState(CPU_STATES.WAIT_TURN, view({ opponentOnField: true })).state, CPU_STATES.CHOOSE_PROF);
  assert.equal(nextCpuState(CPU_STATES.CHOOSE_ACTION, view()).state, CPU_STATES.CHOOSE_PROF);
  for (const state of Object.values(CPU_STATES)) {
    assert.equal(nextCpuState(state, view({ gameOver: true })).state, CPU_STATES.DONE);
  }
  assert.equal(nextCpuState(CPU_STATES.DONE, view()).state, CPU_STATES.WAITING);
});

test("CPU: sorteia PokeProf entre os de pé", () => {
  assert.equal(pickProf([], () => 0), null);
  assert.equal(pickProf(["a", "b", "c"], () => 0.5), "b");
  assert.equal(pickProf(["a", "b", "c"], () => 0.9999), "c");
});

test("CPU: power-up com 25% de chance, sem repetir o último nem curar com vida cheia", () => {
  const seq = (...values) => { let i = 0; return () => values[i++ % values.length]; };
  const base = { attacks: ATTACKS, powerups: POWERUPS, powerupChance: 0.25 };
  assert.equal(pickAction({ ...base, random: seq(0.3, 0) }).kind, ACTION_KINDS.ATTACK);
  assert.equal(pickAction({ ...base, random: seq(0.2, 0) }).kind, ACTION_KINDS.POWERUP);
  for (let k = 0; k < 20; k++) {
    const choice = pickAction({ ...base, lastPowerupId: "ponto-extra", hpFull: true, random: seq(0.1, k / 20) });
    assert.equal(choice.kind, ACTION_KINDS.POWERUP);
    assert.notEqual(choice.id, "ponto-extra");
    assert.notEqual(choice.id, "intervalo");
  }
  // Com muitas tentativas, ~25% são power-ups.
  let powerups = 0;
  let state = 1;
  const lcg = () => { state = (state * 16807) % 2147483647; return state / 2147483647; };
  for (let k = 0; k < 4000; k++) {
    if (pickAction({ ...base, random: lcg }).kind === ACTION_KINDS.POWERUP) powerups++;
  }
  assert.ok(Math.abs(powerups / 4000 - 0.25) < 0.03);
});

test("CPU: arremesso em arco chega ao alvo", () => {
  const from = { x: -0.6, y: 1.36, z: -7 };
  const to = { x: 1, y: 0.09, z: -3.5 };
  const g = -9.82;
  const t = 1.1;
  const v = ballisticVelocity(from, to, t, g);
  assert.ok(v.y > 0);
  const at = (k) => from.y + v.y * k + 0.5 * g * k * k;
  assert.ok(Math.abs(at(t) - to.y) < 1e-9);
  assert.ok(Math.abs(from.x + v.x * t - to.x) < 1e-9 && Math.abs(from.z + v.z * t - to.z) < 1e-9);
});

test("CPU: sem PP em nenhum ataque, usa power-up", () => {
  const choice = pickAction({ attacks: [], powerups: POWERUPS, powerupChance: 0, random: () => 0 });
  assert.equal(choice.kind, ACTION_KINDS.POWERUP);
  const onlyHeal = POWERUPS.filter((p) => p.effect === "heal");
  assert.equal(pickAction({ attacks: [], powerups: onlyHeal, powerupChance: 0, hpFull: true, random: () => 0 }).id, "intervalo");
});

// ------------------------------------------------------- fora da arena
test("arena: bola dentro das muretas está dentro; arquibancada e fundo, fora", () => {
  assert.equal(isOutsideArena({ x: 0, z: 0 }, ARENA_BOUNDS), false);
  assert.equal(isOutsideArena({ x: 0.6, z: 7 }, ARENA_BOUNDS), false); // suporte
  assert.equal(isOutsideArena({ x: 6.9, z: -9.9 }, ARENA_BOUNDS), false);
  assert.equal(isOutsideArena({ x: 8.5, z: 0 }, ARENA_BOUNDS), true); // arquibancada
  assert.equal(isOutsideArena({ x: -7.2, z: 3 }, ARENA_BOUNDS), true); // mureta
  assert.equal(isOutsideArena({ x: 0, z: 10.5 }, ARENA_BOUNDS), true);
});

// ---------------------------------------------------- bola segurada
test("bola segurada: empurrada para fora da parede, desliza rente a ela", () => {
  const wall = { x: 7, y: 0, z: 0 };
  const normal = { x: -1, y: 0, z: 0 };
  const p = pushOutOfPlane({ x: 7.5, y: 1, z: 2 }, wall, normal, 0.1);
  assert.ok(Math.abs(p.x - 6.9) < 1e-9);
  assert.equal(p.y, 1);
  assert.equal(p.z, 2);
  assert.deepEqual(pushOutOfPlane({ x: 5, y: 1, z: 2 }, wall, normal, 0.1), { x: 5, y: 1, z: 2 });
  const ground = pushOutOfPlane({ x: 0, y: -0.5, z: 0 }, { x: 0, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }, 0.088);
  assert.ok(Math.abs(ground.y - 0.088) < 1e-9);
});

test("bola segurada: segmento prolongado pelo raio", () => {
  const e = extendSegment({ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, 0.1);
  assert.ok(Math.abs(e.x - 1.1) < 1e-9);
  assert.deepEqual(extendSegment({ x: 1, y: 1, z: 1 }, { x: 1, y: 1, z: 1 }, 0.1), { x: 1, y: 1, z: 1 });
});

// ------------------------------------------------------- tela inicial
import { chooseMenuOption, panelPlacement, shouldReplacePanel, stackPositions } from "../site/src/domain/menu.js";
import { MENU_OPTIONS } from "../site/src/config/menu.js";

test("menu: J1 x COMP abre a partida; J1 x J2 e créditos trocam de tela; Voltar volta", () => {
  const go = (screen, action, extra = {}) => chooseMenuOption(screen, { action, ...extra });
  assert.deepEqual(go("home", "vs-cpu"), { screen: "home", start: "cpu", notice: null });
  assert.equal(go("home", "vs-player").screen, "versus");
  assert.equal(go("home", "credits").screen, "credits");
  assert.equal(go("credits", "back").screen, "home");
  assert.equal(go("versus", "back").screen, "home");
  // Salas online ainda não existem: só o aviso.
  assert.deepEqual(go("versus", "create-room", { soon: true }), { screen: "versus", start: null, notice: "soon" });
  assert.ok(MENU_OPTIONS.versus.filter((o) => o.action !== "back").every((o) => o.soon));
  assert.deepEqual(MENU_OPTIONS.home.map((o) => o.action), ["vs-cpu", "vs-player", "credits"]);
});

test("menu: painel à frente da cabeça e botões empilhados de cima para baixo", () => {
  const p = panelPlacement({ x: 0, y: 1.6, z: 7 }, 0, 1.4, 0.15);
  assert.ok(Math.abs(p.z - 5.6) < 1e-9 && p.x === 0 && Math.abs(p.y - 1.45) < 1e-9);
  const left = panelPlacement({ x: 0, y: 1.6, z: 0 }, Math.PI / 2, 1, 0);
  assert.ok(Math.abs(left.x + 1) < 1e-9 && Math.abs(left.z) < 1e-9);
  const ys = stackPositions(3, 0.1, 0.03);
  assert.ok(ys[0] > ys[1] && ys[1] > ys[2]);
  assert.ok(Math.abs(ys[1]) < 1e-9 && Math.abs(ys[0] - ys[1] - 0.13) < 1e-9);
});

test("menu: painel nunca abaixo da altura mínima; espera a cabeça ter posição no VR", () => {
  // Cabeça ainda na altura 0 (VR acabou de ligar): painel não vai para o chão.
  assert.equal(panelPlacement({ x: 0, y: 0, z: 7 }, 0, 1.4, 0.15, 0.9).y, 0.9);
  assert.ok(Math.abs(panelPlacement({ x: 0, y: 1.7, z: 7 }, 0, 1.4, 0.15, 0.9).y - 1.55) < 1e-9);
  const rules = { headReadyHeight: 0.5, followMs: 2500, maxDistance: 3, maxBelow: 1 };
  const head = { x: 0, y: 1.6, z: 7 };
  const inFront = { x: 0, y: 1.45, z: 5.6 };
  // Logo depois de entrar no VR: acompanha a cabeça, se ela já tem posição.
  assert.equal(shouldReplacePanel(head, inFront, 100, rules), true);
  assert.equal(shouldReplacePanel({ x: 0, y: 0, z: 7 }, inFront, 100, rules), false);
  // Depois: parado, salvo se ficou longe ou abaixo da cabeça.
  assert.equal(shouldReplacePanel(head, inFront, null, rules), false);
  assert.equal(shouldReplacePanel(head, { x: 0, y: -0.2, z: 5.6 }, null, rules), true);
  assert.equal(shouldReplacePanel(head, { x: 0, y: 1.45, z: 0 }, null, rules), true);
});

// ------------------------------------------------------------ mouse
import { isMouseDrag, mouseThrowVelocity } from "../site/src/domain/mouse.js";

test("mouse: arrastar para girar a câmera não é clique", () => {
  assert.equal(isMouseDrag({ x: 100, y: 100 }, { x: 103, y: 102 }, 6), false);
  assert.equal(isMouseDrag({ x: 100, y: 100 }, { x: 140, y: 100 }, 6), true);
});

test("mouse: arremesso na direção do ponteiro, com empurrão para cima", () => {
  const v = mouseThrowVelocity({ x: 0, y: 0, z: -2 }, 6, 2);
  assert.ok(Math.abs(v.z + 6) < 1e-9 && Math.abs(v.y - 2) < 1e-9 && v.x === 0);
});

// ------------------------------------------------------- sala online
import { generateRoomCode, isValidRoomCode, normalizeRoomCode, roomPeerId } from "../site/src/domain/room.js";

test("sala: código de 4 dígitos com zeros à esquerda; valida o digitado", () => {
  assert.equal(generateRoomCode(4, () => 0), "0000");
  assert.equal(generateRoomCode(4, () => 0.0427), "0427");
  assert.equal(generateRoomCode(4, () => 0.99999), "9999");
  for (let i = 0; i < 50; i++) assert.ok(isValidRoomCode(generateRoomCode(4), 4));
  assert.equal(normalizeRoomCode(" 48-27 "), "4827");
  assert.equal(isValidRoomCode("4827", 4), true);
  assert.equal(isValidRoomCode("482", 4), false);
  assert.equal(isValidRoomCode("48a7", 4), false);
  assert.equal(roomPeerId("4827", "poketeachers-inteli-"), "poketeachers-inteli-4827");
});
