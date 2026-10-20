import cloneDeep from 'lodash/cloneDeep';
import { defineStore } from 'pinia';
import type { RouteRecordRaw } from 'vue-router';

import { getRouters } from '@/api/menu';
import router from '@/router';
import { store } from '@/store';
import { LAYOUT } from '@/utils/route/constant';

// 后端菜单组件串 → 前端组件 映射
const ParentView = () => import('@/components/ParentView/index.vue');
const InnerLink = () => import('@/components/InnerLink/index.vue');
const EXCEPTION_COMPONENT = () => import('@/pages/result/500/index.vue');

// 预建 pages 下所有 .vue 查找表，避免每次扫描
const modules = import.meta.glob('./../../pages/**/*.vue');
const viewModuleMap = new Map<string, () => Promise<any>>();
for (const path of Object.keys(modules)) {
  const idx = path.indexOf('/pages/');
  if (idx === -1) continue;
  const dir = path.substring(idx + 7, path.lastIndexOf('.vue'));
  viewModuleMap.set(dir, modules[path] as () => Promise<any>);
}

function toLocalizedTitle(title: any) {
  if (title && typeof title === 'object') return title;
  if (typeof title === 'string' && title) return { zh_CN: title, en_US: title };
  return title;
}

function loadView(view: string) {
  const loader = viewModuleMap.get(view) || viewModuleMap.get(view.replace(/^\//, ''));
  return loader || EXCEPTION_COMPONENT;
}

/**
 * 遍历后台路由，把 component 字符串解析为组件对象
 *  - 'Layout'   → 主体 Layout（含侧边栏/Header/内容区）
 *  - 'ParentView' → 纯 <router-view/> 容器
 *  - 'InnerLink'  → 内嵌 iframe
 *  - 其它        → pages 下对应组件
 */
function processRoute(route: any, isTop: boolean) {
  if (!route.meta) route.meta = {};
  route.meta.title = toLocalizedTitle(route.meta.title);

  // RuoYi 菜单 visible/status → starter 侧边栏 hidden
  // visible: '0' 显示 / '1' 隐藏（动态打开的路由，如分配角色，不应出现在菜单）
  // status:  '0' 正常 / '1' 停用（停用菜单不展示）
  const visible = route.meta.visible;
  const status = route.meta.status;
  if (visible === '1' || visible === 1 || status === '1' || status === 1) {
    route.meta.hidden = true;
  }

  const comp = route.component?.toString();
  if (comp === 'Layout' || comp === 'LAYOUT') {
    route.component = LAYOUT;
  } else if (comp === 'ParentView') {
    route.component = ParentView;
  } else if (comp === 'InnerLink') {
    route.component = InnerLink;
  } else if (route.component) {
    route.component = loadView(route.component);
  }

  // 顶层 path 补前导斜杠，便于 starter 侧边栏直接拼接
  if (isTop && route.path && !String(route.path).startsWith('/')) {
    route.path = '/' + route.path;
  }

  if (route.children && route.children.length) {
    route.children.forEach((child: any) => processRoute(child, false));
  } else {
    delete route.children;
    delete route.redirect;
  }
}

function filterAsyncRouter(asyncRouterMap: any[]): RouteRecordRaw[] {
  return asyncRouterMap.filter((route) => {
    processRoute(route, true);
    return true;
  }) as unknown as RouteRecordRaw[];
}

// 侧边栏首页入口（后端菜单通常不包含首页）
const HOME_MENU = {
  path: '/index',
  name: 'Index',
  meta: {
    title: { zh_CN: '首页', en_US: '首页' },
    icon: 'dashboard',
    affix: true,
  },
  children: [],
};

export const usePermissionStore = defineStore('permission', {
  state: () => ({
    whiteListRouters: ['/login'],
    routers: [] as Array<RouteRecordRaw>,
    removeRoutes: [] as Array<RouteRecordRaw>,
    asyncRoutes: [] as Array<RouteRecordRaw>,
  }),
  actions: {
    async initRoutes() {
      this.routers = cloneDeep([HOME_MENU, ...this.asyncRoutes]);
    },
    async buildAsyncRoutes() {
      const res = await getRouters();
      const data = Array.isArray(res?.data) ? res.data : [];
      const accessRoutes = filterAsyncRouter(cloneDeep(data));
      this.asyncRoutes = accessRoutes;
      await this.initRoutes();
      return accessRoutes;
    },
    async restoreRoutes() {
      this.asyncRoutes.forEach((item: RouteRecordRaw) => {
        if (item.name) router.removeRoute(item.name);
      });
      this.asyncRoutes = [];
      this.routers = [];
    },
  },
});

export function getPermissionStore() {
  return usePermissionStore(store);
}
