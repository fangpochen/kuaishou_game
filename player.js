const { config } = require('./config.js');

// 初始化玩家对象
function initPlayerObject() {
  return {
    width: 60,
    height: 80,
    x: (config.width - 60) / 2,
    y: config.height - 120,
    speed: config.playerSpeed,
    moveDirection: 0,
    verticalDirection: 0,
    verticalSpeed: config.playerSpeed * 0.8,
    dashCooldown: 0,
    isDashing: false,
    dashDuration: 0,
    maxDashDuration: 500,
    dashSpeed: config.playerSpeed * 2,
    isVisible: true,
    waveSkill: {
      isActive: false,
      radius: 0,
      duration: 0,
      cooldown: 0,
      center: {x: 0, y: 0}
    },
    hitbox: {
      offsetX: 15,
      offsetY: 15,
      width: 30,
      height: 50
    }
  };
}

// 添加控制区域配置
function initControlAreas() {
  return {
    left: { x: 0, y: config.height - 200, width: config.width / 4, height: 100 },
    right: { x: config.width * 3/4, y: config.height - 200, width: config.width / 4, height: 100 },
    up: { x: config.width / 4, y: config.height - 200, width: config.width / 4, height: 100 },
    down: { x: config.width / 2, y: config.height - 200, width: config.width / 4, height: 100 },
    dashBtn: { x: config.width - 80, y: config.height - 80, radius: 30 },
    waveBtn: { x: config.width - 80, y: config.height - 160, radius: 30 }
  };
}

// 开始冲刺
function startDash(player) {
  if (player.dashCooldown <= 0) {
    player.isDashing = true;
    player.dashDuration = player.maxDashDuration;
    // 播放冲刺音效（可选）
    // playDashSound();
    return true;
  }
  return false;
}

// 使用发波技能
function useWaveSkill(player, score, showToast) {
  try {
    // 检查是否满足使用条件
    if (score < config.waveSkillRequiredScore) {
      // 分数不足，无法使用
      if (showToast) {
        showToast({
          title: `需要${config.waveSkillRequiredScore}分才能使用发波`,
          icon: 'none',
          duration: 1500
        });
      }
      return false;
    }
    
    // 检查冷却时间
    if (player.waveSkill.cooldown > 0) {
      // 技能冷却中
      if (showToast) {
        showToast({
          title: '技能冷却中',
          icon: 'none',
          duration: 1000
        });
      }
      return false;
    }
    
    // 设置发波状态
    player.waveSkill.isActive = true;
    player.waveSkill.radius = 0;
    player.waveSkill.duration = config.waveDuration;
    
    // 确保中心点对象已初始化并且值是数值
    if (!player.waveSkill.center) {
      player.waveSkill.center = {x: 0, y: 0};
    }
    
    player.waveSkill.center.x = player.x + player.width / 2;
    player.waveSkill.center.y = player.y + player.height / 2;
    
    console.log('发波技能激活，中心点:', player.waveSkill.center);
    
    // 播放发波音效（可选）
    // playWaveSound();
    
    return true;
  } catch(err) {
    console.error('使用发波技能出错:', err);
    return false;
  }
}

// 碰撞检测
function checkCollision(player, obstacle) {
  // 计算实际碰撞区域
  const hitboxX = player.x + player.hitbox.offsetX;
  const hitboxY = player.y + player.hitbox.offsetY;
  const hitboxWidth = player.hitbox.width;
  const hitboxHeight = player.hitbox.height;
  
  return hitboxX < obstacle.x + obstacle.width &&
         hitboxX + hitboxWidth > obstacle.x &&
         hitboxY < obstacle.y + obstacle.height &&
         hitboxY + hitboxHeight > obstacle.y;
}

// 使用 CommonJS 方式导出
module.exports = {
  initPlayerObject,
  initControlAreas,
  startDash,
  useWaveSkill,
  checkCollision
}; 