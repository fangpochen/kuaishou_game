console.log('使用快手开发者工具开发过程中可以参考以下文档:');
console.log(
  'https://dev.kuaishou.com/game/guide/introduction',
);

// 游戏主要配置
const config = {
  width: 375,  // 适配手机屏幕
  height: 667,
  backgroundColor: '#ffffff',
  playerSpeed: 8,
  maxLives: 3,  // 最大复活次数
  reviveDelay: 2000,  // 复活等待时间(毫秒)
  sidebarReward: 100,  // 侧边栏奖励分数
  waveSkillRequiredScore: 10, // 使用发波所需的分数
  waveRadius: 100,    // 发波最大半径
  waveSpeed: 5,       // 发波扩散速度
  waveDuration: 1000, // 发波持续时间(毫秒)
  waveCooldown: 3000  // 发波冷却时间(毫秒)
};

class Game {
  constructor() {
    // 游戏加载标志
    this.isLoading = true;
    this.loadingProgress = 0;
    this.loadingStartTime = Date.now();
    this.lastLoggedProgress = 0; // 初始化日志记录进度
    this.timeAt90Percent = 0;    // 初始化90%进度的时间戳
    
    console.log(`[游戏初始化] 开始初始化游戏，时间戳: ${Date.now()}`);
    
    // 获取系统信息以适配屏幕
    try {
      const systemInfo = kwaigame.getSystemInfoSync();
      console.log(`[游戏初始化] 获取系统信息: width=${systemInfo.windowWidth}, height=${systemInfo.windowHeight}`);
      
      this.canvas = kwaigame.createCanvas();
      this.ctx = this.canvas.getContext('2d');
      
      // 设置画布尺寸为屏幕大小
      this.canvas.width = systemInfo.windowWidth;
      this.canvas.height = systemInfo.windowHeight;
      
      // 更新配置尺寸
      config.width = systemInfo.windowWidth;
      config.height = systemInfo.windowHeight;
      console.log(`[游戏初始化] 画布和配置尺寸设置完成: ${config.width}x${config.height}`);
    } catch (e) {
      console.error('[游戏初始化] 初始化画布失败:', e);
    }
    
    // 游戏状态
    this.isStartScreen = true; // 是否显示启动界面
    this.score = 0;
    this.isGameOver = false;
    this.lives = config.maxLives;
    this.isReviving = false;
    this.reviveCountdown = 0;
    
    // 侧边栏相关状态 - 直接设置为禁用
    this.isFromSidebar = false;
    this.sidebarEnabled = false; // 禁用侧边栏功能
    this.sidebarRewardAvailable = false;
    this.lastRewardTime = 0;
    
    // 加载本地存储设置
    try {
      this.lastRewardTime = kwaigame.getStorageSync('lastRewardTime') || 0;
    } catch (e) {
      console.error('[游戏初始化] 读取本地存储失败:', e);
    }
    
    // 初始化障碍物数组
    this.obstacles = [];
    
    // 爆炸效果数组
    this.explosions = [];
    
    // 启动界面动画效果参数
    this.startScreenEffects = {
      particles: [],
      particleCount: 50,
      titleScale: 1,
      titleScaleDirection: 0.001,
      btnPulse: 0,
      timestamp: Date.now()
    };
    
    // 启动界面按钮
    this.startBtn = {
      x: config.width/2 - 100,
      y: config.height/2 + 50,
      width: 200,
      height: 60,
      text: '开始游戏'
    };
    
    // 游戏标题
    this.gameTitle = {
      text: '无敌冲刺大乱斗',
      x: config.width/2,
      y: config.height/2 - 50,
      font: '36px Arial',
      color: '#4285f4'
    };
    
    // 初始化UI配置
    // 重新开始按钮
    this.restartBtn = {
      x: config.width/2 - 80,
      y: config.height/2 + 80,
      width: 160,
      height: 50
    };
    
    // 侧边栏相关按钮
    this.sidebarBtn = {
      x: 20,
      y: 120,
      width: 100,
      height: 40,
      text: '入口有礼'
    };
    
    this.gotoSidebarBtn = {
      x: config.width - 120,
      y: 120,
      width: 100,
      height: 40,
      text: '去侧边栏'
    };
    
    this.getRewardBtn = {
      x: config.width - 120,
      y: 120,
      width: 100,
      height: 40,
      text: '领取奖励'
    };
    
    // 分享按钮
    this.shareBtn = {
      x: config.width - 120,
      y: 70,
      width: 100,
      height: 40,
      text: '分享游戏'
    };
    
    // 对话框配置
    this.sidebarDialog = {
      visible: false,
      x: config.width/2 - 150,
      y: config.height/2 - 100,
      width: 300,
      height: 200
    };
    
    // 广告相关
    this.reviveAd = null; // 复活广告对象
    this.hasWatchedAd = false; // 是否已观看广告
    
    console.log('[游戏初始化] 游戏状态初始化完成');
    console.log('[游戏初始化] UI配置初始化完成');
    
    // 开始游戏循环
    console.log('[游戏初始化] 启动游戏循环');
    this.gameLoop();
    
    // 开始资源加载过程
    console.log('[游戏初始化] 开始加载资源');
    this.loadingProgress = 10;
    
    // 设置全局加载超时 - 缩短到5秒
    const loadingTimeout = setTimeout(() => {
      console.warn(`[资源加载] 资源加载超时，强制完成加载，时间戳: ${Date.now()}`);
      this.loadingProgress = 100;
      this.isLoading = false;
    }, 5000); // 5秒超时
    
    // 直接初始化玩家对象
    console.log('[资源加载] 初始化玩家对象');
    
    // 初始化玩家
    this.player = {
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
    
    // 添加控制区域配置
    this.controlAreas = {
      left: { x: 0, y: config.height - 200, width: config.width / 4, height: 100 },
      right: { x: config.width * 3/4, y: config.height - 200, width: config.width / 4, height: 100 },
      up: { x: config.width / 4, y: config.height - 200, width: config.width / 4, height: 100 },
      down: { x: config.width / 2, y: config.height - 200, width: config.width / 4, height: 100 },
      dashBtn: { x: config.width - 80, y: config.height - 80, radius: 30 },
      waveBtn: { x: config.width - 80, y: config.height - 160, radius: 30 }
    };
    
    this.loadingProgress = 40;
    
    // 初始化事件监听
    console.log('[资源加载] 初始化事件监听');
    
    // 监听显示事件
    kwaigame.onShow(() => {
      try {
        // 优先使用 getLaunchOptionsSync
        const options = kwaigame.getLaunchOptionsSync ? kwaigame.getLaunchOptionsSync() : {};
        // 判断是否从侧边栏进入
        this.isFromSidebar = (
          options.scene === 'sidebar' || 
          options.scene === 'sidebarCard'
        );
        console.log('是否从侧边栏进入:', this.isFromSidebar);
      } catch(err) {
        console.error('获取启动参数失败:', err);
        this.isFromSidebar = false;
      }
    });
    
    // 跟踪活动的触摸点
    this.activeTouches = {};
    
    kwaigame.onTouchStart(res => {
      // 处理每个触摸点
      res.touches.forEach(touch => {
        this.activeTouches[touch.identifier] = touch;
        this.handleTouch(touch, true);
      });
    });
    
    kwaigame.onTouchMove(res => {
      // 更新移动中的触摸点
      res.touches.forEach(touch => {
        this.activeTouches[touch.identifier] = touch;
        this.handleTouch(touch, false);
      });
    });
    
    kwaigame.onTouchEnd(res => {
      // 处理结束的触摸
      const activeIds = new Set(res.touches.map(t => t.identifier));
      
      // 找出已经结束的触摸点
      Object.keys(this.activeTouches).forEach(id => {
        if (!activeIds.has(parseInt(id))) {
          // 触摸结束的处理
          this.handleTouchEnd(this.activeTouches[id]);
          delete this.activeTouches[id];
        }
      });
      
      // 如果所有触摸都结束了，停止所有移动
      if (res.touches.length === 0) {
        this.player.moveDirection = 0;
        this.player.verticalDirection = 0;
      }
    });
    
    this.loadingProgress = 70;
    
    // 完全禁用图片加载
    console.log('[资源加载] 禁用图片加载，使用方块渲染');
    this.playerImageLoaded = false;
    this.enemyImageLoaded = false;
    
    // 加载完成
    this.loadingProgress = 100;
    
    // 清除加载计时器
    clearTimeout(loadingTimeout);
    
    // 短暂延迟后结束加载状态，让用户看到100%
    setTimeout(() => {
      console.log(`[资源加载] 完成加载，进入游戏，时间戳: ${Date.now()}`);
      this.isLoading = false;
      
      // 在进入游戏后再初始化广告，彻底与游戏加载分离
      setTimeout(() => {
        try {
          console.log('[资源加载] 开始后台初始化广告');
          this.initAds();
        } catch (e) {
          console.error('[资源加载] 初始化广告失败:', e);
        }
      }, 1000);
      
    }, 500);
  }

  // 添加加载监控器
  startLoadingMonitor() {
    console.log(`[加载监控] 启动加载监控，开始时间: ${this.loadingStartTime}`);
    
    // 检查加载是否卡住
    const checkLoadingStatus = () => {
      const currentTime = Date.now();
      const loadingTime = currentTime - this.loadingStartTime;
      
      console.log(`[加载监控] 当前加载状态：进度=${this.loadingProgress}%，已用时间=${loadingTime}ms，isLoading=${this.isLoading}`);
      
      // 如果加载超过20秒，强制完成加载
      if (this.isLoading && loadingTime > 20000) {
        console.warn('[加载监控] 加载时间过长，强制完成');
        this.loadingProgress = 100;
        this.isLoading = false;
        return;
      }
      
      // 如果加载进度超过了100%，修正为100%
      if (this.loadingProgress > 100) {
        console.warn(`[加载监控] 加载进度异常: ${this.loadingProgress}%，修正为100%`);
        this.loadingProgress = 100;
      }
      
      // 如果加载进度一直卡在90%超过5秒，强制完成
      if (this.loadingProgress >= 90 && this.loadingProgress < 100 && 
          currentTime - this.timeAt90Percent > 5000) {
        console.warn('[加载监控] 加载卡在90%超过5秒，强制完成');
        this.loadingProgress = 100;
        this.isLoading = false;
        return;
      }
      
      // 记录到达90%的时间
      if (this.loadingProgress >= 90 && !this.timeAt90Percent) {
        this.timeAt90Percent = currentTime;
        console.log(`[加载监控] 加载进度达到90%，记录时间: ${this.timeAt90Percent}`);
      }
      
      // 如果进度为100%但isLoading仍为true，强制完成加载
      if (this.loadingProgress >= 100 && this.isLoading) {
        console.log('[加载监控] 进度已达100%，完成加载');
        this.isLoading = false;
        return;
      }
      
      // 继续监控
      if (this.isLoading) {
        setTimeout(checkLoadingStatus, 1000);
      }
    };
    
    // 记录时间点
    this.timeAt90Percent = 0;
    
    // 开始监控
    setTimeout(checkLoadingStatus, 1000);
  }

  // 资源加载器
  loadResources() {
    // 记录开始加载资源时间
    console.log(`[资源加载] 开始加载资源，时间戳: ${Date.now()}`);
    
    // 设置全局加载超时 - 缩短到5秒
    const loadingTimeout = setTimeout(() => {
      console.warn(`[资源加载] 资源加载超时，强制完成加载，时间戳: ${Date.now()}`);
      this.loadingProgress = 100;
      this.isLoading = false;
    }, 5000); // 5秒超时
    
    // 1. 开始加载过程
    console.log('[资源加载] 设置进度: 20%');
    this.loadingProgress = 20;
    
    // 2. 初始化玩家对象 - 直接内联代码而不是调用函数
    console.log('[资源加载] 开始初始化玩家对象');
    
    // 内联initPlayerObject的代码
    this.player = {
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
    
    // 添加控制区域配置
    this.controlAreas = {
      left: { x: 0, y: config.height - 200, width: config.width / 4, height: 100 },
      right: { x: config.width * 3/4, y: config.height - 200, width: config.width / 4, height: 100 },
      up: { x: config.width / 4, y: config.height - 200, width: config.width / 4, height: 100 },
      down: { x: config.width / 2, y: config.height - 200, width: config.width / 4, height: 100 },
      dashBtn: { x: config.width - 80, y: config.height - 80, radius: 30 },
      waveBtn: { x: config.width - 80, y: config.height - 160, radius: 30 }
    };
    
    console.log('[资源加载] 玩家对象初始化完成');
    this.loadingProgress = 50;
    
    // 3. 初始化事件监听
    console.log('[资源加载] 设置进度: 80%，开始初始化事件监听');
    this.initEventListeners();
    console.log('[资源加载] 事件监听初始化完成');
    this.loadingProgress = 100;
    
    // 完全禁用图片加载
    console.log('[资源加载] 禁用图片加载，使用方块渲染');
    this.playerImageLoaded = false;
    this.enemyImageLoaded = false;
    
    // 清除加载计时器
    clearTimeout(loadingTimeout);
    
    // 短暂延迟后结束加载状态，让用户看到100%
    setTimeout(() => {
      console.log(`[资源加载] 完成加载，进入游戏，时间戳: ${Date.now()}`);
      this.isLoading = false;
      
      // 在进入游戏后再初始化广告，彻底与游戏加载分离
      setTimeout(() => {
        try {
          console.log('[资源加载] 开始后台初始化广告');
          this.initAds();
        } catch (e) {
          console.error('[资源加载] 初始化广告失败:', e);
        }
      }, 1000);
      
    }, 500);
  }
  
  // 在render方法中添加加载界面渲染
  render() {
    // 如果正在加载资源，渲染加载界面
    if (this.isLoading) {
      this.renderLoadingScreen();
      return;
    }
    
    // 如果在启动界面，渲染启动界面后返回
    if (this.isStartScreen) {
      this.renderStartScreen();
                return;
            }

    this.ctx.clearRect(0, 0, config.width, config.height);
    
    // 绘制发波效果（在障碍物下方）
    if (this.player.waveSkill.isActive) {
      this.renderWaveEffect();
    }
    
    // 绘制生命值
    this.ctx.fillStyle = '#ff0000';
    for (let i = 0; i < this.lives; i++) {
      this.ctx.fillRect(
        20 + i * 30,
        70,
        20,
        20
      );
    }
    
    // 绘制障碍物
    this.ctx.fillStyle = '#ea4335';
    this.obstacles.forEach(obstacle => {
      // 保存当前绘图状态
      this.ctx.save();
      
      // 设置旋转中心点为小怪中心
      this.ctx.translate(
        obstacle.x + obstacle.width / 2,
        obstacle.y + obstacle.height / 2
      );
      
      // 应用旋转效果
      if (obstacle.rotation) {
        // 随着小怪下落，旋转角度增加
        const rotationAngle = obstacle.rotation * Math.sin(Date.now() / 500);
        this.ctx.rotate(rotationAngle);
      }
      
      // 绘制小怪，使用方块渲染
      this.ctx.fillRect(
        -obstacle.width / 2,
        -obstacle.height / 2,
        obstacle.width,
        obstacle.height
      );
      
      // 恢复绘图状态
      this.ctx.restore();
    });
    
    // 只在非复活状态下绘制玩家
    if (this.player.isVisible) {
      // 使用蓝色方块绘制玩家
      this.ctx.fillStyle = '#4285f4';
      this.ctx.fillRect(
        this.player.x,
        this.player.y,
        this.player.width,
        this.player.height
      );
      
      // 绘制冲刺特效（如果正在冲刺）
      if (this.player.isDashing) {
        this.ctx.globalAlpha = 0.5;
        this.ctx.fillStyle = '#00ffff';
        // 绘制冲刺轨迹
        this.ctx.beginPath();
        this.ctx.moveTo(this.player.x + this.player.width/2, this.player.y + this.player.height);
        this.ctx.lineTo(this.player.x, this.player.y + this.player.height + 20);
        this.ctx.lineTo(this.player.x + this.player.width, this.player.y + this.player.height + 20);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.globalAlpha = 1.0;
      }
    }
    
    // 绘制游戏控制UI
    this.renderGameControls();
    
    // 渲染爆炸效果（在玩家和UI之间）
    this.updateAndRenderExplosions();
    
    // 绘制分数
    this.ctx.fillStyle = '#000000';
    this.ctx.font = '20px Arial';
    this.ctx.fillText(`得分: ${this.score}`, 20, 40);
    
    // 绘制复活倒计时
    if (this.isReviving) {
      this.ctx.fillStyle = 'rgba(0,0,0,0.3)';
      this.ctx.fillRect(0, 0, config.width, config.height);
      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = '40px Arial';
      this.ctx.fillText(
        `复活倒计时: ${Math.ceil(this.reviveCountdown / 1000)}`,
        config.width/2 - 120,
        config.height/2
      );
    }
    
    // 修改游戏结束显示部分
    if (this.isGameOver) {
      // 半透明背景
      this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
      this.ctx.fillRect(0, 0, config.width, config.height);

      // 游戏结束文字
      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = '40px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('游戏结束', config.width/2, config.height/2 - 60);

      // 显示最终得分
      this.ctx.font = '24px Arial';
      this.ctx.fillText(
        `最终得分: ${this.score}`,
        config.width/2,
        config.height/2 - 20
      );
      
      // 获取历史最高分
      const highScore = kwaigame.getStorageSync('highScore') || 0;
      this.ctx.fillText(
        `历史最高分: ${highScore}`,
        config.width/2,
        config.height/2 + 20
      );
      
      // 绘制重新开始按钮
      this.ctx.fillStyle = '#4285f4';
      this.ctx.fillRect(
        this.restartBtn.x,
        this.restartBtn.y,
        this.restartBtn.width,
        this.restartBtn.height
      );
      
      // 按钮文字
      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = '24px Arial';
      this.ctx.fillText(
        '重新开始',
        config.width/2,
        this.restartBtn.y + 35
      );
      
      // 绘制返回主菜单按钮
      const menuBtnY = this.restartBtn.y + this.restartBtn.height + 20;
      this.ctx.fillStyle = '#34a853';
      this.ctx.fillRect(
        this.restartBtn.x,
        menuBtnY,
        this.restartBtn.width,
        this.restartBtn.height
      );
      
      // 按钮文字 - 修改为在按钮内部同时显示"重生"和"+2"
      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = '22px Arial';
      this.ctx.fillText(
        '重生',
        config.width/2 - 25,
        menuBtnY + 32
      );
      
      // 重置文本对齐
      this.ctx.textAlign = 'start';
    }

    // 添加按钮渲染
    this.renderButtons();
  }
  
  // 绘制发波效果
  renderWaveEffect() {
    try {
      const wave = this.player.waveSkill;
      
      // 检查参数有效性
      if (!wave || !wave.center || typeof wave.center.x !== 'number' || typeof wave.center.y !== 'number' || typeof wave.radius !== 'number') {
        console.error('波纹参数无效:', wave);
                return;
            }

      // 环形渐变
      const gradient = this.ctx.createRadialGradient(
        wave.center.x, wave.center.y, Math.max(0, wave.radius - 15),
        wave.center.x, wave.center.y, wave.radius + 15
      );
      
      // 设置渐变颜色
      gradient.addColorStop(0, 'rgba(0, 255, 255, 0)');
      gradient.addColorStop(0.5, 'rgba(0, 255, 255, 0.7)');
      gradient.addColorStop(1, 'rgba(0, 255, 255, 0)');
      
      // 绘制波纹
      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(wave.center.x, wave.center.y, wave.radius + 15, 0, Math.PI * 2);
      this.ctx.fill();
      
      // 绘制波纹边缘线
      this.ctx.strokeStyle = 'rgba(0, 255, 255, 0.5)';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.arc(wave.center.x, wave.center.y, wave.radius, 0, Math.PI * 2);
      this.ctx.stroke();
    } catch(err) {
      console.error('渲染波纹效果出错:', err);
    }
  }
  
  // 绘制游戏控制UI
  renderGameControls() {
    // 绘制半透明控制区域
    this.ctx.globalAlpha = 0.2;
    
    // 左移按钮
    this.ctx.fillStyle = '#ff0000';
    this.ctx.fillRect(
      this.controlAreas.left.x,
      this.controlAreas.left.y,
      this.controlAreas.left.width,
      this.controlAreas.left.height
    );
    
    // 右移按钮
    this.ctx.fillStyle = '#00ff00';
    this.ctx.fillRect(
      this.controlAreas.right.x,
      this.controlAreas.right.y,
      this.controlAreas.right.width,
      this.controlAreas.right.height
    );
    
    // 前进按钮
    this.ctx.fillStyle = '#0000ff';
    this.ctx.fillRect(
      this.controlAreas.up.x,
      this.controlAreas.up.y,
      this.controlAreas.up.width,
      this.controlAreas.up.height
    );
    
    // 后退按钮
    this.ctx.fillStyle = '#9900cc';
    this.ctx.fillRect(
      this.controlAreas.down.x,
      this.controlAreas.down.y,
      this.controlAreas.down.width,
      this.controlAreas.down.height
    );
    
    // 冲刺按钮
    this.ctx.fillStyle = '#ffff00';
    this.ctx.beginPath();
    this.ctx.arc(
      this.controlAreas.dashBtn.x,
      this.controlAreas.dashBtn.y,
      this.controlAreas.dashBtn.radius,
      0,
      Math.PI * 2
    );
    this.ctx.fill();
    
    // 发波按钮
    this.ctx.fillStyle = '#00ffff';
    this.ctx.beginPath();
    this.ctx.arc(
      this.controlAreas.waveBtn.x,
      this.controlAreas.waveBtn.y,
      this.controlAreas.waveBtn.radius,
      0,
      Math.PI * 2
    );
    this.ctx.fill();
    
    // 恢复透明度
    this.ctx.globalAlpha = 1.0;
    
    // 添加控制文字提示
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '18px Arial';
    this.ctx.fillText('←', this.controlAreas.left.x + this.controlAreas.left.width/2 - 8, this.controlAreas.left.y + this.controlAreas.left.height/2 + 6);
    this.ctx.fillText('→', this.controlAreas.right.x + this.controlAreas.right.width/2 - 8, this.controlAreas.right.y + this.controlAreas.right.height/2 + 6);
    this.ctx.fillText('↑', this.controlAreas.up.x + this.controlAreas.up.width/2 - 8, this.controlAreas.up.y + this.controlAreas.up.height/2 + 6);
    this.ctx.fillText('↓', this.controlAreas.down.x + this.controlAreas.down.width/2 - 8, this.controlAreas.down.y + this.controlAreas.down.height/2 + 6);
    
    // 冲刺按钮文字
    this.ctx.fillStyle = '#000000';
    this.ctx.font = '16px Arial';
    this.ctx.fillText('冲!', this.controlAreas.dashBtn.x - 12, this.controlAreas.dashBtn.y + 6);
    
    // 发波按钮文字
    this.ctx.fillStyle = '#000000';
    this.ctx.font = '16px Arial';
    this.ctx.fillText('波!', this.controlAreas.waveBtn.x - 12, this.controlAreas.waveBtn.y + 6);
    
    // 如果冲刺在冷却中，显示冷却进度
    if (this.player.dashCooldown > 0) {
      const cooldownPercent = this.player.dashCooldown / 1000;
      this.ctx.globalAlpha = 0.7;
      this.ctx.fillStyle = '#888888';
      this.ctx.beginPath();
      this.ctx.moveTo(this.controlAreas.dashBtn.x, this.controlAreas.dashBtn.y);
      this.ctx.arc(
        this.controlAreas.dashBtn.x,
        this.controlAreas.dashBtn.y,
        this.controlAreas.dashBtn.radius,
        -Math.PI/2,
        -Math.PI/2 + cooldownPercent * Math.PI * 2,
        false
      );
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.globalAlpha = 1.0;
    }
    
    // 如果发波在冷却中，显示冷却进度
    if (this.player.waveSkill.cooldown > 0) {
      const cooldownPercent = this.player.waveSkill.cooldown / config.waveCooldown;
      this.ctx.globalAlpha = 0.7;
      this.ctx.fillStyle = '#888888';
      this.ctx.beginPath();
      this.ctx.moveTo(this.controlAreas.waveBtn.x, this.controlAreas.waveBtn.y);
      this.ctx.arc(
        this.controlAreas.waveBtn.x,
        this.controlAreas.waveBtn.y,
        this.controlAreas.waveBtn.radius,
        -Math.PI/2,
        -Math.PI/2 + cooldownPercent * Math.PI * 2,
        false
      );
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.globalAlpha = 1.0;
    }
    
    // 显示发波所需分数
    if (this.score < config.waveSkillRequiredScore) {
      this.ctx.fillStyle = '#ff0000';
      this.ctx.font = '14px Arial';
      this.ctx.fillText(
        `需要${config.waveSkillRequiredScore}分`,
        this.controlAreas.waveBtn.x - 40,
        this.controlAreas.waveBtn.y - 20
      );
    }
  }

  gameOver() {
    if (this.lives > 0) {
      this.lives--;
      if (this.lives > 0) {
        this.startRevive();
        return;
      }
    }
    
    this.isGameOver = true;
    
    // 保存最高分数到本地
    const highScore = kwaigame.getStorageSync('highScore') || 0;
    if (this.score > highScore) {
      kwaigame.setStorageSync('highScore', this.score);
    }
    
    // 显示游戏结束提示
    kwaigame.showToast({
      title: '游戏结束,得分:' + this.score,
      icon: 'none',
      duration: 2000
    });
  }

  // 添加复活相关方法
  startRevive() {
    this.isReviving = true;
    this.reviveCountdown = config.reviveDelay;
    this.player.isVisible = false;
    
    // 清除当前所有障碍物
    this.obstacles = [];
    
    // 重置玩家位置
    this.player.x = (config.width - this.player.width) / 2;
    
    // 显示复活广告
    this.showReviveAd();
  }

  // 完成复活
  completeRevive() {
    // 修改为根据观看广告状态决定是否复活
    if (this.reviveAd && !this.hasWatchedAd) {
      // 如果有广告但未观看，不执行后续复活逻辑
      return;
    }
    
    // 重置广告观看状态
    this.hasWatchedAd = false;
    
    // 结束复活状态
    this.isReviving = false;
    this.player.isVisible = true;
    this.reviveCountdown = 0;
    
    // 恢复一条生命
    this.lives = 1;
    // 重置游戏结束状态
    this.isGameOver = false;
    
    // 重置玩家位置到屏幕中央底部
    this.player.x = (config.width - this.player.width) / 2;
    this.player.y = config.height - 120;
  }

  // 添加重生玩家的方法
  revivePlayer() {
    // 恢复一条生命
    this.lives = 1;
    // 重置游戏结束状态
    this.isGameOver = false;
    
    // 重要：让玩家可见而不是重新启动复活过程
    this.isReviving = false;
    this.player.isVisible = true;
    
    // 重置玩家位置到屏幕中央底部
    this.player.x = (config.width - this.player.width) / 2;
    this.player.y = config.height - 120;
  }

  // 添加重置游戏的方法
  resetGame() {
    this.score = 0;
    this.isGameOver = false;
    this.lives = config.maxLives;
    this.isReviving = false;
    this.reviveCountdown = 0;
    this.obstacles = [];
    
    // 重置玩家位置
    this.player.x = (config.width - this.player.width) / 2;
    this.player.y = config.height - 120;
    this.player.moveDirection = 0;
    this.player.verticalDirection = 0;
    this.player.isDashing = false;
    this.player.dashCooldown = 0;
    
    // 重置发波技能状态
    this.player.waveSkill.isActive = false;
    this.player.waveSkill.radius = 0;
    this.player.waveSkill.duration = 0;
    this.player.waveSkill.cooldown = 0;
    
    this.player.isVisible = true;
    
    // 清空爆炸效果
    this.explosions = [];
  }

  // 返回启动界面
  backToStartScreen() {
    this.resetGame();
    this.isStartScreen = true;
  }

  // 修改生成障碍物的方法
  createObstacle() {
    // 确保玩家可以通过的最小空间
    const minGap = this.player.width + 40;  // 玩家宽度 + 额外空间
    
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
      this.obstacles.push({
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
    const gaps = this.findGaps();
    if (!gaps.some(gap => gap >= minGap)) {
      // 如果没有足够大的空隙，移除一个随机障碍物
      const index = Math.floor(Math.random() * this.obstacles.length);
      this.obstacles.splice(index, 1);
    }
  }
  
  // 添加查找空隙的辅助方法
  findGaps() {
    if (this.obstacles.length === 0) return [config.width];
    
    // 按x坐标排序障碍物
    const sorted = [...this.obstacles].sort((a, b) => a.x - b.x);
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

  // 渲染启动界面
  renderStartScreen() {
    // 清空画布
    this.ctx.clearRect(0, 0, config.width, config.height);
    
    // 绘制背景
    this.ctx.fillStyle = '#f0f0f0';
    this.ctx.fillRect(0, 0, config.width, config.height);
    
    // 更新和绘制粒子效果
    this.updateStartScreenEffects();
    this.renderStartScreenParticles();
    
    // 绘制游戏标题（带缩放效果）
    this.ctx.save();
    this.ctx.fillStyle = this.gameTitle.color;
    this.ctx.font = this.gameTitle.font;
    this.ctx.textAlign = 'center';
    this.ctx.translate(this.gameTitle.x, this.gameTitle.y);
    this.ctx.scale(this.startScreenEffects.titleScale, this.startScreenEffects.titleScale);
    this.ctx.fillText(this.gameTitle.text, 0, 0);
    this.ctx.restore();
    
    // 绘制副标题
    this.ctx.fillStyle = '#333333';
    this.ctx.font = '18px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('冲刺、闪避、发波，成为最强战士！', config.width/2, this.gameTitle.y + 40);
    
    // 获取当前时间用于按钮脉动效果
    const btnPulse = Math.sin(Date.now() / 300) * 0.05 + 1;
    
    // 绘制开始按钮（带脉动效果）
    this.ctx.save();
    this.ctx.translate(
      this.startBtn.x + this.startBtn.width/2, 
      this.startBtn.y + this.startBtn.height/2
    );
    this.ctx.scale(btnPulse, btnPulse);
    this.ctx.fillStyle = '#4285f4';
    this.ctx.fillRect(
      -this.startBtn.width/2,
      -this.startBtn.height/2,
      this.startBtn.width,
      this.startBtn.height
    );
    
    // 绘制按钮文字
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '24px Arial';
    this.ctx.fillText(
      this.startBtn.text,
      0,
      8 // 垂直居中调整
    );
    this.ctx.restore();
    
    // 绘制小提示
    this.ctx.fillStyle = '#666666';
    this.ctx.font = '14px Arial';
    this.ctx.fillText('点击按钮开始游戏', config.width/2, this.startBtn.y + this.startBtn.height + 30);
    
    // 添加软著号和著作权人信息
    this.ctx.fillStyle = '#333333';
    this.ctx.font = '12px Arial';
    this.ctx.fillText(
      '软著号: 2024SR00063813',
      config.width/2, 
      config.height - 100
    );
    this.ctx.fillText(
      '著作权人: 王鑫源',
      config.width/2, 
      config.height - 80
    );
    
    // 添加健康游戏忠告
    this.ctx.fillStyle = '#e74c3c'; // 使用醒目的红色
    this.ctx.font = '12px Arial';
    this.ctx.fillText(
      '健康游戏忠告：抵制不良游戏，拒绝盗版游戏。注意自我保护，谨防受骗上当。',
      config.width/2, 
      config.height - 60
    );
    this.ctx.fillText(
      '适度游戏益脑，沉迷游戏伤身。合理安排时间，享受健康生活。',
      config.width/2, 
      config.height - 40
    );
    
    // 恢复文本对齐默认值
    this.ctx.textAlign = 'start';
  }
  
  // 更新启动界面特效
  updateStartScreenEffects() {
    // 更新标题缩放
    this.startScreenEffects.titleScale += this.startScreenEffects.titleScaleDirection;
    if (this.startScreenEffects.titleScale > 1.05) {
      this.startScreenEffects.titleScaleDirection = -0.001;
    } else if (this.startScreenEffects.titleScale < 0.95) {
      this.startScreenEffects.titleScaleDirection = 0.001;
    }
    
    // 初始化粒子
    if (this.startScreenEffects.particles.length === 0) {
      for (let i = 0; i < this.startScreenEffects.particleCount; i++) {
        this.startScreenEffects.particles.push({
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
    for (let i = 0; i < this.startScreenEffects.particles.length; i++) {
      const particle = this.startScreenEffects.particles[i];
      
      particle.x += particle.speedX;
      particle.y += particle.speedY;
      
      // 边界检查
      if (particle.x < 0) particle.x = config.width;
      if (particle.x > config.width) particle.x = 0;
      if (particle.y < 0) particle.y = config.height;
      if (particle.y > config.height) particle.y = 0;
    }
  }
  
  // 渲染启动界面粒子
  renderStartScreenParticles() {
    for (let i = 0; i < this.startScreenEffects.particles.length; i++) {
      const particle = this.startScreenEffects.particles[i];
      
      this.ctx.fillStyle = particle.color;
      this.ctx.globalAlpha = 0.6;
            this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fill();
    }
    
    this.ctx.globalAlpha = 1.0;
  }

  gameLoop() {
    try {
      this.update();
      this.render();
      requestAnimationFrame(() => this.gameLoop());
    } catch (e) {
      console.error('游戏循环错误:', e);
      // 尝试恢复游戏
      setTimeout(() => {
        // 如果出现严重错误，尝试重置游戏状态
        if (this.isLoading) {
          // 如果在加载阶段出错，强制完成加载
          this.loadingProgress = 100;
          this.isLoading = false;
        }
        requestAnimationFrame(() => this.gameLoop());
      }, 1000);
    }
  }

  // 渲染加载界面
  renderLoadingScreen() {
    // 清除画布
    this.ctx.clearRect(0, 0, config.width, config.height);
    
    // 确保加载进度不超过100%，同时记录日志
    let loadingProgress = this.loadingProgress;
    if (loadingProgress > 100) {
      console.warn(`[加载界面] 进度值异常: ${loadingProgress}%，修正为100%`);
      loadingProgress = 100;
      this.loadingProgress = 100; // 修正原始值
    }
    
    // 记录每10%的加载进度
    if (Math.floor(loadingProgress / 10) !== Math.floor(this.lastLoggedProgress / 10)) {
      console.log(`[加载界面] 绘制加载进度: ${loadingProgress}%`);
      this.lastLoggedProgress = loadingProgress;
    }
    
    // 绘制背景
    this.ctx.fillStyle = '#f0f0f0';
            this.ctx.fillRect(0, 0, config.width, config.height);
            
    // 绘制加载进度条背景
    const barWidth = 200;
    const barHeight = 20;
    const barX = (config.width - barWidth) / 2;
    const barY = config.height / 2;
    
    this.ctx.fillStyle = '#dddddd';
    this.ctx.fillRect(barX, barY, barWidth, barHeight);
    
    // 绘制进度条
    const progressWidth = (loadingProgress / 100) * barWidth;
    this.ctx.fillStyle = '#4285f4';
    this.ctx.fillRect(barX, barY, progressWidth, barHeight);
    
    // 绘制进度文字
    this.ctx.fillStyle = '#333333';
    this.ctx.font = '18px Arial';
            this.ctx.textAlign = 'center';
    this.ctx.fillText(
      `加载中... ${Math.floor(loadingProgress)}%`, 
      config.width / 2, 
      barY - 20
    );
    
    // 如果加载卡住，显示提示
    if (loadingProgress >= 60 && loadingProgress < 100) {
      this.ctx.fillStyle = '#666666';
      this.ctx.font = '14px Arial';
      this.ctx.fillText(
        '首次加载可能较慢，请耐心等待', 
        config.width / 2, 
        barY + 50
      );
    }
    
    // 如果加载卡在80%以上较长时间，显示额外信息
    if (loadingProgress >= 90 && Date.now() - this.loadingStartTime > 5000) {
      this.ctx.fillStyle = '#e74c3c';
      this.ctx.fillText(
        '正在优化游戏资源，请再等一下...', 
        config.width / 2, 
        barY + 80
      );
    }
    
    // 重置文本对齐
    this.ctx.textAlign = 'start';
  }

  // 初始化UI配置
  initUIConfig() {
    // 重新开始按钮
    this.restartBtn = {
      x: config.width/2 - 80,
      y: config.height/2 + 80,
      width: 160,
      height: 50
    };
    
    // 侧边栏相关按钮
    this.sidebarBtn = {
      x: 20,
      y: 120,
      width: 100,
      height: 40,
      text: '入口有礼'
    };
    
    this.gotoSidebarBtn = {
      x: config.width - 120,
      y: 120,
      width: 100,
      height: 40,
      text: '去侧边栏'
    };
    
    this.getRewardBtn = {
      x: config.width - 120,
      y: 120,
      width: 100,
      height: 40,
      text: '领取奖励'
    };
    
    // 分享按钮
    this.shareBtn = {
      x: config.width - 120,
      y: 70,
      width: 100,
      height: 40,
      text: '分享游戏'
    };
    
    // 对话框配置
    this.sidebarDialog = {
      visible: false,
      x: config.width/2 - 150,
      y: config.height/2 - 100,
      width: 300,
      height: 200
    };
  }

  // 初始化事件监听
  initEventListeners() {
    // 监听显示事件
    kwaigame.onShow(() => {
      this.checkEntryScene();
    });
    
    // 检查侧边栏可用性
    // this.checkSidebarAvailable();
    
    // 初始化触摸事件
    this.initTouchEvents();
  }

  // 检查进入场景
  checkEntryScene() {
    try {
      // 优先使用 getLaunchOptionsSync
      const options = kwaigame.getLaunchOptionsSync ? kwaigame.getLaunchOptionsSync() : {};
      // 判断是否从侧边栏进入
      this.isFromSidebar = (
        options.scene === 'sidebar' || 
        options.scene === 'sidebarCard'
      );
      console.log('是否从侧边栏进入:', this.isFromSidebar);
    } catch(err) {
      console.error('获取启动参数失败:', err);
      this.isFromSidebar = false;
    }
  }

  // 跳转到侧边栏
  gotoSidebar() {
    kwaigame.navigateToScene({
      scene: "sidebar",
                success: () => {
        console.log("跳转侧边栏成功");
        this.sidebarDialog.visible = false;
                },
                fail: (err) => {
        console.error("跳转侧边栏失败:", err);
        // 显示错误提示
        kwaigame.showToast({
          title: '跳转失败,请重试',
          icon: 'none'
        });
      }
    });
  }

  // 领取奖励
  getReward() {
    const now = Date.now();
    // 检查是否可以领取奖励(24小时内只能领取一次)
    if(now - this.lastRewardTime < 24 * 60 * 60 * 1000) {
      kwaigame.showToast({
        title: '今日已领取奖励',
        icon: 'none'
      });
      return;
    }

    // 发放奖励
    this.score += config.sidebarReward;
    this.lastRewardTime = now;
    this.sidebarRewardAvailable = false;
    
    // 保存领取记录
    kwaigame.setStorageSync('lastRewardTime', now);
    
    // 显示领取成功提示
    kwaigame.showToast({
      title: '奖励领取成功',
      icon: 'success'
    });
  }

  // 渲染UI按钮
  renderButtons() {
    // 已禁用侧边栏功能，不显示侧边栏相关按钮
    /* 
    if(this.sidebarEnabled) {
      // 绘制入口有礼按钮
      this.drawButton(
        this.sidebarBtn,
        '#4285f4',
        '#ffffff'
      );

      // 根据是否从侧边栏进入显示不同按钮
      if(this.isFromSidebar) {
        if(this.sidebarRewardAvailable) {
          // 绘制领取奖励按钮
          this.drawButton(
            this.getRewardBtn,
            '#ea4335',
            '#ffffff'
          );
        }
      } else {
        // 绘制去侧边栏按钮
        this.drawButton(
          this.gotoSidebarBtn,
          '#34a853',
          '#ffffff'
        );
      }
      
      // 绘制分享按钮
      this.drawButton(
        this.shareBtn,
        '#fbbc05',
        '#ffffff'
      );
    }
    */

    // 绘制对话框
    if(this.sidebarDialog && this.sidebarDialog.visible) {
      this.drawDialog();
    }
  }

  // 绘制按钮
  drawButton(btn, bgColor, textColor) {
    this.ctx.fillStyle = bgColor;
      this.ctx.fillRect(
      btn.x,
      btn.y,
      btn.width,
      btn.height
    );
    this.ctx.fillStyle = textColor;
    this.ctx.font = '16px Arial';
    this.ctx.fillText(
      btn.text,
      btn.x + 20,
      btn.y + 25
    );
  }

  // 绘制对话框
  drawDialog() {
    // 半透明背景
    this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
    this.ctx.fillRect(0, 0, config.width, config.height);
    
    // 对话框背景
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(
      this.sidebarDialog.x,
      this.sidebarDialog.y,
      this.sidebarDialog.width,
      this.sidebarDialog.height
    );

    // 对话框内容
    this.ctx.fillStyle = '#000000';
    this.ctx.font = '20px Arial';
    this.ctx.fillText(
      '添加到侧边栏即可领取奖励!',
      this.sidebarDialog.x + 40,
      this.sidebarDialog.y + 80
    );
  }

  // 检查按钮点击
  checkButtonClick(btn, touch) {
    return touch.clientX >= btn.x && 
           touch.clientX <= btn.x + btn.width &&
           touch.clientY >= btn.y && 
           touch.clientY <= btn.y + btn.height;
  }

  // 检查对话框点击
  checkDialogClick(dialog, touch) {
    return touch.clientX >= dialog.x && 
           touch.clientX <= dialog.x + dialog.width &&
           touch.clientY >= dialog.y && 
           touch.clientY <= dialog.y + dialog.height;
  }

  // 修改触摸事件控制方式
  initTouchEvents() {
    // 跟踪活动的触摸点
    this.activeTouches = {};
    
    kwaigame.onTouchStart(res => {
      // 处理每个触摸点
      res.touches.forEach(touch => {
        this.activeTouches[touch.identifier] = touch;
        this.handleTouch(touch, true);
      });
    });
    
    kwaigame.onTouchMove(res => {
      // 更新移动中的触摸点
      res.touches.forEach(touch => {
        this.activeTouches[touch.identifier] = touch;
        this.handleTouch(touch, false);
      });
    });
    
    kwaigame.onTouchEnd(res => {
      // 处理结束的触摸
      const activeIds = new Set(res.touches.map(t => t.identifier));
      
      // 找出已经结束的触摸点
      Object.keys(this.activeTouches).forEach(id => {
        if (!activeIds.has(parseInt(id))) {
          // 触摸结束的处理
          this.handleTouchEnd(this.activeTouches[id]);
          delete this.activeTouches[id];
        }
      });
      
      // 如果所有触摸都结束了，停止所有移动
      if (res.touches.length === 0) {
        this.player.moveDirection = 0;
        this.player.verticalDirection = 0;
      }
    });
  }
  
  // 处理触摸事件
  handleTouch(touch, isStart) {
    // 如果游戏正在加载中，忽略所有点击
    if (this.isLoading) {
      return;
    }
    
    // 启动界面点击处理
    if (this.isStartScreen) {
      if (isStart && this.checkButtonClick(this.startBtn, touch)) {
        this.isStartScreen = false; // 隐藏启动界面
        return;
      }
      return; // 启动界面时不处理其他触摸事件
    }
    
    // 如果游戏结束，检查重新开始按钮
    if (this.isGameOver) {
      if (isStart && this.checkTouchRestartBtn(touch.clientX, touch.clientY)) {
        this.resetGame();
        return;
      }
    }
    
    // 已禁用侧边栏功能，不处理侧边栏相关按钮点击
    /*
    // 检查侧边栏相关按钮点击
    if (isStart && this.sidebarEnabled) {
      if(this.checkButtonClick(this.sidebarBtn, touch)) {
        this.sidebarDialog.visible = true;
            return;
        }

      if(this.checkButtonClick(this.gotoSidebarBtn, touch)) {
        this.gotoSidebar();
        return;
      }

      if(this.checkButtonClick(this.getRewardBtn, touch)) {
        this.getReward();
        return;
      }
      
      // 添加检查分享按钮点击
      if(this.checkButtonClick(this.shareBtn, touch)) {
        this.shareGame();
        return;
      }
    }

    // 点击对话框外关闭对话框
    if (isStart && this.sidebarDialog.visible && 
        !this.checkDialogClick(this.sidebarDialog, touch)) {
      this.sidebarDialog.visible = false;
      return;
    }
    */
    
    try {
      // 冲刺按钮检测
      if (isStart && this.checkCircleClick(this.controlAreas.dashBtn, touch)) {
        this.startDash();
        return;
      }

      // 发波按钮检测
      if (isStart && this.checkCircleClick(this.controlAreas.waveBtn, touch)) {
        this.useWaveSkill();
        return;
      }

      // 移动控制区域检测
      if (this.checkAreaClick(this.controlAreas.left, touch)) {
        this.player.moveDirection = -1; // 左移
      } else if (this.checkAreaClick(this.controlAreas.right, touch)) {
        this.player.moveDirection = 1;  // 右移
      }
      
      if (this.checkAreaClick(this.controlAreas.up, touch)) {
        this.player.verticalDirection = -1; // 上移（前进）
      } else if (this.checkAreaClick(this.controlAreas.down, touch)) {
        this.player.verticalDirection = 1;  // 下移（后退）
      }
    } catch (e) {
      console.error('触摸事件处理错误:', e);
    }
  }
  
  // 处理触摸结束
  handleTouchEnd(touch) {
    // 检查是否在控制区域内
    if (this.checkAreaClick(this.controlAreas.left, touch)) {
      this.player.moveDirection = 0;
    }
    if (this.checkAreaClick(this.controlAreas.right, touch)) {
      this.player.moveDirection = 0;
    }
    if (this.checkAreaClick(this.controlAreas.up, touch)) {
      this.player.verticalDirection = 0;
    }
    if (this.checkAreaClick(this.controlAreas.down, touch)) {
      this.player.verticalDirection = 0;
    }
  }
  
  // 检查区域点击
  checkAreaClick(area, touch) {
    return touch.clientX >= area.x && touch.clientX <= area.x + area.width &&
           touch.clientY >= area.y && touch.clientY <= area.y + area.height;
  }
  
  // 检查圆形按钮点击
  checkCircleClick(circle, touch) {
    const dx = touch.clientX - circle.x;
    const dy = touch.clientY - circle.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
    return distance <= circle.radius;
  }
  
  // 开始冲刺
  startDash() {
    if (this.player.dashCooldown <= 0) {
      this.player.isDashing = true;
      this.player.dashDuration = this.player.maxDashDuration;
      
      // 播放冲刺音效（可选）
      // this.playDashSound();
    }
  }

  // 使用发波技能
  useWaveSkill() {
    try {
      // 检查是否满足使用条件
      if (this.score < config.waveSkillRequiredScore) {
        // 分数不足，无法使用
        kwaigame.showToast({
          title: `需要${config.waveSkillRequiredScore}分才能使用发波`,
          icon: 'none',
          duration: 1500
        });
        return;
      }
      
      // 检查冷却时间
      if (this.player.waveSkill.cooldown > 0) {
        // 技能冷却中
        kwaigame.showToast({
          title: '技能冷却中',
          icon: 'none',
          duration: 1000
        });
        return;
      }
      
      // 使用技能消耗分数
      this.score -= config.waveSkillRequiredScore;
      
      // 设置发波状态
      this.player.waveSkill.isActive = true;
      this.player.waveSkill.radius = 0;
      this.player.waveSkill.duration = config.waveDuration;
      
      // 确保中心点对象已初始化并且值是数值
      if (!this.player.waveSkill.center) {
        this.player.waveSkill.center = {x: 0, y: 0};
      }
      
      this.player.waveSkill.center.x = this.player.x + this.player.width / 2;
      this.player.waveSkill.center.y = this.player.y + this.player.height / 2;
      
      console.log('发波技能激活，中心点:', this.player.waveSkill.center);
      
      // 播放发波音效（可选）
      // this.playWaveSound();
    } catch(err) {
      console.error('使用发波技能出错:', err);
    }
  }

  update() {
    try {
      // 在启动界面时不更新游戏逻辑
      if (this.isStartScreen || this.isLoading) return;
      
      if (this.isGameOver) return;

      // 处理复活倒计时
      if (this.isReviving) {
        this.reviveCountdown -= 16.67; // 假设60fps
        if (this.reviveCountdown <= 0) {
          this.completeRevive();
        }
        return;
      }
      
      // 更新冲刺状态
      if (this.player.dashCooldown > 0) {
        this.player.dashCooldown -= 16.67; // 假设60fps
      }
      
      if (this.player.isDashing) {
        this.player.dashDuration -= 16.67;
        if (this.player.dashDuration <= 0) {
          this.player.isDashing = false;
          this.player.dashCooldown = 1000; // 1秒冷却时间
        }
      }
      
      // 更新发波状态
      if (this.player.waveSkill.cooldown > 0) {
        this.player.waveSkill.cooldown -= 16.67;
      }
      
      if (this.player.waveSkill.isActive) {
        // 更新发波半径
        this.player.waveSkill.radius += config.waveSpeed;
        
        // 更新发波持续时间
        this.player.waveSkill.duration -= 16.67;
        
        // 检查发波是否结束
        if (this.player.waveSkill.duration <= 0 || 
            this.player.waveSkill.radius >= config.waveRadius) {
          this.player.waveSkill.isActive = false;
          this.player.waveSkill.cooldown = config.waveCooldown;
        } else {
          // 检查发波与障碍物的碰撞
          this.checkWaveCollisions();
        }
      }

      // 计算当前速度
      const currentSpeed = this.player.isDashing ? this.player.dashSpeed : this.player.speed;
      
      // 更新玩家水平位置
      const newX = this.player.x + (this.player.moveDirection * currentSpeed);
      this.player.x = Math.max(0, Math.min(config.width - this.player.width, newX));
      
      // 更新玩家垂直位置
      if (this.player.verticalDirection !== 0) {
        const verticalSpeed = this.player.isDashing ? this.player.dashSpeed : this.player.verticalSpeed;
        const newY = this.player.y + (this.player.verticalDirection * verticalSpeed);
        
        // 限制玩家不能超出屏幕顶部和底部
        const minY = 100; // 顶部最小距离
        const maxY = config.height - this.player.height - 20; // 底部最大距离
        this.player.y = Math.max(minY, Math.min(maxY, newY));
      }

      // 更新障碍物
      this.obstacles.forEach((obstacle, index) => {
        obstacle.y += obstacle.speed;  // 向下移动
        
        // 移除超出屏幕的障碍物
        if (obstacle.y > config.height) {
          this.obstacles.splice(index, 1);
          if (index % 2 === 0) {  // 只在移除一组障碍物的第一个时加分
            this.score++;
          }
        }
        
        // 碰撞检测
        if (this.checkCollision(this.player, obstacle)) {
          this.gameOver();
        }
      });

      // 定期生成新障碍物
      if (this.obstacles.length < 6) {  // 保持3组障碍物
        this.createObstacle();
      }
    } catch (e) {
      console.error('游戏更新错误:', e);
    }
  }

  // 碰撞检测
  checkCollision(player, obstacle) {
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

  // 检查发波与障碍物的碰撞
  checkWaveCollisions() {
    try {
      const wave = this.player.waveSkill;
      
      // 安全检查
      if (!wave || !wave.center || typeof wave.center.x !== 'number' || typeof wave.center.y !== 'number') {
        return;
      }
      
      // 创建一个新数组来存储未被销毁的障碍物
      const remainingObstacles = [];
      
      // 遍历所有障碍物
      for (let i = 0; i < this.obstacles.length; i++) {
        const obstacle = this.obstacles[i];
        
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
          
          // 添加销毁效果（可选）
          this.addDestroyEffect(obstacle);
          
          // 不将此障碍物添加到新数组中，相当于销毁它
        } else {
          // 障碍物未被命中，保留
          remainingObstacles.push(obstacle);
        }
      }
      
      // 更新障碍物数组
      this.obstacles = remainingObstacles;
    } catch(err) {
      console.error('检查波纹碰撞出错:', err);
    }
  }
  
  // 添加障碍物销毁效果
  addDestroyEffect(obstacle) {
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
    
    // 添加到爆炸效果数组
    if (!this.explosions) {
      this.explosions = [];
    }
    this.explosions.push(explosion);
    
    // 增加得分
    this.score += 1;
  }
  
  // 更新并渲染爆炸效果
  updateAndRenderExplosions() {
    if (!this.explosions || this.explosions.length === 0) return;
    
    const remainingExplosions = [];
    
    // 遍历所有爆炸效果
    for (let i = 0; i < this.explosions.length; i++) {
      const explosion = this.explosions[i];
      
      // 更新爆炸圆圈
      explosion.radius += 2;
      explosion.alpha -= 0.05;
      
      // 如果爆炸效果还可见，继续渲染
      if (explosion.alpha > 0) {
        // 渲染爆炸圆圈
        this.ctx.globalAlpha = explosion.alpha;
        this.ctx.fillStyle = explosion.color;
        this.ctx.beginPath();
        this.ctx.arc(explosion.x, explosion.y, explosion.radius, 0, Math.PI * 2);
        this.ctx.fill();
        
        // 更新并渲染粒子
        for (let j = 0; j < explosion.particles.length; j++) {
          const particle = explosion.particles[j];
          
          // 更新粒子位置
          particle.x += particle.vx;
          particle.y += particle.vy;
          particle.alpha -= particle.decay;
          
          // 渲染粒子
          if (particle.alpha > 0) {
            this.ctx.globalAlpha = particle.alpha;
            this.ctx.fillStyle = particle.color;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
            this.ctx.fill();
          }
        }
        
        // 保留此爆炸效果
        remainingExplosions.push(explosion);
      }
    }
    
    // 重置透明度
    this.ctx.globalAlpha = 1.0;
    
    // 更新爆炸效果数组
    this.explosions = remainingExplosions;
  }

  // 分享游戏
  shareGame() {
    if (kwaigame.shareAppMessage) {
      kwaigame.shareAppMessage({
        title: '无敌冲刺大乱斗',
        imageUrl: 'assets/images/share.png',
        query: '',
        success: () => {
          console.log('分享成功');
          // 给予分享奖励
          this.score += 10;
          kwaigame.showToast({
            title: '分享成功,奖励10分',
            icon: 'success'
          });
        },
        fail: (err) => {
          console.error('分享失败:', err);
        }
      });
    } else {
      console.log('当前环境不支持分享');
    }
  }

  // 修改检查点击重新开始按钮的方法
  checkTouchRestartBtn(x, y) {
    // 如果游戏正在加载中，忽略所有点击
    if (this.isLoading) {
      return false;
    }
    
    // 检查重新开始按钮
    if (x >= this.restartBtn.x &&
        x <= this.restartBtn.x + this.restartBtn.width &&
        y >= this.restartBtn.y &&
        y <= this.restartBtn.y + this.restartBtn.height) {
      return true;
    }

    // 检查重生按钮
    const menuBtnY = this.restartBtn.y + this.restartBtn.height + 20;
    if (x >= this.restartBtn.x &&
        x <= this.restartBtn.x + this.restartBtn.width &&
        y >= menuBtnY &&
        y <= menuBtnY + this.restartBtn.height) {
      this.revivePlayer();
      return false; // 不需要重置游戏，让重生函数处理
    }
    
    return false;
  }

  // 初始化玩家对象
  initPlayerObject() {
    // 初始化玩家
    this.player = {
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
    
    // 添加控制区域配置
    this.controlAreas = {
      left: { x: 0, y: config.height - 200, width: config.width / 4, height: 100 },
      right: { x: config.width * 3/4, y: config.height - 200, width: config.width / 4, height: 100 },
      up: { x: config.width / 4, y: config.height - 200, width: config.width / 4, height: 100 },
      down: { x: config.width / 2, y: config.height - 200, width: config.width / 4, height: 100 },
      dashBtn: { x: config.width - 80, y: config.height - 80, radius: 30 },
      waveBtn: { x: config.width - 80, y: config.height - 160, radius: 30 }
    };
  }
  
  // 初始化广告
  initAds() {
    console.log('[广告初始化] 开始初始化广告');
    
    // 检查广告API是否可用
    if (!kwaigame.createRewardedVideoAd) {
      console.log('[广告初始化] 广告API不可用，使用降级方案');
      return;
    }

    try {
      // 创建广告实例
      this.reviveAd = kwaigame.createRewardedVideoAd({
        adUnitId: 'adunit-xxxxxxxxxxxxxxxx' // 替换为实际的广告单元ID
      });

      // 监听广告关闭事件
      if (this.reviveAd && typeof this.reviveAd.onClose === 'function') {
        this.reviveAd.onClose((res) => {
          console.log('[广告关闭] 广告关闭，结果:', res);
          if (res && res.isEnded) {
            // 正常播放结束，可以下发游戏奖励
            this.hasWatchedAd = true;
            this.completeRevive();
          } else {
            // 播放中途退出，不下发游戏奖励
            this.hasWatchedAd = false;
            this.fallbackRevive();
          }
        });
      }

      console.log('[广告初始化] 广告实例创建成功');
    } catch (error) {
      console.error('[广告初始化] 创建广告实例失败:', error);
    }
  }
  
  // 显示复活广告
  showReviveAd() {
    console.log('[广告显示] 开始显示复活广告');
    
    if (!this.reviveAd) {
      console.log('[广告显示] 广告实例不存在，使用降级方案');
      this.fallbackRevive();
      return;
    }

    try {
      // 显示广告
      this.reviveAd.show().catch(() => {
        // 失败重试
        this.reviveAd.show()
          .catch(() => {
            console.log('[广告显示] 显示失败，使用降级方案');
            this.fallbackRevive();
          });
      });
    } catch (error) {
      console.error('[广告显示] 显示广告时发生错误:', error);
      this.fallbackRevive();
    }
  }
  
  // 添加降级复活方法
  fallbackRevive() {
    console.log('[广告显示] 跳过广告，直接复活玩家');
    this.hasWatchedAd = true; // 标记为已观看广告，避免卡住
    this.completeRevive();
  }
}

// 游戏启动
function startGame() {
  new Game();
}

// 监听显示事件
kwaigame.onShow(() => {
    startGame();
});
