<template>
  <tabs-drag v-model="tabs" :prop="{ labelKey: 'names', valueKey: 'ids' }"></tabs-drag>
  <div style="margin-top: 20px"></div>
  <tabs-drag v-model="tabs1">
    <template #custom-item="{ item }">
      <div v-if="item.id === 3">
        <div class="custom">
          <el-icon><House /></el-icon>
          <span>{{ item.title }}-{{ item.id }}</span>
          <el-icon><Loading /></el-icon>
        </div>
      </div>
      <div v-if="item.id === 4">{{ item.title }}-{{ item.id }}</div>
    </template>
  </tabs-drag>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import TabsDrag from '../tabsDrag/tab.vue';
const tabs = ref([
  { ids: 1, names: '111111111111111111111111111111111111111111111' },
  { ids: 2, names: '22222' },
  { ids: 3, names: '33333' },
  { ids: 4, names: '44444' },
  { ids: 5, names: '55555' },
  { ids: 6, names: '66666' },
  { ids: 7, names: '77777' },
  { ids: 8, names: '88888' },
  { ids: 9, names: '99999' },
  { ids: 10, names: 'aaaaa' },
  { ids: 11, names: 'bbbbb' },
  { ids: 12, names: 'ccccc' }
]);
const tabs1 = ref([
  { id: 1, title: '11111' },
  { id: 2, title: '22222' },
  { id: 3, title: '33333' },
  { id: 4, title: '44444' },
  { id: 5, title: '55555' },
  { id: 6, title: '66666' },
  { id: 7, title: '77777' },
  { id: 8, title: '88888' },
  { id: 9, title: '99999' },
  { id: 10, title: 'aaaaa' },
  { id: 11, title: 'bbbbb' },
  { id: 12, title: 'ccccc' }
]);
</script>
<style scoped>
.custom {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  width: 100%;
  font-size: 12px;
  border-radius: 5px;
}
</style>
