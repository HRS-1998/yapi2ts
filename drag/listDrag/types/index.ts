import { Search } from '@element-plus/icons-vue';
export interface ListItem {
  id?: string | number;
  title?: string;
  canChoose?: boolean;
  selected?: boolean;
}

export interface PanelConfig {
  name?: string; // 当前drag
  dragOrigin?: string; // 拖拽来源
  showTitle?: boolean;
  title?: string;
  showSummary?: boolean;
  showSearch?: boolean;
  showLeftIcon?: boolean; // 显示左侧图标
  showRightIcon?: boolean; // 显示右侧图标
  searchFn?: (query: string, item: ListItem) => boolean;
}

export interface ConfigType {
  //字段别名
  prop?: {
    valueKey?: string;
    labelKey?: string;
    canChooseKey?: string;
  };
  //样式类名
  cls?: string;

  //leftPanel 设置左侧列表相关
  leftPanel?: Omit<PanelConfig, 'showLeftIcon' | 'showRightIcon'>;
  //rightPanel 设置右侧列表相关
  rightPanel?: PanelConfig;
}
