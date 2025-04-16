// 初始化广告
function initAds() {
  console.log('[广告初始化] 开始初始化广告');
  
  // 检查广告API是否可用
  if (!kwaigame.createRewardedVideoAd) {
    console.log('[广告初始化] 广告API不可用，使用降级方案');
    return null;
  }

  try {
    // 创建广告实例
    const reviveAd = kwaigame.createRewardedVideoAd({
      adUnitId: '2300019979_01' // 使用实际的广告单元ID
    });

    console.log('[广告初始化] 广告实例创建成功');
    return reviveAd;
  } catch (error) {
    console.error('[广告初始化] 创建广告实例失败:', error);
    return null;
  }
}

// 显示复活广告
function showReviveAd(reviveAd, onSuccess, onFail) {
  console.log('[广告显示] 开始显示复活广告');
  
  if (!reviveAd) {
    console.log('[广告显示] 广告实例不存在，使用降级方案');
    if (onFail) onFail();
    return;
  }

  try {
    // 显示广告
    reviveAd.show().catch(() => {
      // 失败重试
      reviveAd.show()
        .catch(() => {
          console.log('[广告显示] 显示失败，使用降级方案');
          if (onFail) onFail();
        });
    });
  } catch (error) {
    console.error('[广告显示] 显示广告时发生错误:', error);
    if (onFail) onFail();
  }
}

// 设置广告关闭事件监听
function setupAdCloseListener(reviveAd, onComplete, onSkip) {
  if (!reviveAd || typeof reviveAd.onClose !== 'function') {
    return false;
  }
  
  reviveAd.onClose((res) => {
    console.log('[广告关闭] 广告关闭，结果:', res);
    if (res && res.isEnded) {
      // 正常播放结束，可以下发游戏奖励
      if (onComplete) onComplete(true);
    } else {
      // 播放中途退出，不下发游戏奖励
      if (onSkip) onSkip();
    }
  });
  
  return true;
}

// 显示广告获取积分
function showAdForReward(rewardAd, onSuccess, onFail) {
  console.log('[广告积分] 尝试显示广告获取积分');
  
  if (!rewardAd) {
    console.log('[广告积分] 广告实例不存在');
    if (onFail) onFail('广告加载中，请稍后再试');
    return;
  }
  
  try {
    // 显示广告
    console.log('[广告积分] 显示广告');
    rewardAd.show().then(() => {
      // 广告显示成功
      console.log('[广告积分] 广告显示成功');
    }).catch((err) => {
      // 只有在第一次显示失败时才重试
      console.log('[广告积分] 第一次显示失败，尝试重新加载:', err);
      return rewardAd.load().then(() => {
        return rewardAd.show();
      });
    }).catch((err) => {
      // 重试失败才显示错误提示
      console.error('[广告积分] 重试后仍然失败:', err);
      if (onFail) onFail('广告加载失败，请稍后再试');
    });
  } catch (error) {
    console.error('[广告积分] 显示广告时发生错误:', error);
    if (onFail) onFail('广告加载失败，请稍后再试');
  }
}

// 初始化积分广告
function initRewardAd(onClose) {
  try {
    console.log('[广告积分] 创建积分广告实例');
    const rewardAd = kwaigame.createRewardedVideoAd({
      adUnitId: '2300019979_01' // 使用实际的广告单元ID
    });
    
    // 监听广告关闭事件
    if (rewardAd && typeof rewardAd.onClose === 'function') {
      rewardAd.onClose(onClose);
    }
    
    return rewardAd;
  } catch (error) {
    console.error('[广告积分] 创建广告实例失败:', error);
    return null;
  }
}

// 使用 CommonJS 方式导出
module.exports = {
  initAds,
  showReviveAd,
  setupAdCloseListener,
  showAdForReward,
  initRewardAd
}; 