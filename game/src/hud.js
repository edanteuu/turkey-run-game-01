// The 2D overlay, painted on the #hud canvas above the 3D scene: the score,
// distance and lives while running, the progress bar to the forest, and the
// title, pause and end screens with their buttons. Buttons are hit-tested by
// the loop in logical 1280x720 coordinates.

import { FONT, PALETTE, RUN, VIEW } from './config.js';

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = PALETTE.hudPanel;
  ctx.strokeStyle = PALETTE.hudEdge;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 10);
  ctx.fill();
  ctx.stroke();
}

function heart(ctx, x, y, size, filled) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 16, size / 16);
  ctx.beginPath();
  ctx.moveTo(0, 5);
  ctx.bezierCurveTo(-9, -4, -4, -11, 0, -6);
  ctx.bezierCurveTo(4, -11, 9, -4, 0, 5);
  ctx.closePath();
  ctx.fillStyle = filled ? PALETTE.hudRed : 'rgba(255,255,255,0.25)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.restore();
}

/**
 * The flight HUD during a run: score, distance, lives, the forest progress
 * bar, the speed, and a warning when the farmer is closing in. `now` is the
 * clock in ms (performance.now() in play, a fixed shot time in screenshots)
 * so the flashing warning is deterministic in a staged shot.
 */
export function drawHud(ctx, state, muted, message, messageUntil, now) {
  const nowMs = now === undefined ? performance.now() : now;
  const s = state;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  // Top-left: score and distance.
  panel(ctx, 16, 14, 250, 74);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = `bold 26px ${FONT}`;
  ctx.fillText(`SCORE  ${Math.floor(s.score)}`, 32, 44);
  ctx.font = `18px ${FONT}`;
  ctx.fillStyle = 'rgba(255,243,216,0.85)';
  ctx.fillText(`${Math.floor(s.distance)} m  ·  corn ${s.cornEaten}`, 32, 70);

  // Top-right: lives as hearts, and the sound state.
  panel(ctx, VIEW.width - 216, 14, 200, 74);
  for (let i = 0; i < RUN.startLives; i += 1) {
    heart(ctx, VIEW.width - 188 + i * 40, 52, 26, i < s.lives);
  }
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = `bold 15px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText(muted ? 'SOUND OFF  (M)' : 'SOUND ON  (M)', VIEW.width - 116, 78);
  ctx.textAlign = 'left';

  // Top-centre: the run to the forest — a bar from the farmhouse to the gate.
  const barX = 320;
  const barW = VIEW.width - 640;
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = `bold 14px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('FARMHOUSE', barX + 44, 26);
  ctx.fillText('FOREST  ·  1000 m', barX + barW - 62, 26);
  panel(ctx, barX - 10, 30, barW + 20, 36);
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.beginPath();
  ctx.roundRect(barX, 42, barW, 14, 7);
  ctx.fill();
  const progress = Math.min(1, s.distance / RUN.winDistance);
  ctx.fillStyle = progress > 0.9 ? PALETTE.hudGreen : PALETTE.hudAmber;
  ctx.beginPath();
  ctx.roundRect(barX, 42, Math.max(14, barW * progress), 14, 7);
  ctx.fill();
  // The turkey's marker on the bar: a gold dot with a dark rim.
  const markerX = barX + Math.max(14, barW * progress);
  ctx.beginPath();
  ctx.arc(markerX, 49, 8, 0, Math.PI * 2);
  ctx.fillStyle = PALETTE.hudAmber;
  ctx.fill();
  ctx.strokeStyle = '#1a1200';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.textAlign = 'left';

  // Speed, bottom-left.
  ctx.fillStyle = 'rgba(255,243,216,0.9)';
  ctx.font = `bold 17px ${FONT}`;
  ctx.fillText(`${(s.speed * 3.6).toFixed(0)} km/h`, 24, VIEW.height - 22);

  // The farmer is close: a flashing warning across the top.
  if (s.farmerGap < 3.2 && !s.caught && !s.escaped) {
    const on = Math.floor(nowMs / 280) % 2 === 0;
    if (on) {
      ctx.fillStyle = PALETTE.hudRed;
      ctx.font = `bold 30px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.shadowColor = PALETTE.hudRed;
      ctx.shadowBlur = 16;
      ctx.fillText('THE FARMER IS RIGHT BEHIND YOU — RUN!', VIEW.width / 2, 128);
      ctx.shadowBlur = 0;
      ctx.textAlign = 'left';
    }
  }

  // A short-lived message line (corn streak, knife warning, stumble).
  if (message && nowMs < messageUntil) {
    ctx.fillStyle = PALETTE.hudAmber;
    ctx.font = `bold 22px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(message, VIEW.width / 2, 168);
    ctx.textAlign = 'left';
  }

  // Stumble flash: a red edge around the frame right after a hit.
  if (s.stumbleFlash > 0) {
    ctx.strokeStyle = `rgba(255,60,40,${Math.min(0.8, s.stumbleFlash)})`;
    ctx.lineWidth = 14;
    ctx.strokeRect(7, 7, VIEW.width - 14, VIEW.height - 14);
  }
}

/** A menu button, drawn on the HUD canvas and returned for hit-testing. */
export function drawButton(ctx, buttons, x, y, w, h, text, accent) {
  ctx.fillStyle = accent ? 'rgba(255, 180, 0, 0.92)' : 'rgba(20, 12, 8, 0.78)';
  ctx.strokeStyle = accent ? '#ffdf6b' : PALETTE.hudEdge;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 10);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = accent ? '#1a1200' : PALETTE.hudText;
  ctx.font = `bold 19px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText(text, x + w / 2, y + h / 2 + 7);
  ctx.textAlign = 'left';
  buttons.push({ x, y, w, h, label: text });
}

/** The title screen: the name, the stakes, the controls, one big button. */
export function drawTitleOverlay(ctx, buttons, best) {
  ctx.fillStyle = 'rgba(20, 8, 4, 0.32)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff3d8';
  ctx.font = `bold 62px ${FONT}`;
  ctx.shadowColor = 'rgba(60, 10, 0, 0.9)';
  ctx.shadowBlur = 18;
  ctx.fillText('THE GREAT TURKEY', VIEW.width / 2, 96);
  ctx.fillText('BREAKOUT', VIEW.width / 2, 158);
  ctx.shadowBlur = 0;
  ctx.fillStyle = PALETTE.hudAmber;
  ctx.font = `bold 22px ${FONT}`;
  ctx.fillText('Thanksgiving is coming. The oven is hot. RUN FOR THE FOREST.', VIEW.width / 2, 196);
  ctx.fillStyle = 'rgba(255,243,216,0.95)';
  ctx.font = '18px ' + FONT;
  ctx.fillText('Dodge the fences, hay bales and pumpkins — jump them or slip past.', VIEW.width / 2, 228);
  ctx.fillText('Never stop in the glowing oven’s lane. Mind the swinging carving knife.', VIEW.width / 2, 254);
  ctx.fillText('Grab the corn, outrun the farmer, and reach the forest gate at 1000 m.', VIEW.width / 2, 280);
  ctx.textAlign = 'left';
  // The button sits below the turkey, so the bird stays fully visible.
  drawButton(ctx, buttons, VIEW.width / 2 - 170, 520, 340, 60, '▶  START THE RUN', true);
  ctx.fillStyle = 'rgba(255,243,216,0.92)';
  ctx.font = '16px ' + FONT;
  ctx.textAlign = 'center';
  ctx.fillText('← →  or  A / D — change lane      SPACE — jump      P — pause      M — sound', VIEW.width / 2, 618);
  ctx.fillText('Mouse: click a lane to run there, click the buttons. Three lives — the farmer catches you on the third hit.', VIEW.width / 2, 644);
  if (best > 0) {
    ctx.fillStyle = PALETTE.hudAmber;
    ctx.font = `bold 18px ${FONT}`;
    ctx.fillText(`Best score this visit: ${best}`, VIEW.width / 2, 682);
  }
  ctx.textAlign = 'left';
}

/** The pause screen. */
export function drawPausedOverlay(ctx, buttons) {
  ctx.fillStyle = 'rgba(20, 8, 4, 0.55)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 46px ${FONT}`;
  ctx.fillText('PAUSED', VIEW.width / 2, 300);
  ctx.font = '18px ' + FONT;
  ctx.fillStyle = 'rgba(255,243,216,0.95)';
  ctx.fillText('P or Space to keep running   ·   R to restart the run', VIEW.width / 2, 340);
  ctx.textAlign = 'left';
  drawButton(ctx, buttons, VIEW.width / 2 - 110, 380, 220, 54, 'KEEP RUNNING', true);
}

/** An end screen: caught by the farmer, or escaped to the forest. */
export function drawEndOverlay(ctx, buttons, title, lines, accent) {
  ctx.fillStyle = 'rgba(20, 8, 4, 0.55)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = accent || '#ffffff';
  ctx.font = `bold 52px ${FONT}`;
  ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
  ctx.shadowBlur = 14;
  ctx.fillText(title, VIEW.width / 2, 208);
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255,243,216,0.97)';
  ctx.font = '20px ' + FONT;
  lines.forEach((line, i) => ctx.fillText(line, VIEW.width / 2, 258 + i * 34));
  ctx.textAlign = 'left';
  drawButton(ctx, buttons, VIEW.width / 2 - 270, 420, 250, 56, 'RUN AGAIN  (R)', true);
  drawButton(ctx, buttons, VIEW.width / 2 + 20, 420, 250, 56, 'BACK TO TITLE', false);
}
