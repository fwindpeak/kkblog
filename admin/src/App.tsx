import { useState, useEffect, FormEvent, ChangeEvent } from 'react';

// --- 1. 类型定义 (TypeScript Interfaces) ---

// 文章数据结构
interface PostData {
  slug: string;
  title: string;
  content: string;
}

// 通用 API 响应结构
interface ApiResponse {
  success?: boolean;
  status?: string;
  error?: string;
}

// --- 2. 简单的内联样式 (CSS in JS) ---
const styles: Record<string, React.CSSProperties> = {
  container: { maxWidth: '800px', margin: '40px auto', padding: '20px', fontFamily: 'system-ui, -apple-system, sans-serif' },
  card: { border: '1px solid #e1e4e8', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', background: '#fff' },
  input: { width: '100%', padding: '12px', marginBottom: '15px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '16px', boxSizing: 'border-box' },
  textarea: { width: '100%', height: '400px', padding: '12px', marginBottom: '15px', border: '1px solid #d1d5db', borderRadius: '6px', fontFamily: 'monospace', fontSize: '14px', resize: 'vertical', boxSizing: 'border-box' },
  button: { padding: '10px 20px', cursor: 'pointer', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 600, fontSize: '14px' },
  secondaryBtn: { padding: '10px 20px', cursor: 'pointer', backgroundColor: '#059669', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 600, fontSize: '14px', marginLeft: '10px' },
  logoutBtn: { padding: '6px 12px', cursor: 'pointer', backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '12px' },
  label: { display: 'block', marginBottom: '6px', fontWeight: 600, color: '#374151' },
  status: { marginLeft: '15px', fontSize: '14px', color: '#6b7280' }
};

const API_URL = "http://localhost:3000";

function App() {
  // --- State 管理 ---
  const [token, setToken] = useState<string>(localStorage.getItem('admin_token') || '');
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<string>('');

  // 表单数据 State
  const [formData, setFormData] = useState<PostData>({
    slug: '',
    title: '',
    content: ''
  });

  // 初始化检查登录状态
  useEffect(() => {
    if (token) setIsLoggedIn(true);
  }, [token]);

  // --- 核心工具函数：带鉴权的 Fetch ---
  // <T> 是泛型，表示我们期望返回的数据类型
  async function request<T>(endpoint: string, method: 'GET' | 'POST' = 'POST', body?: object): Promise<T | null> {
    setLoading(true);
    setStatusMsg('处理中...');

    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` // 携带 Token
        },
        body: body ? JSON.stringify(body) : null
      });

      if (res.status === 401) {
        setStatusMsg('❌ 密钥已过期或错误，请重新登录');
        handleLogout();
        return null;
      }

      if (!res.ok) {
        const errData = await res.json() as ApiResponse;
        throw new Error(errData.error || `HTTP Error: ${res.status}`);
      }

      const data = await res.json();
      return data as T;
    } catch (err) {
      const message = err instanceof Error ? err.message : '未知错误';
      setStatusMsg(`❌ 错误: ${message}`);
      return null;
    } finally {
      setLoading(false);
    }
  }

  // --- 事件处理 ---

  const handleLogin = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const inputToken = (form.elements.namedItem('secret') as HTMLInputElement).value;

    if (inputToken) {
      localStorage.setItem('admin_token', inputToken);
      setToken(inputToken);
      setIsLoggedIn(true);
    }
  };

  const handleLogout = () => {
    setToken('');
    localStorage.removeItem('admin_token');
    setIsLoggedIn(false);
    setStatusMsg('');
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!formData.slug || !formData.title) {
      alert("Slug 和 标题不能为空");
      return;
    }

    const res = await request<ApiResponse>('/api/post', 'POST', formData);
    if (res?.success) {
      setStatusMsg('✅ 文章保存成功 (Draft)');
    }
  };

  const handleBuild = async () => {
    const confirmBuild = window.confirm("确定要发布吗？这将触发服务器构建。");
    if (!confirmBuild) return;

    // 这里 request 期望返回 { status: string }
    const res = await request<{ status: string }>('/api/build', 'POST');
    if (res?.status) {
      setStatusMsg('🎉 ' + res.status);
    }
  };

  // --- 视图渲染 ---

  // 1. 登录视图
  if (!isLoggedIn) {
    return (
      <div style={{ ...styles.container, marginTop: '100px', textAlign: 'center' }}>
        <div style={{ ...styles.card, maxWidth: '400px', margin: '0 auto' }}>
          <h2 style={{ marginBottom: '20px' }}>🔐 Admin Login</h2>
          <form onSubmit={handleLogin}>
            <input
              name="secret"
              type="password"
              placeholder="请输入 Server 密钥"
              style={styles.input}
              autoFocus
            />
            <button type="submit" style={{ ...styles.button, width: '100%' }}>进入后台</button>
          </form>
        </div>
      </div>
    );
  }

  // 2. 编辑器视图
  return (
    <div style={styles.container}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '24px', margin: 0 }}>📝 博客写作后台</h1>
        <button onClick={handleLogout} style={styles.logoutBtn}>退出登录</button>
      </header>

      <div style={styles.card}>
        <div>
          <label style={styles.label}>URL Slug (路径)</label>
          <input
            name="slug"
            value={formData.slug}
            onChange={handleInputChange}
            placeholder="例如: my-first-blog"
            style={styles.input}
          />
        </div>

        <div>
          <label style={styles.label}>文章标题</label>
          <input
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            placeholder="输入文章标题..."
            style={styles.input}
          />
        </div>

        <div>
          <label style={styles.label}>正文内容 (Markdown)</label>
          <textarea
            name="content"
            value={formData.content}
            onChange={handleInputChange}
            placeholder="# Hello World..."
            style={styles.textarea}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', marginTop: '10px' }}>
          <button onClick={handleSave} disabled={loading} style={{ ...styles.button, opacity: loading ? 0.7 : 1 }}>
            {loading ? '...' : '💾 保存草稿'}
          </button>

          <button onClick={handleBuild} disabled={loading} style={{ ...styles.secondaryBtn, opacity: loading ? 0.7 : 1 }}>
            🚀 发布并构建
          </button>

          <span style={styles.status}>{statusMsg}</span>
        </div>
      </div>

      <div style={{ marginTop: '20px', color: '#6b7280', fontSize: '13px', textAlign: 'center' }}>
        Powered by Bun + React + TypeScript
      </div>
    </div>
  );
}

export default App;