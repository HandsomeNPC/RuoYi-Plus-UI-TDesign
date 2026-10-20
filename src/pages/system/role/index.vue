<template>
  <div class="role-page">
    <t-card :bordered="false">
      <template #title>
        <div class="card-title">角色管理</div>
      </template>

      <!-- 搜索 -->
      <t-form :data="queryParams" layout="inline" @submit="handleQuery">
        <t-form-item label="角色名称" name="roleName">
          <t-input v-model="queryParams.roleName" clearable placeholder="请输入角色名称" />
        </t-form-item>
        <t-form-item label="权限字符" name="roleKey">
          <t-input v-model="queryParams.roleKey" clearable placeholder="请输入权限字符" />
        </t-form-item>
        <t-form-item label="状态" name="status">
          <dict-select
            v-model="queryParams.status"
            placeholder="角色状态"
            style="width: 160px"
            type="sys_normal_disable"
          />
        </t-form-item>
        <t-form-item label="创建时间" name="dateRange">
          <t-date-range-picker v-model="dateRange" clearable style="width: 280px" value-type="YYYY-MM-DD HH:mm:ss" />
        </t-form-item>
        <t-form-item :style="{ marginLeft: 'auto' }">
          <t-space>
            <t-button theme="primary" type="submit">
              <template #icon><search-icon /></template>
              搜索
            </t-button>
            <t-button theme="default" @click="resetQuery">
              <template #icon><refresh-icon /></template>
              重置
            </t-button>
          </t-space>
        </t-form-item>
      </t-form>

      <div class="toolbar">
        <t-button v-hasPermi="['system:role:add']" theme="primary" @click="handleAdd">
          <template #icon><add-icon /></template>
          新增
        </t-button>
        <t-button
          v-hasPermi="['system:role:edit']"
          :disabled="single"
          theme="success"
          variant="outline"
          @click="handleUpdate()"
        >
          <template #icon><edit-icon /></template>
          修改
        </t-button>
        <t-popconfirm content="是否确认删除选中的角色?" @confirm="handleDelete()">
          <t-button v-hasPermi="['system:role:remove']" :disabled="multiple" theme="danger" variant="outline">
            <template #icon><delete-icon /></template>
            删除
          </t-button>
        </t-popconfirm>
        <t-button v-hasPermi="['system:role:export']" theme="warning" variant="outline" @click="handleExport">
          <template #icon><download-icon /></template>
          导出
        </t-button>
      </div>

      <t-table
        :columns="columns"
        :data="roleList"
        :loading="loading"
        :pagination="pagination"
        :selected-row-keys="selectedKeys"
        hover
        row-key="roleId"
        stripe
        @select-change="onSelectChange"
        @page-change="onPageChange"
      >
        <template #status="{ row }">
          <t-switch
            :disabled="row.admin"
            :value="row.status === '0'"
            @change="(v: any) => handleStatusChange(row, v)"
          />
        </template>
        <template #createTime="{ row }">{{ parseTime(row.createTime) }}</template>
        <template #operation="{ row }">
          <t-space size="small">
            <t-link v-hasPermi="['system:role:edit']" hover="color" theme="primary" @click="handleUpdate(row)"
              >修改权限</t-link
            >
            <t-link
              v-if="!isSuperAdminRole(row.roleId)"
              v-hasPermi="['system:role:edit']"
              hover="color"
              theme="primary"
              @click="handleAuthUser(row)"
              >分配用户</t-link
            >
            <t-popconfirm content="是否确认删除该角色?" @confirm="handleDelete(row)">
              <t-link v-hasPermi="['system:role:remove']" hover="color" theme="danger">删除</t-link>
            </t-popconfirm>
          </t-space>
        </template>
      </t-table>
    </t-card>

    <!-- 新增/修改 弹窗 -->
    <t-dialog
      v-model:visible="dialogVisible"
      :confirm-btn="{ loading: submitting }"
      :header="dialogTitle"
      :on-confirm="onSubmit"
      width="780px"
    >
      <t-tabs v-model="activeTab">
        <t-tab-panel label="基础信息" value="base">
          <t-form ref="formRef" :data="form" :rules="rules" label-width="100px">
            <t-row>
              <t-col :span="6">
                <t-form-item label="角色名称" name="roleName">
                  <t-input v-model="form.roleName" placeholder="请输入角色名称" />
                </t-form-item>
              </t-col>
              <t-col :span="6">
                <t-form-item label="权限字符" name="roleKey">
                  <t-input v-model="form.roleKey" placeholder="如 admin" />
                </t-form-item>
              </t-col>
            </t-row>
            <t-row>
              <t-col :span="6">
                <t-form-item label="显示排序" name="roleSort">
                  <t-input-number v-model="form.roleSort" :min="0" />
                </t-form-item>
              </t-col>
              <t-col :span="6">
                <t-form-item label="角色状态" name="status">
                  <dict-select v-model="form.status" placeholder="请选择" type="sys_normal_disable" />
                </t-form-item>
              </t-col>
            </t-row>
            <t-form-item label="备注" name="remark">
              <t-textarea v-model="form.remark" :autosize="{ minRows: 2 }" placeholder="请输入备注" />
            </t-form-item>
          </t-form>
        </t-tab-panel>

        <t-tab-panel label="菜单权限" value="menu">
          <div class="tree-toolbar">
            <t-checkbox v-model="form.menuCheckStrictly">父子联动</t-checkbox>
            <t-space size="small">
              <t-button size="small" theme="primary" variant="text" @click="expandMenuAll(true)">展开全部</t-button>
              <t-button size="small" theme="primary" variant="text" @click="expandMenuAll(false)">折叠全部</t-button>
              <t-button size="small" theme="primary" variant="text" @click="checkMenuAll(true)">全选</t-button>
              <t-button size="small" theme="primary" variant="text" @click="checkMenuAll(false)">全不选</t-button>
            </t-space>
          </div>
          <div class="tree-wrap">
            <t-tree
              ref="menuTreeRef"
              v-model="menuChecked"
              :check-strictly="form.menuCheckStrictly"
              :data="menuTree"
              :keys="{ label: 'label', value: 'id', children: 'children' }"
              checkable
              expand-all
              hover
            />
          </div>
        </t-tab-panel>

        <t-tab-panel label="数据权限" value="data">
          <t-form :data="form" label-width="100px">
            <t-form-item label="数据范围" name="dataScope">
              <t-select v-model="form.dataScope" :options="dataScopeOptions" />
            </t-form-item>
            <t-form-item v-if="form.dataScope === '2'" label="数据权限">
              <div class="tree-toolbar">
                <t-checkbox v-model="form.deptCheckStrictly">父子联动</t-checkbox>
                <t-space size="small">
                  <t-button size="small" theme="primary" variant="text" @click="expandDeptAll(true)">展开全部</t-button>
                  <t-button size="small" theme="primary" variant="text" @click="expandDeptAll(false)"
                    >折叠全部</t-button
                  >
                </t-space>
              </div>
              <div class="tree-wrap">
                <t-tree
                  ref="deptTreeRef"
                  v-model="deptChecked"
                  :check-strictly="form.deptCheckStrictly"
                  :data="deptTree"
                  :keys="{ label: 'label', value: 'id', children: 'children' }"
                  checkable
                  expand-all
                  hover
                />
              </div>
            </t-form-item>
          </t-form>
        </t-tab-panel>
      </t-tabs>
    </t-dialog>
  </div>
</template>

<script lang="ts" setup>
import type { FormInstanceFunctions, FormRule, PageInfo, PrimaryTableCol } from 'tdesign-vue-next';
import { MessagePlugin } from 'tdesign-vue-next';
import { AddIcon, DeleteIcon, DownloadIcon, EditIcon, RefreshIcon, SearchIcon } from 'tdesign-icons-vue-next';
import { computed, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

import type { RoleForm, RoleQuery, RoleVO } from '@/api/system/role/types';
import {
  addRole,
  changeRoleStatus,
  delRole,
  deptTreeSelect,
  listRole,
  updateRole,
  updateRolePermission,
} from '@/api/system/role';
import type { MenuTreeOption } from '@/api/system/menu/types';
import { roleMenuTreeselect, treeselect as menuTreeselect } from '@/api/system/menu';
import type { DeptVO } from '@/api/system/dept/types';
import { listDept } from '@/api/system/dept';
import { isSuperAdminRole } from '@/constants';
import { download } from '@/utils/request';
import { useDict } from '@/utils/dict';
import { useDateRangeQuery } from '@/hooks/useDateRangeQuery';
import { handleTree, parseTime } from '@/utils/ruoyi';

defineOptions({ name: 'SystemRole' });

const router = useRouter();

const { sys_normal_disable } = useDict('sys_normal_disable');
const { dateRange, applyDateRange, resetDateRange } = useDateRangeQuery();

const roleList = ref<RoleVO[]>([]);
const loading = ref(false);
const selectedKeys = ref<(string | number)[]>([]);
const selectedRows = ref<RoleVO[]>([]);

const queryParams = reactive<RoleQuery>({
  pageNum: 1,
  pageSize: 10,
  roleName: '',
  roleKey: '',
  status: '',
});

const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
  showJumper: true,
});

const single = computed(() => selectedRows.value.length !== 1);
const multiple = computed(() => selectedRows.value.length === 0);

const columns: PrimaryTableCol[] = [
  { colKey: 'row-select', type: 'multiple', width: 46, align: 'center' },
  { colKey: 'roleId', title: '角色编号', width: 100, align: 'center' },
  { colKey: 'roleName', title: '角色名称', width: 160 },
  { colKey: 'roleKey', title: '权限字符', width: 200, ellipsis: true },
  { colKey: 'roleSort', title: '显示顺序', width: 100, align: 'center' },
  { colKey: 'status', title: '状态', width: 100, align: 'center' },
  { colKey: 'createTime', title: '创建时间', width: 180 },
  { colKey: 'operation', title: '操作', width: 240, fixed: 'right', align: 'center' },
];

const getList = async () => {
  loading.value = true;
  try {
    const res = await listRole(applyDateRange(queryParams));
    const data = res?.data;
    roleList.value = data?.rows ?? [];
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

const onPageChange = (pageInfo: PageInfo) => {
  queryParams.pageNum = pageInfo.current;
  queryParams.pageSize = pageInfo.pageSize;
  getList();
};

const handleQuery = () => {
  queryParams.pageNum = 1;
  getList();
};

const resetQuery = () => {
  queryParams.roleName = '';
  queryParams.roleKey = '';
  queryParams.status = '';
  resetDateRange();
  handleQuery();
};

const handleStatusChange = async (row: RoleVO, v: any) => {
  const status = v ? '0' : '1';
  try {
    await changeRoleStatus(row.roleId, status);
    row.status = status;
    MessagePlugin.success('修改成功');
  } catch {
    // 失败保持原状
  }
};

// ---- 表单 ----
const formRef = ref<FormInstanceFunctions>();
const dialogVisible = ref(false);
const dialogTitle = ref('');
const submitting = ref(false);
const activeTab = ref('base');

const menuTreeRef = ref();
const deptTreeRef = ref();

const menuTree = ref<MenuTreeOption[]>([]);
const menuChecked = ref<Array<string | number>>([]);
const deptTree = ref<any[]>([]);
const deptChecked = ref<Array<string | number>>([]);

const initForm = (): RoleForm => ({
  roleId: undefined,
  roleName: '',
  roleKey: '',
  roleSort: 0,
  status: '0',
  menuCheckStrictly: true,
  deptCheckStrictly: true,
  remark: '',
  dataScope: '1',
  menuIds: [],
  deptIds: [],
});

const form = reactive<RoleForm>(initForm());

const rules: Record<string, FormRule[]> = {
  roleName: [{ required: true, message: '请输入角色名称', type: 'error' }],
  roleKey: [{ required: true, message: '请输入权限字符', type: 'error' }],
  roleSort: [{ required: true, message: '请输入显示排序', type: 'error' }],
};

const dataScopeOptions = [
  { label: '全部数据', value: '1' },
  { label: '自定义数据', value: '2' },
  { label: '本部门数据', value: '3' },
  { label: '本部门及以下数据', value: '4' },
  { label: '仅本人数据', value: '5' },
];

const toDeptTreeSelect = (list: DeptVO[]): any[] => {
  return list.map((d) => ({
    id: d.deptId,
    label: d.deptName,
    children: d.children?.length ? toDeptTreeSelect(d.children) : undefined,
  }));
};

const handleAdd = async () => {
  Object.assign(form, initForm());
  menuChecked.value = [];
  deptChecked.value = [];
  activeTab.value = 'base';
  // 菜单树
  const mres = await menuTreeselect();
  menuTree.value = (mres?.data ?? []) as MenuTreeOption[];
  // 部门树
  const dres = await listDept();
  deptTree.value = toDeptTreeSelect(handleTree<DeptVO>((dres?.data ?? []) as DeptVO[], 'deptId'));
  dialogTitle.value = '新增角色';
  dialogVisible.value = true;
};

const handleUpdate = async (row?: RoleVO) => {
  const target = row ?? selectedRows.value[0];
  if (!target) return;
  Object.assign(form, initForm());
  activeTab.value = 'base';
  // 基本信息
  Object.assign(form, {
    roleId: target.roleId,
    roleName: target.roleName,
    roleKey: target.roleKey,
    roleSort: target.roleSort,
    status: target.status,
    remark: target.remark ?? '',
    dataScope: target.dataScope,
    menuCheckStrictly: target.menuCheckStrictly,
    deptCheckStrictly: target.deptCheckStrictly,
  });
  // 菜单树 + 已选
  const mres = await roleMenuTreeselect(target.roleId);
  menuTree.value = (mres?.data?.menus ?? []) as MenuTreeOption[];
  // 严格模式下展示已选，避免父级联动勾选全部子级
  menuChecked.value = (mres?.data?.checkedKeys ?? []) as Array<string | number>;
  // 部门树 + 已选
  const dres = await deptTreeSelect(target.roleId);
  deptTree.value = (dres?.data?.depts ?? []) as any[];
  deptChecked.value = (dres?.data?.checkedKeys ?? []) as Array<string | number>;
  dialogTitle.value = '修改角色';
  dialogVisible.value = true;
};

const expandMenuAll = (expand: boolean) => {
  const inst = menuTreeRef.value;
  if (expand) inst?.expandAll?.();
  else inst?.foldAll?.();
};
const checkMenuAll = (check: boolean) => {
  menuChecked.value = check ? collectKeys(menuTree.value, 'id') : [];
};
const expandDeptAll = (expand: boolean) => {
  const inst = deptTreeRef.value;
  if (expand) inst?.expandAll?.();
  else inst?.foldAll?.();
};

const collectKeys = (nodes: any[], key: string): Array<string | number> => {
  const res: Array<string | number> = [];
  const walk = (list: any[]) => {
    list.forEach((n) => {
      res.push(n[key]);
      if (n.children?.length) walk(n.children);
    });
  };
  walk(nodes);
  return res;
};

const onSubmit = async () => {
  if (activeTab.value !== 'base') {
    // 切回基础信息标签以触发校验展示
    activeTab.value = 'base';
  }
  const valid = await formRef.value?.validate();
  if (valid !== true) return;
  submitting.value = true;
  try {
    form.menuIds = [...menuChecked.value];
    form.deptIds = form.dataScope === '2' ? [...deptChecked.value] : [];
    if (form.roleId) {
      await updateRole(form);
      await updateRolePermission({
        roleId: form.roleId,
        menuIds: form.menuIds,
        deptIds: form.deptIds,
        dataScope: form.dataScope,
        menuCheckStrictly: form.menuCheckStrictly,
        deptCheckStrictly: form.deptCheckStrictly,
      });
      MessagePlugin.success('修改成功');
    } else {
      await addRole(form);
      MessagePlugin.success('新增成功');
    }
    dialogVisible.value = false;
    getList();
  } finally {
    submitting.value = false;
  }
};

const handleDelete = async (row?: RoleVO) => {
  const ids = row ? [row.roleId] : selectedRows.value.map((r) => r.roleId);
  if (!ids.length) return;
  await delRole(ids);
  MessagePlugin.success('删除成功');
  selectedKeys.value = [];
  selectedRows.value = [];
  getList();
};

// ---- 分配用户 ----
const handleAuthUser = (row: RoleVO) => {
  router.push(`/system/role-auth/user/${row.roleId}`);
};

// ---- 导出 ----
const handleExport = () => download('/system/role/export', { ...queryParams }, `role_${Date.now()}.xlsx`);

getList();
</script>

<style lang="less" scoped>
.role-page {
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
.tree-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.tree-wrap {
  max-height: 360px;
  overflow: auto;
  border: 1px solid var(--td-component-stroke);
  border-radius: var(--td-radius-default);
  padding: 8px;
}
</style>
