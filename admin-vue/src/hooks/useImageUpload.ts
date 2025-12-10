// src/hooks/useImageUpload.ts
import { ref } from 'vue';

const API_URL = import.meta.env.VITE_API_URL || '';

export function useImageUpload() {
    const isUploading = ref(false);

    // 上传核心方法
    const uploadFile = async (file: File): Promise<string | null> => {
        const token = localStorage.getItem('admin_token');
        const formData = new FormData();
        formData.append('file', file);

        isUploading.value = true;
        try {
            const res = await fetch(`${API_URL}/api/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });
            const data = await res.json();
            if (data.success) {
                return data.url;
            } else {
                alert("上传失败: " + data.error);
                return null;
            }
        } catch (e) {
            alert("上传出错");
            return null;
        } finally {
            isUploading.value = false;
        }
    };

    // 辅助函数：在光标位置插入 Markdown 图片语法
    const insertAtCursor = (
        textarea: HTMLTextAreaElement,
        textToInsert: string,
        updateModel: (val: string) => void
    ) => {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;

        const before = text.substring(0, start);
        const after = text.substring(end, text.length);

        const newValue = before + textToInsert + after;

        // 更新 Vue 的 v-model
        updateModel(newValue);

        // 恢复光标位置
        setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = start + textToInsert.length;
            textarea.focus();
        }, 0);
    };

    // 处理粘贴事件
    const handlePaste = async (e: ClipboardEvent, textarea: HTMLTextAreaElement, updateModel: (val: string) => void) => {
        const items = e.clipboardData?.items;
        if (!items) return;

        for (const item of items) {
            if (item.type.indexOf('image') !== -1) {
                e.preventDefault(); // 阻止默认粘贴（例如粘贴出 blob 链接）
                const file = item.getAsFile();
                if (file) {
                    const url = await uploadFile(file);
                    if (url) {
                        insertAtCursor(textarea, `![](${url})`, updateModel);
                    }
                }
            }
        }
    };

    // 处理拖拽放置事件
    const handleDrop = async (e: DragEvent, textarea: HTMLTextAreaElement, updateModel: (val: string) => void) => {
        e.preventDefault();
        const files = e.dataTransfer?.files;
        if (files && files.length > 0) {
            const file = files[0];
            if (file.type.startsWith('image/')) {
                const url = await uploadFile(file);
                if (url) {
                    insertAtCursor(textarea, `![](${url})`, updateModel);
                }
            }
        }
    };

    return {
        isUploading,
        uploadFile,
        handlePaste,
        handleDrop,
        insertAtCursor
    };
}