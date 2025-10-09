// 后台脚本，负责处理后台任务

// 监听插件安装事件
chrome.runtime.onInstalled.addListener(() => {
  console.log('YAPI 转 TypeScript 插件已安装');
});

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'generateTypes') {
    // 处理生成类型定义的请求
    const { interfaces, interfaceFiles, summaryCode } = request;
    console.log('需要生成的接口定义数量:', interfaces.length);
    
    // 存储接口文件信息，以便后续使用
    if (interfaceFiles && interfaceFiles.length > 0) {
      console.log(`将生成 ${interfaceFiles.length} 个接口文件`);
      
      // 存储接口文件信息到本地存储
      chrome.storage.local.set({
        yapiInterfaceFiles: interfaceFiles,
        yapiSummaryCode: summaryCode,
        lastGenerated: new Date().toISOString()
      }).then(() => {
        console.log('接口文件信息已保存到本地存储');
        
        // 尝试通过URL协议打开VSCode
        try {
          // 构建一个模拟的VSCode URL
          // 注意：由于浏览器安全限制，扩展无法直接在用户文件系统上创建文件
          // 这里只是尝试打开VSCode，实际创建文件需要用户在VSCode中执行命令
          const vscodeUrl = 'vscode://'; // 基本的VSCode协议URL
          
          // 尝试打开VSCode
          chrome.tabs.create({
            url: vscodeUrl,
            active: false
          }, (tab) => {
            if (chrome.runtime.lastError) {
              console.error('无法打开VSCode:', chrome.runtime.lastError);
              sendResponse({ success: false, error: chrome.runtime.lastError.message });
            } else {
              // 给VSCode一些时间来打开
              setTimeout(() => {
                // 关闭临时标签
                chrome.tabs.remove(tab.id!);
                sendResponse({ success: true });
              }, 1000);
            }
          });
        } catch (error) {
          console.error('尝试打开VSCode时出错:', error);
          sendResponse({ success: false, error: String(error) });
        }
      }).catch((error) => {
        console.error('保存接口文件信息失败:', error);
        sendResponse({ success: false, error: String(error) });
      });
    } else {
      // 如果没有接口文件信息，返回成功
      sendResponse({ success: true });
    }
  }
  
  // 返回true表示响应是异步的
  return true;
});