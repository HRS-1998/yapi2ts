<template>
  <drag-header :list="filteredList" :config="mergedConfig">
    <template #panel-header>
      <slot name="panel-header"></slot>
    </template>
  </drag-header>
  <div class="left-drag">
    <search-box @search="filterFieldHandle" v-model="searchQuery"></search-box>

    <div
      class="field-list"
      @drag="handleListDrag"
      @drop="handleListDrop"
      @dragover="handleListDragOver"
      @dragleave="handleListDragLeave"
    >
      <div
        v-for="field in filteredList"
        :key="field.id"
        :draggable="isCanChoose(field)"
        class="field-list-item"
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
  <drag-bg :list="currentSelectedList" v-model="dragBgShow" ref="dragBgRef">
    <template #custom-item="{ field }">
      <slot name="custom-item" :field="field"></slot>
    </template>
  </drag-bg>
</template>

<script lang="ts" setup>
import { ref, watch } from 'vue';
import type { Placement } from 'element-plus';
import DragHeader from './components/header.vue';
import SearchBox from './components/leftsearch.vue';
import DragBg from './components/dragbg.vue';
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
const { dragPreview, createDragPreview, removeDragPreview } = useDragPreview();

const tooltipPlacement = ref<Placement>('top'); // 设置tooltip的显示位置
const dragOverItemId = ref<string | number | null>(null);
const showTopIndicator = ref(false);
const showBottomIndicator = ref(false);

const dragBgRef = ref<InstanceType<typeof DragBg> | null>(null);
const searchQuery = ref('');
const originList = ref<FieldType[]>([]); // 基于props原始数据添加selected属性
const filteredList = ref<FieldType[]>([]); // 过滤后的列表
const dragBgShow = ref<boolean>(false); // 拖拽背景显示

// 搜索过滤数据，这里如果需要搜索后清空上次选择，可以将originList先selected先设置false再过滤给filteredList
const filterFieldHandle = () => {
  filteredList.value = originList.value.filter((field) => {
    return field.title.toLowerCase().includes(searchQuery.value.trim().toLocaleLowerCase());
  });
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
// 拖拽开始
const handleDragStart = (field: FieldType, event: DragEvent) => {
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
  ); //多层嵌套时，可以在嵌套页面用@dragDrop 获取数据
  // 使用隐藏元素作为拖拽预览
  createDragPreview();
  if (dragPreview.value) {
    dataTransfer.setDragImage(dragPreview.value, 0, 0);
  }
  dataTransfer.effectAllowed = 'move';
};

const handleDragOver = (field: FieldType, event: DragEvent) => {
  event.preventDefault();
  // 内部拖拽不显示指示器，只在外部拖入时显示
  if (currentSelectedList.value.length) return;
  dragOverItemId.value = field.id;
  // 确定显示上指示器还是下指示器
  const rect = (event.target as HTMLElement).getBoundingClientRect();
  const itemHeight = rect.height;
  const offsetY = event.clientY - rect.top;
  // 如果鼠标在元素上半部分，显示上指示器；否则显示下指示器
  if (offsetY < itemHeight / 2) {
    console.log('showTopIndicator');
    showBottomIndicator.value = false;
    showTopIndicator.value = true;
  } else {
    console.log('showBottomIndicator');
    showTopIndicator.value = false;
    showBottomIndicator.value = true;
  }
};
// 拖拽结束事件
const handleDragEnd = () => {
  clearSelectedFields();
  removeDragPreview(); // 移除拖拽预览元素
  lastSelectedField.value = null; //清除最后一次选中的记录
  currentSelectedList.value = [];
  dragBgShow.value = false;
  if (dragBgRef.value) dragBgRef.value.cancelAFrame();
};

//拖拽中
const handleListDrag = (event: DragEvent) => {
  if (!dragBgRef.value) return;
  dragBgRef.value.updatePosition(event);
  if (!dragBgShow.value) dragBgShow.value = true;
};

const handleListDragOver = (event: DragEvent) => {
  event.preventDefault();
  event.dataTransfer!.dropEffect = 'move';
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
  --field-selected-bg-color: #d4edda; // 字段选中背景颜色
  --field-selected-border-color: #c3e6cb; // 字段选中边框颜色
  --field-disabled-color: #cbcbcb; // 字段禁用字体颜色
  height: 100%;
  width: 300px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  user-select: none;
  .field-list {
    height: 400px;
    overflow: hidden;
    overflow-y: auto;
    margin-right: -15px;
    padding-right: 10px;
    .field-list-item {
      position: relative;
      width: 300px;
      padding: 6px 10px;
      margin: 0 0 10px 0;
      border: 1px solid var(--field-border-color);
      border-radius: 4px;
      box-sizing: border-box;
      background-color: var(--field-bg-color);
      cursor: grab;
      &:first-child {
        margin-top: 8px;
      }
      &:hover {
        background-color: var(--field-hover-bg-color);
      }
      &.selected {
        background-color: var(--field-selected-bg-color);
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
}
</style>
