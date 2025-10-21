<template>
  <list-drag v-model:left-panel="leftList" v-model:right-panel="rightList" :config="config">
    <template #left-panel-header>
      <h4>自定义header</h4>
    </template>
    <template #custom-item="{ item }">
      <div v-if="item.idreset === 3">
        <img src="https://admin.ct108.net:777/images/dingbtn.png" />
      </div>
      <div v-if="item.idreset === 4">{{ item.titlereset }}-{{ item.idreset }}</div>
    </template>
  </list-drag>
</template>
<script lang="ts" setup>
import { ref, h } from 'vue';
import ListDrag from '../listDrag/index.vue';
interface ConfigType {
  //字段别名
  prop?: {
    valueKey?: string;
    labelKey?: string;
    canChooseKey?: string;
  };
  //样式类名
  cls?: string;

  //leftPanel 设置左侧列表相关
  leftPanel?: {
    name?: string;
    dragOrigin?: string;
    showTitle?: boolean;
    title?: string;
    showSummary?: boolean;
    showSearch?: boolean;
  };
  //rightPanel 设置右侧列表相关
  rightPanel?: {
    name?: string;
    dragOrigin?: string;
    showTitle?: boolean;
    title?: string;
    showSummary?: boolean;
    showSearch?: boolean;
  };
}
// 配置项 用于重定义列表字段
const config = ref<ConfigType>({
  cls: 'drag-list-container',
  prop: { valueKey: 'idreset', labelKey: 'titlereset', canChooseKey: 'choosereset' },
  leftPanel: {
    showTitle: true,
    showSummary: true,
    showSearch: true
  },
  rightPanel: {}
});

// 默认数据定义
// interface DragItem {
//   id: string | number; // 字段id
//   title: string; // 字段名称
//   canChoose: boolean; // 是否可拖拽
//   slot?: any; //自定义的title
// }
// const leftList = ref<DragItem[]>([
//   { id: 1, title: 'aaaaaaaa', canChoose: false },
//   { id: 2, title: 'bbbbbbbb', canChoose: true },
//   { id: 3, title: 'cccccccc', canChoose: true },
//   { id: 4, title: 'dddddddd', canChoose: true },
//   { id: 5, title: 'eeeeeeee', canChoose: true },
//   { id: 7, title: 'ffffffff', canChoose: true },
//   { id: 8, title: 'gggggggg', canChoose: true },
//   { id: 9, title: 'hhhhhhhh', canChoose: true },
//   { id: 10, title: 'iiiiiiii', canChoose: true },
//   { id: 11, title: 'jjjjjjjj', canChoose: true },
//   { id: 12, title: 'kkkkkkkk', canChoose: true },
//   { id: 13, title: 'llllllll', canChoose: true },
//   { id: 14, title: 'mmmmmmmm', canChoose: true },
//   { id: 15, title: '超长文字tooltip测试超长文字tooltip测试超长文字tooltip测试', canChoose: true }
// ]);
// leftList的默认类型为DragItem[]，实际类型是config配置的字段映射值
const leftList = ref<any[]>([
  {
    idreset: 1,
    titlereset: 'aaaaaaaa',
    choosereset: true
  },
  {
    idreset: 2,
    titlereset: 'bbbbbbbb',
    choosereset: true
  },
  { idreset: 3, titlereset: 'cccccccc', choosereset: true },
  { idreset: 4, titlereset: 'dddddddd', choosereset: true },
  { idreset: 5, titlereset: 'eeeeeeee', choosereset: true },
  { idreset: 7, titlereset: 'ffffffff', choosereset: true },
  { idreset: 8, titlereset: 'gggggggg', choosereset: true },
  { idreset: 9, titlereset: 'hhhhhhhh', choosereset: true },
  { idreset: 10, titlereset: 'iiiiiiii', choosereset: true },
  { idreset: 11, titlereset: 'jjjjjjjj', choosereset: true },
  { idreset: 12, titlereset: 'kkkkkkkk', choosereset: true },
  { idreset: 13, titlereset: 'llllllll', choosereset: true },
  { idreset: 14, titlereset: 'mmmmmmmm', choosereset: true },
  {
    idreset: 15,
    titlereset: '超长文字tooltip测试超长文字tooltip测试超长文字tooltip测试',
    choosereset: true
  }
]);

const rightList = ref<any[]>([]);
</script>
<style lang="scss" scoped>
.drag-list-container {
  width: 900px;
  height: 600px;
  margin: 0 auto;
  display: flex;
}
</style>
