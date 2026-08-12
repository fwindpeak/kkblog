// src/lib/api.ts
import type { UseDialogType } from '../hooks/useDialog';



const API_URL = import.meta.env.VITE_SERVER_URL || "";

// Global dialog instance
let dialogInstance: UseDialogType | null = null;

// Set dialog instance for use in API requests
export function setDialog(dialog: UseDialogType) {
    dialogInstance = dialog;
}

export const request = async <T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'DELETE' = 'GET',
    body?: any
): Promise<T | null> => {
    const token = localStorage.getItem('admin_token');
    const headers: any = {
        'Content-Type': 'application/json',
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const res = await fetch(`${API_URL}${endpoint}`, {
            method,
            headers,
            body: body ? JSON.stringify(body) : null
        });

        if (res.status === 401) {
            if (dialogInstance) {
                await dialogInstance.alert({
                    message: "登录过期或密钥错误",
                    type: 'error',
                    title: '认证失败'
                });
            } else {
                alert("登录过期或密钥错误");
            }
            localStorage.removeItem('admin_token');
            window.location.reload();
            return null;
        }

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Request failed');
        }

        return await res.json();
    } catch (e: any) {
        console.error(e);
        if (dialogInstance) {
            await dialogInstance.alert({
                message: e.message,
                type: 'error',
                title: '请求失败'
            });
        } else {
            alert(e.message);
        }
        return null;
    }
};