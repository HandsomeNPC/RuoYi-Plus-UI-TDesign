<template>
  <div class="oss-config-page">
    <t-card :bordered="false">
      <template #title><div class="card-title">对象存储配置</div></template>

      <t-form :data="queryParams" layout="inline" @submit="handleQuery">
        <t-form-item label="配置key" name="configKey"
          ><t-input v-model="queryParams.configKey" clearable placeholder="配置key"
        /></t-form-item>
        <t-form-item label="桶名称" name="bucketName"
          ><t-input v-model="queryParams.bucketName" clearable placeholder="桶名称"
        /></t-form-item>
        <t-form-item label="状态" name="status"
          ><dict-select v-model="queryParams.status" placeholder="状态" style="width: 140px" type="sys_normal_disable"
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
        <t-button v-hasPermi="['resource:oss:config:add']" theme="primary" @click="handleAdd"
          ><template #icon><add-icon /></template>新增</t-button
        >
        <t-popconfirm content="是否确认删除选中的配置?" @confirm="handleDelete()">
          <t-button
            v-hasPermi="['resource:oss:config:remove']"
            :disabled="!selectedRows.length"
            theme="danger"
            variant="outline"
            ><template #icon><delete-icon /></template>删除</t-button
          >
        </t-popconfirm>
      </div>

      <t-table
        :columns="columns"
        :data="list"
        :loading="loading"
        :pagination="pagination"
        :selected-row-keys="selectedKeys"
        hover
        row-key="ossConfigId"
        stripe
        @select-change="onSelectChange"
        @page-change="onPageChange"
      >
        <template #status="{ row }">
          <t-switch :value="row.status === '0'" @change="(v: any) => handleStatusChange(row, v)" />
        </template>
        <template #isPrimary="{ row }"><dict-tag :options="sys_yes_no" :value="row.isPrimary" /></template>
        <template #isHttps="{ row }"><dict-tag :options="sys_yes_no" :value="row.isHttps" /></template>
        <template #operation="{ row }">
          <t-space size="small">
            <t-link v-hasPermi="['resource:oss:config:edit']" hover="color" theme="primary" @click="handleUpdate(row)"
              >修改</t-link
            >
            <t-popconfirm content="是否确认删除?" @confirm="handleDelete(row)">
              <t-link v-hasPermi="['resource:oss:config:remove']" hover="color" theme="danger">删除</t-link>
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
      width="680px"
    >
      <t-form ref="formRef" :data="form" :rules="rules" label-width="120px" @submit="onSubmit">
        <t-row>
          <t-col :span="12"
            ><t-form-item label="配置key" name="configKey"
              ><t-input
                v-model="form.configKey"
                :disabled="!!form.ossConfigId"
                placeholder="请输入配置key" /></t-form-item
          ></t-col>
          <t-col :span="12"
            ><t-form-item label="桶名称" name="bucketName"
              ><t-input v-model="form.bucketName" placeholder="请输入桶名称" /></t-form-item
          ></t-col>
        </t-row>
        <t-row>
          <t-col :span="12"
            ><t-form-item label="访问域名" name="accessDomain"
              ><t-input v-model="form.accessDomain" placeholder="请输入访问域名" /></t-form-item
          ></t-col>
          <t-col :span="12"
            ><t-form-item label="region" name="region"
              ><t-input v-model="form.region" placeholder="请输入region" /></t-form-item
          ></t-col>
        </t-row>
        <t-row>
          <t-col :span="12"
            ><t-form-item label="accessKey" name="accessKey"
              ><t-input v-model="form.accessKey" placeholder="请输入accessKey" /></t-form-item
          ></t-col>
          <t-col :span="12"
            ><t-form-item label="secretKey" name="secretKey"
              ><t-input v-model="form.secretKey" placeholder="请输入secretKey" /></t-form-item
          ></t-col>
        </t-row>
        <t-row>
          <t-col :span="12"
            ><t-form-item label="是否主配置" name="isPrimary"
              ><dict-select v-model="form.isPrimary" placeholder="请选择" type="sys_yes_no" /></t-form-item
          ></t-col>
          <t-col :span="12"
            ><t-form-item label="是否HTTPS" name="isHttps"
              ><dict-select v-model="form.isHttps" placeholder="请选择" type="sys_yes_no" /></t-form-item
          ></t-col>
        </t-row>
        <t-form-item label="状态" name="status"
          ><dict-select v-model="form.status" placeholder="请选择" type="sys_normal_disable"
        /></t-form-item>
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
import { AddIcon, DeleteIcon, RefreshIcon, SearchIcon } from 'tdesign-icons-vue-next';
import { reactive, ref } from 'vue';

import type { OssConfigForm, OssConfigQuery, OssConfigVO } from '@/api/system/ossConfig/types';
import {
  addOssConfig,
  changeOssConfigStatus,
  delOssConfig,
  listOssConfig,
  updateOssConfig,
} from '@/api/system/ossConfig';
import { useDict } from '@/utils/dict';

defineOptions({ name: 'SystemOssConfig' });

const { sys_normal_disable, sys_yes_no } = useDict('sys_normal_disable', 'sys_yes_no');

const list = ref<OssConfigVO[]>([]);
const loading = ref(false);
const selectedKeys = ref<(string | number)[]>([]);
const selectedRows = ref<OssConfigVO[]>([]);
const queryParams = reactive<OssConfigQuery>({ pageNum: 1, pageSize: 10, configKey: '', bucketName: '', status: '' });
const pagination = reactive({ current: 1, pageSize: 10, total: 0, showJumper: true });

const columns: PrimaryTableCol[] = [
  { colKey: 'row-select', type: 'multiple', width: 46, align: 'center' },
  { colKey: 'configKey', title: '配置key', width: 180 },
  { colKey: 'bucketName', title: '桶名称', width: 180 },
  { colKey: 'accessDomain', title: '访问域名', width: 240, ellipsis: true },
  { colKey: 'region', title: 'region', width: 120 },
  { colKey: 'isPrimary', title: '主配置', width: 90, align: 'center' },
  { colKey: 'isHttps', title: 'HTTPS', width: 90, align: 'center' },
  { colKey: 'status', title: '状态', width: 90, align: 'center' },
  { colKey: 'operation', title: '操作', width: 160, fixed: 'right', align: 'center' },
];

const getList = async () => {
  loading.value = true;
  try {
    const res = await listOssConfig(queryParams);
    const d = res?.data;
    list.value = d?.rows ?? [];
    pagination.total = d?.total ?? 0;
    pagination.current = queryParams.pageNum ?? 1;
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
  queryParams.configKey = '';
  queryParams.bucketName = '';
  queryParams.status = '';
  handleQuery();
};

const handleStatusChange = async (row: OssConfigVO, v: any) => {
  const status = v ? '0' : '1';
  try {
    await changeOssConfigStatus(row.ossConfigId, status, row.configKey);
    row.status = status;
    MessagePlugin.success('修改成功');
  } catch {
    /* ignore */
  }
};

const formRef = ref<FormInstanceFunctions>();
const dialogVisible = ref(false);
const dialogTitle = ref('');
const submitting = ref(false);
const initForm = (): OssConfigForm => ({
  ossConfigId: undefined,
  configKey: '',
  bucketName: '',
  accessDomain: '',
  region: '',
  accessKey: '',
  secretKey: '',
  isPrimary: 'N',
  isHttps: 'N',
  status: '0',
  remark: '',
});
const form = reactive<OssConfigForm>(initForm());
const rules: Record<string, FormRule[]> = {
  configKey: [{ required: true, message: '请输入配置key', type: 'error' }],
  bucketName: [{ required: true, message: '请输入桶名称', type: 'error' }],
};

const handleAdd = () => {
  Object.assign(form, initForm());
  dialogTitle.value = '新增配置';
  dialogVisible.value = true;
};
const handleUpdate = (row: OssConfigVO) => {
  Object.assign(form, initForm(), {
    ossConfigId: row.ossConfigId,
    configKey: row.configKey,
    bucketName: row.bucketName,
    accessDomain: row.accessDomain,
    region: row.region,
    isPrimary: row.isPrimary,
    isHttps: row.isHttps,
    status: row.status,
    remark: row.remark,
  });
  dialogTitle.value = '修改配置';
  dialogVisible.value = true;
};
const onSubmit = async () => {
  const valid = await formRef.value?.validate();
  if (valid !== true) return;
  submitting.value = true;
  try {
    if (form.ossConfigId) {
      await updateOssConfig(form);
      MessagePlugin.success('修改成功');
    } else {
      await addOssConfig(form);
      MessagePlugin.success('新增成功');
    }
    dialogVisible.value = false;
    getList();
  } finally {
    submitting.value = false;
  }
};
const handleDelete = async (row?: OssConfigVO) => {
  const ids = row ? [row.ossConfigId] : selectedRows.value.map((r) => r.ossConfigId);
  if (!ids.length) return;
  await delOssConfig(ids);
  MessagePlugin.success('删除成功');
  selectedKeys.value = [];
  selectedRows.value = [];
  getList();
};

getList();
</script>

<style lang="less" scoped>
.oss-config-page {
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
