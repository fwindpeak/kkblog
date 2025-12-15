<script setup lang="ts">
import { watch } from 'vue';

interface Props {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

const props = withDefaults(defineProps<Props>(), {
  isOpen: false,
  title: '确认操作',
  confirmText: '确认',
  cancelText: '取消'
});

const emit = defineEmits(['close', 'update:isOpen']);

const handleConfirm = () => {
  emit('close', true);
  emit('update:isOpen', false);
};

const handleCancel = () => {
  emit('close', false);
  emit('update:isOpen', false);
};

// 监听isOpen变化，确保组件状态正确
watch(() => props.isOpen, (newVal) => {
  if (!newVal) {
    emit('close', false);
  }
});
</script>

<template>
  <Transition name="dialog">
    <div v-if="props.isOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div class="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        <!-- 标题 -->
        <div class="px-6 py-4 border-b border-slate-200">
          <h3 class="text-lg font-semibold text-slate-800">{{ props.title }}</h3>
        </div>

        <!-- 消息内容 -->
        <div class="px-6 py-5">
          <p class="text-slate-600">{{ props.message }}</p>
        </div>

        <!-- 按钮区域 -->
        <div class="px-6 py-4 bg-slate-50 flex justify-end gap-3">
          <button @click="handleCancel"
            class="px-4 py-2 border border-slate-300 text-slate-700 rounded-md hover:bg-slate-100 transition-colors">
            {{ props.cancelText }}
          </button>
          <button @click="handleConfirm"
            class="px-4 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800 transition-colors">
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
