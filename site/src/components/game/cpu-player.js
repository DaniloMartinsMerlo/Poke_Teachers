import { ATTACKS, CPU, POWERUPS } from "../../config/battle.js";
import { EVENTS, HELD_ATTRIBUTE, MAX_FRAME_MS, NO_GRAB_ATTRIBUTE, RETURNING_ATTRIBUTE } from "../../config/constants.js";
import { GRAVITY } from "../../config/physics.js";
import { ACTION_KINDS } from "../../domain/turn.js";
import {
  CPU_EFFECTS, CPU_STATES, ballisticVelocity, nextCpuState, pickAction, pickProf,
} from "../../domain/cpu.js";

// Adversário computador. Fica na mesma entidade do "ball-rack" do jogador
// que ele controla (as bolas desse suporte são dele, e nenhuma pessoa
// pode pegá-las). Máquina de estados em domain/cpu.js:
//   aguardando → escolher PokeProf → arremessar (bola em arco até o campo,
//   solta o PokeProf como a de um jogador) → escolher ação ("pensando")
//   → aguardar o turno → escolher ação ... ; se o dela desmaiar e voltar
//   para a bola, escolhe outro; para no fim de jogo; o reset recomeça.
// Esperas e chances em config/battle.js (CPU). `enabled: false` desliga
// (usado nos testes para controlar o J2 na mão).
AFRAME.registerComponent("cpu-player", {
  schema: {
    enabled: { default: true },
    thinkMs: { default: CPU.thinkMs },
    sendDelayMs: { default: CPU.sendDelayMs },
  },

  init() {
    this.reset();
    this.onGameReset = () => this.reset();
    this.onTurnAction = ({ detail }) => {
      if (detail.player === this.player() && detail.kind === ACTION_KINDS.POWERUP) {
        this.lastPowerupId = detail.powerup.id;
      }
    };
    this.el.sceneEl.addEventListener(EVENTS.GAME_RESET, this.onGameReset);
    this.el.sceneEl.addEventListener(EVENTS.TURN_ACTION, this.onTurnAction);
  },

  // Desligada (testes): as bolas voltam a poder ser pegas.
  update() {
    if (!this.data.enabled) {
      (this.rack()?.balls || []).forEach((ball) => ball.removeAttribute(NO_GRAB_ATTRIBUTE));
    }
  },

  reset() {
    this.setState(CPU_STATES.WAITING);
    this.lastPowerupId = null;
    this.thrown = null;
  },

  setState(state) {
    this.state = state;
    this.elapsed = 0;
    this.el.dataset.cpuState = state;
  },

  rack() {
    return this.el.components["ball-rack"];
  },

  player() {
    return this.rack()?.data.player;
  },

  battle() {
    return this.el.sceneEl.systems.battle;
  },

  // Bolas desta CPU: pessoas não pegam.
  lockBalls() {
    this.rack().balls.forEach((ball) => {
      if (!ball.hasAttribute(NO_GRAB_ATTRIBUTE)) {
        ball.setAttribute(NO_GRAB_ATTRIBUTE, "true");
      }
    });
  },

  // O que a CPU "vê" da cena (entrada da máquina de estados).
  view() {
    const battle = this.battle();
    const me = this.player();
    const waitMs = this.state === CPU_STATES.CHOOSE_PROF ? this.data.sendDelayMs : this.data.thinkMs;
    return {
      gameOver: battle.isGameOver(),
      opponentOnField: Boolean(battle.activeBall(battle.opponentOf(me))),
      ownOnField: Boolean(battle.activeBall(me)),
      ballInFlight: Boolean(this.thrown) && this.elapsed < CPU.throwTimeoutMs,
      canChoose: battle.canChoose(me),
      hasChosen: battle.hasChosen(me),
      ready: this.elapsed >= waitMs,
    };
  },

  tick(time, delta) {
    const rack = this.rack();
    if (!this.data.enabled || !rack || !rack.balls.length) {
      return;
    }
    this.lockBalls();
    this.elapsed += Math.min(delta || 0, MAX_FRAME_MS);
    const { state, effect } = nextCpuState(this.state, this.view());
    if (this.state === CPU_STATES.THROWING && state === CPU_STATES.CHOOSE_PROF) {
      this.retrieveThrown();
    }
    if (effect === CPU_EFFECTS.THROW) {
      this.throwProf();
    } else if (effect === CPU_EFFECTS.CHOOSE) {
      this.chooseAction();
    }
    if (state !== this.state) {
      if (state !== CPU_STATES.THROWING) {
        this.thrown = null;
      }
      this.setState(state);
    }
  },

  // Sorteia um PokeProf de pé, parado no suporte, e o arremessa.
  throwProf() {
    const candidates = this.rack().balls.filter((ball) =>
      !ball.components.pokeprof?.prof.isFainted()
      && !ball.hasAttribute(RETURNING_ATTRIBUTE)
      && !ball.hasAttribute(HELD_ATTRIBUTE));
    const ball = pickProf(candidates);
    if (!ball) {
      return;
    }
    const from = ball.object3D.getWorldPosition(new THREE.Vector3());
    from.y += CPU.throw.lift;
    // Campo do lado da CPU: mesmo sinal de z que o suporte dela.
    const side = Math.sign(this.el.object3D.getWorldPosition(new THREE.Vector3()).z) || -1;
    const radius = ball.components["physics-body"].data.radius;
    const target = {
      x: (Math.random() * 2 - 1) * CPU.throw.spreadX,
      y: radius,
      z: side * CPU.throw.targetZ,
    };
    const velocity = ballisticVelocity(from, target, CPU.throw.flightTime, GRAVITY);
    ball.components["physics-body"].launch(from, velocity);
    this.thrown = ball;
  },

  // A bola arremessada não soltou o PokeProf: volta para o suporte.
  retrieveThrown() {
    const ball = this.thrown;
    if (ball && !ball.components["pokemon-release"]?.creature) {
      this.rack().sendHome(ball);
    }
    this.thrown = null;
  },

  chooseAction() {
    const battle = this.battle();
    const me = this.player();
    const prof = battle.activeProf(me)?.prof;
    const choice = pickAction({
      // Só ataques com PP.
      attacks: prof ? ATTACKS.filter((move) => prof.hasPp(move)) : ATTACKS,
      powerups: POWERUPS,
      powerupChance: CPU.powerupChance,
      lastPowerupId: this.lastPowerupId,
      hpFull: prof ? prof.hp >= prof.maxHp() : true,
    });
    battle.choose(me, choice);
  },

  remove() {
    this.el.sceneEl.removeEventListener(EVENTS.GAME_RESET, this.onGameReset);
    this.el.sceneEl.removeEventListener(EVENTS.TURN_ACTION, this.onTurnAction);
  },
});
