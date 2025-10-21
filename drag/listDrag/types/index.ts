export interface ListItem {
  id: string | number;
  title: string;
  canChoose?: boolean;
  selected?: boolean;
  slot?: string;
}

export interface PanelConfig {
  name?: string; // 当前drag
  cls?: string; // 设置样式类名
  dragOrigin?: string; // 拖拽来源
  labelKey?: string;
  valueKey?: string;
  canchooseKey?: string;
  showTitle?: boolean;
  title?: string;
  showSummary?: boolean;
  showSearch?: boolean;
}
