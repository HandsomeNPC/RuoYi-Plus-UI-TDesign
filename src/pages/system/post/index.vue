<template>
  <div class="post-page">
    <t-card :bordered="false">
      <template #title><div class="card-title">岗位管理</div></template>

      <t-form :data="queryParams" layout="inline" @submit="handleQuery">
        <t-form-item label="岗位名称" name="postName">
          <t-input v-model="queryParams.postName" clearable placeholder="请输入岗位名称" />
        </t-form-item>
        <t-form-item label="岗位编码" name="postCode">
          <t-input v-model="queryParams.postCode" clearable placeholder="请输入岗位编码" />
        </t-form-item>
        <t-form-item label="状态" name="status">
          <dict-select
            v-model="queryParams.status"
            placeholder="岗位状态"
            style="width: 160px"
            type="sys_normal_disable"
          />
        </t-form-item>
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
        <t-button v-hasPermi="['system:post:add']" theme="primary" @click="handleAdd"
          ><template #icon><add-icon /></template>新增</t-button
        >
        <t-button
          v-hasPermi="['system:post:edit']"
          :disabled="single"
          theme="success"
          variant="outline"
          @click="handleUpdate()"
          ><template #icon><edit-icon /></template>修改</t-button
        >
        <t-popconfirm content="是否确认删除选中的岗位?" @confirm="handleDelete()">
          <t-button v-hasPermi="['system:post:remove']" :disabled="multiple" theme="danger" variant="outline"
            ><template #icon><delete-icon /></template>删除</t-button
          >
        </t-popconfirm>
        <t-button v-hasPermi="['system:post:export']" theme="warning" variant="outline" @click="handleExport"
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
        row-key="postId"
        stripe
        @select-change="onSelectChange"
        @page-change="onPageChange"
      >
        <template #status="{ row }"><dict-tag :options="sys_normal_disable" :value="row.status" /></template>
        <template #createTime="{ row }">{{ parseTime(row.createTime) }}</template>
        <template #operation="{ row }">
          <t-space size="small">
            <t-link v-hasPermi="['system:post:edit']" hover="color" theme="primary" @click="handleUpdate(row)"
              >修改</t-link
            >
            <t-popconfirm content="是否确认删除?" @confirm="handleDelete(row)">
              <t-link v-hasPermi="['system:post:remove']" hover="color" theme="danger">删除</t-link>
            </t-popconfirm>
          </t-space>
        </template>
      </t-table>
    </t-card>

    <t-dialog
      v-model:visible="dialogVisible"
      :confirm-btn="{ loading: submitting }"
      :header="dialogTitle"
      :on-confirm="onSubmit"
      width="560px"
    >
      <t-form ref="formRef" :data="form" :rules="rules" label-width="90px" @submit="onSubmit">
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
        <t-row>
          <t-col :span="12"
            ><t-form-item label="岗位名称" name="postName"
              ><t-input v-model="form.postName" placeholder="请输入岗位名称" /></t-form-item
          ></t-col>
          <t-col :span="12"
            ><t-form-item label="岗位编码" name="postCode"
              ><t-input v-model="form.postCode" placeholder="请输入岗位编码" /></t-form-item
          ></t-col>
        </t-row>
        <t-row>
          <t-col :span="12"
            ><t-form-item label="显示顺序" name="postSort"
              ><t-input-number v-model="form.postSort" :min="0" /></t-form-item
          ></t-col>
          <t-col :span="12"
            ><t-form-item label="岗位状态" name="status"
              ><dict-select v-model="form.status" placeholder="请选择" type="sys_normal_disable" /></t-form-item
          ></t-col>
        </t-row>
        <t-form-item label="备注" name="remark"
          ><t-textarea v-model="form.remark" :autosize="{ minRows: 2 }" placeholder="请输入备注"
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

import type { PostForm, PostQuery, PostVO } from '@/api/system/post/types';
import { addPost, delPost, deptTreeSelect, listPost, updatePost } from '@/api/system/post';
import { download } from '@/utils/request';
import { useDict } from '@/utils/dict';
import { parseTime } from '@/utils/ruoyi';

defineOptions({ name: 'SystemPost' });

const { sys_normal_disable } = useDict('sys_normal_disable');

const list = ref<PostVO[]>([]);
const loading = ref(false);
const selectedKeys = ref<(string | number)[]>([]);
const selectedRows = ref<PostVO[]>([]);
const single = computed(() => selectedRows.value.length !== 1);
const multiple = computed(() => selectedRows.value.length === 0);

const queryParams = reactive<PostQuery>({ pageNum: 1, pageSize: 10, postName: '', postCode: '', status: '' });
const pagination = reactive({ current: 1, pageSize: 10, total: 0, showJumper: true });

const columns: PrimaryTableCol[] = [
  { colKey: 'row-select', type: 'multiple', width: 46, align: 'center' },
  { colKey: 'postId', title: '岗位编号', width: 100, align: 'center' },
  { colKey: 'postName', title: '岗位名称', width: 160 },
  { colKey: 'postCode', title: '岗位编码', width: 160 },
  { colKey: 'deptName', title: '归属部门', width: 160, ellipsis: true },
  { colKey: 'postSort', title: '排序', width: 80, align: 'center' },
  { colKey: 'status', title: '状态', width: 90, align: 'center' },
  { colKey: 'createTime', title: '创建时间', width: 180 },
  { colKey: 'operation', title: '操作', width: 160, fixed: 'right', align: 'center' },
];

const getList = async () => {
  loading.value = true;
  try {
    const res = await listPost(queryParams);
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
  queryParams.postName = '';
  queryParams.postCode = '';
  queryParams.status = '';
  handleQuery();
};

const handleExport = () => download('/system/post/export', { ...queryParams }, `post_${Date.now()}.xlsx`);

// form
const formRef = ref<FormInstanceFunctions>();
const dialogVisible = ref(false);
const dialogTitle = ref('');
const submitting = ref(false);
const deptOptions = ref<any[]>([]);
const initForm = (): PostForm => ({
  postId: undefined,
  deptId: undefined,
  postCode: '',
  postName: '',
  postCategory: '',
  postSort: 0,
  status: '0',
  remark: '',
});
const form = reactive<PostForm>(initForm());
const rules: Record<string, FormRule[]> = {
  postName: [{ required: true, message: '请输入岗位名称', type: 'error' }],
  postCode: [{ required: true, message: '请输入岗位编码', type: 'error' }],
  postSort: [{ required: true, message: '请输入显示顺序', type: 'error' }],
};

const loadDeptOptions = async () => {
  const res = await deptTreeSelect();
  deptOptions.value = (res?.data ?? []) as any[];
};

const handleAdd = async () => {
  Object.assign(form, initForm());
  await loadDeptOptions();
  dialogTitle.value = '新增岗位';
  dialogVisible.value = true;
};
const handleUpdate = async (row?: PostVO) => {
  const t = row ?? selectedRows.value[0];
  if (!t) return;
  Object.assign(form, initForm(), {
    postId: t.postId,
    deptId: t.deptId,
    postCode: t.postCode,
    postName: t.postName,
    postCategory: t.postCategory,
    postSort: t.postSort,
    status: t.status,
    remark: t.remark,
  });
  await loadDeptOptions();
  dialogTitle.value = '修改岗位';
  dialogVisible.value = true;
};
const onSubmit = async () => {
  const valid = await formRef.value?.validate();
  if (valid !== true) return;
  submitting.value = true;
  try {
    if (form.postId) {
      await updatePost(form);
      MessagePlugin.success('修改成功');
    } else {
      await addPost(form);
      MessagePlugin.success('新增成功');
    }
    dialogVisible.value = false;
    getList();
  } finally {
    submitting.value = false;
  }
};
const handleDelete = async (row?: PostVO) => {
  const ids = row ? [row.postId] : selectedRows.value.map((r) => r.postId);
  if (!ids.length) return;
  await delPost(ids);
  MessagePlugin.success('删除成功');
  selectedKeys.value = [];
  selectedRows.value = [];
  getList();
};

getList();
</script>

<style lang="less" scoped>
.post-page {
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
</style>
