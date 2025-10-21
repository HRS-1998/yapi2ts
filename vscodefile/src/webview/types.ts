// VS Code API 类型声明
export interface VsCodeApi {
  postMessage(message: any): void;
  getState(): any;
  setState(state: any): void;
}

// 接口项类型
export interface YapiInterface {
  title: string;
  method: string;
  path: string;
  [key: string]: any;
}

// 接口分类类型
export interface InterfaceCategory {
  name: string;
  list: YapiInterface[];
}

// VS Code消息类型
export interface VscodeMessage {
  command: string;
  token?: string;
  categories?: InterfaceCategory[];
  total?: number;
  selectedInterfaces?: YapiInterface[];
  success?: boolean;
  error?: string;
  fileCount?: number;
}