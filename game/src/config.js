// The Great Turkey Breakout — every tuning number and colour in one place.
// The playfield is a fixed 1280x720 logical canvas; the renderer scales it to
// the window, so no rule below depends on the screen size. Distances are
// metres, speeds are metres per second. The turkey runs down a farm track
// toward the forest; the farmer chases from behind.

export const VIEW = { width: 1280, height: 720, focal: 620 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display rate. */
export const STEP = 1 / 60;

/** The three lanes the turkey dodges between (metres left/right of the track centre). */
export const LANES = [-2.4, 0, 2.4];
export const LANE_COUNT = 3;

export const TURKEY = {
  startSpeed: 8, // m/s at the farmhouse gate
  maxSpeed: 17, // m/s once the forest is near
  speedGain: 0.006, // extra m/s per metre run
  jumpVelocity: 8.2, // m/s up when Space is pressed
  gravity: 24, // m/s^2 pulling the jump back down
  laneSwitchTime: 0.16, // seconds to slide into the next lane
};

export const FARMER = {
  startGap: 7.5, // metres behind the turkey when the run begins
  catchGap: 0.6, // gap at which the farmer grabs the turkey (a life lost)
  gainOnHit: 3.2, // metres the farmer closes when the turkey is hit
  gainOnStumble: 1.6, // metres closed when the turkey trips on a fence
  recoverPerSecond: 0.55, // metres the turkey pulls away per clean second
  maxGap: 11, // the farmer never falls further back than this
};

export const RUN = {
  winDistance: 1000, // metres to the forest gate: reach it and the turkey is free
  startLives: 3,
  cornScore: 25,
  metreScore: 1, // one point per metre run
  invulnerableSeconds: 1.6, // grace after a hit, while the turkey flashes
  knifeWarningSeconds: 0.9, // a knife flashes before it swings
};

/** Obstacle kinds, with how they hurt and how they are beaten. */
export const OBSTACLE = {
  FENCE: 'fence', // jump it or change lane
  HAY: 'hay', // jump it or change lane
  PUMPKIN: 'pumpkin', // change lane only — too wide to jump
  OVEN: 'oven', // change lane only — the glowing oven from the porch
  KNIFE: 'knife', // swings across a lane: change lane or time the jump
};

export const PALETTE = {
  skyTop: '#3a2b63',
  skyMid: '#c65a3c',
  skyLow: '#f2a65a',
  sun: '#ffd98a',
  sunCore: '#fff3c4',
  grass: '#7a8f3a',
  grassDry: '#a89a4e',
  dirt: '#8a6a42',
  dirtLight: '#a8875a',
  forest: '#2e4d2a',
  treeTrunk: '#5a3d24',
  treeLeaf: '#c96a1e',
  treeLeaf2: '#e08a2e',
  treeLeaf3: '#8a3d1e',
  barnRed: '#a83c2a',
  barnTrim: '#f2e3c8',
  houseCream: '#e8d8b0',
  houseRoof: '#7a3b2a',
  turkeyBrown: '#7a4a22',
  turkeyDark: '#5a3416',
  turkeyGold: '#c98a3a',
  turkeyRed: '#c93a2a',
  farmerShirt: '#b03024',
  farmerOveralls: '#2e4a7a',
  farmerSkin: '#e8b88a',
  farmerHat: '#d8b25a',
  ovenIron: '#2a2a30',
  ovenGlow: '#ff7a1a',
  knifeBlade: '#d8dde2',
  knifeHandle: '#4a2e16',
  cornYellow: '#f2c230',
  cornHusk: '#5a8a3a',
  hudPanel: 'rgba(20, 12, 8, 0.72)',
  hudEdge: 'rgba(255, 200, 90, 0.85)',
  hudText: '#fff3d8',
  hudAmber: '#ffb400',
  hudGreen: '#7dff8f',
  hudRed: '#ff5d5d',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
export const FONT_MONO = '"SF Mono", "Cascadia Mono", Consolas, monospace';

/** The fixed moment (seconds) the screenshot scenes are painted at. */
export const SHOT_TIME = 3.4;
