<template>
  <div class="gen-page">
    <t-card :bordered="false">
      <template #title><div class="card-title">代码生成</div></template>

      <t-form :data="queryParams" layout="inline" @submit="handleQuery">
        <t-form-item label="表名称" name="tableName"
          ><t-input v-model="queryParams.tableName" clearable placeholder="请输入表名称"
        /></t-form-item>
        <t-form-item label="表描述" name="tableComment"
          ><t-input v-model="queryParams.tableComment" clearable placeholder="请输入表描述"
        /></t-form-item>
        <t-form-item label="数据源" name="dataName">
          <t-select v-model="queryParams.dataName" clearable placeholder="数据源" style="width: 140px">
            <t-option v-for="n in dataNames" :key="n" :label="n" :value="n" />
          </t-select>
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
        <t-button v-hasPermi="['tool:gen:import']" theme="primary" @click="openImport"
          ><template #icon><add-icon /></template>导入表</t-button
        >
        <t-button
          v-hasPermi="['tool:gen:code']"
          :disabled="!selectedRows.length"
          theme="success"
          variant="outline"
          @click="handleBatchGen"
          ><template #icon><download-icon /></template>批量生成</t-button
        >
      </div>

      <t-table
        :columns="columns"
        :data="list"
        :loading="loading"
        :pagination="pagination"
        :selected-row-keys="selectedKeys"
        hover
        row-key="tableId"
        stripe
        @select-change="onSelectChange"
        @page-change="onPageChange"
      >
        <template #createTime="{ row }">{{ parseTime(row.createTime) }}</template>
        <template #operation="{ row }">
          <t-space :breakLine="false" size="small">
            <t-link v-hasPermi="['tool:gen:preview']" hover="color" theme="primary" @click="handlePreview(row)"
              >预览</t-link
            >
            <t-link v-hasPermi="['tool:gen:code']" hover="color" theme="primary" @click="handleGen(row)">生成</t-link>
            <t-link v-hasPermi="['tool:gen:edit']" hover="color" theme="primary" @click="handleEdit(row)">配置</t-link>
            <t-link v-hasPermi="['tool:gen:edit']" hover="color" theme="primary" @click="handleSync(row)">同步</t-link>
            <t-link v-hasPermi="['tool:gen:remove']" hover="color" theme="primary" @click="handleDownload(row)"
              >下载</t-link
            >
            <t-popconfirm content="是否确认删除?" @confirm="handleDelete(row)">
              <t-link v-hasPermi="['tool:gen:remove']" hover="color" theme="danger">删除</t-link>
            </t-popconfirm>
          </t-space>
        </template>
      </t-table>
    </t-card>

    <!-- 导入表 -->
    <t-dialog
      v-model:visible="importVisible"
      :confirm-btn="{ loading: importing }"
      :on-confirm="handleImport"
      header="导入表"
      width="780px"
    >
      <t-form :data="dbQuery" layout="inline" @submit="loadDbTables">
        <t-form-item label="表名称" name="tableName"
          ><t-input v-model="dbQuery.tableName" clearable placeholder="请输入表名称"
        /></t-form-item>
        <t-form-item label="表描述" name="tableComment"
          ><t-input v-model="dbQuery.tableComment" clearable placeholder="请输入表描述"
        /></t-form-item>
        <t-form-item><t-button theme="primary" type="submit">搜索</t-button></t-form-item>
      </t-form>
      <t-table
        :columns="dbColumns"
        :data="dbTables"
        :loading="dbLoading"
        :pagination="dbPagination"
        :selected-row-keys="dbSelectedKeys"
        hover
        max-height="420"
        row-key="tableName"
        stripe
        @select-change="onDbSelectChange"
        @page-change="onDbPageChange"
      />
    </t-dialog>

    <!-- 预览代码 -->
    <t-drawer v-model:visible="previewVisible" header="预览代码" size="55%">
      <div class="preview-body">
        <t-select v-model="currentFile" :options="fileOptions" style="margin-bottom: 8px" />
        <pre class="code-block">{{ previewFiles[currentFile] || '' }}</pre>
      </div>
    </t-drawer>

    <!-- 配置编辑（占位：完整配置编辑器待后续补全） -->
    <t-dialog
      v-model:visible="editVisible"
      :confirm-btn="{ loading: saving }"
      :on-confirm="handleSaveConfig"
      header="修改表配置"
      width="720px"
    >
      <t-alert
        message="完整代码生成配置编辑器（基本信息/字段配置/生成配置三栏）尚未迁移，当前仅保存基础信息。"
        style="margin-bottom: 12px"
        theme="warning"
      />
      <t-form :data="editForm" label-width="120px">
        <t-form-item label="表名称"><t-input v-model="editForm.tableName" /></t-form-item>
        <t-form-item label="表描述"><t-input v-model="editForm.tableComment" /></t-form-item>
        <t-form-item label="实体类名称"><t-input v-model="editForm.className" /></t-form-item>
        <t-form-item label="生成包路径"><t-input v-model="editForm.packageName" /></t-form-item>
        <t-form-item label="生成模块名"><t-input v-model="editForm.moduleName" /></t-form-item>
        <t-form-item label="生成业务名"><t-input v-model="editForm.businessName" /></t-form-item>
        <t-form-item label="生成功能名"><t-input v-model="editForm.functionName" /></t-form-item>
        <t-form-item label="备注"><t-textarea v-model="editForm.remark" :autosize="{ minRows: 2 }" /></t-form-item>
      </t-form>
    </t-dialog>
  </div>
</template>

<script lang="ts" setup>
import type { PageInfo, PrimaryTableCol } from 'tdesign-vue-next';
import { MessagePlugin } from 'tdesign-vue-next';
import { AddIcon, DownloadIcon, RefreshIcon, SearchIcon } from 'tdesign-icons-vue-next';
import { reactive, ref } from 'vue';

import type { DbTableVO, PreviewResult, TableQuery, TableVO } from '@/api/tool/gen/types';
import {
  batchGenCode,
  delTable,
  genCode,
  getDataNames,
  importTable,
  listDbTable,
  listTable,
  previewTable,
  synchDb,
  updateGenTable,
} from '@/api/tool/gen';
import { download } from '@/utils/request';
import { parseTime } from '@/utils/ruoyi';

defineOptions({ name: 'ToolGen' });

const list = ref<TableVO[]>([]);
const loading = ref(false);
const selectedKeys = ref<(string | number)[]>([]);
const selectedRows = ref<TableVO[]>([]);
const dataNames = ref<string[]>([]);

const queryParams = reactive<TableQuery>({ pageNum: 1, pageSize: 10, tableName: '', tableComment: '', dataName: '' });
const pagination = reactive({ current: 1, pageSize: 10, total: 0, showJumper: true });

const columns: PrimaryTableCol[] = [
  { colKey: 'row-select', type: 'multiple', width: 46, align: 'center' },
  { colKey: 'tableId', title: '序号', width: 80, align: 'center' },
  { colKey: 'tableName', title: '表名称', width: 200 },
  { colKey: 'tableComment', title: '表描述', width: 200 },
  { colKey: 'className', title: '实体类', width: 200, ellipsis: true },
  { colKey: 'createTime', title: '创建时间', width: 180 },
  { colKey: 'operation', title: '操作', width: 340, fixed: 'right', align: 'center' },
];

const getList = async () => {
  loading.value = true;
  try {
    const res = await listTable(queryParams);
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
  queryParams.tableName = '';
  queryParams.tableComment = '';
  queryParams.dataName = '';
  handleQuery();
};

const loadDataNames = async () => {
  try {
    const res = await getDataNames();
    dataNames.value = (res?.data ?? []) as string[];
  } catch {
    /* ignore */
  }
};

// ---- 预览 ----
const previewVisible = ref(false);
const previewFiles = ref<PreviewResult>({});
const currentFile = ref('');
const fileOptions = ref<{ label: string; value: string }[]>([]);
const handlePreview = async (row: TableVO) => {
  const res = await previewTable(row.tableId);
  const data = (res?.data ?? {}) as PreviewResult;
  previewFiles.value = data;
  const keys = Object.keys(data);
  fileOptions.value = keys.map((k) => ({ label: k, value: k }));
  currentFile.value = keys[0] ?? '';
  previewVisible.value = true;
};

// ---- 生成 / 下载 / 同步 / 删除 ----
const handleGen = async (row: TableVO) => {
  await genCode(row.tableName);
  MessagePlugin.success('生成成功');
};
const handleBatchGen = async () => {
  const tables = selectedRows.value.map((r) => r.tableName).join(',');
  if (!tables) return;
  await batchGenCode(tables);
  MessagePlugin.success('批量生成成功');
};
const handleDownload = (row: TableVO) => download(`/tool/gen/download/${row.tableName}`, {}, `${row.tableName}.zip`);
const handleSync = async (row: TableVO) => {
  await synchDb(row.tableId);
  MessagePlugin.success('同步成功');
  getList();
};
const handleDelete = async (row: TableVO) => {
  await delTable(row.tableId);
  MessagePlugin.success('删除成功');
  getList();
};

// ---- 导入表 ----
const importVisible = ref(false);
const importing = ref(false);
const dbTables = ref<DbTableVO[]>([]);
const dbLoading = ref(false);
const dbSelectedKeys = ref<(string | number)[]>([]);
const dbSelectedRows = ref<DbTableVO[]>([]);
const dbQuery = reactive<TableQuery>({ pageNum: 1, pageSize: 10, tableName: '', tableComment: '', dataName: '' });
const dbPagination = reactive({ current: 1, pageSize: 10, total: 0, showJumper: true });
const dbColumns: PrimaryTableCol[] = [
  { colKey: 'row-select', type: 'multiple', width: 46, align: 'center' },
  { colKey: 'tableName', title: '表名称', width: 240 },
  { colKey: 'tableComment', title: '表描述', width: 240 },
  { colKey: 'createTime', title: '创建时间', width: 180 },
];

const openImport = () => {
  dbQuery.tableName = '';
  dbQuery.tableComment = '';
  dbQuery.dataName = queryParams.dataName ?? '';
  dbQuery.pageNum = 1;
  dbSelectedKeys.value = [];
  dbSelectedRows.value = [];
  importVisible.value = true;
  loadDbTables();
};
const loadDbTables = async () => {
  dbLoading.value = true;
  try {
    const res = await listDbTable(dbQuery);
    const data = res?.data;
    dbTables.value = data?.rows ?? [];
    dbPagination.total = data?.total ?? 0;
    dbPagination.current = dbQuery.pageNum;
    dbPagination.pageSize = dbQuery.pageSize;
  } finally {
    dbLoading.value = false;
  }
};
const onDbSelectChange = (keys: (string | number)[], options: any) => {
  dbSelectedKeys.value = keys;
  dbSelectedRows.value = options?.selectedRowData ?? [];
};
const onDbPageChange = (p: PageInfo) => {
  dbQuery.pageNum = p.current;
  dbQuery.pageSize = p.pageSize;
  loadDbTables();
};
const handleImport = async () => {
  const tables = dbSelectedRows.value.map((r) => r.tableName).join(',');
  if (!tables) {
    MessagePlugin.warning('请选择要导入的表');
    return;
  }
  importing.value = true;
  try {
    await importTable({ tables, dataName: dbQuery.dataName ?? '' });
    MessagePlugin.success('导入成功');
    importVisible.value = false;
    getList();
  } finally {
    importing.value = false;
  }
};

// ---- 配置编辑（基础信息） ----
const editVisible = ref(false);
const saving = ref(false);
const editForm = reactive<any>({});
const handleEdit = async (row: TableVO) => {
  Object.assign(editForm, {
    tableId: row.tableId,
    tableName: row.tableName,
    tableComment: row.tableComment,
    className: row.className,
    packageName: '',
    moduleName: row.moduleName,
    businessName: row.businessName,
    functionName: row.functionName,
    remark: row.remark,
  });
  editVisible.value = true;
};
const handleSaveConfig = async () => {
  saving.value = true;
  try {
    await updateGenTable(editForm);
    MessagePlugin.success('保存成功');
    editVisible.value = false;
    getList();
  } finally {
    saving.value = false;
  }
};

loadDataNames();
getList();
</script>

<style lang="less" scoped>
.gen-page {
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
.preview-body {
  height: 100%;
}
.code-block {
  margin: 0;
  padding: 12px;
  background: var(--td-bg-color-secondarycontainer);
  border-radius: var(--td-radius-default);
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: calc(100vh - 220px);
  overflow: auto;
}
</style>
