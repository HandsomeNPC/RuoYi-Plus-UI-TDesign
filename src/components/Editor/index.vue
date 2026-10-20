<template>
  <div
    :style="{
      border: '1px solid var(--td-component-stroke)',
      borderRadius: 'var(--td-radius-default)',
      overflow: 'hidden',
    }"
    class="editor-wrap"
  >
    <Toolbar
      :default-config="toolbarConfig"
      :editor="editorRef"
      :mode="mode"
      style="border-bottom: 1px solid var(--td-component-stroke)"
    />
    <Editor
      v-model="valueHtml"
      :default-config="editorConfig"
      :mode="mode"
      :style="{ height: height, overflowY: 'hidden' }"
      @on-created="handleCreated"
    />
  </div>
</template>

<script lang="ts" setup>
import '@wangeditor-next/editor/dist/css/style.css';
import { Editor, Toolbar } from '@wangeditor-next/editor-for-vue';
import { onBeforeUnmount, ref, shallowRef, watch } from 'vue';

interface Props {
  modelValue?: string;
  height?: string;
  mode?: string;
  placeholder?: string;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  height: '300px',
  mode: 'default',
  placeholder: '请输入内容',
});

const emit = defineEmits<{ (e: 'update:modelValue', v: string): void }>();

const editorRef = shallowRef();
const valueHtml = ref(props.modelValue || '');

const toolbarConfig = { excludeKeys: ['group-video'] };
const editorConfig = {
  placeholder: props.placeholder,
  MENU_CONF: {},
};

watch(
  () => props.modelValue,
  (v) => {
    if (v !== valueHtml.value) valueHtml.value = v || '';
  },
);

watch(valueHtml, (v) => emit('update:modelValue', v));

const handleCreated = (editor: any) => {
  editorRef.value = editor;
};

onBeforeUnmount(() => {
  const editor = editorRef.value;
  if (editor) editor.destroy();
});
</script>

<style scoped>
.editor-wrap {
  z-index: 2;
}
</style>
