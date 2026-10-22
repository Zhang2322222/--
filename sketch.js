    state.butterflies.forEach(b => {
      // 随机游走与物理限制
      if (Math.random() < 0.03) { b.vx += (Math.random() - 0.5) * 0.6; b.vy += (Math.random() - 0.5) * 0.6; }
      b.vx = p.constrain(b.vx, -3, 3); b.vy = p.constrain(b.vy, -3, 3);
      b.x += b.vx; b.y += b.vy; b.ph += 0.15; 
      
      // 屏幕边缘环绕
      if (b.x < -60) b.x = state.w + 60; if (b.x > state.w + 60) b.x = -60;
      if (b.y < -60) b.y = state.h + 60; if (b.y > state.h + 60) b.y = -60;

      // 计算翅膀扇动系数 (0 到 1 之间)
      const flap = Math.abs(Math.sin(b.ph)); 
      // 翅膀在水平方向上的透视压缩 (模拟侧向扇动)
      const wingScaleX = 0.15 + flap * 0.85; 
      const ws = b.size; 
      
      p.push(); 
      p.translate(b.x, b.y); 
      // 让蝴蝶朝向飞行的方向
      p.rotate(Math.atan2(b.vy, b.vx) + Math.PI / 2); 
      
      // 1. 绘制触角 (纤细的曲线)
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

      // 2. 绘制翅膀 (使用贝塞尔曲线绘制优雅的轮廓)
      p.noStroke();
      
      // 翅膀颜色：主色 + 半透明高光色
      const cMain = p.color(b.c[0], b.c[1], b.c[2], 220);
      const cLight = p.color(
        Math.min(255, b.c[0] + 20), 
        Math.min(255, b.c[1] + 20), 
        Math.min(255, b.c[2] + 20), 
        200
      );

      // --- 左侧翅膀 ---
      p.push();
      p.scale(wingScaleX, 1); // 扇动压缩
      p.fill(cMain);
      p.beginShape();
      p.vertex(0, 0);
      // 前翅 (上)
      p.bezierVertex(-ws * 0.6, -ws * 0.6, -ws * 1.2, -ws * 0.2, -ws * 0.6, ws * 0.1);
      // 后翅 (下)
      p.bezierVertex(-ws * 0.9, ws * 0.5, -ws * 0.5, ws * 0.8, 0, ws * 0.3);
      p.endShape(p.CLOSE);
      
      // 翅膀内部高光纹理
      p.fill(cLight);
      p.beginShape();
      p.vertex(0, 0);
      p.bezierVertex(-ws * 0.4, -ws * 0.4, -ws * 0.6, -ws * 0.1, -ws * 0.4, ws * 0.1);
      p.bezierVertex(-ws * 0.4, ws * 0.3, -ws * 0.2, ws * 0.4, 0, ws * 0.2);
      p.endShape(p.CLOSE);
      p.pop();

      // --- 右侧翅膀 ---
      p.push();
      p.scale(wingScaleX, 1);
      p.fill(cMain);
      p.beginShape();
      p.vertex(0, 0);
      // 前翅 (上)
      p.bezierVertex(ws * 0.6, -ws * 0.6, ws * 1.2, -ws * 0.2, ws * 0.6, ws * 0.1);
      // 后翅 (下)
      p.bezierVertex(ws * 0.9, ws * 0.5, ws * 0.5, ws * 0.8, 0, ws * 0.3);
      p.endShape(p.CLOSE);
      
      // 翅膀内部高光纹理
      p.fill(cLight);
      p.beginShape();
      p.vertex(0, 0);
      p.bezierVertex(ws * 0.4, -ws * 0.4, ws * 0.6, -ws * 0.1, ws * 0.4, ws * 0.1);
      p.bezierVertex(ws * 0.4, ws * 0.3, ws * 0.2, ws * 0.4, 0, ws * 0.2);
      p.endShape(p.CLOSE);
      p.pop();

      // 3. 绘制身体 (纤细且分节)
      p.fill(80, 80, 90);
      p.ellipse(0, ws * 0.1, ws * 0.12, ws * 0.7); // 腹部
      p.fill(100, 100, 110);
      p.ellipse(0, -ws * 0.25, ws * 0.15, ws * 0.35); // 胸部/头部
      
      p.pop();
    });