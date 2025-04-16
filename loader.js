// 加载图片资源
function loadImages(callback) {
  console.log('[资源加载] 开始加载图片资源');
  
  const result = {
    playerImage: null,
    enemyImage: null,
    playerImageLoaded: false,
    enemyImageLoaded: false
  };
  
  let imagesToLoad = 2; // 需要加载的图片数量
  const checkCompletion = () => {
    imagesToLoad--;
    if (imagesToLoad === 0) {
      console.log('[图片加载] 所有图片加载尝试完成');
      if (callback) callback(result);
    }
  };

  // 加载玩家图片
  try {
    result.playerImage = kwaigame.createImage();
    result.playerImage.src = '/assets/images/yingxiong.png';
    result.playerImage.onload = () => {
      console.log('[图片加载] 玩家图片(yingxiong.png)加载成功');
      result.playerImageLoaded = true;
      checkCompletion();
    };
    result.playerImage.onerror = (e) => {
      console.error('[图片加载] 玩家图片加载失败:', e);
      // 尝试打印更详细的错误信息
      if (e && e.errMsg) { 
        console.error('[图片加载] 详细错误:', e.errMsg);
      }
      result.playerImageLoaded = false;
      checkCompletion();
    };
  } catch (e) {
      console.error('[图片加载] 创建玩家图片失败:', e);
      result.playerImageLoaded = false;
      checkCompletion(); // 即使创建失败也要减少计数
  }

  // 加载敌人图片
  try {
    result.enemyImage = kwaigame.createImage();
    result.enemyImage.src = '/assets/images/monster.png';
    result.enemyImage.onload = () => {
      console.log('[图片加载] 敌人图片(monster.png)加载成功');
      result.enemyImageLoaded = true;
      checkCompletion();
    };
    result.enemyImage.onerror = (e) => {
      console.error('[图片加载] 敌人图片加载失败:', e);
      // 尝试打印更详细的错误信息
      if (e && e.errMsg) { 
        console.error('[图片加载] 详细错误:', e.errMsg);
      }
      result.enemyImageLoaded = false;
      checkCompletion();
    };
  } catch (e) {
      console.error('[图片加载] 创建敌人图片失败:', e);
      result.enemyImageLoaded = false;
      checkCompletion(); // 即使创建失败也要减少计数
  }
  
  return result;
}

// 开始加载监控器
function startLoadingMonitor(gameState, onComplete) {
  console.log(`[加载监控] 启动加载监控，开始时间: ${gameState.loadingStartTime}`);
  
  // 检查加载是否卡住
  const checkLoadingStatus = () => {
    const currentTime = Date.now();
    const loadingTime = currentTime - gameState.loadingStartTime;
    
    console.log(`[加载监控] 当前加载状态：进度=${gameState.loadingProgress}%，已用时间=${loadingTime}ms，isLoading=${gameState.isLoading}`);
    
    // 如果加载超过20秒，强制完成加载
    if (gameState.isLoading && loadingTime > 20000) {
      console.warn('[加载监控] 加载时间过长，强制完成');
      gameState.loadingProgress = 100;
      gameState.isLoading = false;
      if (onComplete) onComplete();
      return;
    }
    
    // 如果加载进度超过了100%，修正为100%
    if (gameState.loadingProgress > 100) {
      console.warn(`[加载监控] 加载进度异常: ${gameState.loadingProgress}%，修正为100%`);
      gameState.loadingProgress = 100;
    }
    
    // 如果加载进度一直卡在90%超过5秒，强制完成
    if (gameState.loadingProgress >= 90 && gameState.loadingProgress < 100 && 
        currentTime - gameState.timeAt90Percent > 5000) {
      console.warn('[加载监控] 加载卡在90%超过5秒，强制完成');
      gameState.loadingProgress = 100;
      gameState.isLoading = false;
      if (onComplete) onComplete();
      return;
    }
    
    // 记录到达90%的时间
    if (gameState.loadingProgress >= 90 && !gameState.timeAt90Percent) {
      gameState.timeAt90Percent = currentTime;
      console.log(`[加载监控] 加载进度达到90%，记录时间: ${gameState.timeAt90Percent}`);
    }
    
    // 如果进度为100%但isLoading仍为true，强制完成加载
    if (gameState.loadingProgress >= 100 && gameState.isLoading) {
      console.log('[加载监控] 进度已达100%，完成加载');
      gameState.isLoading = false;
      if (onComplete) onComplete();
      return;
    }
    
    // 继续监控
    if (gameState.isLoading) {
      setTimeout(checkLoadingStatus, 1000);
    }
  };
  
  // 开始监控
  setTimeout(checkLoadingStatus, 1000);
}

// 加载游戏资源
function loadResources(gameState, onComplete) {
  // 记录开始加载资源时间
  console.log(`[资源加载] 开始加载资源，时间戳: ${Date.now()}`);
  
  // 设置全局加载超时 - 缩短到10秒以允许图片加载
  const loadingTimeout = setTimeout(() => {
    console.warn(`[资源加载] 资源加载超时，强制完成加载，时间戳: ${Date.now()}`);
    gameState.loadingProgress = 100;
    gameState.isLoading = false;
    if (onComplete) onComplete();
  }, 10000); // 10秒超时
  
  // 1. 开始加载过程
  console.log('[资源加载] 设置进度: 10%');
  gameState.loadingProgress = 10;
  
  // 2. 加载图片资源
  console.log('[资源加载] 设置进度: 30%，开始加载图片资源');
  const images = loadImages((imageResults) => {
    // 更新图片加载结果
    gameState.playerImage = imageResults.playerImage;
    gameState.enemyImage = imageResults.enemyImage;
    gameState.playerImageLoaded = imageResults.playerImageLoaded;
    gameState.enemyImageLoaded = imageResults.enemyImageLoaded;
    
    // 更新进度
    gameState.loadingProgress = 80;
    console.log('[资源加载] 图片资源加载尝试完成，设置进度: 80%');
    
    // 标记为加载完成
    gameState.loadingProgress = 100;
    console.log('[资源加载] 设置进度: 100%');
    
    // 清除加载计时器
    clearTimeout(loadingTimeout);
    
    // 短暂延迟后结束加载状态，让用户看到100%
    setTimeout(() => {
      // 检查是否仍在加载（可能因为超时被强制完成）
      if (gameState.isLoading) {
        console.log(`[资源加载] 完成加载，进入游戏，时间戳: ${Date.now()}`);
        gameState.isLoading = false;
        if (onComplete) onComplete();
      }
    }, 500);
  });
   
  // 添加加载监控器 - 确保即使资源加载卡住也能进入游戏
  startLoadingMonitor(gameState, onComplete);
  
  return images;
}

// 使用 CommonJS 方式导出
module.exports = {
  loadImages,
  startLoadingMonitor,
  loadResources
}; 