/// <reference types="vite/client" />

// 为Vue文件提供类型声明（Vite 3兼容版本）
declare module '*.vue' {
  import { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

// 为Chrome扩展API提供类型声明
declare namespace chrome {
  export interface Runtime {
    onMessage: {
      addListener(callback: (message: any, sender: any, sendResponse: (response?: any) => void) => void): void;
    };
    sendMessage(message: any, responseCallback?: (response?: any) => void): void;
  }
  export var runtime: Runtime;
}

// 环境变量类型声明
interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string
  // 可以添加更多的环境变量类型声明
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}