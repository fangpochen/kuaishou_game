console.log('[game.js] 正在启动游戏...');

// 引入环境配置
const ENV = require('./env.js');
console.log(`[game.js] 环境: ${ENV.ENV}, API地址: ${ENV.API_BASE_URL}`);

// 初始化游戏核心逻辑
require('./index.js');

console.log('[game.js] 游戏启动完成');

// 获取小游戏启动参数
try {
  const launchOptions = ks.getLaunchOptionsSync();
  console.log('[启动参数] 获取成功:', JSON.stringify(launchOptions, null, 2));
  console.log('[启动参数] 来源场景(from):', launchOptions.from);
  console.log('[启动参数] 查询参数(query):', launchOptions.query);
  
  // 将启动参数上报给后端
  reportEnterOptionsToServer(launchOptions);
} catch (e) {
  console.error('[启动参数] 获取失败:', e);
  console.log('[启动参数] 提示: ks.getLaunchOptionsSync 可能需要使用 kwaigame.getLaunchOptionsSync 代替');
  try {
    // 尝试备用API
    const kwaiLaunchOptions = kwaigame.getLaunchOptionsSync ? kwaigame.getLaunchOptionsSync() : null;
    if (kwaiLaunchOptions) {
      console.log('[启动参数] kwaigame API 获取成功:', JSON.stringify(kwaiLaunchOptions, null, 2));
      // 将启动参数上报给后端
      reportEnterOptionsToServer(kwaiLaunchOptions);
    } else {
      console.error('[启动参数] 备用API不存在或返回空值');
      // 即使没有启动参数，也尝试上报基本信息
      reportEnterOptionsToServer({});
    }
  } catch (e2) {
    console.error('[启动参数] 备用API也失败:', e2);
    // 即使没有启动参数，也尝试上报基本信息
    reportEnterOptionsToServer({});
  }
}

/**
 * 将启动参数上报给后端服务器
 * @param {Object} options 启动参数
 */
function reportEnterOptionsToServer(options) {
  // 使用环境配置中的API URL
  const serverUrl = ENV.getApiUrl('kuaishou/report-game-enter');
  
  try {
    console.log('[数据上报] 开始上报启动参数到后端, API地址:', serverUrl);
    
    // 准备设备信息
    let deviceInfo = null;
    try {
      deviceInfo = kwaigame.getSystemInfoSync();
    } catch (deviceErr) {
      console.error('[数据上报] 获取设备信息失败:', deviceErr);
    }
    
    // 先准备基础数据
    const reportData = {
      enterOptions: options,
      timestamp: Date.now(),
      gameVersion: '1.0.0', // 游戏版本，可根据实际情况修改
      deviceInfo: deviceInfo
    };
    
    // 尝试获取用户OpenID (需要登录)
    kwaigame.login({
      success: (loginRes) => {
        console.log('[数据上报] 登录成功，获取用户信息');
        
        // 如果loginRes中直接包含openId，则直接使用
        if (loginRes.openId) {
          reportData.userInfo = {
            openId: loginRes.openId
          };
          sendReportRequest(reportData);
        } else {
          // 尝试通过getUserInfo获取更多用户信息
          kwaigame.getUserInfo({
            success: (userRes) => {
              console.log('[数据上报] 获取用户信息成功');
              reportData.userInfo = userRes;
              sendReportRequest(reportData);
            },
            fail: (userErr) => {
              console.error('[数据上报] 获取用户信息失败:', userErr);
              // 失败也发送，但不含用户信息
              sendReportRequest(reportData);
            }
          });
        }
      },
      fail: (loginErr) => {
        console.error('[数据上报] 登录失败，无法获取OpenID:', loginErr);
        // 登录失败也发送数据，但不含用户信息
        sendReportRequest(reportData);
      }
    });
    
    /**
     * 发送数据到服务器
     * @param {Object} data 要发送的数据
     */
    function sendReportRequest(data) {
      kwaigame.request({
        url: serverUrl,
        method: 'POST',
        data: data,
        header: {
          'content-type': 'application/json'
        },
        success: (res) => {
          console.log('[数据上报] 上报成功，服务器响应:', res);
        },
        fail: (err) => {
          console.error('[数据上报] 上报失败:', err);
        }
      });
    }
  } catch (e) {
    console.error('[数据上报] 上报过程出错:', e);
  }
}

// 配置信息
// ... existing code ... 

/**
 * 初始化连看激励视频广告
 * @returns {Object} 广告管理对象
 */
function initConnectRewardedVideoAd() {
  console.log('[广告] 开始初始化连看激励视频广告');
  
  // 创建广告管理对象
  const adManager = {
    adInstance: null,
    isLoading: false,
    loadFailed: false,
    isReady: false,
    adUnitId: 'adunit-替换为您的广告位ID',
    baseReward: 10, // 基础奖励数量
    
    // 初始化广告
    init() {
      try {
        // 创建激励视频广告实例，使用官方的"再得广告"模式
        this.adInstance = ks.createRewardedVideoAd({
          adUnitId: this.adUnitId,
          multiton: true,  // 开启再得广告模式
          multitonRewardMsg: ['双倍奖励'],  // 再看广告的奖励文案
          multitonRewardTimes: 1  // 额外观看广告的次数，快手目前只支持值为1
        });
        
        // 监听广告加载成功事件
        this.adInstance.onLoad(() => {
          console.log('[广告] 激励视频广告加载成功');
          this.isLoading = false;
          this.isReady = true;
          this.loadFailed = false;
        });
        
        // 监听广告加载失败事件
        this.adInstance.onError((err) => {
          console.error('[广告] 激励视频广告出错:', err);
          this.isLoading = false;
          this.isReady = false;
          this.loadFailed = true;
          
          // 延迟重试加载
          setTimeout(() => {
            this.load();
          }, 30000); // 30秒后重试
        });
        
        // 监听广告关闭事件
        this.adInstance.onClose((res) => {
          // 广告关闭后自动重新加载，为下次展示做准备
          this.isReady = false;
          
          if (res && res.isEnded) {
            console.log('[广告] 激励视频广告完整观看');
            
            // 检查是否是多重奖励（再得广告）
            if (res.multiton && res.multiton.multitonEnded) {
              // 再得广告结束，发放双倍奖励
              const totalReward = this.baseReward * 2; // 双倍奖励
              console.log(`[广告] 再得广告结束，发放双倍奖励: ${totalReward}`);
              this.provideReward(totalReward, true, 2);
            } else {
              // 单次观看结束，发放基础奖励
              console.log(`[广告] 单次观看结束，发放基础奖励: ${this.baseReward}`);
              this.provideReward(this.baseReward, false, 1);
            }
          } else {
            // 播放中途退出，不发放奖励
            console.log('[广告] 广告未完整观看，不发放奖励');
          }
          
          // 预加载下一个广告
          setTimeout(() => {
            this.load();
          }, 1000);
        });
        
        // 初始加载
        this.load();
        console.log('[广告] 连看激励视频广告初始化完成');
        return true;
      } catch (e) {
        console.error('[广告] 初始化连看激励视频广告失败:', e);
        return false;
      }
    },
    
    // 加载广告
    load() {
      if (this.isLoading) return;
      
      this.isLoading = true;
      this.adInstance.load()
        .then(() => {
          console.log('[广告] 激励视频广告加载成功');
          this.isReady = true;
          this.isLoading = false;
          this.loadFailed = false;
        })
        .catch(err => {
          console.error('[广告] 激励视频广告加载失败:', err);
          this.isReady = false;
          this.isLoading = false;
          this.loadFailed = true;
        });
    },
    
    // 显示广告
    show() {
      return new Promise((resolve, reject) => {
        if (!this.adInstance) {
          console.error('[广告] 广告实例不存在');
          reject(new Error('广告实例不存在'));
          return;
        }
        
        if (!this.isReady) {
          if (this.loadFailed) {
            console.error('[广告] 广告加载失败，无法展示');
            reject(new Error('广告加载失败'));
            return;
          }
          
          // 如果广告未准备好但正在加载中，等待加载完成再展示
          if (this.isLoading) {
            console.log('[广告] 广告正在加载中，稍后展示');
            const checkReady = setInterval(() => {
              if (this.isReady) {
                clearInterval(checkReady);
                this.adInstance.show().then(resolve).catch(reject);
              } else if (this.loadFailed) {
                clearInterval(checkReady);
                reject(new Error('广告加载失败'));
              }
            }, 300);
            return;
          }
          
          // 如果广告未准备好且未在加载中，开始加载
          console.log('[广告] 广告未准备好，开始加载');
          this.load();
          reject(new Error('广告未准备好'));
          return;
        }
        
        console.log('[广告] 展示连看激励视频广告');
        this.adInstance.show()
          .then(() => {
            console.log('[广告] 广告展示成功');
            this.isReady = false; // 展示后标记为未准备好
            resolve();
          })
          .catch(err => {
            console.error('[广告] 广告展示失败:', err);
            this.isReady = false; // 展示失败也标记为未准备好，需要重新加载
            
            // 失败后尝试重新加载
            setTimeout(() => {
              this.load();
            }, 1000);
            
            reject(err);
          });
      });
    },
    
    // 提供奖励
    provideReward(amount, isConnectReward, multiple) {
      // 这里实现您的奖励发放逻辑
      // 例如：更新游戏内货币、发放道具等
      
      // 创建奖励消息
      let rewardMessage = '';
      if (isConnectReward) {
        rewardMessage = `恭喜获得${multiple}倍奖励: ${amount}金币`;
      } else {
        rewardMessage = `恭喜获得奖励: ${amount}金币`;
      }
      
      // 在游戏中显示奖励消息
      // 这里只是示例，您需要根据您的游戏UI实现实际的消息显示
      console.log(`[奖励] ${rewardMessage}`);
      
      // 如果有游戏实例，可以调用游戏实例的方法发放奖励
      // 例如：game.addCoins(amount);
      
      // 如果需要上报到服务器，可以发送请求
      // 例如：reportRewardToServer(amount, isConnectReward, multiple);
    }
  };
  
  // 初始化并返回广告管理对象
  if (adManager.init()) {
    return adManager;
  } else {
    return null;
  }
}

// 创建全局广告管理器实例
let connectRewardedVideoAd = null;

// 游戏启动后初始化广告
setTimeout(() => {
  try {
    // 检查是否为Android系统，因为再得广告模式只支持安卓
    let isAndroid = false;
    try {
      const sysInfo = kwaigame.getSystemInfoSync() || {};
      isAndroid = sysInfo.platform === 'android';
      console.log(`[广告] 当前平台: ${sysInfo.platform}`);
    } catch (e) {
      console.error('[广告] 获取系统信息失败:', e);
    }
    
    if (!isAndroid) {
      console.log('[广告] 当前非安卓系统，再得广告模式可能不可用');
    }
    
    connectRewardedVideoAd = initConnectRewardedVideoAd();
    console.log('[广告] 连看广告管理器初始化状态:', connectRewardedVideoAd ? '成功' : '失败');
  } catch (e) {
    console.error('[广告] 初始化连看广告管理器时出错:', e);
  }
}, 3000); // 延迟3秒初始化，确保游戏主体已加载

/**
 * 展示连看激励视频广告
 * @param {Function} successCallback 成功回调
 * @param {Function} failCallback 失败回调
 */
function showConnectRewardedVideoAd(successCallback, failCallback) {
  if (!connectRewardedVideoAd) {
    console.error('[广告] 连看广告管理器未初始化');
    if (failCallback) failCallback(new Error('广告管理器未初始化'));
    return;
  }
  
  connectRewardedVideoAd.show()
    .then(() => {
      if (successCallback) successCallback();
    })
    .catch(err => {
      console.error('[广告] 展示连看广告失败:', err);
      if (failCallback) failCallback(err);
    });
}

// 示例：当需要展示广告时调用
// showConnectRewardedVideoAd(
//   () => console.log('广告开始播放'),
//   (err) => console.error('广告展示失败', err)
// ); 