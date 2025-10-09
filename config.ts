// 项目信息接口
export const getProjectInfo = (token: string) =>
  `http://yapi.tcy365.org:3000/api/project/get?token=${token}`;

// 获取列表下所有接口
export const getInterfaceList = (token: string, projectId: string | number) =>
  `http://yapi.tcy365.org:3000/api/interface/list?token=${token}&projectId=${projectId}&page=1&limit=1000`;

//获取接口菜单列表
export const getMenuInterfaceList = (
  token: string,
  projectId: string | number
) =>
  `http://yapi.tcy365.org:3000/api/interface/list_menu?token=${token}&projectId=${projectId}`;

// 单个接口详细信息
export const getSingleInterface = (
  token: string,
  interfaceId: string | number
) =>
  `http://yapi.tcy365.org:3000/api/interface/get?token=${token}&id=${interfaceId}`;

export const groupType = {
  460: 'FD_A', // 后台项目
  170: 'FD_P', // 前端项目
};
