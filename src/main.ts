/* eslint-disable simple-import-sort/imports */
import { createApp } from 'vue';
import TDesign from 'tdesign-vue-next';

import SvgIcon from '@/components/SvgIcon/index.vue';
import App from './App.vue';
import directive from './directive';
import router from './router';
import { store } from './store';
import i18n from './locales';

import 'tdesign-vue-next/es/style/index.css';
import '@/style/index.less';
import 'virtual:svg-icons-register';
import './permission';

const app = createApp(App);

app.use(TDesign);
app.use(store);
app.use(router);
app.use(i18n);

// 全局 SVG 图标组件（RuoYi 菜单/按钮图标）
app.component('svg-icon', SvgIcon);
app.component('SvgIcon', SvgIcon);

// 全局自定义指令（v-hasPermi / v-hasRoles）
directive(app);

app.mount('#app');
