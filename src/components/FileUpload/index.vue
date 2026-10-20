<template>
  <div class="file-upload">
    <t-upload
      v-model="fileList"
      :accept="accept"
      :auto-upload="true"
      :max="maxCount"
      :request-method="customUpload"
      :show-upload-progress="true"
      theme="file"
      @remove="emitChange"
    />
  </div>
</template>

<script lang="ts" setup>
import type { RequestMethodResponse, UploadFile } from 'tdesign-vue-next';
import { ref, onMounted, watch } from 'vue';

import { listByIds, uploadOss } from '@/api/system/oss';

interface Props {
  modelValue?: string;
  limit?: number;
  accept?: string;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  limit: 5,
  accept: '*',
});
const emit = defineEmits<{ (e: 'update:modelValue', v: string): void }>();

const maxCount = props.limit;
const fileList = ref<UploadFile[]>([]);

const customUpload = async (file: UploadFile | UploadFile[]): Promise<RequestMethodResponse> => {
  // multiple=true 时 TDesign 传 UploadFile[]（逐文件上传也是 [file]）；单文件模式传单个对象。
  // 统一归一化为数组，取首个文件的 raw 上传，并把 ossId 回填到对应的 UploadFile 对象上。
  const files = Array.isArray(file) ? file : [file];
  const target = files[0];
  const raw = target?.raw as File | undefined;
  if (!raw) {
    return { status: 'fail', error: '未获取到文件，请重试', response: {} };
  }
  const formData = new FormData();
  formData.append('file', raw);
  try {
    const res: any = await uploadOss(formData);
    const data = res?.data;
    if (data?.ossId) {
      (target as any).ossId = data.ossId;
      emitChange();
      return { status: 'success', response: { url: data.url, ossId: data.ossId, fileName: data.fileName } };
    }
    return { status: 'fail', error: '上传失败', response: {} };
  } catch (e: any) {
    return { status: 'fail', error: e?.message || '上传失败', response: {} };
  }
};

const emitChange = () =>
  emit(
    'update:modelValue',
    fileList.value
      .map((f: any) => f.ossId)
      .filter(Boolean)
      .join(','),
  );

const loadExisting = async () => {
  if (!props.modelValue) return;
  try {
    const res = await listByIds(props.modelValue);
    const data = (res?.data ?? []) as any[];
    fileList.value = data.map((o) => ({ name: o.fileName, url: o.url, status: 'success', ossId: o.ossId }));
  } catch (e) {
    console.error(e);
  }
};

onMounted(loadExisting);
watch(
  () => props.modelValue,
  (v) => {
    if (!v && fileList.value.length) fileList.value = [];
  },
);
</script>
