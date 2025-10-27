<template>
  <div class="drag-header">
    <slot name="panel-header">
      <h4 v-if="config.showTitle !== false">
        <span>{{ config.title }}</span>
      </h4>
      <div v-if="config?.showSummary !== false" class="header-right">{{ list.length }}</div>
    </slot>
  </div>
</template>
<script lang="ts" setup>
import type { ListItem, PanelConfig } from '../types/index';
const props = defineProps<{
  list: Array<ListItem>;
  config: PanelConfig;
}>();
console.log(props, 'header');
</script>
<style lang="scss" scoped>
.drag-header {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  background-color: #f7f5fa;
  color: #333;
  height: 40px;
  padding: 0 12px;
  .header-right {
    color: #909399;
    font-size: 12px;
  }
}
</style>
