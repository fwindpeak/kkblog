<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue';
import { marked } from '../lib/markedSetup';
import { formatDateTime } from '../lib/utils';

export interface ThoughtItem {
  id: number;
  content: string;
  mood: string;
  likes: number;
  created_at: string;
  html?: string;
}

const props = defineProps<{
  initialThoughts: ThoughtItem[];
}>();

// 随笔列表：初始化直接读取 props，确保 SSR 直出渲染
const thoughts = ref<ThoughtItem[]>(
  (props.initialThoughts || []).map((t) => ({
    ...t,
    html: t.html || renderMarkdown(t.content) as string,
  }))
);

// 管理员登录状态
const token = ref('');
const isLoggedIn = computed(() => !!token.value);
const isLoginModalOpen = ref(false);
const loginSecret = ref('');
const loginError = ref('');
const isLoggingIn = ref(false);

// 发布与编辑表单状态
const content = ref('');
const editingId = ref<number | null>(null);
const isSubmitting = ref(false);
const isUploading = ref(false);
const textareaRef = ref<HTMLTextAreaElement | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);
const formCardRef = ref<HTMLElement | null>(null);

// Toast 提示
const toast = ref<{ show: boolean; message: string; type: 'success' | 'error' | 'info' }>({
  show: false,
  message: '',
  type: 'success',
});
let toastTimer: any = null;

const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
  if (toastTimer) clearTimeout(toastTimer);
  toast.value = { show: true, message, type };
  toastTimer = setTimeout(() => {
    toast.value.show = false;
  }, 3500);
};

// 展开评论区状态管理
const expandedComments = ref<Record<number, boolean>>({});
const commentsData = ref<Record<number, any[]>>({});
const commentsLoading = ref<Record<number, boolean>>({});
const commentAuthor = ref<Record<number, string>>({});
const commentInput = ref<Record<number, string>>({});
const commentSubmitting = ref<Record<number, boolean>>({});

// 点赞状态缓存 (已点赞记录)
const likedThoughts = ref<Record<number, boolean>>({});

// Markdown 转 HTML
const renderMarkdown = (raw: string) => {
  try {
    return marked.parse(raw);
  } catch (e) {
    return raw;
  }
};

// 初始化
onMounted(() => {
  if (typeof window !== 'undefined') {
    const savedToken = localStorage.getItem('admin_token') || '';
    if (savedToken) {
      token.value = savedToken;
    }

    // 支持通过 URL 参数隐式打开登录框 (例如 /thoughts?login 或 /thoughts?admin)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('login') || urlParams.has('admin') || urlParams.has('auth')) {
      if (!savedToken) {
        isLoginModalOpen.value = true;
      }
    }
  }

  // 整理传入的初始随笔
  thoughts.value = (props.initialThoughts || []).map((t) => ({
    ...t,
    html: t.html || renderMarkdown(t.content) as string,
  }));
});

// 隐蔽快捷方式：点击标题 3 次呼出登录框
let secretClickCount = 0;
let secretClickTimer: any = null;
const handleSecretClick = () => {
  if (isLoggedIn.value) return;
  secretClickCount++;
  if (secretClickTimer) clearTimeout(secretClickTimer);
  secretClickTimer = setTimeout(() => {
    secretClickCount = 0;
  }, 1000);
  if (secretClickCount >= 3) {
    isLoginModalOpen.value = true;
    secretClickCount = 0;
  }
};

// 登录处理
const handleLogin = async () => {
  if (!loginSecret.value.trim()) {
    loginError.value = '请输入管理员口令';
    return;
  }
  isLoggingIn.value = true;
  loginError.value = '';

  try {
    const res = await fetch('/api/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: loginSecret.value.trim() }),
    });
    const data = await res.json();

    if (res.ok && data.success) {
      token.value = loginSecret.value.trim();
      localStorage.setItem('admin_token', token.value);
      isLoginModalOpen.value = false;
      loginSecret.value = '';
      showToast('🎉 管理员登录成功！您现在可以随时发布与管理随笔。', 'success');
      nextTick(() => {
        textareaRef.value?.focus();
      });
    } else {
      loginError.value = data.error || '口令错误，请重试';
    }
  } catch (err: any) {
    loginError.value = err.message || '网络异常，登录失败';
  } finally {
    isLoggingIn.value = false;
  }
};

// 退出登录
const handleLogout = () => {
  localStorage.removeItem('admin_token');
  token.value = '';
  cancelEdit();
  showToast('已退出管理员身份', 'info');
};

// 在光标处插入内容
const insertAtCursor = (text: string) => {
  if (!textareaRef.value) {
    content.value += text;
    return;
  }
  const el = textareaRef.value;
  const start = el.selectionStart;
  const end = el.selectionEnd;
  const oldVal = content.value;
  content.value = oldVal.substring(0, start) + text + oldVal.substring(end);
  nextTick(() => {
    el.selectionStart = el.selectionEnd = start + text.length;
    el.focus();
  });
};

// 上传图片核心逻辑
const uploadFile = async (file: File) => {
  if (!file.type.startsWith('image/')) {
    showToast('只能上传图片文件', 'error');
    return;
  }
  isUploading.value = true;
  try {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token.value}`,
      },
      body: formData,
    });
    const data = await res.json();
    if (res.ok && data.url) {
      insertAtCursor(`\n![](${data.url})\n`);
      showToast('图片上传成功', 'success');
    } else {
      showToast(data.error || '图片上传失败', 'error');
    }
  } catch (e: any) {
    showToast('上传失败: ' + e.message, 'error');
  } finally {
    isUploading.value = false;
  }
};

// 选择本地图片
const onFileSelect = (e: Event) => {
  const input = e.target as HTMLInputElement;
  if (input.files && input.files[0]) {
    uploadFile(input.files[0]);
    input.value = '';
  }
};

// 粘贴图片
const handlePaste = (e: ClipboardEvent) => {
  if (!e.clipboardData) return;
  const items = e.clipboardData.items;
  for (let i = 0; i < items.length; i++) {
    if (items[i].type.indexOf('image') !== -1) {
      e.preventDefault();
      const file = items[i].getAsFile();
      if (file) uploadFile(file);
      break;
    }
  }
};

// 拖拽图片
const handleDrop = (e: DragEvent) => {
  if (!e.dataTransfer || !e.dataTransfer.files) return;
  const files = e.dataTransfer.files;
  if (files.length > 0 && files[0].type.startsWith('image/')) {
    e.preventDefault();
    uploadFile(files[0]);
  }
};

// 键盘快捷键 (Cmd+Enter / Ctrl+Enter)
const handleKeydown = (e: KeyboardEvent) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
    e.preventDefault();
    handleSubmit();
  }
};

// 提交发布或更新
const handleSubmit = async () => {
  if (!content.value.trim() || isSubmitting.value || isUploading.value) return;

  isSubmitting.value = true;
  try {
    const res = await fetch('/api/thought', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token.value}`,
      },
      body: JSON.stringify({
        id: editingId.value || undefined,
        content: content.value.trim(),
      }),
    });

    const data = await res.json();
    if (res.ok && data.success) {
      const isEdit = !!editingId.value;

      // 清空输入框
      content.value = '';
      editingId.value = null;

      showToast(isEdit ? '✨ 随笔修改成功！' : '🎉 随笔发布成功！', 'success');

      // 实时获取最新列表保证数据同步
      await refreshThoughts();
    } else {
      if (res.status === 401) {
        token.value = '';
        localStorage.removeItem('admin_token');
        showToast('登录口令失效，请重新登录', 'error');
        isLoginModalOpen.value = true;
      } else {
        showToast(data.error || '提交失败', 'error');
      }
    }
  } catch (err: any) {
    showToast('网络错误: ' + err.message, 'error');
  } finally {
    isSubmitting.value = false;
  }
};

// 刷新随笔列表
const refreshThoughts = async () => {
  try {
    const res = await fetch('/api/thoughts');
    if (res.ok) {
      const data = await res.json();
      thoughts.value = data.map((t: any) => ({
        ...t,
        html: renderMarkdown(t.content),
      }));
    }
  } catch (e) {
    console.error('Failed to refresh thoughts:', e);
  }
};

// 编辑随笔
const startEdit = (thought: ThoughtItem) => {
  editingId.value = thought.id;
  content.value = thought.content;

  // 平滑滚动到发布卡片
  if (formCardRef.value) {
    formCardRef.value.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  nextTick(() => {
    textareaRef.value?.focus();
  });
};

// 取消编辑
const cancelEdit = () => {
  editingId.value = null;
  content.value = '';
};

// 删除随笔
const handleDelete = async (id: number) => {
  if (!confirm('确定要删除这条随笔吗？删除后将无法恢复。')) return;

  try {
    const res = await fetch(`/api/thought/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token.value}`,
      },
    });
    const data = await res.json();
    if (res.ok && data.success) {
      thoughts.value = thoughts.value.filter((t) => t.id !== id);
      if (editingId.value === id) {
        cancelEdit();
      }
      showToast('已成功删除随笔', 'info');
    } else {
      showToast(data.error || '删除失败', 'error');
    }
  } catch (e: any) {
    showToast('删除失败: ' + e.message, 'error');
  }
};

// 点赞
const handleLike = async (thought: ThoughtItem) => {
  if (likedThoughts.value[thought.id]) {
    showToast('你已经为这条随笔点过赞了 ❤️', 'info');
    return;
  }
  likedThoughts.value[thought.id] = true;
  thought.likes = (thought.likes || 0) + 1;

  try {
    await fetch('/api/like', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'thought', id: thought.id }),
    });
  } catch (e) {
    console.error('Like request failed', e);
  }
};

// 切换评论展开
const toggleComments = async (thoughtId: number) => {
  const isOpen = !expandedComments.value[thoughtId];
  expandedComments.value[thoughtId] = isOpen;

  if (isOpen && (!commentsData.value[thoughtId] || commentsData.value[thoughtId].length === 0)) {
    await loadComments(thoughtId);
  }
};

// 加载评论
const loadComments = async (thoughtId: number) => {
  commentsLoading.value[thoughtId] = true;
  try {
    const res = await fetch(`/api/comments?type=thought&id=${thoughtId}`);
    if (res.ok) {
      const data = await res.json();
      commentsData.value[thoughtId] = Array.isArray(data) ? data : [];
    }
  } catch (e) {
    console.error('Failed to load comments', e);
  } finally {
    commentsLoading.value[thoughtId] = false;
  }
};

// 提交评论
const submitComment = async (thoughtId: number) => {
  const text = (commentInput.value[thoughtId] || '').trim();
  if (!text) return;

  const author = (commentAuthor.value[thoughtId] || '').trim() || '随行访客';
  commentSubmitting.value[thoughtId] = true;

  try {
    const res = await fetch('/api/comment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'thought',
        id: String(thoughtId),
        author,
        content: text,
      }),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      commentInput.value[thoughtId] = '';
      showToast('评论发布成功', 'success');
      await loadComments(thoughtId);
    } else {
      showToast(data.error || '评论提交失败', 'error');
    }
  } catch (e: any) {
    showToast('提交失败: ' + e.message, 'error');
  } finally {
    commentSubmitting.value[thoughtId] = false;
  }
};
</script>

<template>
  <div class="w-full max-w-4xl mx-auto px-2 sm:px-4">
    <!-- Toast 浮动提示 -->
    <transition
      enter-active-class="transition duration-300 ease-out transform"
      enter-from-class="-translate-y-4 opacity-0 scale-95"
      enter-to-class="translate-y-0 opacity-100 scale-100"
      leave-active-class="transition duration-200 ease-in transform"
      leave-from-class="translate-y-0 opacity-100 scale-100"
      leave-to-class="-translate-y-4 opacity-0 scale-95"
    >
      <div
        v-if="toast.show"
        class="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-5 py-3 rounded-full shadow-xl text-sm font-medium backdrop-blur-md border pointer-events-none"
        :class="{
          'bg-emerald-500/95 text-white border-emerald-400': toast.type === 'success',
          'bg-rose-500/95 text-white border-rose-400': toast.type === 'error',
          'bg-slate-800/95 text-white border-slate-700': toast.type === 'info',
        }"
      >
        <span v-if="toast.type === 'success'">✓</span>
        <span v-else-if="toast.type === 'error'">✕</span>
        <span v-else>ℹ</span>
        <span>{{ toast.message }}</span>
      </div>
    </transition>

    <!-- Header 头部：更大气宽敞的标题与操作栏 -->
    <header class="mb-10 sm:mb-12">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-black/[0.05] dark:border-white/[0.06]">
        <div>
          <div class="flex items-center gap-3">
            <h1
              @click="handleSecretClick"
              class="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white m-0 select-none cursor-default"
            >
              瞬息念头
            </h1>
            <span class="px-2.5 py-0.5 text-xs font-medium rounded-full bg-black/[0.04] dark:bg-white/[0.06] text-gray-500 dark:text-gray-400">
              {{ thoughts.length }} 篇札记
            </span>
          </div>
          <p class="mt-2 text-base sm:text-lg text-gray-500 dark:text-gray-400 font-normal">
            收集片刻，于静止与喧嚣之中。记录随时随地的碎片灵感与生活微光。
          </p>
        </div>

        <!-- 顶部管理员状态 (仅登录后显示低调的状态与退出) -->
        <div v-if="isLoggedIn" class="flex items-center gap-3 self-start sm:self-auto">
          <div class="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 text-xs font-medium text-emerald-700 dark:text-emerald-300">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            已就绪
          </div>
          <button
            @click="handleLogout"
            class="px-2.5 py-1 text-xs text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
            title="退出登录"
          >
            退出
          </button>
        </div>
      </div>
    </header>

    <!-- 随时发布操作区 (仅在博主已登录时展开展示) -->
    <section v-if="isLoggedIn" ref="formCardRef" class="mb-10 sm:mb-12">
      <div
        class="bg-white dark:bg-[#1c1c20] rounded-2xl p-5 sm:p-7 border transition-all duration-300 shadow-[0_2px_12px_-2px_rgba(0,0,0,0.03),0_1px_3px_rgba(0,0,0,0.02)]"
        :class="editingId ? 'border-blue-400/80 ring-2 ring-blue-500/15' : 'border-black/[0.05] dark:border-white/[0.06] hover:border-black/[0.08] dark:hover:border-white/[0.1]'"
      >
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <span class="text-xl">✍️</span>
            <span class="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
              {{ editingId ? '编辑随笔' : '随时记一笔' }}
            </span>
            <span v-if="editingId" class="text-xs px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-300 font-medium">
              正在修改 #{{ editingId }}
            </span>
          </div>
          <button
            v-if="editingId"
            @click="cancelEdit"
            class="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 underline cursor-pointer"
          >
            取消编辑
          </button>
        </div>

        <!-- 文本输入区 -->
        <div class="relative">
          <textarea
            ref="textareaRef"
            v-model="content"
            @keydown="handleKeydown"
            @paste="handlePaste"
            @drop="handleDrop"
            @dragover.prevent
            rows="4"
            class="w-full text-base sm:text-[17px] leading-relaxed p-4 bg-black/[0.015] dark:bg-white/[0.03] border border-black/[0.05] dark:border-white/[0.06] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#25c2a0]/25 focus:border-[#25c2a0] dark:focus:border-[#25c2a0] text-gray-900 dark:text-gray-100 placeholder-gray-400 resize-y transition-all"
            placeholder="记录此刻的念头、灵感或生活片刻... (支持 Markdown 语法，Cmd/Ctrl + Enter 快捷发布，支持直接粘贴或拖拽图片)"
          ></textarea>

          <!-- 上传中遮罩 -->
          <div
            v-if="isUploading"
            class="absolute inset-0 bg-white/70 dark:bg-black/60 backdrop-blur-xs flex items-center justify-center rounded-xl gap-2 text-sm text-gray-700 dark:text-gray-200 font-medium"
          >
            <svg class="animate-spin h-5 w-5 text-[#25c2a0]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
            </svg>
            <span>图片上传中...</span>
          </div>
        </div>

        <!-- 底部控制栏：图片上传与发布按钮 -->
        <div class="mt-4 flex items-center justify-between gap-3 pt-3 border-t border-black/[0.04] dark:border-white/[0.04]">
          <!-- 左侧：图片上传按钮 -->
          <div class="flex items-center gap-2">
            <button
              type="button"
              @click="fileInputRef?.click()"
              :disabled="isUploading"
              class="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300 bg-black/[0.03] hover:bg-black/[0.06] dark:bg-white/[0.05] dark:hover:bg-white/[0.09] border border-black/[0.04] dark:border-white/[0.06] rounded-xl transition-colors cursor-pointer"
              title="插入图片 (支持粘贴与拖拽)"
            >
              <svg class="w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21 15 16 10 5 21"></polyline>
              </svg>
              <span>图片</span>
            </button>
            <input ref="fileInputRef" type="file" accept="image/*" class="hidden" @change="onFileSelect" />
          </div>

          <!-- 右侧：快捷键说明与发布按钮 -->
          <div class="flex items-center gap-3">
            <span class="text-xs text-gray-400 hidden sm:inline">⌘ + Enter 快速发布</span>
            <button
              type="button"
              @click="handleSubmit"
              :disabled="!content.trim() || isSubmitting || isUploading"
              class="px-5 py-2 rounded-xl text-sm font-semibold text-white transition-all duration-200 flex items-center gap-2 cursor-pointer shadow-sm hover:shadow active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed"
              :class="editingId ? 'bg-blue-600 hover:bg-blue-700' : 'bg-[#25c2a0] hover:bg-[#1fa98a]'"
            >
              <svg v-if="isSubmitting" class="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
              </svg>
              <svg v-else class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
              <span>{{ isSubmitting ? '保存中...' : (editingId ? '保存修改' : '立即发布') }}</span>
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- 随笔流列表 (大气排版、大字号、饱满呼吸感) -->
    <div class="space-y-6 sm:space-y-8">
      <article
        v-for="thought in thoughts"
        :key="thought.id"
        class="bg-white dark:bg-[#1c1c20] rounded-2xl p-6 sm:p-8 border border-black/[0.05] dark:border-white/[0.06] shadow-[0_2px_12px_-2px_rgba(0,0,0,0.03),0_1px_3px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_24px_-4px_rgba(0,0,0,0.05),0_2px_6px_rgba(0,0,0,0.02)] hover:border-black/[0.08] dark:hover:border-white/[0.1] transition-all duration-300 relative group"
        :class="{ 'border-blue-400/80 ring-2 ring-blue-500/15': editingId === thought.id }"
      >
        <!-- 顶部：时间戳与管理操作 -->
        <div class="flex items-center justify-between gap-4 mb-3 sm:mb-4">
          <time class="text-xs sm:text-sm text-gray-400 dark:text-zinc-500 font-mono tracking-wide">
            {{ formatDateTime(thought.created_at) }}
          </time>

          <!-- 博主管理操作区 (编辑 / 删除，仅登录可见) -->
          <div v-if="isLoggedIn" class="flex items-center gap-1 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              @click="startEdit(thought)"
              class="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer"
              title="编辑此随笔"
            >
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
            <button
              @click="handleDelete(thought.id)"
              class="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
              title="删除此随笔"
            >
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </div>

        <!-- 随笔正文内容：更大气的字号与更舒适的行距 -->
        <div
          class="text-base sm:text-[18px] text-gray-800 dark:text-gray-200 leading-[1.8] font-normal prose dark:prose-invert max-w-none prose-p:my-2 first:prose-p:mt-0 last:prose-p:mb-0 prose-img:rounded-2xl prose-img:border prose-img:border-black/[0.06] dark:prose-img:border-white/[0.08] prose-img:shadow-sm prose-img:max-h-[500px] prose-img:w-auto prose-img:my-4 prose-a:text-[#25c2a0] hover:prose-a:underline"
          v-html="thought.html || renderMarkdown(thought.content)"
        ></div>

        <!-- 底部互动操作区：点赞与评论展开 -->
        <div class="mt-6 pt-4 border-t border-black/[0.04] dark:border-white/[0.04] flex items-center justify-between text-sm">
          <div class="flex items-center gap-3">
            <!-- 点赞按钮 -->
            <button
              @click="handleLike(thought)"
              class="flex items-center gap-2 px-3.5 py-1.5 rounded-full transition-all duration-200 cursor-pointer font-medium"
              :class="likedThoughts[thought.id] ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200/50' : 'bg-black/[0.03] hover:bg-rose-50 hover:text-rose-600 dark:bg-white/[0.05] dark:hover:bg-rose-950/40 dark:hover:text-rose-400 text-gray-600 dark:text-gray-400 border border-black/[0.03] dark:border-white/[0.04]'"
            >
              <span class="text-base" :class="{ 'scale-125 inline-block transition-transform': likedThoughts[thought.id] }">❤️</span>
              <span>{{ thought.likes || 0 }}</span>
            </button>

            <!-- 评论展开按钮 -->
            <button
              @click="toggleComments(thought.id)"
              class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-black/[0.03] hover:bg-black/[0.06] dark:bg-white/[0.05] dark:hover:bg-white/[0.09] text-gray-600 dark:text-gray-400 border border-black/[0.03] dark:border-white/[0.04] transition-colors cursor-pointer font-medium"
            >
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
              <span>讨论</span>
              <span v-if="commentsData[thought.id]?.length" class="text-xs bg-black/[0.06] dark:bg-white/[0.1] px-1.5 py-0.2 rounded-full">
                {{ commentsData[thought.id].length }}
              </span>
            </button>
          </div>

          <span v-if="editingId === thought.id" class="text-xs font-semibold text-blue-500 animate-pulse">
            ● 正在编辑中
          </span>
        </div>

        <!-- 评论展开抽屉 -->
        <div v-if="expandedComments[thought.id]" class="mt-5 pt-4 border-t border-black/[0.04] dark:border-white/[0.04]">
          <div class="bg-black/[0.015] dark:bg-white/[0.02] border border-black/[0.04] dark:border-white/[0.04] rounded-2xl p-4 sm:p-5">
            <!-- 评论列表 -->
            <div class="space-y-3 mb-4">
              <div v-if="commentsLoading[thought.id]" class="text-center py-4 text-xs text-gray-400">
                加载讨论中...
              </div>
              <div v-else-if="!commentsData[thought.id] || commentsData[thought.id].length === 0" class="text-center py-4 text-xs text-gray-400">
                暂无留言，快来抢个沙发吧 ✨
              </div>
              <div
                v-for="(cmt, idx) in commentsData[thought.id]"
                :key="idx"
                class="bg-white dark:bg-[#202024] p-3.5 rounded-xl border border-black/[0.04] dark:border-white/[0.05] text-sm"
              >
                <div class="flex items-center justify-between text-xs text-gray-400 mb-1.5">
                  <span class="font-bold text-gray-800 dark:text-gray-200">{{ cmt.author || '匿名访客' }}</span>
                  <span>{{ formatDateTime(cmt.created_at) }}</span>
                </div>
                <div class="text-gray-700 dark:text-gray-300 leading-relaxed">
                  {{ cmt.content }}
                </div>
              </div>
            </div>

            <!-- 发表评论表单 -->
            <div class="space-y-2.5 pt-2 border-t border-black/[0.04] dark:border-white/[0.04]">
              <div class="flex gap-2">
                <input
                  v-model="commentAuthor[thought.id]"
                  type="text"
                  placeholder="你的昵称 (选填)"
                  class="w-40 px-3 py-1.5 text-xs bg-white dark:bg-[#202024] border border-black/[0.06] dark:border-white/[0.08] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#25c2a0]"
                />
              </div>
              <div class="flex gap-2">
                <input
                  v-model="commentInput[thought.id]"
                  @keydown.enter="submitComment(thought.id)"
                  type="text"
                  placeholder="说点什么吧..."
                  class="flex-1 px-3 py-2 text-sm bg-white dark:bg-[#202024] border border-black/[0.06] dark:border-white/[0.08] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#25c2a0]"
                />
                <button
                  @click="submitComment(thought.id)"
                  :disabled="!commentInput[thought.id]?.trim() || commentSubmitting[thought.id]"
                  class="px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-40 cursor-pointer"
                >
                  {{ commentSubmitting[thought.id] ? '发送中' : '发送' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </article>

      <!-- 空状态 -->
      <div v-if="thoughts.length === 0" class="text-center py-16 bg-white dark:bg-[#1f1f23] rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
        <span class="text-4xl block mb-2">🍃</span>
        <h3 class="text-lg font-bold text-gray-800 dark:text-gray-200">暂无随笔</h3>
        <p class="text-sm text-gray-400 mt-1">登录博主账号，记录下第一篇瞬息念头吧！</p>
      </div>
    </div>

    <!-- 页面底部低调隐蔽的微小文字按钮 (仅未登录时可见) -->
    <div v-if="!isLoggedIn" class="pt-14 pb-4 text-center">
      <button
        @click="isLoginModalOpen = true"
        class="text-[11px] text-gray-300 dark:text-gray-700 hover:text-gray-400 dark:hover:text-gray-500 transition-colors cursor-pointer select-none tracking-widest font-mono"
        title="管理入口"
      >
        · 管理 ·
      </button>
    </div>

    <!-- 博主登录 Modal 对话框 -->
    <div
      v-if="isLoginModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
      @click.self="isLoginModalOpen = false"
    >
      <div class="bg-white dark:bg-[#1c1c20] rounded-2xl shadow-2xl border border-black/[0.06] dark:border-white/[0.08] max-w-sm w-full p-6 animate-in fade-in zoom-in-95 duration-200">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2">
            <span class="text-xl">🔐</span>
            <h3 class="text-lg font-bold text-gray-900 dark:text-white m-0">博主验证</h3>
          </div>
          <button
            @click="isLoginModalOpen = false"
            class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg leading-none p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>

        <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
          输入口令以解锁随笔随时发布与管理功能：
        </p>

        <form @submit.prevent="handleLogin" class="space-y-4">
          <div>
            <input
              v-model="loginSecret"
              type="password"
              placeholder="请输入管理员密码"
              autofocus
              class="w-full px-4 py-2.5 bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.08] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#25c2a0]/30 text-gray-900 dark:text-white text-sm"
            />
            <p v-if="loginError" class="text-xs text-rose-500 mt-1.5 font-medium">
              {{ loginError }}
            </p>
          </div>

          <div class="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              @click="isLoginModalOpen = false"
              class="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors cursor-pointer"
            >
              取消
            </button>
            <button
              type="submit"
              :disabled="isLoggingIn"
              class="px-5 py-2 text-sm font-semibold text-white bg-[#25c2a0] hover:bg-[#1fa98a] rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <svg v-if="isLoggingIn" class="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
              </svg>
              <span>{{ isLoggingIn ? '验证中...' : '确认登录' }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
