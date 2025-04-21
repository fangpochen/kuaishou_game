console.log('使用快手开发者工具开发过程中可以参考以下文档:');
console.log('https://dev.kuaishou.com/game/guide/introduction');

// 使用 CommonJS 方式导入模块
const { config } = require('./config.js');
const { initPlayerObject, initControlAreas, startDash, useWaveSkill, checkCollision } = require('./player.js');
const { createObstacle, findGaps, checkWaveCollisions, createDestroyEffect, updateExplosions } = require('./obstacles.js');
const { initUIConfig, drawButton, drawDialog, checkButtonClick, checkDialogClick, checkAreaClick, checkCircleClick } = require('./ui.js');
const { renderGame, renderLoadingScreen, renderStartScreen, renderGameControls } = require('./renderer.js');
const { update, handleGameOver, startRevive, completeRevive, revivePlayer, resetGame, backToStartScreen, updateStartScreenEffects } = require('./gameLogic.js');
const { initAds, showReviveAd, setupAdCloseListener, showAdForReward, initRewardAd } = require('./ads.js');
const { loadImages, startLoadingMonitor, loadResources } = require('./loader.js');

// 引入环境配置(如果还没有在文件顶部引入)
const ENV = require('./env.js');

class Game {
  constructor() {
    try {
      console.log(`[游戏初始化] 开始初始化游戏，时间戳: ${Date.now()}`);
      
      // 尝试列出根目录内容
      try {
        const fs = kwaigame.getFileSystemManager();
        fs.readdir({
          dirPath: '/', // 读取根目录
          success: (res) => {
            console.log('[文件系统] 根目录内容:', res.files);
            // 进一步读取 /assets/ 目录内容
            fs.readdir({
              dirPath: '/assets/',
              success: (assetsRes) => {
                console.log('[文件系统] /assets/ 目录内容:', assetsRes.files);
                // 进一步读取 /assets/images/ 目录内容
                fs.readdir({
                  dirPath: '/assets/images/',
                  success: (imagesRes) => {
                    console.log('[文件系统] /assets/images/ 目录内容:', imagesRes.files);
                  },
                  fail: (imagesErr) => {
                    console.error('[文件系统] 读取 /assets/images/ 目录失败:', imagesErr);
                  }
                });
              },
              fail: (assetsErr) => {
                console.error('[文件系统] 读取 /assets/ 目录失败:', assetsErr);
              }
            });
          },
          fail: (err) => {
            console.error('[文件系统] 读取根目录失败:', err);
          }
        });
      } catch(fsError) {
        console.error('[文件系统] 获取或使用FileSystemManager失败:', fsError);
      }
      
      // 游戏加载标志
      this.isLoading = true;
      this.loadingProgress = 0;
      this.loadingStartTime = Date.now();
      this.lastLoggedProgress = 0; // 初始化日志记录进度
      this.timeAt90Percent = 0;    // 初始化90%进度的时间戳
      
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
        // 使用默认尺寸
        this.canvas = kwaigame.createCanvas();
        this.ctx = this.canvas.getContext('2d');
        console.log(`[游戏初始化] 使用默认配置尺寸: ${config.width}x${config.height}`);
      }
      
      // 游戏状态
      this.isStartScreen = true; // 是否显示启动界面
      this.score = 0;
      this.isGameOver = false;
      this.lives = config.maxLives;
      this.isReviving = false;
      this.reviveCountdown = 0;
      this.isSettingsScreen = false; // 添加设置界面状态
      this.openId = null; // 存储用户的OpenID
      this.isPaused = true; // 游戏是否暂停，初始为暂停状态
      
      // 登录凭证和OpenID相关
      this.loginCode = null; // 临时登录凭证
      this.serverOpenId = null; // 服务器返回的OpenID
      this.sessionKey = null; // 会话密钥
      this.unionId = null; // 关联用户的唯一标识
      
      // 复制功能相关
      this.showCopySuccess = false; // 是否显示复制成功提示
      this.copySuccessTime = 0; // 复制成功时间戳
      this.copyBtn = null; // 复制按钮
      this.showOpenIdPopup = false; // 是否显示OpenID弹窗
      this.popupCreatedTime = 0; // 弹窗创建时间
      
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
      
      // 图片资源
      this.playerImage = null;
      this.enemyImage = null;
      this.playerImageLoaded = false;
      this.enemyImageLoaded = false;
      
      // 启动界面动画效果参数
      this.startScreenEffects = {
        particles: [],
        particleCount: 50,
        titleScale: 1,
        titleScaleDirection: 0.001,
        btnPulse: 0,
        timestamp: Date.now()
      };
      
      // 初始化玩家对象
      this.player = initPlayerObject();
      
      // 初始化控制区域
      this.controlAreas = initControlAreas();
      
      // 初始化UI配置
      const ui = initUIConfig(config.width, config.height);
      this.startBtn = ui.startBtn;
      this.gameTitle = ui.gameTitle;
      this.restartBtn = ui.restartBtn;
      this.sidebarBtn = ui.sidebarBtn;
      this.gotoSidebarBtn = ui.gotoSidebarBtn;
      this.getRewardBtn = ui.getRewardBtn;
      this.shareBtn = ui.shareBtn;
      this.adRewardBtn = ui.adRewardBtn;
      this.homeBtn = ui.homeBtn;
      this.settingsBtn = ui.settingsBtn;
      this.backBtn = ui.backBtn;
      this.sidebarDialog = ui.sidebarDialog;
      this.pauseBtn = ui.pauseBtn; // 获取暂停按钮配置
      
      console.log('[游戏初始化] UI配置初始化完成');
      
      // 开始游戏循环
      console.log('[游戏初始化] 启动游戏循环');
      this.gameLoop();
      
      // 开始资源加载过程
      console.log('[游戏初始化] 开始加载资源');
      this.loadResources();
      
      // 初始化事件监听
      this.initEventListeners();
      
    } catch (e) {
      console.error('[游戏初始化] 初始化游戏失败:', e);
      // 尝试强制完成加载，避免卡在加载界面
      try {
        this.loadingProgress = 100;
        this.isLoading = false;
        console.log('[游戏初始化] 错误恢复：强制完成加载');
      } catch(err) {
        console.error('[游戏初始化] 错误恢复失败:', err);
      }
    }
  }

  // 加载资源
  loadResources() {
    loadResources(this, () => {
      // 在进入游戏后再初始化广告，彻底与游戏加载分离
      setTimeout(() => {
        try {
          console.log('[资源加载] 开始后台初始化广告');
          this.initAds();
        } catch (e) {
          console.error('[资源加载] 初始化广告失败:', e);
        }
      }, 1000);
    });
  }
  
  // 初始化广告
  initAds() {
    this.reviveAd = initAds();
    
    // 设置广告关闭事件
    setupAdCloseListener(
      this.reviveAd, 
      (isEnded) => {
        // 正常播放结束，可以下发游戏奖励
        this.hasWatchedAd = true;
        this.completeRevive();
      },
      () => {
        // 播放中途退出，不下发游戏奖励
        this.hasWatchedAd = false;
        this.fallbackRevive();
      }
    );
  }
  
  // 显示复活广告
  showReviveAd() {
    showReviveAd(
      this.reviveAd, 
      null,
      () => this.fallbackRevive()
    );
  }
  
  // 添加降级复活方法
  fallbackRevive() {
    console.log('[广告显示] 跳过广告，直接复活玩家');
    this.hasWatchedAd = true; // 标记为已观看广告，避免卡住
    this.completeRevive();
  }

  // 显示广告获取积分
  showAdForReward() {
    console.log('[广告积分] 尝试显示广告获取积分');
    
    // 如果没有初始化过广告，先初始化
    if (!this.rewardAd) {
      this.rewardAd = initRewardAd((res) => {
        console.log('[广告积分] 广告关闭，结果:', res);
        if (res && res.isEnded) {
          // 正常播放结束，给予积分奖励
          const rewardScore = 20; // 给予20分的奖励
          this.score += rewardScore;
          kwaigame.showToast({
            title: `获得${rewardScore}积分奖励!`,
            icon: 'success',
            duration: 2000
          });
        } else {
          // 播放中途退出，不给予奖励
          kwaigame.showToast({
            title: '观看完整广告才能获得奖励',
            icon: 'none',
            duration: 2000
          });
        }
      });
    }
    
    showAdForReward(
      this.rewardAd,
      null,
      (errorMsg) => {
        kwaigame.showToast({
          title: errorMsg || '广告加载失败，请稍后再试',
          icon: 'none',
          duration: 2000
        });
      }
    );
  }

  // 初始化事件监听
  initEventListeners() {
    // 监听显示事件
    kwaigame.onShow(() => {
      this.checkEntryScene();
    });
    
    // 初始化触摸事件
    this.initTouchEvents();
    
    // 尝试获取OpenID
    this.getOpenId();
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
  
  // 获取OpenID
  getOpenId() {
    // 优先使用ks命名空间(快手小游戏官方API)
    if (typeof ks !== 'undefined' && ks.login) {
      try {
        console.log('[登录] 尝试使用ks.login获取临时凭证');
        ks.login({
          success: (res) => {
            if (res && res.code) {
              console.log('[登录] 获取临时凭证成功:', res.code);
              // 注意：这里获取的是临时凭证code，需要在服务器使用auth.code2Session接口获取真正的OpenID
              // 接口文档：https://ks-game-docs.kuaishou.com/minigame/api/open/login/auth.code2Session.html
              this.loginCode = res.code;
              this.openId = '临时凭证: ' + res.code + ' (请在服务器端调用auth.code2Session接口获取OpenID)';
              
              // 尝试向服务器请求OpenID
              this.requestOpenIdFromServer(res.code);
            }
          },
          fail: (err) => {
            console.error('[登录] 获取临时凭证失败:', err);
            this.openId = '获取临时凭证失败';
          }
        });
      } catch (e) {
        console.error('[登录] 调用ks.login出错:', e);
        this.openId = '登录API调用出错';
      }
    } 
    // 尝试使用kwaigame命名空间(兼容旧API)
    else if (typeof kwaigame !== 'undefined' && kwaigame.login) {
      try {
        console.log('[登录] 尝试使用kwaigame.login获取临时凭证');
        kwaigame.login({
          success: (res) => {
            if (res && res.code) {
              console.log('[登录] 获取临时凭证成功:', res.code);
              // 这里同样是临时凭证，需要在服务器换取OpenID
              this.loginCode = res.code;
              this.openId = '临时凭证: ' + res.code + ' (请在服务器端调用auth.code2Session接口获取OpenID)';
              
              // 尝试向服务器请求OpenID
              this.requestOpenIdFromServer(res.code);
            }
          },
          fail: (err) => {
            console.error('[登录] 获取临时凭证失败:', err);
            this.openId = '获取临时凭证失败';
          }
        });
      } catch (e) {
        console.error('[登录] 调用kwaigame.login出错:', e);
        this.openId = '登录API调用出错';
      }
    } else {
      console.error('[登录] 当前环境不支持login API');
      this.openId = '当前环境不支持login API';
    }
  }

  // 向服务器请求OpenID
  requestOpenIdFromServer(code) {
    try {
      console.log('[请求OpenID] 开始向服务器请求OpenID，code:', code);
      
      // 使用环境配置中的API URL
      const serverUrl = ENV.getApiUrl('api/v1/kuaishou/auth');
      console.log('[授权] 使用API地址:', serverUrl);
      
      // 显示请求中的状态
      this.serverOpenId = '正在请求服务器...';
      
      // 优先使用ks命名空间的request
      if (typeof ks !== 'undefined' && ks.request) {
        console.log('[请求OpenID] 使用ks.request发送请求');
        ks.request({
          url: serverUrl,
          method: 'POST',
          data: { code: code },
          header: {
            'content-type': 'application/json'
          },
          success: (res) => {
            console.log('[请求OpenID] 服务器返回数据:', res);
            if (res.statusCode === 200 && res.data) {
              const data = res.data;
              if (data.open_id) {
                this.serverOpenId = data.open_id;
                this.sessionKey = data.session_key;
                this.unionId = data.union_id;
                console.log('[请求OpenID] 获取成功，OpenID:', this.serverOpenId);
              } else {
                console.error('[请求OpenID] 服务器未返回有效的OpenID');
                this.serverOpenId = '服务器未返回有效数据';
              }
            } else {
              console.error('[请求OpenID] 服务器返回错误:', res);
              this.serverOpenId = '服务器返回错误: ' + (res.statusCode || '未知错误');
            }
          },
          fail: (err) => {
            console.error('[请求OpenID] 请求失败:', err);
            this.serverOpenId = '请求失败: ' + (err.errMsg || JSON.stringify(err));
          }
        });
      }
      // 尝试使用kwaigame命名空间的request
      else if (typeof kwaigame !== 'undefined' && kwaigame.request) {
        console.log('[请求OpenID] 使用kwaigame.request发送请求');
        kwaigame.request({
          url: serverUrl,
          method: 'POST',
          data: { code: code },
          header: {
            'content-type': 'application/json'
          },
          success: (res) => {
            console.log('[请求OpenID] 服务器返回数据:', res);
            if (res.statusCode === 200 && res.data) {
              const data = res.data;
              if (data.open_id) {
                this.serverOpenId = data.open_id;
                this.sessionKey = data.session_key;
                this.unionId = data.union_id;
                console.log('[请求OpenID] 获取成功，OpenID:', this.serverOpenId);
              } else {
                console.error('[请求OpenID] 服务器未返回有效的OpenID');
                this.serverOpenId = '服务器未返回有效数据';
              }
            } else {
              console.error('[请求OpenID] 服务器返回错误:', res);
              this.serverOpenId = '服务器返回错误: ' + (res.statusCode || '未知错误');
            }
          },
          fail: (err) => {
            console.error('[请求OpenID] 请求失败:', err);
            this.serverOpenId = '请求失败: ' + (err.errMsg || JSON.stringify(err));
          }
        });
      }
      // 尝试使用XMLHttpRequest作为后备方案
      else if (typeof XMLHttpRequest !== 'undefined') {
        console.log('[请求OpenID] 使用XMLHttpRequest发送请求');
        const xhr = new XMLHttpRequest();
        xhr.open('POST', serverUrl, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.onreadystatechange = () => {
          if (xhr.readyState === 4) {
            if (xhr.status === 200) {
              try {
                const data = JSON.parse(xhr.responseText);
                if (data.open_id) {
                  this.serverOpenId = data.open_id;
                  this.sessionKey = data.session_key;
                  this.unionId = data.union_id;
                  console.log('[请求OpenID] 获取成功，OpenID:', this.serverOpenId);
                } else {
                  console.error('[请求OpenID] 服务器未返回有效的OpenID');
                  this.serverOpenId = '服务器未返回有效数据';
                }
              } catch (e) {
                console.error('[请求OpenID] 解析响应失败:', e);
                this.serverOpenId = '解析响应失败';
              }
            } else {
              console.error('[请求OpenID] 服务器返回错误状态码:', xhr.status);
              this.serverOpenId = '服务器返回错误: ' + xhr.status;
            }
          }
        };
        xhr.onerror = (e) => {
          console.error('[请求OpenID] 请求出错:', e);
          this.serverOpenId = '请求出错';
        };
        xhr.send(JSON.stringify({ code: code }));
      }
      // 所有方法都不可用
      else {
        console.error('[请求OpenID] 当前环境不支持任何网络请求API');
        this.serverOpenId = '当前环境不支持网络请求';
      }
    } catch (e) {
      console.error('[请求OpenID] 请求过程发生错误:', e);
      this.serverOpenId = '请求过程出错: ' + e.message;
    }
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
      if (isStart && checkButtonClick(this.startBtn, touch)) {
        this.isStartScreen = false; // 隐藏启动界面
        this.isPaused = false; // 开始游戏时取消暂停状态
        return;
      }
      
      // 检查设置按钮点击
      if (isStart && checkButtonClick(this.settingsBtn, touch)) {
        this.gotoSettings();
        return;
      }
      
      return; // 启动界面时不处理其他触摸事件
    }
    
    // 设置界面点击处理
    if (this.isSettingsScreen) {
      // 如果显示OpenID弹窗，处理弹窗内的点击
      if (this.showOpenIdPopup) {
        if (isStart && this.closePopupBtn && checkButtonClick(this.closePopupBtn, touch)) {
          this.closeOpenIdPopup();
          return;
        }
        
        // 检查复制按钮点击
        if (isStart && this.copyBtn && checkButtonClick(this.copyBtn, touch)) {
          console.log('[弹窗复制] 点击弹窗内复制按钮');
          this.tryAllCopyMethods();
          return;
        }
        
        // 弹窗显示时，阻止其他点击
        return;
      }
      
      // 检查返回按钮点击
      if (isStart && checkButtonClick(this.backBtn, touch)) {
        this.goBack();
        return;
      }
      
      // 检查刷新按钮点击
      const refreshBtn = {
        x: config.width - 120,
        y: 100,
        width: 80,
        height: 40
      };
      
      if (isStart && checkButtonClick(refreshBtn, touch)) {
        this.getOpenId(); // 重新获取OpenID
        return;
      }
      
      // 检查设置界面上的复制按钮点击
      if (isStart && this.copyBtn && checkButtonClick(this.copyBtn, touch)) {
        console.log('[设置页复制] 点击设置页复制按钮');
        
        // 直接打开弹窗，弹窗中再处理复制
        this.copyOpenIdToClipboard();
        return;
      }
      
      return; // 设置界面时不处理其他触摸事件
    }
    
    // 检查暂停/恢复按钮点击 (在游戏主要操作之前检查)
    // 确保 pauseBtn 存在
    if (isStart && this.pauseBtn && !this.isGameOver && !this.isReviving && checkButtonClick(this.pauseBtn, touch)) {
      this.isPaused = !this.isPaused; // 切换暂停状态
      console.log(`[游戏状态] 游戏 ${this.isPaused ? '已暂停' : '已恢复'}`);
      return; // 阻止本次触摸事件的其他处理
    }
    
    // 如果游戏已暂停，则不处理后续的游戏操作点击
    if (this.isPaused) {
      return;
    }
    
    // 如果游戏结束，检查重新开始按钮
    if (this.isGameOver) {
      if (isStart && this.checkTouchRestartBtn(touch.clientX, touch.clientY)) {
        this.resetGame();
        return;
      }
    }
    
    // 检查看广告得分按钮点击
    if (isStart && checkButtonClick(this.adRewardBtn, touch)) {
      this.showAdForReward();
      return;
    }
    
    // 检查返回主页按钮点击
    if (isStart && checkButtonClick(this.homeBtn, touch)) {
      this.backToStartScreen();
      return;
    }
    
    try {
      // 冲刺按钮检测
      if (isStart && checkCircleClick(this.controlAreas.dashBtn, touch)) {
        startDash(this.player);
        return;
      }

      // 发波按钮检测
      if (isStart && checkCircleClick(this.controlAreas.waveBtn, touch)) {
        if (useWaveSkill(this.player, this.score, kwaigame.showToast)) {
          this.score -= config.waveSkillRequiredScore;
        }
        return;
      }

      // 移动控制区域检测
      if (checkAreaClick(this.controlAreas.left, touch)) {
        this.player.moveDirection = -1; // 左移
      } else if (checkAreaClick(this.controlAreas.right, touch)) {
        this.player.moveDirection = 1;  // 右移
      }
      
      if (checkAreaClick(this.controlAreas.up, touch)) {
        this.player.verticalDirection = -1; // 上移（前进）
      } else if (checkAreaClick(this.controlAreas.down, touch)) {
        this.player.verticalDirection = 1;  // 下移（后退）
      }
    } catch (e) {
      console.error('触摸事件处理错误:', e);
    }
  }
  
  // 处理触摸结束
  handleTouchEnd(touch) {
    // 检查是否在控制区域内
    if (checkAreaClick(this.controlAreas.left, touch)) {
      this.player.moveDirection = 0;
    }
    if (checkAreaClick(this.controlAreas.right, touch)) {
      this.player.moveDirection = 0;
    }
    if (checkAreaClick(this.controlAreas.up, touch)) {
      this.player.verticalDirection = 0;
    }
    if (checkAreaClick(this.controlAreas.down, touch)) {
      this.player.verticalDirection = 0;
    }
  }

  // 游戏主循环
  gameLoop() {
    try {
      // 更新游戏状态
      if (this.isStartScreen) {
        // 更新启动界面特效
        this.startScreenEffects = updateStartScreenEffects(this.startScreenEffects);
      } else if (!this.isLoading && !this.isSettingsScreen) {
        // 只有在未加载、不在设置界面且未暂停时才更新游戏逻辑
        if (!this.isPaused) {
          // 更新游戏逻辑
          const newState = update({
            isStartScreen: this.isStartScreen,
            isLoading: this.isLoading,
            isGameOver: this.isGameOver,
            isSettingsScreen: this.isSettingsScreen,
            isPaused: this.isPaused,
            isReviving: this.isReviving,
            reviveCountdown: this.reviveCountdown,
            player: this.player,
            obstacles: this.obstacles,
            explosions: this.explosions,
            score: this.score
          });
          
          // 更新游戏状态
          this.score = newState.score;
          this.obstacles = newState.obstacles;
          this.isReviving = newState.isReviving;
          this.reviveCountdown = newState.reviveCountdown;
          
          // 检查碰撞
          if (newState.collisionDetected) {
            this.gameOver();
          }
          
          // 检查发波碰撞
          if (this.player.waveSkill.isActive) {
            this.checkWaveCollisions();
          }
        }
      }
      
      // 渲染游戏画面
      this.render();
      
      // 继续游戏循环
      requestAnimationFrame(() => this.gameLoop());
    } catch (e) {
      console.error('游戏循环错误:', e); 
      // 添加详细错误信息打印
      if (e instanceof Error) {
          console.error('错误消息:', e.message);
          console.error('错误堆栈:', e.stack);
      }
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
  
  // 检查发波与障碍物的碰撞
  checkWaveCollisions() {
    // 添加销毁效果的回调
    const addDestroyEffect = (obstacle) => {
      // 创建爆炸效果
      const explosion = createDestroyEffect(obstacle);
      
      // 添加到爆炸效果数组
      if (!this.explosions) {
        this.explosions = [];
      }
      this.explosions.push(explosion);
      
      // 增加得分
      this.score += 1;
    };
    
    // 执行碰撞检查
    this.obstacles = checkWaveCollisions(this.player, this.obstacles, addDestroyEffect);
  }
  
  // 渲染
  render() {
    // 如果正在加载资源，渲染加载界面
    if (this.isLoading) {
      renderLoadingScreen(this.ctx, this.loadingProgress, this.loadingStartTime);
      return;
    }
    
    // 如果在启动界面，渲染启动界面后返回
    if (this.isStartScreen) {
      renderStartScreen(this.ctx, {
        gameTitle: this.gameTitle, 
        startBtn: this.startBtn, 
        settingsBtn: this.settingsBtn,
        startScreenEffects: this.startScreenEffects,
        width: config.width,
        height: config.height
      });
      return;
    }
    
    // 如果在设置界面，渲染设置界面后返回
    if (this.isSettingsScreen) {
      this.renderSettingsScreen();
      return;
    }

    // 渲染游戏界面
    renderGame(this.ctx, {
      player: this.player,
      obstacles: this.obstacles,
      explosions: this.explosions,
      controlAreas: this.controlAreas,
      ui: {
        restartBtn: this.restartBtn,
        adRewardBtn: this.adRewardBtn,
        homeBtn: this.homeBtn,
        pauseBtn: this.pauseBtn
      },
      lives: this.lives,
      score: this.score,
      isReviving: this.isReviving,
      reviveCountdown: this.reviveCountdown,
      isGameOver: this.isGameOver,
      isPaused: this.isPaused,
      playerImage: this.playerImage,
      playerImageLoaded: this.playerImageLoaded,
      enemyImage: this.enemyImage,
      enemyImageLoaded: this.enemyImageLoaded
    });
    
    // 更新并渲染爆炸效果
    this.explosions = updateExplosions(this.explosions, this.ctx);
    
    // 按钮渲染
    this.renderButtons();
  }
  
  // 渲染UI按钮
  renderButtons() {
    // 已禁用侧边栏功能，不显示侧边栏相关按钮
    
    // 绘制广告积分按钮
    if (!this.isStartScreen && !this.isGameOver && !this.isSettingsScreen) {
      drawButton(
        this.ctx,
        this.adRewardBtn,
        '#ea4335',
        '#ffffff'
      );
      
      // 绘制返回主页按钮
      drawButton(
        this.ctx,
        this.homeBtn,
        '#4285f4',
        '#ffffff'
      );
    }

    // 绘制对话框
    if(this.sidebarDialog && this.sidebarDialog.visible) {
      drawDialog(this.ctx, this.sidebarDialog, config.width, config.height);
    }
  }
  
  // 渲染设置界面
  renderSettingsScreen() {
    // 清空画布
    this.ctx.clearRect(0, 0, config.width, config.height);
    
    // 绘制背景
    this.ctx.fillStyle = '#f0f0f0';
    this.ctx.fillRect(0, 0, config.width, config.height);
    
    // 绘制标题
    this.ctx.fillStyle = '#4285f4';
    this.ctx.font = '30px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('设置', config.width/2, 80);
    
    // 绘制OpenID标签
    this.ctx.fillStyle = '#333333';
    this.ctx.font = '20px Arial';
    this.ctx.textAlign = 'left';
    this.ctx.fillText('OpenID:', 40, 160);
    
    // 使用绿色显示成功获取的OpenID
    if (this.serverOpenId && this.serverOpenId.length > 5 && !this.serverOpenId.startsWith('请求')) {
      this.ctx.fillStyle = '#34a853'; // 成功获取使用绿色
    } else {
      this.ctx.fillStyle = '#666666'; // 未获取使用灰色
    }
    this.ctx.font = '18px Arial';
    
    let displayServerOpenId = this.serverOpenId || '未获取';
    // 为了美观，如果OpenID太长，可以在显示时换行
    if (displayServerOpenId.length > 20) {
      const maxWidth = config.width - 80; // 留出左右边距
      let textWidth = this.ctx.measureText(displayServerOpenId).width;
      
      if (textWidth > maxWidth) {
        // 每行最多显示20个字符
        const firstPart = displayServerOpenId.substring(0, 20);
        const secondPart = displayServerOpenId.substring(20);
        this.ctx.fillText(firstPart, 40, 190);
        this.ctx.fillText(secondPart, 40, 215);
      } else {
        this.ctx.fillText(displayServerOpenId, 40, 200);
      }
    } else {
      this.ctx.fillText(displayServerOpenId, 40, 200);
    }
    
    // 添加复制按钮
    this.copyBtn = {
      x: config.width - 120,
      y: 170,
      width: 80,
      height: 40,
      text: '复制'
    };
    
    // 如果OpenID已获取成功，显示复制按钮
    if (this.serverOpenId && this.serverOpenId.length > 5 && !this.serverOpenId.startsWith('请求')) {
      drawButton(
        this.ctx,
        this.copyBtn,
        '#34a853',
        '#ffffff'
      );
    }
    
    // 绘制返回按钮
    drawButton(
      this.ctx,
      this.backBtn,
      '#4285f4',
      '#ffffff'
    );
    
    // 绘制刷新按钮
    const refreshBtn = {
      x: config.width - 120,
      y: 100,
      width: 80,
      height: 40,
      text: '刷新'
    };
    
    drawButton(
      this.ctx,
      refreshBtn,
      '#ea4335',
      '#ffffff'
    );
    
    // 恢复文本对齐默认值
    this.ctx.textAlign = 'start';
  }
  
  // 游戏结束处理
  gameOver() {
    const newState = handleGameOver({
      lives: this.lives,
      score: this.score,
      isGameOver: this.isGameOver
    });
    
    this.lives = newState.lives;
    this.isGameOver = newState.isGameOver;
    
    if (newState.shouldStartRevive) {
      this.startRevive();
    }
  }
  
  // 开始复活流程
  startRevive() {
    const newState = startRevive({
      isReviving: this.isReviving,
      reviveCountdown: this.reviveCountdown,
      player: this.player,
      obstacles: this.obstacles
    });
    
    this.isReviving = newState.isReviving;
    this.reviveCountdown = newState.reviveCountdown;
    this.player.isVisible = newState.player.isVisible;
    this.obstacles = newState.obstacles;
    this.player.x = newState.player.x;
    
    // 显示复活广告
    this.showReviveAd();
  }
  
  // 完成复活流程
  completeRevive() {
    const newState = completeRevive({
      reviveAd: this.reviveAd,
      hasWatchedAd: this.hasWatchedAd,
      isReviving: this.isReviving,
      player: this.player,
      reviveCountdown: this.reviveCountdown,
      lives: this.lives,
      isGameOver: this.isGameOver
    });
    
    this.isReviving = newState.isReviving;
    this.player.isVisible = newState.player.isVisible;
    this.reviveCountdown = newState.reviveCountdown;
    this.lives = newState.lives;
    this.isGameOver = newState.isGameOver;
    this.player.x = newState.player.x;
    this.player.y = newState.player.y;
  }
  
  // 重生玩家
  revivePlayer() {
    const newState = revivePlayer({
      lives: this.lives,
      isGameOver: this.isGameOver,
      isReviving: this.isReviving,
      player: this.player
    });
    
    this.lives = newState.lives;
    this.isGameOver = newState.isGameOver;
    this.isReviving = newState.isReviving;
    this.player.isVisible = newState.player.isVisible;
    this.player.x = newState.player.x;
    this.player.y = newState.player.y;
  }
  
  // 重置游戏
  resetGame() {
    const newState = resetGame({
      score: this.score,
      isGameOver: this.isGameOver,
      lives: this.lives,
      isReviving: this.isReviving,
      reviveCountdown: this.reviveCountdown,
      obstacles: this.obstacles,
      player: this.player,
      explosions: this.explosions
    });
    
    this.score = newState.score;
    this.isGameOver = newState.isGameOver;
    this.lives = newState.lives;
    this.isReviving = newState.isReviving;
    this.reviveCountdown = newState.reviveCountdown;
    this.obstacles = newState.obstacles;
    this.player = newState.player;
    this.explosions = newState.explosions;
  }
  
  // 返回启动界面
  backToStartScreen() {
    const newState = backToStartScreen({
      score: this.score,
      isGameOver: this.isGameOver,
      lives: this.lives,
      isReviving: this.isReviving,
      reviveCountdown: this.reviveCountdown,
      obstacles: this.obstacles,
      player: this.player,
      explosions: this.explosions,
      isStartScreen: this.isStartScreen,
      isPaused: this.isPaused
    });
    
    this.score = newState.score;
    this.isGameOver = newState.isGameOver;
    this.lives = newState.lives;
    this.isReviving = newState.isReviving;
    this.reviveCountdown = newState.reviveCountdown;
    this.obstacles = newState.obstacles;
    this.player = newState.player;
    this.explosions = newState.explosions;
    this.isStartScreen = newState.isStartScreen;
    this.isPaused = newState.isPaused;
  }
  
  // 进入设置界面
  gotoSettings() {
    this.isSettingsScreen = true;
    this.isStartScreen = false;
  }
  
  // 返回上一界面
  goBack() {
    if (this.isSettingsScreen) {
      this.isSettingsScreen = false;
      this.isStartScreen = true;
    }
  }
  
  // 关闭OpenID弹窗
  closeOpenIdPopup() {
    this.showOpenIdPopup = false;
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

  // 复制OpenID到剪贴板
  copyOpenIdToClipboard() {
    console.log('[复制OpenID] 尝试复制OpenID到剪贴板:', this.serverOpenId);
    
    if (!this.serverOpenId || this.serverOpenId.startsWith('请求') || this.serverOpenId === '未获取') {
      // 如果没有有效的OpenID，显示提示
      try {
        kwaigame.showToast({
          title: '没有可复制的OpenID，请先获取',
          icon: 'none',
          duration: 2000
        });
      } catch (e) {
        console.error('显示提示失败:', e);
      }
      return;
    }
    
    // 尝试直接复制
    this.directCopyToClipboard(this.serverOpenId);
  }

  // 直接复制文本到剪贴板
  directCopyToClipboard(text) {
    console.log('[复制] 尝试直接复制文本到剪贴板:', text);
    
    try {
      // 优先使用 ks 命名空间
      if (typeof ks !== 'undefined' && ks.setClipboardData) {
        ks.setClipboardData({
          data: text,
          success: () => {
            console.log('[复制] 使用ks.setClipboardData复制成功');
            this.showCopySuccessMessage();
          },
          fail: (err) => {
            console.error('[复制] 使用ks.setClipboardData复制失败:', err);
            this.tryCopyText(text);
          }
        });
      }
      // 尝试使用 kwaigame 命名空间
      else if (typeof kwaigame !== 'undefined' && kwaigame.setClipboardData) {
        kwaigame.setClipboardData({
          data: text,
          success: () => {
            console.log('[复制] 使用kwaigame.setClipboardData复制成功');
            this.showCopySuccessMessage();
          },
          fail: (err) => {
            console.error('[复制] 使用kwaigame.setClipboardData复制失败:', err);
            this.tryCopyText(text);
          }
        });
      } else {
        console.error('[复制] 当前环境不支持setClipboardData API');
        this.tryCopyText(text);
      }
    } catch (e) {
      console.error('[复制] 直接复制文本到剪贴板出错:', e);
      this.tryCopyText(text);
    }
  }

  // 尝试通用的复制方法
  tryCopyText(text) {
    console.log('[复制] 尝试通用复制方法:', text);
    
    try {
      kwaigame.showToast({
        title: 'OpenID已显示，请手动复制: ' + text,
        icon: 'none',
        duration: 5000
      });
    } catch (e) {
      console.error('[复制] 显示复制提示失败:', e);
    }
    
    // 显示手动复制提示
    this.showManualCopyTips(text);
  }

  // 显示复制成功消息
  showCopySuccessMessage() {
    console.log('[复制] 显示复制成功提示');
    try {
      kwaigame.showToast({
        title: 'OpenID已复制到剪贴板',
        icon: 'success',
        duration: 2000
      });
    } catch (e) {
      console.error('[复制] 显示复制成功提示失败:', e);
    }
  }

  // 显示手动复制提示
  showManualCopyTips(text) {
    console.log('[复制] 显示手动复制提示');
    
    // 在控制台显示待复制的文本
    console.log('请手动复制以下OpenID:');
    console.log(text);
    
    try {
      kwaigame.showModal({
        title: '复制OpenID',
        content: 'OpenID: ' + text,
        showCancel: false,
        confirmText: '确定'
      });
    } catch (e) {
      console.error('[复制] 显示手动复制对话框失败:', e);
    }
  }

  // 尝试所有复制方法
  tryAllCopyMethods() {
    console.log('[复制] 尝试所有可能的复制方法');
    
    if (!this.serverOpenId || this.serverOpenId.startsWith('请求') || this.serverOpenId === '未获取') {
      // 如果没有有效的OpenID，显示提示
      try {
        kwaigame.showToast({
          title: '没有可复制的OpenID，请先获取',
          icon: 'none',
          duration: 2000
        });
      } catch (e) {
        console.error('显示提示失败:', e);
      }
      return;
    }
    
    // 直接尝试复制
    this.directCopyToClipboard(this.serverOpenId);
  }
}

// 设置全局变量标记游戏是否初始化
Game.isInitialized = false;

// 游戏启动函数
function startGame() {
  console.log('[游戏启动] 开始游戏初始化，时间戳:', Date.now());
  try {
    new Game();
    // 标记游戏已初始化
    Game.isInitialized = true;
    console.log('[游戏启动] 游戏初始化完成');
  } catch(err) {
    console.error('[游戏启动] 游戏初始化失败:', err);
    // 如果初始化失败，尝试再次启动
    setTimeout(() => {
      console.log('[游戏启动] 尝试重新启动游戏');
      try {
        new Game();
        Game.isInitialized = true;
      } catch(e) {
        console.error('[游戏启动] 重新启动失败:', e);
      }
    }, 1000);
  }
}

// 立即启动游戏，不等待onShow事件
console.log('[游戏启动] 立即启动游戏');
startGame();

// 同时保留onShow事件监听作为备份
kwaigame.onShow(() => {
  console.log('[游戏启动] onShow事件触发');
  // 使用静态变量来检查游戏是否已初始化
  if (!Game.isInitialized) {
    console.log('[游戏启动] 通过onShow事件启动游戏');
    startGame();
  }
}); 