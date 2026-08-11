<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { request } from '../lib/api';

interface TopPage {
  path: string;
  views: number;
}

interface RecentVisit {
  path: string;
  ip: string;
  created_at: string;
}

interface StatsData {
  totalViews: number;
  uniqueIPs: number;
  topPages: TopPage[];
  recentVisits: RecentVisit[];
}

const stats = ref<StatsData | null>(null);
const loading = ref(true);

const fetchStats = async () => {
  loading.value = true;
  try {
    const res = await request<StatsData>('/api/stats', 'GET');
    if (res) {
      stats.value = res;
    }
  } catch (error) {
    console.error('Failed to fetch stats:', error);
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchStats();
});
</script>

<template>
  <div class="space-y-6">
    <div class="flex justify-between items-end mb-6">
      <h2 class="text-3xl font-black tracking-tight text-slate-900">数据统计</h2>
      <button @click="fetchStats" class="text-sm text-slate-500 hover:text-slate-900 transition-colors">
        <span v-if="loading">加载中...</span>
        <span v-else>刷新数据</span>
      </button>
    </div>

    <!-- Overview Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div class="text-sm font-bold text-slate-400 mb-1">总浏览量</div>
        <div class="text-4xl font-black text-slate-900">{{ stats?.totalViews || 0 }}</div>
      </div>
      <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div class="text-sm font-bold text-slate-400 mb-1">独立访客 (IP)</div>
        <div class="text-4xl font-black text-slate-900">{{ stats?.uniqueIPs || 0 }}</div>
      </div>
    </div>

    <!-- Tables -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Top Pages -->
      <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div class="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <h3 class="font-bold text-slate-900">最受欢迎页面 (Top 10)</h3>
        </div>
        <div class="p-0 flex-1 overflow-y-auto">
          <table class="w-full text-left text-sm">
            <thead class="bg-slate-50 text-slate-500 hidden">
              <tr>
                <th class="px-6 py-3 font-medium">路径</th>
                <th class="px-6 py-3 font-medium text-right">浏览量</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-if="!stats?.topPages?.length" class="text-slate-400 text-center">
                <td colspan="2" class="py-8">暂无数据</td>
              </tr>
              <tr v-for="(page, index) in stats?.topPages" :key="index" class="hover:bg-slate-50 transition-colors">
                <td class="px-6 py-3 font-medium text-slate-700 truncate max-w-[200px]" :title="page.path">
                  {{ page.path }}
                </td>
                <td class="px-6 py-3 text-right font-bold text-slate-900">
                  {{ page.views }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Recent Visits -->
      <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div class="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <h3 class="font-bold text-slate-900">最新访问 (Top 20)</h3>
        </div>
        <div class="p-0 flex-1 overflow-y-auto max-h-[400px]">
          <table class="w-full text-left text-sm">
            <thead class="bg-slate-50 text-slate-500 sticky top-0 shadow-sm">
              <tr>
                <th class="px-6 py-2 font-medium">路径</th>
                <th class="px-6 py-2 font-medium">IP</th>
                <th class="px-6 py-2 font-medium text-right">时间</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-if="!stats?.recentVisits?.length" class="text-slate-400 text-center">
                <td colspan="3" class="py-8">暂无数据</td>
              </tr>
              <tr v-for="(visit, index) in stats?.recentVisits" :key="index" class="hover:bg-slate-50 transition-colors">
                <td class="px-6 py-3 text-slate-700 truncate max-w-[150px]" :title="visit.path">
                  {{ visit.path }}
                </td>
                <td class="px-6 py-3 text-slate-500 font-mono text-xs">
                  {{ visit.ip }}
                </td>
                <td class="px-6 py-3 text-right text-slate-400 text-xs">
                  {{ new Date(visit.created_at).toLocaleString() }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>
