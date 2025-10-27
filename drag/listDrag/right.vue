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
    <el-divider class="divider" />

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
import { ref, computed, useSlots } from 'vue';
import type { Placement } from 'element-plus';
import { Search } from '@element-plus/icons-vue';
import type { ListItem, PanelConfig } from './types/index';
import { bigObjDeepClone } from './utils/index';
import { useMergeConfig } from './hooks/useMergeConfig';
import DragHeader from './components/header.vue';
import ListContent from './components/listcontent.vue';
import { useDragPreview } from './hooks/useDragPreview';

const props = defineProps<{
  config?: PanelConfig;
  propsMap?: Record<string, string>;
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
const { dragPreview, createDragPreview, waitForImagesAndReturnPreview } = useDragPreview();

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

const { valueKey = 'id', labelKey = 'title', canChooseKey = 'canChoose' } = props.propsMap || {};

const getRawData = (field: ListItem) => {
  return {
    [valueKey]: field.id,
    [labelKey]: field.title,
    [canChooseKey]: field.canChoose
  };
};
// 不区分大小写的搜索过滤
const filteredList = computed(() => {
  if (!searchKeyword.value.trim()) {
    return list.value;
  }
  const keyword = searchKeyword.value.toLowerCase();
  return list.value.filter((item) => {
    if (mergedConfig.value.searchFn && typeof mergedConfig.value.searchFn === 'function') {
      // 如果配置了自定义搜索函数，则优先使用
      const result = mergedConfig.value.searchFn(keyword, getRawData(item));
      return result;
    }
    return item.title!.toLowerCase().includes(keyword);
  });
});

// 判断是否可拖拽
const isItemDraggable = (item: ListItem): boolean => {
  return item.canChoose !== undefined ? item.canChoose : true;
};

const slots = useSlots();
// 行维度拖拽开始
const handleDragStart = async (item: ListItem, index: number, event: DragEvent) => {
  if (!isItemDraggable(item)) {
    event.preventDefault();
    return;
  }
  const dataTransfer = event.dataTransfer;
  if (!dataTransfer) return;
  dragItem.value = { item, index };
  dataTransfer.setData(
    'text/plain',
    JSON.stringify({ list: [item], dragfrom: mergedConfig.value.name })
  ); //多层嵌套时，可以在嵌套页面用@dragDrop 获取数据
  // 创建包含完整 slot 内容的拖拽预览
  createDragPreview([item], (props) => {
    // 传递父组件的 custom-item slot
    return slots['custom-item'] ? slots['custom-item'](props) : props.field.title;
  });

  // 等待图片加载完成后再设置拖拽图像
  if (dragPreview.value) {
    try {
      // 等待图片加载完成
      const previewElement = await waitForImagesAndReturnPreview();
      if (previewElement && dataTransfer) {
        dataTransfer.setDragImage(previewElement, 0, 0);
      }
    } catch (error) {
      // 如果等待出错，直接使用当前预览元素
      if (dragPreview.value && dataTransfer) {
        dataTransfer.setDragImage(dragPreview.value, 0, 0);
      }
    }
  }
  dataTransfer.effectAllowed = 'move';
};

// 拖拽经过容器
const handleListDragOver = (event: DragEvent) => {
  event.preventDefault();
  event.dataTransfer!.dropEffect = 'move';
  //这里判下，如果当前鼠标在拖拽框内，如果在第一个元素上方，显示第一个元素的上指示器，如果在最后一个元素下方，显示最后一个元素的下指示器
  // 同时更新指示器位置
  const container = (event.target as HTMLElement).closest('.field-list');
  if (!container) return;

  const items = container.querySelectorAll('.field-item');
  if (items.length === 0) {
    // 当列表为空时，重置状态
    dragOverIndex.value = null;
    dragTargetIndex.value = null;
    showTopIndicator.value = false;
    showBottomIndicator.value = false;
    return;
  }

  const firstItem = items[0];
  const lastItem = items[items.length - 1];

  const firstRect = firstItem.getBoundingClientRect();
  const lastRect = lastItem.getBoundingClientRect();

  // 如果鼠标在容器顶部区域（第一个元素上方）
  if (event.clientY <= firstRect.top) {
    dragOverIndex.value = 0;
    dragTargetIndex.value = 0;
    showTopIndicator.value = true;
    showBottomIndicator.value = false;
    return;
  }

  // 如果鼠标在容器底部区域（最后一个元素下方）
  if (event.clientY >= lastRect.bottom) {
    dragOverIndex.value = list.value.length - 1;
    dragTargetIndex.value = list.value.length - 1;
    showTopIndicator.value = false;
    showBottomIndicator.value = true;
    return;
  }

  // 如果在中间区域，计算应该显示哪个元素的指示器
  const mouseY = event.clientY;

  // 查找鼠标悬停的元素
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const rect = item.getBoundingClientRect();

    if (mouseY >= rect.top && mouseY <= rect.bottom) {
      dragOverIndex.value = i;
      dragTargetIndex.value = i;

      // 计算在元素中的相对位置
      const itemHeight = rect.height;
      const offsetY = mouseY - rect.top;

      // 如果鼠标在元素上半部分，显示上指示器；否则显示下指示器
      if (offsetY < itemHeight / 2) {
        showBottomIndicator.value = false;
        showTopIndicator.value = true;
      } else {
        showTopIndicator.value = false;
        showBottomIndicator.value = true;
      }
      return;
    }
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
    if (toIndex === null) {
      return;
    }
    if (showBottomIndicator.value) {
      toIndex += 1;
    }
    emit('outhandleDrop', { list: dragInData, index: toIndex });
  }
  // 内部排序
  if (
    name === mergedConfig.value.name &&
    dragItem.value !== null &&
    dragTargetIndex.value !== null
  ) {
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
  --field-color: #333; // 字段字体颜色
  --field-border-color: #ddd; // 字段边框颜色
  --field-bg-color: #fff; // 字段背景色
  --field-hover-bg-color: #409eff; // 字段hover背景颜色
  --field-hover-color: #409eff; // 字段hover背景颜色
  --field-hover-border-color: #409eff; // 字段hover边框颜色
  --field-disabled-color: #cbcbcb; // 字段禁用字体颜色
  height: 100%;
  width: 324px;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
  user-select: none;
  .search-box {
    width: 300px;
    margin: 0 auto 12px;
  }
  .divider {
    margin: 0;
    opacity: 0.5;
  }
  .field-list {
    height: 400px;
    width: 321px;
    overflow: hidden;
    overflow-y: auto;
    margin-bottom: 12px;
    padding: 12px;
    .field-item {
      position: relative;
      width: 300px;
      padding: 6px 10px;
      margin: 0 auto 10px;
      border: 1px solid var(--field-border-color);
      border-radius: 4px;
      box-sizing: border-box;
      background: var(--field-bg-color);
      color: var(--field-color);
      cursor: grab;
      &:hover {
        color: vaar(--field-hover-color);
        border-color: var(--field-hover-border-color);
      }

      &[draggable='false'] {
        opacity: 0.6;
        cursor: not-allowed;
        &:hover {
          background: #f5f5f5;
          color: var(--field-color);
          border-color: var(--field-border-color);
        }
      }

      &.dragging {
        opacity: 1;
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
