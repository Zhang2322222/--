function createFlower(idx, customX = null) {
  // ... 前面的代码保持不变 ...

  const f = {
    id: idx, 
    x: baseX, 
    y: state.h * 0.92 + yOffset, 
    targetH: randH * state.richness, 
    h: 0,
    // 【修改 1】将初始缩放从 0.85 调大到 1.1，让刚长出来的花苞就显眼
    scaleFactor: 1.1, 
    stemStyle: state.stemStyle === 'random' ? (Math.random() > 0.5 ? 'curved' : 'straight') : state.stemStyle, 
    curve: (Math.random() - 0.5) * 40, 
    layers: 2, 
    petalCount: 6 + Math.floor(Math.random() * 3 * state.richness), 
    // 【修改 2】将基础花瓣尺寸从 25~35 提高到 45~60，尺寸几乎翻倍
    petalSize: 45 + Math.random() * 15 * state.richness, 
    bloom: 0, phase: Math.random() * Math.PI * 2, sway: Math.random() * Math.PI * 2
  };
  applyTheme(f); return f;
}