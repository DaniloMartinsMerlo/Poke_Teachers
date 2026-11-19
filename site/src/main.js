// Ponto de entrada: registra sistemas e componentes no A-Frame.
//
// Camadas (das mais internas para as mais externas):
//   config/     constantes e parâmetros (sem lógica)
//   domain/     regras puras do jogo, sem A-Frame (testáveis no Node)
//   systems/    estado global da cena (física, modo de entrada, batalha)
//   components/ adaptadores A-Frame: física, interação, locomoção,
//               jogo, jogador e cenário
//
// O A-Frame espera o documento terminar de carregar antes de montar a
// cena, então registrar aqui (script do tipo "module") é seguro.

import "./systems/physics.js";
import "./systems/input-mode.js";
import "./systems/battle.js";

import "./components/physics/physics-body.js";

import "./components/interaction/hand-grabber.js";
import "./components/interaction/controller-grabber.js";
import "./components/interaction/cursor-grabber.js";
import "./components/interaction/controller-input-gate.js";
import "./components/interaction/pokemon-preview.js";
import "./components/interaction/pokemon-release.js";

import "./components/locomotion/player-rig.js";
import "./components/locomotion/player-collision.js";
import "./components/locomotion/thumbstick-movement.js";
import "./components/locomotion/thumbstick-turn.js";
import "./components/locomotion/vertical-controls.js";

import "./components/game/controller-reset.js";
import "./components/game/keyboard-reset.js";
import "./components/game/battle-hud.js";
import "./components/game/pokeprof.js";
import "./components/game/cpu-player.js";

import "./components/player/player-hand.js";
import "./components/player/player-controller.js";

import "./components/scene/arena-field.js";
import "./components/scene/arena-walls.js";
import "./components/scene/arena-bleachers.js";
import "./components/scene/arena-scoreboard.js";
import "./components/scene/arena-light-towers.js";
import "./components/scene/ball-rack.js";
import "./components/scene/generic-pokemon.js";
