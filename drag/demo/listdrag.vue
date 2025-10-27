<template>
  <list-drag v-model:left-panel="leftList" v-model:right-panel="rightList" :config="config">
    <!-- <template #left-panel-header>
      <h4>自定义header</h4>
    </template> -->
    <template #custom-item="{ item }">
      <div v-if="item.idreset === 3">
        <img src="https://admin.ct108.net:777/images/dingbtn.png" />
      </div>
      <div v-if="item.idreset === 4">{{ item.titlereset }}-{{ item.idreset }}</div>
    </template>
  </list-drag>
</template>
<script lang="ts" setup>
import { ref } from 'vue';
import ListDrag from '../listDrag/index.vue';
import type { ConfigType } from '../listDrag/types/index';
const searchFn = (query: string, item: any): boolean => {
  return item.idreset == query || item.titlereset.toLowerCase().includes(query);
};

// 配置项 用于重定义列表字段
const config = ref<ConfigType>({
  cls: 'drag-list-container',
  prop: { valueKey: 'idreset', labelKey: 'titlereset', canChooseKey: 'choosereset' },
  leftPanel: {
    showTitle: true,
    showSummary: true,
    showSearch: true,
    searchFn: searchFn
  },
  rightPanel: {
    searchFn: searchFn
    // showLeftIcon: false,
    // showRightIcon: false
  }
});

// const leftList = ref<DragItem[]>([
//   { id: 1, title: 'aaaaaaaa', canChoose: false },
//   { id: 15, title: '超长文字tooltip测试超长文字tooltip测试超长文字tooltip测试', canChoose: true }
// ]);
// leftList的默认类型为DragItem[]，实际类型是config配置的字段映射值
const leftList = ref<any[]>([
  {
    idreset: 1,
    titlereset: 'aaaaaaaa',
    choosereset: false
  },
  {
    idreset: 2,
    titlereset: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
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

const rightList = ref<any[]>([
  {
    idreset: 16,
    titlereset: 'ceshi',
    choosereset: false
  }
]);
</script>
<style lang="scss" scoped>
.drag-list-container {
  margin: 0 auto;
  display: flex;
}
</style>
