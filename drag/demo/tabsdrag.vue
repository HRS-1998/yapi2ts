<template>
  <tabs-drag v-model="tabs"></tabs-drag>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import TabsDrag from '../tabsDrag/tab.vue';
const tabs = ref([
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
