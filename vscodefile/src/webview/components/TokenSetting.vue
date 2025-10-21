<template>
  <el-form label-position="top">
    <el-form-item label="YAPI Token">
      <el-input
        v-model="token"
        placeholder="请输入YAPI项目Token"
        clearable
      />
      <el-button 
        type="primary" 
        @click="handleSave"
        :loading="loading"
        style="margin-bottom: 12px;"
      >
        保存 Token
      </el-button>
    </el-form-item>
  </el-form>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import type { VsCodeApi } from '../types';

// 添加window对象扩展的类型声明
declare global {
  interface Window {
    _tokenSaveTimeoutId?: number;
  }
}

// Props
interface Props {
  vscodeApi: VsCodeApi;
}

const props = defineProps<Props>();

// 响应式数据
const token = ref('');
const loading = ref(false);

// Emits
const emit = defineEmits<{
  tokenSaved: [];
}>();

// 保存Token
const handleSave = () => {
  const trimmedToken = token.value.trim();
  
  // 基本验证
  if (!trimmedToken) {
    ElMessage.warning('请输入有效的YAPI Token');
    return;
  }
  
  loading.value = true;
  
  try {
    // 显示保存中的提示
    ElMessage.info('正在保存Token...');
    
    props.vscodeApi.postMessage({ 
      command: 'saveToken', 
      token: trimmedToken 
    });
    
    // 设置超时处理，增加到20秒以适应网络延迟
    const timeoutId = setTimeout(() => {
      if (loading.value) {
        ElMessage.warning('保存超时，请检查网络连接或稍后重试');
        loading.value = false;
        // 清除timeout ID
        window._tokenSaveTimeoutId = undefined;
      }
    }, 20000);
    
    // 保存timeoutId以便清除
    window._tokenSaveTimeoutId = timeoutId;
  } catch (error) {
    // 清除超时计时器
    if (window._tokenSaveTimeoutId) {
      clearTimeout(window._tokenSaveTimeoutId);
      window._tokenSaveTimeoutId = undefined;
    }
    
    loading.value = false;
    ElMessage.error('保存过程中发生错误: ' + (error as Error).message);
  }
};

// 处理保存结果（由父组件调用）
const handleSaveResult = (success: boolean, error?: string) => {
  console.log('TokenSetting: Received save result:', { success, error });
  
  // 清除超时计时器
  if (window._tokenSaveTimeoutId) {
    clearTimeout(window._tokenSaveTimeoutId);
    window._tokenSaveTimeoutId = undefined;
  }
  
  // 立即更新loading状态
  loading.value = false;
  
  // 根据保存结果显示相应的用户提示
  if (!success) {
    ElMessage.error(`保存失败: ${error || '未知错误'}`);
  } else {
    ElMessage.success('Token保存成功！');
    // 保存成功时触发tokenSaved事件
    emit('tokenSaved');
  }
};

// 设置Token值
defineExpose({
  setToken: (value: string) => {
    console.log('TokenSetting: Setting token value');
    token.value = value;
  },
  getToken: () => token.value,
  handleSaveResult // 暴露处理保存结果的方法给父组件
});
</script>

<style scoped>
.el-form {
  margin-bottom: 8px;
}

.el-form-item {
  margin-bottom: 12px;
}
</style>