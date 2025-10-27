<template>
  <div class="drag-bg" ref="dragBgRef">
    <div v-for="(item, index) in list" :key="index">
      <slot name="custom-item" :field="item"> {{ item.title }}</slot>
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { ListItem } from '../types/index';
defineProps<{
  list: Required<ListItem>[];
}>();
</script>
<style lang="scss" scoped>
.drag-bg {
  user-select: none;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;

  div {
    padding: 8px 12px;
    // background-color: #409eff;
    border: 1px solid #409eff;
    border-radius: 4px;
    margin: 2px;
    font-size: 12px;
    color: #409eff;
    max-width: 300px;
    box-sizing: border-box;
    text-align: left;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
</style>
