<template>
  <div class="cache-page">
    <t-row :gutter="16">
      <t-col :lg="8" :xs="24">
        <t-card :bordered="false" title="Redis 基本信息">
          <t-descriptions :column="1" bordered>
            <t-descriptions-item label="Redis版本">{{ info?.redis_version || '—' }}</t-descriptions-item>
            <t-descriptions-item label="运行模式">{{ info?.redis_mode || '—' }}</t-descriptions-item>
            <t-descriptions-item label="端口">{{ info?.tcp_port || '—' }}</t-descriptions-item>
            <t-descriptions-item label="客户端数">{{ info?.connected_clients || '—' }}</t-descriptions-item>
            <t-descriptions-item label="运行时长(天)">{{ info?.up_time_in_days || '—' }}</t-descriptions-item>
            <t-descriptions-item label="使用内存">{{ info?.used_memory_human || '—' }}</t-descriptions-item>
            <t-descriptions-item label="使用CPU">{{ info?.used_cpu_user || '—' }}</t-descriptions-item>
            <t-descriptions-item label="内存配置">{{ info?.maxmemory_human || '—' }}</t-descriptions-item>
            <t-descriptions-item label="AOF是否开启">{{ info?.rdb_last_bgsave_status || '—' }}</t-descriptions-item>
            <t-descriptions-item label="RDB是否成功">{{ info?.rdb_last_bgsave_status || '—' }}</t-descriptions-item>
            <t-descriptions-item label="Key数量">{{ dbSize }}</t-descriptions-item>
          </t-descriptions>
        </t-card>
      </t-col>
      <t-col :lg="16" :xs="24">
        <t-card :bordered="false" title="命令统计">
          <t-table :columns="cmdColumns" :data="commandStats" :loading="loading" hover row-key="name" stripe>
            <template #value="{ row }">
              <div class="cmd-row">
                <span class="cmd-name">{{ row.name }}</span>
                <t-progress :label="false" :percentage="percent(row.value)" />
                <span class="cmd-val">{{ row.value }}</span>
              </div>
            </template>
          </t-table>
        </t-card>
      </t-col>
    </t-row>
  </div>
</template>

<script lang="ts" setup>
import type { PrimaryTableCol } from 'tdesign-vue-next';
import { computed, ref } from 'vue';

import type { CacheVO } from '@/api/monitor/cache/types';
import { getCache } from '@/api/monitor/cache';

defineOptions({ name: 'MonitorCache' });

const loading = ref(false);
const info = ref<CacheVO['info']>({});
const dbSize = ref(0);
const commandStats = ref<Array<{ name: string; value: string }>>([]);

const cmdColumns: PrimaryTableCol[] = [{ colKey: 'value', title: '调用次数', minWidth: 320 }];

const maxValue = computed(() => {
  const nums = commandStats.value.map((c) => Number(c.value) || 0);
  return nums.length ? Math.max(...nums) : 1;
});
const percent = (val: string) => {
  const n = Number(val) || 0;
  return maxValue.value ? Math.round((n / maxValue.value) * 100) : 0;
};

const load = async () => {
  loading.value = true;
  try {
    const res = await getCache();
    const data = res?.data;
    info.value = data?.info ?? {};
    dbSize.value = data?.dbSize ?? 0;
    commandStats.value = data?.commandStats ?? [];
  } finally {
    loading.value = false;
  }
};

load();
</script>

<style lang="less" scoped>
.cache-page {
  padding: 16px;
}
.cmd-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.cmd-name {
  width: 200px;
  flex-shrink: 0;
  font-family: monospace;
}
.cmd-val {
  width: 80px;
  flex-shrink: 0;
  text-align: right;
}
</style>
