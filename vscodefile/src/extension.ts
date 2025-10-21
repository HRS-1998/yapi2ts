import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import {
  fetchYapiInterfaces,
  generateTypeScriptFiles,
  InterfaceCategory,
  YapiInterface,
} from './yapiService';

// 通用类型定义
interface EnhancedQuickPickItem extends vscode.QuickPickItem {
  categoryIndex?: number;
  interfaceIndex?: number;
  interface?: YapiInterface;
}

interface GenerationResult {
  success: boolean;
  fileCount?: number;
  error?: string;
}

// Webview 相关路径配置
const getWebviewOptions = (extensionUri: vscode.Uri): vscode.WebviewOptions => ({
  enableScripts: true,
  localResourceRoots: [
    vscode.Uri.joinPath(extensionUri, 'dist/webview'),
    vscode.Uri.joinPath(extensionUri, 'resources'),
  ],
});

// 生成唯一的nonce值用于CSP
const getNonce = (): string => {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length: 32 }, () => 
    possible.charAt(Math.floor(Math.random() * possible.length))
  ).join('');
};

// 通用错误处理函数
const handleError = (error: unknown, message: string): string => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error(`${message}:`, error);
  return `${message}: ${errorMessage}`;
};

// 构建带分类的快速选择项
const buildInterfaceQuickPickItems = (interfaceCategories: InterfaceCategory[]): EnhancedQuickPickItem[] => {
  const quickPickItems: EnhancedQuickPickItem[] = [];

  // 添加全选选项
  quickPickItems.push({
    label: '$(checklist) 全选所有接口',
    description: `共 ${interfaceCategories.reduce(
      (sum, cat) => sum + cat.list.length,
      0
    )} 个接口`,
    detail: '选择所有分类下的所有接口',
    alwaysShow: true,
  });

  // 添加分隔符
  quickPickItems.push({
    label: '──────────',
    kind: vscode.QuickPickItemKind.Separator,
  });

  // 为每个分类添加选项
  interfaceCategories.forEach((category, categoryIndex) => {
    // 添加分类标题
    quickPickItems.push({
      label: `$(folder) ${category.name}`,
      description: `${category.list.length} 个接口`,
      detail: '选择/取消选择该分类下的所有接口',
      picked: false,
      alwaysShow: true,
      categoryIndex
    });

    // 为该分类下的每个接口添加选项
    category.list.forEach((iface, interfaceIndex) => {
      if (!iface) return;

      quickPickItems.push({
        label: `  ├─ ${iface.title}`,
        description: `${iface.method} ${iface.path}`,
        detail: `属于分类: ${category.name}`,
        picked: false,
        categoryIndex,
        interfaceIndex,
        interface: iface
      });
    });

    // 在分类末尾添加分隔符
    if (categoryIndex < interfaceCategories.length - 1) {
      quickPickItems.push({
        label: '──────────',
        kind: vscode.QuickPickItemKind.Separator,
      });
    }
  });

  return quickPickItems;
};

// 处理接口选择逻辑
const handleInterfaceSelection = async (
  quickPickItems: EnhancedQuickPickItem[]
): Promise<YapiInterface[] | undefined> => {
  // 显示选择框
  const showSelectionBox = async (items: EnhancedQuickPickItem[]) => 
    vscode.window.showQuickPick(items, {
      canPickMany: true,
      placeHolder: '请选择要生成的接口（可以按分类选择或全选）',
    });

  let selectedItems = await showSelectionBox(quickPickItems);
  if (!selectedItems || selectedItems.length === 0) return;

  // 检查是否需要特殊处理（分类选择或全选）
  const selectedCategoryItem = selectedItems.find((item) => 
    item.label.startsWith('$(folder)') || item.label.startsWith('$(checklist)')
  );

  if (selectedCategoryItem) {
    // 创建新的选项列表，复制原始数据
    const newQuickPickItems = quickPickItems.map(item => ({ ...item }));

    if (selectedCategoryItem.label.startsWith('$(folder)')) {
      // 分类选择逻辑
      const categoryIndex = selectedCategoryItem.categoryIndex!;
      newQuickPickItems.forEach(item => {
        if (item.categoryIndex === categoryIndex && item.interfaceIndex !== undefined) {
          item.picked = true;
        }
      });
    } else if (selectedCategoryItem.label.startsWith('$(checklist)')) {
      // 全选逻辑
      newQuickPickItems.forEach(item => {
        if (item.interface !== undefined) {
          item.picked = true;
        }
      });
    }

    // 重新显示选择框
    const newSelectedItems = await showSelectionBox(newQuickPickItems);
    if (newSelectedItems) {
      // 过滤掉分类项和全选框，只保留接口项
      selectedItems = newSelectedItems.filter(item => item.interface !== undefined);
    } else {
      return;
    }
  }

  // 过滤出实际选中的接口
  const selectedInterfaces = selectedItems
    .filter(item => item.interface !== undefined)
    .map(item => item.interface!);

  return selectedInterfaces.length > 0 ? selectedInterfaces : undefined;
};

// 生成TypeScript文件并显示结果
const processTypeGeneration = async (
  selectedInterfaces: YapiInterface[],
  workspaceFolder: vscode.WorkspaceFolder,
  yapiToken: string
): Promise<void> => {
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: '生成TypeScript接口定义',
      cancellable: true,
    },
    async (progress) => {
      progress.report({ increment: 0 });

      try {
        // 生成TypeScript文件
        const outputDir = vscode.Uri.joinPath(workspaceFolder.uri, 'yapi').fsPath;
        const result = await generateTypeScriptFiles(
          selectedInterfaces,
          outputDir,
          yapiToken
        );

        progress.report({ increment: 100 });

        // 显示结果通知
        if (result.success && result.fileCount) {
          vscode.window.showInformationMessage(
            `成功生成 ${result.fileCount} 个接口定义文件`
          );

          // 打开生成的文件夹
          const openFolder = await vscode.window.showInformationMessage(
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
      } catch (error) {
        const errorMessage = handleError(error, '生成TypeScript文件失败');
        vscode.window.showErrorMessage(errorMessage);
      }
    }
  );
};

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

        // 3. 显示进度通知并获取接口列表
        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: '获取YAPI接口列表',
            cancellable: true,
          },
          async (progress) => {
            progress.report({ increment: 0 });

            try {
              const interfaceCategories = await fetchYapiInterfaces(yapiToken);
              progress.report({ increment: 100 });

              if (interfaceCategories.length === 0) {
                vscode.window.showInformationMessage('未找到任何接口');
                return;
              }

              // 构建选择项
              const quickPickItems = buildInterfaceQuickPickItems(interfaceCategories);
              
              // 处理接口选择
              const selectedInterfaces = await handleInterfaceSelection(quickPickItems);
              if (!selectedInterfaces) return;

              // 生成TypeScript文件
              await processTypeGeneration(selectedInterfaces, workspaceFolders[0], yapiToken);
            } catch (error) {
              const errorMessage = handleError(error, '获取接口列表失败');
              vscode.window.showErrorMessage(errorMessage);
            }
          }
        );
      } catch (error) {
        const errorMessage = handleError(error, '生成TypeScript接口定义失败');
        vscode.window.showErrorMessage(errorMessage);
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
          // 调用修改后的saveYapiToken函数，它现在返回boolean
          await saveYapiToken(context, token);
          // 注意：saveYapiToken内部已经处理了成功/失败的消息显示
        }
      } catch (error) {
        // 这个错误处理是备用的，因为saveYapiToken内部应该已经处理了错误
        console.error('setTokenCommand: Unhandled error:', error);
      }
    }
  );
  
  // 保存YAPI Token到全局状态
  const saveYapiToken = async (
    context: vscode.ExtensionContext,
    token: string
  ): Promise<boolean> => {
    try {
      if (token.trim()) {
        await context.globalState.update('yapiToken', token.trim());
        vscode.window.showInformationMessage('YAPI Token 设置成功');
        return true;
      } else {
        await context.globalState.update('yapiToken', undefined);
        vscode.window.showInformationMessage('YAPI Token 已清空');
        return true;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(`保存YAPI Token时发生错误: ${errorMessage}`);
      return false;
    }
  };
  
  // Webview视图提供者类
  class YapiViewProvider implements vscode.WebviewViewProvider {
    private _view?: vscode.WebviewView;
  
    constructor(
      private readonly _extensionUri: vscode.Uri,
      private readonly _context: vscode.ExtensionContext
    ) {}
  
    // 解析Webview视图
    public resolveWebviewView(
      webviewView: vscode.WebviewView,
      _context: vscode.WebviewViewResolveContext,
      _token: vscode.CancellationToken
    ) {
      this._view = webviewView;
  
      // 设置Webview选项
      webviewView.webview.options = getWebviewOptions(this._extensionUri);
  
      // 设置Webview内容
      webviewView.webview.html = this._getHtmlContent(webviewView.webview);
  
      // 添加消息事件监听器
      webviewView.webview.onDidReceiveMessage(async (message) => {
        try {
          await this.handleWebviewMessage(message);
        } catch (error) {
          console.error('处理Webview消息失败:', error);
        }
      });
    }
  
    // 处理来自Webview的消息
    private async handleWebviewMessage(message: any): Promise<void> {
      switch (message.command) {
        case 'getToken':
          await this.handleGetToken();
          break;
        case 'saveToken':
          await this.handleSaveToken(message.token);
          break;
        case 'refreshInterfaces':
          await this.handleRefreshInterfaces(message.token);
          break;
        case 'generateTypes':
          await this.handleGenerateTypes(message.selectedInterfaces);
          break;
        case 'setToken':
          vscode.commands.executeCommand('yapi2ts.setToken');
          break;
      }
    }
  
    // 处理获取Token请求
    private async handleGetToken(): Promise<void> {
      const savedToken = this._context.globalState.get<string>('yapiToken');
      this._view?.webview.postMessage({
        command: 'setToken',
        token: savedToken,
      });
    }
  
    // 处理保存Token请求
    private async handleSaveToken(token?: string): Promise<void> {
      console.log('handleSaveToken: Starting token save process');
      
      // 验证webview是否可用
      const webviewAvailable = this._view && this._view.webview;
      console.log('handleSaveToken: Webview status:', { webviewAvailable, hasView: !!this._view });
      
      // 检查token参数
      if (token === undefined || token === null) {
        console.error('handleSaveToken: Token is undefined or null');
        
        // 即使token未定义，也要向webview发送响应
        if (webviewAvailable) {
          try {
            const result = this._view!.webview.postMessage({
              command: 'tokenSaved',
              success: false,
              error: 'Token is undefined or null'
            });
            console.log('handleSaveToken: Sent undefined token response:', result);
          } catch (err) {
            console.error('handleSaveToken: Error sending undefined token response:', err);
          }
        }
        return;
      }

      try {
        // 记录token信息（不记录完整token）
        const tokenLength = token.length;
        console.log(`handleSaveToken: Calling saveYapiToken with token length: ${tokenLength}`);
        
        // 调用保存Token的函数，使用其返回值
        const isSuccess = await saveYapiToken(this._context, token);
        
        console.log(`handleSaveToken: Token operation result: ${isSuccess}`);
        
        // 使用简化的消息发送逻辑，确保无论如何都尝试发送响应
        const sendResponse = (success: boolean, error?: string) => {
          if (webviewAvailable) {
            try {
              // 直接发送消息，不关心返回值
              console.log('handleSaveToken: Attempting to send response to webview');
              this._view!.webview.postMessage({
                command: 'tokenSaved',
                success,
                error
              });
              console.log('handleSaveToken: Response sent successfully');
            } catch (postError) {
              console.error('handleSaveToken: Failed to send response to webview:', postError);
            }
          } else {
            console.warn('handleSaveToken: Cannot send response - webview not available');
          }
        };
        
        // 立即发送响应
        sendResponse(isSuccess);
        
        // 添加多重确认机制，确保webview收到消息
        // 发送第一次确认
        setTimeout(() => sendResponse(isSuccess), 100);
        // 发送第二次确认
        setTimeout(() => sendResponse(isSuccess), 300);
        // 发送最终确认
        setTimeout(() => sendResponse(isSuccess), 500);
        
      } catch (error) {
        console.error('handleSaveToken: Unexpected error:', error);
        const errorMsg = error instanceof Error ? error.message : String(error);
        
        // 发送错误响应
        if (webviewAvailable) {
          try {
            this._view!.webview.postMessage({
              command: 'tokenSaved',
              success: false,
              error: errorMsg,
            });
          } catch (postError) {
            console.error('handleSaveToken: Failed to send error response:', postError);
          }
        }
      }
    }
  
    // 处理刷新接口列表请求
    private async handleRefreshInterfaces(token?: string): Promise<void> {
      console.log('handleRefreshInterfaces: Starting with provided token length:', token?.length);
      
      // 首先检查传入的token
      let effectiveToken = token;
      
      // 如果传入的token为空，尝试从globalState获取已保存的token
      if (!effectiveToken) {
        console.log('handleRefreshInterfaces: Provided token is empty, trying to get from globalState');
        effectiveToken = this._context.globalState.get<string>('yapiToken');
        console.log('handleRefreshInterfaces: Token from globalState exists:', !!effectiveToken);
      }
      
      // 如果仍然没有token，才报错
      if (!effectiveToken) {
        console.error('handleRefreshInterfaces: No token available');
        if (this._view?.webview) {
          this._view.webview.postMessage({
            command: 'interfacesLoadFailed',
            error: '请先设置YAPI Token',
          });
        }
        return;
      }
  
      try {
        console.log('handleRefreshInterfaces: Using effective token for API call');
        const categories = await fetchYapiInterfaces(effectiveToken);
        const totalInterfaces = categories.reduce(
          (sum, cat) => sum + cat.list.length,
          0
        );
        
        console.log(`handleRefreshInterfaces: Loaded ${totalInterfaces} interfaces`);
        
        if (this._view?.webview) {
          this._view.webview.postMessage({
            command: 'interfacesLoaded',
            categories,
            total: totalInterfaces,
          });
        }
      } catch (error) {
        console.error('handleRefreshInterfaces: Error loading interfaces:', error);
        const errorMsg = error instanceof Error ? error.message : String(error);
        
        if (this._view?.webview) {
          this._view.webview.postMessage({
            command: 'interfacesLoadFailed',
            error: `加载接口失败: ${errorMsg}`,
          });
        }
      }
    }
  
    // 处理生成TypeScript接口请求
    private async handleGenerateTypes(selectedInterfaces?: YapiInterface[]): Promise<void> {
      if (!selectedInterfaces || selectedInterfaces.length === 0) {
        this._view?.webview.postMessage({
          command: 'generationComplete',
          success: false,
          error: '请至少选择一个接口',
        });
        return;
      }
  
      // 获取当前工作区路径
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders || workspaceFolders.length === 0) {
        this._view?.webview.postMessage({
          command: 'generationComplete',
          success: false,
          error: '请先打开一个项目文件夹',
        });
        return;
      }
  
      try {
        // 生成TypeScript文件
        const outputDir = vscode.Uri.joinPath(
          workspaceFolders[0].uri,
          'yapi'
        ).fsPath;
  
        const result = await generateTypeScriptFiles(
          selectedInterfaces,
          outputDir,
          this._context.globalState.get<string>('yapiToken') || ''
        );
  
        this._view?.webview.postMessage({
          command: 'generationComplete',
          success: result.success,
          fileCount: result.fileCount,
          error: result.error,
        });
  
        // 如果生成成功，显示通知并询问是否打开文件夹
        if (result.success && result.fileCount) {
          await this.handleSuccessfulGeneration(outputDir, result.fileCount);
        }
      } catch (error) {
        this._view?.webview.postMessage({
          command: 'generationComplete',
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  
    // 处理生成成功后的后续操作
    private async handleSuccessfulGeneration(outputDir: string, fileCount: number): Promise<void> {
      const openFolder = await vscode.window.showInformationMessage(
        `成功生成 ${fileCount} 个接口定义文件，是否打开生成的文件夹？`,
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
  
    // 获取Webview HTML内容
    private _getHtmlContent(webview: vscode.Webview): string {
      // 获取构建后的Vue应用资源URI（动态匹配文件，不依赖具体文件名）
      const indexHtmlPath = vscode.Uri.joinPath(this._extensionUri, 'dist/webview', 'index.html');
      
      try {
        // 尝试读取并返回构建后的index.html内容，进行必要的URI转换
        return this._processHtmlFromFile(indexHtmlPath, webview);
      } catch (error) {
        // 如果读取失败，返回简化的备用HTML
        console.error('读取Webview index.html失败:', error);
        return this._getFallbackHtml(webview);
      }
    }
  
    // 从文件处理HTML内容
    private _processHtmlFromFile(indexHtmlPath: vscode.Uri, webview: vscode.Webview): string {
      let htmlContent = fs.readFileSync(indexHtmlPath.fsPath, 'utf8');
      
      // 注入VS Code API通信脚本
      const nonce = getNonce();
      
      // 修改CSP，添加nonce
      htmlContent = htmlContent.replace(
        /<meta http-equiv="Content-Security-Policy"[^>]*>/,
        `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource}; script-src 'nonce-${nonce}'; style-src ${webview.cspSource} 'unsafe-inline';">`
      );
      
      // 在body末尾添加VS Code API注入脚本
      htmlContent = htmlContent.replace(
        '</body>',
        `  <script nonce="${nonce}">
          // 暴露VS Code API给Vue应用
          window.acquireVsCodeApi = function() {
            return {
              postMessage: (message) => {
                window.parent.postMessage(message, '*');
              },
              getState: () => ({}),
              setState: () => {}
            };
          };
        </script>
      </body>`
      );
      
      // 替换所有资源URL为Webview URI
      htmlContent = htmlContent.replace(/src="([^"]*)"/g, (match, p1) => {
        if (p1.startsWith('http')) return match;
        const resourceUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'dist/webview', p1));
        return `src="${resourceUri}"`;
      });
      
      // 替换link href属性
      htmlContent = htmlContent.replace(/href="([^"]*)"/g, (match, p1) => {
        if (p1.startsWith('http') || p1.startsWith('#')) return match;
        const resourceUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'dist/webview', p1));
        return `href="${resourceUri}"`;
      });
      
      return htmlContent;
    }
  
    // 替换HTML中的资源URL为Webview URI
    private _replaceResourceUrls(htmlContent: string, webview: vscode.Webview): string {
      // 替换script src属性
      htmlContent = htmlContent.replace(/src="([^"]*)"/g, (match, p1) => {
        if (p1.startsWith('http')) return match;
        const resourceUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'dist/webview', p1));
        return `src="${resourceUri}"`;
      });
      
      // 替换link href属性
      htmlContent = htmlContent.replace(/href="([^"]*)"/g, (match, p1) => {
        if (p1.startsWith('http') || p1.startsWith('#')) return match;
        const resourceUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'dist/webview', p1));
        return `href="${resourceUri}"`;
      });
      
      return htmlContent;
    }
  
    // 获取备用HTML内容
    private _getFallbackHtml(webview: vscode.Webview): string {
      const nonce = getNonce();
      
      // 尝试查找正确的构建文件
      const mainJsUri = this._findAndGetResourceUri(webview, 'assets/main', '.js');
      const cssUri = this._findAndGetResourceUri(webview, 'assets/index', '.css');
      
      return `<!DOCTYPE html>
        <html lang="zh-CN">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>YAPI 转 TypeScript</title>
          <link href="${cssUri}" rel="stylesheet">
          <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource}; script-src 'nonce-${nonce}'; style-src ${webview.cspSource} 'unsafe-inline';">
        </head>
        <body>
          <div id="app"></div>
          <script nonce="${nonce}">
            // 暴露VS Code API给Vue应用
            window.acquireVsCodeApi = function() {
              return {
                postMessage: (message) => {
                  window.parent.postMessage(message, '*');
                },
                getState: () => ({}),
                setState: () => {}
              };
            };
          </script>
          <script nonce="${nonce}" src="${mainJsUri}"></script>
        </body>
        </html>`;
    }
  
    // 查找并获取资源URI，支持带哈希的文件名
    private _findAndGetResourceUri(webview: vscode.Webview, basePath: string, extension: string): vscode.Uri {
      try {
        const assetsDir = vscode.Uri.joinPath(this._extensionUri, 'dist/webview', path.dirname(basePath)).fsPath;
        if (fs.existsSync(assetsDir)) {
          const files = fs.readdirSync(assetsDir);
          const matchingFile = files.find(file => 
            file.startsWith(path.basename(basePath)) && file.endsWith(extension)
          );
          if (matchingFile) {
            return webview.asWebviewUri(
              vscode.Uri.joinPath(this._extensionUri, 'dist/webview', basePath.split('/')[0], matchingFile)
            );
          }
        }
      } catch (error) {
        console.error('查找资源文件失败:', error);
      }
      
      // 默认返回标准路径
      return webview.asWebviewUri(
        vscode.Uri.joinPath(this._extensionUri, 'dist/webview', `${basePath}${extension}`)
      );
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
