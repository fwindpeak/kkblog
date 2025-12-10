// src/lib/api.ts
const API_URL = "http://localhost:3000";

export const request = async <T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'DELETE' = 'GET',
    body?: any
): Promise<T | null> => {
    const token = localStorage.getItem('admin_token');
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
    };

    if (method !== 'GET') {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const res = await fetch(`${API_URL}${endpoint}`, {
            method,
            headers,
            body: body ? JSON.stringify(body) : null
        });

        if (res.status === 401) {
            alert("登录过期或密钥错误");
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
        alert(e.message);
        return null;
    }
};