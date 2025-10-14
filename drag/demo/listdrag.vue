<template>
  <list-drag v-model:left-panel="leftList" v-model:right-panel="rightList" :config="config">
    <template #left-panel-header>
      <h4>自定义header</h4>
    </template>
    <template #left-panel-item="{ item }">
      <div v-if="item.id == 3">
        <img src="https://admin.ct108.net:777/images/dingbtn.png" alt="dsg" />
      </div>
      <div v-else>{{ item.title }}-{{ item.id }}</div>
    </template>
  </list-drag>
</template>
<script lang="ts" setup>
import { ref, h } from 'vue';
import ListDrag from '../listDrag/index.vue';

// interface DragItem {
//   id: string | number; // 字段id
//   title: string; // 字段名称
//   canChoose: boolean; // 是否可拖拽
//   slot?: any; //自定义的title
// }
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
    showTitle?: boolean;
    showSummary?: boolean;
    showSearch?: boolean;
  };
  //rightPanel 设置右侧列表相关
  rightPanel?: {
    showTitle?: boolean;
    showSummary?: boolean;
    showSearch?: boolean;
  };
}
// 配置项 用于重定义列表字段
const config = ref<ConfigType>({
  cls: 'drag-list-container',
  prop: { valueKey: 'idsm', labelKey: 'label', canChooseKey: 'canChoose' },
  leftPanel: {
    showTitle: true,
    showSummary: true,
    showSearch: true
  },
  rightPanel: {}
});

// 数据定义
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
    idsm: 1,
    label: 'aaaaaaaa',
    canChoose: true,
    slot: () => h('span', { style: { color: '#409EFF' } }, '蓝色文字')
  },
  {
    idsm: 2,
    label: 'bbbbbbbb',
    canChoose: true,
    slot: () => h('img', { src: 'https://admin.ct108.net:777/images/dingbtn.png', alt: '图片' })
  },
  { idsm: 3, label: 'cccccccc', canChoose: true },
  { idsm: 4, label: 'dddddddd', canChoose: true },
  { idsm: 5, label: 'eeeeeeee', canChoose: true },
  { idsm: 7, label: 'ffffffff', canChoose: true },
  { idsm: 8, label: 'gggggggg', canChoose: true },
  { idsm: 9, label: 'hhhhhhhh', canChoose: true },
  { idsm: 10, label: 'iiiiiiii', canChoose: true },
  { idsm: 11, label: 'jjjjjjjj', canChoose: true },
  { idsm: 12, label: 'kkkkkkkk', canChoose: true },
  { idsm: 13, label: 'llllllll', canChoose: true },
  { idsm: 14, label: 'mmmmmmmm', canChoose: true },
  { idsm: 15, label: '超长文字tooltip测试超长文字tooltip测试超长文字tooltip测试', canChoose: true }
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
