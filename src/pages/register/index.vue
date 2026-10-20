<template>
  <div class="register-wrapper">
    <login-header />
    <div class="register-container">
      <div class="title-container">
        <h1 class="title">账号注册</h1>
        <p class="sub-title">
          <span class="tip">已有账号？</span>
          <span class="tip login-link" @click="goLogin">去登录</span>
        </p>
      </div>

      <t-form ref="form" :data="formData" :rules="FORM_RULES" label-width="0" @submit="onSubmit">
        <t-form-item name="username">
          <t-input v-model="formData.username" clearable placeholder="请输入账号" size="large">
            <template #prefix-icon><t-icon name="user" /></template>
          </t-input>
        </t-form-item>

        <t-form-item name="password">
          <t-input
            v-model="formData.password"
            :type="showPsw ? 'text' : 'password'"
            clearable
            placeholder="请输入密码"
            size="large"
          >
            <template #prefix-icon><t-icon name="lock-on" /></template>
            <template #suffix-icon>
              <t-icon :name="showPsw ? 'browse' : 'browse-off'" @click="showPsw = !showPsw" />
            </template>
          </t-input>
        </t-form-item>

        <t-form-item name="confirmPassword">
          <t-input
            v-model="formData.confirmPassword"
            :type="showPsw ? 'text' : 'password'"
            clearable
            placeholder="请再次输入密码"
            size="large"
          >
            <template #prefix-icon><t-icon name="lock-on" /></template>
          </t-input>
        </t-form-item>

        <t-form-item v-if="captchaEnabled" name="code">
          <div class="code-container">
            <t-input v-model="formData.code" autocomplete="off" clearable placeholder="请输入验证码" size="large">
              <template #prefix-icon><t-icon name="safe" /></template>
            </t-input>
            <img v-if="codeImg" :src="codeImg" alt="验证码" class="code-img" title="点击刷新" @click="getCode" />
          </div>
        </t-form-item>

        <t-form-item>
          <t-button :loading="loading" block size="large" type="submit">注册</t-button>
        </t-form-item>
      </t-form>
    </div>
    <footer class="copyright">Copyright © RuoYi-Vue-Plus TDesign</footer>
  </div>
</template>

<script lang="ts" setup>
import type { FormInstanceFunctions, FormRule, SubmitContext } from 'tdesign-vue-next';
import { MessagePlugin } from 'tdesign-vue-next';
import { ref } from 'vue';
import { useRouter } from 'vue-router';

import { getCodeImg, register } from '@/api/login';
import LoginHeader from '@/pages/login/components/Header.vue';

defineOptions({ name: 'RegisterIndex' });

const router = useRouter();

const INITIAL = { username: '', password: '', confirmPassword: '', code: '', uuid: '', userType: '00' };
const FORM_RULES: Record<string, FormRule[]> = {
  username: [{ required: true, message: '请输入账号', type: 'error' }],
  password: [
    { required: true, message: '请输入密码', type: 'error' },
    { min: 5, message: '密码长度不能少于5位', type: 'error' },
  ],
  confirmPassword: [
    { required: true, message: '请再次输入密码', type: 'error' },
    { validator: (val) => val === formData.value.password, message: '两次输入的密码不一致', type: 'error' },
  ],
  code: [{ required: true, message: '请输入验证码', type: 'error' }],
};

const form = ref<FormInstanceFunctions>();
const formData = ref({ ...INITIAL });
const showPsw = ref(false);
const loading = ref(false);
const captchaEnabled = ref(false);
const codeImg = ref('');

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

const onSubmit = async (ctx: SubmitContext) => {
  if (ctx.validateResult !== true) return;
  loading.value = true;
  try {
    await register(formData.value);
    MessagePlugin.success('注册成功');
    goLogin();
  } catch (e: unknown) {
    getCode();
    MessagePlugin.error(e instanceof Error ? e.message : '注册失败');
  } finally {
    loading.value = false;
  }
};

const goLogin = () => {
  router.push('/login');
};
</script>

<style lang="less" scoped>
@import '../login/index.less';

.register-container {
  max-width: 420px;
  margin: 0 auto;
}
.title {
  font-size: 28px;
  font-weight: 600;
  text-align: center;
  margin: 0 0 16px;
}
.sub-title {
  text-align: center;
  margin-bottom: 24px;
}
.tip {
  color: var(--td-text-color-secondary);
}
.login-link {
  color: var(--td-brand-color);
  cursor: pointer;
}
.code-container {
  display: flex;
  width: 100%;
  gap: 12px;
  align-items: center;
}
.code-container :deep(.t-input) {
  flex: 1;
}
.code-img {
  height: 40px;
  width: 120px;
  cursor: pointer;
  border-radius: var(--td-radius-medium);
  object-fit: cover;
}
.copyright {
  text-align: center;
  color: var(--td-text-color-secondary);
  margin-top: 48px;
}
</style>
