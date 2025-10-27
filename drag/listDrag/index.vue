<template>
  <div class="cross-table-container" :class="config?.cls">
    <!-- 左侧多选拖拽区域 -->
    <div class="left-panel">
      <left-panel
        :list="mappedLeftList"
        :config="config?.leftPanel"
        :propsMap="{ labelKey, valueKey, canChooseKey }"
        @outhandleDrop="handleLeftDrop"
      >
        <template #panel-header>
          <slot name="left-panel-header"></slot>
        </template>
        <template #custom-item="{ field }">
          <slot name="custom-item" :item="getRawData(field)"></slot>
        </template>
      </left-panel>
    </div>
    <!-- 右侧拖选排序侧区域 -->
    <div class="right-panel">
      <right-panel
        v-model="mappedRightList"
        :config="config?.rightPanel"
        :propsMap="{ labelKey, valueKey, canChooseKey }"
        @remove="remove"
        @outhandleDrop="handleRightDrop"
      >
        <template #panel-header>
          <slot name="right-panel-header"></slot>
        </template>
        <template #custom-item="{ field }">
          <slot name="custom-item" :item="getRawData(field)"></slot>
        </template>
      </right-panel>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import type { PanelConfig } from './types/index';
import leftPanel from './left.vue';
import rightPanel from './right.vue';

const props = defineProps<{
  config?: {
    prop?: {
      labelKey?: string;
      valueKey?: string;
      canChooseKey?: string;
    };
    cls?: string;
    leftPanel?: Omit<PanelConfig, 'showLeftIcon' | 'showRightIcon'>;
    rightPanel?: PanelConfig;
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
};

const mappedLeftList = computed<DragItem[]>(() => {
  return rawLeftList.value.map((item) => ({
    id: item[valueKey],
    title: item[labelKey],
    canChoose: item[canChooseKey] !== undefined ? item[canChooseKey] : true
  }));
});

// 字段映射后的列表
const mappedRightList = computed<DragItem[]>({
  get: () => {
    return rawRightList.value.map((item) => ({
      id: item[valueKey],
      title: item[labelKey],
      canChoose: item[canChooseKey] !== undefined ? item[canChooseKey] : true
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
const handleRightDrop = (object?: { list: DragItem[]; index: number }) => {
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

// 还原传入的数据格式
const getRawData = (field: DragItem): RawItem => {
  return {
    [valueKey]: field.id ?? '',
    [labelKey]: field.title ?? '',
    [canChooseKey]: field.canChoose !== undefined ? field.canChoose : true
  };
};
</script>

<style scoped lang="scss">
.cross-table-container {
  width: 648px;
  display: flex;
  justify-content: center;
  align-items: center;

  .left-panel {
    flex: 1;
    // padding: 16px;
    width: 324px;
    border: 1px solid #ddd;
    border-top-left-radius: 4px;
    border-bottom-left-radius: 4px;
    box-sizing: border-box;
  }
  .right-panel {
    flex: 1;
    // padding: 16px;
    width: 324px;
    border: 1px solid #ddd;
    border-left: none;
    border-top-right-radius: 4px;
    border-bottom-right-radius: 4px;
    box-sizing: border-box;
  }
}
</style>
