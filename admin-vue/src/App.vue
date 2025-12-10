<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { request } from './lib/api';
import PostManager from './pages/PostManager.vue';
import ThoughtManager from './pages/ThoughtManager.vue';
import { IconBook, IconChatBubble, IconRocket, IconMenu, IconX } from './components/Icons';

const token = ref(localStorage.getItem('admin_token') || '');
const currentView = ref<'posts' | 'thoughts'>('posts');
const isBuilding = ref(false);
const isMobileMenuOpen = ref(false); // 控制手机端菜单

const secretInput = ref('');

const handleLogin = () => {
  localStorage.setItem('admin_token', secretInput.value);
  token.value = secretInput.value;
};

const handleLogout = () => {
  localStorage.removeItem('admin_token');
  token.value = '';
  isMobileMenuOpen.value = false;
};

const handleBuild = async () => {
  if (!confirm("确定要发布并构建静态网站吗？")) return;
  isBuilding.value = true;
  const res = await request<{ status: string }>('/api/build', 'POST');
  alert(res?.status || "构建指令已发送");
  isBuilding.value = false;
  isMobileMenuOpen.value = false;
};

const switchView = (view: 'posts' | 'thoughts') => {
  currentView.value = view;
  isMobileMenuOpen.value = false; // 手机端切换后自动关闭菜单
};
</script>

<template>
  <div v-if="!token" class="flex items-center justify-center h-screen bg-slate-100 px-4">
    <div class="bg-white p-8 rounded-xl shadow-lg w-full max-w-sm">
      <h2 class="text-2xl font-bold mb-6 text-center">Admin Login</h2>
      <form @submit.prevent="handleLogin">
        <input v-model="secretInput" type="password" placeholder="Server Secret"
          class="w-full p-3 border rounded mb-4 focus:ring-2 focus:ring-blue-500 outline-none" />
        <button class="w-full bg-slate-900 text-white p-3 rounded font-bold">解锁</button>
      </form>
    </div>
  </div>

  <div v-else class="flex flex-col md:flex-row h-screen bg-slate-50 text-slate-900 font-sans">

    <header
      class="md:hidden bg-white border-b border-slate-200 p-4 flex justify-between items-center sticky top-0 z-20">
      <h1 class="text-lg font-black tracking-tight">MY BLOG ADMIN</h1>
      <button @click="isMobileMenuOpen = !isMobileMenuOpen" class="text-slate-700">
        <IconMenu v-if="!isMobileMenuOpen" class="w-6 h-6" />
        <IconX v-else class="w-6 h-6" />
      </button>
    </header>

    <aside :class="[
      'fixed inset-y-0 left-0 z-10 w-64 bg-white border-r border-slate-200 transform transition-transform duration-200 ease-in-out md:translate-x-0 md:static md:h-full flex flex-col',
      isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
    ]">
      <div class="p-6 border-b border-slate-100 hidden md:block">
        <h1 class="text-xl font-black tracking-tight">MY BLOG <span class="text-slate-400 font-normal">ADMIN</span></h1>
      </div>

      <nav class="flex-1 p-4 space-y-2 mt-14 md:mt-0">
        <button @click="switchView('posts')"
          :class="['w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors', currentView === 'posts' ? 'bg-slate-100 text-slate-900 font-bold' : 'text-slate-500 hover:bg-slate-50']">
          <IconBook class="w-5 h-5" /> 文章管理
        </button>
        <button @click="switchView('thoughts')"
          :class="['w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors', currentView === 'thoughts' ? 'bg-slate-100 text-slate-900 font-bold' : 'text-slate-500 hover:bg-slate-50']">
          <IconChatBubble class="w-5 h-5" /> 随笔记录
        </button>
      </nav>

      <div class="p-4 border-t border-slate-100 bg-white">
        <button @click="handleBuild" :disabled="isBuilding"
          class="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg shadow-md hover:shadow-lg transition-all active:scale-95 disabled:opacity-50">
          <IconRocket :class="['w-5 h-5', isBuilding ? 'animate-pulse' : '']" />
          {{ isBuilding ? '构建中...' : '发布网站' }}
        </button>
        <button @click="handleLogout" class="w-full mt-2 text-xs text-slate-400 hover:text-red-500 py-2">
          退出登录
        </button>
      </div>
    </aside>

    <div v-if="isMobileMenuOpen" @click="isMobileMenuOpen = false" class="fixed inset-0 bg-black/50 z-0 md:hidden">
    </div>

    <main class="flex-1 overflow-hidden p-4 md:p-8 relative w-full">
      <div class="h-full max-w-5xl mx-auto overflow-y-auto pb-20 md:pb-0">
        <PostManager v-if="currentView === 'posts'" />
        <ThoughtManager v-if="currentView === 'thoughts'" />
      </div>
    </main>
  </div>
</template>