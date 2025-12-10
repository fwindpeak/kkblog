<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue';
import { request } from '../lib/api';
import { IconPen, IconTrash } from '../components/Icons';

interface Post {
    slug: string;
    title: string;
    content: string;
    tags: string[];
    created_at?: string;
}

const posts = ref<Post[]>([]);
const isEditing = ref(false);

// 表单数据
const form = reactive({
    slug: '',
    title: '',
    content: '',
    tagsInput: '' // 用字符串处理标签输入
});

const loadPosts = async () => {
    const data = await request<Post[]>('/api/posts');
    if (data) posts.value = data;
};

const handleEdit = (post: Post) => {
    form.slug = post.slug;
    form.title = post.title;
    form.content = post.content;
    form.tagsInput = post.tags.join(', ');
    isEditing.value = true;
};

const handleCreate = () => {
    form.slug = '';
    form.title = '';
    form.content = '';
    form.tagsInput = '';
    isEditing.value = true;
};

const handleDelete = async (slug: string) => {
    if (!confirm('确定删除?')) return;
    await request(`/api/post/${slug}`, 'DELETE');
    loadPosts();
};

const handleSave = async () => {
    const tagsArray = form.tagsInput.split(/[,，]/).map(t => t.trim()).filter(t => t);

    let finalSlug = form.slug;
    if (!finalSlug && form.title) {
        finalSlug = form.title.toLowerCase().replace(/\s+/g, '-').slice(0, 50);
    }

    const payload = {
        slug: finalSlug,
        title: form.title,
        content: form.content,
        tags: tagsArray
    };

    const res = await request<{ success: boolean }>('/api/post', 'POST', payload);
    if (res?.success) {
        isEditing.value = false;
        loadPosts();
    }
};

onMounted(loadPosts);
</script>

<template>
    <div v-if="isEditing" class="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-slate-200 h-full flex flex-col">
        <div class="flex justify-between items-center mb-6">
            <h2 class="text-xl font-bold">{{ form.slug ? '编辑文章' : '新建文章' }}</h2>
            <button @click="isEditing = false" class="text-slate-500 hover:text-slate-800">取消</button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
                <label class="block text-sm font-bold mb-1">标题</label>
                <input v-model="form.title" class="w-full p-2 border border-slate-300 rounded" placeholder="文章标题" />
            </div>
            <div>
                <label class="block text-sm font-bold mb-1">Slug (URL)</label>
                <input v-model="form.slug"
                    class="w-full p-2 border border-slate-300 rounded bg-slate-50 font-mono text-sm"
                    placeholder="自动生成" />
            </div>
        </div>

        <div class="mb-4">
            <label class="block text-sm font-bold mb-1">标签 (逗号分隔)</label>
            <input v-model="form.tagsInput" class="w-full p-2 border border-slate-300 rounded"
                placeholder="Tech, Life" />
        </div>

        <div class="flex-1 flex flex-col mb-4">
            <label class="block text-sm font-bold mb-1">内容 (Markdown)</label>
            <textarea v-model="form.content"
                class="flex-1 w-full p-4 border border-slate-300 rounded font-mono text-sm leading-relaxed resize-none focus:ring-2 focus:ring-blue-500 outline-none min-h-[300px]"
                placeholder="# 开始写作..."></textarea>
        </div>

        <div class="flex justify-end">
            <button @click="handleSave"
                class="w-full md:w-auto px-6 py-2 bg-slate-900 text-white rounded hover:bg-slate-700">保存文章</button>
        </div>
    </div>

    <div v-else class="space-y-6">
        <div class="flex justify-between items-center">
            <h2 class="text-2xl font-serif font-bold">文章列表</h2>
            <button @click="handleCreate" class="px-4 py-2 bg-slate-900 text-white rounded hover:bg-slate-700 text-sm">+
                新建</button>
        </div>

        <div class="space-y-4 md:space-y-0">
            <div class="hidden md:block bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table class="w-full text-left text-sm">
                    <thead class="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th class="p-4 font-bold text-slate-600">标题</th>
                            <th class="p-4 font-bold text-slate-600">日期</th>
                            <th class="p-4 font-bold text-slate-600 text-right">操作</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        <tr v-for="post in posts" :key="post.slug" class="hover:bg-slate-50">
                            <td class="p-4">
                                <div class="font-bold text-slate-800">{{ post.title }}</div>
                                <div class="text-xs text-slate-400 font-mono mt-1">{{ post.slug }}</div>
                            </td>
                            <td class="p-4 text-slate-500">{{ new Date(post.created_at || '').toLocaleDateString() }}
                            </td>
                            <td class="p-4 text-right space-x-2">
                                <button @click="handleEdit(post)" class="text-blue-600 p-1">
                                    <IconPen class="w-4 h-4" />
                                </button>
                                <button @click="handleDelete(post.slug)" class="text-red-500 p-1">
                                    <IconTrash class="w-4 h-4" />
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div v-for="post in posts" :key="post.slug + 'm'"
                class="md:hidden bg-white p-4 rounded-lg shadow-sm border border-slate-200">
                <div class="flex justify-between items-start mb-2">
                    <div>
                        <h3 class="font-bold text-slate-800">{{ post.title }}</h3>
                        <div class="text-xs text-slate-400 font-mono">{{ post.slug }}</div>
                    </div>
                    <div class="flex gap-2">
                        <button @click="handleEdit(post)" class="bg-blue-50 text-blue-600 p-2 rounded">
                            <IconPen class="w-4 h-4" />
                        </button>
                        <button @click="handleDelete(post.slug)" class="bg-red-50 text-red-500 p-2 rounded">
                            <IconTrash class="w-4 h-4" />
                        </button>
                    </div>
                </div>
                <div class="text-xs text-slate-500 border-t border-slate-100 pt-2 mt-2">
                    {{ new Date(post.created_at || '').toLocaleDateString() }}
                    <span class="float-right text-slate-400">{{ post.tags.join(', ') }}</span>
                </div>
            </div>
        </div>
    </div>
</template>