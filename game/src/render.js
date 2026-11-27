// The painter, in real 3D: a sunset farmyard, the dirt track to the forest,
// the farmhouse and barn behind, fences and autumn trees along the track,
// the turkey running ahead of the farmer, and the oven and the carving knife
// waiting in the lanes. Rendered with Three.js (vendored under game/vendor/).
// One scene is built once and re-posed every frame: the camera sits behind
// and above the turkey and looks down the track, so the player always sees
// the same chase view — hazards ahead, the farmer behind.
//
// Everything here is deterministic in `time` and the world state: the same
// state paints the same frame, which is what makes the screenshot poses
// repeatable.

import * as THREE from 'three';
import { LANES, OBSTACLE, PALETTE, RUN, VIEW } from './config.js';
import {
  buildBarn, buildCorn, buildFarmer, buildFence, buildForestGate, buildFarmhouse,
  buildHayBale, buildKnife, buildOven, buildPumpkin, buildTree, buildTurkey,
} from './models.js';

/** Screen names the loop and the screenshot stager share. */
export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_CAUGHT = 'caught';
export const SCREEN_ESCAPED = 'escaped';

const DEG = Math.PI / 180;

/** A soft round sprite texture, drawn once on a canvas (leaves, smoke). */
function softTexture() {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 2, 32, 32, 30);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.5, 'rgba(255,255,255,0.5)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

/** The ground: dry autumn grass either side of a worn dirt track. */
function groundTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#7a8f3a';
  g.fillRect(0, 0, 256, 256);
  // Dry patches and grass speckle.
  const rng = (n) => (Math.sin(n * 127.1) * 43758.5453) % 1;
  for (let i = 0; i < 900; i += 1) {
    const v = Math.abs(rng(i));
    g.fillStyle = v < 0.5 ? 'rgba(168,154,78,0.35)' : 'rgba(70,90,40,0.35)';
    g.fillRect(Math.abs(rng(i + 900)) * 256, Math.abs(rng(i + 1800)) * 256, 3, 3);
  }
  // The dirt track down the middle, with wheel ruts and scattered leaves.
  g.fillStyle = '#8a6a42';
  g.fillRect(88, 0, 80, 256);
  g.fillStyle = '#a8875a';
  g.fillRect(96, 0, 64, 256);
  g.fillStyle = 'rgba(90,60,30,0.5)';
  g.fillRect(104, 0, 5, 256);
  g.fillRect(147, 0, 5, 256);
  for (let i = 0; i < 26; i += 1) {
    g.fillStyle = ['#c96a1e', '#e08a2e', '#8a3d1e'][i % 3];
    g.fillRect(88 + Math.abs(rng(i + 3000)) * 80, Math.abs(rng(i + 4000)) * 256, 4, 3);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 10);
  tex.anisotropy = 4;
  return tex;
}

const SKY_VERT = `
varying vec3 vDir;
void main() {
  vDir = position;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_Position.z = gl_Position.w;
}`;

const SKY_FRAG = `
uniform vec3 topColor;
uniform vec3 midColor;
uniform vec3 horizonColor;
uniform vec3 sunDir;
uniform vec3 sunColor;
varying vec3 vDir;
void main() {
  vec3 d = normalize(vDir);
  float h = d.y;
  vec3 col = h > 0.28
    ? mix(midColor, topColor, smoothstep(0.28, 0.75, h))
    : mix(horizonColor, midColor, smoothstep(-0.02, 0.28, h));
  if (h < 0.0) col = horizonColor * 0.85;
  float s = max(dot(d, normalize(sunDir)), 0.0);
  col += sunColor * (pow(s, 300.0) * 1.5 + pow(s, 18.0) * 0.45);
  gl_FragColor = vec4(col, 1.0);
}`;

const POOL = { fence: 8, hay: 8, pumpkin: 8, oven: 4, knife: 4, corn: 26, tree: 30, prop: 26 };

/**
 * Build the renderer on `canvas` for `world`. Returns the renderer object:
 * renderFrame(state, time, screen).
 */
export function createRenderer(canvas, world) {
  const renderer = new THREE.WebGLRenderer({
    canvas, antialias: true, preserveDrawingBuffer: true,
  });
  renderer.setSize(VIEW.width, VIEW.height, false);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0xd88a4a, 0.0055);
  const camera = new THREE.PerspectiveCamera(58, VIEW.width / VIEW.height, 0.5, 900);
  scene.add(camera);

  // --- Lights: a low warm sunset sun and a dusky purple sky fill. ----------
  const sun = new THREE.DirectionalLight(0xffc070, 2.6);
  sun.position.set(-40, 26, -60);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -40;
  sun.shadow.camera.right = 40;
  sun.shadow.camera.top = 40;
  sun.shadow.camera.bottom = -40;
  sun.shadow.camera.near = 10;
  sun.shadow.camera.far = 260;
  sun.shadow.bias = -0.0006;
  sun.shadow.camera.updateProjectionMatrix();
  scene.add(sun);
  scene.add(sun.target);
  const hemi = new THREE.HemisphereLight(0x8a6a9a, 0x4a3a22, 1.0);
  scene.add(hemi);
  // A warm fill from behind the camera, so the turkey is never a black silhouette.
  const fill = new THREE.DirectionalLight(0xffd0a0, 0.55);
  fill.position.set(0, 20, 60);
  scene.add(fill);
  scene.add(fill.target);

  // --- Sunset sky dome, with the sun low ahead over the forest. ------------
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(420, 24, 16),
    new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(PALETTE.skyTop) },
        midColor: { value: new THREE.Color(PALETTE.skyMid) },
        horizonColor: { value: new THREE.Color(PALETTE.skyLow) },
        sunDir: { value: new THREE.Vector3(-0.25, 0.1, -1).normalize() },
        sunColor: { value: new THREE.Color(PALETTE.sun) },
      },
      vertexShader: SKY_VERT,
      fragmentShader: SKY_FRAG,
      side: THREE.BackSide,
      fog: false,
      depthWrite: false,
    }),
  );
  scene.add(sky);

  // The sun disc itself, a warm glow low over the trees ahead.
  const sunDisc = new THREE.Mesh(
    new THREE.CircleGeometry(14, 32),
    new THREE.MeshBasicMaterial({ color: PALETTE.sunCore, fog: false }),
  );
  sunDisc.position.set(-95, 34, -380);
  sunDisc.lookAt(camera.position);
  scene.add(sunDisc);

  // --- Ground: one long plane, its texture scrolling with the distance. ----
  const groundTex = groundTexture();
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(90, 240),
    new THREE.MeshStandardMaterial({ map: groundTex, roughness: 1 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, 0, -95);
  ground.receiveShadow = true;
  scene.add(ground);

  // --- The farmyard, behind the start line: house, barn, porch oven. ------
  const yard = new THREE.Group();
  const farmhouse = buildFarmhouse();
  farmhouse.position.set(-10.5, 0, 8);
  farmhouse.rotation.y = 0.5;
  yard.add(farmhouse);
  const barn = buildBarn();
  barn.position.set(11, 0, 2);
  barn.rotation.y = -0.45;
  yard.add(barn);
  const porchOven = buildOven();
  porchOven.position.set(-5.2, 0, 13.5);
  // Turned so its glowing door faces the yard (and the title camera).
  porchOven.rotation.y = Math.PI - 0.5;
  yard.add(porchOven);
  scene.add(yard);

  // Chimney smoke: soft grey puffs rising and drifting, looped by time.
  const smokeTex = softTexture();
  const smoke = [];
  for (let i = 0; i < 7; i += 1) {
    const puff = new THREE.Sprite(new THREE.SpriteMaterial({
      map: smokeTex, color: 0xcfc8c0, transparent: true, opacity: 0.35, depthWrite: false,
    }));
    puff.scale.set(2.2, 2.2, 1);
    scene.add(puff);
    smoke.push(puff);
  }

  // --- Clouds: pink-lit puffs drifting high over the track. ----------------
  const clouds = [];
  for (let i = 0; i < 9; i += 1) {
    const cloud = new THREE.Group();
    const puffs = 2 + (i % 3);
    for (let j = 0; j < puffs; j += 1) {
      const puff = new THREE.Mesh(
        new THREE.SphereGeometry(6 + ((i * 7 + j * 13) % 5), 10, 8),
        new THREE.MeshBasicMaterial({ color: 0xf2b98a, transparent: true, opacity: 0.55, fog: false }),
      );
      puff.position.set(j * 7 - puffs * 3, (j % 2) * 2, 0);
      puff.scale.y = 0.45;
      cloud.add(puff);
    }
    cloud.position.set(-90 + i * 22 + ((i * 37) % 18), 42 + (i % 4) * 7, -120 - (i % 5) * 40);
    scene.add(cloud);
    clouds.push(cloud);
  }

  // --- The turkey and the farmer. -------------------------------------------
  const turkey = buildTurkey();
  scene.add(turkey.group);
  const farmer = buildFarmer();
  scene.add(farmer.group);

  // --- The forest gate at 1000 m: freedom, waiting at the end of the track. -
  const gate = buildForestGate();
  gate.visible = false;
  scene.add(gate);

  // --- Obstacle, corn, tree and prop pools, reused every frame. -------------
  // Builders return either a bare Group or { group, pivot, ... }: normalise
  // to { group, pivot } so the placement code below can treat them alike.
  function poolItem(built) {
    const group = built.group || built;
    group.visible = false;
    scene.add(group);
    return { group, pivot: built.pivot || null };
  }
  function makePool(build, count) {
    const items = [];
    for (let i = 0; i < count; i += 1) items.push(poolItem(build()));
    return items;
  }
  const fencePool = makePool(buildFence, POOL.fence);
  const hayPool = makePool(buildHayBale, POOL.hay);
  const pumpkinPool = makePool(buildPumpkin, POOL.pumpkin);
  const ovenPool = makePool(buildOven, POOL.oven);
  const knifePool = makePool(buildKnife, POOL.knife);
  const cornPool = [];
  for (let i = 0; i < POOL.corn; i += 1) {
    const cob = buildCorn();
    cob.visible = false;
    scene.add(cob);
    cornPool.push(cob);
  }
  const treePool = [];
  for (let i = 0; i < POOL.tree; i += 1) {
    const tree = buildTree(i % 3, 1);
    tree.visible = false;
    scene.add(tree);
    treePool.push(tree);
  }
  const propPool = [];
  for (let i = 0; i < POOL.prop; i += 1) {
    const prop = buildFence();
    prop.visible = false;
    scene.add(prop);
    propPool.push(prop);
  }
  // Hay bales at the track's edge, for the side props that are hay.
  const edgeHayPool = [];
  for (let i = 0; i < 10; i += 1) {
    const bale = buildHayBale();
    bale.visible = false;
    scene.add(bale);
    edgeHayPool.push(bale);
  }

  // --- Falling autumn leaves, one Points cloud. ------------------------------
  const leafColours = [0xc96a1e, 0xe08a2e, 0x8a3d1e];
  const leafGeo = new THREE.BufferGeometry();
  const leafPos = new Float32Array(world.state.leaves.length * 3);
  const leafCol = new Float32Array(world.state.leaves.length * 3);
  world.state.leaves.forEach((leaf, i) => {
    const c = new THREE.Color(leafColours[leaf.colour]);
    leafCol[i * 3] = c.r;
    leafCol[i * 3 + 1] = c.g;
    leafCol[i * 3 + 2] = c.b;
  });
  leafGeo.setAttribute('position', new THREE.BufferAttribute(leafPos, 3));
  leafGeo.setAttribute('color', new THREE.BufferAttribute(leafCol, 3));
  const leaves = new THREE.Points(leafGeo, new THREE.PointsMaterial({
    size: 0.55, map: softTexture(), vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false,
  }));
  scene.add(leaves);

  /** Place a pooled mesh for an obstacle, or hide it when there is none. */
  function placeObstacle(pool, index, ob) {
    const item = pool[index];
    if (!item) return;
    item.group.visible = true;
    item.group.position.set(LANES[ob.lane], 0, ob.z);
    if (ob.kind === OBSTACLE.KNIFE) {
      item.pivot.rotation.z = ob.swing;
      // Only the blade flashes red while the knife is warning: the post and
      // handle stay as they are, so the blade reads as the danger.
      const flash = ob.warned && !ob.hit && (Math.sin(world.state.time * 18) > 0);
      item.group.traverse((o) => {
        if (o.isMesh && o.userData.flash && o.material && o.material.emissive) {
          o.material.emissive.setHex(flash ? 0xcc2200 : 0x000000);
        }
      });
    }
  }

  /** Paint one frame from the live state. `screen` picks the camera. */
  function renderFrame(state, time, screen) {
    const s = state;
    // The ground scrolls under the turkey as it runs.
    groundTex.offset.y = (s.distance / 24) % 1;

    // The farmyard recedes behind as the turkey runs away from it.
    yard.position.z = s.distance;
    yard.visible = s.distance < 90;
    // Chimney smoke rises from the farmhouse, looped over 6 seconds.
    const houseZ = 8 + s.distance;
    smoke.forEach((puff, i) => {
      const t = ((time * 0.55 + i / 7) % 1);
      puff.position.set(-10.5 + Math.sin(i * 2.3) * 0.4 + t * 2.2, 6.4 + t * 7, houseZ - 1 + t * 1.5);
      puff.material.opacity = 0.35 * (1 - t);
      const sc = 1.6 + t * 3.2;
      puff.scale.set(sc, sc, 1);
      puff.visible = yard.visible;
    });
    // Clouds drift slowly across the sky.
    clouds.forEach((cloud, i) => {
      cloud.position.x += Math.sin(time * 0.05 + i) * 0.002;
    });

    // --- The turkey: run cycle, jump pose, lane slide, hit flash. ---------
    const runPhase = s.distance * 1.9;
    const running = screen === SCREEN_PLAY || screen === SCREEN_PAUSED;
    const flap = running ? Math.sin(runPhase) : Math.sin(time * 2) * 0.15;
    turkey.group.position.set(s.laneX, s.y + (running ? Math.abs(Math.sin(runPhase)) * 0.07 : 0), 0);
    turkey.group.rotation.y = (s.laneTo - s.laneFrom) * 0.12 * (1 - s.laneT);
    turkey.group.rotation.z = (s.laneTo - s.laneX) * -0.06;
    turkey.wingL.rotation.z = 0.35 + flap * 0.55 + (s.jumping ? 0.9 : 0);
    turkey.wingR.rotation.z = -0.35 - flap * 0.55 - (s.jumping ? 0.9 : 0);
    turkey.legL.rotation.x = running ? Math.sin(runPhase) * 0.85 : 0;
    turkey.legR.rotation.x = running ? -Math.sin(runPhase) * 0.85 : 0;
    if (s.jumping) {
      turkey.legL.rotation.x = 0.7;
      turkey.legR.rotation.x = -0.4;
    }
    turkey.tail.rotation.x = running ? -0.1 + Math.sin(runPhase * 0.5) * 0.06 : 0;
    turkey.head.rotation.y = Math.sin(time * 0.9) * 0.25;
    // Flash while invulnerable after a hit.
    turkey.group.visible = !(s.invulnerable > 0 && Math.floor(time * 12) % 2 === 0);
    if (s.caught) {
      // Caught: the turkey flops on its back, wings out.
      turkey.group.rotation.x = -1.35;
      turkey.group.position.y = 0.35;
      turkey.wingL.rotation.z = 1.4;
      turkey.wingR.rotation.z = -1.4;
    }
    if (s.escaped) {
      turkey.group.rotation.x = 0;
      turkey.wingL.rotation.z = 1.2 + Math.sin(time * 6) * 0.3;
      turkey.wingR.rotation.z = -1.2 - Math.sin(time * 6) * 0.3;
    }

    // --- The farmer: always `farmerGap` behind, pumping his arms. ----------
    const farmerPhase = time * 9 + s.distance * 0.4;
    // When the farmer is a step behind he lunges in from the side, so the
    // turkey stays visible beside him instead of behind him.
    const sideLunge = s.farmerGap < 2.5 && !s.caught && !s.escaped ? 0.9 : 0;
    farmer.group.position.set(s.laneX * 0.85 + sideLunge, 0, s.farmerGap);
    farmer.group.rotation.y = 0;
    farmer.armL.rotation.x = Math.sin(farmerPhase) * 0.9;
    farmer.armR.rotation.x = -Math.sin(farmerPhase) * 0.9;
    farmer.legL.rotation.x = Math.sin(farmerPhase) * 0.8;
    farmer.legR.rotation.x = -Math.sin(farmerPhase) * 0.8;
    farmer.group.rotation.x = 0.08;
    if (s.caught) {
      // The farmer stands beside the turkey, one arm raised in triumph, so
      // the caught turkey stays visible in frame.
      farmer.group.position.set(s.laneX * 0.85 + 1.7, 0, 1.6);
      farmer.armR.rotation.x = -2.4;
      farmer.armL.rotation.x = 0.3;
      farmer.legL.rotation.x = 0;
      farmer.legR.rotation.x = 0;
      farmer.group.rotation.x = 0;
    }
    if (s.escaped) {
      // Beaten: the farmer stops, hands on his knees, far behind.
      farmer.group.position.set(s.laneX * 0.85, 0, 14);
      farmer.group.rotation.x = 0.55;
      farmer.armL.rotation.x = 0.9;
      farmer.armR.rotation.x = 0.9;
    }

    // --- Obstacles, corn, trees and edge props from the world state. -------
    const counts = { fence: 0, hay: 0, pumpkin: 0, oven: 0, knife: 0 };
    for (const ob of s.obstacles) {
      if (ob.z < -90 || ob.z > 12) continue;
      if (ob.kind === OBSTACLE.FENCE && counts.fence < POOL.fence) {
        placeObstacle(fencePool, counts.fence, ob);
        counts.fence += 1;
      } else if (ob.kind === OBSTACLE.HAY && counts.hay < POOL.hay) {
        placeObstacle(hayPool, counts.hay, ob);
        counts.hay += 1;
      } else if (ob.kind === OBSTACLE.PUMPKIN && counts.pumpkin < POOL.pumpkin) {
        placeObstacle(pumpkinPool, counts.pumpkin, ob);
        counts.pumpkin += 1;
      } else if (ob.kind === OBSTACLE.OVEN && counts.oven < POOL.oven) {
        placeObstacle(ovenPool, counts.oven, ob);
        counts.oven += 1;
      } else if (ob.kind === OBSTACLE.KNIFE && counts.knife < POOL.knife) {
        placeObstacle(knifePool, counts.knife, ob);
        counts.knife += 1;
      }
    }
    for (let i = counts.fence; i < POOL.fence; i += 1) fencePool[i].group.visible = false;
    for (let i = counts.hay; i < POOL.hay; i += 1) hayPool[i].group.visible = false;
    for (let i = counts.pumpkin; i < POOL.pumpkin; i += 1) pumpkinPool[i].group.visible = false;
    for (let i = counts.oven; i < POOL.oven; i += 1) ovenPool[i].group.visible = false;
    for (let i = counts.knife; i < POOL.knife; i += 1) knifePool[i].group.visible = false;

    let cornIndex = 0;
    for (const cob of s.corn) {
      if (cornIndex >= POOL.corn) break;
      if (cob.z < -90 || cob.z > 12) continue;
      const mesh = cornPool[cornIndex];
      mesh.visible = true;
      mesh.position.set(LANES[cob.lane], Math.sin(time * 2 + cob.phase) * 0.12, cob.z);
      mesh.rotation.y = time * 1.5 + cob.phase;
      cornIndex += 1;
    }
    for (let i = cornIndex; i < POOL.corn; i += 1) cornPool[i].visible = false;

    s.trees.forEach((tree, i) => {
      if (i >= POOL.tree) return;
      const mesh = treePool[i];
      mesh.visible = tree.z > -110 && tree.z < 16;
      // Trees stand well clear of the track, so a near one never looms over it.
      mesh.position.set(tree.side * (9 + (i % 5) * 1.2), 0, tree.z);
      mesh.scale.setScalar(Math.min(1.25, tree.size));
      mesh.rotation.y = tree.sway;
    });
    let propIndex = 0;
    let hayIndex = 0;
    for (const prop of s.sideProps) {
      if (prop.z < -100 || prop.z > 14) continue;
      if (prop.kind === 'hay' && hayIndex < edgeHayPool.length) {
        const bale = edgeHayPool[hayIndex];
        bale.visible = true;
        bale.position.set(prop.side * 5.6, 0, prop.z);
        hayIndex += 1;
      } else if (propIndex < POOL.prop) {
        const mesh = propPool[propIndex];
        mesh.visible = true;
        mesh.position.set(prop.side * 5.4, 0, prop.z);
        mesh.rotation.y = prop.side > 0 ? Math.PI / 2 : -Math.PI / 2;
        propIndex += 1;
      }
    }
    for (let i = propIndex; i < POOL.prop; i += 1) propPool[i].visible = false;
    for (let i = hayIndex; i < edgeHayPool.length; i += 1) edgeHayPool[i].visible = false;

    // Falling leaves follow the world state.
    s.leaves.forEach((leaf, i) => {
      leafPos[i * 3] = leaf.x;
      leafPos[i * 3 + 1] = leaf.y;
      leafPos[i * 3 + 2] = leaf.z;
    });
    leafGeo.attributes.position.needsUpdate = true;

    // The forest gate rises out of the dusk as the run nears 1000 m.
    const gateZ = s.distance - RUN.winDistance;
    gate.visible = gateZ > -160;
    gate.position.set(0, 0, gateZ);
    if (gate.visible) {
      gate.rotation.y = Math.sin(time * 0.5) * 0.01;
    }

    // --- Camera. ------------------------------------------------------------
    if (screen === SCREEN_TITLE) {
      // A three-quarter view from the front-left, as in the first framing:
      // the tail fan spreads to the left of the menu button, with the farmer
      // and the farmhouse behind the turkey.
      camera.position.set(-5.5, 3.4, -7.5);
      camera.lookAt(2.2, 1.2, 7);
    } else if (screen === SCREEN_CAUGHT) {
      // From the turkey's far side, so the farmer (standing to the right of
      // the turkey) never blocks the bird he just caught.
      camera.position.set(-4.8, 3.0, 6.8);
      camera.lookAt(0.6, 0.9, 0.5);
    } else if (screen === SCREEN_ESCAPED) {
      camera.position.set(s.laneX * 0.3, 3.6, 9.5);
      camera.lookAt(0, 1.6, -20);
    } else {
      // Chase view: behind and above the turkey, down the track — high and
      // far enough that the farmer reads at the bottom of the frame instead
      // of filling it.
      camera.position.set(s.laneX * 0.45, 6.0, 12.8);
      camera.lookAt(s.laneX * 0.6, 0.7, -16);
    }

    // The sun follows the camera so the shadows stay in frame.
    sun.position.set(camera.position.x - 30, 26, camera.position.z - 70);
    sun.target.position.set(0, 0, -20);
    sun.target.updateMatrixWorld();

    renderer.render(scene, camera);
  }

  return { renderFrame };
}
