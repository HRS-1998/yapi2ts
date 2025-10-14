<template>
  <div class="drag">
    <div class="drag-header">
      <h4>内部拖拽排序，外部拖拽插入</h4>
      <h4>{{ filteredList.length }} 项</h4>
    </div>
    <div class="search-box">
      <dart-input v-model="searchKeyword" placeholder="请搜索" clearable />
    </div>

    <div
      class="drag-list"
      @dragover="handleListDragOver"
      @drop="handleListDrop($event)"
      @dragleave="handleListDragLeave"
    >
      <el-scrollbar :height="'100%'">
        <div
          v-for="(item, index) in filteredList"
          :key="item.id"
          class="drag-item"
          :class="{ dragging: dragItem?.item.id === item.id }"
          :draggable="isItemDraggable(item)"
          @dragstart="handleDragStart(item, index, $event)"
          @dragover="handleDragOver(index, $event)"
          @dragenter="handleDragEnter(index, $event)"
          @dragend="handleDragEnd"
        >
          <div class="top-indicator" v-show="showTopIndicator && dragOverIndex === index"></div>
          <div class="drag-item-content">
            <div
              class="drag-handle"
              :style="{ cursor: isItemDraggable(item) ? 'move' : 'not-allowed' }"
            >
              ≡
            </div>
            <template v-if="item.slot">
              <div class="drag-item-slot">
                <component :is="renderVNode(item.slot)"></component>
              </div>
            </template>
            <template v-else>
              <el-tooltip
                :content="item.title"
                :placement="tooltipPlacement"
                :effect="'dark'"
                :popover-width="'auto'"
                v-if="showTooltip"
              >
                <div
                  class="drag-item-text"
                  @mouseenter="showTooltipHandle"
                  @mouseleave="showTooltip = false"
                >
                  {{ item.title }}
                </div>
              </el-tooltip>
              <div
                v-else
                class="drag-item-text"
                @mouseenter="showTooltipHandle"
                @mouseleave="showTooltip = false"
              >
                {{ item.title }}
              </div>
            </template>

            <div class="remove-btn" @click.stop="remove(item)">×</div>
          </div>

          <div
            class="bottom-indicator"
            v-show="showBottomIndicator && dragOverIndex === index"
          ></div>
        </div>
      </el-scrollbar>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { ref, computed, toRaw, isReactive, h } from 'vue';
import { cloneDeep } from 'lodash-es';
import type { Placement } from 'element-plus';
interface PropsTypeItem {
  id: string | number;
  title: string;
  canChoose?: boolean;
  slot?: any; //自定义的title
}

const props = withDefaults(
  defineProps<{
    name?: string;
    config?: Object;
  }>(),
  {
    name: 'rightPanel',
    config: undefined
  }
);
const emit = defineEmits(['remove', 'outhandleDrop']);
const list = defineModel<PropsTypeItem[]>({
  default: () => []
});
const showTooltip = ref<boolean>(false);
const tooltipPlacement = ref<Placement>('top'); // 设置tooltip的显示位置
const searchKeyword = ref<string>('');
// 拖拽排序相关状态
const dragItem = ref<{ item: PropsTypeItem; index: number } | null>(null);
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
const isItemDraggable = (item: PropsTypeItem): boolean => {
  return item.canChoose !== undefined ? item.canChoose : true;
};

// 行维度拖拽开始
const handleDragStart = (item: PropsTypeItem, index: number, event: DragEvent) => {
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
  //   }
};

// 行维度项拖拽进入
const handleDragEnter = (index: number, event: DragEvent) => {
  event.preventDefault();
};

// 行维度拖拽结束
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

const showTooltipHandle = (e: MouseEvent) => {
  const target = e.target as HTMLElement;
  if (target && target.scrollWidth > target.clientWidth) {
    showTooltip.value = true;
  }
};

// 数据克隆
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

// 移除维度
const remove = (field: PropsTypeItem) => {
  list.value = list.value.filter((item) => item.id !== field.id);
  emit('remove', field);
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
</script>
<style lang="scss" scoped>
.drag {
  height: 100%;
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
  .drag-list {
    height: 400px;
    .drag-item {
      position: relative;
      align-items: center;
      padding: 6px 10px;
      margin: 0 12px 10px 0; // margin-right用于间隔滚动条
      border: 1px solid #ddd;
      border-radius: 4px;
      box-sizing: border-box;
      background: #f5f5f5;
      cursor: grab;
      &:first-child {
        margin-top: 8px;
      }
      &:hover {
        background: #e6f7ff;
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
      .drag-item-content {
        display: flex;
        justify-content: space-between;
        .drag-handle {
          margin-right: 8px;
          cursor: move;
          color: #999;
          font-size: 16px;
          line-height: 1;
        }
        .drag-item-text {
          flex: 1;
          width: 200px;
          display: block;
          text-align: left;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .remove-btn {
          margin-left: auto;
          color: #dc3545;
          cursor: pointer;
          font-weight: bold;
          padding: 0 4px;
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
  .drag-area {
    border: 2px dashed #ccc;
    border-radius: 4px;
    padding: 16px;
    text-align: center;
    margin: 8px 0;
    min-height: 60px;
    cursor: grab;
    .placeholder {
      color: #999;
      font-size: 14px;
    }
  }
}
</style>
