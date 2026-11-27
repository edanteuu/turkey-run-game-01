// The screenshot scenes behind ?shot=start|play|chase|end. Each one poses a
// real run state — the same turkey, farmer, world and renderer the game uses
// — and the loop paints it twice, so the frame is what a real game looks like
// and the same seed always gives the same frame. No randomness is read here:
// every obstacle, corn cob and number is placed by hand.

import { LANES, OBSTACLE } from './config.js';
import { makeCorn, makeObstacle } from './world.js';
import { SCREEN_CAUGHT, SCREEN_ESCAPED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

/** Fill a posed obstacle row into the state, replacing whatever was there. */
function poseObstacles(state, rows) {
  state.obstacles.length = 0;
  for (const [kind, lane, z, swing] of rows) {
    const ob = makeObstacle(kind, lane, z, null);
    ob.swing = swing || 0;
    ob.warned = kind === OBSTACLE.KNIFE;
    state.obstacles.push(ob);
  }
}

/** Fill a posed corn line into the state. */
function poseCorn(state, cobs) {
  state.corn.length = 0;
  for (const [lane, z] of cobs) state.corn.push(makeCorn(lane, z, null));
}

/**
 * Stage `name` on the live world and return { screen, score, elapsed, best }.
 * start: the title over the farmyard, turkey at the gate, farmer behind.
 * play: mid-run at 420 m, oven and knife ahead, corn in the free lane.
 * chase: a close call at 780 m — one life left, the farmer a step behind,
 *   the turkey mid-jump over the swinging knife.
 * end: caught at 640 m — the farmer stands over the turkey, no lives left.
 */
export function stageShot(name, world) {
  const s = world.state;
  world.reset();

  if (name === 'play') {
    s.distance = 420;
    s.speed = 11.5;
    s.score = 5120;
    s.lives = 3;
    s.cornEaten = 12;
    s.farmerGap = 6.8;
    s.time = 42;
    poseObstacles(s, [
      [OBSTACLE.OVEN, 2, -18, 0],
      [OBSTACLE.KNIFE, 0, -28, 0.8],
      [OBSTACLE.FENCE, 1, -40, 0],
      [OBSTACLE.HAY, 2, -52, 0],
      [OBSTACLE.PUMPKIN, 1, -64, 0],
      [OBSTACLE.FENCE, 0, -76, 0],
    ]);
    poseCorn(s, [[0, -10], [0, -14], [0, -18], [1, -46], [1, -50]]);
    return { screen: SCREEN_PLAY, score: 5120, elapsed: 42, best: 1240 };
  }

  if (name === 'chase') {
    s.distance = 780;
    s.speed = 15.2;
    s.score = 9100;
    s.lives = 1;
    s.cornEaten = 21;
    s.farmerGap = 1.3;
    s.time = 58;
    s.lane = 1;
    s.laneX = LANES[1];
    s.laneFrom = LANES[1];
    s.laneTo = LANES[1];
    s.y = 1.15;
    s.vy = 2.5;
    s.jumping = true;
    poseObstacles(s, [
      [OBSTACLE.KNIFE, 1, -6, 0.85],
      [OBSTACLE.OVEN, 0, -14, 0],
      [OBSTACLE.FENCE, 2, -22, 0],
      [OBSTACLE.PUMPKIN, 0, -34, 0],
      [OBSTACLE.HAY, 2, -44, 0],
    ]);
    poseCorn(s, [[2, -10], [2, -14], [2, -18]]);
    return { screen: SCREEN_PLAY, score: 9100, elapsed: 58, best: 1240 };
  }

  if (name === 'end') {
    s.distance = 640;
    s.speed = 13.1;
    s.score = 7400;
    s.lives = 0;
    s.cornEaten = 17;
    s.farmerGap = 1.6;
    s.time = 51;
    s.caught = true;
    poseObstacles(s, [
      [OBSTACLE.FENCE, 0, -30, 0],
      [OBSTACLE.HAY, 2, -44, 0],
    ]);
    poseCorn(s, [[1, -20], [1, -24]]);
    return { screen: SCREEN_CAUGHT, score: 7400, elapsed: 51, best: 1240 };
  }

  if (name === 'escaped') {
    s.distance = 1000;
    s.speed = 16.4;
    s.score = 12480;
    s.lives = 2;
    s.cornEaten = 26;
    s.farmerGap = 11;
    s.time = 74;
    s.escaped = true;
    poseCorn(s, [[0, -12], [1, -18], [2, -24]]);
    return { screen: SCREEN_ESCAPED, score: 12480, elapsed: 74, best: 1240 };
  }

  // start (and anything unknown): the title over the farmyard, the turkey at
  // the gate with the farmhouse, barn and porch oven behind it.
  s.distance = 0;
  s.farmerGap = 5.5;
  s.time = 2;
  poseObstacles(s, [
    [OBSTACLE.FENCE, 0, -26, 0],
    [OBSTACLE.OVEN, 2, -38, 0],
    [OBSTACLE.KNIFE, 1, -52, 0.4],
  ]);
  poseCorn(s, [[1, -14], [1, -18], [1, -22]]);
  return { screen: SCREEN_TITLE, score: 0, elapsed: 0, best: 1240 };
}
