<template>
  <div class="user-page">
    <t-row :gutter="12">
      <!-- 左侧部门树 -->
      <t-col :lg="4" :xs="24">
        <t-card :bordered="false" class="dept-card">
          <div class="dept-search">
            <t-input v-model="deptFilter" clearable placeholder="部门名称">
              <template #prefix-icon><t-icon name="search" /></template>
            </t-input>
          </div>
          <div class="dept-tree-wrap">
            <t-tree
              :data="deptTreeData"
              :keys="{ label: 'label', value: 'id', children: 'children' }"
              activable
              expand-all
              hover
              @active-change="onDeptActive"
            />
          </div>
        </t-card>
      </t-col>

      <!-- 右侧用户列表 -->
      <t-col :lg="20" :xs="24">
        <t-card :bordered="false">
          <template #title><div class="card-title">用户管理</div></template>

          <t-form :data="queryParams" layout="inline" @submit="handleQuery">
            <t-form-item label="用户名称" name="userName"
              ><t-input v-model="queryParams.userName" clearable placeholder="请输入用户名称"
            /></t-form-item>
            <t-form-item label="手机号码" name="phoneNumber"
              ><t-input v-model="queryParams.phoneNumber" clearable placeholder="请输入手机号码"
            /></t-form-item>
            <t-form-item label="状态" name="status"
              ><dict-select
                v-model="queryParams.status"
                placeholder="用户状态"
                style="width: 150px"
                type="sys_normal_disable"
            /></t-form-item>
            <t-form-item :style="{ marginLeft: 'auto' }">
              <t-space>
                <t-button theme="primary" type="submit"
                  ><template #icon><search-icon /></template>搜索</t-button
                >
                <t-button theme="default" @click="resetQuery"
                  ><template #icon><refresh-icon /></template>重置</t-button
                >
              </t-space>
            </t-form-item>
          </t-form>

          <div class="toolbar">
            <t-button v-hasPermi="['system:user:add']" theme="primary" @click="handleAdd"
              ><template #icon><add-icon /></template>新增</t-button
            >
            <t-button
              v-hasPermi="['system:user:edit']"
              :disabled="single"
              theme="success"
              variant="outline"
              @click="handleUpdate()"
              ><template #icon><edit-icon /></template>修改</t-button
            >
            <t-popconfirm content="是否确认删除选中的用户?" @confirm="handleDelete()">
              <t-button v-hasPermi="['system:user:remove']" :disabled="multiple" theme="danger" variant="outline"
                ><template #icon><delete-icon /></template>删除</t-button
              >
            </t-popconfirm>
            <t-button v-hasPermi="['system:user:export']" theme="warning" variant="outline" @click="handleExport"
              ><template #icon><download-icon /></template>导出</t-button
            >
          </div>

          <t-table
            :columns="columns"
            :data="list"
            :loading="loading"
            :pagination="pagination"
            :selected-row-keys="selectedKeys"
            hover
            row-key="userId"
            stripe
            @select-change="onSelectChange"
            @page-change="onPageChange"
          >
            <template #status="{ row }">
              <t-switch
                :disabled="row.userId === 1 || row.admin"
                :value="row.status === '0'"
                @change="(v: any) => handleStatusChange(row, v)"
              />
            </template>
            <template #createTime="{ row }">{{ parseTime(row.createTime) }}</template>
            <template #operation="{ row }">
              <t-space :breakLine="false" size="small">
                <t-link v-hasPermi="['system:user:edit']" hover="color" theme="primary" @click="handleUpdate(row)"
                  >修改</t-link
                >
                <t-link
                  v-if="row.userId !== 1"
                  v-hasPermi="['system:user:resetPwd']"
                  hover="color"
                  theme="primary"
                  @click="handleResetPwd(row)"
                  >重置密码</t-link
                >
                <t-popconfirm content="是否确认删除?" @confirm="handleDelete(row)">
                  <t-link v-hasPermi="['system:user:remove']" hover="color" theme="danger">删除</t-link>
                </t-popconfirm>
              </t-space>
            </template>
          </t-table>
        </t-card>
      </t-col>
    </t-row>

    <!-- 新增/修改 弹窗 -->
    <t-dialog
      v-model:visible="dialogVisible"
      :confirm-btn="{ loading: submitting }"
      :header="dialogTitle"
      :on-confirm="onSubmit"
      width="680px"
    >
      <t-form ref="formRef" :data="form" :rules="rules" label-width="100px" @submit="onSubmit">
        <t-row>
          <t-col :span="12">
            <t-form-item label="归属部门" name="deptId">
              <t-tree-select
                v-model="form.deptId"
                :data="deptOptions"
                :keys="{ label: 'label', value: 'id', children: 'children' }"
                clearable
                filterable
                placeholder="请选择归属部门"
              />
            </t-form-item>
          </t-col>
          <t-col :span="12">
            <t-form-item label="昵称" name="nickName"
              ><t-input v-model="form.nickName" placeholder="请输入昵称"
            /></t-form-item>
          </t-col>
        </t-row>
        <t-row>
          <t-col :span="12"
            ><t-form-item label="用户名称" name="userName"
              ><t-input v-model="form.userName" :disabled="!!form.userId" placeholder="请输入用户名称" /></t-form-item
          ></t-col>
          <t-col v-if="!form.userId" :span="12"
            ><t-form-item label="密码" name="password"
              ><t-input v-model="form.password" placeholder="请输入密码" type="password" /></t-form-item
          ></t-col>
        </t-row>
        <t-row>
          <t-col :span="12"
            ><t-form-item label="手机号码" name="phoneNumber"
              ><t-input v-model="form.phoneNumber" placeholder="请输入手机号码" /></t-form-item
          ></t-col>
          <t-col :span="12"
            ><t-form-item label="邮箱" name="email"
              ><t-input v-model="form.email" placeholder="请输入邮箱" /></t-form-item
          ></t-col>
        </t-row>
        <t-row>
          <t-col :span="12"
            ><t-form-item label="性别" name="gender"
              ><dict-select v-model="form.gender" placeholder="请选择" type="sys_user_sex" /></t-form-item
          ></t-col>
          <t-col :span="12"
            ><t-form-item label="状态" name="status"
              ><dict-select v-model="form.status" placeholder="请选择" type="sys_normal_disable" /></t-form-item
          ></t-col>
        </t-row>
        <t-row>
          <t-col :span="12"
            ><t-form-item label="岗位" name="postIds"
              ><t-select
                v-model="form.postIds"
                :options="postOptions"
                clearable
                filterable
                multiple
                placeholder="请选择岗位" /></t-form-item
          ></t-col>
          <t-col :span="12"
            ><t-form-item label="角色" name="roleIds"
              ><t-select
                v-model="form.roleIds"
                :options="roleOptions"
                clearable
                filterable
                multiple
                placeholder="请选择角色" /></t-form-item
          ></t-col>
        </t-row>
        <t-form-item label="备注" name="remark"
          ><t-textarea v-model="form.remark" :autosize="{ minRows: 2 }" placeholder="请输入备注"
        /></t-form-item>
      </t-form>
    </t-dialog>

    <!-- 重置密码 弹窗 -->
    <t-dialog
      v-model:visible="pwdDialogVisible"
      :confirm-btn="{ loading: resettingPwd }"
      :on-confirm="onResetPwd"
      header="重置密码"
      width="440px"
    >
      <t-form :data="pwdForm" label-width="100px">
        <t-form-item label="用户名称"><t-input v-model="pwdForm.userName" disabled /></t-form-item>
        <t-form-item label="新密码" name="password"
          ><t-input v-model="pwdForm.password" clearable placeholder="请输入新密码" type="password"
        /></t-form-item>
      </t-form>
    </t-dialog>
  </div>
</template>

<script lang="ts" setup>
import type { FormInstanceFunctions, FormRule, PageInfo, PrimaryTableCol } from 'tdesign-vue-next';
import { MessagePlugin } from 'tdesign-vue-next';
import { AddIcon, DeleteIcon, DownloadIcon, EditIcon, RefreshIcon, SearchIcon } from 'tdesign-icons-vue-next';
import { computed, reactive, ref } from 'vue';

import type { UserForm, UserQuery, UserVO } from '@/api/system/user/types';
import {
  addUser,
  changeUserStatus,
  delUser,
  deptTreeSelect,
  getUser,
  listUser,
  resetUserPwd,
  updateUser,
} from '@/api/system/user';
import { optionSelect as roleOptionSelect } from '@/api/system/role';
import { optionselect as postOptionSelect } from '@/api/system/post';
import { download } from '@/utils/request';
import { useDict } from '@/utils/dict';
import { parseTime } from '@/utils/ruoyi';

defineOptions({ name: 'SystemUser' });

const { sys_normal_disable, sys_user_sex } = useDict('sys_normal_disable', 'sys_user_sex');

const list = ref<UserVO[]>([]);
const loading = ref(false);
const selectedKeys = ref<(string | number)[]>([]);
const selectedRows = ref<UserVO[]>([]);
const single = computed(() => selectedRows.value.length !== 1);
const multiple = computed(() => selectedRows.value.length === 0);

const queryParams = reactive<UserQuery>({ pageNum: 1, pageSize: 10, userName: '', phoneNumber: '', status: '' });
const pagination = reactive({ current: 1, pageSize: 10, total: 0, showJumper: true });

const columns: PrimaryTableCol[] = [
  { colKey: 'row-select', type: 'multiple', width: 46, align: 'center' },
  { colKey: 'userId', title: '用户编号', width: 90, align: 'center' },
  { colKey: 'userName', title: '用户名称', width: 140 },
  { colKey: 'nickName', title: '用户昵称', width: 140 },
  { colKey: 'deptName', title: '归属部门', width: 160, ellipsis: true },
  { colKey: 'phoneNumber', title: '手机号码', width: 140 },
  { colKey: 'status', title: '状态', width: 90, align: 'center' },
  { colKey: 'createTime', title: '创建时间', width: 180 },
  { colKey: 'operation', title: '操作', width: 200, fixed: 'right', align: 'center' },
];

// 左侧部门树
const deptTreeData = ref<any[]>([]);
const deptOptions = ref<any[]>([]);
const deptFilter = ref('');

const loadDeptTree = async () => {
  const res = await deptTreeSelect();
  const data = (res?.data ?? []) as any[];
  deptTreeData.value = data;
  deptOptions.value = data;
};

const onDeptActive = (vals: Array<string | number>) => {
  queryParams.deptId = vals?.[0];
  queryParams.pageNum = 1;
  getList();
};

const getList = async () => {
  loading.value = true;
  try {
    const res = await listUser(queryParams);
    const data = res?.data;
    list.value = data?.rows ?? [];
    pagination.total = data?.total ?? 0;
    pagination.current = queryParams.pageNum;
    pagination.pageSize = queryParams.pageSize;
  } finally {
    loading.value = false;
  }
};

const onSelectChange = (keys: (string | number)[], options: any) => {
  selectedKeys.value = keys;
  selectedRows.value = options?.selectedRowData ?? [];
};
const onPageChange = (p: PageInfo) => {
  queryParams.pageNum = p.current;
  queryParams.pageSize = p.pageSize;
  getList();
};
const handleQuery = () => {
  queryParams.pageNum = 1;
  getList();
};
const resetQuery = () => {
  queryParams.userName = '';
  queryParams.phoneNumber = '';
  queryParams.status = '';
  queryParams.deptId = undefined;
  handleQuery();
};
const handleExport = () => download('/system/user/export', { ...queryParams }, `user_${Date.now()}.xlsx`);

const handleStatusChange = async (row: UserVO, v: any) => {
  const status = v ? '0' : '1';
  try {
    await changeUserStatus(row.userId, status);
    row.status = status;
    MessagePlugin.success('修改成功');
  } catch {
    /* ignore */
  }
};

// ---- 表单 ----
const formRef = ref<FormInstanceFunctions>();
const dialogVisible = ref(false);
const dialogTitle = ref('');
const submitting = ref(false);
const roleOptions = ref<{ label: string; value: string | number }[]>([]);
const postOptions = ref<{ label: string; value: string | number }[]>([]);

const initForm = (): UserForm => ({
  userId: undefined,
  deptId: undefined,
  userName: '',
  nickName: '',
  password: '',
  phoneNumber: '',
  email: '',
  gender: '0',
  status: '0',
  remark: '',
  postIds: [],
  roleIds: [],
});

const form = reactive<UserForm>(initForm());
const rules: Record<string, FormRule[]> = {
  userName: [{ required: true, message: '请输入用户名称', type: 'error' }],
  nickName: [{ required: true, message: '请输入昵称', type: 'error' }],
  password: [{ required: true, message: '请输入密码', type: 'error' }],
  deptId: [{ required: true, message: '请选择归属部门', type: 'error' }],
};

const loadRolePostOptions = async () => {
  const [rr, pr] = await Promise.all([roleOptionSelect([]), postOptionSelect()]);
  roleOptions.value = (rr?.data ?? []).map((r) => ({ label: r.roleName, value: r.roleId }));
  postOptions.value = (pr?.data ?? []).map((p) => ({ label: p.postName, value: p.postId }));
};

const handleAdd = async () => {
  Object.assign(form, initForm());
  await Promise.all([loadDeptTree(), loadRolePostOptions()]);
  dialogTitle.value = '新增用户';
  dialogVisible.value = true;
};

const handleUpdate = async (row?: UserVO) => {
  const t = row ?? selectedRows.value[0];
  if (!t) return;
  await Promise.all([loadDeptTree(), loadRolePostOptions()]);
  const res = await getUser(t.userId);
  const info = res?.data;
  const u = info?.user ?? t;
  Object.assign(form, initForm(), {
    userId: u.userId,
    deptId: u.deptId,
    userName: u.userName,
    nickName: u.nickName,
    phoneNumber: u.phoneNumber,
    email: u.email,
    gender: u.gender,
    status: u.status,
    remark: u.remark,
    postIds: info?.postIds ?? [],
    roleIds: info?.roleIds ?? [],
  });
  form.password = '';
  dialogTitle.value = '修改用户';
  dialogVisible.value = true;
};

const onSubmit = async () => {
  const valid = await formRef.value?.validate();
  if (valid !== true) return;
  submitting.value = true;
  try {
    if (form.userId) {
      await updateUser(form);
      MessagePlugin.success('修改成功');
    } else {
      await addUser(form);
      MessagePlugin.success('新增成功');
    }
    dialogVisible.value = false;
    getList();
  } finally {
    submitting.value = false;
  }
};

const handleDelete = async (row?: UserVO) => {
  const ids = row ? [row.userId] : selectedRows.value.map((r) => r.userId);
  if (!ids.length) return;
  await delUser(ids);
  MessagePlugin.success('删除成功');
  selectedKeys.value = [];
  selectedRows.value = [];
  getList();
};

// ---- 重置密码 ----
const pwdDialogVisible = ref(false);
const resettingPwd = ref(false);
const pwdForm = reactive({ userId: '' as string | number, userName: '', password: '' });
const handleResetPwd = (row: UserVO) => {
  pwdForm.userId = row.userId;
  pwdForm.userName = row.userName;
  pwdForm.password = '';
  pwdDialogVisible.value = true;
};
const onResetPwd = async () => {
  if (!pwdForm.password) {
    MessagePlugin.warning('请输入新密码');
    return;
  }
  resettingPwd.value = true;
  try {
    await resetUserPwd(pwdForm.userId, pwdForm.password);
    MessagePlugin.success('修改成功');
    pwdDialogVisible.value = false;
  } finally {
    resettingPwd.value = false;
  }
};

loadDeptTree();
getList();
</script>

<style lang="less" scoped>
.user-page {
  padding: 16px;
}
.card-title {
  font-weight: 600;
}
.toolbar {
  display: flex;
  gap: 8px;
  margin: 12px 0;
}
.dept-card {
  height: 100%;
}
.dept-search {
  margin-bottom: 8px;
}
.dept-tree-wrap {
  max-height: 600px;
  overflow: auto;
}
</style>
