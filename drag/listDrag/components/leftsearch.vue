<template>
  <div class="search-box">
    <dart-input
      v-model="searchQuery"
      placeholder="请搜索"
      @input="filterFieldHandle"
      :prefix-icon="Search"
      size="default"
      clearable
    >
    </dart-input>
  </div>
</template>
<script lang="ts" setup>
import { debounce } from 'lodash-es';
import { Search } from '@element-plus/icons-vue';
const emit = defineEmits(['search']);

const searchQuery = defineModel<string>();
const filterFieldHandle = debounce(() => {
  emit('search');
}, 300);
</script>
<style lang="scss" scoped>
.search-box {
  margin-bottom: 16px;
}
</style>
