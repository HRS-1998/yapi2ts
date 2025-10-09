// VS Code API 类型声明
interface VsCodeApi {
  postMessage(message: any): void;
  getState(): any;
  setState(state: any): void;
}

// 声明全局函数
declare function acquireVsCodeApi(): VsCodeApi;

// 消息类型接口
export interface SetTokenMessage {
  command: 'setToken';
  token: string;
}

export interface TokenSavedMessage {
  command: 'tokenSaved';
  success: boolean;
}

export interface InterfacesLoadedMessage {
  command: 'interfacesLoaded';
  categories: any[];
  total: number;
}

export interface InterfacesLoadFailedMessage {
  command: 'interfacesLoadFailed';
  error: string;
}

export interface GenerationCompleteMessage {
  command: 'generationComplete';
  success: boolean;
  fileCount?: number;
  error?: string;
}

export type VsCodeMessage = 
  | SetTokenMessage
  | TokenSavedMessage
  | InterfacesLoadedMessage
  | InterfacesLoadFailedMessage
  | GenerationCompleteMessage;

// 接口分类类型
export interface InterfaceItem {
  title: string;
  method: string;
  path: string;
  [key: string]: any;
}

export interface InterfaceCategory {
  name: string;
  list: InterfaceItem[];
}

// 获取VS Code API对象
const vscode = acquireVsCodeApi();

// DOM元素
const yapiTokenInput = document.getElementById('yapiToken') as HTMLInputElement;
const saveTokenBtn = document.getElementById('saveTokenBtn') as HTMLButtonElement;
const tokenStatus = document.getElementById('tokenStatus') as HTMLElement;
const interfaceCategories = document.getElementById('interfaceCategories') as HTMLSelectElement;
const refreshInterfacesBtn = document.getElementById('refreshInterfacesBtn') as HTMLButtonElement;
const selectAllBtn = document.getElementById('selectAllBtn') as HTMLButtonElement;
const deselectAllBtn = document.getElementById('deselectAllBtn') as HTMLButtonElement;
const interfacesStatus = document.getElementById('interfacesStatus') as HTMLElement;
const generateBtn = document.getElementById('generateBtn') as HTMLButtonElement;

// 初始化
function init() {
  // 请求当前保存的Token
  vscode.postMessage({ command: 'getToken' });
}

// 显示状态消息
function showStatus(element: HTMLElement, message: string, isSuccess: boolean = true): void {
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
function updateGenerateButtonState(): void {
  generateBtn.disabled = interfaceCategories.selectedOptions.length === 0;
}

// 设置接口列表
function setInterfaces(categories: InterfaceCategory[]): void {
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
window.addEventListener('message', (event: MessageEvent<VsCodeMessage>) => {
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
