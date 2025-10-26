# YAPI 转 TypeScript VSCode 插件

这个插件可以通过输入YAPI项目的token，获取项目接口信息，并生成前端TypeScript类型定义文件，包含请求参数类型和返回参数类型。

## 技术栈

- VSCode Extension API
- TypeScript
- Vue 3.4.21
- Element Plus
- Vite

## 功能特性

- 支持设置和保存YAPI项目Token
- 自动获取YAPI项目中的接口列表
- 支持按分类查看和选择接口
- 一键生成TypeScript类型定义文件
- 美观的界面，基于Vue3和Element Plus

## 安装依赖

```bash
# 安装扩展依赖
npm install

# 安装Webview依赖
cd src/webview
npm install
```

## 开发

### 开发Webview

```bash
# 在根目录运行
npm run dev:webview
```

### 构建项目

```bash
# 构建完整项目（包括Webview）
npm run build:all

# 只构建Webview
npm run build:webview

# 只构建扩展
npm run build
```

### 打包VSIX文件

```bash
npm run package
```

## 使用方法

1. 在VSCode中打开扩展面板
2. 点击YAPI 转 TypeScript图标打开插件视图
3. 输入YAPI项目Token并保存
4. 点击"刷新接口列表"按钮获取接口
5. 选择需要生成类型定义的接口
6. 点击"生成TypeScript接口定义"按钮
7. 生成的类型定义文件将保存在项目的yapi目录中

## 注意事项

- 确保YAPI项目Token正确有效
- 确保已打开一个项目文件夹，以便插件可以生成文件
- 生成的类型定义文件包括请求参数类型和返回参数类型

