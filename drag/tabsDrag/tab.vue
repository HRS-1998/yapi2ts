<template>
  <div class="tabs-container">
    <el-scrollbar :height="'100%'" always>
      <div class="tab-list" @drag="handleDrag" @dragend="handleDragEnd">
        <div class="tab-item" v-for="element in tabs" :key="element.id">
          <span
            class="active-line-front"
            v-show="element.id === currentTabId && frontLineShow"
          ></span>
          <div
            class="tab-item-content"
            :class="{ selected: isSelected(element) }"
            draggable="true"
            @dragstart="handleDragStart(element, $event)"
            @click="toggleSelection(element, $event)"
            @dragover="handleDragOver(element, $event)"
          >
            {{ element.name }}
          </div>
          <span
            class="active-line-back"
            v-show="element.id === currentTabId && backLineShow"
          ></span>
        </div>
      </div>
    </el-scrollbar>
  </div>

  <!-- 多选拖拽背景 dragbg-->
  <div class="drag-bg" v-show="dragBgShow" ref="dragBgRef">
    <div v-for="(item, index) in selectedTabsForDrag" :key="index" class="drag-bg-item">
      {{ item.name }}
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue';
import { cloneDeep } from 'lodash-es';

interface TabType {
  id: number | string;
  name: string;
}

const tabs = defineModel<TabType[]>({
  default: () => []
});

const dragBgRef = ref<HTMLElement | null>(null);
const selectedTabIds = ref<(number | string)[]>([]);
const targetIndex = ref<number>();
const currentTabId = ref<number | string>();
const frontLineShow = ref<boolean>(false); // 当前鼠标移入元素前边线显示
const backLineShow = ref<boolean>(false); // 当前鼠标移入元素前边线显示
const dragBgShow = ref<boolean>(false); // 是否显示拖拽背景
const dragPreview = ref<HTMLDivElement | null>(null); // 拖拽默认背景元素

// 计算选中的 tabs（用于拖拽背景显示）
const selectedTabsForDrag = computed(() => {
  return tabs.value.filter((tab) => selectedTabIds.value.includes(tab.id));
});

const isSelected = (tab: TabType): boolean => {
  return selectedTabIds.value.includes(tab.id);
};

const findTabIndex = (tabList: TabType[], id: number | string) => {
  return tabList.findIndex((item) => item.id === id);
};

const toggleSelection = (tab: TabType, event: MouseEvent) => {
  const isCtrlPressed = event.ctrlKey || event.metaKey;
  if (isCtrlPressed) {
    const index = selectedTabIds.value.indexOf(tab.id);
    index === -1 ? selectedTabIds.value.push(tab.id) : selectedTabIds.value.splice(index, 1);
    return;
  }
  //取消选中
  if (selectedTabIds.value.length === 1 && selectedTabIds.value[0] === tab.id) {
    selectedTabIds.value = [];
    return;
  }
  selectedTabIds.value = [tab.id];
};

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

const handleDragStart = (tab: TabType, event: DragEvent) => {
  const dataTransfer = event.dataTransfer;
  if (!dataTransfer) return;
  createDragPreview();
  if (dragPreview.value) {
    dataTransfer.setDragImage(dragPreview.value, 0, 0);
  }
  // 如果当前拖拽的项未被选中，清空选择并只选择当前项
  if (!selectedTabIds.value.includes(tab.id)) {
    selectedTabIds.value = [tab.id];
  }
  //   dragBgShow.value = true;
  dataTransfer.effectAllowed = 'move';
};

const animationFrameId = ref<number>(0);

const cancelAFrame = () => {
  if (animationFrameId.value) {
    cancelAnimationFrame(animationFrameId.value);
    animationFrameId.value = 0;
  }
};
//更新拖拽背景位置
const handleDrag = (event: DragEvent) => {
  const clientX = event.clientX;
  const clientY = event.clientY;
  cancelAFrame();
  animationFrameId.value = requestAnimationFrame(() => {
    if (!dragBgRef.value) return;
    // 只在坐标值有效时更新位置
    if (clientX !== 0 && clientY !== 0) {
      dragBgRef.value.style.left = `${clientX - 10}px`;
      dragBgRef.value.style.top = `${clientY - 10}px`;
      if (!dragBgShow.value) dragBgShow.value = true;
    }
  });
};

// 拖拽经过更新显示分隔线
const handleDragOver = (tab: TabType, event: DragEvent) => {
  event.preventDefault();
  const target = (event.currentTarget || event.target) as HTMLElement;
  if (!target) return;
  currentTabId.value = tab.id;
  const index = findTabIndex(tabs.value, tab.id);
  const rect = target.getBoundingClientRect();
  const width = rect.width;
  const centerX = width / 2 + rect.left;
  if (event.clientX >= centerX) {
    backLineShow.value = true;
    frontLineShow.value = false;
    targetIndex.value = index + 1;
  } else {
    backLineShow.value = false;
    frontLineShow.value = true;
    targetIndex.value = index;
  }
};

const multiDrag = (data: TabType[]) => {
  const selectedTabs = data.filter((item) => {
    return selectedTabIds.value.includes(item.id);
  });

  const newTabs = selectedTabs.map((item) => {
    return {
      ...item,
      isNew: true
    };
  });

  // 先插入，多选时如果先删除会出现插入的索引是已删除的元素的位置，会找不到索引
  data.splice(targetIndex.value as number, 0, ...newTabs);

  for (let i = 0; i < selectedTabs.length; i++) {
    const tabIndex = data.findIndex((item: any) => item.id === selectedTabs[i].id && !item.isNew);
    data.splice(tabIndex, 1);
  }
  tabs.value = data.map((item) => {
    return {
      id: item.id,
      name: item.name
    };
  });
  initDragParams();
};

const handleDragEnd = () => {
  dragBgShow.value = false;
  removeDragPreview();
  const data = cloneDeep(tabs.value);
  multiDrag(data);
};

const initDragParams = () => {
  targetIndex.value = undefined;
  currentTabId.value = undefined;
  dragBgShow.value = false;
  frontLineShow.value = false;
  backLineShow.value = false;
  selectedTabIds.value = [];
};
initDragParams();
</script>

<style lang="scss" scoped>
.tabs-container {
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #f9f9f9;
  height: 300px;
  overflow: hidden;
  position: relative;
  .tab-list {
    display: flex;
    flex-wrap: wrap;
    padding: 30px 8px;
    row-gap: 12px;
    box-sizing: border-box;
    .tab-item {
      position: relative;
      height: 32px;
      .tab-item-content {
        display: inline-flex;
        align-items: center;
        padding: 4px 8px;
        margin: 0 4px;
        background: #e6f7ff;
        border: 1px solid #b3d8ff;
        border-radius: 4px;
        cursor: grab;
        transition: all 0.2s;

        &:hover {
          background: #d0eaff;
        }

        &.selected {
          background: #a0d9ff;
          border-color: #66b1ff;
        }
      }

      .active-line-back {
        position: absolute;
        right: -1px;
        top: 50%;
        transform: translateY(-50%);
        height: 50%;
        width: 2px;
        background-color: #409eff;
      }
      .active-line-front {
        position: absolute;
        left: -1px;
        top: 50%;
        transform: translateY(-50%);
        height: 50%;
        width: 2px;
        background-color: #409eff;
      }
    }
  }
}

// 多选拖拽样式
.drag-bg {
  position: fixed;
  z-index: 9999;
  pointer-events: none;
  opacity: 0.8;
  user-select: none;
  transition: opacity 0.15s ease-out;

  .drag-bg-item {
    padding: 4px 8px;
    background-color: #a0d9ff;
    border: 1px solid #66b1ff;
    border-radius: 4px;
    margin: 2px;
    font-size: 12px;
    color: #155724;
    white-space: nowrap;
  }
}
</style>
