<template>
  <div class="search-box">
    <dart-input
      v-model="searchQuery"
      placeholder="请搜索"
      @input="filterFieldHandle"
      clearable
    ></dart-input>
  </div>
</template>
<script lang="ts" setup>
import { debounce } from 'lodash-es';
const emit = defineEmits(['search']);

const searchQuery = defineModel<string>();
const filterFieldHandle = debounce(() => {
  emit('search');
}, 300);
</script>
<style lang="scss" scoped>
.search-box {
  margin-bottom: 20px;
}
</style>
