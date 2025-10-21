<template>
  <div class="drag-header">
    <slot name="panel-header">
      <h4 v-if="config.showTitle !== false">
        <span>{{ config.title }}</span>
      </h4>
      <h4 v-if="config?.showSummary !== false">{{ list.length }} 项</h4>
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
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
  color: #333;
}
</style>
