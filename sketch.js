import { HandLandmarker, FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

const state = {
  flowerCount: 10, 
  stemStyle: 'straight', richness: 1.0, theme: 'aurora', glow: 0.15, 
  flowers: [], butterflies: [], raindrops: [], seeds: [], ambient: [],
  handsData: [], isPinching: false, isOpenPalm: false, isFist: false, mouthOpen: false, faceData: null,
  twoHands: false, growthProgress: 0, w: window.innerWidth, h: window.innerHeight,
  
  bColors: [[255, 182, 193], [173, 216, 230], [255, 218, 185], [221, 160, 221], [144, 238, 144], [255, 228, 181], [176, 224, 230], [255, 192, 203], [238, 130, 238], [240, 230, 140]],
  
  palette: {
    aurora: { petal: [255, 240, 245], petal2: [255, 218, 230], stem: [180, 210, 180], bg: [5, 5, 8] }, 
    sunset: { petal: [255, 235, 220], petal2: [255, 210, 190], stem: [200, 190, 170], bg: [8, 4, 2] }, 
    sakura: { petal: [255, 230, 240], petal2: [250, 200, 220], stem: [190, 170, 170], bg: [8, 4, 6] }, 
    ocean:  { petal: [220, 250, 240], petal2: [180, 230, 220], stem: [150, 190, 180], bg: [2, 6, 8] }, 
    moon:   { petal: [245, 245, 255], petal2: [220, 220, 245], stem: [180, 180, 190], bg: [4, 4, 6] }, 
    fire:   { petal: [255, 240, 220], petal2: [255, 200, 180], stem: [190, 160, 140], bg: [8, 4, 2] }
  }
};

let handLandmarker = null, faceLandmarker = null, video = null, lastVideoTime = -1, bIndex = 0;
const videoEl = document.getElementById('inputVideo'), loadingEl = document.getElementById('loading'), statusEl = document.getElementById('status');

document.getElementById('flowerCount').value = state.flowerCount;
document.getElementById('flowerCount').addEventListener('input', e => { state.flowerCount = parseInt(e.target.value); resetFlowers(); });
document.getElementById('stemStyle').addEventListener('change', e => { state.stemStyle = e.target.value; state.flowers.forEach(f => f.stemStyle = state.stemStyle); });
document.getElementById('richness').addEventListener('input', e => { state.richness = parseFloat(e.target.value); });
document.getElementById('theme').addEventListener('change', e => { state.theme = e.target.value; state.flowers.forEach(f => applyTheme(f)); });
document.getElementById('glow').addEventListener('input', e => { state.glow = parseFloat(e.target.value); });
document.getElementById('toggleUI').addEventListener('click', () => document.getElementById('ui').classList.toggle('hidden'));
document.getElementById('fullscreen').addEventListener('click', () => { if (!document.fullscreenElement) document.documentElement.requestFullscreen(); else document.exitFullscreen(); });

const getPal = () => state.palette[state.theme] || state.palette.aurora;
function applyTheme(f) {
  const p = getPal(); 
  const jit = v => Math.max(0, Math.min(255, v + (Math.random() - 0.5) * 8)); 
  f.petalColor = [jit(p.petal[0]), jit(p.petal[1]), jit(p.petal[2])];
  f.petalColor2 = [jit(p.petal2[0]), jit(p.petal2[1]), jit(p.petal2[2])];
  f.stemColor = [jit(p.stem[0]), jit(p.stem[1]), jit(p.stem[2])];
  f.glowColor = p.petal.slice(); 
}

function createFlower(idx, customX = null) {
  const baseSpacing = state.w / (state.flowerCount + 1);
  const nominalX = (idx + 1) * baseSpacing;
  const jitterX = (Math.random() - 0.5) * (baseSpacing * 0.4); 
  
  let baseX = customX !== null ? customX : nominalX + jitterX;
  baseX = Math.max(40, Math.min(state.w - 40, baseX));

  const randH = 120 + Math.random() * 200; 
  const yOffset = (Math.random() - 0.5) * 30; 
  
  const f = {
    id: idx, 
    x: baseX, 
    y: state.h * 0.92 + yOffset, 
    targetH: randH * state.richness, 
    h: 0,
    // 【修改：花朵初始尺寸变大】
    scaleFactor: 1.2, 
    stemStyle: state.stemStyle === 'random' ? (Math.random() > 0.5 ? 'curved' : 'straight') : state.stemStyle, 
    curve: (Math.random() - 0.5) * 40, 
    layers: 2, 
    petalCount: 6 + Math.floor(Math.random() * 3 * state.richness), 
    // 【修改：花瓣基础尺寸变大】
    petalSize: 45 + Math.random() * 15 * state.richness, 
    bloom: 0, phase: Math.random() * Math.PI * 2, sway: Math.random() * Math.PI * 2
  };
  applyTheme(f); return f;
}

function resetFlowers() { 
  state.flowers = []; 
  for (let i = 0; i < state.flowerCount; i++) state.flowers.push(createFlower(i)); 
  state.flowers.sort((a, b) => a.y - b.y);
}

function initScene() {
  resetFlowers(); state.butterflies = []; state.raindrops = []; state.seeds = []; state.growthProgress = 0;
  for (let i = 0; i < 100; i++) state.ambient.push({ x: Math.random() * state.w, y: Math.random() * state.h, z: 0.2 + Math.random() * 0.8, r: 0.5 + Math.random() * 1.5, phase: Math.random() * 6.28, speed: 0.1 + Math.random() * 0.3 });
}

async function initMediaPipe() {
  try {
    const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm");
    handLandmarker = await HandLandmarker.createFromOptions(vision, { baseOptions: { modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task", delegate: "GPU" }, runningMode: "VIDEO", numHands: 2 });
    faceLandmarker = await FaceLandmarker.createFromOptions(vision, { baseOptions: { modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task", delegate: "GPU" }, runningMode: "VIDEO", numFaces: 1, outputFaceBlendshapes: true });
    startCamera();
  } catch (e) { statusEl.textContent = "模型加载失败"; loadingEl.classList.add('hide'); }
}

async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: "user" } });
    videoEl.srcObject = stream; await videoEl.play(); video = videoEl;
    loadingEl.classList.add('hide'); statusEl.textContent = "请将手放入画面"; detectLoop();
  } catch (e) { statusEl.textContent = "摄像头权限被拒绝"; loadingEl.classList.add('hide'); }
}

async function detectLoop() {
  if (!video) return requestAnimationFrame(detectLoop);
  const now = performance.now();
  if (video.readyState >= 2 && video.currentTime !== lastVideoTime) {
    lastVideoTime = video.currentTime;
    try {
      const hRes = handLandmarker.detectForVideo(video, now);
      state.handsData = hRes.landmarks || [];
      state.twoHands = state.handsData.length >= 2;
      state.isPinching = state.isOpenPalm = state.isFist = false;
      state.handsData.forEach(lm => {
        if (lm.length < 21) return;
        const pDist = (a, b) => Math.hypot(lm[a].x - lm[b].x, lm[a].y - lm[b].y);
        const pinch = pDist(4, 8) < 0.07, avgExt = (pDist(0, 8) + pDist(0, 12) + pDist(0, 16) + pDist(0, 20)) / 4;
        if (pinch) state.isPinching = true;
        if (avgExt > 0.25 && !pinch) state.isOpenPalm = true;
        if (avgExt < 0.18) state.isFist = true;
      });
    } catch (e) {}
    try {
      const fRes = faceLandmarker.detectForVideo(video, now);
      if (fRes.faceBlendshapes && fRes.faceBlendshapes.length > 0) {
        const jaw = fRes.faceBlendshapes[0].categories.find(c => c.categoryName === 'jawOpen');
        state.mouthOpen = jaw ? jaw.score > 0.35 : false;
        if (state.mouthOpen && fRes.faceLandmarks) {
          const lm = fRes.faceLandmarks[0];
          state.faceData = { x: (lm[13].x + lm[14].x) / 2, y: (lm[13].y + lm[14].y) / 2 };
        } else state.faceData = null;
      }
    } catch (e) {}
  }
  requestAnimationFrame(detectLoop);
}

new p5((p) => {
  p.setup = () => { p.createCanvas(state.w, state.h).parent(document.body); p.frameRate(60); initScene(); };
  p.windowResized = () => { 
    state.w = p.windowWidth; state.h = p.windowHeight; p.resizeCanvas(state.w, state.h); 
    state.flowers.forEach((f) => { f.y = state.h * 0.92 + (Math.random() - 0.5) * 30; });
    state.flowers.sort((a, b) => a.y - b.y); 
  };

  p.draw = () => {
    const pal = getPal();
    p.background(pal.bg[0], pal.bg[1], pal.bg[2]);
    
    p.noStroke();
    for (let i = 20; i >= 0; i--) {
      p.fill(pal.bg[0] + 5, pal.bg[1] + 8, pal.bg[2] + 12, (20 - i) * 0.3);
      p.circle(state.w / 2, state.h * 0.6, i * 100 + 500);
    }
    
    state.ambient.forEach(pt => {
      const x = (pt.x + Math.sin(p.millis() * 0.001 * pt.speed + pt.phase) * 20 + state.w) % state.w;
      const y = (pt.y - p.millis() * 0.004 * pt.z + state.h) % state.h;
      p.fill(200, 220, 255, 10 * pt.z); p.circle(x, y, pt.r * 2);
    });

    // 生长控制
    if (state.isOpenPalm && !state.isPinching) {
      const dt = p.deltaTime / 1000;
      // 【修改：整体生长进度变慢】
      state.growthProgress = Math.min(1, state.growthProgress + dt * 0.03); 
      state.flowers.forEach(f => { 
        const speedMod = 0.8 + (f.id % 5) * 0.1; 
        // 【修改：茎干生长变慢】
        f.h = p.lerp(f.h, f.targetH, 0.004 * speedMod); 
        // 【修改：绽放变慢】
        f.bloom = p.lerp(f.bloom, 1, 0.002); 
        // 【修改：最终放大目标变大】
        f.scaleFactor = p.lerp(f.scaleFactor, 1.8, 0.003); 
      });
    }

    // 渲染花朵
    state.flowers.forEach(f => {
      const t = p.millis() * 0.001;
      const sway = Math.sin(t * 1.5 + f.sway) * 2.5;
      const bx = f.x, by = f.y, h = f.h;
      
      const isCurved = f.stemStyle === 'curved';
      const hx = bx + (isCurved ? f.curve : 0) + sway; 
      const hy = by - h;

      p.noFill();
      p.stroke(f.stemColor[0] * 0.8, f.stemColor[1] * 0.8, f.stemColor[2] * 0.8, 200); p.strokeWeight(4);
      if (isCurved) {
        p.bezier(bx, by, bx + f.curve * 0.2, by - h * 0.4, bx + f.curve * 0.8, by - h * 0.7, hx, hy);
      } else {
        p.bezier(bx, by, bx + sway * 0.1, by - h * 0.4, bx + sway * 0.3, by - h * 0.7, hx, hy);
      }

      // 叶片
      if (h > 30) {
        for (let i = 0; i < 4; i++) {
          const lt = 0.15 + i * 0.2;
          const lx = isCurved ? p.bezierPoint(bx, bx + f.curve * 0.2, bx + f.curve * 0.8, hx, lt) : bx + sway * lt;
          const ly = p.bezierPoint(by, by - h * 0.4, by - h * 0.7, hy, lt);
          const dir = i % 2 === 0 ? 1 : -1;
          
          p.stroke(f.stemColor[0] * 0.9, f.stemColor[1] * 0.9, f.stemColor[2] * 0.9); p.strokeWeight(1.5);
          p.line(lx, ly, lx + dir * 15, ly - 6);
          
          p.noStroke(); p.fill(f.stemColor[0], f.stemColor[1], f.stemColor[2], 180);
          p.push(); p.translate(lx + dir * 13, ly - 5); p.rotate(dir * 0.6);
          p.ellipse(0, 0, 20 * f.scaleFactor, 7 * f.scaleFactor); p.pop();
        }
      }

      // 花头
      if (f.bloom > 0.02) {
        const pr = f.petalSize * f.bloom * f.scaleFactor;
        
        if (state.glow > 0.05) {
          p.noStroke();
          p.fill(f.glowColor[0], f.glowColor[1], f.glowColor[2], 15 * state.glow); 
          p.circle(hx, hy, pr * 3); 
        }
        
        for (let L = 1; L >= 0; L--) {
          const lr = pr * (0.75 + L * 0.3); 
          const pc = L === 0 ? f.petalColor2 : f.petalColor;
          p.fill(pc[0], pc[1], pc[2], 220);
          
          for (let i = 0; i < f.petalCount; i++) {
            const ang = (i / f.petalCount) * p.TWO_PI + f.phase + (L * 0.5) + t * 0.05;
            p.push(); p.translate(hx, hy); p.rotate(ang);
            
            p.beginShape();
            p.vertex(0, 0);
            p.bezierVertex(-lr * 0.4, -lr * 0.4, -lr * 0.4, -lr * 1.0, 0, -lr * 1.2);
            p.bezierVertex(lr * 0.4, -lr * 1.0, lr * 0.4, -lr * 0.4, 0, 0);
            p.endShape(); 
            p.pop();
          }
        }
        p.noStroke(); p.fill(255, 250, 220); p.circle(hx, hy, pr * 0.6);
        p.fill(255, 230, 180); p.circle(hx, hy, pr * 0.3);
      }
    });

    // 渲染蝴蝶 (更新后的优雅形状)
    state.butterflies.forEach(b => {
      if (Math.random() < 0.03) { b.vx += (Math.random() - 0.5) * 0.6; b.vy += (Math.random() - 0.5) * 0.6; }
      b.vx = p.constrain(b.vx, -3, 3); b.vy = p.constrain(b.vy, -3, 3);
      b.x += b.vx; b.y += b.vy; b.ph += 0.15; 
      
      if (b.x < -60) b.x = state.w + 60; if (b.x > state.w + 60) b.x = -60;
      if (b.y < -60) b.y = state.h + 60; if (b.y > state.h + 60) b.y = -60;

      const flap = Math.abs(Math.sin(b.ph)); 
      const wingScaleX = 0.15 + flap * 0.85; 
      const ws = b.size; 
      
      p.push(); 
      p.translate(b.x, b.y); 
      p.rotate(Math.atan2(b.vy, b.vx) + Math.PI / 2); 
      
      // 触角
      p.stroke(120, 120, 130, 180); 
      p.strokeWeight(1); 
      p.noFill();
      p.beginShape();
      p.vertex(0, -ws * 0.4);
      p.bezierVertex(-ws * 0.2, -ws * 0.7, -ws * 0.4, -ws * 0.8, -ws * 0.5, -ws * 0.7);
      p.endShape();
      p.beginShape();
      p.vertex(0, -ws * 0.4);
      p.bezierVertex(ws * 0.2, -ws * 0.7, ws * 0.4, -ws * 0.8, ws * 0.5, -ws * 0.7);
      p.endShape();

      // 翅膀
      p.noStroke();
      const cMain = p.color(b.c[0], b.c[1], b.c[2], 220);
      const cLight = p.color(Math.min(255, b.c[0] + 20), Math.min(255, b.c[1] + 20), Math.min(255, b.c[2] + 20), 200);

      // 左侧
      p.push();
      p.scale(wingScaleX, 1); 
      p.fill(cMain);
      p.beginShape();
      p.vertex(0, 0);
      p.bezierVertex(-ws * 0.6, -ws * 0.6, -ws * 1.2, -ws * 0.2, -ws * 0.6, ws * 0.1);
      p.bezierVertex(-ws * 0.9, ws * 0.5, -ws * 0.5, ws * 0.8, 0, ws * 0.3);
      p.endShape(p.CLOSE);
      p.fill(cLight);
      p.beginShape();
      p.vertex(0, 0);
      p.bezierVertex(-ws * 0.4, -ws * 0.4, -ws * 0.6, -ws * 0.1, -ws * 0.4, ws * 0.1);
      p.bezierVertex(-ws * 0.4, ws * 0.3, -ws * 0.2, ws * 0.4, 0, ws * 0.2);
      p.endShape(p.CLOSE);
      p.pop();

      // 右侧
      p.push();
      p.scale(wingScaleX, 1);
      p.fill(cMain);
      p.beginShape();
      p.vertex(0, 0);
      p.bezierVertex(ws * 0.6, -ws * 0.6, ws * 1.2, -ws * 0.2, ws * 0.6, ws * 0.1);
      p.bezierVertex(ws * 0.9, ws * 0.5, ws * 0.5, ws * 0.8, 0, ws * 0.3);
      p.endShape(p.CLOSE);
      p.fill(cLight);
      p.beginShape();
      p.vertex(0, 0);
      p.bezierVertex(ws * 0.4, -ws * 0.4, ws * 0.6, -ws * 0.1, ws * 0.4, ws * 0.1);
      p.bezierVertex(ws * 0.4, ws * 0.3, ws * 0.2, ws * 0.4, 0, ws * 0.2);
      p.endShape(p.CLOSE);
      p.pop();

      // 身体
      p.fill(80, 80, 90);
      p.ellipse(0, ws * 0.1, ws * 0.12, ws * 0.7);
      p.fill(100, 100, 110);
      p.ellipse(0, -ws * 0.25, ws * 0.15, ws * 0.35); 
      
      p.pop();
    });
    if (state.butterflies.length > 15) state.butterflies.splice(0, state.butterflies.length - 15);

    state.raindrops.forEach(r => {
      r.y += r.s; if (r.y > state.h + 20) { r.y = -20; r.x = Math.random() * state.w; }
      p.fill(200, 220, 255, 150); p.noStroke();
      p.beginShape(); p.vertex(r.x, r.y - 8);
      p.bezierVertex(r.x + 3, r.y - 4, r.x + 3, r.y + 4, r.x, r.y + 6);
      p.bezierVertex(r.x - 3, r.y + 4, r.x - 3, r.y - 4, r.x, r.y - 8);
      p.endShape();
    });

    p.noStroke();
    for (let i = state.seeds.length - 1; i >= 0; i--) {
      const s = state.seeds[i]; 
      s.x += s.vx; s.y += s.vy; s.vy += 0.4; s.life -= 0.015; 
      if (s.y >= state.h * 0.92 || s.life <= 0) { state.seeds.splice(i, 1); continue; }
      p.fill(220, 240, 180, 255 * s.life); p.circle(s.x, s.y, 4 * s.life);
    }

    state.handsData.forEach(lm => {
      p.fill(255, 255, 255, 60); 
      p.circle((1 - lm[8].x) * state.w, lm[8].y * state.h, 5);
      p.circle((1 - lm[4].x) * state.w, lm[4].y * state.h, 5);
    });

    const now = p.millis();
    if (state.isPinching && now - (p.lastSeed || 0) > 200) {
      p.lastSeed = now;
      const h = state.handsData.find(lm => Math.hypot(lm[4].x - lm[8].x, lm[4].y - lm[8].y) < 0.07);
      if (h) {
        const sx = (1 - ((h[4].x + h[8].x) / 2)) * state.w, sy = ((h[4].y + h[8].y) / 2) * state.h;
        state.seeds.push({ x: sx, y: sy, vx: (Math.random() - 0.5) * 2, vy: 0, life: 1 });
        
        if (state.flowers.length < 20) { 
          const offsetX = (Math.random() - 0.5) * 180; 
          const targetX = p.constrain(sx + offsetX, 40, state.w - 40);
          const nf = createFlower(state.flowers.length, targetX); 
          nf.y = state.h * 0.92 + (Math.random() - 0.5) * 30; 
          state.flowers.push(nf); 
          state.flowers.sort((a, b) => a.y - b.y); 
        }
      }
    }
    if (state.twoHands && now - (p.lastRain || 0) > 80) {
      p.lastRain = now; state.raindrops.push({ x: Math.random() * state.w, y: -20, s: 6 + Math.random() * 6 });
    }
    if (state.mouthOpen && state.faceData && now - (p.lastFly || 0) > 350) {
      p.lastFly = now;
      const c = state.bColors[bIndex % state.bColors.length]; bIndex++; 
      state.butterflies.push({ x: (1 - state.faceData.x) * state.w, y: state.faceData.y * state.h, vx: (Math.random() - 0.5) * 5, vy: (Math.random() - 0.5) * 5, size: 20 + Math.random() * 10, c: c, ph: 0 });
    }
    if (state.isFist && now - (p.lastClear || 0) > 1000) {
      p.lastClear = now; state.butterflies = []; state.raindrops = []; state.seeds = []; state.growthProgress = 0;
      // 【修改：重置为初始放大的尺寸】
      state.flowers.forEach(f => { f.h = 0; f.bloom = 0; f.scaleFactor = 1.2; });
    }

    let s = "👋 ";
    if (state.isFist) s += "握拳清空"; else if (state.isPinching) s += "捏合播种"; else if (state.twoHands) s += "双手下雨"; else if (state.mouthOpen) s += "张嘴蝴蝶"; else if (state.isOpenPalm) s += "张开手掌生长"; else s += "请将手放入画面";
    if (state.growthProgress > 0) s += " | 生长 " + Math.floor(state.growthProgress * 100) + "%";
    statusEl.textContent = s;
  };
});

window.addEventListener('load', () => { initMediaPipe(); });