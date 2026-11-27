// The run: the turkey, the farmer behind it, and everything the farm throws
// in the way. No drawing lives here, only data — the renderer reads this state
// and paints it. The turkey stays near z = 0 and the world scrolls toward it:
// obstacles are spawned far ahead (negative z) and move closer as the turkey
// runs, so distance is just how far the world has scrolled.
//
// Events the loop listens for (bit flags): corn eaten, a hit taken, the
// farmer catching the turkey, the forest gate reached.

import { FARMER, LANES, LANE_COUNT, OBSTACLE, RUN, STEP, TURKEY } from './config.js';
import { pick, range, rangeInt } from './random.js';

export const EVENT_CORN = 1;
export const EVENT_HIT = 2;
export const EVENT_CAUGHT = 4;
export const EVENT_ESCAPED = 8;
export const EVENT_STUMBLE = 16;
export const EVENT_KNIFE_WARN = 32;

/** An obstacle on the track: kind, lane, z (negative ahead), and per-kind state. */
export function makeObstacle(kind, lane, z, random) {
  return {
    kind,
    lane,
    z,
    // Knives swing: pivot phase and swing angle, so the blade sweeps the lane.
    phase: random ? random() * Math.PI * 2 : 0,
    swing: 0,
    warned: false,
    hit: false,
    passed: false,
  };
}

/** A corn cob pickup: lane, z, and a bob phase for the render. */
export function makeCorn(lane, z, random) {
  return { lane, z, phase: random ? random() * Math.PI * 2 : 0, eaten: false };
}

/** A tree beside the track: side, z, size and autumn colour, placed from the seed. */
export function makeTree(side, z, random) {
  return {
    side,
    z,
    size: range(random, 0.8, 1.6),
    leaf: pick(random, [0, 1, 2]),
    sway: random() * Math.PI * 2,
  };
}

/** A fence post run or a hay bale at the track's edge, for scenery. */
export function makeSideProp(kind, side, z, random) {
  return { kind, side, z, offset: range(random, 0, 0.8) };
}

/** A falling autumn leaf: position drifting down and sideways, spun by time. */
export function makeLeaf(random) {
  return {
    x: range(random, -14, 14),
    y: range(random, 2, 12),
    z: range(random, -70, 8),
    fall: range(random, 0.5, 1.4),
    drift: range(random, 0.4, 1.2),
    spin: range(random, 1, 4),
    phase: random() * Math.PI * 2,
    colour: pick(random, [0, 1, 2]),
  };
}

/**
 * Create the run state for one attempt. `random` is the seeded generator, so
 * the same seed builds the same farm; `onEvent` is unused here — the loop
 * reads the returned event flags from stepRun instead.
 */
export function createWorld(random) {
  const state = {
    screen: 'title',
    distance: 0,
    speed: TURKEY.startSpeed,
    score: 0,
    lives: RUN.startLives,
    lane: 1,
    laneX: LANES[1],
    laneFrom: LANES[1],
    laneTo: LANES[1],
    laneT: 1,
    y: 0, // height above the track while jumping
    vy: 0,
    jumping: false,
    farmerGap: FARMER.startGap,
    invulnerable: 0,
    time: 0,
    obstacles: [],
    corn: [],
    trees: [],
    sideProps: [],
    leaves: [],
    nextSpawnZ: -40,
    spawnIn: 1.2, // seconds until the next obstacle row
    knifeWarnedAt: -99,
    caught: false,
    escaped: false,
    stumbleFlash: 0,
    cornEaten: 0,
    hitsTaken: 0,
  };

  // The farmyard the turkey starts in: trees lining the track, fences and hay
  // bales at the edges, and leaves already falling over all of it.
  for (let z = -160; z < 20; z += rangeInt(random, 9, 16)) {
    state.trees.push(makeTree(random() < 0.5 ? -1 : 1, z, random));
  }
  for (let z = -150; z < 20; z += 14) {
    state.sideProps.push(makeSideProp('fence', -1, z, random));
    state.sideProps.push(makeSideProp(random() < 0.5 ? 'hay' : 'fence', 1, z + 7, random));
  }
  for (let i = 0; i < 90; i += 1) state.leaves.push(makeLeaf(random));

  // A few corn cobs near the gate, so the first seconds already reward running.
  state.corn.push(makeCorn(1, -18, random));
  state.corn.push(makeCorn(1, -24, random));
  state.corn.push(makeCorn(0, -30, random));

  /** Reset the run for a fresh attempt, keeping the same seeded farm layout. */
  function reset() {
    state.distance = 0;
    state.speed = TURKEY.startSpeed;
    state.score = 0;
    state.lives = RUN.startLives;
    state.lane = 1;
    state.laneX = LANES[1];
    state.laneFrom = LANES[1];
    state.laneTo = LANES[1];
    state.laneT = 1;
    state.y = 0;
    state.vy = 0;
    state.jumping = false;
    state.farmerGap = FARMER.startGap;
    state.invulnerable = 0;
    state.time = 0;
    state.obstacles.length = 0;
    state.corn.length = 0;
    state.nextSpawnZ = -40;
    state.spawnIn = 1.2;
    state.knifeWarnedAt = -99;
    state.caught = false;
    state.escaped = false;
    state.stumbleFlash = 0;
    state.cornEaten = 0;
    state.hitsTaken = 0;
    state.corn.push(makeCorn(1, -18, random));
    state.corn.push(makeCorn(1, -24, random));
    state.corn.push(makeCorn(0, -30, random));
  }

  /** Choose the next obstacle row: one or two hazards, never all three lanes blocked. */
  function spawnRow() {
    const d = state.distance;
    const roll = random();
    const rows = [];
    // The oven only appears once the turkey is past the farmhouse porch.
    const kinds = [OBSTACLE.FENCE, OBSTACLE.HAY, OBSTACLE.PUMPKIN];
    if (d > 120) kinds.push(OBSTACLE.KNIFE);
    if (d > 60) kinds.push(OBSTACLE.OVEN);
    if (roll < 0.42) {
      rows.push([pick(random, kinds), rangeInt(random, 0, LANE_COUNT - 1)]);
    } else if (roll < 0.78) {
      const laneA = rangeInt(random, 0, LANE_COUNT - 1);
      let laneB = rangeInt(random, 0, LANE_COUNT - 1);
      if (laneB === laneA) laneB = (laneA + 1) % LANE_COUNT;
      rows.push([pick(random, kinds), laneA]);
      rows.push([pick(random, kinds), laneB]);
    } else {
      // A corn line down the free lane, with one hazard beside it.
      const freeLane = rangeInt(random, 0, LANE_COUNT - 1);
      const hazardLane = (freeLane + 1 + rangeInt(random, 0, 1)) % LANE_COUNT;
      rows.push([pick(random, kinds), hazardLane]);
      for (let i = 0; i < 3; i += 1) {
        state.corn.push(makeCorn(freeLane, state.nextSpawnZ - i * 4, random));
      }
    }
    for (const [kind, lane] of rows) {
      state.obstacles.push(makeObstacle(kind, lane, state.nextSpawnZ, random));
    }
    // Corn sometimes trails a lone hazard too.
    if (random() < 0.35) {
      const lane = rangeInt(random, 0, LANE_COUNT - 1);
      for (let i = 0; i < 3; i += 1) state.corn.push(makeCorn(lane, state.nextSpawnZ - 6 - i * 4, random));
    }
    state.nextSpawnZ -= range(random, 22, 34) * (1 - Math.min(0.35, d / 3000));
  }

  /**
   * Advance the run one fixed step. `steer` is -1/0/1 (lane change), `jump`
   * is true on the frame Space is pressed. Returns event flags.
   */
  function stepRun(steer, jump) {
    let events = 0;
    state.time += STEP;
    const dt = STEP;

    // Speed grows with distance, so the farm gets harder the further the run goes.
    state.speed = Math.min(
      TURKEY.maxSpeed,
      TURKEY.startSpeed + state.distance * TURKEY.speedGain,
    );
    const advance = state.speed * dt;
    state.distance += advance;
    state.score += advance * RUN.metreScore;

    // Lane switching slides the turkey across, it never teleports.
    if (steer !== 0) {
      const next = Math.max(0, Math.min(LANE_COUNT - 1, state.lane + steer));
      if (next !== state.lane) {
        state.lane = next;
        state.laneFrom = state.laneX;
        state.laneTo = LANES[next];
        state.laneT = 0;
      }
    }
    if (state.laneT < 1) {
      state.laneT = Math.min(1, state.laneT + dt / TURKEY.laneSwitchTime);
      const t = state.laneT;
      const eased = t * t * (3 - 2 * t);
      state.laneX = state.laneFrom + (state.laneTo - state.laneFrom) * eased;
    }

    // Jump physics: up fast, down under gravity, land back on the track.
    if (jump && !state.jumping) {
      state.jumping = true;
      state.vy = TURKEY.jumpVelocity;
    }
    if (state.jumping) {
      state.vy -= TURKEY.gravity * dt;
      state.y += state.vy * dt;
      if (state.y <= 0) {
        state.y = 0;
        state.vy = 0;
        state.jumping = false;
      }
    }

    // The farmer gains on every mistake and loses ground on every clean second.
    if (state.invulnerable > 0) state.invulnerable -= dt;
    if (state.stumbleFlash > 0) state.stumbleFlash -= dt;
    state.farmerGap = Math.min(
      FARMER.maxGap,
      state.farmerGap + FARMER.recoverPerSecond * dt,
    );

    // Spawn obstacle rows ahead of the turkey.
    state.spawnIn -= dt;
    if (state.spawnIn <= 0) {
      spawnRow();
      // Rows come faster as the run speeds up.
      state.spawnIn = Math.max(0.75, 1.5 - state.distance / 1200);
    }

    // Scroll the world toward the turkey: obstacles, corn, trees and props.
    for (const ob of state.obstacles) ob.z += advance;
    for (const cob of state.corn) cob.z += advance;
    for (const tree of state.trees) {
      tree.z += advance;
      if (tree.z > 14) {
        tree.z -= 175;
        tree.size = range(random, 0.8, 1.6);
        tree.leaf = pick(random, [0, 1, 2]);
        tree.side = random() < 0.5 ? -1 : 1;
      }
    }
    for (const prop of state.sideProps) {
      prop.z += advance;
      if (prop.z > 14) prop.z -= 164;
    }
    for (const leaf of state.leaves) {
      leaf.y -= leaf.fall * dt;
      leaf.z += advance * 0.55 + Math.sin(state.time + leaf.phase) * leaf.drift * dt;
      leaf.x += Math.sin(state.time * 0.8 + leaf.phase) * leaf.drift * dt;
      if (leaf.y < 0.1) {
        leaf.y = range(random, 8, 13);
        leaf.z = range(random, -70, -10);
        leaf.x = range(random, -14, 14);
      }
    }

    // Knives swing once they are close enough to see; warn just before.
    for (const ob of state.obstacles) {
      if (ob.kind !== OBSTACLE.KNIFE) continue;
      if (ob.z > -26 && !ob.warned) {
        ob.warned = true;
        state.knifeWarnedAt = state.time;
        events |= EVENT_KNIFE_WARN;
      }
      if (ob.warned) ob.swing = Math.sin((state.time - state.knifeWarnedAt) * 4.2) * 0.9;
    }

    // Collisions: an obstacle in the turkey's lane, at the turkey's z, while
    // the turkey is low enough to be hit by it.
    for (const ob of state.obstacles) {
      if (ob.hit || ob.passed) continue;
      if (ob.z > 1.2) {
        ob.passed = true;
        continue;
      }
      if (ob.z < -1.2) continue;
      if (ob.lane !== state.lane) continue;
      const lowEnough = state.y < 0.9;
      const knifeLow = ob.kind === OBSTACLE.KNIFE && Math.abs(ob.swing) > 0.55 && state.y < 1.1;
      const jumpable = ob.kind === OBSTACLE.FENCE || ob.kind === OBSTACLE.HAY;
      if (ob.kind === OBSTACLE.KNIFE) {
        if (knifeLow && state.invulnerable <= 0) {
          ob.hit = true;
          events |= EVENT_HIT;
          takeHit();
        }
      } else if (lowEnough && !jumpable) {
        ob.hit = true;
        events |= EVENT_HIT;
        takeHit();
      } else if (lowEnough && jumpable && state.y < 0.55) {
        // Tripped on a jumpable obstacle while barely off the ground: a
        // stumble, not a full hit — the farmer closes in, the turkey keeps going.
        ob.hit = true;
        events |= EVENT_STUMBLE;
        state.farmerGap = Math.max(0.8, state.farmerGap - FARMER.gainOnStumble);
        state.stumbleFlash = 0.5;
      }
    }

    // Corn: eaten when the turkey runs through its lane at its z.
    for (const cob of state.corn) {
      if (cob.eaten) continue;
      if (cob.z > 1.2 || cob.z < -1.2) continue;
      if (cob.lane !== state.lane) continue;
      cob.eaten = true;
      state.cornEaten += 1;
      state.score += RUN.cornScore;
      events |= EVENT_CORN;
    }

    // Prune what has scrolled past.
    state.obstacles = state.obstacles.filter((ob) => ob.z < 16 && !ob.passed);
    state.corn = state.corn.filter((cob) => cob.z < 16 && !cob.eaten);

    // The farmer catches the turkey when the gap closes to nothing.
    if (state.farmerGap <= FARMER.catchGap) {
      state.caught = true;
      events |= EVENT_CAUGHT;
    }

    // The forest gate: 1000 m and the turkey is free.
    if (state.distance >= RUN.winDistance) {
      state.escaped = true;
      events |= EVENT_ESCAPED;
    }

    return events;

    function takeHit() {
      state.lives -= 1;
      state.hitsTaken += 1;
      state.farmerGap = Math.max(0.8, state.farmerGap - FARMER.gainOnHit);
      state.invulnerable = RUN.invulnerableSeconds;
      state.stumbleFlash = 0.6;
      if (state.lives <= 0) {
        state.farmerGap = FARMER.catchGap;
        state.caught = true;
        events |= EVENT_CAUGHT;
      }
    }
  }

  return { state, reset, stepRun };
}
