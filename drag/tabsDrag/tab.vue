<template>
  <div class="tags-container">
    <el-scrollbar :height="'100%'" always>
      <div class="tag-list" @drag="handleDrag" @dragend="handleDragEnd">
        <div class="tag-item" v-for="element in tags" :key="element.id">
          <span
            class="active-line-front"
            v-show="element.id === currentTabId && frontLineShow"
          ></span>

          <el-tag
            type="primary"
            effect="plain"
            class="tag-item-content"
            draggable="true"
            :class="{ selected: isSelected(element) }"
            @dragstart="handleDragStart(element, $event)"
            @click="toggleSelection(element, $event)"
            @dragover="handleDragOver(element, $event)"
          >
            <slot name="custom-item" :item="element"> {{ element.name }} </slot>
          </el-tag>

          <span
            class="active-line-back"
            v-show="element.id === currentTabId && backLineShow"
          ></span>
        </div>
      </div>
    </el-scrollbar>
  </div>

  <drag-bg ref="dragBgRef" v-model="dragBgShow" :list="selectedTabsForDrag">
    <template #custom-item="{ item }">
      <slot name="custom-item" :item="item"></slot>
    </template>
  </drag-bg>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue';
import { cloneDeep } from 'lodash-es';
import { useDragPreview } from './hooks/useDragPreview';
import DragBg from './components/dragbg.vue';

interface TabType {
  id: number | string;
  name: string;
}
interface RawTabType {
  [key: string]: any;
}

const props = defineProps<{
  prop?: {
    labelKey: string;
    valueKey: string;
  };
}>();

// 原始数据
const rawTabs = defineModel<RawTabType[]>({
  default: () => []
});

const { valueKey = 'id', labelKey = 'name' } = props.prop || {};
// 映射
const tags = computed<TabType[]>({
  get() {
    return rawTabs.value.map((item) => ({
      id: item[valueKey],
      name: item[labelKey]
    }));
  },
  set(newValue) {
    // 当内部tabs变化时，同步回原始数据
    rawTabs.value = newValue.map((item) => {
      const rawItem: RawTabType = {};
      rawItem[labelKey] = item.name;
      rawItem[valueKey] = item.id;
      return rawItem;
    });
  }
});

const dragBgRef = ref<InstanceType<typeof DragBg> | null>(null);
const selectedTabIds = ref<(number | string)[]>([]);
const targetIndex = ref<number>();
const currentTabId = ref<number | string>();
const frontLineShow = ref<boolean>(false); // 当前鼠标移入元素前边线显示
const backLineShow = ref<boolean>(false); // 当前鼠标移入元素前边线显示
const dragBgShow = ref<boolean>(false); // 是否显示拖拽背景
// const dragPreview = ref<HTMLDivElement | null>(null); // 拖拽默认背景元素
const { dragPreview, createDragPreview, removeDragPreview } = useDragPreview();

// 计算选中的 tabs（用于拖拽背景显示）
const selectedTabsForDrag = computed(() => {
  return tags.value.filter((tag) => selectedTabIds.value.includes(tag.id));
});

const isSelected = (tag: TabType): boolean => {
  return selectedTabIds.value.includes(tag.id);
};

const findTabIndex = (tabList: TabType[], id: number | string) => {
  return tabList.findIndex((item) => item.id === id);
};

const toggleSelection = (tag: TabType, event: MouseEvent) => {
  const isCtrlPressed = event.ctrlKey || event.metaKey;
  if (isCtrlPressed) {
    const index = selectedTabIds.value.indexOf(tag.id);
    index === -1 ? selectedTabIds.value.push(tag.id) : selectedTabIds.value.splice(index, 1);
    return;
  }
  //取消选中
  if (selectedTabIds.value.length === 1 && selectedTabIds.value[0] === tag.id) {
    selectedTabIds.value = [];
    return;
  }
  selectedTabIds.value = [tag.id];
};

const handleDragStart = (tag: TabType, event: DragEvent) => {
  const dataTransfer = event.dataTransfer;
  if (!dataTransfer) return;
  createDragPreview();
  if (dragPreview.value) {
    dataTransfer.setDragImage(dragPreview.value, 0, 0);
  }
  // 如果当前拖拽的项未被选中，清空选择并只选择当前项
  if (!selectedTabIds.value.includes(tag.id)) {
    selectedTabIds.value = [tag.id];
  }
  dataTransfer.effectAllowed = 'move';
};

//更新拖拽背景位置
const handleDrag = (event: DragEvent) => {
  if (dragBgRef.value) dragBgRef.value.updatePosition(event);
  if (!dragBgShow.value) dragBgShow.value = true;
};

// 拖拽经过更新显示分隔线
const handleDragOver = (tag: TabType, event: DragEvent) => {
  event.preventDefault();
  const target = (event.currentTarget || event.target) as HTMLElement;
  if (!target) return;
  currentTabId.value = tag.id;
  const index = findTabIndex(tags.value, tag.id);
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
  tags.value = data.map((item) => {
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
  const data = cloneDeep(tags.value);
  multiDrag(data);
};

const initDragParams = () => {
  targetIndex.value = undefined;
  currentTabId.value = undefined;
  dragBgShow.value = false;
  frontLineShow.value = false;
  backLineShow.value = false;
  selectedTabIds.value = [];
  if (dragPreview.value) {
    dragBgRef.value?.cancelAFrame();
  }
};
initDragParams();
</script>

<style lang="scss" scoped>
.tags-container {
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  background: #fff;
  min-height: 100px;
  overflow: hidden;
  position: relative;
  --tag-hover-bg: #409eff;
  --tag-selected-bg: #409eff;
  .tag-list {
    display: flex;
    flex-wrap: wrap;
    padding: 15px;
    row-gap: 12px;
    column-gap: 8px;
    box-sizing: border-box;
    cursor: grab;
    .tag-item {
      position: relative;
      height: 32px;
      .tag-item-content {
        display: inline-flex;
        align-items: center;
        height: 100%;
        width: 100%;
        cursor: grab;
        transition: all 0.2;
        // &:hover {
        //   background: var(--tag-hover-bg);
        //   color: #fff;
        //   border: 1px solid #fff;
        // }

        &.selected {
          background: var(--tag-selected-bg);
          color: #fff;
          border: 1px solid #fff;
        }
      }

      .active-line-back {
        position: absolute;
        right: -5px;
        top: 50%;
        transform: translateY(-50%);
        height: 80%;
        width: 2px;
        background-color: #409eff;
      }
      .active-line-front {
        position: absolute;
        left: -5px;
        top: 50%;
        transform: translateY(-50%);
        height: 80%;
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
