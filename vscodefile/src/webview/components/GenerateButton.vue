<template>
  <div class="generate-section">
    <el-button 
      type="success"
      size="large"
      @click="handleGenerate"
      :disabled="selectedCount === 0 || loading"
      :loading="loading"
    >
      <el-icon><Document /></el-icon>
      生成 TypeScript 接口定义
    </el-button>
    <div class="interface-count">
      已选择 {{ selectedCount }} 个接口
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { ElMessage } from 'element-plus';
import { Document } from '@element-plus/icons-vue';
import type { VsCodeApi, YapiInterface } from '../types';

// Props
interface Props {
  vscodeApi: VsCodeApi;
  selectedInterfaces: YapiInterface[];
}

const props = defineProps<Props>();

// 响应式数据
const loading = ref(false);

// 计算属性
const selectedCount = computed(() => props.selectedInterfaces.length);

// 生成TypeScript接口定义
const handleGenerate = async () => {
  if (selectedCount.value === 0) {
    ElMessage.warning('请至少选择一个接口');
    return;
  }
  
  loading.value = true;
  try {
    props.vscodeApi.postMessage({
      command: 'generateTypes',
      selectedInterfaces: props.selectedInterfaces
    });
  } catch (error) {
    ElMessage.error('生成失败');
    loading.value = false;
  }
};

// 暴露方法
defineExpose({
  setLoading: (value: boolean) => {
    loading.value = value;
  }
});
</script>

<style scoped>
.generate-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 16px 0;
}

.interface-count {
  color: #606266;
  font-size: 14px;
}
</style>