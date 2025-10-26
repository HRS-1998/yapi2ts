<template>
  <div class="right-drag">
    <drag-header :list="filteredList" :config="mergedConfig">
      <template #panel-header>
        <slot name="panel-header"></slot>
      </template>
    </drag-header>
    <div class="search-box">
      <dart-input
        v-model="searchKeyword"
        placeholder="请搜索"
        :prefix-icon="Search"
        size="default"
        clearable
      />
    </div>
    <div
      class="field-list"
      @dragover="handleListDragOver"
      @drop="handleListDrop($event)"
      @dragleave="handleListDragLeave"
    >
      <div
        v-for="(item, index) in filteredList"
        :key="item.id"
        :class="['field-item', { dragging: dragItem?.item.id === item.id }]"
        :draggable="isItemDraggable(item)"
        @dragstart="handleDragStart(item, index, $event)"
        @dragover="handleDragOver(index, $event)"
        @dragenter="handleDragEnter(index, $event)"
        @dragend="handleDragEnd"
      >
        <div class="top-indicator" v-show="showTopIndicator && dragOverIndex === index"></div>
        <div class="field-item-container">
          <div
            :class="['drag-handle', { 'not-draggable': !isItemDraggable(item) }]"
            v-if="mergedConfig?.showLeftIcon"
          >
            ≡
          </div>
          <list-content :field="item" :placement="tooltipPlacement">
            <template #custom-item="{ field }">
              <slot name="custom-item" :field="field">{{ field.title }}</slot>
            </template>
          </list-content>
          <div class="remove-btn" @click.stop="remove(item)" v-if="mergedConfig?.showRightIcon">
            ×
          </div>
        </div>

        <div class="bottom-indicator" v-show="showBottomIndicator && dragOverIndex === index"></div>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { ref, computed } from 'vue';
import type { Placement } from 'element-plus';
import { Search } from '@element-plus/icons-vue';
import type { ListItem, PanelConfig } from './types/index';
import { bigObjDeepClone } from './utils/index';
import { useMergeConfig } from './hooks/useMergeConfig';
import DragHeader from './components/header.vue';
import ListContent from './components/listcontent.vue';

const props = defineProps<{
  name?: string;
  config?: PanelConfig;
}>();

const defaultConfig: PanelConfig = {
  name: 'rightPanel',
  dragOrigin: 'leftPanel',
  showTitle: true,
  title: '右侧列表-内部拖拽,外部拖入',
  showSummary: true,
  showSearch: true,
  showLeftIcon: true,
  showRightIcon: true
};

const { mergedConfig } = useMergeConfig(props.config, defaultConfig);

const emit = defineEmits(['remove', 'outhandleDrop']);
const list = defineModel<ListItem[]>({
  default: () => []
});
const tooltipPlacement = ref<Placement>('top'); // 设置tooltip的显示位置
const searchKeyword = ref<string>('');
// 拖拽排序相关状态
const dragItem = ref<{ item: ListItem; index: number } | null>(null);
const dragOverIndex = ref<number | null>(null);
const dragTargetIndex = ref<number | null>(null);
const showTopIndicator = ref(false);
const showBottomIndicator = ref(false);

// 不区分大小写的搜索过滤
const filteredList = computed(() => {
  if (!searchKeyword.value.trim()) {
    return list.value;
  }
  const keyword = searchKeyword.value.toLowerCase();
  return list.value.filter((item) => item.title.toLowerCase().includes(keyword));
});

// 判断是否可拖拽
const isItemDraggable = (item: ListItem): boolean => {
  return item.canChoose !== undefined ? item.canChoose : true;
};

// 行维度拖拽开始
const handleDragStart = (item: ListItem, index: number, event: DragEvent) => {
  if (!isItemDraggable(item)) {
    event.preventDefault();
    return;
  }
  const dataTransfer = event.dataTransfer;
  if (!dataTransfer) return;
  dragItem.value = { item, index };
  console.log(dragItem.value, 'dragItem.value');
  dataTransfer.setData('text/plain', JSON.stringify({ list: [item], dragfrom: props.name })); //多层嵌套时，可以在嵌套页面用@dragDrop 获取数据
  dataTransfer.effectAllowed = 'move';
};

// 行维度拖拽经过容器
const handleListDragOver = (event: DragEvent) => {
  event.preventDefault();
  event.dataTransfer!.dropEffect = 'move';
};

// 行维度项拖拽经过
const handleDragOver = (index: number, event: DragEvent) => {
  event.preventDefault();
  //   if (dragItem.value && dragItem.value.index !== index) {
  dragOverIndex.value = index;
  dragTargetIndex.value = index;
  // 确定显示上指示器还是下指示器
  const rect = (event.target as HTMLElement).getBoundingClientRect();
  const itemHeight = rect.height;
  const offsetY = event.clientY - rect.top;
  // 如果鼠标在元素上半部分，显示上指示器；否则显示下指示器
  if (offsetY < itemHeight / 2) {
    showBottomIndicator.value = false;
    showTopIndicator.value = true;
  } else {
    showTopIndicator.value = false;
    showBottomIndicator.value = true;
  }
};

// 拖拽进入
const handleDragEnter = (index: number, event: DragEvent) => {
  event.preventDefault();
};

// 拖拽结束
const handleDragEnd = () => {
  console.log('handleDragEnd');
  dragItem.value = null;
  dragOverIndex.value = null;
  dragTargetIndex.value = null;
  // 隐藏所有指示器
  showTopIndicator.value = false;
  showBottomIndicator.value = false;
};

// 行维度放置处理
const handleListDrop = (event: DragEvent) => {
  event.preventDefault();
  const data = event.dataTransfer?.getData('text/plain') || '';
  const name = JSON.parse(data).dragfrom;
  if (!data || !name) return;
  // 外部拖入
  console.log(name, dragItem.value);
  if (dragItem.value === null) {
    const dragInData = JSON.parse(data).list || [];
    if (dragInData.length === 0) return;
    let toIndex = dragTargetIndex.value;
    // 当为空时，将外部拖入添加到第一个
    if (list.value.length === 0) {
      toIndex = 0;
    }
    if (toIndex === null) return;
    if (showBottomIndicator.value) {
      toIndex += 1;
    }
    emit('outhandleDrop', { list: dragInData, index: toIndex });
  }
  // 内部排序
  if (name === props.name && dragItem.value !== null && dragTargetIndex.value !== null) {
    const fromIndex = dragItem.value.index;
    let toIndex = dragTargetIndex.value;
    // 根据指示器类型调整目标索引
    if (showBottomIndicator.value) {
      toIndex += 1;
    }
    if (fromIndex !== toIndex) {
      // 重新排列数组
      const newList = bigObjDeepClone(list.value);
      const [movedItem] = newList.splice(fromIndex, 1);
      // 调整插入位置
      const adjustedToIndex = toIndex > fromIndex ? toIndex - 1 : toIndex;
      newList.splice(adjustedToIndex, 0, movedItem);
      list.value = newList;
    }
  }

  handleDragEnd();
};
// 行维度项拖拽离开
const handleListDragLeave = () => {
  console.log('handleListDragLeave');
  dragOverIndex.value = null;
  dragTargetIndex.value = null;
  // 隐藏所有指示器
  showTopIndicator.value = false;
  showBottomIndicator.value = false;
};

// 移除维度
const remove = (field: ListItem) => {
  list.value = list.value.filter((item) => item.id !== field.id);
  emit('remove', field);
};
</script>
<style lang="scss" scoped>
.right-drag {
  --indicator-bg-color: skyblue; // 指示器背景颜色
  --field-border-color: #ddd; // 字段边框颜色
  --field-bg-color: #fff; // 字段背景色
  --field-hover-bg-color: #f9f9f9; // 字段hover背景颜色
  --field-disabled-color: #cbcbcb; // 字段禁用字体颜色
  height: 100%;
  width: 100%;
  //   width: 300px;
  //   margin: 0 auto;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
  user-select: none;
  .search-box {
    width: 300px;
    margin-bottom: 16px;
  }
  .field-list {
    height: 400px;
    margin-right: -15px;
    padding-right: 10px;
    overflow: hidden;
    overflow-y: auto;
    .field-item {
      position: relative;
      width: 300px;
      padding: 6px 10px;
      margin: 0 0 10px 0;
      border: 1px solid var(--field-border-color);
      border-radius: 4px;
      box-sizing: border-box;
      background: var(--field-bg-color);
      cursor: grab;
      &:first-child {
        margin-top: 8px;
      }
      &:hover {
        background: var(--field-hover-bg-color);
      }

      &[draggable='false'] {
        opacity: 0.6;
        cursor: not-allowed;
        &:hover {
          background: #f5f5f5;
        }
      }

      &.dragging {
        opacity: 0.5;
      }
      .field-item-container {
        display: flex;
        justify-content: space-between;
        .drag-handle {
          display: flex;
          align-items: center;
          margin-right: 8px;
          cursor: move;
          color: #999;
          font-size: 16px;
          line-height: 1;
        }
        .not-draggable {
          cursor: not-allowed;
        }
        .remove-btn {
          display: flex;
          align-items: center;
          margin-left: auto;
          color: #dc3545;
          cursor: pointer;
          font-weight: bold;
          padding: 0 4px;
          box-sizing: border-box;
        }
      }

      .top-indicator {
        position: absolute;
        top: -7px;
        left: 0;
        width: 100%;
        height: 2px;
        background: var(--indicator-bg-color);
      }
      .bottom-indicator {
        position: absolute;
        bottom: -7px;
        left: 0;
        width: 100%;
        height: 2px;
        background: var(--indicator-bg-color);
      }
    }
    &::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }

    &::-webkit-scrollbar-thumb {
      min-width: 24px;
      min-height: 24px;
      background-color: #e1e5ed;
      border-radius: 4px;
    }
    &::-webkit-scrollbar-track {
      background-color: #fff3;
    }
  }
}
</style>
