// 获取VS Code API对象
const vscode = acquireVsCodeApi();

// DOM元素
const yapiTokenInput = document.getElementById('yapiToken');
const saveTokenBtn = document.getElementById('saveTokenBtn');
const tokenStatus = document.getElementById('tokenStatus');
const interfaceCategories = document.getElementById('interfaceCategories');
const refreshInterfacesBtn = document.getElementById('refreshInterfacesBtn');
const selectAllBtn = document.getElementById('selectAllBtn');
const deselectAllBtn = document.getElementById('deselectAllBtn');
const interfacesStatus = document.getElementById('interfacesStatus');
const generateBtn = document.getElementById('generateBtn');

// 初始化
function init() {
  // 请求当前保存的Token
  vscode.postMessage({ command: 'getToken' });
}

// 显示状态消息
function showStatus(element, message, isSuccess = true) {
  element.textContent = message;
  element.className = 
    'status-message ' + (isSuccess ? 'status-success' : 'status-error');
  element.style.display = 'block';

  // 3秒后自动隐藏
  setTimeout(() => {
    element.style.display = 'none';
  }, 3000);
}

// 保存YAPI Token
saveTokenBtn.addEventListener('click', () => {
  const token = yapiTokenInput.value.trim();
  vscode.postMessage({ command: 'saveToken', token });
});

// 刷新接口列表
refreshInterfacesBtn.addEventListener('click', () => {
  const token = yapiTokenInput.value.trim();
  if (!token) {
    showStatus(interfacesStatus, '请先输入YAPI Token', false);
    return;
  }

  interfacesStatus.textContent = '正在获取接口列表...';
  interfacesStatus.className = 'status-message';
  interfacesStatus.style.display = 'block';

  vscode.postMessage({ command: 'refreshInterfaces', token });
});

// 全选接口
selectAllBtn.addEventListener('click', () => {
  Array.from(interfaceCategories.options).forEach((option) => {
    option.selected = true;
  });
  updateGenerateButtonState();
});

// 全不选接口
deselectAllBtn.addEventListener('click', () => {
  Array.from(interfaceCategories.options).forEach((option) => {
    option.selected = false;
  });
  updateGenerateButtonState();
});

// 生成TypeScript接口
generateBtn.addEventListener('click', () => {
  const selectedOptions = Array.from(interfaceCategories.selectedOptions).map(
    (option) => JSON.parse(option.value)
  );

  vscode.postMessage({
    command: 'generateTypes',
    selectedInterfaces: selectedOptions,
  });
});

// 监听接口选择变化
interfaceCategories.addEventListener('change', updateGenerateButtonState);

// 更新生成按钮状态
function updateGenerateButtonState() {
  generateBtn.disabled = interfaceCategories.selectedOptions.length === 0;
}

// 设置接口列表
function setInterfaces(categories) {
  interfaceCategories.innerHTML = '';

  categories.forEach((category) => {
    // 添加分类标题
    const categoryOption = document.createElement('option');
    categoryOption.textContent = 
      '📁 ' + category.name + ' (' + category.list.length + '个接口)';
    categoryOption.disabled = true;
    categoryOption.style.fontWeight = 'bold';
    categoryOption.style.backgroundColor = 'var(--vscode-list-hoverBackground)';
    interfaceCategories.appendChild(categoryOption);

    // 添加分类下的接口
    category.list.forEach((iface) => {
      if (iface) {
        const option = document.createElement('option');
        option.textContent = 
          '  ├─ ' + iface.title + ' (' + iface.method + ' ' + iface.path + ')';
        option.value = JSON.stringify(iface);
        interfaceCategories.appendChild(option);
      }
    });
  });
}

// 处理来自VS Code的消息
window.addEventListener('message', (event) => {
  const message = event.data;

  switch (message.command) {
    case 'setToken':
      yapiTokenInput.value = message.token || '';
      break;
    case 'tokenSaved':
      showStatus(
        tokenStatus,
        message.success ? 'YAPI Token 设置成功' : 'YAPI Token 已清空',
        message.success
      );
      break;
    case 'interfacesLoaded':
      setInterfaces(message.categories);
      showStatus(
        interfacesStatus,
        '成功加载 ' + message.total + ' 个接口',
        true
      );
      break;
    case 'interfacesLoadFailed':
      showStatus(interfacesStatus, '加载接口失败: ' + message.error, false);
      break;
    case 'generationComplete':
      showStatus(
        tokenStatus,
        message.success
          ? '成功生成 ' + message.fileCount + ' 个接口定义文件'
          : '生成失败: ' + message.error,
        message.success
      );
      break;
  }
});

// 初始化
init();