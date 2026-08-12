<script setup lang="ts">
import { ref, onMounted, inject } from 'vue';
import { request } from '../lib/api';
import { IconTrash } from '../components/Icons';
import { useDialog } from '../hooks/useDialog';
import { formatDateTime } from '../lib/utils';
type UseDialogType = ReturnType<typeof useDialog>;

const dialog = inject<UseDialogType>('dialog');
if (!dialog) throw new Error('Dialog service not provided');

interface Comment {
    id: number;
    target_id: string;
    target_type: string;
    author: string;
    content: string;
    created_at: string;
}

const comments = ref<Comment[]>([]);
const isLoading = ref(false);

const loadComments = async () => {
    isLoading.value = true;
    // 后端目前没有全局获取评论的接口，我们需要在后端增加一个 /api/all-comments
    const data = await request<Comment[]>('/api/all-comments');
    if (data) comments.value = data;
    isLoading.value = false;
};

const handleDelete = async (id: number) => {
    const confirmed = await dialog.confirm({
        message: '确定删除这条评论吗?',
        title: '删除确认'
    });
    if (!confirmed) return;
    await request(`/api/comment/${id}`, 'DELETE');
    loadComments();
};

onMounted(loadComments);
</script>

<template>
    <div class="space-y-6">
        <div class="flex justify-between items-center">
            <h2 class="text-2xl font-serif font-bold">评论管理</h2>
            <button @click="loadComments" class="text-sm text-slate-500 hover:text-slate-900" :disabled="isLoading">
                {{ isLoading ? '刷新中...' : '刷新' }}
            </button>
        </div>

        <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <table class="w-full text-left text-sm">
                <thead class="bg-slate-50 border-b border-slate-200">
                    <tr>
                        <th class="p-4 font-bold text-slate-600">作者</th>
                        <th class="p-4 font-bold text-slate-600">内容</th>
                        <th class="p-4 font-bold text-slate-600">目标</th>
                        <th class="p-4 font-bold text-slate-600 text-right">操作</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                    <tr v-for="c in comments" :key="c.id" class="hover:bg-slate-50">
                        <td class="p-4">
                            <div class="font-bold text-slate-800">{{ c.author }}</div>
                            <div class="text-xs text-slate-500 mt-1 font-mono">{{ formatDateTime(c.created_at) }}</div>
                        </td>
                        <td class="p-4">
                            <p class="text-slate-600 line-clamp-2 max-w-md">{{ c.content }}</p>
                        </td>
                        <td class="p-4">
                            <span class="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold mr-1"
                                :class="c.target_type === 'post' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'">
                                {{ c.target_type }}
                            </span>
                            <span class="text-xs font-mono text-slate-400">{{ c.target_id }}</span>
                        </td>
                        <td class="p-4 text-right">
                            <button @click="handleDelete(c.id)" class="text-red-500 p-1 hover:bg-red-50 rounded">
                                <IconTrash class="w-4 h-4" />
                            </button>
                        </td>
                    </tr>
                    <tr v-if="comments.length === 0 && !isLoading">
                        <td colspan="5" class="p-8 text-center text-slate-400 italic">暂无评论</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</template>