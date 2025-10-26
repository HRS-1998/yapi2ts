<template>
  <div class="yapi2ts-container">
    <h1 class="title">
      <el-icon><CircleCheck /></el-icon>
      YAPI 转 TypeScript
    </h1>
    
    <el-card class="token-card">
      <template #header>
        <div class="card-header">
          <span>YAPI Token 配置</span>
        </div>
      </template>
      <div class="token-form">
        <el-input
          v-model="yapiToken"
          placeholder="请输入YAPI项目Token"
          clearable
          show-password
        />
        <el-button type="primary" @click="saveToken" :loading="savingToken">
          {{ savingToken ? '保存中...' : '保存 Token' }}
        </el-button>
      </div>
      <el-alert
        v-if="tokenMessage"
        :title="tokenMessage"
        :type="tokenMessageType"
        :closable="false"
        class="token-alert"
      />
    </el-card>

    <el-card class="interfaces-card">
      <template #header>
        <div class="card-header">
          <span>接口选择</span>
          <el-button-group>
            <el-button type="success" @click="refreshInterfaces" :loading="loadingInterfaces">
              <el-icon><Refresh /></el-icon>
              刷新接口列表
            </el-button>
            <el-button type="primary" @click="selectAll">全选</el-button>
            <el-button @click="deselectAll">全不选</el-button>
          </el-button-group>
        </div>
      </template>

      <el-empty v-if="!loadingInterfaces && categories.length === 0" description="暂无接口数据" />
      
      <el-tree
        v-else
        ref="treeRef"
        :data="categories"
        :props="treeProps"
        show-checkbox
        check-on-click-node
        :load="loadNode"
        lazy
        node-key="id"
        @check-change="handleCheckChange"
      >
        <template #default="{ node, data }">
          <div v-if="data.isCategory" class="category-node">
            <el-icon><Folder /></el-icon>
            <span>{{ node.label }}</span>
            <span class="interface-count">({{ data.interfaceCount }}个接口)</span>
          </div>
          <div v-else class="interface-node">
            <el-badge :value="data.method" class="method-badge" :type="getMethodType(data.method)">
              {{ node.label }}
            </el-badge>
            <div class="path-text">{{ data.path }}</div>
          </div>
        </template>
      </el-tree>

      <el-alert
        v-if="interfacesMessage"
        :title="interfacesMessage"
        :type="interfacesMessageType"
        :closable="false"
        class="interfaces-alert"
      />
    </el-card>

    <div class="generate-container">
      <el-button 
        type="primary" 
        size="large" 
        @click="generateTypescript"
        :loading="generatingTypes"
        :disabled="!hasSelectedInterfaces || generatingTypes"
      >
        {{ generatingTypes ? '生成中...' : `生成 TypeScript 接口定义 (已选择${selectedInterfaceCount}个)` }}
      </el-button>
      <el-progress 
        v-if="generatingTypes" 
        :percentage="generationProgress" 
        :stroke-width="20" 
        :show-text="false"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { ElTree, ElMessage } from 'element-plus'
import { CircleCheck, Refresh, Folder } from '@element-plus/icons-vue'

// VSCode API 通信
const vscode = (window as any).acquireVsCodeApi()

// 类型定义
interface YapiInterface {
  id: number
  title: string
  path: string
  method: string
}

interface InterfaceCategory {
  id: string
  label: string
  isCategory: boolean
  interfaceCount: number
  list?: YapiInterface[]
}

// 状态管理
const yapiToken = ref('')
const savingToken = ref(false)
const tokenMessage = ref('')
const tokenMessageType = ref<'success' | 'warning' | 'error'>('success')

const categories = ref<InterfaceCategory[]>([])
const loadingInterfaces = ref(false)
const interfacesMessage = ref('')
const interfacesMessageType = ref<'success' | 'warning' | 'error'>('success')

const generatingTypes = ref(false)
const generationProgress = ref(0)

const treeRef = ref<InstanceType<typeof ElTree>>()

// Tree配置
const treeProps = {
  label: 'label',
  children: 'children',
  isLeaf: (data: any) => !data.isCategory
}

// 计算属性
const selectedInterfaceCount = computed(() => {
  const checkedKeys = treeRef.value?.getCheckedKeys() || []
  return checkedKeys.filter(key => typeof key === 'number').length
})

const hasSelectedInterfaces = computed(() => selectedInterfaceCount.value > 0)

// 方法
const saveToken = async () => {
  if (!yapiToken.value.trim()) {
    showTokenMessage('Token不能为空', 'error')
    return
  }

  savingToken.value = true
  try {
    vscode.postMessage({
      command: 'saveToken',
      token: yapiToken.value.trim()
    })
  } catch (error) {
    showTokenMessage('保存Token失败', 'error')
  } finally {
    savingToken.value = false
  }
}

const refreshInterfaces = async () => {
  if (!yapiToken.value.trim()) {
    showInterfacesMessage('请先输入并保存YAPI Token', 'warning')
    return
  }

  loadingInterfaces.value = true
  categories.value = []
  showInterfacesMessage('正在获取接口列表...', 'success')

  try {
    vscode.postMessage({
      command: 'refreshInterfaces',
      token: yapiToken.value.trim()
    })
  } catch (error) {
    showInterfacesMessage('刷新接口列表失败', 'error')
    loadingInterfaces.value = false
  }
}

const loadNode = (node: any, resolve: Function) => {
  if (node.level === 0) {
    // 根节点加载分类
    resolve(categories.value)
  } else if (node.data.isCategory) {
    // 分类节点加载接口
    const category = categories.value.find(cat => cat.id === node.data.id)
    if (category && category.list) {
      const interfaces = category.list.map(iface => ({
        id: iface.id,
        label: iface.title,
        path: iface.path,
        method: iface.method,
        isCategory: false
      }))
      resolve(interfaces)
    } else {
      resolve([])
    }
  } else {
    resolve([])
  }
}

const selectAll = () => {
  treeRef.value?.setCheckedKeys([])
  // 遍历所有分类，选择所有接口
  categories.value.forEach(category => {
    if (category.list) {
      const interfaceIds = category.list.map(iface => iface.id)
      treeRef.value?.setCheckedKeys([...treeRef.value?.getCheckedKeys() || [], ...interfaceIds])
    }
  })
}

const deselectAll = () => {
  treeRef.value?.setCheckedKeys([])
}

const handleCheckChange = () => {
  // 当选择发生变化时，可以在这里添加额外的逻辑
}

const generateTypescript = async () => {
  if (!hasSelectedInterfaces.value) {
    ElMessage.warning('请至少选择一个接口')
    return
  }

  generatingTypes.value = true
  generationProgress.value = 0

  try {
    // 获取选中的接口ID
    const selectedIds = treeRef.value?.getCheckedKeys() || []
    const interfaceIds = selectedIds.filter(id => typeof id === 'number')

    // 获取对应的接口对象
    const selectedInterfaces: YapiInterface[] = []
    categories.value.forEach(category => {
      if (category.list) {
        category.list.forEach(iface => {
          if (interfaceIds.includes(iface.id)) {
            selectedInterfaces.push(iface)
          }
        })
      }
    })

    vscode.postMessage({
      command: 'generateTypes',
      selectedInterfaces
    })
  } catch (error) {
    ElMessage.error('生成失败')
    generatingTypes.value = false
  }
}

const showTokenMessage = (message: string, type: 'success' | 'warning' | 'error' = 'success') => {
  tokenMessage.value = message
  tokenMessageType.value = type
  setTimeout(() => {
    tokenMessage.value = ''
  }, 3000)
}

const showInterfacesMessage = (message: string, type: 'success' | 'warning' | 'error' = 'success') => {
  interfacesMessage.value = message
  interfacesMessageType.value = type
  setTimeout(() => {
    interfacesMessage.value = ''
  }, 3000)
}

const getMethodType = (method: string): 'primary' | 'success' | 'warning' | 'danger' => {
  switch (method.toUpperCase()) {
    case 'GET':
      return 'primary'
    case 'POST':
      return 'success'
    case 'PUT':
      return 'warning'
    case 'DELETE':
      return 'danger'
    default:
      return 'info'
  }
}

// 生命周期
onMounted(() => {
  // 请求保存的Token
  vscode.postMessage({
    command: 'getToken'
  })

  // 监听来自VSCode的消息
  window.addEventListener('message', (event) => {
    const message = event.data
    switch (message.command) {
      case 'setToken':
        if (message.token) {
          yapiToken.value = message.token
          showTokenMessage('已加载保存的Token', 'success')
        }
        break
      case 'tokenSaved':
        if (message.success) {
          showTokenMessage('Token保存成功', 'success')
          // 自动刷新接口列表
          nextTick(() => refreshInterfaces())
        } else {
          showTokenMessage('Token已清空', 'warning')
        }
        break
      case 'interfacesLoaded':
        loadingInterfaces.value = false
        if (message.categories && message.categories.length > 0) {
          // 转换分类数据格式
          categories.value = message.categories.map((cat: any) => ({
            id: `category_${cat.name}`,
            label: cat.name,
            isCategory: true,
            interfaceCount: cat.list.length,
            list: cat.list
          }))
          showInterfacesMessage(`成功加载 ${message.total} 个接口`, 'success')
          // 重新加载树
          if (treeRef.value) {
            treeRef.value.setCheckedKeys([])
            treeRef.value.reload()
          }
        }
        break
      case 'interfacesLoadFailed':
        loadingInterfaces.value = false
        showInterfacesMessage(`加载接口失败: ${message.error}`, 'error')
        break
      case 'generationComplete':
        generatingTypes.value = false
        if (message.success && message.fileCount) {
          ElMessage.success(`成功生成 ${message.fileCount} 个接口定义文件`)
        } else {
          ElMessage.error(`生成失败: ${message.error || '未知错误'}`)
        }
        break
    }
  })
})
</script>

<style scoped>
.yapi2ts-container {
  padding: 20px;
  max-width: 100%;
}

.title {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
  color: #303133;
}

.title .el-icon {
  margin-right: 8px;
  font-size: 24px;
}

.token-card,
.interfaces-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.token-form {
  display: flex;
  gap: 10px;
}

.token-form .el-input {
  flex: 1;
}

.token-alert,
.interfaces-alert {
  margin-top: 10px;
}

.interface-node {
  display: flex;
  flex-direction: column;
}

.path-text {
  font-size: 12px;
  color: #606266;
  margin-top: 2px;
}

.method-badge {
  margin-right: 5px;
}

.category-node {
  display: flex;
  align-items: center;
}

.category-node .el-icon {
  margin-right: 5px;
}

.interface-count {
  font-size: 12px;
  color: #909399;
  margin-left: 5px;
}

.generate-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.generate-container .el-button {
  min-width: 300px;
}

.generate-container .el-progress {
  width: 100%;
  max-width: 300px;
}
</style>