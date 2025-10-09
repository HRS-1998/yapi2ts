# YAPI 转 TypeScript Chrome 插件

一个使用TypeScript和Vue 3开发的Chrome插件，可以将YAPI接口定义转换为TypeScript接口定义。

## 功能特性

1. 提供输入框用于输入YAPI项目Token
2. 点击按钮获取YAPI项目中的所有接口定义
3. 在插件界面生成多选下拉框，可以选择需要的接口
4. 选择后点击生成按钮，自动生成对应的TypeScript接口定义
5. 支持打开VSCode编辑器并创建yapi文件夹，生成对应的接口文件

## 项目结构

```
yapi2ts/
├── src/                 # 源代码目录
│   ├── components/      # Vue组件
│   ├── utils/           # 工具函数
│   ├── popup.ts         # 弹出窗口入口
│   ├── background.ts    # 后台脚本
│   └── content.ts       # 内容脚本
├── icons/               # 插件图标
├── config.ts            # 配置文件（API接口定义）
├── manifest.json        # Chrome插件配置
├── package.json         # 项目依赖配置
├── tsconfig.json        # TypeScript配置
├── vite.config.ts       # Vite配置
├── vite-env.d.ts        # Vite环境类型声明
└── popup.html           # 弹出窗口HTML
```

## 开发指南

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

这将启动vite的开发服务器，实时监听文件变化并自动重新构建。

### 构建生产版本

```bash
npm run build
```

这将在dist目录中生成用于Chrome扩展的生产构建文件，构建前会先执行TypeScript类型检查。

## 安装插件

1. 打开Chrome浏览器
2. 进入扩展管理页面（chrome://extensions/）
3. 开启右上角的"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择项目根目录中的dist文件夹

## 使用说明

1. 点击浏览器工具栏中的插件图标
2. 在弹出窗口中输入YAPI项目的Token
3. 点击"获取接口列表"按钮，等待加载完成
4. 从列表中选择需要生成TypeScript接口定义的接口
5. 点击"生成TypeScript接口定义"按钮
6. 按照弹出的提示，在VSCode中执行相应的命令以创建接口文件

## 注意事项

- 本插件需要访问YAPI服务器，确保您的网络可以正常访问YAPI
- 使用VSCode集成功能时，请确保您已经安装了VSCode
- 生成的TypeScript接口定义可能需要根据实际项目需求进行适当的调整

## 许可证

MIT