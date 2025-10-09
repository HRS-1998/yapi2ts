import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { fetchYapiInterfaces, generateTypeScriptFiles, InterfaceCategory, YapiInterface } from './yapiService';

// 插件激活函数
export function activate(context: vscode.ExtensionContext) {
  console.log('YAPI 转 TypeScript 插件已激活');

  // 注册命令：生成TypeScript接口定义
  const generateTypesCommand = vscode.commands.registerCommand(
    'yapi2ts.generateTypes',
    async () => {
      try {
        // 1. 获取保存的YAPI Token
        const yapiToken = context.globalState.get<string>('yapiToken');
        if (!yapiToken) {
          vscode.window.showErrorMessage('请先设置YAPI Token');
          return;
        }

        // 2. 获取当前工作区路径
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
          vscode.window.showErrorMessage('请先打开一个项目文件夹');
          return;
        }
        const workspacePath = workspaceFolders[0].uri.fsPath;

        // 3. 显示进度通知
        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: '获取YAPI接口列表',
            cancellable: true,
          },
          async (progress, token) => {
            progress.report({ increment: 0 });

            // 4. 获取接口列表
              try {
                const interfaceCategories = await fetchYapiInterfaces(yapiToken);
                progress.report({ increment: 100 });

                // 5. 显示接口选择框
                if (interfaceCategories.length === 0) {
                  vscode.window.showInformationMessage('未找到任何接口');
                  return;
                }

                // 构建带分类的选项列表
                const quickPickItems: vscode.QuickPickItem[] = [];
                
                // 首先添加全选选项
                quickPickItems.push({
                  label: '$(checklist) 全选所有接口',
                  description: `共 ${interfaceCategories.reduce((sum, cat) => sum + cat.list.length, 0)} 个接口`,
                  detail: '选择所有分类下的所有接口',
                  alwaysShow: true
                });

                // 添加分隔符
                quickPickItems.push({
                  label: '──────────',
                  kind: vscode.QuickPickItemKind.Separator
                });

                // 为每个分类添加选项
                interfaceCategories.forEach((category, categoryIndex) => {
                  // 添加分类标题
                  quickPickItems.push({
                    label: `$(folder) ${category.name}`,
                    description: `${category.list.length} 个接口`,
                    detail: '选择/取消选择该分类下的所有接口',
                    picked: false,
                    alwaysShow: true
                  } as vscode.QuickPickItem & { categoryIndex?: number });
                  (quickPickItems[quickPickItems.length - 1] as any).categoryIndex = categoryIndex; // 使用类型断言添加自定义属性

                  // 为该分类下的每个接口添加选项
                  category.list.forEach((iface, interfaceIndex) => {
                    // 确保iface对象存在
                    if (!iface) return;
                    
                    quickPickItems.push({
                      label: `  ├─ ${iface.title}`,
                      description: `${iface.method} ${iface.path}`,
                      detail: `属于分类: ${category.name}`,
                      picked: false
                    } as vscode.QuickPickItem & { categoryIndex?: number; interfaceIndex?: number; interface?: YapiInterface });
                    const lastItem = quickPickItems[quickPickItems.length - 1] as any;
                    lastItem.categoryIndex = categoryIndex;
                    lastItem.interfaceIndex = interfaceIndex;
                    lastItem.interface = iface;
                  });

                  // 在分类末尾添加分隔符
                  if (categoryIndex < interfaceCategories.length - 1) {
                    quickPickItems.push({
                      label: '──────────',
                      kind: vscode.QuickPickItemKind.Separator
                    });
                  }
                });

                // 确保quickPickItems是QuickPickItem[]类型
                const typedQuickPickItems: vscode.QuickPickItem[] = quickPickItems.map(item => 
                  typeof item === 'string' ? { label: item } : item
                ) as vscode.QuickPickItem[];
                
                // 基础方法：显示选择框
                const showSelectionBox = async (items: vscode.QuickPickItem[]) => {
                  return vscode.window.showQuickPick(
                    items,
                    {
                      canPickMany: true,
                      placeHolder: '请选择要生成的接口（可以按分类选择或全选）'
                    }
                  );
                };
                
                // 先显示基础选择框
                let selectedItems = await showSelectionBox(typedQuickPickItems);
                
                // 检查是否需要特殊处理（分类选择或全选）
                if (!selectedItems) return;
                
                // 检查选中的项目中是否有分类或全选
                const selectedCategoryItem = selectedItems.find(item => {
                  return 'label' in item &&
                    (item.label.startsWith('$(folder)') || item.label.startsWith('$(checklist)'));
                });
                
                // 如果选择了分类或全选，重新创建一个已预选相应接口的列表
                if (selectedCategoryItem) {
                  // 创建新的选项列表，复制原始数据
                  const newQuickPickItems = typedQuickPickItems.map(item => {
                    const newItem = { ...item } as vscode.QuickPickItem & { categoryIndex?: number; interfaceIndex?: number; interface?: YapiInterface; picked?: boolean };
                    // 复制自定义属性
                    if (typeof item === 'object') {
                      newItem.categoryIndex = (item as any).categoryIndex;
                      newItem.interfaceIndex = (item as any).interfaceIndex;
                      newItem.interface = (item as any).interface;
                    }
                    return newItem;
                  });
                  
                  if (selectedCategoryItem.label.startsWith('$(folder)')) {
                    // 分类选择逻辑 - 获取分类索引
                    const categoryIndex = (selectedCategoryItem as any).categoryIndex;
                    
                    // 预选该分类下的所有接口
                    newQuickPickItems.forEach((item) => {
                      // 确保是接口项且属于当前分类
                      if (item.categoryIndex === categoryIndex && item.interfaceIndex !== undefined) {
                        // 明确设置为选中状态
                        item.picked = true;
                      }
                    });
                  } else if (selectedCategoryItem.label.startsWith('$(checklist)')) {
                    // 全选逻辑 - 预选所有接口
                    newQuickPickItems.forEach((item) => {
                      // 确保是接口项
                      if (item.interface !== undefined) {
                        // 明确设置为选中状态
                        item.picked = true;
                      }
                    });
                  }
                  
                  // 重新显示选择框
                  let newSelectedItems = await showSelectionBox(newQuickPickItems);
                  
                  if (newSelectedItems) {
                    // 过滤掉分类项和全选框，只保留接口项
                    const filteredSelectedItems = newQuickPickItems.filter(item => {
                      // 检查这个item是否是接口项并且被选中
                      if (typeof item === 'object' && 'picked' in item && item.picked) {
                        return (item as any).interface !== undefined;
                      }
                      return false;
                    });
                    
                    // 更新selectedItems为过滤后的结果
                    selectedItems = filteredSelectedItems;
                  } else {
                    selectedItems = undefined;
                  }
                }

              if (!selectedItems || selectedItems.length === 0) {
                return;
              }

              // 过滤出实际选中的接口
              const selectedInterfaces = selectedItems
                .filter((item: any) => item.interface !== undefined)
                .map((item: any) => item.interface);

              if (selectedInterfaces.length === 0) {
                return;
              }

              // 6. 显示生成进度通知
              await vscode.window.withProgress(
                {
                  location: vscode.ProgressLocation.Notification,
                  title: '生成TypeScript接口定义',
                  cancellable: true,
                },
                async (progress, token) => {
                  progress.report({ increment: 0 });

                  // 7. 生成TypeScript文件
                  const outputDir = vscode.Uri.joinPath(
                    workspaceFolders[0].uri,
                    'yapi'
                  ).fsPath;
                  const result = await generateTypeScriptFiles(
                    selectedInterfaces,
                    outputDir,
                    yapiToken
                  );

                  progress.report({ increment: 100 });

                  // 8. 显示结果通知
                  if (result.success && result.fileCount) {
                    vscode.window.showInformationMessage(
                      `成功生成 ${result.fileCount} 个接口定义文件`
                    );

                    // 打开生成的文件夹
                    const openFolder =
                      await vscode.window.showInformationMessage(
                        '是否打开生成的接口定义文件夹？',
                        '打开',
                        '取消'
                      );

                    if (openFolder === '打开') {
                      vscode.commands.executeCommand(
                        'vscode.openFolder',
                        vscode.Uri.file(outputDir),
                        true
                      );
                    }
                  } else {
                    vscode.window.showErrorMessage(
                      `生成失败: ${result.error || '未知错误'}`
                    );
                  }
                }
              );
            } catch (error) {
              vscode.window.showErrorMessage(
                `获取接口列表失败: ${
                  error instanceof Error ? error.message : String(error)
                }`
              );
            }
          }
        );
      } catch (error) {
        console.error('生成TypeScript接口定义失败:', error);
        vscode.window.showErrorMessage(
          `生成TypeScript接口定义失败: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }
  );

  // 注册命令：设置YAPI Token
  const setTokenCommand = vscode.commands.registerCommand(
    'yapi2ts.setToken',
    async () => {
      try {
        // 获取当前保存的Token（如果有）
        const currentToken = context.globalState.get<string>('yapiToken');

        // 显示输入框
        const token = await vscode.window.showInputBox({
          prompt: '请输入YAPI项目Token',
          value: currentToken,
          placeHolder: 'YAPI项目Token',
          ignoreFocusOut: true,
        });

        // 如果用户输入了Token，则保存
        if (token !== undefined) {
          if (token.trim()) {
            await context.globalState.update('yapiToken', token);
            vscode.window.showInformationMessage('YAPI Token 设置成功');
          } else {
            // 如果用户清空了Token，则删除保存的Token
            await context.globalState.update('yapiToken', undefined);
            vscode.window.showInformationMessage('YAPI Token 已清空');
          }
        }
      } catch (error) {
        console.error('设置YAPI Token失败:', error);
        vscode.window.showErrorMessage(
          `设置YAPI Token失败: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }
  );

  // Webview视图提供者类
  class YapiViewProvider implements vscode.WebviewViewProvider {
    private _view?: vscode.WebviewView;

    constructor(private readonly _extensionUri: vscode.Uri, private readonly _context: vscode.ExtensionContext) {}

    // 解析Webview视图
    public resolveWebviewView(
      webviewView: vscode.WebviewView,
      context: vscode.WebviewViewResolveContext,
      _token: vscode.CancellationToken
    ) {
      this._view = webviewView;

      // 设置Webview选项
      webviewView.webview.options = {
        enableScripts: true,
        // 允许访问本地资源
        localResourceRoots: [this._extensionUri],
      };

      // 设置Webview内容
      webviewView.webview.html = this._getHtmlContent(webviewView.webview);

      // 添加消息事件监听器
      webviewView.webview.onDidReceiveMessage(
        async (message) => {
          try {
            switch (message.command) {
              case 'getToken':
                // 获取保存的Token并发送到Webview
                const savedToken = this._context.globalState.get<string>('yapiToken');
                this._view?.webview.postMessage({ command: 'setToken', token: savedToken });
                break;
              
              case 'saveToken':
                // 保存Token
                if (message.token !== undefined) {
                  if (message.token.trim()) {
                    await this._context.globalState.update('yapiToken', message.token);
                    this._view?.webview.postMessage({ command: 'tokenSaved', success: true });
                  } else {
                    // 清空Token
                    await this._context.globalState.update('yapiToken', undefined);
                    this._view?.webview.postMessage({ command: 'tokenSaved', success: false });
                  }
                }
                break;
              
              case 'refreshInterfaces':
                // 刷新接口列表
                try {
                  if (!message.token) {
                    this._view?.webview.postMessage({
                      command: 'interfacesLoadFailed',
                      error: 'YAPI Token 不能为空'
                    });
                    return;
                  }
                  
                  const categories = await fetchYapiInterfaces(message.token);
                  const totalInterfaces = categories.reduce((sum, cat) => sum + cat.list.length, 0);
                  
                  this._view?.webview.postMessage({
                    command: 'interfacesLoaded',
                    categories,
                    total: totalInterfaces
                  });
                } catch (error) {
                  this._view?.webview.postMessage({
                    command: 'interfacesLoadFailed',
                    error: error instanceof Error ? error.message : String(error)
                  });
                }
                break;
              
              case 'generateTypes':
                // 生成TypeScript接口定义
                try {
                  if (!message.selectedInterfaces || message.selectedInterfaces.length === 0) {
                    this._view?.webview.postMessage({
                      command: 'generationComplete',
                      success: false,
                      error: '请至少选择一个接口'
                    });
                    return;
                  }
                  
                  // 获取当前工作区路径
                  const workspaceFolders = vscode.workspace.workspaceFolders;
                  if (!workspaceFolders || workspaceFolders.length === 0) {
                    this._view?.webview.postMessage({
                      command: 'generationComplete',
                      success: false,
                      error: '请先打开一个项目文件夹'
                    });
                    return;
                  }
                  
                  // 生成TypeScript文件
                  const outputDir = vscode.Uri.joinPath(
                    workspaceFolders[0].uri,
                    'yapi'
                  ).fsPath;
                  
                  const result = await generateTypeScriptFiles(
                    message.selectedInterfaces,
                    outputDir,
                    this._context.globalState.get<string>('yapiToken') || ''
                  );
                  
                  this._view?.webview.postMessage({
                    command: 'generationComplete',
                    success: result.success,
                    fileCount: result.fileCount,
                    error: result.error
                  });
                  
                  // 如果生成成功，显示通知并询问是否打开文件夹
                  if (result.success && result.fileCount) {
                    const openFolder = await vscode.window.showInformationMessage(
                      `成功生成 ${result.fileCount} 个接口定义文件，是否打开生成的文件夹？`,
                      '打开',
                      '取消'
                    );
                    
                    if (openFolder === '打开') {
                      vscode.commands.executeCommand(
                        'vscode.openFolder',
                        vscode.Uri.file(outputDir),
                        true
                      );
                    }
                  }
                } catch (error) {
                  this._view?.webview.postMessage({
                    command: 'generationComplete',
                    success: false,
                    error: error instanceof Error ? error.message : String(error)
                  });
                }
                break;
              
              // 保留原有命令的兼容性
              case 'setToken':
                vscode.commands.executeCommand('yapi2ts.setToken');
                break;
            }
          } catch (error) {
            console.error('处理Webview消息失败:', error);
          }
        }
      );
    }

    // 获取Webview HTML内容
    private _getHtmlContent(webview: vscode.Webview) {
      // 返回HTML内容
      return `
            <!DOCTYPE html>
            <html lang="zh-CN">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>YAPI 转 TypeScript</title>
                <style>
                    body {
                        padding: 16px;
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                        color: var(--vscode-foreground);
                        background-color: var(--vscode-editor-background);
                    }
                    .container {
                        display: flex;
                        flex-direction: column;
                        gap: 16px;
                    }
                    h1 {
                        font-size: 18px;
                        margin: 0 0 16px 0;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    }
                    button {
                        padding: 8px 16px;
                        background-color: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 14px;
                        transition: background-color 0.2s;
                    }
                    button:hover {
                        background-color: var(--vscode-button-hoverBackground);
                    }
                    .info {
                        padding: 12px;
                        background-color: var(--vscode-input-background);
                        border-radius: 4px;
                        font-size: 14px;
                        line-height: 1.5;
                    }
                    .separator {
                        height: 1px;
                        background-color: var(--vscode-editorLineNumber-foreground);
                        margin: 16px 0;
                    }
                    .form-group {
                        display: flex;
                        flex-direction: column;
                        gap: 8px;
                    }
                    label {
                        font-size: 14px;
                        font-weight: 500;
                    }
                    input,
                    select {
                        padding: 8px 12px;
                        background-color: var(--vscode-input-background);
                        color: var(--vscode-input-foreground);
                        border: 1px solid var(--vscode-input-border);
                        border-radius: 4px;
                        font-size: 14px;
                    }
                    select {
                        min-height: 120px;
                    }
                    .btn-group {
                        display: flex;
                        gap: 8px;
                        margin-top: 8px;
                    }
                    .status-message {
                        padding: 8px 12px;
                        border-radius: 4px;
                        font-size: 12px;
                        margin-top: 8px;
                    }
                    .status-success {
                        background-color: var(--vscode-notificationCenterNotification-success-background);
                        color: var(--vscode-notificationCenterNotification-success-foreground);
                    }
                    .status-error {
                        background-color: var(--vscode-notificationCenterNotification-error-background);
                        color: var(--vscode-notificationCenterNotification-error-foreground);
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M3 12C3 12 6 7 12 7C18 7 21 12 21 12C21 12 18 17 12 17C6 17 3 12 3 12Z" stroke="currentColor" stroke-width="2"/>
                            <path d="M6 12C6 12 8 9 12 9C16 9 18 12 18 12C18 12 16 15 12 15C8 15 6 12 6 12Z" stroke="currentColor" stroke-width="2"/>
                            <path d="M9 12C9 12 10 10.5 12 10.5C14 10.5 15 12 15 12C15 12 14 13.5 12 13.5C10 13.5 9 12 9 12Z" stroke="currentColor" stroke-width="2"/>
                        </svg>
                        YAPI 转 TypeScript
                    </h1>
                    
                    <div class="info">
                        <p>将YAPI接口定义转换为TypeScript类型定义文件。</p>
                    </div>
                    
                    <!-- YAPI Token 输入框 -->
                    <div class="form-group">
                        <label for="yapiToken">YAPI Token</label>
                        <input type="text" id="yapiToken" placeholder="请输入YAPI项目Token" />
                        <button id="saveTokenBtn">保存 Token</button>
                        <div id="tokenStatus" class="status-message"></div>
                    </div>
                    
                    <div class="separator"></div>
                    
                    <!-- 接口选择 -->
                    <div class="form-group">
                        <label for="interfaceCategories">接口分类</label>
                        <select id="interfaceCategories" multiple></select>
                        <div class="btn-group">
                            <button id="refreshInterfacesBtn">刷新接口列表</button>
                            <button id="selectAllBtn">全选</button>
                            <button id="deselectAllBtn">全不选</button>
                        </div>
                        <div id="interfacesStatus" class="status-message"></div>
                    </div>
                    
                    <div class="separator"></div>
                    
                    <!-- 生成按钮 -->
                    <div>
                        <button id="generateBtn" disabled>生成 TypeScript 接口定义</button>
                    </div>
                </div>
                
                <script>
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
                        element.className = `status-message ${isSuccess ? 'status-success' : 'status-error'}`;
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
                        Array.from(interfaceCategories.options).forEach(option => {
                            option.selected = true;
                        });
                        updateGenerateButtonState();
                    });
                    
                    // 全不选接口
                    deselectAllBtn.addEventListener('click', () => {
                        Array.from(interfaceCategories.options).forEach(option => {
                            option.selected = false;
                        });
                        updateGenerateButtonState();
                    });
                    
                    // 生成TypeScript接口
                    generateBtn.addEventListener('click', () => {
                        const selectedOptions = Array.from(interfaceCategories.selectedOptions)
                            .map(option => JSON.parse(option.value));
                        
                        vscode.postMessage({ command: 'generateTypes', selectedInterfaces: selectedOptions });
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
                        
                        categories.forEach(category => {
                            // 添加分类标题
                            const categoryOption = document.createElement('option');
                            categoryOption.textContent = `📁 ${category.name} (${category.list.length}个接口)`;
                            categoryOption.disabled = true;
                            categoryOption.style.fontWeight = 'bold';
                            categoryOption.style.backgroundColor = 'var(--vscode-list-hoverBackground)';
                            interfaceCategories.appendChild(categoryOption);
                            
                            // 添加分类下的接口
                            category.list.forEach(iface => {
                                if (iface) {
                                    const option = document.createElement('option');
                                    option.textContent = `  ├─ ${iface.title} (${iface.method} ${iface.path})`;
                                    option.value = JSON.stringify(iface);
                                    interfaceCategories.appendChild(option);
                                }
                            });
                        });
                    }
                    
                    // 处理来自VS Code的消息
                    window.addEventListener('message', event => {
                        const message = event.data;
                        
                        switch (message.command) {
                            case 'setToken':
                                yapiTokenInput.value = message.token || '';
                                break;
                            case 'tokenSaved':
                                showStatus(tokenStatus, message.success ? 'YAPI Token 设置成功' : 'YAPI Token 已清空', message.success);
                                break;
                            case 'interfacesLoaded':
                                setInterfaces(message.categories);
                                showStatus(interfacesStatus, `成功加载 ${message.total} 个接口`, true);
                                break;
                            case 'interfacesLoadFailed':
                                showStatus(interfacesStatus, `加载接口失败: ${message.error}`, false);
                                break;
                            case 'generationComplete':
                                showStatus(tokenStatus, message.success ? `成功生成 ${message.fileCount} 个接口定义文件` : `生成失败: ${message.error}`, message.success);
                                break;
                        }
                    });
                    
                    // 初始化
                    init();
                </script>
            </body>
            </html>`;
    }
  }

  // 注册Webview视图提供者
  const viewProvider = new YapiViewProvider(context.extensionUri, context);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('yapi2ts.webview', viewProvider)
  );

  // 将命令添加到订阅列表
  context.subscriptions.push(generateTypesCommand, setTokenCommand);
}

// 插件停用函数
export function deactivate() {
  console.log('YAPI 转 TypeScript 插件已停用');
}
