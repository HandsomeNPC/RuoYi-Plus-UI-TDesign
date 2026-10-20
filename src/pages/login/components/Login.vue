<template>
  <t-form
    ref="form"
    class="item-container"
    :class="[`login-${type}`]"
    :data="formData"
    :rules="FORM_RULES"
    label-width="0"
    @submit="onSubmit"
  >
    <template v-if="type === 'password'">
      <t-form-item name="username">
        <t-input
          v-model="formData.username"
          clearable
          placeholder="请输入用户名"
          size="large"
          @keyup.enter="handleEnter"
        >
          <template #prefix-icon>
            <t-icon name="user" />
          </template>
        </t-input>
      </t-form-item>

      <t-form-item name="password">
        <t-input
          v-model="formData.password"
          size="large"
          :type="showPsw ? 'text' : 'password'"
          clearable
          placeholder="请输入密码"
          @keyup.enter="handleEnter"
        >
          <template #prefix-icon>
            <t-icon name="lock-on" />
          </template>
          <template #suffix-icon>
            <t-icon :name="showPsw ? 'browse' : 'browse-off'" @click="showPsw = !showPsw" />
          </template>
        </t-input>
      </t-form-item>

      <t-form-item v-if="captchaEnabled" name="code">
        <div class="code-container">
          <t-input
            v-model="formData.code"
            autocomplete="off"
            clearable
            placeholder="请输入验证码"
            size="large"
            @keyup.enter="handleEnter"
          >
            <template #prefix-icon>
              <t-icon name="safe" />
            </template>
          </t-input>
          <img v-if="codeImg" :src="codeImg" alt="验证码" class="code-img" title="点击刷新" @click="getCode" />
        </div>
      </t-form-item>

      <div class="check-container remember-pwd">
        <t-checkbox v-model="formData.rememberMe">记住密码</t-checkbox>
      </div>
    </template>

    <t-form-item class="btn-container">
      <t-button :loading="loading" block size="large" type="submit">登录</t-button>
    </t-form-item>

    <!-- 第三方登录 -->
    <div class="social-panel">
      <span class="social-label">第三方登录</span>
      <div class="social-actions">
        <t-button shape="circle" theme="default" title="微信" variant="outline" @click="doSocialLogin('wechat')">
          <template #icon><t-icon name="logo-wechat" /></template>
        </t-button>
        <t-button shape="circle" theme="default" title="MaxKey" variant="outline" @click="doSocialLogin('maxkey')">
          <template #icon><t-icon name="user" /></template>
        </t-button>
        <t-button shape="circle" theme="default" title="TopIAM" variant="outline" @click="doSocialLogin('topiam')">
          <template #icon><t-icon name="user" /></template>
        </t-button>
        <t-button shape="circle" theme="default" title="Gitee" variant="outline" @click="doSocialLogin('gitee')">
          <template #icon><t-icon name="logo-gitee" /></template>
        </t-button>
        <t-button shape="circle" theme="default" title="GitHub" variant="outline" @click="doSocialLogin('github')">
          <template #icon><t-icon name="logo-github" /></template>
        </t-button>
      </div>
    </div>

    <!-- 立即注册 -->
    <div class="register-link">
      还没有账号？
      <t-link hover="color" theme="primary" @click="goRegister">立即注册</t-link>
    </div>
  </t-form>
</template>
<script setup lang="ts">
import type { FormInstanceFunctions, FormRule, SubmitContext } from 'tdesign-vue-next';
import { MessagePlugin } from 'tdesign-vue-next';
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { getCodeImg } from '@/api/login';
import { authRouterUrl } from '@/api/system/social/auth';
import { useUserStore } from '@/store';

const userStore = useUserStore();

const INITIAL_DATA = {
  username: 'admin',
  password: 'admin123',
  code: '',
  uuid: '',
  rememberMe: false,
};

const FORM_RULES: Record<string, FormRule[]> = {
  username: [{ required: true, message: '请输入用户名', type: 'error' }],
  password: [{ required: true, message: '请输入密码', type: 'error' }],
  code: [{ required: true, message: '请输入验证码', type: 'error' }],
};

const type = ref('password');

const form = ref<FormInstanceFunctions>();
const formData = ref({ ...INITIAL_DATA });
const showPsw = ref(false);
const loading = ref(false);

const captchaEnabled = ref(false);
const codeImg = ref('');

const router = useRouter();
const route = useRoute();

/** 获取验证码 */
const getCode = async () => {
  try {
    const res = await getCodeImg();
    const data = res?.data;
    captchaEnabled.value = !!data?.captchaEnabled;
    if (captchaEnabled.value) {
      codeImg.value = data!.img ? `data:image/gif;base64,${data!.img}` : '';
      formData.value.uuid = data!.uuid ?? '';
    }
  } catch (e) {
    console.error(e);
  }
};

getCode();

/** 回车提交 */
const handleEnter = () => {
  form.value?.submit();
};

/** 第三方登录：拿授权跳转 URL 后整页跳转，回调到 /social-callback */
const doSocialLogin = (source: string) => {
  authRouterUrl(source).then((res: any) => {
    if (res?.data) {
      window.location.href = res.data;
    }
  });
};

/** 跳转注册页 */
const goRegister = () => {
  router.push('/register');
};

const onSubmit = async (ctx: SubmitContext) => {
  if (ctx.validateResult !== true) return;
  loading.value = true;
  try {
    await userStore.login({
      ...formData.value,
      clientId: import.meta.env.VITE_APP_CLIENT_ID,
      grantType: 'password',
    });
    MessagePlugin.success('登录成功');
    const redirect = route.query.redirect as string;
    router.push(redirect || '/');
  } catch (e: unknown) {
    // 失败后刷新验证码
    getCode();
    MessagePlugin.error(e instanceof Error ? e.message : '登录失败');
  } finally {
    loading.value = false;
  }
};
</script>
<style lang="less" scoped>
@import '../index.less';

.code-container {
  display: flex;
  width: 100%;
  gap: 12px;
  align-items: center;

  :deep(.t-input) {
    flex: 1;
  }

  .code-img {
    height: 40px;
    width: 120px;
    cursor: pointer;
    border-radius: var(--td-radius-medium);
    object-fit: cover;
  }
}
.social-panel {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 16px;
}
.social-label {
  font-size: 13px;
  color: var(--td-text-color-secondary);
  white-space: nowrap;
}
.social-actions {
  display: flex;
  gap: 8px;
}
.register-link {
  margin-top: 16px;
  text-align: center;
  font-size: 13px;
  color: var(--td-text-color-secondary);
}
</style>
