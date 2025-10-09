# YAPI 转 TypeScript VSCode 插件

将YAPI接口定义转换为TypeScript类型定义的VSCode插件。

## 功能特性

- 从YAPI获取项目接口列表
- 选择要生成的接口定义
- 自动生成TypeScript接口定义文件
- 支持在VSCode活动栏中快速访问

## 安装方法

1. 下载插件的VSIX文件
2. 在VSCode中按下 `Ctrl+Shift+P` 打开命令面板
3. 输入 `Extensions: Install from VSIX...` 并选择下载的VSIX文件
4. 安装完成后，插件图标会显示在活动栏中

## 使用说明

### 方法一：通过活动栏使用

1. 点击VSCode活动栏中的"YAPI 转 TypeScript"图标
2. 在弹出的面板中点击"设置 YAPI Token"按钮，输入您的YAPI项目Token
3. 打开要生成接口定义的项目文件夹
4. 点击"生成 TypeScript 接口定义"按钮
5. 在弹出的选择框中选择要生成的接口
6. 接口定义文件将生成在项目的 `yapi` 文件夹中

### 方法二：通过命令面板使用

1. 按下 `Ctrl+Shift+P` 打开命令面板
2. 输入 `YAPI 转 TypeScript: 设置项目Token` 并设置您的YAPI Token
3. 打开要生成接口定义的项目文件夹
4. 按下 `Ctrl+Shift+P` 再次打开命令面板
5. 输入 `YAPI 转 TypeScript: 生成接口定义` 并执行
6. 在弹出的选择框中选择要生成的接口
7. 接口定义文件将生成在项目的 `yapi` 文件夹中

## 注意事项

- 插件需要有效的YAPI项目Token才能获取接口列表
- 请确保您已经在VSCode中打开了一个项目文件夹
- 生成的接口定义文件将保存在项目根目录下的 `yapi` 文件夹中
- 目前插件使用的是示例YAPI地址，实际使用时可能需要根据您的YAPI配置进行调整

