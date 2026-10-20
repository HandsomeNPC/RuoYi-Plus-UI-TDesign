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
  </t-form>
</template>
<script setup lang="ts">
import type { FormInstanceFunctions, FormRule, SubmitContext } from 'tdesign-vue-next';
import { MessagePlugin } from 'tdesign-vue-next';
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { getCodeImg } from '@/api/login';
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
</style>
