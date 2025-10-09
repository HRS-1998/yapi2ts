// VSCode集成工具函数

/**
 * 检测当前操作系统类型
 * @returns 是否为Windows操作系统
 */
const isWindows = (): boolean => {
  return (
    navigator.userAgent.includes('Windows') ||
    navigator.userAgent.includes('Win32')
  );
};

/**
 * 生成VSCode命令，用于创建yapi文件夹和TypeScript接口定义文件
 * @param tsCode 生成的TypeScript代码
 * @returns 包含VSCode命令的对象
 */
export const generateVSCodeCommand = (
  tsCode: string
): {
  command: string;
  instructions: string;
} => {
  let command: string;

  if (isWindows()) {
    // 对TypeScript代码进行转义，使其可以在PowerShell中使用
    // 在PowerShell中，我们需要对内容进行Base64编码，以避免复杂的转义
    const encodedCode = btoa(unescape(encodeURIComponent(tsCode)));

    // 创建PowerShell兼容的命令，为每个接口创建单独的文件
    // 注意：由于我们现在传递的是合并后的代码，我们仍然创建一个单一文件，但命令中增加了提示
    command = `New-Item -ItemType Directory -Force -Path yapi; Set-Content -Path "yapi\\interfaces.ts" -Value ([System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String('${encodedCode}'))); Write-Host "已创建汇总接口文件，请根据需要手动拆分为独立文件。"`;
  } else {
    // 对TypeScript代码进行转义，使其可以在类Unix系统命令行中使用
    const escapedCode = escapeForCommandLine(tsCode);

    // 创建类Unix系统兼容的命令
    command = `mkdir -p yapi && echo "${escapedCode}" > yapi/interfaces.ts && echo "已创建汇总接口文件，请根据需要手动拆分为独立文件。"`;
  }

  // 生成使用说明
  const instructions = `
请按照以下步骤操作：
1. 打开VSCode，并导航到您的项目目录
2. 打开VSCode终端（Ctrl+\`）
3. 复制并粘贴以下命令，然后按Enter执行：
${command}

执行后，系统将在当前目录下创建yapi文件夹，并在其中生成interfaces.ts文件，包含您选择的所有接口定义。

注意：由于浏览器扩展的限制，我们无法直接在您的文件系统上创建多个文件。
执行命令后，您可以手动将汇总文件拆分为多个独立的接口文件，每个文件对应一个接口定义。
  `;

  return { command, instructions };
};

/**
 * 对字符串进行转义，使其可以在命令行中安全使用
 * @param str 需要转义的字符串
 * @returns 转义后的字符串
 */
const escapeForCommandLine = (str: string): string => {
  // 替换双引号为转义双引号
  let escaped = str.replace(/"/g, '\\"');

  // 替换换行符为转义换行符
  escaped = escaped.replace(/\n/g, '\\n');

  // 替换反斜杠为双反斜杠（避免转义字符失效）
  escaped = escaped.replace(/\\/g, '\\\\');

  // 替换其他可能导致问题的特殊字符
  escaped = escaped.replace(/\$/g, '\\$');
  escaped = escaped.replace(/\`/g, '\\`');

  return escaped;
};

/**
 * 尝试通过VSCode的URL协议打开VSCode
 * 注意：这个功能在某些环境下可能无法正常工作，取决于用户的VSCode配置
 */
export const openVSCodeWithUrl = (filePath: string): void => {
  try {
    // 构建VSCode URL
    const vscodeUrl = `vscode://file/${filePath}`;
    console.log(`正在尝试通过URL协议打开VSCode... URL: ${vscodeUrl}`);

    // 创建一个临时的a标签并模拟点击，以打开VSCode
    const a = document.createElement('a');
    a.href = vscodeUrl;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (error) {
    console.error('无法通过URL打开VSCode:', error);
  }
};

/**
 * 显示VSCode命令对话框
 * @param command VSCode命令
 * @param instructions 使用说明
 */
export const showVSCodeCommandDialog = (
  command: string,
  instructions: string
): void => {
  // 创建一个对话框元素
  const dialog = document.createElement('div');
  dialog.style.position = 'fixed';
  dialog.style.top = '50%';
  dialog.style.left = '50%';
  dialog.style.transform = 'translate(-50%, -50%)';
  dialog.style.width = '600px';
  dialog.style.maxWidth = '95vw';
  dialog.style.maxHeight = '90vh';
  dialog.style.backgroundColor = 'white';
  dialog.style.border = 'none';
  dialog.style.borderRadius = '12px';
  dialog.style.padding = '24px';
  dialog.style.zIndex = '999999';
  dialog.style.overflowY = 'auto';
  dialog.style.boxShadow = '0 10px 40px rgba(0, 0, 0, 0.2)';
  dialog.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  dialog.style.transition = 'all 0.3s ease';
  dialog.style.opacity = '0';
  dialog.style.transform = 'translate(-50%, -50%) scale(0.95)';
  
  // 添加到文档后触发动画
  setTimeout(() => {
    dialog.style.opacity = '1';
    dialog.style.transform = 'translate(-50%, -50%) scale(1)';
  }, 10);

  // 创建标题区域
  const header = document.createElement('div');
  header.style.display = 'flex';
  header.style.justifyContent = 'space-between';
  header.style.alignItems = 'center';
  header.style.marginBottom = '20px';
  
  const title = document.createElement('h3');
  title.textContent = 'VSCode 命令';
  title.style.margin = '0';
  title.style.color = '#333';
  title.style.fontSize = '18px';
  title.style.fontWeight = '600';
  
  const closeBtn = document.createElement('button');
  closeBtn.textContent = '×';
  closeBtn.style.width = '32px';
  closeBtn.style.height = '32px';
  closeBtn.style.border = 'none';
  closeBtn.style.backgroundColor = '#f5f5f5';
  closeBtn.style.borderRadius = '50%';
  closeBtn.style.fontSize = '18px';
  closeBtn.style.cursor = 'pointer';
  closeBtn.style.display = 'flex';
  closeBtn.style.alignItems = 'center';
  closeBtn.style.justifyContent = 'center';
  closeBtn.style.transition = 'all 0.2s ease';
  closeBtn.onmouseover = () => {
    closeBtn.style.backgroundColor = '#e0e0e0';
  };
  closeBtn.onmouseout = () => {
    closeBtn.style.backgroundColor = '#f5f5f5';
  };
  closeBtn.onclick = () => {
    document.body.removeChild(dialog);
    document.body.removeChild(overlay);
  };
  
  header.appendChild(title);
  header.appendChild(closeBtn);
  dialog.appendChild(header);

  // 创建代码区域容器
  const codeSection = document.createElement('div');
  codeSection.style.marginBottom = '20px';
  
  // 创建代码区域
  const codeContainer = document.createElement('div');
  codeContainer.style.margin = '10px 0 15px 0';
  codeContainer.style.padding = '16px';
  codeContainer.style.backgroundColor = '#f8f9fa';
  codeContainer.style.borderRadius = '8px';
  codeContainer.style.overflowX = 'auto';
  codeContainer.style.maxHeight = '300px';
  codeContainer.style.borderLeft = '4px solid #4CAF50';
  
  const code = document.createElement('code');
  code.textContent = command;
  code.style.fontFamily = 'Consolas, Monaco, "Andale Mono", monospace';
  code.style.fontSize = '14px';
  code.style.lineHeight = '1.6';
  code.style.whiteSpace = 'pre-wrap';
  code.style.wordBreak = 'break-all';
  codeContainer.appendChild(code);
  
  codeSection.appendChild(codeContainer);
  dialog.appendChild(codeSection);

  // 创建复制按钮
  const copyButton = document.createElement('button');
  copyButton.textContent = '复制命令';
  copyButton.style.padding = '10px 24px';
  copyButton.style.backgroundColor = '#4CAF50';
  copyButton.style.color = 'white';
  copyButton.style.border = 'none';
  copyButton.style.borderRadius = '8px';
  copyButton.style.cursor = 'pointer';
  copyButton.style.fontSize = '14px';
  copyButton.style.fontWeight = '500';
  copyButton.style.transition = 'all 0.2s ease';
  copyButton.style.marginBottom = '20px';
  
  copyButton.onmouseover = () => {
    copyButton.style.backgroundColor = '#45a049';
    copyButton.style.transform = 'translateY(-1px)';
    copyButton.style.boxShadow = '0 4px 12px rgba(76, 175, 80, 0.3)';
  };
  
  copyButton.onmouseout = () => {
    copyButton.style.backgroundColor = '#4CAF50';
    copyButton.style.transform = 'translateY(0)';
    copyButton.style.boxShadow = 'none';
  };
  
  copyButton.onmousedown = () => {
    copyButton.style.transform = 'translateY(0)';
  };
  
  copyButton.onclick = () => {
    navigator.clipboard.writeText(command).then(() => {
      const originalText = copyButton.textContent;
      copyButton.textContent = '已复制！';
      copyButton.style.backgroundColor = '#2e7d32';
      
      // 添加复制成功的动画效果
      copyButton.style.transform = 'scale(0.95)';
      setTimeout(() => {
        copyButton.style.transform = 'scale(1)';
      }, 100);
      
      setTimeout(() => {
        copyButton.textContent = originalText;
        copyButton.style.backgroundColor = '#4CAF50';
      }, 2000);
    }).catch(err => {
      console.error('复制失败:', err);
      copyButton.textContent = '复制失败！';
      copyButton.style.backgroundColor = '#f44336';
      setTimeout(() => {
        copyButton.textContent = '复制命令';
        copyButton.style.backgroundColor = '#4CAF50';
      }, 2000);
    });
  };
  
  dialog.appendChild(copyButton);

  // 创建说明文本
  const instructionsContainer = document.createElement('div');
  instructionsContainer.style.backgroundColor = '#e8f5e9';
  instructionsContainer.style.padding = '16px';
  instructionsContainer.style.borderRadius = '8px';
  instructionsContainer.style.marginBottom = '20px';
  
  const instructionsTitle = document.createElement('div');
  instructionsTitle.textContent = '操作步骤：';
  instructionsTitle.style.fontWeight = '600';
  instructionsTitle.style.color = '#2e7d32';
  instructionsTitle.style.marginBottom = '8px';
  
  const instructionsText = document.createElement('div');
  instructionsText.innerHTML = instructions.replace(/\n/g, '<br>');
  instructionsText.style.color = '#2e7d32';
  instructionsText.style.lineHeight = '1.6';
  instructionsText.style.fontSize = '14px';
  
  instructionsContainer.appendChild(instructionsTitle);
  instructionsContainer.appendChild(instructionsText);
  dialog.appendChild(instructionsContainer);

  // 底部按钮区域
  const footer = document.createElement('div');
  footer.style.display = 'flex';
  footer.style.justifyContent = 'center';
  footer.style.marginTop = '10px';
  
  // 创建关闭按钮
  const closeButton = document.createElement('button');
  closeButton.textContent = '关闭';
  closeButton.style.padding = '10px 24px';
  closeButton.style.backgroundColor = '#f5f5f5';
  closeButton.style.color = '#333';
  closeButton.style.border = '1px solid #ddd';
  closeButton.style.borderRadius = '8px';
  closeButton.style.cursor = 'pointer';
  closeButton.style.fontSize = '14px';
  closeButton.style.transition = 'all 0.2s ease';
  
  closeButton.onmouseover = () => {
    closeButton.style.backgroundColor = '#e0e0e0';
  };
  
  closeButton.onmouseout = () => {
    closeButton.style.backgroundColor = '#f5f5f5';
  };
  
  closeButton.onclick = () => {
    // 添加关闭动画
    dialog.style.opacity = '0';
    dialog.style.transform = 'translate(-50%, -50%) scale(0.95)';
    overlay.style.opacity = '0';
    
    setTimeout(() => {
      document.body.removeChild(dialog);
      document.body.removeChild(overlay);
    }, 300);
  };
  
  footer.appendChild(closeButton);
  dialog.appendChild(footer);

  // 添加遮罩层
  const overlay = document.createElement('div');
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100%';
  overlay.style.height = '100%';
  overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
  overlay.style.zIndex = '999998';
  overlay.style.transition = 'opacity 0.3s ease';
  overlay.style.opacity = '0';
  
  // 显示遮罩层动画
  setTimeout(() => {
    overlay.style.opacity = '1';
  }, 10);
  
  overlay.onclick = () => {
    // 添加关闭动画
    dialog.style.opacity = '0';
    dialog.style.transform = 'translate(-50%, -50%) scale(0.95)';
    overlay.style.opacity = '0';
    
    setTimeout(() => {
      document.body.removeChild(dialog);
      document.body.removeChild(overlay);
    }, 300);
  };

  // 添加到文档
  document.body.appendChild(overlay);
  document.body.appendChild(dialog);
};
