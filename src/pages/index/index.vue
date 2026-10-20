<template>
  <div class="home-page">
    <t-card :bordered="false" title="首页">
      <t-space direction="vertical" size="large" style="width: 100%">
        <t-alert message="欢迎使用 RuoYi-Vue-Plus 后台管理系统（TDesign 版）" theme="success" />
        <t-row :gutter="16">
          <t-col v-for="card in statCards" :key="card.label" :sm="6" :xs="12">
            <t-card :title="card.label">
              <div class="stat-value">{{ card.value }}</div>
              <div class="stat-desc">{{ card.desc }}</div>
            </t-card>
          </t-col>
        </t-row>
        <t-card :bordered="false" title="当前登录用户">
          <t-descriptions :column="2">
            <t-descriptions-item label="用户名">{{ userStore.name }}</t-descriptions-item>
            <t-descriptions-item label="昵称">{{ userStore.nickname }}</t-descriptions-item>
            <t-descriptions-item label="用户ID">{{ userStore.userId }}</t-descriptions-item>
            <t-descriptions-item label="角色">{{ (userStore.roles || []).join(', ') }}</t-descriptions-item>
          </t-descriptions>
        </t-card>
      </t-space>
    </t-card>
  </div>
</template>

<script lang="ts" setup>
import { useUserStore } from '@/store';

defineOptions({ name: 'IndexPage' });

const userStore = useUserStore();

const statCards = [
  { label: '今日访问', value: '—', desc: '业务页面待迁移' },
  { label: '菜单数', value: '—', desc: '由后端动态生成' },
  { label: '在线用户', value: '—', desc: '监控页待迁移' },
  { label: '系统状态', value: '正常', desc: '基础设施已就绪' },
];
</script>

<style lang="less" scoped>
.home-page {
  padding: 16px;
}
.stat-value {
  font-size: 28px;
  font-weight: 600;
  color: var(--td-text-color-primary);
}
.stat-desc {
  margin-top: 4px;
  color: var(--td-text-color-secondary);
}
</style>
