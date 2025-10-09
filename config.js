"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.groupType = exports.getSingleInterface = exports.getMenuInterfaceList = exports.getInterfaceList = exports.getProjectInfo = void 0;
// 项目信息接口
const getProjectInfo = (token) => `http://yapi.tcy365.org:3000/api/project/get?token=${token}`;
exports.getProjectInfo = getProjectInfo;
// 获取列表下所有接口
const getInterfaceList = (token, projectId) => `http://yapi.tcy365.org:3000/api/interface/list?token=${token}&projectId=${projectId}&page=1&limit=1000`;
exports.getInterfaceList = getInterfaceList;
//获取接口菜单列表
const getMenuInterfaceList = (token, projectId) => `http://yapi.tcy365.org:3000/api/interface/list_menu?token=${token}&projectId=${projectId}`;
exports.getMenuInterfaceList = getMenuInterfaceList;
// 单个接口详细信息
const getSingleInterface = (token, interfaceId) => `http://yapi.tcy365.org:3000/api/interface/get?token=${token}&id=${interfaceId}`;
exports.getSingleInterface = getSingleInterface;
exports.groupType = {
    460: 'FD_A', // 后台项目
    170: 'FD_P', // 前端项目
};
//# sourceMappingURL=config.js.map