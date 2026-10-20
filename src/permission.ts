import 'nprogress/nprogress.css';

import NProgress from 'nprogress';
import { MessagePlugin } from 'tdesign-vue-next';

import router from '@/router';
import { getPermissionStore, useUserStore } from '@/store';
import { getToken } from '@/utils/auth';
import { isHandledRequestError } from '@/utils/request';
import { closePush, initMessageBox, initPush } from '@/utils/push';

NProgress.configure({ showSpinner: false });

const whiteList = ['/login'];

router.beforeEach(async (to, _from, next) => {
  NProgress.start();

  if (getToken()) {
    /* has token */
    if (to.path === '/login') {
      next({ path: '/' });
      return;
    }
    try {
      const userStore = useUserStore();
      const permissionStore = getPermissionStore();

      // 判断当前用户是否已拉取完 user_info 信息
      if (userStore.roles.length === 0) {
        await userStore.getInfo();
        // 启动统一消息推送（SSE/WebSocket，仅首次进入时初始化）
        initMessageBox();
        initPush();
      }

      // 根据权限生成可访问的路由表
      if (permissionStore.asyncRoutes.length === 0) {
        const accessRoutes = await permissionStore.buildAsyncRoutes();
        accessRoutes.forEach((route) => {
          router.addRoute(route);
        });
        // hack：确保 addRoute 完成后重新匹配
        next({ path: to.fullPath, replace: true });
        return;
      }

      next();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!isHandledRequestError(error)) {
        MessagePlugin.error(message);
      }
      closePush();
      await useUserStore().logout();
      next({ path: '/login', query: { redirect: to.fullPath } });
      NProgress.done();
    }
  } else {
    // 没有 token
    if (whiteList.includes(to.path)) {
      next();
    } else {
      next({ path: '/login', query: { redirect: to.fullPath } });
      NProgress.done();
    }
  }
});

router.afterEach(() => {
  NProgress.done();
});
