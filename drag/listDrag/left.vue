<template>
  <drag-header :list="filteredList" :config="mergedConfig">
    <template #panel-header>
      <slot name="panel-header"></slot>
    </template>
  </drag-header>
  <div class="left-drag">
    <search-box @search="filterFieldHandle" v-model="searchQuery"></search-box>
    <el-divider class="divider" />

    <div
      class="field-list"
      @drop="handleListDrop"
      @dragover="handleListDragOver"
      @dragleave="handleListDragLeave"
    >
      <div
        v-for="field in filteredList"
        :key="field.id"
        :draggable="isCanChoose(field)"
        class="field-item"
        @dragstart="handleDragStart(field, $event)"
        @dragend="handleDragEnd"
        @dragenter="handleDragEnter($event)"
        @dragover="handleDragOver(field, $event)"
        @click="toggleSelection(field, $event)"
        :class="{
          selected: isFieldSelected(field.id),
          'is-disabled': !isCanChoose(field)
        }"
      >
        <listcontent :field="field" :placement="tooltipPlacement">
          <template #custom-item="{ field }">
            <slot name="custom-item" :field="field">{{ field.title }}</slot>
          </template>
        </listcontent>

        <div class="top-indicator" v-show="showTopIndicator && dragOverItemId === field.id"></div>
        <div
          class="bottom-indicator"
          v-show="showBottomIndicator && dragOverItemId === field.id"
        ></div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, useSlots, watch } from 'vue';
import type { Placement } from 'element-plus';
import DragHeader from './components/header.vue';
import SearchBox from './components/leftsearch.vue';
import listcontent from './components/listcontent.vue';
import { useMergeConfig } from './hooks/useMergeConfig';
import { useDragPreview } from './hooks/useDragPreview';
import { useFieldSelection } from './hooks/useFieldSelection';
import { bigObjDeepClone, isCtrlPressed, isShiftPressed } from './utils/index';
import type { ListItem, PanelConfig } from './types/index';

type FieldType = Required<ListItem>;

const props = defineProps<{
  list: ListItem[];
  config?: PanelConfig;
  propsMap?: Record<string, string>;
}>();

const defaultConfig: Omit<PanelConfig, 'showLeftIcon' | 'showRightIcon'> = {
  name: 'leftPanel',
  dragOrigin: 'rightPanel',
  showTitle: true,
  title: '左侧列表-多选拖拽,外部拖入',
  showSummary: true,
  showSearch: true
};

const emit = defineEmits(['outhandleDrop']); // 外部拖入
// 合并配置
const { mergedConfig } = useMergeConfig(props.config, defaultConfig);
// 遮盖拖拽预览
const { dragPreview, createDragPreview, removeDragPreview, waitForImagesAndReturnPreview } =
  useDragPreview();

const tooltipPlacement = ref<Placement>('top'); // 设置tooltip的显示位置
const dragOverItemId = ref<string | number | null>(null);
const showTopIndicator = ref(false);
const showBottomIndicator = ref(false);

const searchQuery = ref('');
const originList = ref<FieldType[]>([]); // 基于props原始数据添加selected属性
const filteredList = ref<FieldType[]>([]); // 过滤后的列表

const { valueKey = 'id', labelKey = 'title', canChooseKey = 'canChoose' } = props.propsMap || {};

const getRawData = (field: FieldType) => {
  return {
    [valueKey]: field.id,
    [labelKey]: field.title,
    [canChooseKey]: field.canChoose
  };
};

// 搜索过滤数据，这里如果需要搜索后清空上次选择，可以将originList先selected先设置false再过滤给filteredList
const filterFieldHandle = () => {
  // 默认搜索逻辑：根据标题过滤
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.trim().toLowerCase();
    filteredList.value = originList.value.filter((field) => {
      if (mergedConfig.value.searchFn && typeof mergedConfig.value.searchFn === 'function') {
        // 如果配置了自定义搜索函数，则优先使用
        const result = mergedConfig.value.searchFn(query, getRawData(field));
        return result;
      }
      return field.title.toLowerCase().includes(query);
    });
    console.log('过滤后的数据', filteredList.value);
  } else {
    // 如果搜索关键词为空，则显示全部数据
    filteredList.value = [...originList.value];
  }
};

const isCanChoose = (field: FieldType) => {
  return field.canChoose === undefined ? true : field.canChoose;
};

// 字段选中相关判断
const {
  currentSelectedList,
  lastSelectedField, //用于记录上次选中的字段 用于shift
  isFieldSelected,
  getSelectedFields,
  clearSelectedFields,
  getFieldIndex,
  updateLastSelectedField
} = useFieldSelection(filteredList);

// 切换字段选择状态
const toggleSelection = (field: FieldType, event: MouseEvent | KeyboardEvent) => {
  if (!isCanChoose(field)) return;
  const fieldIndex = getFieldIndex(field.id);
  const isCtrl = isCtrlPressed(event);
  const isShift = isShiftPressed(event);
  //ctrl 多选
  if (isCtrl) {
    filteredList.value[fieldIndex].selected = !filteredList.value[fieldIndex].selected;
    updateLastSelectedField(field.id);
    return;
  }

  // shift 范围选择
  if (isShift) {
    if (!lastSelectedField.value) {
      filteredList.value[fieldIndex].selected = true; // 如果没有上次选中项，则直接选中当前项
      updateLastSelectedField(field.id);
      return;
    }
    // 获取字段列表的索引
    const startIndex = getFieldIndex(lastSelectedField.value);
    const endIndex = fieldIndex;
    const minIndex = Math.min(startIndex, endIndex);
    const maxIndex = Math.max(startIndex, endIndex);
    for (let i = minIndex; i <= maxIndex; i++) {
      if (isCanChoose(filteredList.value[i])) filteredList.value[i].selected = true;
    }
    return;
  }
  // 单击：单选
  if (isFieldSelected(field.id)) {
    filteredList.value[fieldIndex].selected = false;
    return;
  }
  clearSelectedFields();
  filteredList.value[fieldIndex].selected = true;
  updateLastSelectedField(field.id);
};

const handleDragEnter = (event: DragEvent) => {
  event.preventDefault();
};

const slots = useSlots();
// 拖拽开始
const handleDragStart = async (field: FieldType, event: DragEvent) => {
  const dataTransfer = event.dataTransfer;
  if (!dataTransfer) return;
  let selectedFields = getSelectedFields();

  //未选中任何元素或已选中元素，但拖拽的时其他元素
  if (selectedFields.length === 0 || !selectedFields.some((f) => f.id === field.id)) {
    clearSelectedFields();
    const fieldIndex = getFieldIndex(field.id);
    if (fieldIndex !== -1) {
      filteredList.value[fieldIndex].selected = true;
      selectedFields = [filteredList.value[fieldIndex]];
    }
  }
  currentSelectedList.value = selectedFields;
  dataTransfer.setData(
    'text/plain',
    JSON.stringify({ list: selectedFields, dragfrom: mergedConfig.value.name })
  );
  // 创建包含完整 slot 内容的拖拽预览
  createDragPreview(selectedFields, (props) => {
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

const handleDragOver = (field: FieldType, event: DragEvent) => {
  //   event.preventDefault();
  //   // 内部拖拽不显示指示器，只在外部拖入时显示
  //   if (currentSelectedList.value.length) return;
  //   dragOverItemId.value = field.id;
  //   // 确定显示上指示器还是下指示器
  //   const rect = (event.target as HTMLElement).getBoundingClientRect();
  //   const itemHeight = rect.height;
  //   const offsetY = event.clientY - rect.top;
  //   // 如果鼠标在元素上半部分，显示上指示器；否则显示下指示器
  //   if (offsetY < itemHeight / 2) {
  //     console.log('showTopIndicator');
  //     showBottomIndicator.value = false;
  //     showTopIndicator.value = true;
  //   } else {
  //     console.log('showBottomIndicator');
  //     showTopIndicator.value = false;
  //     showBottomIndicator.value = true;
  //   }
};
// 拖拽结束事件
const handleDragEnd = () => {
  clearSelectedFields();
  if (dragPreview.value) removeDragPreview(); // 移除拖拽预览元素
  lastSelectedField.value = null; //清除最后一次选中的记录
  currentSelectedList.value = [];
};

const handleListDragOver = (event: DragEvent) => {
  event.preventDefault();
  event.dataTransfer!.dropEffect = 'move';
  const container = (event.target as HTMLElement).closest('.field-list');
  if (!container) return;

  const items = container.querySelectorAll('.field-item');
  if (items.length === 0) {
    // 当列表为空时，重置状态
    dragOverItemId.value = null;
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
    dragOverItemId.value = filteredList.value[0].id;
    showTopIndicator.value = true;
    showBottomIndicator.value = false;
    return;
  }

  // 如果鼠标在容器底部区域（最后一个元素下方）
  if (event.clientY >= lastRect.bottom) {
    dragOverItemId.value = filteredList.value[filteredList.value.length - 1].id;
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
      dragOverItemId.value = filteredList.value[i].id;
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

const handleListDragLeave = (event: DragEvent) => {
  event.preventDefault();
  // 隐藏指示器
  dragOverItemId.value = null;
  showTopIndicator.value = false;
  showBottomIndicator.value = false;
};
// 放置事件
const handleListDrop = (event: DragEvent) => {
  event.preventDefault();

  const dataTransfer = event.dataTransfer;
  if (!dataTransfer) return;
  const result = dataTransfer.getData('text/plain');
  if (!result) return;
  const data = JSON.parse(result);
  if (!data || !data.list || data.list.length === 0) return;

  // 只有外部拖入
  if (data.dragfrom !== mergedConfig.value.name) {
    let toIndex = getFieldIndex(dragOverItemId.value!);
    console.log(toIndex, '目标索引', dragOverItemId.value);
    if (props.list.length === 0) toIndex = 0;
    if (showBottomIndicator.value) {
      toIndex += 1;
    }
    emit('outhandleDrop', { list: data.list, index: toIndex });
  }
  // 隐藏指示器
  dragOverItemId.value = null;
  showTopIndicator.value = false;
  showBottomIndicator.value = false;
};

watch(
  () => props.list,
  (newVal) => {
    originList.value = bigObjDeepClone(newVal);
    originList.value.forEach((item) => {
      item.selected = false;
    });
    filterFieldHandle();
  },
  {
    immediate: true,
    deep: true
  }
);
</script>

<style scoped lang="scss">
.left-drag {
  --indicator-bg-color: skyblue; // 指示器背景颜色
  --field-border-color: #ddd; // 字段边框颜色
  --field-bg-color: #fff; // 字段背景色
  --field-hover-bg-color: #f9f9f9; // 字段hover背景颜色
  --field-selected-color: #409eff; // 字段选中背景颜色
  --field-selected-border-color: #409eff; // 字段选中边框颜色
  --field-color: #333;
  --field-disabled-color: #cbcbcb; // 字段禁用字体颜色
  height: 100%;
  width: 324px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  user-select: none;
  .field-list {
    height: 400px;
    width: 321px;
    overflow: hidden;
    overflow-y: auto;
    padding: 12px;
    box-sizing: border-box;
    margin-bottom: 12px;
    .field-item {
      position: relative;
      width: 300px;
      padding: 6px 12px;
      margin: 0 auto 10px;
      border: 1px solid var(--field-border-color);
      border-radius: 4px;
      box-sizing: border-box;
      background-color: var(--field-bg-color);
      cursor: grab;
      color: var(--field-color);
      &:hover {
        background-color: var(--field-hover-bg-color);
      }
      &.selected {
        color: var(--field-selected-color);
        border-color: var(--field-selected-border-color);
      }
      &.is-disabled {
        color: var(--field-disabled-color);
        cursor: not-allowed;
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
  .divider {
    margin: 0;
    opacity: 0.4;
  }
}
</style>
