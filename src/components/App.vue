<template>
  <div class="container">
    <h1>YAPI 转 TypeScript</h1>

    <div class="input-group">
      <!-- <label for="token">项目 Token：</label> -->
      <el-input
        v-model="token"
        placeholder="请输入YAPI项目Token"
        clearable
        style="width: 100%; margin-bottom: 12px"
      />
      <el-button
        @click="fetchInterfaces"
        type="primary"
        :loading="loading"
        style="width: 100%"
      >
        获取接口列表
      </el-button>
    </div>

    <div v-if="interfaceCategories.length > 0" class="interfaces-container">
      <h2>选择要生成的接口：</h2>

      <!-- 使用el-select替换分类展开/收起逻辑 -->
      <div style="margin-bottom: 16px">
        <el-select
          v-model="selectedCategory"
          placeholder="选择接口分类"
          style="width: 100%"
        >
          <el-option label="全部接口" value="all" />
          <el-option
            v-for="category in interfaceCategories"
            :key="category.name"
            :label="category.name + ' (' + category.list.length + '个接口)'"
            :value="category.name"
          />
        </el-select>
      </div>

      <div class="select-controls">
        <el-button
          @click="selectAllInterfaces"
          type="default"
          size="small"
          class="select-btn"
          >全选</el-button
        >
        <el-button
          @click="deselectAllInterfaces"
          type="default"
          size="small"
          class="select-btn"
        >
          取消全选
        </el-button>
      </div>

      <!-- 接口列表，根据选择的分类显示 -->
      <div class="interface-list">
        <el-checkbox
          v-for="apiInterface in filteredInterfaces"
          :key="apiInterface.id"
          v-model="selectedInterfaces"
          :label="apiInterface"
          class="interface-item"
        >
          {{ apiInterface.title }} ({{ apiInterface.path }})
        </el-checkbox>
      </div>

      <el-button
        @click="generateTypeScript"
        :disabled="selectedInterfaces.length === 0"
        type="success"
        class="generate-button"
        style="width: 100%"
      >
        生成 TypeScript 接口定义
      </el-button>
    </div>

    <div v-if="loading && interfaceCategories.length === 0" class="loading">
      加载中...
    </div>
    <el-alert
      v-if="error"
      :message="error"
      type="error"
      show-icon
      style="margin-top: 20px"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import {
  getProjectInfo,
  getInterfaceList,
  getMenuInterfaceList,
  getSingleInterface,
} from '../../config';
// 导入VSCode集成工具
import {
  generateVSCodeCommand,
  showVSCodeCommandDialog,
  openVSCodeWithUrl,
} from '../utils/vscodeIntegration';

// 定义接口类型
interface YapiInterface {
  id: number;
  title: string;
  path: string;
  method: string;
  requestParams: Array<{
    name: string;
    type: string;
    required: boolean;
    description: string;
  }>;
  responseParams: Array<{ name: string; type: string; description: string }>;
}

// 定义接口分类类型
interface InterfaceCategory {
  name: string;
  list: YapiInterface[];
  isExpanded: boolean;
}

// 状态定义
const token = ref<string>('');
const interfaces = ref<YapiInterface[]>([]);
const interfaceCategories = ref<InterfaceCategory[]>([]);
const selectedInterfaces = ref<YapiInterface[]>([]);
const selectedCategory = ref<string>('all'); // 当前选中的分类
const loading = ref<boolean>(false);
const error = ref<string>('');

// 根据选中的分类过滤接口
const filteredInterfaces = computed(() => {
  if (selectedCategory.value === 'all') {
    // 显示所有接口
    return Array.from(interfaceCategories.value.values()).flatMap(
      (category) => category.list
    );
  } else {
    // 显示选中分类的接口
    const category = interfaceCategories.value.find(
      (cat) => cat.name === selectedCategory.value
    );
    return category ? category.list : [];
  }
});

// 获取接口列表
const fetchInterfaces = async () => {
  if (!token.value.trim()) {
    error.value = '请输入有效的项目Token';
    return;
  }

  loading.value = true;
  error.value = '';

  try {
    // 首先获取项目信息
    const projectInfoResponse = await fetch(getProjectInfo(token.value));
    const projectInfoData = await projectInfoResponse.json();

    if (!projectInfoData || projectInfoData.errcode !== 0) {
      throw new Error(
        '获取项目信息失败：' + (projectInfoData.errmsg || '未知错误')
      );
    }

    const projectId = projectInfoData.data._id;

    // 然后获取接口列表
    const interfaceListResponse = await fetch(
      getMenuInterfaceList(token.value, projectId)
    );
    const interfaceListData = await interfaceListResponse.json();

    if (!interfaceListData || interfaceListData.errcode !== 0) {
      throw new Error(
        '获取接口列表失败：' + (interfaceListData.errmsg || '未知错误')
      );
    }
    console.log(interfaceListData); // 打印接口列表数据

    // 处理接口数据，按分类组织
    const menuData = interfaceListData.data;

    // 首先处理不包含在菜单中的接口（如果有）
    const uncategorizedInterfaces: YapiInterface[] = [];

    // 处理菜单数据
    const categoryMap = new Map<string, YapiInterface[]>();

    menuData.forEach((item: any) => {
      // 如果是菜单项（有list属性）
      if (item.list && Array.isArray(item.list)) {
        const categoryName = item.name || '未分类';
        const categoryInterfaces = item.list.map((subItem: any) => ({
          id: subItem._id,
          title: subItem.title,
          path: subItem.path,
          method: subItem.method,
          requestParams: parseParams(subItem.req_params || []),
          responseParams: parseParams(
            subItem.res_body
              ? JSON.parse(subItem.res_body).properties || []
              : []
          ),
        }));
        categoryMap.set(categoryName, categoryInterfaces);
      } else if (!item.list) {
        // 如果是单独的接口（不在菜单中）
        uncategorizedInterfaces.push({
          id: item._id,
          title: item.title,
          path: item.path,
          method: item.method,
          requestParams: parseParams(item.req_params || []),
          responseParams: parseParams(
            item.res_body ? JSON.parse(item.res_body).properties || [] : []
          ),
        });
      }
    });

    // 添加未分类的接口（如果有）
    if (uncategorizedInterfaces.length > 0) {
      categoryMap.set('未分类', uncategorizedInterfaces);
    }

    // 转换为分类数组，并添加展开状态
    interfaceCategories.value = Array.from(categoryMap.entries()).map(
      ([name, list]) => ({
        name,
        list,
        isExpanded: true, // 默认展开所有分类
      })
    );

    // 同时保留原始接口列表，用于向后兼容
    interfaces.value = Array.from(categoryMap.values()).flat();
  } catch (err) {
    error.value = err instanceof Error ? err.message : '获取接口失败';
  } finally {
    loading.value = false;
  }
};

// 解析参数
const parseParams = (
  params: any[]
): Array<{
  name: string;
  type: string;
  required: boolean;
  description: string;
}> => {
  return params.map((param) => ({
    name: param.name || '',
    type: param.type || 'string',
    required: param.required || false,
    description: param.desc || '',
  }));
};

// 生成TypeScript接口定义
const generateTypeScript = async () => {
  if (selectedInterfaces.value.length === 0) {
    error.value = '请至少选择一个接口';
    return;
  }

  loading.value = true;
  error.value = '';

  try {
    // 对每个选中的接口调用单个接口详细信息接口
    const detailedInterfaces = await Promise.all(
      selectedInterfaces.value.map(async (iface) => {
        const response = await fetch(getSingleInterface(token.value, iface.id));
        const data = await response.json();

        if (!data || data.errcode !== 0) {
          throw new Error(
            `获取接口${iface.title}详细信息失败: ${data.errmsg || '未知错误'}`
          );
        }

        return data.data;
      })
    );

    // 生成单个接口的TypeScript代码
    console.log(detailedInterfaces, 'detailedInterfaces');
    const interfaceFiles = detailedInterfaces.map((detailedIface) => {
      let fileCode = `// YAPI接口定义转换的TypeScript类型\n// ${detailedIface.title}\n// 路径: ${detailedIface.path}\n// 方法: ${detailedIface.method}\n\n`;

      // 生成请求参数接口
      const reqParams = detailedIface.req_params || [];
      if (reqParams.length > 0) {
        fileCode += `// 请求参数接口\nexport interface ${getInterfaceName(
          detailedIface.title
        )}Request {\n`;
        reqParams.forEach((param: any) => {
          fileCode += `  ${param.name}${
            param.required ? '' : '?'
          }: ${convertYapiTypeToTsType(param.type)}; // ${param.desc || ''}\n`;
        });
        fileCode += '}\n\n';
      }

      // 生成查询参数接口
      const queryParams = detailedIface.req_query || [];
      if (queryParams.length > 0) {
        fileCode += `// 查询参数接口\nexport interface ${getInterfaceName(
          detailedIface.title
        )}Query {\n`;
        queryParams.forEach((param: any) => {
          fileCode += `  ${param.name}${
            param.required ? '' : '?'
          }: ${convertYapiTypeToTsType(param.type)}; // ${param.desc || ''}\n`;
        });
        fileCode += '}\n\n';
      }

      // 生成请求体接口
      if (detailedIface.req_body_other) {
        try {
          const reqBodyJson = JSON.parse(detailedIface.req_body_other);
          if (reqBodyJson && reqBodyJson.properties) {
            fileCode += `// 请求体接口\nexport interface ${getInterfaceName(
              detailedIface.title
            )}Body {\n`;
            Object.entries(reqBodyJson.properties).forEach(
              ([key, prop]: [string, any]) => {
                const required = reqBodyJson.required?.includes(key) || false;
                fileCode += `  ${key}${
                  required ? '' : '?'
                }: ${convertYapiTypeToTsType(prop.type || 'object')}; // ${
                  prop.description || ''
                }\n`;
              }
            );
            fileCode += '}\n\n';
          }
        } catch (e) {
          console.error('解析请求体失败:', e);
        }
      }

      // 生成返回参数接口
      if (detailedIface.res_body) {
        try {
          const resBodyJson = JSON.parse(detailedIface.res_body);
          if (resBodyJson && resBodyJson.properties) {
            fileCode += `// 返回参数接口\nexport interface ${getInterfaceName(
              detailedIface.title
            )}Response {\n`;
            Object.entries(resBodyJson.properties).forEach(
              ([key, prop]: [string, any]) => {
                fileCode += `  ${key}: ${convertYapiTypeToTsType(
                  prop.type || 'object'
                )}; // ${prop.description || ''}\n`;
              }
            );
            fileCode += '}\n\n';
          }
        } catch (e) {
          console.error('解析响应体失败:', e);
        }
      }

      return {
        filename: `${getInterfaceName(detailedIface.title)}.ts`,
        code: fileCode,
      };
    });

    // 同时生成一个汇总文件
    let summaryCode = '// YAPI接口定义汇总文件\n// 包含所有选择的接口定义\n\n';
    interfaceFiles.forEach((file) => {
      const interfaceName = file.filename.replace('.ts', '');
      summaryCode += `import type { ${interfaceName}Request, ${interfaceName}Response } from './${interfaceName}';\n`;
    });

    // 发送消息到background脚本，请求创建yapi文件夹和接口文件
    chrome.runtime.sendMessage(
      {
        action: 'generateTypes',
        interfaces: selectedInterfaces.value,
        interfaceFiles,
        summaryCode,
      },
      (response) => {
        // 尝试直接打开VSCode
        const tryOpenVSCode = () => {
          //   try {
          //     // 假设在当前目录下创建yapi文件夹
          //     const mockFilePath = 'D:/demo/FD_A_CtItemTradeAdmin'; // 这只是一个示例路径，实际路径需要根据用户环境调整
          //     openVSCodeWithUrl(mockFilePath);

          //     // 验证VSCode是否成功打开（这里只是一个简单的模拟验证）
          //     setTimeout(() => {
          //       // 如果没有收到失败的通知，假设VSCode成功打开
          //       console.log('VSCode已成功打开');
          //     }, 1000);
          //   } catch (error) {
          //     console.error('无法打开VSCode:', error);
          //     // 如果打开VSCode失败，生成命令并显示对话框
          //     generateAndShowVSCodeCommand();
          //   }
          generateAndShowVSCodeCommand();
        };

        // 生成VSCode命令并显示对话框
        const generateAndShowVSCodeCommand = () => {
          // 合并所有接口文件内容到一个大文件中，用于命令行生成
          let mergedCode = '// YAPI接口定义转换的TypeScript类型\n\n';
          interfaceFiles.forEach((file) => {
            mergedCode += file.code + '\n';
          });

          const { command, instructions } = generateVSCodeCommand(mergedCode);
          showVSCodeCommandDialog(command, instructions);
        };

        if (response && response.success) {
          // 首先尝试直接打开VSCode
          tryOpenVSCode();
        } else {
          // 如果background处理失败，直接显示命令对话框
          generateAndShowVSCodeCommand();
        }
      }
    );
  } catch (err) {
    error.value = err instanceof Error ? err.message : '生成接口定义失败';
    console.error('生成失败:', err);
  } finally {
    loading.value = false;
  }
};

// 将YAPI类型转换为TypeScript类型
const convertYapiTypeToTsType = (yapiType: string): string => {
  const typeMap: Record<string, string> = {
    string: 'string',
    number: 'number',
    boolean: 'boolean',
    array: 'any[]',
    object: 'object',
    null: 'null',
    undefined: 'undefined',
  };

  return typeMap[yapiType.toLowerCase()] || 'any';
};

// 获取接口名称
const getInterfaceName = (title: string): string => {
  return title
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
};

// 全选所有接口
const selectAllInterfaces = () => {
  selectedInterfaces.value = Array.from(
    interfaceCategories.value.values()
  ).flatMap((category) => category.list);
};

// 取消全选所有接口
const deselectAllInterfaces = () => {
  selectedInterfaces.value = [];
};
</script>

<style scoped>
/* 保留基本布局样式 */
.container {
  min-width: 400px;
  padding: 20px;
}

/* 标题样式 */
h1 {
  margin-bottom: 24px;
  text-align: center;
}

h2 {
  margin-bottom: 16px;
}

/* 输入组样式 */
.input-group {
  margin-bottom: 24px;
}

/* 接口列表容器 */
.interfaces-container {
  margin-top: 24px;
}

/* 全选/取消全选按钮样式 */
.select-controls {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

/* 接口列表样式 */
.interface-list {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  padding: 12px;
  /* Firefox滚动条样式 */
  scrollbar-width: thin;
  scrollbar-color: #c0c4cc #f0f2f5;
}

/* WebKit浏览器滚动条样式 */
.interface-list::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.interface-list::-webkit-scrollbar-track {
  background-color: #f0f2f5;
  border-radius: 3px;
}

.interface-list::-webkit-scrollbar-thumb {
  background-color: #c0c4cc;
  border-radius: 3px;
  transition: background-color 0.2s;
}

.interface-list::-webkit-scrollbar-thumb:hover {
  background-color: #909399;
}

.interface-list::-webkit-scrollbar-corner {
  background-color: #f0f2f5;
}

/* 接口项样式 */
.interface-item {
  margin-bottom: 8px;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.3s;
}

.interface-item:hover {
  background-color: #f5f7fa;
}

/* 生成按钮 */
.generate-button {
  margin-top: 16px;
}
</style>
