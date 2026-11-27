// A small seeded random number generator (mulberry32): the same seed gives the
// same obstacle pattern, corn lines and trees, which is what makes the
// screenshot scenes repeatable and every run fair — the farm never changes
// under the turkey.

export function createRandom(seed) {
  let a = seed | 0;
  return function random() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Pick a value in [min, max) from a seeded random. */
export function range(random, min, max) {
  return min + random() * (max - min);
}

/** Pick one whole number in [min, max] from a seeded random. */
export function rangeInt(random, min, max) {
  return min + Math.floor(random() * (max - min + 1));
}

/** A deterministic pick from a list, for seeded variety (tree shapes, etc.). */
export function pick(random, list) {
  return list[Math.floor(random() * list.length)];
}

/** Fisher-Yates shuffle of a copy, driven by the seeded random. */
export function shuffled(random, list) {
  const copy = list.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy;
}
