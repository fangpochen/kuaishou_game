const { config } = require('./config.js');
const { renderWaveEffect } = require('./ui.js');

// 渲染游戏界面
function renderGame(ctx, gameState) {
  const { player, obstacles, explosions, ui, lives, score, isReviving, reviveCountdown, isGameOver } = gameState;
  
  ctx.clearRect(0, 0, config.width, config.height);
  
  // 设置背景色
  ctx.fillStyle = '#FFFFE0'; // 淡黄色
  ctx.fillRect(0, 0, config.width, config.height);
  
  // 绘制发波效果（在障碍物下方）
  if (player.waveSkill.isActive) {
    renderWaveEffect(ctx, player.waveSkill);
  }
  
  // 绘制生命值
  ctx.fillStyle = '#ff0000';
  for (let i = 0; i < lives; i++) {
    ctx.fillRect(
      20 + i * 30,
      70,
      20,
      20
    );
  }
  
  // 绘制障碍物
  renderObstacles(ctx, obstacles, gameState.enemyImage, gameState.enemyImageLoaded);
  
  // 只在非复活状态下绘制玩家
  if (player.isVisible) {
    renderPlayer(ctx, player, gameState.playerImage, gameState.playerImageLoaded);
  }
  
  // 绘制游戏控制UI
  renderGameControls(ctx, gameState);
  
  // 绘制分数
  ctx.fillStyle = '#000000';
  ctx.font = '20px Arial';
  ctx.fillText(`得分: ${score}`, 20, 40);
  
  // 绘制复活倒计时
  if (isReviving) {
    renderReviveCountdown(ctx, reviveCountdown);
  }
  
  // 绘制游戏结束界面
  if (isGameOver) {
    renderGameOver(ctx, gameState);
  }
}

// 渲染障碍物
function renderObstacles(ctx, obstacles, enemyImage, enemyImageLoaded) {
  ctx.fillStyle = '#ea4335';
  obstacles.forEach(obstacle => {
    // 保存当前绘图状态
    ctx.save();
    
    // 设置旋转中心点为小怪中心
    ctx.translate(
      obstacle.x + obstacle.width / 2,
      obstacle.y + obstacle.height / 2
    );
    
    // 应用旋转效果
    if (obstacle.rotation) {
      // 随着小怪下落，旋转角度增加
      const rotationAngle = obstacle.rotation * Math.sin(Date.now() / 500);
      ctx.rotate(rotationAngle);
    }
    
    // 绘制小怪，优先使用图片，否则使用方块
    if (enemyImageLoaded && enemyImage) {
      ctx.drawImage(
        enemyImage,
        -obstacle.width / 2,
        -obstacle.height / 2,
        obstacle.width,
        obstacle.height
      );
    } else {
      // 绘制备用方块
      ctx.fillStyle = '#ea4335'; // 保留备用颜色
      ctx.fillRect(
        -obstacle.width / 2,
        -obstacle.height / 2,
        obstacle.width,
        obstacle.height
      );
    }
    
    // 恢复绘图状态
    ctx.restore();
  });
}

// 渲染玩家
function renderPlayer(ctx, player, playerImage, playerImageLoaded) {
  // 优先使用图片绘制玩家，否则使用蓝色方块
  if (playerImageLoaded && playerImage) {
    ctx.drawImage(
      playerImage,
      player.x,
      player.y,
      player.width,
      player.height
    );
  } else {
    // 绘制备用方块
    ctx.fillStyle = '#4285f4'; // 保留备用颜色
    ctx.fillRect(
      player.x,
      player.y,
      player.width,
      player.height
    );
  }
  
  // 绘制冲刺特效（如果正在冲刺）
  if (player.isDashing) {
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#00ffff';
    // 绘制冲刺轨迹
    ctx.beginPath();
    ctx.moveTo(player.x + player.width/2, player.y + player.height);
    ctx.lineTo(player.x, player.y + player.height + 20);
    ctx.lineTo(player.x + player.width, player.y + player.height + 20);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1.0;
  }
}

// 绘制游戏控制UI
function renderGameControls(ctx, gameState) {
  const { controlAreas, player, score } = gameState;
  
  // 绘制半透明控制区域
  ctx.globalAlpha = 0.2;
  
  // 左移按钮
  ctx.fillStyle = '#ff0000';
  ctx.fillRect(
    controlAreas.left.x,
    controlAreas.left.y,
    controlAreas.left.width,
    controlAreas.left.height
  );
  
  // 右移按钮
  ctx.fillStyle = '#00ff00';
  ctx.fillRect(
    controlAreas.right.x,
    controlAreas.right.y,
    controlAreas.right.width,
    controlAreas.right.height
  );
  
  // 前进按钮
  ctx.fillStyle = '#0000ff';
  ctx.fillRect(
    controlAreas.up.x,
    controlAreas.up.y,
    controlAreas.up.width,
    controlAreas.up.height
  );
  
  // 后退按钮
  ctx.fillStyle = '#9900cc';
  ctx.fillRect(
    controlAreas.down.x,
    controlAreas.down.y,
    controlAreas.down.width,
    controlAreas.down.height
  );
  
  // 冲刺按钮
  ctx.fillStyle = '#ffff00';
  ctx.beginPath();
  ctx.arc(
    controlAreas.dashBtn.x,
    controlAreas.dashBtn.y,
    controlAreas.dashBtn.radius,
    0,
    Math.PI * 2
  );
  ctx.fill();
  
  // 发波按钮
  ctx.fillStyle = '#00ffff';
  ctx.beginPath();
  ctx.arc(
    controlAreas.waveBtn.x,
    controlAreas.waveBtn.y,
    controlAreas.waveBtn.radius,
    0,
    Math.PI * 2
  );
  ctx.fill();
  
  // 恢复透明度
  ctx.globalAlpha = 1.0;
  
  // 添加控制文字提示
  ctx.fillStyle = '#ffffff';
  ctx.font = '18px Arial';
  ctx.fillText('←', controlAreas.left.x + controlAreas.left.width/2 - 8, controlAreas.left.y + controlAreas.left.height/2 + 6);
  ctx.fillText('→', controlAreas.right.x + controlAreas.right.width/2 - 8, controlAreas.right.y + controlAreas.right.height/2 + 6);
  ctx.fillText('↑', controlAreas.up.x + controlAreas.up.width/2 - 8, controlAreas.up.y + controlAreas.up.height/2 + 6);
  ctx.fillText('↓', controlAreas.down.x + controlAreas.down.width/2 - 8, controlAreas.down.y + controlAreas.down.height/2 + 6);
  
  // 冲刺按钮文字
  ctx.fillStyle = '#000000';
  ctx.font = '16px Arial';
  ctx.fillText('冲!', controlAreas.dashBtn.x - 12, controlAreas.dashBtn.y + 6);
  
  // 发波按钮文字
  ctx.fillStyle = '#000000';
  ctx.font = '16px Arial';
  ctx.fillText('波!', controlAreas.waveBtn.x - 12, controlAreas.waveBtn.y + 6);
  
  // 如果冲刺在冷却中，显示冷却进度
  if (player.dashCooldown > 0) {
    const cooldownPercent = player.dashCooldown / 1000;
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = '#888888';
    ctx.beginPath();
    ctx.moveTo(controlAreas.dashBtn.x, controlAreas.dashBtn.y);
    ctx.arc(
      controlAreas.dashBtn.x,
      controlAreas.dashBtn.y,
      controlAreas.dashBtn.radius,
      -Math.PI/2,
      -Math.PI/2 + cooldownPercent * Math.PI * 2,
      false
    );
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1.0;
  }
  
  // 如果发波在冷却中，显示冷却进度
  if (player.waveSkill.cooldown > 0) {
    const cooldownPercent = player.waveSkill.cooldown / config.waveCooldown;
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = '#888888';
    ctx.beginPath();
    ctx.moveTo(controlAreas.waveBtn.x, controlAreas.waveBtn.y);
    ctx.arc(
      controlAreas.waveBtn.x,
      controlAreas.waveBtn.y,
      controlAreas.waveBtn.radius,
      -Math.PI/2,
      -Math.PI/2 + cooldownPercent * Math.PI * 2,
      false
    );
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1.0;
  }
  
  // 显示发波所需分数
  if (score < config.waveSkillRequiredScore) {
    ctx.fillStyle = '#ff0000';
    ctx.font = '14px Arial';
    ctx.fillText(
      `需要${config.waveSkillRequiredScore}分`,
      controlAreas.waveBtn.x - 40,
      controlAreas.waveBtn.y - 20
    );
  }
}

// 绘制复活倒计时
function renderReviveCountdown(ctx, reviveCountdown) {
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(0, 0, config.width, config.height);
  ctx.fillStyle = '#ffffff';
  ctx.font = '40px Arial';
  ctx.fillText(
    `复活倒计时: ${Math.ceil(reviveCountdown / 1000)}`,
    config.width/2 - 120,
    config.height/2
  );
}

// 绘制游戏结束界面
function renderGameOver(ctx, gameState) {
  const { score, restartBtn } = gameState;
  
  // 半透明背景
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(0, 0, config.width, config.height);

  // 游戏结束文字
  ctx.fillStyle = '#ffffff';
  ctx.font = '40px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('游戏结束', config.width/2, config.height/2 - 60);

  // 显示最终得分
  ctx.font = '24px Arial';
  ctx.fillText(
    `最终得分: ${score}`,
    config.width/2,
    config.height/2 - 20
  );
  
  // 获取历史最高分
  const highScore = kwaigame.getStorageSync('highScore') || 0;
  ctx.fillText(
    `历史最高分: ${highScore}`,
    config.width/2,
    config.height/2 + 20
  );
  
  // 绘制重新开始按钮
  ctx.fillStyle = '#4285f4';
  ctx.fillRect(
    restartBtn.x,
    restartBtn.y,
    restartBtn.width,
    restartBtn.height
  );
  
  // 按钮文字
  ctx.fillStyle = '#ffffff';
  ctx.font = '24px Arial';
  ctx.fillText(
    '重新开始',
    config.width/2,
    restartBtn.y + 35
  );
  
  // 绘制返回主菜单按钮
  const menuBtnY = restartBtn.y + restartBtn.height + 20;
  ctx.fillStyle = '#34a853';
  ctx.fillRect(
    restartBtn.x,
    menuBtnY,
    restartBtn.width,
    restartBtn.height
  );
  
  // 按钮文字 - 重生按钮
  ctx.fillStyle = '#ffffff';
  ctx.font = '22px Arial';
  ctx.fillText(
    '重生',
    config.width/2 - 25,
    menuBtnY + 32
  );
  
  // 重置文本对齐
  ctx.textAlign = 'start';
}

// 渲染加载界面
function renderLoadingScreen(ctx, loadingProgress, loadingStartTime) {
  // 清除画布
  ctx.clearRect(0, 0, config.width, config.height);
  
  // 确保加载进度不超过100%
  loadingProgress = Math.min(loadingProgress, 100);
  
  // 绘制背景
  ctx.fillStyle = '#f0f0f0';
  ctx.fillRect(0, 0, config.width, config.height);
  
  // 绘制加载进度条背景
  const barWidth = 200;
  const barHeight = 20;
  const barX = (config.width - barWidth) / 2;
  const barY = config.height / 2;
  
  ctx.fillStyle = '#dddddd';
  ctx.fillRect(barX, barY, barWidth, barHeight);
  
  // 绘制进度条
  const progressWidth = (loadingProgress / 100) * barWidth;
  ctx.fillStyle = '#4285f4';
  ctx.fillRect(barX, barY, progressWidth, barHeight);
  
  // 绘制进度文字
  ctx.fillStyle = '#333333';
  ctx.font = '18px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(
    `加载中... ${Math.floor(loadingProgress)}%`, 
    config.width / 2, 
    barY - 20
  );
  
  // 如果加载卡住，显示提示
  if (loadingProgress >= 60 && loadingProgress < 100) {
    ctx.fillStyle = '#666666';
    ctx.font = '14px Arial';
    ctx.fillText(
      '首次加载可能较慢，请耐心等待', 
      config.width / 2, 
      barY + 50
    );
  }
  
  // 如果加载卡在80%以上较长时间，显示额外信息
  if (loadingProgress >= 90 && Date.now() - loadingStartTime > 5000) {
    ctx.fillStyle = '#e74c3c';
    ctx.fillText(
      '正在优化游戏资源，请再等一下...', 
      config.width / 2, 
      barY + 80
    );
  }
  
  // 重置文本对齐
  ctx.textAlign = 'start';
}

// 渲染启动界面
function renderStartScreen(ctx, gameState) {
  const { 
    gameTitle, startBtn, settingsBtn, 
    startScreenEffects, width, height } = gameState;
  
  // 清空画布
  ctx.clearRect(0, 0, width, height);
  
  // 绘制背景
  ctx.fillStyle = '#f0f0f0';
  ctx.fillRect(0, 0, width, height);
  
  // 渲染粒子效果
  renderStartScreenParticles(ctx, startScreenEffects.particles);
  
  // 绘制游戏标题（带缩放效果）
  ctx.save();
  ctx.fillStyle = gameTitle.color;
  ctx.font = gameTitle.font;
  ctx.textAlign = 'center';
  ctx.translate(gameTitle.x, gameTitle.y);
  ctx.scale(startScreenEffects.titleScale, startScreenEffects.titleScale);
  ctx.fillText(gameTitle.text, 0, 0);
  ctx.restore();
  
  // 绘制副标题
  ctx.fillStyle = '#333333';
  ctx.font = '18px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('冲刺、闪避、发波，成为最强战士！', width/2, gameTitle.y + 40);
  
  // 获取当前时间用于按钮脉动效果
  const btnPulse = Math.sin(Date.now() / 300) * 0.05 + 1;
  
  // 绘制开始按钮（带脉动效果）
  ctx.save();
  ctx.translate(
    startBtn.x + startBtn.width/2, 
    startBtn.y + startBtn.height/2
  );
  ctx.scale(btnPulse, btnPulse);
  ctx.fillStyle = '#4285f4';
  ctx.fillRect(
    -startBtn.width/2,
    -startBtn.height/2,
    startBtn.width,
    startBtn.height
  );
  
  // 绘制按钮文字
  ctx.fillStyle = '#ffffff';
  ctx.font = '24px Arial';
  ctx.fillText(
    startBtn.text,
    0,
    8 // 垂直居中调整
  );
  ctx.restore();
  
  // 绘制设置按钮
  ctx.fillStyle = '#34a853'; // 绿色
  ctx.fillRect(
    settingsBtn.x,
    settingsBtn.y,
    settingsBtn.width,
    settingsBtn.height
  );
  
  ctx.fillStyle = '#ffffff';
  ctx.font = '16px Arial';
  ctx.textAlign = 'left';
  ctx.fillText(
    settingsBtn.text,
    settingsBtn.x + 20,
    settingsBtn.y + 25
  );
  
  // 绘制小提示
  ctx.fillStyle = '#666666';
  ctx.font = '14px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('点击按钮开始游戏', width/2, startBtn.y + startBtn.height + 30);
  
  // 添加软著号和著作权人信息
  ctx.fillStyle = '#333333';
  ctx.font = '12px Arial';
  ctx.fillText(
    '软著号: 2024SR00063813',
    width/2, 
    height - 100
  );
  ctx.fillText(
    '著作权人: 王鑫源',
    width/2, 
    height - 80
  );
  
  // 添加健康游戏忠告
  ctx.fillStyle = '#e74c3c'; // 使用醒目的红色
  ctx.font = '12px Arial';
  ctx.fillText(
    '健康游戏忠告：抵制不良游戏，拒绝盗版游戏。注意自我保护，谨防受骗上当。',
    width/2, 
    height - 60
  );
  ctx.fillText(
    '适度游戏益脑，沉迷游戏伤身。合理安排时间，享受健康生活。',
    width/2, 
    height - 40
  );
  
  // 恢复文本对齐默认值
  ctx.textAlign = 'start';
}

// 渲染启动界面粒子
function renderStartScreenParticles(ctx, particles) {
  for (let i = 0; i < particles.length; i++) {
    const particle = particles[i];
    
    ctx.fillStyle = particle.color;
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fill();
  }
  
  ctx.globalAlpha = 1.0;
}

// 使用 CommonJS 方式导出
module.exports = {
  renderGame,
  renderObstacles,
  renderPlayer,
  renderGameControls,
  renderReviveCountdown,
  renderGameOver,
  renderLoadingScreen,
  renderStartScreen,
  renderStartScreenParticles
}; 