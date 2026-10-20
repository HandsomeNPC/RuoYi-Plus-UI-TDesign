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

    <!-- 配置编辑（3 栏：基本/字段/生成） -->
    <t-dialog
      v-model:visible="editVisible"
      :confirm-btn="{ loading: saving }"
      :on-confirm="handleSaveConfig"
      header="修改表配置"
      width="960px"
    >
      <t-tabs v-model="editTab">
        <!-- 基本信息 -->
        <t-tab-panel label="基本信息" value="basic">
          <t-form :data="editForm" label-width="120px">
            <t-row>
              <t-col :span="12"
                ><t-form-item label="表名称"><t-input v-model="editForm.tableName" /></t-form-item
              ></t-col>
              <t-col :span="12"
                ><t-form-item label="表描述"><t-input v-model="editForm.tableComment" /></t-form-item
              ></t-col>
            </t-row>
            <t-row>
              <t-col :span="12"
                ><t-form-item label="实体类名称"><t-input v-model="editForm.className" /></t-form-item
              ></t-col>
              <t-col :span="12"
                ><t-form-item label="作者"><t-input v-model="editForm.functionAuthor" /></t-form-item
              ></t-col>
            </t-row>
            <t-form-item label="备注"><t-textarea v-model="editForm.remark" :autosize="{ minRows: 2 }" /></t-form-item>
          </t-form>
        </t-tab-panel>

        <!-- 字段信息 -->
        <t-tab-panel label="字段信息" value="columns">
          <t-table :columns="colColumns" :data="editColumns" hover max-height="420" row-key="columnId" stripe>
            <template #isInsert="{ row }"><t-switch v-model="row.isInsert" :custom-value="['1', '0']" /></template>
            <template #isEdit="{ row }"><t-switch v-model="row.isEdit" :custom-value="['1', '0']" /></template>
            <template #isList="{ row }"><t-switch v-model="row.isList" :custom-value="['1', '0']" /></template>
            <template #isQuery="{ row }"><t-switch v-model="row.isQuery" :custom-value="['1', '0']" /></template>
            <template #isRequired="{ row }"><t-switch v-model="row.isRequired" :custom-value="['1', '0']" /></template>
            <template #javaType="{ row }">
              <t-select v-model="row.javaType" :options="javaTypeOptions" size="small" />
            </template>
            <template #htmlType="{ row }">
              <t-select v-model="row.htmlType" :options="htmlTypeOptions" size="small" />
            </template>
            <template #queryType="{ row }">
              <t-select v-model="row.queryType" :options="queryTypeOptions" size="small" />
            </template>
          </t-table>
        </t-tab-panel>

        <!-- 生成信息 -->
        <t-tab-panel label="生成信息" value="gen">
          <t-form :data="editForm" label-width="120px">
            <t-row>
              <t-col :span="12"
                ><t-form-item label="生成模板"
                  ><t-select v-model="editForm.tplCategory" :options="tplOptions" /></t-form-item
              ></t-col>
              <t-col :span="12"
                ><t-form-item label="前端模板"
                  ><t-select v-model="editForm.frontendType" :options="frontendOptions" /></t-form-item
              ></t-col>
            </t-row>
            <t-row>
              <t-col :span="12"
                ><t-form-item label="生成包路径"><t-input v-model="editForm.packageName" /></t-form-item
              ></t-col>
              <t-col :span="12"
                ><t-form-item label="生成模块名"><t-input v-model="editForm.moduleName" /></t-form-item
              ></t-col>
            </t-row>
            <t-row>
              <t-col :span="12"
                ><t-form-item label="生成业务名"><t-input v-model="editForm.businessName" /></t-form-item
              ></t-col>
              <t-col :span="12"
                ><t-form-item label="生成功能名"><t-input v-model="editForm.functionName" /></t-form-item
              ></t-col>
            </t-row>
            <t-row>
              <t-col :span="6"
                ><t-form-item label="启用导出"><t-switch v-model="editForm.enableExport" /></t-form-item
              ></t-col>
              <t-col :span="6"
                ><t-form-item label="启用状态"><t-switch v-model="editForm.enableStatus" /></t-form-item
              ></t-col>
              <t-col :span="6"
                ><t-form-item label="启用排序"><t-switch v-model="editForm.enableSort" /></t-form-item
              ></t-col>
              <t-col :span="6"
                ><t-form-item label="启用唯一"><t-switch v-model="editForm.enableUnique" /></t-form-item
              ></t-col>
            </t-row>
            <t-row v-if="editForm.enableStatus">
              <t-col :span="12"
                ><t-form-item label="状态字段"
                  ><t-select
                    v-model="editForm.statusField"
                    :options="columnOptions"
                    clearable
                    filterable /></t-form-item
              ></t-col>
            </t-row>
            <t-row v-if="editForm.enableSort">
              <t-col :span="12"
                ><t-form-item label="排序字段"
                  ><t-select v-model="editForm.sortField" :options="columnOptions" clearable filterable /></t-form-item
              ></t-col>
            </t-row>
            <t-row v-if="editForm.enableUnique">
              <t-col :span="12"
                ><t-form-item label="唯一字段"
                  ><t-select
                    v-model="editForm.uniqueFields"
                    :options="columnOptions"
                    clearable
                    filterable
                    multiple /></t-form-item
              ></t-col>
            </t-row>
            <t-row v-if="editForm.tplCategory === 'tree'">
              <t-col :span="12"
                ><t-form-item label="树编码字段"
                  ><t-select v-model="editForm.treeCode" :options="columnOptions" clearable filterable /></t-form-item
              ></t-col>
              <t-col :span="12"
                ><t-form-item label="树父编码"
                  ><t-select
                    v-model="editForm.treeParentCode"
                    :options="columnOptions"
                    clearable
                    filterable /></t-form-item
              ></t-col>
            </t-row>
            <t-row v-if="editForm.tplCategory === 'tree'">
              <t-col :span="12"
                ><t-form-item label="树名称字段"
                  ><t-select v-model="editForm.treeName" :options="columnOptions" clearable filterable /></t-form-item
              ></t-col>
              <t-col :span="12"
                ><t-form-item label="树根值"
                  ><t-input v-model="editForm.treeRootValue" placeholder="如 0" /></t-form-item
              ></t-col>
            </t-row>
            <t-row v-if="editForm.tplCategory === 'tree'">
              <t-col :span="12"
                ><t-form-item label="祖级字段"
                  ><t-select
                    v-model="editForm.treeAncestorsField"
                    :options="columnOptions"
                    clearable
                    filterable /></t-form-item
              ></t-col>
              <t-col :span="12"
                ><t-form-item label="树排序字段"
                  ><t-select
                    v-model="editForm.treeOrderField"
                    :options="columnOptions"
                    clearable
                    filterable /></t-form-item
              ></t-col>
            </t-row>
            <t-form-item label="父菜单"
              ><t-tree-select
                v-model="editForm.parentMenuId"
                :data="menuTreeOptions"
                :keys="{ label: 'label', value: 'value', children: 'children' }"
                clearable
                filterable
                placeholder="生成菜单挂载位置"
            /></t-form-item>
            <t-form-item label="备注"><t-textarea v-model="editForm.remark" :autosize="{ minRows: 2 }" /></t-form-item>
          </t-form>
        </t-tab-panel>
      </t-tabs>
    </t-dialog>
  </div>
</template>

<script lang="ts" setup>
import type { PageInfo, PrimaryTableCol } from 'tdesign-vue-next';
import { MessagePlugin } from 'tdesign-vue-next';
import { AddIcon, DownloadIcon, RefreshIcon, SearchIcon } from 'tdesign-icons-vue-next';
import { computed, reactive, ref } from 'vue';

import type { DbTableVO, PreviewResult, TableQuery, TableVO } from '@/api/tool/gen/types';
import {
  batchGenCode,
  delTable,
  genCode,
  getDataNames,
  getGenTable,
  importTable,
  listDbTable,
  listTable,
  previewTable,
  synchDb,
  updateGenTable,
} from '@/api/tool/gen';
import { treeselect as menuTreeselect } from '@/api/system/menu';
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
const editTab = ref('basic');
const editColumns = ref<any[]>([]);

// 列字段下拉选项（用于状态/排序/唯一/树字段选择）
const columnOptions = computed(() =>
  editColumns.value.map((c) => ({
    label: `${c.columnName}${c.columnComment ? ': ' + c.columnComment : ''}`,
    value: c.columnName,
  })),
);

// 父菜单树选项
const menuTreeOptions = ref<any[]>([]);
const toMenuTree = (nodes: any[]): any[] =>
  (nodes || []).map((n) => ({
    label: n.label,
    value: n.id,
    children: n.children?.length ? toMenuTree(n.children) : undefined,
  }));

const colColumns: PrimaryTableCol[] = [
  { colKey: 'columnComment', title: '字段列名', width: 160, ellipsis: true },
  { colKey: 'columnType', title: '物理类型', width: 140, ellipsis: true },
  { colKey: 'javaType', title: 'Java类型', width: 140 },
  { colKey: 'javaField', title: 'Java属性', width: 140, edit: { component: 't-input' } },
  { colKey: 'isInsert', title: '插入', width: 70, align: 'center' },
  { colKey: 'isEdit', title: '编辑', width: 70, align: 'center' },
  { colKey: 'isList', title: '列表', width: 70, align: 'center' },
  { colKey: 'isQuery', title: '查询', width: 70, align: 'center' },
  { colKey: 'isRequired', title: '必填', width: 70, align: 'center' },
  { colKey: 'queryType', title: '查询方式', width: 120 },
  { colKey: 'htmlType', title: '显示类型', width: 120 },
];

const javaTypeOptions = [
  { label: 'String', value: 'String' },
  { label: 'Long', value: 'Long' },
  { label: 'Integer', value: 'Integer' },
  { label: 'Double', value: 'Double' },
  { label: 'BigDecimal', value: 'BigDecimal' },
  { label: 'Date', value: 'Date' },
  { label: 'Boolean', value: 'Boolean' },
];
const htmlTypeOptions = [
  { label: '文本框', value: 'input' },
  { label: '文本域', value: 'textarea' },
  { label: '下拉框', value: 'select' },
  { label: '单选框', value: 'radio' },
  { label: '复选框', value: 'checkbox' },
  { label: '日期控件', value: 'datetime' },
  { label: '图片上传', value: 'imageUpload' },
  { label: '文件上传', value: 'fileUpload' },
];
const queryTypeOptions = [
  { label: '等于', value: 'EQ' },
  { label: '不等于', value: 'NE' },
  { label: '大于', value: 'GT' },
  { label: '大于等于', value: 'GTE' },
  { label: '小于', value: 'LT' },
  { label: '小于等于', value: 'LTE' },
  { label: '模糊', value: 'LIKE' },
];
const tplOptions = [
  { label: '单表（增删改查）', value: 'crud' },
  { label: '树表（增删改查）', value: 'tree' },
  { label: '主子表（增删改查）', value: 'sub' },
];
const frontendOptions = [
  { label: 'Vue2', value: 'vue' },
  { label: 'Vue3', value: 'vue3' },
];

const handleEdit = async (row: TableVO) => {
  editTab.value = 'basic';
  const res = await getGenTable(row.tableId);
  const data = res?.data as any;
  const t = data?.table ?? row;
  Object.assign(editForm, {
    tableId: t.tableId,
    tableName: t.tableName,
    tableComment: t.tableComment,
    className: t.className,
    functionAuthor: t.functionAuthor,
    packageName: t.packageName,
    moduleName: t.moduleName,
    businessName: t.businessName,
    functionName: t.functionName,
    tplCategory: t.tplCategory ?? 'crud',
    frontendType: t.frontendType ?? 'vue3',
    enableExport: !!t.enableExport,
    enableStatus: !!t.enableStatus,
    enableSort: !!t.enableSort,
    enableUnique: !!t.enableUnique,
    statusField: t.statusField ?? '',
    sortField: t.sortField ?? '',
    uniqueFields: t.uniqueFields ?? [],
    treeCode: t.treeCode ?? '',
    treeParentCode: t.treeParentCode ?? '',
    treeName: t.treeName ?? '',
    treeRootValue: t.treeRootValue ?? '',
    treeAncestorsField: t.treeAncestorsField ?? '',
    treeOrderField: t.treeOrderField ?? '',
    parentMenuId: t.parentMenuId ?? 0,
    remark: t.remark,
  });
  // 父菜单树
  try {
    const mres = await menuTreeselect();
    menuTreeOptions.value = [{ label: '主类目', value: 0 }, ...toMenuTree(mres?.data ?? [])];
  } catch {
    menuTreeOptions.value = [{ label: '主类目', value: 0 }];
  }
  editColumns.value = (data?.rows ?? []).map((c: any) => ({
    ...c,
    isInsert: String(c.isInsert ?? '0'),
    isEdit: String(c.isEdit ?? '0'),
    isList: String(c.isList ?? '0'),
    isQuery: String(c.isQuery ?? '0'),
    isRequired: String(c.isRequired ?? '0'),
  }));
  editVisible.value = true;
};
const handleSaveConfig = async () => {
  saving.value = true;
  try {
    await updateGenTable({ ...editForm, columns: editColumns.value });
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
