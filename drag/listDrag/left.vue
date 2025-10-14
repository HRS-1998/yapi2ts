<template>
  <div class="drag">
    <div class="drag-header">
      <template default>
        <h4 v-if="config?.showTitle !== false">多选拖拽,外部拖入</h4>
        <h4 v-if="config?.showSummary !== false">{{ filteredList.length }} 项</h4>
      </template>
      <slot name="left-panel-header"></slot>
    </div>
    <div class="search-box" v-if="config?.showSearch !== false">
      <dart-input
        v-model="searchQuery"
        placeholder="请搜索"
        @input="filterFieldHandle"
        clearable
      ></dart-input>
    </div>

    <div
      class="field-list"
      @drag="handleListDrag"
      @drop="handleListDrop"
      @dragover="handleListDragOver"
      @dragleave="handleListDragLeave"
    >
      <el-scrollbar :height="'100%'">
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
          <div class="field-item-content">
            <template v-if="field.slot">
              <div class="field-item-slot">
                <component :is="renderVNode(field.slot)"></component>
              </div>
            </template>
            <template v-else>
              <template v-if="showTooltip">
                <el-tooltip
                  :content="field.title"
                  :placement="tooltipPlacement"
                  :effect="'dark'"
                  :popover-width="'auto'"
                >
                  <div
                    class="field-item-text"
                    @mouseenter="showTooltipHandle"
                    @mouseleave="showTooltip = false"
                  >
                    <template default>{{ field.title }}</template>
                    <slot name="left-panel-item"></slot>
                  </div> </el-tooltip
              ></template>
              <template v-else>
                <div
                  class="field-item-text"
                  @mouseenter="showTooltipHandle"
                  @mouseleave="showTooltip = false"
                >
                  <template default>{{ field.title }}</template>
                  <slot name="left-panel-item" :field="field"></slot>
                </div>
              </template>
            </template>
          </div>

          <div class="top-indicator" v-show="showTopIndicator && dragOverItemId === field.id"></div>
          <div
            class="bottom-indicator"
            v-show="showBottomIndicator && dragOverItemId === field.id"
          ></div>
        </div>
      </el-scrollbar>
    </div>
  </div>
  <div class="drag-bg" v-show="dragBgShow" ref="dragBgRef">
    <div v-for="(item, index) in currentSelectedList" :key="index">
      <template v-if="item.slot">
        <component :is="renderVNode(item.slot)"></component>
      </template>
      <template v-else>
        {{ item.title }}
      </template>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { isReactive, ref, toRaw, watch, h } from 'vue';
import { cloneDeep, debounce } from 'lodash-es';
import type { Placement } from 'element-plus';

//可能会用到的属性
interface PropsType {
  id: string | number;
  title: string;
  canChoose?: boolean;
  selected?: boolean;
  slot?: string;
}

type FieldType = Required<PropsType>;

const props = withDefaults(
  defineProps<{
    list: PropsType[];
    name?: string; // 标记当前列表名
    config?: {
      showTitle?: boolean; //显示title
      showSummary?: boolean; //显示统计
      showSearch?: boolean; //显示搜索
    };
  }>(),
  {
    list: () => [],
    name: 'leftPanel',
    config: undefined
  }
);
console.log(props, 'leftProps');
const emit = defineEmits(['outhandleDrop']); // 外部拖入
const currentSelectedList = ref<FieldType[]>([]);
const dragOverItemId = ref<string | number | null>(null);
const showTopIndicator = ref(false);
const showBottomIndicator = ref(false);

const showTooltip = ref<boolean>(false);
const tooltipPlacement = ref<Placement>('top'); // 设置tooltip的显示位置
const dragBgRef = ref<HTMLElement>();
const searchQuery = ref('');
const originList = ref<FieldType[]>([]); // 基于props原始数据添加selected属性
const filteredList = ref<FieldType[]>([]); // 过滤后的列表
const lastSelectedField = ref<string | number | null>(null); //用于记录上次选中的字段 用于shift
const dragBgShow = ref<boolean>(false); // 拖拽背景显示
const dragPreview = ref<HTMLElement | null>(null);

// 搜索过滤数据，这里如果需要搜索后清空上次选择，可以将originList先selected先设置false再过滤给filteredList
const filterFieldHandle = debounce(() => {
  filteredList.value = originList.value.filter((field) => {
    return field.title.toLowerCase().includes(searchQuery.value.toLowerCase());
  });
}, 300);

const isCanChoose = (field: FieldType) => {
  return field.canChoose === undefined ? true : field.canChoose;
};
// ctrl键
const isCtrlPressed = (event: MouseEvent | KeyboardEvent) => {
  return event.ctrlKey || event.metaKey;
};

// shift键
const isShiftPressed = (event: MouseEvent | KeyboardEvent) => {
  return event.shiftKey;
};
// 获取当前已选中的字段
const getSelectedFields = () => {
  return filteredList.value.filter((item) => {
    return item.selected === true;
  });
};
// 清空所有已选中状态
const clearSelectedFields = () => {
  filteredList.value.forEach((field) => {
    field.selected = false;
  });
};
// 获取字段索引
const getFieldIndex = (fieldId: string | number) => {
  return filteredList.value.findIndex((item: FieldType) => {
    return item.id === fieldId;
  });
};
//检查字段是否被选中
const isFieldSelected = (fieldId: string | number): boolean => {
  const fieldIndex = getFieldIndex(fieldId);
  if (fieldIndex === -1) return false;
  return filteredList.value[fieldIndex].selected;
};

// 更新最后一次选中字段
const updateLastSelectedField = (fieldId: string | number) => {
  const isSelected = isFieldSelected(fieldId);
  isSelected ? (lastSelectedField.value = fieldId) : (lastSelectedField.value = null);
};

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
// 创建一个透明元素作为拖拽预览
const createDragPreview = () => {
  dragPreview.value = document.createElement('div');
  const style = {
    width: '1px',
    height: '1px',
    opacity: '0',
    position: 'absolute',
    top: '-1000px'
  };
  Object.assign(dragPreview.value.style, style);
  document.body.appendChild(dragPreview.value);
};
const removeDragPreview = () => {
  if (dragPreview.value) {
    document.body.removeChild(dragPreview.value);
    dragPreview.value = null;
  }
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
    JSON.stringify({ list: selectedFields, dragfrom: props.name })
  ); //多层嵌套时，可以在嵌套页面用@dragDrop 获取数据
  // 使用隐藏元素作为拖拽预览
  createDragPreview();
  if (dragPreview.value) {
    dataTransfer.setDragImage(dragPreview.value, 0, 0);
  }
  dragBgShow.value = true;
  dataTransfer.effectAllowed = 'move';
};

//拖拽中
const animationFrameId = ref<number>(0);
const cancelAFrame = () => {
  if (animationFrameId.value) {
    cancelAnimationFrame(animationFrameId.value);
    animationFrameId.value = 0;
  }
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
  cancelAFrame();
};

const handleListDrag = (event: DragEvent) => {
  const clientX = event.clientX;
  const clientY = event.clientY;
  cancelAFrame();
  animationFrameId.value = requestAnimationFrame(() => {
    if (!dragBgRef.value) return;
    if (clientX !== 0 && clientY !== 0) {
      dragBgRef.value.style.left = `${clientX - 10}px`;
      dragBgRef.value.style.top = `${clientY - 10}px`;
    }
  });
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
  if (data.dragfrom !== props.name) {
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

// title文字超出提示
const showTooltipHandle = (e: MouseEvent) => {
  const target = e.target as HTMLElement;
  if (target && target.scrollWidth > target.clientWidth) {
    showTooltip.value = true;
  }
};
const bigObjDeepClone = (data: any) => {
  if (!data) return data;
  if (!structuredClone) {
    return cloneDeep(data);
  }
  try {
    const rawData = isReactive(data) ? toRaw(data) : data;
    return structuredClone(rawData);
  } catch (error) {
    return cloneDeep(data);
  }
};

// 渲染VNode
const renderVNode = (slotContent: any) => {
  if (!slotContent) return null;

  // 如果是函数，调用它获取VNode
  if (typeof slotContent === 'function') {
    return slotContent();
  }

  // 如果已经是VNode，直接返回
  if (typeof slotContent === 'object' && slotContent.type !== undefined) {
    return { render: () => slotContent };
  }

  // 如果是字符串，创建文本节点
  if (typeof slotContent === 'string') {
    return { render: () => h('span', {}, slotContent) };
  }

  return null;
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
.drag {
  height: 100%;
  width: 300px;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  user-select: none;
  .drag-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 20px;
    color: #333;
  }
  .search-box {
    margin-bottom: 20px;
  }

  .field-list {
    height: 400px;
    .field-item {
      position: relative;
      padding: 6px 10px;
      margin: 0 12px 10px 0; // margin-right用于间隔滚动条
      border: 1px solid #ddd;
      border-radius: 4px;
      box-sizing: border-box;
      background-color: white;
      cursor: grab;
      &:first-child {
        margin-top: 8px;
      }
      &:hover {
        background-color: #f9f9f9;
      }
      &.selected {
        background-color: #d4edda;
        border-color: #c3e6cb;
      }
      &.is-disabled {
        color: #cbcbcb;
        // background-color: #eef2f7;
        cursor: not-allowed;
      }
      .field-item-content {
        display: flex;
        .field-item-text {
          flex-grow: 1;
          width: 200px;
          display: block;
          text-align: left;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      }
      .top-indicator {
        position: absolute;
        top: -6px;
        left: 0;
        width: 100%;
        height: 2px;
        background: skyblue;
      }
      .bottom-indicator {
        position: absolute;
        bottom: -6px;
        left: 0;
        width: 100%;
        height: 2px;
        background: skyblue;
      }
    }
  }
}
.drag-bg {
  position: fixed;
  z-index: 9999;
  transform: translate(0, 0);
  pointer-events: none; // 不影响点击
  opacity: 0.8;
  user-select: none;
  div {
    padding: 8px 12px;
    background-color: #d4edda;
    border: 1px solid #c3e6cb;
    border-radius: 4px;
    margin: 2px;
    font-size: 12px;
    color: #155724;
  }
}
</style>
