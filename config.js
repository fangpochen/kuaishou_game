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

// 使用 CommonJS 方式导出
module.exports = { config }; 