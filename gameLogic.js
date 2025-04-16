const { config } = require('./config.js');
const { checkCollision } = require('./player.js');
const { checkWaveCollisions, createObstacle } = require('./obstacles.js');

// 更新游戏状态
function update(gameState) {
  try {
    const { player, obstacles, explosions } = gameState;
    
    // 在启动界面、设置界面、游戏结束或暂停状态下不更新游戏逻辑
    if (gameState.isStartScreen || gameState.isLoading || gameState.isGameOver || 
        gameState.isSettingsScreen || gameState.isPaused) return gameState;

    // 处理复活倒计时
    if (gameState.isReviving) {
      gameState.reviveCountdown -= 16.67; // 假设60fps
      if (gameState.reviveCountdown <= 0) {
        // 复活完成应该在外部处理
      }
      return gameState;
    }
    
    // 更新冲刺状态
    if (player.dashCooldown > 0) {
      player.dashCooldown -= 16.67; // 假设60fps
    }
    
    if (player.isDashing) {
      player.dashDuration -= 16.67;
      if (player.dashDuration <= 0) {
        player.isDashing = false;
        player.dashCooldown = 1000; // 1秒冷却时间
      }
    }
    
    // 更新发波状态
    if (player.waveSkill.cooldown > 0) {
      player.waveSkill.cooldown -= 16.67;
    }
    
    if (player.waveSkill.isActive) {
      // 更新发波半径
      player.waveSkill.radius += config.waveSpeed;
      
      // 更新发波持续时间
      player.waveSkill.duration -= 16.67;
      
      // 检查发波是否结束
      if (player.waveSkill.duration <= 0 || 
          player.waveSkill.radius >= config.waveRadius) {
        player.waveSkill.isActive = false;
        player.waveSkill.cooldown = config.waveCooldown;
      } else {
        // 检查发波与障碍物的碰撞 - 这个函数需要在外部实现
        // 因为它可能会修改obstacles和score
      }
    }

    // 计算当前速度
    const currentSpeed = player.isDashing ? player.dashSpeed : player.speed;
    
    // 更新玩家水平位置
    const newX = player.x + (player.moveDirection * currentSpeed);
    player.x = Math.max(0, Math.min(config.width - player.width, newX));
    
    // 更新玩家垂直位置
    if (player.verticalDirection !== 0) {
      const verticalSpeed = player.isDashing ? player.dashSpeed : player.verticalSpeed;
      const newY = player.y + (player.verticalDirection * verticalSpeed);
      
      // 限制玩家不能超出屏幕顶部和底部
      const minY = 100; // 顶部最小距离
      const maxY = config.height - player.height - 20; // 底部最大距离
      player.y = Math.max(minY, Math.min(maxY, newY));
    }

    // 更新障碍物
    const remainingObstacles = [];
    let scoreIncrease = 0;
    
    for (let i = 0; i < obstacles.length; i++) {
      const obstacle = obstacles[i];
      obstacle.y += obstacle.speed;  // 向下移动
      
      // 移除超出屏幕的障碍物
      if (obstacle.y > config.height) {
        if (i % 2 === 0) {  // 只在移除一组障碍物的第一个时加分
          scoreIncrease++;
        }
      } else {
        remainingObstacles.push(obstacle);
        
        // 碰撞检测
        if (checkCollision(player, obstacle)) {
          return { ...gameState, obstacles: remainingObstacles, collisionDetected: true };
        }
      }
    }
    
    // 更新分数
    gameState.score += scoreIncrease;
    
    // 更新障碍物数组
    gameState.obstacles = remainingObstacles;

    // 定期生成新障碍物
    if (remainingObstacles.length < 6) {  // 保持场上障碍物数量
      createObstacle(gameState.obstacles, player.width);
    }
    
    return gameState;
  } catch (e) {
    console.error('游戏更新错误:', e);
    return gameState; // 出错时返回原状态
  }
}

// 游戏结束处理
function handleGameOver(gameState) {
  if (gameState.lives > 0) {
    gameState.lives--;
    if (gameState.lives > 0) {
      // 标记为需要开始复活过程
      return { ...gameState, shouldStartRevive: true };
    }
  }
  
  // 真正游戏结束
  gameState.isGameOver = true;
  
  // 保存最高分数到本地
  try {
    const highScore = kwaigame.getStorageSync('highScore') || 0;
    if (gameState.score > highScore) {
      kwaigame.setStorageSync('highScore', gameState.score);
    }
  } catch (e) {
    console.error('保存最高分失败:', e);
  }
  
  // 显示游戏结束提示
  try {
    kwaigame.showToast({
      title: '游戏结束,得分:' + gameState.score,
      icon: 'none',
      duration: 2000
    });
  } catch (e) {
    console.error('显示游戏结束提示失败:', e);
  }
  
  return gameState;
}

// 开始复活流程
function startRevive(gameState) {
  gameState.isReviving = true;
  gameState.reviveCountdown = config.reviveDelay;
  gameState.player.isVisible = false;
  
  // 清除当前所有障碍物
  gameState.obstacles = [];
  
  // 重置玩家位置
  gameState.player.x = (config.width - gameState.player.width) / 2;
  
  return gameState;
}

// 完成复活
function completeRevive(gameState) {
  // 修改为根据观看广告状态决定是否复活
  if (gameState.reviveAd && !gameState.hasWatchedAd) {
    // 如果有广告但未观看，不执行后续复活逻辑
    return gameState;
  }
  
  // 重置广告观看状态
  gameState.hasWatchedAd = false;
  
  // 结束复活状态
  gameState.isReviving = false;
  gameState.player.isVisible = true;
  gameState.reviveCountdown = 0;
  
  // 恢复一条生命
  gameState.lives = 1;
  // 重置游戏结束状态
  gameState.isGameOver = false;
  
  // 重置玩家位置到屏幕中央底部
  gameState.player.x = (config.width - gameState.player.width) / 2;
  gameState.player.y = config.height - 120;
  
  return gameState;
}

// 重生玩家
function revivePlayer(gameState) {
  // 恢复一条生命
  gameState.lives = 1;
  // 重置游戏结束状态
  gameState.isGameOver = false;
  
  // 重要：让玩家可见而不是重新启动复活过程
  gameState.isReviving = false;
  gameState.player.isVisible = true;
  
  // 重置玩家位置到屏幕中央底部
  gameState.player.x = (config.width - gameState.player.width) / 2;
  gameState.player.y = config.height - 120;
  
  return gameState;
}

// 重置游戏
function resetGame(gameState) {
  return {
    ...gameState,
    score: 0,
    isGameOver: false,
    lives: config.maxLives,
    isReviving: false,
    reviveCountdown: 0,
    obstacles: [],
    player: {
      ...gameState.player,
      x: (config.width - gameState.player.width) / 2,
      y: config.height - 120,
      moveDirection: 0,
      verticalDirection: 0,
      isDashing: false,
      dashCooldown: 0,
      waveSkill: {
        isActive: false,
        radius: 0,
        duration: 0,
        cooldown: 0,
        center: {x: 0, y: 0}
      },
      isVisible: true
    },
    explosions: []
  };
}

// 返回启动界面
function backToStartScreen(gameState) {
  const newState = resetGame(gameState);
  newState.isStartScreen = true;
  newState.isPaused = true; // 设置为暂停状态
  return newState;
}

// 更新启动界面特效
function updateStartScreenEffects(effects) {
  // 更新标题缩放
  effects.titleScale += effects.titleScaleDirection;
  if (effects.titleScale > 1.05) {
    effects.titleScaleDirection = -0.001;
  } else if (effects.titleScale < 0.95) {
    effects.titleScaleDirection = 0.001;
  }
  
  // 初始化粒子
  if (effects.particles.length === 0) {
    for (let i = 0; i < effects.particleCount; i++) {
      effects.particles.push({
        x: Math.random() * config.width,
        y: Math.random() * config.height,
        size: 2 + Math.random() * 3,
        speedX: Math.random() * 2 - 1,
        speedY: Math.random() * 2 - 1,
        color: ['#4285f4', '#ea4335', '#fbbc05', '#34a853'][Math.floor(Math.random() * 4)]
      });
    }
  }
  
  // 更新粒子位置
  for (let i = 0; i < effects.particles.length; i++) {
    const particle = effects.particles[i];
    
    particle.x += particle.speedX;
    particle.y += particle.speedY;
    
    // 边界检查
    if (particle.x < 0) particle.x = config.width;
    if (particle.x > config.width) particle.x = 0;
    if (particle.y < 0) particle.y = config.height;
    if (particle.y > config.height) particle.y = 0;
  }
  
  return effects;
}

// 使用 CommonJS 方式导出
module.exports = {
  update,
  handleGameOver,
  startRevive,
  completeRevive,
  revivePlayer,
  resetGame,
  backToStartScreen,
  updateStartScreenEffects
}; 