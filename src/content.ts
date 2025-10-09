// 内容脚本，负责与网页交互

// 监听来自后台或popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'injectScript') {
    // 注入脚本到页面
    try {
      const script = document.createElement('script');
      script.textContent = request.script;
      document.head.appendChild(script);
      document.head.removeChild(script);
      sendResponse({ success: true });
    } catch (error) {
      sendResponse({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  // 返回true表示响应是异步的
  return true;
});

// 这里可以添加更多的内容脚本逻辑，比如监听页面事件等