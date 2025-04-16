const { config } = require('./config.js');

// 初始化UI配置
function initUIConfig(width, height) {
  return {
    // 重新开始按钮
    restartBtn: {
      x: width/2 - 80,
      y: height/2 + 80,
      width: 160,
      height: 50
    },
    
    // 侧边栏相关按钮
    sidebarBtn: {
      x: 20,
      y: 120,
      width: 100,
      height: 40,
      text: '入口有礼'
    },
    
    gotoSidebarBtn: {
      x: width - 120,
      y: 120,
      width: 100,
      height: 40,
      text: '去侧边栏'
    },
    
    getRewardBtn: {
      x: width - 120,
      y: 120,
      width: 100,
      height: 40,
      text: '领取奖励'
    },
    
    // 分享按钮
    shareBtn: {
      x: width - 120,
      y: 70,
      width: 100,
      height: 40,
      text: '分享游戏'
    },
    
    // 添加广告积分按钮
    adRewardBtn: {
      x: 20,
      y: 20,
      width: 120,
      height: 40,
      text: '看广告得分'
    },
    
    // 添加返回主页按钮
    homeBtn: {
      x: width - 100,
      y: 20,
      width: 80,
      height: 40,
      text: '主页'
    },
    
    // 添加设置按钮
    settingsBtn: {
      x: 20,
      y: 20,
      width: 80,
      height: 40,
      text: '设置'
    },
    
    // 返回按钮(从设置页返回)
    backBtn: {
      x: 20,
      y: 20,
      width: 80,
      height: 40,
      text: '返回'
    },
    
    // 游戏标题
    gameTitle: {
      text: '无敌冲刺大乱斗',
      x: width/2,
      y: height/2 - 50,
      font: '36px Arial',
      color: '#4285f4'
    },
    
    // 启动界面按钮
    startBtn: {
      x: width/2 - 100,
      y: height/2 + 50,
      width: 200,
      height: 60,
      text: '开始游戏'
    },
    
    // 对话框配置
    sidebarDialog: {
      visible: false,
      x: width/2 - 150,
      y: height/2 - 100,
      width: 300,
      height: 200
    }
  };
}

// 绘制按钮
function drawButton(ctx, btn, bgColor, textColor) {
  ctx.fillStyle = bgColor;
  ctx.fillRect(
    btn.x,
    btn.y,
    btn.width,
    btn.height
  );
  ctx.fillStyle = textColor;
  ctx.font = '16px Arial';
  ctx.fillText(
    btn.text,
    btn.x + 20,
    btn.y + 25
  );
}

// 绘制对话框
function drawDialog(ctx, dialog, width, height) {
  // 半透明背景
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(0, 0, width, height);
  
  // 对话框背景
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(
    dialog.x,
    dialog.y,
    dialog.width,
    dialog.height
  );

  // 对话框内容
  ctx.fillStyle = '#000000';
  ctx.font = '20px Arial';
  ctx.fillText(
    '添加到侧边栏即可领取奖励!',
    dialog.x + 40,
    dialog.y + 80
  );
}

// 检查按钮点击
function checkButtonClick(btn, touch) {
  return touch.clientX >= btn.x && 
         touch.clientX <= btn.x + btn.width &&
         touch.clientY >= btn.y && 
         touch.clientY <= btn.y + btn.height;
}

// 检查对话框点击
function checkDialogClick(dialog, touch) {
  return touch.clientX >= dialog.x && 
         touch.clientX <= dialog.x + dialog.width &&
         touch.clientY >= dialog.y && 
         touch.clientY <= dialog.y + dialog.height;
}

// 检查区域点击
function checkAreaClick(area, touch) {
  return touch.clientX >= area.x && touch.clientX <= area.x + area.width &&
         touch.clientY >= area.y && touch.clientY <= area.y + area.height;
}

// 检查圆形按钮点击
function checkCircleClick(circle, touch) {
  const dx = touch.clientX - circle.x;
  const dy = touch.clientY - circle.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return distance <= circle.radius;
}

// 渲染波纹效果
function renderWaveEffect(ctx, wave) {
  try {
    // 检查参数有效性
    if (!wave || !wave.center || typeof wave.center.x !== 'number' || typeof wave.center.y !== 'number' || typeof wave.radius !== 'number') {
      console.error('波纹参数无效:', wave);
      return;
    }

    // 环形渐变
    const gradient = ctx.createRadialGradient(
      wave.center.x, wave.center.y, Math.max(0, wave.radius - 15),
      wave.center.x, wave.center.y, wave.radius + 15
    );
    
    // 设置渐变颜色
    gradient.addColorStop(0, 'rgba(0, 255, 255, 0)');
    gradient.addColorStop(0.5, 'rgba(0, 255, 255, 0.7)');
    gradient.addColorStop(1, 'rgba(0, 255, 255, 0)');
    
    // 绘制波纹
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(wave.center.x, wave.center.y, wave.radius + 15, 0, Math.PI * 2);
    ctx.fill();
    
    // 绘制波纹边缘线
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(wave.center.x, wave.center.y, wave.radius, 0, Math.PI * 2);
    ctx.stroke();
  } catch(err) {
    console.error('渲染波纹效果出错:', err);
  }
}

// 使用 CommonJS 方式导出
module.exports = {
  initUIConfig,
  drawButton,
  drawDialog,
  checkButtonClick,
  checkDialogClick,
  checkAreaClick,
  checkCircleClick,
  renderWaveEffect
}; 