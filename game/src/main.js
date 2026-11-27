// Boot and the one loop: input is read every frame, the world advances in
// fixed 1/60 s steps (several in a slow frame, none in a fast one), and the
// renderer paints what is there. The game moves between screens: title, play,
// paused, caught and escaped. Scores live in memory only — no storage, no
// cookies — so every visit starts fresh.
//
// The 3D scene paints on the #game canvas (WebGL, Three.js); the HUD and the
// menu overlays paint on the #hud canvas (2D) stacked above it.
//
// ?seed=N fixes the farm. ?shot=start|play|chase|end (with &seed=N) stages
// that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot. ?selftest=1 runs the game logic
// headlessly (state transitions, collision, restart, escape) and writes
// PASS or FAIL into document.title.

import { FONT, PALETTE, RUN, SHOT_TIME, STEP, VIEW } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_CAUGHT, EVENT_CORN, EVENT_ESCAPED, EVENT_HIT, EVENT_KNIFE_WARN, EVENT_STUMBLE } from './world.js';
import {
  ACTION_CONFIRM, ACTION_JUMP, ACTION_MUTE, ACTION_PAUSE, ACTION_RESTART,
  createInput,
} from './input.js';
import { createAudio } from './audio.js';
import {
  createRenderer, SCREEN_CAUGHT, SCREEN_ESCAPED, SCREEN_PAUSED, SCREEN_PLAY,
  SCREEN_TITLE,
} from './render.js';
import { drawEndOverlay, drawHud, drawPausedOverlay, drawTitleOverlay } from './hud.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const selftest = params.get('selftest') === '1';
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 1;

const canvas = document.getElementById('game');
const hudCanvas = document.getElementById('hud');
const status = document.getElementById('status');
const hudCtx = hudCanvas.getContext('2d');
const world = createWorld(createRandom(seed));
const audio = createAudio();
const renderer3d = createRenderer(canvas, world);
let best = 0;

function fitCanvas() {
  const scale = Math.min(window.innerWidth / VIEW.width, window.innerHeight / VIEW.height);
  for (const c of [canvas, hudCanvas]) {
    c.width = VIEW.width;
    c.height = VIEW.height;
    c.style.width = `${Math.floor(VIEW.width * scale)}px`;
    c.style.height = `${Math.floor(VIEW.height * scale)}px`;
  }
}
window.addEventListener('resize', fitCanvas);
fitCanvas();

function announce(message) {
  status.textContent = message;
}

/** Buttons the current screen offers; { x, y, w, h, label }. */
let buttons = [];

/** A short-lived message line over the HUD, with its expiry (ms). */
let message = '';
let messageUntil = 0;

function showMessage(text, ms) {
  message = text;
  messageUntil = performance.now() + ms;
}

function runShot(name) {
  const scene = stageShot(name, world);
  const s = world.state;
  // Paint twice, synchronously: a headless screenshot must not depend on the
  // compositor scheduling a frame, so the shot is settled before we say so.
  // ?nohud=1 paints the 3D scene alone, for checking a pose.
  const nohud = params.get('nohud') === '1';
  function paint() {
    buttons = [];
    hudCtx.clearRect(0, 0, VIEW.width, VIEW.height);
    renderer3d.renderFrame(s, SHOT_TIME, scene.screen);
    if (nohud) return;
    const now = SHOT_TIME * 1000;
    if (scene.screen === SCREEN_TITLE) {
      drawTitleOverlay(hudCtx, buttons, scene.best);
    } else if (scene.screen === SCREEN_CAUGHT) {
      drawHud(hudCtx, s, false, '', 0, now);
      drawEndOverlay(hudCtx, buttons, 'CAUGHT!', [
        'The farmer finally got his hands on you at 640 m.',
        'Score 7400   ·   Corn 17   ·   Best this visit 7400',
        'Thanksgiving dinner is served. Press R to run again.',
      ], PALETTE.hudRed);
    } else if (scene.screen === SCREEN_ESCAPED) {
      drawHud(hudCtx, s, false, '', 0, now);
      drawEndOverlay(hudCtx, buttons, 'ESCAPED!', [
        'You made it through the forest gate — free at last!',
        'Score 12480   ·   Corn 26   ·   Best this visit 12480',
        'The farmer is still back at the farmhouse. Press R to run again.',
      ], PALETTE.hudGreen);
    } else {
      drawHud(hudCtx, s, false, '', 0, now);
    }
  }
  paint();
  paint();
  window.__shotReady = true;
}

/**
 * The headless self-test: drive the world through its real transitions and
 * report PASS or FAIL in document.title, so a screenshot tool can read it
 * with --dump-dom. No rendering is needed; the logic is the game.
 */
function runSelfTest() {
  const results = [];
  function check(name, ok) {
    results.push(`${name}:${ok ? 'ok' : 'FAIL'}`);
  }
  try {
    const w = createWorld(createRandom(7));
    const s = w.state;
    // Title -> play: a fresh reset starts at the gate with three lives.
    w.reset();
    check('reset-lives', s.lives === RUN.startLives);
    check('reset-distance', s.distance === 0);
    check('reset-farmer-gap', s.farmerGap > 3);
    // Lane change: steering left moves the turkey to lane 0.
    w.stepRun(-1, false);
    for (let i = 0; i < 30; i += 1) w.stepRun(0, false);
    check('lane-change', s.lane === 0);
    // Jump: Space lifts the turkey off the track and it lands again.
    w.stepRun(0, true);
    w.stepRun(0, false);
    w.stepRun(0, false);
    check('jump-rises', s.y > 0.3 && s.jumping);
    for (let i = 0; i < 60; i += 1) w.stepRun(0, false);
    check('jump-lands', s.y === 0 && !s.jumping);
    // Collision: a pumpkin in the turkey's lane at the turkey's z costs a life.
    // (A fence on the ground is only a stumble — the turkey can jump it.)
    const livesBefore = s.lives;
    const gapBefore = s.farmerGap;
    s.obstacles.push({ kind: 'pumpkin', lane: s.lane, z: 0, phase: 0, swing: 0, warned: false, hit: false, passed: false });
    const events = w.stepRun(0, false);
    check('hit-event', (events & EVENT_HIT) !== 0);
    check('hit-costs-life', s.lives === livesBefore - 1);
    check('hit-farmer-closes', s.farmerGap < gapBefore);
    // A stumble: a fence in the lane while the turkey is on the ground costs
    // no life, but the farmer closes in.
    const gapBeforeStumble = s.farmerGap;
    s.invulnerable = 0;
    s.obstacles.push({ kind: 'fence', lane: s.lane, z: 0, phase: 0, swing: 0, warned: false, hit: false, passed: false });
    const eventsStumble = w.stepRun(0, false);
    check('stumble-event', (eventsStumble & EVENT_STUMBLE) !== 0);
    check('stumble-no-life-lost', s.lives === livesBefore - 1);
    check('stumble-farmer-closes', s.farmerGap < gapBeforeStumble);
    // A jump over a fence does not cost a life.
    w.reset();
    s.y = 1.0;
    s.jumping = true;
    s.vy = 3;
    s.obstacles.push({ kind: 'fence', lane: s.lane, z: 0, phase: 0, swing: 0, warned: false, hit: false, passed: false });
    const events2 = w.stepRun(0, false);
    check('jump-clears-fence', (events2 & EVENT_HIT) === 0 && s.lives === RUN.startLives);
    // Corn: a cob in the turkey's lane at the turkey's z is eaten for points.
    const scoreBefore = s.score;
    s.corn.push({ lane: s.lane, z: 0, phase: 0, eaten: false });
    const events3 = w.stepRun(0, false);
    check('corn-event', (events3 & EVENT_CORN) !== 0);
    check('corn-scores', s.score > scoreBefore + RUN.cornScore - 1);
    // Three hits end the run: caught.
    w.reset();
    for (let n = 0; n < 3; n += 1) {
      s.invulnerable = 0;
      s.obstacles.push({ kind: 'pumpkin', lane: s.lane, z: 0, phase: 0, swing: 0, warned: false, hit: false, passed: false });
      w.stepRun(0, false);
    }
    check('three-hits-caught', s.caught && s.lives === 0);
    // Escape: running 1000 m reaches the forest gate.
    w.reset();
    s.distance = RUN.winDistance - 0.05;
    const events4 = w.stepRun(0, false);
    check('escape-event', (events4 & EVENT_ESCAPED) !== 0 && s.escaped);
    // Restart after the end restores a fresh run.
    w.reset();
    check('restart-fresh', s.lives === RUN.startLives && s.distance === 0 && !s.caught && !s.escaped);
    // Knife warning: a knife close ahead warns before it swings.
    w.reset();
    s.obstacles.push({ kind: 'knife', lane: s.lane, z: -20, phase: 0, swing: 0, warned: false, hit: false, passed: false });
    const events5 = w.stepRun(0, false);
    check('knife-warns', (events5 & EVENT_KNIFE_WARN) !== 0);
  } catch (err) {
    results.push(`exception:${err && err.message ? err.message : err}`);
  }
  const failed = results.some((r) => r.endsWith(':FAIL') || r.startsWith('exception:'));
  const text = failed ? `SELFTEST FAIL ${results.join(' ')}` : `SELFTEST PASS ${results.join(' ')}`;
  document.title = text;
  document.body.setAttribute('data-selftest', failed ? 'FAIL' : 'PASS');
  window.__selftest = text;
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let elapsed = 0;
  let accumulator = 0;
  let last = performance.now();
  let time = 0;
  let endTitle = '';
  let endLines = [];
  let endAccent = '#ffffff';
  let clickSteer = 0;
  let shouted = false;
  // A jump pressed between frames, consumed by the next fixed step. It is
  // only armed while already playing, so a menu Space never also jumps.
  let pendingJump = false;

  function startRun() {
    world.reset();
    elapsed = 0;
    accumulator = 0;
    clickSteer = 0;
    shouted = false;
    message = '';
    screen = SCREEN_PLAY;
    audio.ensure();
    audio.gobble();
    announce('Run! Dodge the fences and the oven, mind the knife, reach the forest at 1000 metres.');
  }

  function showTitle() {
    world.reset();
    screen = SCREEN_TITLE;
    announce('The Great Turkey Breakout. Press Enter or click Start the Run.');
  }

  function finishRun(title, lines, accent) {
    endTitle = title;
    endLines = lines;
    endAccent = accent;
    const score = Math.floor(world.state.score);
    if (score > best) best = score;
    screen = title === 'ESCAPED!' ? SCREEN_ESCAPED : SCREEN_CAUGHT;
    announce(`${title} Score ${score}. Best ${best}.`);
  }

  function handleActions(actions) {
    const click = input.takeClick();
    if (actions & ACTION_MUTE) {
      const muted = audio.toggleMute();
      announce(muted ? 'Sound off.' : 'Sound on.');
    }
    if (click) {
      audio.ensure();
      let hitButton = false;
      for (const b of buttons) {
        if (click.x >= b.x && click.x <= b.x + b.w && click.y >= b.y && click.y <= b.y + b.h) {
          hitButton = true;
          audio.click();
          if (screen === SCREEN_TITLE) startRun();
          else if (screen === SCREEN_PAUSED) screen = SCREEN_PLAY;
          else if (screen === SCREEN_CAUGHT || screen === SCREEN_ESCAPED) {
            if (b.label.includes('RUN AGAIN')) startRun();
            else showTitle();
          }
          break;
        }
      }
      // A click on the track during play steers the turkey to that lane.
      if (!hitButton && screen === SCREEN_PLAY && click.y > 200) {
        const lane = click.x < VIEW.width / 3 ? 0 : click.x < (VIEW.width * 2) / 3 ? 1 : 2;
        if (lane !== world.state.lane) clickSteer = lane > world.state.lane ? 1 : -1;
      }
    }
    if (screen === SCREEN_TITLE) {
      if (actions & (ACTION_CONFIRM | ACTION_JUMP)) startRun();
      return;
    }
    if (screen === SCREEN_PLAY) {
      if (actions & ACTION_PAUSE) {
        screen = SCREEN_PAUSED;
        announce('Paused.');
      } else if (actions & ACTION_RESTART) startRun();
      return;
    }
    if (screen === SCREEN_PAUSED) {
      if (actions & (ACTION_PAUSE | ACTION_CONFIRM | ACTION_JUMP)) screen = SCREEN_PLAY;
      else if (actions & ACTION_RESTART) startRun();
      return;
    }
    if (screen === SCREEN_CAUGHT || screen === SCREEN_ESCAPED) {
      if (actions & ACTION_RESTART) startRun();
      else if (actions & ACTION_CONFIRM) showTitle();
    }
  }

  function step() {
    if (screen === SCREEN_TITLE) {
      // The farmyard idles behind the title: leaves fall, the turkey looks around.
      world.state.time += STEP;
      for (const leaf of world.state.leaves) {
        leaf.y -= leaf.fall * STEP;
        leaf.z += Math.sin(world.state.time + leaf.phase) * leaf.drift * STEP;
        if (leaf.y < 0.1) {
          leaf.y = 8 + (leaf.phase % 5);
          leaf.z = -60 + (leaf.phase % 50);
        }
      }
      return;
    }
    if (screen !== SCREEN_PLAY) return;
    elapsed += STEP;
    time += STEP;
    const steer = input.steer() || clickSteer;
    clickSteer = 0;
    const jump = pendingJump;
    pendingJump = false;
    const events = world.stepRun(steer, jump);
    if (jump) audio.flap();
    audio.update(world.state.speed, true);
    if (events & EVENT_CORN) audio.cornChime();
    if (events & EVENT_KNIFE_WARN) showMessage('⚠ THE CARVING KNIFE! CHANGE LANE!', 900);
    if (events & EVENT_STUMBLE) {
      showMessage('Tripped! The farmer is closer!', 900);
      audio.hit(false);
    }
    if (events & EVENT_HIT) {
      const knife = world.state.obstacles.some((ob) => ob.hit && ob.kind === 'knife');
      audio.hit(knife);
      showMessage(knife ? 'The knife caught you! A life lost!' : 'Ouch! A life lost — the farmer is closer!', 1200);
    }
    if (world.state.farmerGap < 3.2 && !shouted) {
      shouted = true;
      audio.shout();
    } else if (world.state.farmerGap > 5) {
      shouted = false;
    }
    if (events & EVENT_CAUGHT) {
      audio.caught();
      finishRun('CAUGHT!', [
        `The farmer finally got his hands on you at ${Math.floor(world.state.distance)} m.`,
        `Score ${Math.floor(world.state.score)}   ·   Corn ${world.state.cornEaten}   ·   Best this visit ${Math.max(best, Math.floor(world.state.score))}`,
        'Thanksgiving dinner is served. Press R to run again.',
      ], PALETTE.hudRed);
      return;
    }
    if (events & EVENT_ESCAPED) {
      audio.escaped();
      finishRun('ESCAPED!', [
        'You made it through the forest gate — free at last!',
        `Score ${Math.floor(world.state.score)}   ·   Corn ${world.state.cornEaten}   ·   Best this visit ${Math.max(best, Math.floor(world.state.score))}`,
        'The farmer is still back at the farmhouse. Press R to run again.',
      ], PALETTE.hudGreen);
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    const frameDt = Math.min((now - last) / 1000, MAX_FRAME);
    accumulator += frameDt;
    last = now;
    // Read the one-shot presses once per frame: handleActions consumes the
    // menu keys, and a jump armed here is spent by the next fixed step.
    const actions = input.takeActions();
    const wasPlaying = screen === SCREEN_PLAY;
    handleActions(actions);
    if (wasPlaying && (actions & ACTION_JUMP)) pendingJump = true;
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    if (screen !== SCREEN_PLAY) time += 1 / 120;
    buttons = [];
    hudCtx.clearRect(0, 0, VIEW.width, VIEW.height);
    renderer3d.renderFrame(world.state, time, screen);
    const nowMs = performance.now();
    if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED) {
      drawHud(hudCtx, world.state, audio.isMuted(), message, messageUntil, nowMs);
    }
    if (screen === SCREEN_TITLE) {
      drawTitleOverlay(hudCtx, buttons, best);
    }
    if (screen === SCREEN_PAUSED) {
      drawPausedOverlay(hudCtx, buttons);
    }
    if (screen === SCREEN_CAUGHT || screen === SCREEN_ESCAPED) {
      drawHud(hudCtx, world.state, audio.isMuted(), '', 0, nowMs);
      drawEndOverlay(hudCtx, buttons, endTitle, endLines, endAccent);
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  // Debug handle for automated smoke tests (not part of the game UI).
  window.__turkey = {
    world,
    screen: () => screen,
    score: () => Math.floor(world.state.score),
    distance: () => Math.floor(world.state.distance),
    lives: () => world.state.lives,
    startRun,
  };

  announce('The Great Turkey Breakout. Press Enter or click Start the Run.');
  requestAnimationFrame(frame);
}

if (selftest) {
  runSelfTest();
  // Still paint a frame behind the result, so the page is a real game page.
  renderer3d.renderFrame(world.state, SHOT_TIME, SCREEN_TITLE);
} else if (shot) {
  runShot(shot);
} else {
  runGame();
}
