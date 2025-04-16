const { config } = require('./config.js');

// 创建障碍物
function createObstacle(obstacles, playerWidth) {
  // 确保玩家可以通过的最小空间
  const minGap = playerWidth + 40;  // 玩家宽度 + 额外空间
  
  // 随机生成1-3个障碍物
  const obstacleCount = Math.floor(Math.random() * 3) + 1;
  
  // 将屏幕划分为几个区域
  const sections = 4;
  const sectionWidth = config.width / sections;
  
  // 记录已使用的区域，避免重叠
  const usedSections = new Set();
  
  for (let i = 0; i < obstacleCount; i++) {
    // 随机选择一个未使用的区域
    let section;
    do {
      section = Math.floor(Math.random() * sections);
    } while (usedSections.has(section));
    usedSections.add(section);
    
    // 在选定区域内随机生成小怪
    const minWidth = 40;  // 最小宽度
    const maxWidth = 60;  // 最大宽度，保持小怪比例合适
    
    // 随机小怪尺寸
    const width = Math.random() * (maxWidth - minWidth) + minWidth;
    const height = width * 1.2; // 保持一定的宽高比
    
    // 在区域内随机位置
    const sectionStart = section * sectionWidth;
    const maxStartX = sectionStart + sectionWidth - width;
    const x = sectionStart + Math.random() * (maxStartX - sectionStart);
    
    // 创建小怪
    obstacles.push({
      x: x,
      y: -height,  // 从屏幕上方出现
      width: width,
      height: height,
      speed: 3 + Math.random() * 2,  // 随机速度变化
      type: Math.floor(Math.random() * 3),  // 小怪类型，可用于后续扩展不同小怪
      rotation: Math.random() * 0.1 - 0.05  // 小怪微微旋转，增加随机感
    });
  }
  
  // 确保至少有一个可通过的空间
  const gaps = findGaps(obstacles);
  if (!gaps.some(gap => gap >= minGap)) {
    // 如果没有足够大的空隙，移除一个随机障碍物
    const index = Math.floor(Math.random() * obstacles.length);
    obstacles.splice(index, 1);
  }
}

// 查找空隙的辅助方法
function findGaps(obstacles) {
  if (obstacles.length === 0) return [config.width];
  
  // 按x坐标排序障碍物
  const sorted = [...obstacles].sort((a, b) => a.x - b.x);
  const gaps = [];
  
  // 检查第一个障碍物前的空隙
  if (sorted[0].x > 0) {
    gaps.push(sorted[0].x);
  }
  
  // 检查障碍物之间的空隙
  for (let i = 0; i < sorted.length - 1; i++) {
    const gap = sorted[i + 1].x - (sorted[i].x + sorted[i].width);
    if (gap > 0) {
      gaps.push(gap);
    }
  }
  
  // 检查最后一个障碍物后的空隙
  const lastObstacle = sorted[sorted.length - 1];
  if (lastObstacle.x + lastObstacle.width < config.width) {
    gaps.push(config.width - (lastObstacle.x + lastObstacle.width));
  }
  
  return gaps;
}

// 检查发波与障碍物的碰撞
function checkWaveCollisions(player, obstacles, addDestroyEffect) {
  try {
    const wave = player.waveSkill;
    
    // 安全检查
    if (!wave || !wave.center || typeof wave.center.x !== 'number' || typeof wave.center.y !== 'number') {
      return obstacles;
    }
    
    // 创建一个新数组来存储未被销毁的障碍物
    const remainingObstacles = [];
    
    // 遍历所有障碍物
    for (let i = 0; i < obstacles.length; i++) {
      const obstacle = obstacles[i];
      
      // 计算障碍物中心点
      const obstacleX = obstacle.x + obstacle.width / 2;
      const obstacleY = obstacle.y + obstacle.height / 2;
      
      // 计算障碍物中心点到发波中心的距离
      const dx = obstacleX - wave.center.x;
      const dy = obstacleY - wave.center.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // 检查是否在发波范围内
      const waveInnerRadius = wave.radius - 15; // 内圈
      const waveOuterRadius = wave.radius + 15; // 外圈
      
      if (distance >= waveInnerRadius && distance <= waveOuterRadius) {
        // 障碍物被发波命中，销毁
        
        // 添加销毁效果
        if (addDestroyEffect) {
          addDestroyEffect(obstacle);
        }
        
        // 不将此障碍物添加到新数组中，相当于销毁它
      } else {
        // 障碍物未被命中，保留
        remainingObstacles.push(obstacle);
      }
    }
    
    // 返回更新后的障碍物数组
    return remainingObstacles;
  } catch(err) {
    console.error('检查波纹碰撞出错:', err);
    return obstacles; // 出错时返回原始数组
  }
}

// 添加障碍物销毁效果
function createDestroyEffect(obstacle) {
  // 创建爆炸效果
  const explosion = {
    x: obstacle.x + obstacle.width / 2,
    y: obstacle.y + obstacle.height / 2,
    radius: 10,
    maxRadius: 40,
    alpha: 1.0,
    color: '#ffff00',
    particles: []
  };
  
  // 生成爆炸粒子
  const particleCount = 10 + Math.floor(Math.random() * 10);
  for (let i = 0; i < particleCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 3;
    explosion.particles.push({
      x: explosion.x,
      y: explosion.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: 2 + Math.random() * 4,
      color: ['#ff0000', '#ff9900', '#ffff00'][Math.floor(Math.random() * 3)],
      alpha: 1.0,
      decay: 0.01 + Math.random() * 0.03
    });
  }
  
  return explosion;
}

// 更新并渲染爆炸效果
function updateExplosions(explosions, ctx) {
  if (!explosions || explosions.length === 0) return [];
  
  const remainingExplosions = [];
  
  // 遍历所有爆炸效果
  for (let i = 0; i < explosions.length; i++) {
    const explosion = explosions[i];
    
    // 更新爆炸圆圈
    explosion.radius += 2;
    explosion.alpha -= 0.05;
    
    // 如果爆炸效果还可见，继续渲染
    if (explosion.alpha > 0) {
      // 渲染爆炸圆圈
      ctx.globalAlpha = explosion.alpha;
      ctx.fillStyle = explosion.color;
      ctx.beginPath();
      ctx.arc(explosion.x, explosion.y, explosion.radius, 0, Math.PI * 2);
      ctx.fill();
      
      // 更新并渲染粒子
      for (let j = 0; j < explosion.particles.length; j++) {
        const particle = explosion.particles[j];
        
        // 更新粒子位置
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.alpha -= particle.decay;
        
        // 渲染粒子
        if (particle.alpha > 0) {
          ctx.globalAlpha = particle.alpha;
          ctx.fillStyle = particle.color;
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      
      // 保留此爆炸效果
      remainingExplosions.push(explosion);
    }
  }
  
  // 重置透明度
  ctx.globalAlpha = 1.0;
  
  // 返回更新后的爆炸效果数组
  return remainingExplosions;
}

// 使用 CommonJS 方式导出
module.exports = {
  createObstacle,
  findGaps,
  checkWaveCollisions,
  createDestroyEffect,
  updateExplosions
}; 