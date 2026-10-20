<template>
  <div class="image-upload">
    <t-upload
      v-model="fileList"
      :abridge-name="[6, 6]"
      :accept="accept"
      :auto-upload="true"
      :limit="limit"
      :max="maxCount"
      :request-method="customUpload"
      :show-upload-progress="true"
      :theme="multiple ? 'image' : 'image'"
      :trigger-props="{ theme: 'primary' }"
      @remove="onRemove"
    />
  </div>
</template>

<script lang="ts" setup>
import type { RequestMethodResponse, UploadFile } from 'tdesign-vue-next';
import { MessagePlugin } from 'tdesign-vue-next';
import { onMounted, ref, watch } from 'vue';

import { listByIds, uploadOss } from '@/api/system/oss';

interface Props {
  /** ossId 逗号分隔字符串 */
  modelValue?: string;
  /** 允许上传数量上限 */
  limit?: number;
  accept?: string;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  limit: 1,
  accept: 'image/*',
});
const emit = defineEmits<{ (e: 'update:modelValue', v: string): void }>();

const maxCount = props.limit;
const multiple = props.limit > 1;
const fileList = ref<UploadFile[]>([]);

const customUpload = async (file: UploadFile): Promise<RequestMethodResponse> => {
  const formData = new FormData();
  formData.append('file', file.raw as File);
  try {
    const res: any = await uploadOss(formData);
    const data = res?.data;
    if (data?.ossId) {
      // 把返回的 ossId 写入文件对象，提交时读取
      (file as any).ossId = data.ossId;
      emitChange();
      return { status: 'success', response: { url: data.url, ossId: data.ossId, fileName: data.fileName } };
    }
    return { status: 'fail', error: '上传失败', response: {} };
  } catch (e: any) {
    return { status: 'fail', error: e?.message || '上传失败', response: {} };
  }
};

const onRemove = () => {
  emitChange();
};

const collectIds = () =>
  fileList.value
    .map((f: any) => f.ossId)
    .filter(Boolean)
    .join(',');

const emitChange = () => emit('update:modelValue', collectIds());

const loadExisting = async () => {
  if (!props.modelValue) return;
  try {
    const res = await listByIds(props.modelValue);
    const data = (res?.data ?? []) as any[];
    fileList.value = data.map((o) => ({
      name: o.fileName,
      url: o.url,
      status: 'success',
      ossId: o.ossId,
    }));
  } catch (e) {
    console.error(e);
  }
};

onMounted(loadExisting);
watch(
  () => props.modelValue,
  (v) => {
    // 外部清空时同步
    if (!v && fileList.value.length) fileList.value = [];
  },
);

// 兜底：上传失败提示
watch(fileList, (arr) => {
  if (arr.some((f: any) => f.status === 'fail')) {
    MessagePlugin.error('部分文件上传失败');
  }
});
</script>

<style scoped>
.image-upload :deep(.t-upload__card) {
  width: auto;
}
</style>
