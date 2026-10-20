import type { AxiosPromise } from '@/utils/api-types';
import request from '@/utils/request';

import type { LoginData, LoginResult, RegisterForm, VerifyCodeResult } from './types';

// pc 端固定客户端授权 id
const clientId = import.meta.env.VITE_APP_CLIENT_ID;

/**
 * 登录
 * @param data {LoginData}
 */
export function login(data: LoginData): AxiosPromise<LoginResult> {
  const params = {
    ...data,
    clientId: data.clientId || clientId,
    grantType: data.grantType || 'password',
  };
  return request({
    url: '/auth/login',
    headers: {
      isToken: false,
      isEncrypt: 'true',
      repeatSubmit: false,
    },
    method: 'post',
    data: params,
  });
}

/**
 * 注销
 */
export function logout() {
  return request({
    url: '/auth/logout',
    method: 'post',
  });
}

/**
 * 注册
 */
export function register(data: RegisterForm) {
  const params = {
    ...data,
    clientId,
    grantType: 'password',
  };
  return request({
    url: '/auth/register',
    headers: {
      isToken: false,
      isEncrypt: 'true',
      repeatSubmit: false,
    },
    method: 'post',
    data: params,
  });
}

/**
 * 获取验证码
 */
export function getCodeImg(): AxiosPromise<VerifyCodeResult> {
  return request({
    url: '/auth/code',
    headers: {
      isToken: false,
    },
    method: 'get',
    timeout: 20000,
  });
}

/**
 * 获取用户详细信息
 */
export function getInfo(): AxiosPromise<{
  user: {
    userId: string | number;
    userName: string;
    nickName: string;
    avatarUrl?: string;
    [key: string]: any;
  };
  roles: string[];
  permissions: string[];
}> {
  return request({
    url: '/system/user/getInfo',
    method: 'get',
  });
}
