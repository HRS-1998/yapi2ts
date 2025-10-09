import * as fs from 'fs';
import * as path from 'path';
import fetch from 'node-fetch';

// 引入config.ts中的接口定义
import {
  getProjectInfo,
  getMenuInterfaceList,
  getSingleInterface,
} from './config';

// YAPI接口定义接口
export interface YapiInterface {
  id: number;
  title: string;
  path: string;
  method: string;
  requestParams?: Array<{
    name: string;
    type: string;
    required: boolean;
    description: string;
  }>;
  responseParams?: Array<{ name: string; type: string; description: string }>;
  [key: string]: any;
}

// 定义接口分类类型
export interface InterfaceCategory {
  name: string;
  list: YapiInterface[];
  isExpanded: boolean;
}

// 生成结果接口
interface GenerateResult {
  success: boolean;
  fileCount?: number;
  error?: string;
}

/**
 * 获取YAPI接口列表（带分类）
 * @param token YAPI项目Token
 * @returns 接口分类列表
 */
export async function fetchYapiInterfaces(
  token: string
): Promise<InterfaceCategory[]> {
  try {
    if (!token.trim()) {
      throw new Error('请输入有效的项目Token');
    }

    // 首先获取项目信息
    const projectInfoResponse = await fetch(getProjectInfo(token));
    const projectInfoData = (await projectInfoResponse.json()) as {
      errcode: number;
      errmsg?: string;
      data?: { _id: number };
    };

    if (!projectInfoData || projectInfoData.errcode !== 0) {
      throw new Error(
        '获取项目信息失败：' + (projectInfoData.errmsg || '未知错误')
      );
    }

    const projectId = projectInfoData.data?._id;
    if (!projectId) {
      throw new Error('未找到项目ID');
    }

    // 然后获取接口列表（带菜单）
    const interfaceListResponse = await fetch(
      getMenuInterfaceList(token, projectId)
    );
    const interfaceListData = (await interfaceListResponse.json()) as {
      errcode: number;
      errmsg?: string;
      data?: any[];
    };

    if (!interfaceListData || interfaceListData.errcode !== 0) {
      throw new Error(
        '获取接口列表失败：' + (interfaceListData.errmsg || '未知错误')
      );
    }

    // 处理接口数据，按分类组织
    const menuData = interfaceListData.data || [];

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
    return Array.from(categoryMap.entries()).map(([name, list]) => ({
      name,
      list,
      isExpanded: true, // 默认展开所有分类
    }));
  } catch (error) {
    console.error('获取YAPI接口列表失败:', error);
    throw new Error(
      `获取YAPI接口列表失败: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * 解析参数
 */
function parseParams(params: any[]): Array<{
  name: string;
  type: string;
  required: boolean;
  description: string;
}> {
  return params.map((param) => ({
    name: param.name || '',
    type: param.type || 'string',
    required: param.required || false,
    description: param.desc || '',
  }));
}

/**
 * 获取接口详情
 * @param token YAPI项目Token
 * @param interfaceId 接口ID
 * @returns 接口详情
 */
export async function getInterfaceDetail(
  token: string,
  interfaceId: string | number
): Promise<any> {
  try {
    const response = await fetch(getSingleInterface(token, interfaceId));
    const data = (await response.json()) as {
      errcode: number;
      errmsg?: string;
      data?: any;
    };

    if (!data || data.errcode !== 0) {
      throw new Error(`获取接口详情失败: ${data.errmsg || '未知错误'}`);
    }

    return data.data || {};
  } catch (error) {
    console.error(`获取接口详情失败(ID: ${interfaceId}):`, error);
    // 在出错时返回基础数据结构，避免整个生成过程失败
    return {
      id: interfaceId,
      title: '未知接口',
      path: '/unknown',
      method: 'GET',
    };
  }
}

/**
 * 将YAPI类型转换为TypeScript类型
 * @param typeInfo YAPI类型或属性对象
 * @param propName 属性名称，用于生成接口名称
 * @returns TypeScript类型
 */
export function convertYapiTypeToTsType(
  typeInfo: string | any,
  propName?: string
): string {
  // 定义通用的类型映射
  const typeMap: Record<string, string> = {
    string: 'string',
    number: 'number',
    integer: 'number',
    boolean: 'boolean',
    array: 'any[]',
    object: 'object',
    null: 'null',
    undefined: 'undefined',
  };

  // 如果typeInfo是字符串，直接进行基本类型映射
  if (typeof typeInfo === 'string') {
    return typeMap[typeInfo.toLowerCase()] || 'any';
  }

  // 如果typeInfo是对象，处理复杂类型
  const type = typeInfo.type || 'object';
  const propKey = propName || 'Unknown';

  // 处理联合类型 (如: {"type": ["string", "null"]})
  if (Array.isArray(type)) {
    const types = type.map((t) => t.toLowerCase()).filter((t) => typeMap[t]);
    if (types.length > 1) {
      return types.map((t) => typeMap[t]).join(' | ');
    } else if (types.length === 1) {
      return typeMap[types[0]] || 'any';
    }
  }

  switch (type.toLowerCase()) {
    case 'array':
      if (typeInfo.items) {
        // 处理数组类型，如果有items属性
        const itemType = convertYapiTypeToTsType(
          typeInfo.items,
          `${propKey}Item`
        );
        return `${itemType}[]`;
      }
      return 'any[]';

    case 'object':
      if (typeInfo.properties) {
        // 处理对象类型，如果有properties属性
        // 生成内联类型定义
        let propertiesDef = '{' + '\n';
        Object.entries(typeInfo.properties).forEach(
          ([key, prop]: [string, any]) => {
            const required = typeInfo.required?.includes(key) || false;
            propertiesDef += `  ${key}${
              required ? '' : '?'
            }: ${convertYapiTypeToTsType(prop, key)};\n`;
          }
        );
        propertiesDef += '}';
        return propertiesDef;
      }
      return 'object';

    default:
      // 对于其他基本类型，使用简单映射
      return typeMap[type.toLowerCase()] || 'any';
  }
}

/**
 * 获取接口名称
 * @param title 接口标题
 * @returns 接口名称
 */
export function getInterfaceName(path: string): string {
  return path.split('/').pop()!;
}

/**
 * 生成TypeScript文件
 * @param interfaces 要生成的接口列表
 * @param outputDir 输出目录
 * @param token YAPI项目Token
 * @returns 生成结果
 */
export async function generateTypeScriptFiles(
  interfaces: YapiInterface[],
  outputDir: string,
  token: string
): Promise<GenerateResult> {
  try {
    let fileCount = 0;
    // let summaryCode = '// YAPI接口定义汇总文件\n// 包含所有选择的接口定义\n\n';

    // 确保输出目录存在
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // 对每个选中的接口调用单个接口详细信息接口
    const detailedInterfaces = await Promise.all(
      interfaces.map(async (iface) => {
        try {
          return await getInterfaceDetail(token, iface.id);
        } catch (error) {
          console.error(`获取接口${iface.title}详细信息失败:`, error);
          // 返回原始接口信息作为备选
          return iface;
        }
      })
    );

    // 为每个接口生成单独的文件
    for (const detailedIface of detailedInterfaces) {
      try {
        // 生成接口文件内容
        const fileContent = generateInterfaceFileContent(detailedIface);
        const interfaceName = getInterfaceName(detailedIface.path);
        const filename = `${interfaceName}.ts`;
        const filePath = path.join(outputDir, filename);

        // 写入文件
        fs.writeFileSync(filePath, fileContent, 'utf-8');
        fileCount++;

        // // 添加到汇总文件
        // summaryCode += `import type { ${interfaceName}Request, ${interfaceName}Response, ${interfaceName}Query, ${interfaceName}Body } from './${interfaceName}';\n`;
      } catch (error) {
        console.error(`生成接口文件失败(${detailedIface.title}):`, error);
        // 继续处理其他接口，不中断整个过程
      }
    }

    // 生成汇总文件
    if (fileCount > 0) {
      //   const summaryFilePath = path.join(outputDir, 'interfaces.ts');
      //   fs.writeFileSync(summaryFilePath, summaryCode, 'utf-8');
    }

    return { success: true, fileCount };
  } catch (error) {
    console.error('生成TypeScript文件失败:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * 生成单个接口文件的内容
 * @param detailedIface 接口详细信息
 * @returns 接口文件内容
 */
function generateInterfaceFileContent(detailedIface: any): string {
  let fileCode = `// YAPI接口定义转换的TypeScript类型
// ${detailedIface.title}
// 路径: ${detailedIface.path}
// 方法: ${detailedIface.method}

`;

  const interfaceName = getInterfaceName(detailedIface.path);
  let hasParamsInterface = false;
  let hasQueryInterface = false;
  let hasBodyInterface = false;

  // 生成请求参数接口
  const reqParams = detailedIface.req_params || [];
  if (reqParams.length > 0) {
    hasParamsInterface = true;
    fileCode += `// 路径参数接口
export interface ${interfaceName}RequestParams {
`;
    reqParams.forEach((param: any) => {
      fileCode += `  ${param.name}${
        param.required ? '' : '?'
      }: ${convertYapiTypeToTsType(param.type)}; ${
        param.desc ? `// ${param.desc}` : ''
      }
`;
    });
    fileCode += '}\n\n';
  }

  // 生成查询参数接口
  const queryParams = detailedIface.req_query || [];
  if (queryParams.length > 0) {
    hasQueryInterface = true;
    fileCode += `// 查询参数接口
export interface ${interfaceName}RequestQuery {
`;
    queryParams.forEach((param: any) => {
      fileCode += `  ${param.name}${
        param.required ? '' : '?'
      }: ${convertYapiTypeToTsType(param.type)}; ${
        param.desc ? `// ${param.desc}` : ''
      }
`;
    });
    fileCode += '}\n\n';
  }

  // 生成请求体接口
  if (detailedIface.req_body_other) {
    try {
      const reqBodyJson = JSON.parse(detailedIface.req_body_other);
      if (reqBodyJson && reqBodyJson.properties) {
        hasBodyInterface = true;
        fileCode += `// 请求体接口
export interface ${interfaceName}RequestBody {
`;
        Object.entries(reqBodyJson.properties).forEach(
          ([key, prop]: [string, any]) => {
            const required = reqBodyJson.required?.includes(key) || false;
            fileCode += `  ${key}${
              required ? '' : '?'
            }: ${convertYapiTypeToTsType(prop, key)};  ${
              prop.description ? `// ${prop.description}` : ''
            }
`;
          }
        );
        fileCode += '}\n\n';
      }
    } catch (e) {
      console.error('解析请求体失败:', e);
    }
  }

  // 生成统一的请求接口（如果有多个类型的请求参数）
  const requestInterfaces: string[] = [];
  if (hasParamsInterface)
    requestInterfaces.push(`${interfaceName}RequestParams`);
  if (hasQueryInterface) requestInterfaces.push(`${interfaceName}RequestQuery`);
  if (hasBodyInterface) requestInterfaces.push(`${interfaceName}RequestBody`);

  if (requestInterfaces.length > 0) {
    fileCode += `// 统一请求类型
export interface ${interfaceName}Request {
`;
    if (requestInterfaces.length > 1) {
      // 如果有多个接口，使用交叉类型
      fileCode += `  // 组合了以下类型: ${requestInterfaces.join(', ')}
  // 注意: 实际使用时根据API调用方式选择相应的参数类型
`;
    }
    fileCode += '}\n\n';

    // 添加类型工具函数，帮助组合不同类型的请求参数
    fileCode += `// 类型工具: 创建完整请求对象
export type ${interfaceName}FullRequest = ${requestInterfaces.join(
      ' & '
    )};\n\n`;
    fileCode += `// 类型工具: 参数类型选择器
export type ${interfaceName}Params<T extends 'params' | 'query' | 'body' | 'full'> = T extends 'params' ? ${interfaceName}RequestParams :\n`;
    fileCode += `  T extends 'query' ? ${interfaceName}RequestQuery :\n`;
    fileCode += `  T extends 'body' ? ${interfaceName}RequestBody :\n`;
    fileCode += `  ${interfaceName}FullRequest;\n\n`;
  }

  // 生成返回参数接口
  if (detailedIface.res_body) {
    try {
      const resBodyJson = JSON.parse(detailedIface.res_body);
      if (resBodyJson && resBodyJson.properties) {
        fileCode += `// 返回参数接口
export interface ${interfaceName}Response {
`;
        Object.entries(resBodyJson.properties).forEach(
          ([key, prop]: [string, any]) => {
            fileCode += `  ${key}: ${convertYapiTypeToTsType(prop, key)}; // ${
              prop.description || ''
            }
`;
          }
        );
        fileCode += '}\n\n';
      }
    } catch (e) {
      console.error('解析响应体失败:', e);
    }
  }

  return fileCode;
}
