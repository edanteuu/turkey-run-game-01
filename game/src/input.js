// Keyboard and pointer input for The Great Turkey Breakout. Lane keys are
// read held (the loop asks steer() every frame); one-shot presses (jump,
// confirm, pause, restart, mute) are queued as bit flags and taken once by
// the loop, so a press between two frames is never lost or counted twice.
// Clicks land on menu buttons (the loop asks takeClick()).

export const ACTION_CONFIRM = 1;
export const ACTION_JUMP = 2;
export const ACTION_PAUSE = 4;
export const ACTION_RESTART = 8;
export const ACTION_MUTE = 16;

const LANE_LEFT = new Set(['ArrowLeft', 'KeyA']);
const LANE_RIGHT = new Set(['ArrowRight', 'KeyD']);
const JUMP = new Set(['Space', 'ArrowUp', 'KeyW']);
const CONFIRM = new Set(['Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const RESTART = new Set(['KeyR']);
const MUTE = new Set(['KeyM']);
// Space is both the jump key and a confirm key while a menu is up: main.js
// treats ACTION_JUMP as confirm on the menu screens, so a menu Space never
// also jumps once the run starts.

export function createInput(target) {
  let actions = 0;
  let lastClick = null;
  const held = new Set();

  window.addEventListener('keydown', (event) => {
    if (LANE_LEFT.has(event.code) || LANE_RIGHT.has(event.code)) {
      held.add(event.code);
      event.preventDefault();
      return;
    }
    if (event.repeat) return;
    if (JUMP.has(event.code)) actions |= ACTION_JUMP;
    else if (CONFIRM.has(event.code)) actions |= ACTION_CONFIRM;
    else if (PAUSE.has(event.code)) actions |= ACTION_PAUSE;
    else if (RESTART.has(event.code)) actions |= ACTION_RESTART;
    else if (MUTE.has(event.code)) actions |= ACTION_MUTE;
    else return;
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    held.delete(event.code);
  });
  // A key released while the tab is hidden never sends keyup: let go on blur.
  window.addEventListener('blur', () => held.clear());

  function logicalPoint(event) {
    const rect = target.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * 1280,
      y: ((event.clientY - rect.top) / rect.height) * 720,
    };
  }

  target.addEventListener('pointerdown', (event) => {
    lastClick = logicalPoint(event);
  });

  return {
    /** -1 left, 1 right, 0 neither/both — from the lane keys currently held. */
    steer() {
      let left = false;
      let right = false;
      for (const code of held) {
        if (LANE_LEFT.has(code)) left = true;
        if (LANE_RIGHT.has(code)) right = true;
      }
      if (right && !left) return 1;
      if (left && !right) return -1;
      return 0;
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    /** The latest click in logical 1280x720 coordinates, or null. */
    takeClick() {
      const click = lastClick;
      lastClick = null;
      return click;
    },
  };
}
