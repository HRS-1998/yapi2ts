<template>
  <tabs-drag v-model="tabs" :prop="{ labelKey: 'names', valueKey: 'ids' }"></tabs-drag>
  <div style="margin-top: 20px"></div>
  <tabs-drag v-model="tabs1">
    <template #custom-item="{ item }">
      <div v-if="item.id === 3">
        <div class="custom">
          <el-icon><House /></el-icon>
          <span>{{ item.name }}-{{ item.id }}</span>
          <el-icon><Loading /></el-icon>
        </div>
      </div>
      <div v-if="item.id === 4">{{ item.name }}-{{ item.id }}</div>
    </template>
  </tabs-drag>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import TabsDrag from '../tabsDrag/tab.vue';
const tabs = ref([
  { ids: 1, names: '11111' },
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
  { id: 1, name: '11111' },
  { id: 2, name: '22222' },
  { id: 3, name: '33333' },
  { id: 4, name: '44444' },
  { id: 5, name: '55555' },
  { id: 6, name: '66666' },
  { id: 7, name: '77777' },
  { id: 8, name: '88888' },
  { id: 9, name: '99999' },
  { id: 10, name: 'aaaaa' },
  { id: 11, name: 'bbbbb' },
  { id: 12, name: 'ccccc' }
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
