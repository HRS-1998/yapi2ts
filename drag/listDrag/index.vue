<template>
  <div class="cross-table-container" :class="config?.cls">
    <!-- 左侧多选拖拽区域 -->
    <div class="left-panel">
      <left-panel
        :list="mappedLeftList"
        :config="config?.leftPanel"
        name="leftPanel"
        @outhandleDrop="handleLeftDrop"
      >
        <template #left-panel-header>
          <slot name="left-panel-header"></slot>
        </template>
        <template #left-panel-item="{ field }">
          <slot name="left-panel-item" :item="field"></slot>
        </template>
      </left-panel>
    </div>
    <!-- 右侧拖选排序侧区域 -->
    <div class="right-panel">
      <right-panel
        v-model="mappedRightList"
        :config="config?.rightPanel"
        name="rightPanel"
        @remove="remove"
        @outhandleDrop="handleDrop"
      ></right-panel>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import leftPanel from './left.vue';
import rightPanel from './right.vue';

// props用于替换 重定义字段名称
const props = defineProps<{
  config?: {
    prop?: {
      labelKey?: string;
      valueKey?: string;
      canChooseKey?: string;
    };
    cls?: string;
    leftPanel?: {
      showTitle?: boolean;
      showSummary?: boolean;
      showSearch?: boolean;
    };
    rightPanel?: {
      showTitle?: boolean;
      showSummary?: boolean;
      showSearch?: boolean;
    };
  };
}>();

// 获取配置的字段映射，提供默认值
const {
  labelKey = 'title',
  valueKey = 'id',
  canChooseKey = 'canChoose'
} = props.config?.prop || {};

// 原始的列表数据
type RawItem = Record<string, any>;

// 定义leftList的类型，默认为DragItem[]，但可以根据config灵活处理
const rawLeftList = defineModel<RawItem[]>('leftPanel', {
  default: () => []
});

const rawRightList = defineModel<RawItem[]>('rightPanel', {
  default: () => []
});

// 映射后的列表数据
type DragItem = {
  id: string | number;
  title: string;
  canChoose?: boolean;
  slot?: string;
};

const mappedLeftList = computed<DragItem[]>(() => {
  return rawLeftList.value.map((item) => ({
    id: item[valueKey],
    title: item[labelKey],
    canChoose: item[canChooseKey] !== undefined ? item[canChooseKey] : true,
    slot: item.slot || undefined
  }));
});

// 字段映射后的列表
const mappedRightList = computed<DragItem[]>({
  get: () => {
    return rawRightList.value.map((item) => ({
      id: item[valueKey],
      title: item[labelKey],
      canChoose: item[canChooseKey] !== undefined ? item[canChooseKey] : true,
      slot: item.slot || undefined
    }));
  },
  set: (value) => {
    // 将映射后的数据转换回原始格式
    rawRightList.value = value.map((item) => {
      // 查找原始数据中对应的项，保留所有字段
      const originalItem = rawRightList.value.find(
        (rawItem: RawItem) => rawItem[valueKey] === item.id
      );
      const result: RawItem = originalItem ? { ...originalItem } : {};

      // 更新映射的字段
      result[valueKey] = item.id;
      result[labelKey] = item.title;
      result[canChooseKey] = item.canChoose;

      return result;
    });
  }
});

const getDiffList = (leftList: DragItem[], rightList: DragItem[]) => {
  const rightIds = new Set(rightList.map((item) => item.id));
  return leftList.filter((item) => !rightIds.has(item.id));
};

// 放置左侧拖动过来的元素到右侧指定index位置
const handleDrop = (object?: { list: DragItem[]; index: number }) => {
  if (object) {
    // 过滤出不在右侧列中的元素，插入右侧列
    const result = getDiffList(object.list, mappedRightList.value);
    if (!result.length) return;

    // 将映射后的数据转换回原始格式并更新
    const newItems = result.map((item) => {
      // 查找原始数据中对应的项，保留所有字段
      const originalItem = rawLeftList.value.find(
        (rawItem: RawItem) => rawItem[valueKey] === item.id
      );
      const result: RawItem = originalItem ? { ...originalItem } : {};

      // 更新映射的字段
      result[valueKey] = item.id;
      result[labelKey] = item.title;
      result[canChooseKey] = item.canChoose;

      return result;
    });

    const newRightList = [...rawRightList.value];
    newRightList.splice(object.index, 0, ...newItems);
    rawRightList.value = newRightList;

    // 删除左侧已拖动的元素
    const diffIds = result.map((item) => item.id);
    rawLeftList.value = rawLeftList.value.filter((item) => {
      const id = item[valueKey];
      return !diffIds.includes(id);
    });
  }
};
const handleLeftDrop = (object?: { list: DragItem[]; index: number }) => {
  if (object) {
    // 将映射后的数据转换回原始格式并过滤
    const objectIds = object.list.map((item) => item.id);
    rawRightList.value = rawRightList.value.filter((item) => {
      const id = item[valueKey];
      return !objectIds.includes(id);
    });

    // 将映射后的数据转换回原始格式并插入
    const newItems = object.list.map((item) => {
      // 查找原始数据中对应的项，保留所有字段
      const originalItem = rawRightList.value.find(
        (rawItem: RawItem) => rawItem[valueKey] === item.id
      );
      const result: RawItem = originalItem ? { ...originalItem } : {};

      // 更新映射的字段
      result[valueKey] = item.id;
      result[labelKey] = item.title;
      result[canChooseKey] = item.canChoose;

      return result;
    });

    // 创建新数组以确保响应性
    const newLeftList = [...rawLeftList.value];
    newLeftList.splice(object.index, 0, ...newItems);
    rawLeftList.value = newLeftList;
  }
};

// 移除时更新数据
const remove = (field: DragItem) => {
  // 查找原始数据中对应的项
  const rawItemIndex = rawRightList.value.findIndex((item) => item[valueKey] === field.id);
  if (rawItemIndex !== -1) {
    const rawItem = { ...rawRightList.value[rawItemIndex] };
    // 从右侧列表中移除
    const newRightList = [...rawRightList.value];
    newRightList.splice(rawItemIndex, 1);
    rawRightList.value = newRightList;

    // 添加回左侧列表
    const leftItemIndex = rawLeftList.value.findIndex((item) => item[valueKey] === field.id);
    if (leftItemIndex === -1) {
      const newLeftList = [...rawLeftList.value];
      newLeftList.push(rawItem);
      rawLeftList.value = newLeftList;
    } else {
      // 如果已存在，更新canChoose状态,这个对应第一种情况
      const newLeftList = [...rawLeftList.value];
      newLeftList[leftItemIndex][canChooseKey] = true;
      rawLeftList.value = newLeftList;
    }
  }
};
</script>

<style scoped lang="scss">
.cross-table-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 600px;
  border: 1px solid #ddd;
  .left-panel {
    padding: 16px;
    border: 1px solid #ddd;
    overflow-y: auto;
  }
  .right-panel {
    padding: 16px;
    width: 300px;
    border: 1px solid #ddd;
    overflow-y: auto;
  }
}
</style>
