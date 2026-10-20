<template>
  <div class="menu-page">
    <t-card :bordered="false">
      <template #title>
        <div class="card-title">菜单管理</div>
      </template>

      <!-- 搜索 -->
      <t-form :data="queryParams" layout="inline" @submit="handleQuery">
        <t-form-item label="菜单名称" name="menuName">
          <t-input v-model="queryParams.menuName" clearable placeholder="请输入菜单名称" />
        </t-form-item>
        <t-form-item label="状态" name="status">
          <dict-select
            v-model="queryParams.status"
            placeholder="菜单状态"
            style="width: 180px"
            type="sys_normal_disable"
          />
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
        <t-button v-hasPermi="['system:menu:add']" theme="primary" @click="handleAdd()">
          <template #icon><add-icon /></template>
          新增
        </t-button>
        <t-button theme="default" variant="outline" @click="toggleExpand">
          <template #icon><t-icon name="chevron-down" /></template>
          展开/折叠
        </t-button>
      </div>

      <t-enhanced-table
        ref="tableRef"
        :columns="columns"
        :data="menuList"
        :loading="loading"
        :tree="{ childrenKey: 'children', defaultExpandAll: true }"
        hover
        row-key="menuId"
      >
        <template #menuName="{ row }">
          <span class="menu-name">
            <svg-icon v-if="row.icon" :icon-class="row.icon" class="menu-icon" />
            {{ row.menuName }}
          </span>
        </template>
        <template #menuType="{ row }">
          <t-tag :theme="typeMeta(row).theme" variant="light">{{ typeMeta(row).label }}</t-tag>
        </template>
        <template #status="{ row }">
          <dict-tag :options="sys_normal_disable" :value="row.status" />
        </template>
        <template #createTime="{ row }">{{ parseTime(row.createTime) }}</template>
        <template #operation="{ row }">
          <t-space size="small">
            <t-link v-hasPermi="['system:menu:add']" hover="color" theme="primary" @click="handleAdd(row)">新增</t-link>
            <t-link v-hasPermi="['system:menu:edit']" hover="color" theme="primary" @click="handleUpdate(row)"
              >修改</t-link
            >
            <t-popconfirm content="是否确认删除该菜单?" @confirm="handleDelete(row)">
              <t-link v-hasPermi="['system:menu:remove']" hover="color" theme="danger">删除</t-link>
            </t-popconfirm>
          </t-space>
        </template>
      </t-enhanced-table>
    </t-card>

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
          <t-col :span="6">
            <t-form-item label="上级菜单" name="parentId">
              <t-tree-select
                v-model="form.parentId"
                :data="parentOptions"
                :keys="{ label: 'label', value: 'value', children: 'children' }"
                clearable
                filterable
                placeholder="请选择上级菜单"
              />
            </t-form-item>
          </t-col>
          <t-col :span="6">
            <t-form-item label="菜单类型" name="menuType">
              <t-radio-group v-model="form.menuType">
                <t-radio value="M">目录</t-radio>
                <t-radio value="C">菜单</t-radio>
                <t-radio value="F">按钮</t-radio>
              </t-radio-group>
            </t-form-item>
          </t-col>
        </t-row>
        <t-row>
          <t-col :span="6">
            <t-form-item label="菜单名称" name="menuName">
              <t-input v-model="form.menuName" placeholder="请输入菜单名称" />
            </t-form-item>
          </t-col>
          <t-col :span="6">
            <t-form-item label="显示排序" name="orderNum">
              <t-input-number v-model="form.orderNum" :min="0" />
            </t-form-item>
          </t-col>
        </t-row>

        <t-form-item v-if="form.menuType !== 'F'" label="菜单图标" name="icon">
          <icon-select v-model="form.icon" style="width: 260px" />
        </t-form-item>

        <t-row v-if="form.menuType !== 'F'">
          <t-col :span="6">
            <t-form-item label="路由地址" name="path">
              <t-input v-model="form.path" placeholder="请输入路由地址" />
            </t-form-item>
          </t-col>
          <t-col v-if="form.menuType === 'C'" :span="6">
            <t-form-item label="组件路径" name="component">
              <t-input v-model="form.component" placeholder="如 system/user/index" />
            </t-form-item>
          </t-col>
        </t-row>

        <t-row v-if="form.menuType !== 'M'">
          <t-col :span="6">
            <t-form-item label="权限标识" name="perms">
              <t-input v-model="form.perms" placeholder="如 system:user:list" />
            </t-form-item>
          </t-col>
          <t-col v-if="form.menuType === 'C'" :span="6">
            <t-form-item label="路由参数" name="queryParam">
              <t-input v-model="form.queryParam" placeholder='如 {"id": 1}' />
            </t-form-item>
          </t-col>
        </t-row>

        <t-row v-if="form.menuType !== 'F'">
          <t-col :span="6">
            <t-form-item label="是否外链" name="isFrame">
              <dict-select v-model="form.isFrame" placeholder="请选择" type="sys_yes_no" />
            </t-form-item>
          </t-col>
          <t-col v-if="form.menuType === 'C'" :span="6">
            <t-form-item label="是否缓存" name="isCache">
              <t-radio-group v-model="form.isCache">
                <t-radio value="Y">缓存</t-radio>
                <t-radio value="N">不缓存</t-radio>
              </t-radio-group>
            </t-form-item>
          </t-col>
        </t-row>

        <t-row>
          <t-col :span="6">
            <t-form-item label="显示状态" name="visible">
              <dict-select v-model="form.visible" placeholder="请选择" type="sys_show_hide" />
            </t-form-item>
          </t-col>
          <t-col :span="6">
            <t-form-item label="菜单状态" name="status">
              <dict-select v-model="form.status" placeholder="请选择" type="sys_normal_disable" />
            </t-form-item>
          </t-col>
        </t-row>

        <t-row v-if="form.visible !== '0'">
          <t-col :span="6">
            <t-form-item label="激活路由" name="activeMenu">
              <t-input v-model="form.activeMenu" placeholder="如 /system/user" />
            </t-form-item>
          </t-col>
        </t-row>

        <t-form-item label="备注" name="remark">
          <t-textarea v-model="form.remark" :autosize="{ minRows: 2 }" placeholder="请输入备注" />
        </t-form-item>
      </t-form>
    </t-dialog>
  </div>
</template>

<script lang="ts" setup>
import type { FormInstanceFunctions, FormRule, PrimaryTableCol } from 'tdesign-vue-next';
import { MessagePlugin } from 'tdesign-vue-next';
import { AddIcon, RefreshIcon, SearchIcon } from 'tdesign-icons-vue-next';
import { reactive, ref } from 'vue';

import type { MenuForm, MenuQuery, MenuTreeOption, MenuVO } from '@/api/system/menu/types';
import { addMenu, delMenu, listMenu, treeselect, updateMenu } from '@/api/system/menu';
import { useDict } from '@/utils/dict';
import { handleTree, parseTime } from '@/utils/ruoyi';

defineOptions({ name: 'SystemMenu' });

const { sys_normal_disable, sys_show_hide, sys_yes_no } = useDict('sys_normal_disable', 'sys_show_hide', 'sys_yes_no');

const menuList = ref<MenuVO[]>([]);
const loading = ref(false);
const tableRef = ref();
const isExpandAll = ref(true);

const queryParams = reactive<MenuQuery>({
  menuName: '',
  status: '',
});

const columns: PrimaryTableCol[] = [
  { colKey: 'menuName', title: '菜单名称', width: 240 },
  { colKey: 'menuType', title: '类型', width: 90, align: 'center' },
  { colKey: 'orderNum', title: '排序', width: 80, align: 'center' },
  { colKey: 'perms', title: '权限标识', width: 200, ellipsis: true },
  { colKey: 'path', title: '路由地址', width: 180, ellipsis: true },
  { colKey: 'component', title: '组件路径', width: 200, ellipsis: true },
  { colKey: 'status', title: '状态', width: 90, align: 'center' },
  { colKey: 'createTime', title: '创建时间', width: 180 },
  { colKey: 'operation', title: '操作', width: 200, fixed: 'right', align: 'center' },
];

const getList = async () => {
  loading.value = true;
  try {
    const res = await listMenu(queryParams);
    const data = Array.isArray(res?.data) ? res.data : [];
    menuList.value = handleTree<MenuVO>(data, 'menuId');
  } finally {
    loading.value = false;
  }
};

const handleQuery = () => getList();
const resetQuery = () => {
  queryParams.menuName = '';
  queryParams.status = '';
  getList();
};

const toggleExpand = () => {
  isExpandAll.value = !isExpandAll.value;
  if (isExpandAll.value) tableRef.value?.expandAll?.();
  else tableRef.value?.foldAll?.();
};

const typeMeta = (row: any): { label: string; theme: any } => {
  const t = row?.menuType;
  if (t === 'F') return { label: '按钮', theme: 'warning' };
  if (row?.isFrame === 'Y') return { label: '外链', theme: 'danger' };
  switch (t) {
    case 'M':
      return { label: '目录', theme: 'primary' };
    case 'C':
      return { label: '菜单', theme: 'success' };
    default:
      return { label: t, theme: 'default' };
  }
};

// ---- 表单 ----
const formRef = ref<FormInstanceFunctions>();
const dialogVisible = ref(false);
const dialogTitle = ref('');
const submitting = ref(false);
const parentOptions = ref<any[]>([]);

const initForm = (): MenuForm => ({
  parentId: 0,
  menuId: undefined,
  menuName: '',
  orderNum: 0,
  path: '',
  component: '',
  queryParam: '',
  isFrame: 'N',
  isCache: 'Y',
  menuType: 'M',
  visible: '0',
  status: '0',
  icon: '',
  remark: '',
  perms: '',
});

const form = reactive<MenuForm>(initForm());

const rules: Record<string, FormRule[]> = {
  menuName: [{ required: true, message: '请输入菜单名称', type: 'error' }],
  orderNum: [{ required: true, message: '请输入显示排序', type: 'error' }],
};

/** MenuTreeOption → t-tree-select 数据 */
const toTreeSelect = (list: MenuTreeOption[]): any[] => {
  return list.map((d) => ({
    label: d.label,
    value: d.id,
    children: d.children?.length ? toTreeSelect(d.children) : undefined,
  }));
};

const loadParentOptions = async () => {
  const res = await treeselect();
  const data = Array.isArray(res?.data) ? res.data : [];
  parentOptions.value = [{ label: '主类目', value: 0 }, ...toTreeSelect(data)];
};

const handleAdd = async (row?: MenuVO) => {
  Object.assign(form, initForm());
  if (row) form.parentId = row.menuId;
  await loadParentOptions();
  dialogTitle.value = '新增菜单';
  dialogVisible.value = true;
};

const handleUpdate = async (row: MenuVO) => {
  Object.assign(form, initForm());
  Object.assign(form, {
    parentId: row.parentId,
    menuId: row.menuId,
    menuName: row.menuName,
    orderNum: row.orderNum,
    path: row.path,
    component: row.component,
    queryParam: row.queryParam,
    isFrame: row.isFrame,
    isCache: row.isCache,
    menuType: row.menuType,
    visible: row.visible,
    status: row.status,
    icon: row.icon,
    remark: row.remark,
    perms: row.perms,
  });
  await loadParentOptions();
  dialogTitle.value = '修改菜单';
  dialogVisible.value = true;
};

const onSubmit = async () => {
  const valid = await formRef.value?.validate();
  if (valid !== true) return;
  submitting.value = true;
  try {
    if (form.menuId) {
      await updateMenu(form);
      MessagePlugin.success('修改成功');
    } else {
      await addMenu(form);
      MessagePlugin.success('新增成功');
    }
    dialogVisible.value = false;
    getList();
  } finally {
    submitting.value = false;
  }
};

const handleDelete = async (row: MenuVO) => {
  await delMenu(row.menuId);
  MessagePlugin.success('删除成功');
  getList();
};

getList();
</script>

<style lang="less" scoped>
.menu-page {
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
.menu-name {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.menu-icon {
  font-size: 16px;
}
</style>
