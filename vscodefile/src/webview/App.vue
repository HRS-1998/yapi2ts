<template>
  <div class="app-container">
    <el-card class="main-card">
      <template #header>
        <div class="card-header">
          <el-icon><Search /></el-icon>
          <span class="title">YAPI 转 TypeScript</span>
        </div>
      </template>

      <!-- YAPI Token 设置区域 -->
      <TokenSetting
        ref="tokenSettingRef"
        :vscode-api="vscode"
        @token-saved="onTokenSaved"
      />

      <el-divider />

      <!-- 接口选择区域 -->
      <InterfaceSelector
        ref="interfaceSelectorRef"
        :vscode-api="vscode"
        :token="currentToken"
        @interfaces-loaded="onInterfacesLoaded"
      />

      <el-divider />

      <!-- 生成按钮 -->
      <GenerateButton
        ref="generateButtonRef"
        :vscode-api="vscode"
        :selected-interfaces="selectedInterfaces"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { Search } from '@element-plus/icons-vue';
import TokenSetting from './components/TokenSetting.vue';
import InterfaceSelector from './components/InterfaceSelector.vue';
import GenerateButton from './components/GenerateButton.vue';
import type {
  VsCodeApi,
  InterfaceCategory,
  YapiInterface,
  VscodeMessage,
} from './types';

// 组件引用
const tokenSettingRef = ref<InstanceType<typeof TokenSetting>>();
const interfaceSelectorRef = ref<InstanceType<typeof InterfaceSelector>>();
const generateButtonRef = ref<InstanceType<typeof GenerateButton>>();

// 响应式数据
const currentToken = ref('');
const selectedInterfaces = ref<YapiInterface[]>([]);

// 声明全局函数
declare function acquireVsCodeApi(): VsCodeApi;

// 获取VS Code API对象
const vscode = acquireVsCodeApi();

// 事件处理
const onTokenSaved = () => {
  // Token保存成功后的处理
  currentToken.value = tokenSettingRef.value?.getToken() || '';
};

const onInterfacesLoaded = (total: number) => {
  // 接口加载完成后的处理
  ElMessage.success(`成功加载 ${total} 个接口`);
};

// 监听VS Code消息
const handleMessage = (event: MessageEvent) => {
  const message = event.data as VscodeMessage;

  console.log('App: Received message from extension:', message);

  switch (message.command) {
    case 'setToken':
      // 设置保存的Token
      if (message.token) {
        currentToken.value = message.token;
        tokenSettingRef.value?.setToken(message.token);
      }
      break;

    case 'tokenSaved':
      // Token保存结果处理
      console.log('App: Token save result:', message.success, message.error);

      // 如果保存成功，直接从TokenSetting组件获取最新的token值并更新currentToken
      if (message.success && tokenSettingRef && tokenSettingRef.value) {
        console.log('App: Token saved successfully, updating currentToken');
        const latestToken = tokenSettingRef.value.getToken();
        if (latestToken) {
          currentToken.value = latestToken;
          console.log(
            'App: currentToken updated successfully:',
            latestToken.substring(0, 5) + '...'
          );
        }
      }

      // 确保tokenSettingRef已定义且有handleSaveResult方法
      if (
        tokenSettingRef &&
        tokenSettingRef.value &&
        typeof tokenSettingRef.value.handleSaveResult === 'function'
      ) {
        console.log('App: Calling handleSaveResult on TokenSetting');
        tokenSettingRef.value.handleSaveResult(message.success, message.error);
      } else {
        console.warn(
          'App: TokenSetting reference not available or handleSaveResult not found'
        );
        // 备用逻辑，重置loading状态
        try {
          if (tokenSettingRef && tokenSettingRef.value) {
            // 尝试直接访问loading属性（如果可用）
            if (
              typeof tokenSettingRef.value === 'object' &&
              'loading' in tokenSettingRef.value
            ) {
              (tokenSettingRef.value as any).loading = false;
            }
          }
        } catch (e) {
          console.error('App: Failed to reset loading state:', e);
        }
      }
      break;

    case 'interfacesLoaded':
      // 接口加载完成
      if (message.categories) {
        interfaceSelectorRef.value?.setCategories(message.categories);
      }
      interfaceSelectorRef.value?.setLoading(false);
      break;

    case 'interfacesLoadFailed':
      // 接口加载失败
      ElMessage.error(`加载接口失败: ${message.error}`);
      interfaceSelectorRef.value?.setLoading(false);
      break;

    case 'generationComplete':
      // 生成完成
      generateButtonRef.value?.setLoading(false);
      if (message.success) {
        ElMessage.success(`成功生成 ${message.fileCount} 个接口定义文件`);
      } else {
        ElMessage.error(`生成失败: ${message.error}`);
      }
      break;
  }
};

// 生命周期钩子
onMounted(() => {
  // 请求保存的Token
  vscode.postMessage({ command: 'getToken' });

  // 监听消息
  window.addEventListener('message', handleMessage);

  // 组件卸载时清理监听器
  return () => {
    window.removeEventListener('message', handleMessage);
  };
});
</script>

<style scoped>
.app-container {
  padding: 16px;
}

.main-card {
  max-width: 800px;
  margin: 0 auto;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: bold;
}
</style>
