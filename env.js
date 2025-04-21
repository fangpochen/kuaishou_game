/**
 * 环境配置文件
 * 用于管理不同环境下的配置参数
 */

// 判断当前环境
const isProduction = false; // 手动切换环境: true为生产环境，false为开发环境

// 也可以通过其他方式动态判断，例如URL或其他参数
// const isProduction = window.location.host.indexOf('kuaishou.com') > -1;

// 环境配置
const ENV_CONFIG = {
  // 开发环境配置
  development: {
    apiBaseUrl: 'http://125.77.91.47:35001',
    logLevel: 'debug',
    showDebugInfo: true
  },
  
  // 生产环境配置
  production: {
    apiBaseUrl: 'https://api.cloudoption.site',
    logLevel: 'error',
    showDebugInfo: false
  }
};

// 导出当前环境的配置
const currentEnv = isProduction ? 'production' : 'development';
console.log(`[环境] 当前运行环境: ${currentEnv}`);

// 导出配置对象
const config = ENV_CONFIG[currentEnv];
console.log(`[环境] API地址: ${config.apiBaseUrl}`);

module.exports = {
  // 环境名称
  ENV: currentEnv,
  
  // 是否生产环境
  IS_PRODUCTION: isProduction,
  
  // 是否开发环境
  IS_DEVELOPMENT: !isProduction,
  
  // API基础URL
  API_BASE_URL: config.apiBaseUrl,
  
  // 日志级别
  LOG_LEVEL: config.logLevel,
  
  // 是否显示调试信息
  SHOW_DEBUG_INFO: config.showDebugInfo,
  
  // 获取完整API URL的辅助函数
  getApiUrl: function(path) {
    // 确保path不以/开头
    if (path.startsWith('/')) {
      path = path.substring(1);
    }
    return `${config.apiBaseUrl}/${path}`;
  }
}; 