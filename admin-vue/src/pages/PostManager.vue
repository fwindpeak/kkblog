<script setup lang="ts">
import { ref, onMounted, reactive, computed } from 'vue';
import { request } from '../lib/api';
import { IconPen, IconTrash, IconImage } from '../components/Icons';
import { useImageUpload } from '../hooks/useImageUpload';
import { marked } from 'marked';

interface Post {
    slug: string;
    title: string;
    content: string;
    tags: string[];
    read_time?: string;
    created_at?: string;
}
// 🟢 Tab 状态
const activeTab = ref<'write' | 'preview'>('write');

const posts = ref<Post[]>([]);
const isEditing = ref(false);

// 表单数据
const form = reactive({
    slug: '',
    title: '',
    content: '',
    tagsInput: '', // 用字符串处理标签输入
    read_time: '' // 🟢
});


// ... state ...
const textareaRef = ref<HTMLTextAreaElement | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);

// Hook
const { isUploading, uploadFile, handlePaste, handleDrop, insertAtCursor } = useImageUpload();

// 🟢 按钮选择文件
const onFileSelect = async (e: Event) => {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files[0] && textareaRef.value) {
        const url = await uploadFile(input.files[0]);
        if (url) {
            insertAtCursor(textareaRef.value, `![](${url})`, (val) => form.content = val);
        }
        input.value = '';
    }
};

// 🟢 事件代理
const onPaste = (e: ClipboardEvent) => {
    if (textareaRef.value) handlePaste(e, textareaRef.value, (val) => form.content = val);
};
const onDrop = (e: DragEvent) => {
    if (textareaRef.value) handleDrop(e, textareaRef.value, (val) => form.content = val);
};


// 🟢 计算预览 HTML
const previewHtml = computed(() => {
    return form.content ? marked.parse(form.content) : '<p class="text-gray-400 italic">暂无内容...</p>';
});

// 🟢 计算阅读时长算法 (中英文混合)
const calculateReadTime = (content: string): string => {
    const text = content.replace(/[#*`!\[\]\(\)]/g, ''); // 去除 markdown 符号
    // 粗略算法：中文按字数，英文按单词
    const cnCount = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    const enCount = (text.match(/[a-zA-Z0-9]+/g) || []).length;
    const total = cnCount + enCount;
    // 假设阅读速度：每分钟 400 字
    const minutes = Math.ceil(total / 400);
    return `${minutes}`;
};

const loadPosts = async () => {
    const data = await request<Post[]>('/api/posts');
    if (data) posts.value = data;
};

const handleEdit = (post: Post) => {
    form.slug = post.slug;
    form.title = post.title;
    form.content = post.content;
    form.tagsInput = post.tags.join(', ');
    form.read_time = post.read_time || '';
    activeTab.value = 'write'; // 重置为编辑模式
    isEditing.value = true;
};

const handleCreate = () => {
    form.slug = '';
    form.title = '';
    form.content = '';
    form.tagsInput = '';
    activeTab.value = 'write';
    isEditing.value = true;
};

const handleDelete = async (slug: string) => {
    if (!confirm('确定删除?')) return;
    await request(`/api/post/${slug}`, 'DELETE');
    loadPosts();
};


const currentDateTime = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    return `${year}${month}${day}${hour}${minute}`;
}


const handleSave = async () => {
    const tagsArray = form.tagsInput.split(/[,，]/).map(t => t.trim()).filter(t => t);

    let finalSlug = form.slug;
    if (!finalSlug && form.title) {
        finalSlug = currentDateTime()
        form.title.toLowerCase().replace(/\s+/g, '-').slice(0, 50);
    }

    const autoReadTime = calculateReadTime(form.content);

    const payload = {
        slug: finalSlug,
        title: form.title,
        content: form.content,
        tags: tagsArray,
        read_time: autoReadTime
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
            <button @click="isEditing = false" class="text-slate-500 hover:text-slate-800 ml-2">关闭</button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
                <label class="block text-sm font-bold mb-1">标题</label>
                <input v-model="form.title" class="w-full p-2 border border-slate-300 rounded" placeholder="文章标题" />
            </div>
            <div>
                <label class="block text-sm font-bold mb-1">Slug & Tags</label>
                <div class="flex gap-2">
                    <input v-model="form.slug"
                        class="w-1/2 p-2 border border-slate-300 rounded bg-slate-50 font-mono text-sm"
                        placeholder="Slug (自动)" />
                    <input v-model="form.tagsInput" class="w-1/2 p-2 border border-slate-300 rounded"
                        placeholder="标签" />
                </div>
            </div>
        </div>

        <div class="flex gap-2">
            <div class="bg-slate-100 p-1 rounded-lg flex text-xs font-bold">
                <button @click="activeTab = 'write'" class="px-3 py-1.5 rounded-md transition-all"
                    :class="activeTab === 'write' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'">编辑</button>
                <button @click="activeTab = 'preview'" class="px-3 py-1.5 rounded-md transition-all"
                    :class="activeTab === 'preview' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'">预览</button>
            </div>
        </div>

        <div class="flex-1 flex flex-col mb-4 overflow-hidden">
            <div v-show="activeTab === 'write'" class="flex-1 flex flex-col h-full">
                <div class="flex justify-between items-center mb-1">
                    <label class="block text-sm font-bold">内容 (Markdown)</label>
                    <div class="flex items-center gap-2">
                        <span v-if="isUploading" class="text-xs text-blue-500 animate-pulse">上传中...</span>
                        <button @click="fileInputRef?.click()"
                            class="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 bg-slate-100 px-2 py-1 rounded">
                            <IconImage class="w-4 h-4" /> 插图
                        </button>
                        <input ref="fileInputRef" type="file" accept="image/*" class="hidden" @change="onFileSelect" />
                    </div>
                </div>
                <textarea ref="textareaRef" v-model="form.content" @paste="onPaste" @drop="onDrop" @dragover.prevent
                    class="flex-1 w-full p-4 border border-slate-300 rounded font-mono text-sm leading-relaxed resize-none focus:ring-2 focus:ring-blue-500 outline-none min-h-[400px]"
                    placeholder="# 开始写作... (支持拖拽/粘贴图片)"></textarea>
            </div>

            <div v-show="activeTab === 'preview'"
                class="flex-1 overflow-y-auto border border-slate-200 rounded p-6 bg-slate-50">
                <div class="prose prose-slate max-w-none prose-img:rounded-lg" v-html="previewHtml"></div>
            </div>
        </div>

        <div class="flex justify-end items-center gap-4 border-t border-slate-100 pt-4">
            <span class="text-xs text-slate-400">
                预估阅读时长: {{ calculateReadTime(form.content) }} 分钟
            </span>
            <button @click="handleSave"
                class="w-full md:w-auto px-6 py-2 bg-slate-900 text-white rounded hover:bg-slate-700">保存文章</button>
        </div>
    </div>

    <!-- <div v-else class="space-y-6">
        <div class="hidden md:block bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <table class="w-full text-left text-sm">
                <thead class="bg-slate-50 border-b border-slate-200">
                    <tr>
                        <th class="p-4 font-bold text-slate-600">标题</th>
                        <th class="p-4 font-bold text-slate-600">数据</th>
                        <th class="p-4 font-bold text-slate-600 text-right">操作</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                    <tr v-for="post in posts" :key="post.slug" class="hover:bg-slate-50">
                        <td class="p-4">
                            <div class="font-bold text-slate-800">{{ post.title }}</div>
                            <div class="text-xs text-slate-400 font-mono mt-1">{{ post.slug }}</div>
                        </td>
                        <td class="p-4 text-slate-500 text-xs">
                            <div>{{ formatDate(post.created_at) }}</div>
                            <div class="text-slate-400 mt-1">{{ post.read_time }}</div>
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
            <div class="text-xs text-slate-500 border-t border-slate-100 pt-2 mt-2 flex justify-between">
                <span>{{ formatDate(post.created_at) }} · {{ post.read_time }}</span>
                <span class="text-slate-400">{{ post.tags.join(', ') }}</span>
            </div>
        </div>
    </div> -->

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