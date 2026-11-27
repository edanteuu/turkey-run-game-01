// The characters and props, built from Three.js primitives — every shape is
// original low-poly work: a fanned-tail turkey, a straw-hatted farmer, the
// glowing oven, the carving knife, fences, hay bales, pumpkins and corn.

import * as THREE from 'three';
import { PALETTE } from './config.js';

function mat(colour, opts) {
  return new THREE.MeshStandardMaterial({ color: colour, roughness: 0.9, metalness: 0, ...(opts || {}) });
}

function box(w, h, d, colour, x, y, z, opts) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(colour, opts));
  m.position.set(x, y, z);
  return m;
}

function sphere(r, colour, x, y, z, opts) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), mat(colour, opts));
  m.position.set(x, y, z);
  return m;
}

function cone(r, h, colour, x, y, z, opts) {
  const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, 12), mat(colour, opts));
  m.position.set(x, y, z);
  return m;
}

function cylinder(rt, rb, h, colour, x, y, z, opts) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, 14), mat(colour, opts));
  m.position.set(x, y, z);
  return m;
}

/**
 * The turkey: a plump brown body, a fan of tail feathers behind, a small head
 * with a red wattle and an orange beak, wings that flap while it runs, and
 * two skinny legs. Returns { group, wingL, wingR, legL, legR, tail, head }.
 */
export function buildTurkey() {
  const group = new THREE.Group();

  const body = sphere(0.55, PALETTE.turkeyBrown, 0, 0.75, 0);
  body.scale.set(1, 1.15, 1.25);
  group.add(body);
  const belly = sphere(0.42, PALETTE.turkeyGold, 0, 0.62, 0.28);
  belly.scale.set(0.9, 1, 1);
  group.add(belly);

  // The fanned tail: seven feathers spread behind the body, tipped in gold.
  const tail = new THREE.Group();
  tail.position.set(0, 0.85, -0.55);
  for (let i = -3; i <= 3; i += 1) {
    const feather = box(0.22, 1.05, 0.06, i % 2 === 0 ? PALETTE.turkeyBrown : PALETTE.turkeyDark, i * 0.24, 0.42, -0.08);
    feather.rotation.z = -i * 0.22;
    feather.rotation.x = -0.25;
    tail.add(feather);
    const tip = box(0.22, 0.18, 0.07, PALETTE.turkeyGold, i * 0.24, 0.88, -0.19);
    tip.rotation.z = -i * 0.22;
    tip.rotation.x = -0.25;
    tail.add(tip);
  }
  group.add(tail);

  // Head, beak, wattle and eyes.
  const head = new THREE.Group();
  head.position.set(0, 1.42, 0.42);
  head.add(sphere(0.22, PALETTE.turkeyRed, 0, 0, 0));
  head.add(sphere(0.26, PALETTE.turkeyBrown, 0, -0.08, -0.08));
  const beak = cone(0.07, 0.28, '#e8a13a', 0, -0.04, 0.32);
  beak.rotation.x = Math.PI / 2;
  head.add(beak);
  const wattle = sphere(0.07, PALETTE.turkeyRed, 0, -0.2, 0.2);
  wattle.scale.set(0.7, 1.4, 0.7);
  head.add(wattle);
  const eyeL = sphere(0.035, '#1a1a1a', -0.12, 0.08, 0.16);
  const eyeR = sphere(0.035, '#1a1a1a', 0.12, 0.08, 0.16);
  head.add(eyeL);
  head.add(eyeR);
  group.add(head);

  // Wings, hinged at the body so they can flap.
  const wingL = new THREE.Group();
  wingL.position.set(-0.5, 0.85, 0);
  const wl = sphere(0.32, PALETTE.turkeyDark, -0.12, -0.1, 0);
  wl.scale.set(0.5, 1.1, 1.4);
  wingL.add(wl);
  group.add(wingL);
  const wingR = new THREE.Group();
  wingR.position.set(0.5, 0.85, 0);
  const wr = sphere(0.32, PALETTE.turkeyDark, 0.12, -0.1, 0);
  wr.scale.set(0.5, 1.1, 1.4);
  wingR.add(wr);
  group.add(wingR);

  // Skinny orange legs, hinged at the hips so they can run.
  const legL = new THREE.Group();
  legL.position.set(-0.18, 0.34, 0);
  legL.add(cylinder(0.035, 0.035, 0.36, '#e8a13a', 0, -0.16, 0));
  group.add(legL);
  const legR = new THREE.Group();
  legR.position.set(0.18, 0.34, 0);
  legR.add(cylinder(0.035, 0.035, 0.36, '#e8a13a', 0, -0.16, 0));
  group.add(legR);

  group.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return { group, wingL, wingR, legL, legR, tail, head };
}

/**
 * The farmer: overalls, a red shirt, a straw hat, and arms pumping as he
 * runs. Returns { group, armL, armR, legL, legR }.
 */
export function buildFarmer() {
  const group = new THREE.Group();

  const legs = new THREE.Group();
  legs.position.set(0, 1.05, 0);
  const legL = new THREE.Group();
  legL.position.set(-0.22, 0, 0);
  legL.add(box(0.24, 1.0, 0.28, PALETTE.farmerOveralls, 0, -0.5, 0));
  legs.add(legL);
  const legR = new THREE.Group();
  legR.position.set(0.22, 0, 0);
  legR.add(box(0.24, 1.0, 0.28, PALETTE.farmerOveralls, 0, -0.5, 0));
  legs.add(legR);
  group.add(legs);

  const torso = box(0.85, 0.95, 0.5, PALETTE.farmerShirt, 0, 1.55, 0);
  group.add(torso);
  group.add(box(0.9, 0.55, 0.54, PALETTE.farmerOveralls, 0, 1.28, 0));
  // Overall straps.
  group.add(box(0.12, 0.5, 0.52, PALETTE.farmerOveralls, -0.25, 1.85, 0));
  group.add(box(0.12, 0.5, 0.52, PALETTE.farmerOveralls, 0.25, 1.85, 0));

  const armL = new THREE.Group();
  armL.position.set(-0.55, 1.95, 0);
  armL.add(cylinder(0.09, 0.08, 0.85, PALETTE.farmerShirt, 0, -0.42, 0));
  group.add(armL);
  const armR = new THREE.Group();
  armR.position.set(0.55, 1.95, 0);
  armR.add(cylinder(0.09, 0.08, 0.85, PALETTE.farmerShirt, 0, -0.42, 0));
  group.add(armR);

  const head = new THREE.Group();
  head.position.set(0, 2.35, 0);
  head.add(sphere(0.3, PALETTE.farmerSkin, 0, 0, 0));
  // A bushy moustache and angry eyebrows: the farmer means business.
  head.add(box(0.34, 0.08, 0.08, '#e8e0d0', 0, -0.08, 0.26));
  head.add(box(0.14, 0.05, 0.05, '#e8e0d0', -0.14, 0.14, 0.27));
  head.add(box(0.14, 0.05, 0.05, '#e8e0d0', 0.14, 0.14, 0.27));
  const hat = new THREE.Group();
  hat.position.set(0, 0.22, 0);
  hat.add(cylinder(0.3, 0.34, 0.22, PALETTE.farmerHat, 0, 0.08, 0));
  const brim = cylinder(0.55, 0.55, 0.04, PALETTE.farmerHat, 0, 0, 0);
  hat.add(brim);
  head.add(hat);
  group.add(head);

  group.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return { group, armL, armR, legL, legR };
}

/** The oven: a black iron box with a glowing orange door and a chimney. */
export function buildOven() {
  const group = new THREE.Group();
  group.add(box(1.9, 1.7, 1.1, PALETTE.ovenIron, 0, 0.85, 0));
  group.add(box(2.05, 0.12, 1.25, '#1a1a1e', 0, 1.76, 0));
  // The glowing door: emissive, so it reads as hot even in the dusk.
  const door = box(1.3, 1.0, 0.08, PALETTE.ovenGlow, 0, 0.8, 0.58, { emissive: 0xff5a00, emissiveIntensity: 1.6 });
  group.add(door);
  group.add(box(1.3, 0.1, 0.1, '#1a1a1e', 0, 1.32, 0.58));
  group.add(box(0.5, 0.08, 0.1, '#d8dde2', 0, 0.45, 0.6));
  group.add(cylinder(0.14, 0.18, 0.9, PALETTE.ovenIron, 0.6, 2.2, -0.2));
  // Little legs and a fire glow underneath.
  for (const sx of [-0.8, 0.8]) {
    for (const sz of [-0.4, 0.4]) group.add(box(0.12, 0.25, 0.12, '#1a1a1e', sx, 0.12, sz));
  }
  const glow = new THREE.PointLight(0xff7a1a, 12, 9, 1.8);
  glow.position.set(0, 1.0, 1.4);
  group.add(glow);
  group.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return group;
}

/**
 * The carving knife: a long silver blade on a wooden handle, hinged at the
 * top so it can swing across a lane. Returns { group, pivot } — rotate the
 * pivot to swing it.
 */
export function buildKnife() {
  const group = new THREE.Group();
  const pivot = new THREE.Group();
  pivot.position.set(0, 3.4, 0);
  const blade = box(0.22, 2.1, 0.05, PALETTE.knifeBlade, 0, -1.25, 0, { metalness: 0.7, roughness: 0.35 });
  blade.userData.flash = true;
  pivot.add(blade);
  // A sharpened tip: a small cone at the blade's end.
  const tip = cone(0.11, 0.4, PALETTE.knifeBlade, 0, -2.45, 0, { metalness: 0.7, roughness: 0.35 });
  tip.userData.flash = true;
  tip.rotation.x = Math.PI;
  pivot.add(tip);
  pivot.add(box(0.26, 0.55, 0.09, PALETTE.knifeHandle, 0, -0.1, 0));
  group.add(pivot);
  // The post the knife hangs from.
  group.add(cylinder(0.08, 0.1, 3.4, '#3a2a1a', 0, 1.7, 0));
  group.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return { group, pivot };
}

/** A wooden fence panel across one lane: two rails and three posts. */
export function buildFence() {
  const group = new THREE.Group();
  for (const px of [-0.95, 0, 0.95]) {
    group.add(box(0.14, 1.05, 0.14, '#6a4a2a', px, 0.52, 0));
  }
  group.add(box(2.1, 0.12, 0.08, '#8a6a42', 0, 0.9, 0));
  group.add(box(2.1, 0.12, 0.08, '#8a6a42', 0, 0.45, 0));
  group.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return group;
}

/** A hay bale: a golden cylinder lying on its side, bound with twine. */
export function buildHayBale() {
  const group = new THREE.Group();
  const bale = cylinder(0.62, 0.62, 1.1, '#d8a83a', 0, 0.62, 0);
  bale.rotation.z = Math.PI / 2;
  group.add(bale);
  for (const off of [-0.3, 0.3]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.03, 8, 20), mat('#8a6a22'));
    ring.position.set(off, 0.62, 0);
    ring.rotation.y = Math.PI / 2;
    group.add(ring);
  }
  group.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return group;
}

/** A pumpkin: a flattened orange sphere with ridges and a green stem. */
export function buildPumpkin() {
  const group = new THREE.Group();
  const body = sphere(0.62, '#e07820', 0, 0.5, 0);
  body.scale.set(1, 0.8, 1);
  group.add(body);
  for (let i = 0; i < 6; i += 1) {
    const ridge = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.035, 8, 20), mat('#c85a10'));
    ridge.position.set(0, 0.5, 0);
    ridge.rotation.y = (i / 6) * Math.PI;
    ridge.scale.set(1, 0.8, 1);
    group.add(ridge);
  }
  group.add(cylinder(0.05, 0.08, 0.3, '#3a5a22', 0, 1.05, 0));
  group.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return group;
}

/** A corn cob: a yellow cob with green husk leaves, bobbing above the track. */
export function buildCorn() {
  const group = new THREE.Group();
  const cob = cylinder(0.14, 0.16, 0.85, PALETTE.cornYellow, 0, 0.55, 0);
  group.add(cob);
  const tip = cone(0.14, 0.25, PALETTE.cornYellow, 0, 1.1, 0);
  group.add(tip);
  for (const a of [0, 2.1, 4.2]) {
    const leaf = box(0.1, 0.7, 0.02, PALETTE.cornHusk, Math.cos(a) * 0.16, 0.35, Math.sin(a) * 0.16);
    leaf.rotation.z = Math.cos(a) * 0.5;
    leaf.rotation.x = -Math.sin(a) * 0.5;
    group.add(leaf);
  }
  return group;
}

/** An autumn tree: a trunk and two or three orange-red leaf balls. */
export function buildTree(leafKind, size) {
  const group = new THREE.Group();
  group.add(cylinder(0.18 * size, 0.28 * size, 2.2 * size, PALETTE.treeTrunk, 0, 1.1 * size, 0));
  const colours = [PALETTE.treeLeaf, PALETTE.treeLeaf2, PALETTE.treeLeaf3];
  const c = colours[leafKind % 3];
  const top = sphere(1.5 * size, c, 0, 3.1 * size, 0);
  top.scale.set(1, 0.85, 1);
  group.add(top);
  group.add(sphere(0.95 * size, colours[(leafKind + 1) % 3], 0.9 * size, 2.4 * size, 0.3 * size));
  group.add(sphere(0.85 * size, colours[(leafKind + 2) % 3], -0.85 * size, 2.5 * size, -0.25 * size));
  group.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return group;
}

/** The farmhouse the turkey flees from: cream walls, a red roof, lit windows. */
export function buildFarmhouse() {
  const group = new THREE.Group();
  group.add(box(7, 3.4, 5, PALETTE.houseCream, 0, 1.7, 0));
  const roof = new THREE.Mesh(new THREE.ConeGeometry(5.4, 2.2, 4), mat(PALETTE.houseRoof));
  roof.position.set(0, 4.5, 0);
  roof.rotation.y = Math.PI / 4;
  roof.scale.set(1, 1, 0.75);
  group.add(roof);
  group.add(box(0.9, 2.4, 0.3, '#5a3416', 0.7, 2.0, 0));
  group.add(box(1.1, 1.4, 0.5, '#8a6a42', 0, 1.2, 0));
  // Warm lit windows.
  for (const wx of [-2.2, 2.2]) {
    const win = box(1.1, 1.1, 0.1, '#ffd98a', wx, 1.9, 2.52, { emissive: 0xffc860, emissiveIntensity: 0.9 });
    group.add(win);
    group.add(box(1.1, 0.08, 0.12, '#5a3416', wx, 1.9, 2.54));
    group.add(box(0.08, 1.1, 0.12, '#5a3416', wx, 1.9, 2.54));
  }
  // Chimney with a smoke puff sprite holder (the renderer adds the smoke).
  group.add(box(0.7, 1.8, 0.7, '#8a5a4a', -2.2, 5.2, -1));
  group.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return group;
}

/** The red barn beside the track, with white trim and a big door. */
export function buildBarn() {
  const group = new THREE.Group();
  group.add(box(6, 4, 5, PALETTE.barnRed, 0, 2, 0));
  const roof = new THREE.Mesh(new THREE.CylinderGeometry(3.05, 3.05, 5.2, 3, 1), mat('#6a2a1e'));
  roof.rotation.z = Math.PI / 2;
  roof.rotation.y = Math.PI / 2;
  roof.position.set(0, 4, 0);
  roof.scale.set(1, 1, 0.82);
  group.add(roof);
  group.add(box(2.4, 3, 0.15, PALETTE.barnTrim, 0, 1.5, 2.55));
  group.add(box(0.12, 3, 0.18, PALETTE.barnRed, 0, 1.5, 2.58));
  group.add(box(2.4, 0.12, 0.18, PALETTE.barnRed, 0, 1.5, 2.58));
  group.add(box(1.2, 1.2, 0.1, '#ffd98a', 0, 3.4, 2.52, { emissive: 0xffc860, emissiveIntensity: 0.7 }));
  group.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return group;
}

/** The forest gate at 1000 m: two great pines and a garland arch — freedom. */
export function buildForestGate() {
  const group = new THREE.Group();
  for (const sx of [-3.4, 3.4]) {
    const pine = new THREE.Group();
    pine.add(cylinder(0.3, 0.45, 3, PALETTE.treeTrunk, 0, 1.5, 0));
    pine.add(cone(2.2, 4.5, PALETTE.forest, 0, 4.5, 0));
    pine.add(cone(1.7, 3.5, '#3a5d34', 0, 6.8, 0));
    pine.position.set(sx, 0, 0);
    group.add(pine);
  }
  const arch = new THREE.Mesh(new THREE.TorusGeometry(3.4, 0.35, 10, 24, Math.PI), mat('#3a5d34'));
  arch.position.set(0, 0, 0);
  group.add(arch);
  for (let i = 0; i <= 8; i += 1) {
    const a = (i / 8) * Math.PI;
    const berry = sphere(0.14, i % 2 ? '#e07820' : '#ffd98a', Math.cos(a) * 3.4, Math.sin(a) * 3.4, 0.3);
    group.add(berry);
  }
  group.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return group;
}
