<template>
  <div class="interface-section">
    <div class="section-header">
      <h3>接口选择</h3>
      <el-button-group>
        <el-button 
          @click="handleRefresh"
          :loading="loading"
          type="info"
        >
          <el-icon><Refresh /></el-icon>
          刷新接口列表
        </el-button>
        <el-button @click="handleSelectAll">
          <el-icon><Check /></el-icon>
          全选
        </el-button>
        <el-button @click="handleDeselectAll">
          <el-icon><Close /></el-icon>
          全不选
        </el-button>
      </el-button-group>
    </div>
    
    <div v-if="categories.length > 0" class="categories-container">
      <el-collapse>
        <el-collapse-item 
          v-for="(category, index) in categories" 
          :key="index"
          :title="`${category.name} (${category.list.length})`"
        >
          <div class="interface-list">
            <el-checkbox-group v-model="selectedInterfaces">
              <el-checkbox 
                v-for="(item, itemIndex) in category.list" 
                :key="`${index}-${itemIndex}`"
                :label="item"
                :disabled="loading"
              >
                <div class="interface-info">
                  <span class="interface-title">{{ item.title }}</span>
                  <span class="interface-method" :class="getMethodClass(item.method)">{{ item.method }}</span>
                  <span class="interface-path">{{ item.path }}</span>
                </div>
              </el-checkbox>
            </el-checkbox-group>
          </div>
        </el-collapse-item>
      </el-collapse>
    </div>
    
    <div v-else-if="!loading" class="empty-state">
      <el-empty description="暂无接口数据，请先设置Token并刷新" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { Refresh, Check, Close } from '@element-plus/icons-vue';
import type { VsCodeApi, InterfaceCategory, YapiInterface } from '../types';

// Props
interface Props {
  vscodeApi: VsCodeApi;
  token: string;
}

const props = defineProps<Props>();

// 响应式数据
const categories = ref<InterfaceCategory[]>([]);
const selectedInterfaces = ref<YapiInterface[]>([]);
const loading = ref(false);

// Emits
const emit = defineEmits<{
  interfacesLoaded: [total: number];
}>();

// 获取方法对应的样式类名
const getMethodClass = (method: string) => {
  const methodMap: Record<string, string> = {
    'GET': 'method-get',
    'POST': 'method-post',
    'PUT': 'method-put',
    'DELETE': 'method-delete',
  };
  return methodMap[method] || 'method-other';
};

// 刷新接口列表
const handleRefresh = async () => {
  if (!props.token.trim()) {
    ElMessage.warning('请先设置YAPI Token');
    return;
  }
  
  loading.value = true;
  selectedInterfaces.value = [];
  
  // 设置接口加载超时处理
  const timeoutId = setTimeout(() => {
    if (loading.value) {
      console.warn('InterfaceSelector: Interface loading timeout - no response after 15 seconds');
      ElMessage.error('加载接口超时，请检查网络连接或YAPI服务是否可用');
      loading.value = false;
    }
  }, 15000); // 15秒超时
  
  try {
    console.log('InterfaceSelector: Sending refreshInterfaces message with token length:', props.token.length);
    const messageSent = props.vscodeApi.postMessage({ 
      command: 'refreshInterfaces', 
      token: props.token.trim() 
    });
    console.log('InterfaceSelector: Message post result:', messageSent);
    
    // 保存timeoutId到window对象，方便后续清除
    if (!window._interfaceLoadTimeoutIds) {
      (window as any)._interfaceLoadTimeoutIds = [];
    }
    (window as any)._interfaceLoadTimeoutIds.push(timeoutId);
  } catch (error) {
    console.error('InterfaceSelector: Error sending refresh request:', error);
    clearTimeout(timeoutId);
    ElMessage.error('刷新接口列表失败');
    loading.value = false;
  }
};

// 全选
const handleSelectAll = () => {
  const allInterfaces = categories.value.flatMap(cat => cat.list);
  selectedInterfaces.value = [...allInterfaces];
};

// 全不选
const handleDeselectAll = () => {
  selectedInterfaces.value = [];
};

// 设置接口数据
defineExpose({
  setCategories: (newCategories: InterfaceCategory[]) => {
    categories.value = newCategories;
    // 清除所有超时计时器
    if ((window as any)._interfaceLoadTimeoutIds) {
      (window as any)._interfaceLoadTimeoutIds.forEach((id: number) => clearTimeout(id));
      (window as any)._interfaceLoadTimeoutIds = [];
    }
  },
  setLoading: (value: boolean) => {
    loading.value = value;
    // 如果是设置为false，清除所有超时计时器
    if (!value && (window as any)._interfaceLoadTimeoutIds) {
      (window as any)._interfaceLoadTimeoutIds.forEach((id: number) => clearTimeout(id));
      (window as any)._interfaceLoadTimeoutIds = [];
    }
  },
  getSelectedInterfaces: () => selectedInterfaces.value,
  clearSelection: () => {
    selectedInterfaces.value = [];
  }
});
</script>

<style scoped>
.interface-section {
  margin-top: 16px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-header h3 {
  margin: 0;
  font-size: 16px;
}

.categories-container {
  max-height: 400px;
  overflow-y: auto;
}

.interface-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 0;
}

.interface-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.interface-title {
  font-weight: 500;
  flex: 1;
}

.interface-method {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  color: white;
  min-width: 60px;
  text-align: center;
}

.method-get {
  background-color: #67c23a;
}

.method-post {
  background-color: #409eff;
}

.method-put {
  background-color: #e6a23c;
}

.method-delete {
  background-color: #f56c6c;
}

.method-other {
  background-color: #909399;
}

.interface-path {
  font-size: 12px;
  color: #606266;
  word-break: break-all;
}

.empty-state {
  padding: 40px 0;
}
</style>