<script setup lang="ts">

interface Props {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  type?: 'info' | 'success' | 'error' | 'warning';
}

const props = withDefaults(defineProps<Props>(), {
  isOpen: false,
  title: '提示信息',
  confirmText: '确定',
  type: 'info'
});

const emit = defineEmits<{
  close: [];
  'update:isOpen': [value: boolean];
}>();

const handleConfirm = () => {
  emit('close');
  emit('update:isOpen', false);
};

// 根据类型返回对应的图标类
const getIconClass = () => {
  const iconMap = {
    info: 'text-blue-500',
    success: 'text-green-500',
    error: 'text-red-500',
    warning: 'text-yellow-500'
  };
  return iconMap[props.type];
};

// 根据类型返回对应的标题
const getDefaultTitle = () => {
  const titleMap = {
    info: '提示信息',
    success: '操作成功',
    error: '操作失败',
    warning: '警告'
  };
  return titleMap[props.type];
};
</script>

<template>
  <Transition name="dialog">
    <div v-if="props.isOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div class="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        <!-- 标题 -->
        <div class="px-6 py-4 border-b border-slate-200 flex items-center gap-3">
          <div class="w-8 h-8 rounded-full flex items-center justify-center" :class="getIconClass()">
            <svg v-if="type === 'info'" class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clip-rule="evenodd"></path>
            </svg>
            <svg v-else-if="props.type === 'success'" class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clip-rule="evenodd"></path>
            </svg>
            <svg v-else-if="props.type === 'error'" class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clip-rule="evenodd"></path>
            </svg>
            <svg v-else-if="props.type === 'warning'" class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clip-rule="evenodd"></path>
            </svg>
          </div>
          <h3 class="text-lg font-semibold text-slate-800">{{ props.title || getDefaultTitle() }}</h3>
        </div>

        <!-- 消息内容 -->
        <div class="px-6 py-5">
          <p class="text-slate-600">{{ props.message }}</p>
        </div>

        <!-- 按钮区域 -->
        <div class="px-6 py-4 bg-slate-50 flex justify-end">
          <button @click="handleConfirm"
            class="px-4 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800 transition-colors" :class="{
              'bg-blue-600 hover:bg-blue-700': props.type === 'info',
              'bg-green-600 hover:bg-green-700': props.type === 'success',
              'bg-red-600 hover:bg-red-700': props.type === 'error',
              'bg-yellow-600 hover:bg-yellow-700': props.type === 'warning'
            }">
            {{ props.confirmText }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.dialog-enter-active,
.dialog-leave-active {
  transition: all 0.3s ease;
}

.dialog-enter-from,
.dialog-leave-to {
  opacity: 0;
}

.dialog-enter-from .bg-white,
.dialog-leave-to .bg-white {
  transform: scale(0.95);
  opacity: 0;
}
</style>
