// Teste de ponta a ponta: roda dentro da página real (injetado por run.sh).
// O Chrome headless não dispara requestAnimationFrame com --dump-dom, então
// os quadros são simulados chamando scene.tick() direto. O resultado vai
// para um <pre id="e2e"> com JSON, que o run.sh extrai.

const errors = [];
window.addEventListener("error", (e) => errors.push(String(e.message)));
const origError = console.error;
console.error = (...a) => { errors.push(a.map(String).join(" ")); origError(...a); };
let simTime = 0;
const frame = async () => { const sc = document.querySelector("a-scene"); simTime += 16; sc.tick(simTime, 16); await new Promise((r) => setTimeout(r, 0)); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const step = (t) => { let p = document.getElementById("e2e-step"); if (!p) { p = document.createElement("pre"); p.id = "e2e-step"; document.body.appendChild(p);} p.textContent += t + ";"; };
const report = (obj) => { const pre = document.createElement("pre"); pre.id = "e2e"; pre.textContent = JSON.stringify(obj); document.body.appendChild(pre); };

async function run() {
  const scene = document.querySelector("a-scene");
  step("start"); while (!scene.hasLoaded) await wait(50); step("loaded");
  for (let i = 0; i < 10; i++) await frame(); step("frames");
  const out = {};
  const balls = [...document.querySelectorAll(".grabbable")];
  out.balls = balls.map((b) => b.object3D.position.toArray().map((n) => +n.toFixed(2)));
  out.obstacles = document.querySelectorAll(".player-obstacle").length;
  const rig = document.querySelector("#camera-rig");
  out.rects = rig.components["player-collision"].rects.length;

  const head = () => scene.camera.getWorldPosition(new THREE.Vector3());
  // teclado (wasd): anda 5 cm por quadro em direção à mureta direita
  for (let i = 0; i < 200; i++) { rig.object3D.position.x += 0.05; await frame(); }
  out.walkRightHeadX = +head().x.toFixed(3);
  for (let i = 0; i < 200; i++) { rig.object3D.position.z += 0.05; await frame(); }
  out.walkCornerHead = [+head().x.toFixed(3), +head().z.toFixed(3)];
  rig.object3D.position.set(0, 0, 0); await frame(); await frame();
  // analógico via player-rig, com um passo enorme de 1 m
  rig.object3D.position.set(-6.5, 0, 0); await frame();
  rig.components["player-rig"].translate(new THREE.Vector3(-1, 0, 0));
  out.bigStepLeftX = +rig.object3D.position.x.toFixed(3);
  // voando por cima da mureta não há colisão
  rig.object3D.position.set(0, 1.5, -9.5); await frame();
  for (let i = 0; i < 40; i++) { rig.object3D.position.z -= 0.05; await frame(); }
  out.flyOverZ = +rig.object3D.position.z.toFixed(2);
  rig.object3D.position.set(0, 0, 7); await frame();

  const tc = scene.systems["tracked-controls"];
  const mode = scene.systems["input-mode"];
  tc.controllers = [
    { handedness: "left", hand: {}, profiles: ["generic-hand"] },
    { handedness: "right", hand: null, profiles: ["oculus-touch-v3"] },
  ];
  mode.refresh();
  out.modes = { ...mode.modes };
  const [leftCtrl, rightCtrl] = document.querySelectorAll("[player-controller]");
  const [leftHand] = document.querySelectorAll("[player-hand]");
  out.leftLaserVisible = leftCtrl.object3D.visible;
  out.rightLaserVisible = rightCtrl.object3D.visible;

  rig.object3D.updateMatrixWorld(true);
  const rigInv = rig.object3D.matrixWorld.clone().invert();
  const ball0 = balls[0];
  const ballWorld = ball0.object3D.getWorldPosition(new THREE.Vector3());
  leftCtrl.object3D.position.copy(ballWorld.clone().applyMatrix4(rigInv)); await frame();
  leftCtrl.emit("triggerdown");
  out.leakedTriggerGrabbed = ball0.hasAttribute("data-held");

  leftHand.emit("pinchstarted", { position: ballWorld.clone().applyMatrix4(rigInv) });
  out.pinchGrabbed = ball0.hasAttribute("data-held");
  leftHand.emit("pinchmoved", { position: ballWorld.clone().add(new THREE.Vector3(0, 0.3, 0)).applyMatrix4(rigInv) });
  await frame();
  out.pinchMovedY = +ball0.object3D.position.y.toFixed(2);
  leftHand.emit("pinchended", {});
  out.pinchReleased = !ball0.hasAttribute("data-held");

  const ball2 = balls[2];
  const b2 = ball2.object3D.getWorldPosition(new THREE.Vector3());
  rightCtrl.object3D.position.copy(b2.clone().applyMatrix4(rigInv)); await frame();
  rightCtrl.emit("triggerdown");
  out.controllerGrabbed = ball2.hasAttribute("data-held");
  tc.controllers = [{ handedness: "right", hand: {}, profiles: ["generic-hand"] }];
  mode.refresh();
  out.releasedOnModeSwitch = !ball2.hasAttribute("data-held");
  out.rightLaserVisibleAfter = rightCtrl.object3D.visible;

  tc.controllers = [{ handedness: "right", hand: null, profiles: ["oculus-touch-v3"] }];
  mode.refresh();
  for (let i = 0; i < 40; i++) await frame();
  out.beforeReset = balls.map((b) => b.object3D.position.toArray().map((n) => +n.toFixed(2)));
  rightCtrl.emit("bbuttondown"); await frame();
  out.afterReset = balls.map((b) => b.object3D.position.toArray().map((n) => +n.toFixed(2)));
  out.resetButtonGone = !document.querySelector("[reset-button], .reset-button");
  out.texts = [...document.querySelectorAll("a-text")].map((t) => t.getAttribute("value"));

  // Prévia do professor: aparece ao apontar, some ao parar de apontar.
  out.ballCount = balls.length;
  out.previews = balls.map((b) => b.getAttribute("pokemon-preview")?.name || null);
  const cursor = document.getElementById("mouse-cursor");
  const card = () => balls[0].components["pokemon-preview"].card.object3D;
  balls[0].emit("raycaster-intersected", { el: cursor }); await frame();
  out.previewShownOnHover = card().visible;
  out.previewAboveBall = +(card().position.y - balls[0].object3D.position.y).toFixed(2);
  balls[0].emit("raycaster-intersected-cleared", { el: cursor }); await frame();
  out.previewHiddenAfter = !card().visible;

  // Pouso: arremesso para frente; depois de cair a bola para logo.
  const body = balls[1].components["physics-body"];
  body.body.position.set(0, 1.5, 6); body.stop(); body.takeOff();
  body.body.velocity.set(0, 2, -6); body.body.wakeUp();
  const zAt = [];
  for (let i = 0; i < 200; i++) { await frame(); if (i === 60 || i === 199) zAt.push(+body.body.position.z.toFixed(2)); }
  out.landed = body.landed;
  out.rollAfterLandingM = +Math.abs(zAt[1] - zAt[0]).toFixed(2);

  // Carretilha: controle segura a bola e o analógico para frente afasta.
  const reelBall = balls[3];
  const rb = reelBall.components["physics-body"];
  rb.reset(); await frame();
  tc.controllers = [{ handedness: "right", hand: null, profiles: ["oculus-touch-v3"] }];
  mode.refresh();
  rig.object3D.updateMatrixWorld(true);
  const rbWorld = reelBall.object3D.getWorldPosition(new THREE.Vector3());
  rightCtrl.object3D.position.copy(rbWorld.clone().applyMatrix4(rig.object3D.matrixWorld.clone().invert())); await frame();
  rightCtrl.emit("triggerdown");
  out.reelGrabbed = reelBall.hasAttribute("data-held");
  const d0 = reelBall.object3D.position.length();
  const rigBefore = rig.object3D.position.clone();
  rightCtrl.emit("thumbstickmoved", { x: 0, y: -1 });
  for (let i = 0; i < 30; i++) await frame();
  out.reelPushedM = +(reelBall.object3D.position.length() - d0).toFixed(2);
  out.rigStillWhileReeling = rig.object3D.position.distanceTo(rigBefore) < 1e-6;
  rightCtrl.emit("thumbstickmoved", { x: 0, y: 1 });
  for (let i = 0; i < 60; i++) await frame();
  out.reelPulledToMin = +reelBall.object3D.position.length().toFixed(2);
  rightCtrl.emit("thumbstickmoved", { x: 0, y: 0 });

  // Encaixe: soltar perto do encaixe (livre) trava a bola nele.
  const slot = scene.querySelector("[ball-rack]").components["ball-rack"].slots[0];
  const snapBall = balls[1];
  rightCtrl.emit("triggerup");
  tc.controllers = [{ handedness: "left", hand: {}, profiles: ["generic-hand"] }];
  mode.refresh();
  // balls[0] ocupa o encaixe 0: tira ela de lá antes.
  balls[0].components["physics-body"].body.position.set(3, 0.1, 0); await frame();
  leftHand.emit("pinchstarted", { position: snapBall.object3D.getWorldPosition(new THREE.Vector3()).applyMatrix4(rigInv) });
  out.snapGrabbed = snapBall.hasAttribute("data-held");
  leftHand.emit("pinchmoved", { position: slot.clone().add(new THREE.Vector3(0.12, 0.1, 0.05)).applyMatrix4(rigInv) });
  await frame();
  out.slotHighlighted = scene.querySelector("[ball-rack]").components["ball-rack"].markers[0].dataset.active === "true";
  leftHand.emit("pinchended", {});
  for (let i = 0; i < 60; i++) await frame();
  out.snappedOffsetM = +snapBall.object3D.position.distanceTo(slot).toFixed(3);
  out.errors = errors;
  report(out);
}
run().catch((e) => report({ fatal: String(e.stack || e), errors }));
