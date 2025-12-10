<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { request } from '../lib/api';
// 🟢 引入 IconPen
import { IconTrash, IconPen } from '../components/Icons';

interface Thought {
    id?: number;
    content: string;
    mood: string;
    created_at?: string;
}

const thoughts = ref<Thought[]>([]);
const content = ref('');
const mood = ref('happy');
// 🟢 新增编辑状态
const editingId = ref<number | null>(null);

const moodMap: Record<string, string> = {
    neutral: '😐 平静',
    happy: '😄 愉快',
    pensive: '🤔 沉思',
    excited: '🤩 兴奋'
};

const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr.replace(' ', 'T'));
    return date.toLocaleString('zh-CN', {
        month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
    });
};

const loadThoughts = async () => {
    const data = await request<Thought[]>('/api/thoughts');
    if (data) thoughts.value = data;
};

// 🟢 点击编辑按钮
const handleEdit = (thought: Thought) => {
    content.value = thought.content;
    mood.value = thought.mood;
    editingId.value = thought.id || null;
};

// 🟢 取消编辑
const cancelEdit = () => {
    content.value = '';
    mood.value = 'neutral';
    editingId.value = null;
};

const handleSubmit = async () => {
    if (!content.value) return;

    // 🟢 发送请求时带上 id (如果是编辑模式)
    const res = await request<{ success: boolean }>('/api/thought', 'POST', {
        id: editingId.value,
        content: content.value,
        mood: mood.value
    });

    if (res?.success) {
        // 重置状态
        content.value = '';
        mood.value = 'neutral';
        editingId.value = null;
        loadThoughts();
    }
};

const handleDelete = async (id: number) => {
    if (!confirm('删除?')) return;
    await request(`/api/thought/${id}`, 'DELETE');
    // 如果正在编辑的被删了，也要重置
    if (editingId.value === id) cancelEdit();
    loadThoughts();
};

onMounted(loadThoughts);
</script>

<template>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 h-full">
        <div class="md:col-span-1 space-y-4">
            <div class="flex justify-between items-center mb-4">
                <h2 class="text-2xl font-serif font-bold">
                    {{ editingId ? '修改想法' : '记录想法' }}
                </h2>
                <button v-if="editingId" @click="cancelEdit"
                    class="text-xs text-slate-500 hover:text-slate-800 underline">取消修改</button>
            </div>

            <div class="bg-white p-4 rounded-xl shadow-sm border border-slate-200"
                :class="{ 'ring-2 ring-blue-100': editingId }">
                <textarea v-model="content"
                    class="w-full h-32 p-3 border border-slate-200 rounded resize-none focus:ring-2 focus:ring-blue-500 outline-none mb-3"
                    placeholder="此刻你在想什么..."></textarea>
                <div class="flex justify-between items-center">
                    <select v-model="mood" class="p-2 border border-slate-200 rounded text-sm bg-white">
                        <option v-for="(label, key) in moodMap" :key="key" :value="key">{{ label }}</option>
                    </select>
                    <button @click="handleSubmit" :disabled="!content"
                        class="px-4 py-2 bg-slate-900 text-white rounded text-sm hover:bg-slate-700 disabled:opacity-50 transition-colors"
                        :class="{ 'bg-blue-600 hover:bg-blue-700': editingId }">
                        {{ editingId ? '更新' : '发布' }}
                    </button>
                </div>
            </div>
        </div>

        <div class="md:col-span-2 overflow-y-auto pr-0 md:pr-2">
            <h2 class="text-xl font-bold mb-4 text-slate-500">历史记录 ({{ thoughts.length }})</h2>
            <div class="space-y-4">
                <div v-for="thought in thoughts" :key="thought.id"
                    class="bg-white p-4 rounded-xl shadow-sm border border-slate-100 group relative transition-colors"
                    :class="{ 'border-blue-300 bg-blue-50/30': editingId === thought.id }">
                    <div
                        class="absolute top-4 right-4 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                        <button @click="handleEdit(thought)"
                            class="text-blue-500 hover:text-blue-700 bg-blue-50 p-1 rounded" title="编辑">
                            <IconPen class="w-4 h-4" />
                        </button>
                        <button @click="handleDelete(thought.id!)"
                            class="text-red-400 hover:text-red-600 bg-red-50 p-1 rounded" title="删除">
                            <IconTrash class="w-4 h-4" />
                        </button>
                    </div>

                    <div class="prose prose-sm mb-2 text-slate-800 font-serif whitespace-pre-wrap">{{ thought.content }}
                    </div>

                    <div class="flex items-center gap-2 text-xs text-slate-400 font-mono">
                        <span>{{ formatDate(thought.created_at) }}</span>
                        <span class="bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">
                            {{ moodMap[thought.mood]?.split(' ')[0] }}
                        </span>
                        <span v-if="editingId === thought.id" class="text-blue-500 font-bold ml-2">正在编辑...</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>