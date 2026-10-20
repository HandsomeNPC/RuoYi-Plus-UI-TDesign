<template>
  <div v-if="form.userName" class="profile-page">
    <t-row :gutter="16">
      <t-col :lg="6" :xs="24">
        <t-card :bordered="false">
          <div class="user-center">
            <t-avatar :image="avatarUrl" size="80px" />
            <div class="user-name">{{ form.nickName || form.userName }}</div>
            <div class="user-role">{{ roleGroup || '—' }}</div>
          </div>
        </t-card>
      </t-col>
      <t-col :lg="18" :xs="24">
        <t-card :bordered="false">
          <t-tabs v-model="activeTab">
            <t-tab-panel label="基本资料" value="base">
              <t-form ref="profileFormRef" :data="form" :rules="rules" class="profile-form" label-width="100px">
                <t-form-item label="用户名称" name="userName">
                  <t-input v-model="form.userName" disabled />
                </t-form-item>
                <t-form-item label="手机号码" name="phoneNumber">
                  <t-input v-model="form.phoneNumber" placeholder="请输入手机号码" />
                </t-form-item>
                <t-form-item label="邮箱" name="email">
                  <t-input v-model="form.email" placeholder="请输入邮箱" />
                </t-form-item>
                <t-form-item label="性别" name="gender">
                  <dict-select v-model="form.gender" placeholder="请选择" type="sys_user_sex" />
                </t-form-item>
                <t-form-item label="昵称" name="nickName">
                  <t-input v-model="form.nickName" placeholder="请输入昵称" />
                </t-form-item>
                <t-form-item>
                  <t-button :loading="saving" theme="primary" @click="handleSaveProfile">保存</t-button>
                  <t-button style="margin-left: 8px" theme="default" variant="outline" @click="handleClose"
                    >关闭</t-button
                  >
                </t-form-item>
              </t-form>
            </t-tab-panel>
            <t-tab-panel label="修改密码" value="pwd">
              <t-form ref="pwdFormRef" :data="pwdForm" :rules="pwdRules" class="profile-form" label-width="100px">
                <t-form-item label="旧密码" name="oldPassword">
                  <t-input v-model="pwdForm.oldPassword" clearable placeholder="请输入旧密码" type="password" />
                </t-form-item>
                <t-form-item label="新密码" name="newPassword">
                  <t-input v-model="pwdForm.newPassword" clearable placeholder="请输入新密码" type="password" />
                </t-form-item>
                <t-form-item label="确认密码" name="confirmPassword">
                  <t-input v-model="pwdForm.confirmPassword" clearable placeholder="请再次输入新密码" type="password" />
                </t-form-item>
                <t-form-item>
                  <t-button :loading="savingPwd" theme="primary" @click="handleSavePwd">保存</t-button>
                  <t-button style="margin-left: 8px" theme="default" variant="outline" @click="handleResetPwd"
                    >重置</t-button
                  >
                </t-form-item>
              </t-form>
            </t-tab-panel>
          </t-tabs>
        </t-card>
      </t-col>
    </t-row>
  </div>
</template>

<script lang="ts" setup>
import type { FormInstanceFunctions, FormRule } from 'tdesign-vue-next';
import { MessagePlugin } from 'tdesign-vue-next';
import { reactive, ref } from 'vue';

import type { UserProfileForm } from '@/api/system/user/types';
import { getUserProfile, updateUserProfile, updateUserPwd } from '@/api/system/user';
import { useUserStore } from '@/store';
import { useDict } from '@/utils/dict';

defineOptions({ name: 'UserProfile' });

const userStore = useUserStore();
const { sys_user_sex } = useDict('sys_user_sex');

const activeTab = ref('base');
const roleGroup = ref('');
const form = reactive<UserProfileForm>({
  nickName: '',
  phoneNumber: '',
  email: '',
  gender: '',
});
const avatarUrl = ref('');

const profileFormRef = ref<FormInstanceFunctions>();
const saving = ref(false);
const rules: Record<string, FormRule[]> = {
  nickName: [{ required: true, message: '请输入昵称', type: 'error' }],
};

const loadProfile = async () => {
  const res = await getUserProfile();
  const data = res?.data;
  if (data?.user) {
    const u = data.user;
    form.nickName = u.nickName;
    form.phoneNumber = u.phoneNumber;
    form.email = u.email;
    form.gender = u.gender;
    avatarUrl.value = u.avatarUrl ?? '';
    roleGroup.value = data.roleGroup ?? '';
    // 同步顶部用户名
    userStore.name = u.userName;
    userStore.nickname = u.nickName;
    userStore.avatar = u.avatarUrl ?? '';
  }
};

const handleSaveProfile = async () => {
  const valid = await profileFormRef.value?.validate();
  if (valid !== true) return;
  saving.value = true;
  try {
    await updateUserProfile(form);
    MessagePlugin.success('修改成功');
    userStore.nickname = form.nickName ?? '';
    loadProfile();
  } finally {
    saving.value = false;
  }
};

const pwdFormRef = ref<FormInstanceFunctions>();
const savingPwd = ref(false);
const pwdForm = reactive({ oldPassword: '', newPassword: '', confirmPassword: '' });
const pwdRules: Record<string, FormRule[]> = {
  oldPassword: [{ required: true, message: '请输入旧密码', type: 'error' }],
  newPassword: [
    { required: true, message: '请输入新密码', type: 'error' },
    { validator: (val) => val !== pwdForm.oldPassword, message: '新密码不能与旧密码相同', type: 'error' },
  ],
  confirmPassword: [
    { required: true, message: '请再次输入新密码', type: 'error' },
    { validator: (val) => val === pwdForm.newPassword, message: '两次输入的密码不一致', type: 'error' },
  ],
};

const handleSavePwd = async () => {
  const valid = await pwdFormRef.value?.validate();
  if (valid !== true) return;
  savingPwd.value = true;
  try {
    await updateUserPwd(pwdForm.oldPassword, pwdForm.newPassword);
    MessagePlugin.success('修改成功');
    handleResetPwd();
  } finally {
    savingPwd.value = false;
  }
};

const handleResetPwd = () => {
  pwdForm.oldPassword = '';
  pwdForm.newPassword = '';
  pwdForm.confirmPassword = '';
};

const handleClose = () => {
  window.history.length > 1 ? window.history.back() : null;
};

loadProfile();
</script>

<style lang="less" scoped>
.profile-page {
  padding: 16px;
}
.user-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
}
.user-name {
  font-size: 18px;
  font-weight: 600;
  color: var(--td-text-color-primary);
}
.user-role {
  color: var(--td-text-color-secondary);
}
.profile-form {
  max-width: 520px;
  margin-top: 12px;
}
</style>
