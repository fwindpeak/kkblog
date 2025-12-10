import { useState, useEffect, ChangeEvent } from 'react';

// --- 类型定义 ---
interface Post {
  id?: number;
  slug: string;
  title: string;
  content: string;
  created_at?: string;
}

// 视图模式枚举
type ViewMode = 'LIST' | 'EDITOR';

const API_URL = "http://localhost:3000";

// --- 样式定义 (CSS-in-JS) ---
const s = {
  container: { maxWidth: '900px', margin: '40px auto', fontFamily: 'system-ui, sans-serif', color: '#333' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '15px' },
  card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  table: { width: '100%', borderCollapse: 'collapse' as const, marginTop: '10px' },
  th: { textAlign: 'left' as const, padding: '12px', borderBottom: '2px solid #eee', color: '#666' },
  td: { padding: '12px', borderBottom: '1px solid #eee' },
  input: { width: '100%', padding: '10px', marginBottom: '15px', border: '1px solid #ddd', borderRadius: '6px', boxSizing: 'border-box' as const },
  textarea: { width: '100%', height: '400px', padding: '10px', marginBottom: '15px', border: '1px solid #ddd', borderRadius: '6px', fontFamily: 'monospace', boxSizing: 'border-box' as const },
  btnPrimary: { background: '#2563eb', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 },
  btnSuccess: { background: '#059669', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, marginRight: '10px' },
  btnDanger: { background: '#dc2626', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', marginLeft: '8px' },
  btnEdit: { background: '#4b5563', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' },
  btnBack: { background: 'transparent', border: '1px solid #ccc', cursor: 'pointer', padding: '6px 12px', borderRadius: '6px', marginRight: '10px' },
  status: { marginLeft: '10px', fontSize: '14px', color: '#666' }
};

function App() {
  // 全局状态
  const [token, setToken] = useState(localStorage.getItem('admin_token') || '');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [view, setView] = useState<ViewMode>('LIST');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  // 数据状态
  const [posts, setPosts] = useState<Post[]>([]);
  const [editingPost, setEditingPost] = useState<Post>({ slug: '', title: '', content: '' });

  // 登录检查
  useEffect(() => {
    if (token) {
      setIsLoggedIn(true);
      fetchPosts(); // 登录后立即获取列表
    }
  }, [token]);

  // --- API 封装 ---
  const request = async (url: string, method = 'GET', body?: any) => {
    setLoading(true);
    setMsg('');
    try {
      const headers: any = { 'Content-Type': 'application/json' };
      if (method !== 'GET') headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_URL}${url}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : null
      });

      if (res.status === 401) {
        setToken('');
        localStorage.removeItem('admin_token');
        setIsLoggedIn(false);
        throw new Error("鉴权失败");
      }
      return await res.json();
    } catch (err: any) {
      setMsg(`❌ ${err.message}`);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // --- 业务逻辑 ---

  const fetchPosts = async () => {
    // 获取列表不需要鉴权（根据后端配置），但为了统一逻辑还是带着比较好
    // 如果后端 GET /api/posts 没有鉴权，这里的 token 不会影响
    const data = await request('/api/posts', 'GET');
    if (data) setPosts(data);
  };

  const handleSave = async () => {
    if (!editingPost.slug || !editingPost.title) return alert("Slug 和 标题必填");

    const res = await request('/api/post', 'POST', editingPost);
    if (res?.success) {
      setMsg('✅ 保存成功');
      await fetchPosts(); // 刷新列表
      // 这里的逻辑可以改：保存后是留在编辑页还是返回列表？
      // 目前选择：不跳转，方便继续编辑
    }
  };

  const handleDelete = async (slug: string) => {
    if (!confirm(`确定要删除文章 "${slug}" 吗？此操作不可恢复。`)) return;
    const res = await request(`/api/post/${slug}`, 'DELETE');
    if (res?.success) {
      setMsg('🗑️ 已删除');
      fetchPosts();
    }
  };

  const handleBuild = async () => {
    if (!confirm("确定要重新构建博客吗？")) return;
    setMsg('⏳ 构建中...');
    const res = await request('/api/build', 'POST');
    if (res?.status) setMsg(`🎉 ${res.status}`);
  };

  // --- 视图切换逻辑 ---

  const goToList = () => {
    setView('LIST');
    setMsg('');
    fetchPosts(); // 每次回列表都刷新一下
  };

  const goToCreate = () => {
    setEditingPost({ slug: '', title: '', content: '' }); // 重置表单
    setView('EDITOR');
    setMsg('');
  };

  const goToEdit = (post: Post) => {
    setEditingPost({ ...post }); // 复制对象
    setView('EDITOR');
    setMsg('');
  };

  // --- 登录页 ---
  if (!isLoggedIn) {
    return (
      <div style={{ ...s.container, textAlign: 'center', marginTop: '100px' }}>
        <div style={{ ...s.card, maxWidth: '400px', margin: '0 auto' }}>
          <h2>🔐 Admin Login</h2>
          <form onSubmit={(e: any) => {
            e.preventDefault();
            const t = e.target.secret.value;
            localStorage.setItem('admin_token', t);
            setToken(t);
          }}>
            <input name="secret" type="password" placeholder="密钥" style={s.input} />
            <button style={{ ...s.btnPrimary, width: '100%' }}>登录</button>
          </form>
        </div>
      </div>
    );
  }

  // --- 主界面 ---
  return (
    <div style={s.container}>
      {/* 顶部导航 */}
      <div style={s.header}>
        <h1 style={{ margin: 0 }}>📝 博客管理后台</h1>
        <div>
          <span style={{ marginRight: 10, fontSize: 12 }}>当前: {posts.length} 篇文章</span>
          <button onClick={() => { setToken(''); setIsLoggedIn(false); }} style={s.btnBack}>退出</button>
        </div>
      </div>

      {/* 1. 列表视图 */}
      {view === 'LIST' && (
        <div style={s.card}>
          <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between' }}>
            <button onClick={goToCreate} style={s.btnPrimary}>+ 新建文章</button>
            <button onClick={handleBuild} style={{ ...s.btnSuccess, background: '#e11d48' }}>🚀 发布 (构建)</button>
          </div>

          {posts.length === 0 ? <p style={{ color: '#888', textAlign: 'center' }}>暂无文章</p> : (
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>标题</th>
                  <th style={s.th}>Slug (路径)</th>
                  <th style={s.th}>发布时间</th>
                  <th style={s.th}>操作</th>
                </tr>
              </thead>
              <tbody>
                {posts.map(post => (
                  <tr key={post.slug}>
                    <td style={s.td}><b>{post.title}</b></td>
                    <td style={s.td}><code style={{ background: '#f3f4f6', padding: '2px 4px' }}>{post.slug}</code></td>
                    <td style={s.td} style={{ fontSize: '13px', color: '#666' }}>{new Date(post.created_at || '').toLocaleDateString()}</td>
                    <td style={s.td}>
                      <button onClick={() => goToEdit(post)} style={s.btnEdit}>编辑</button>
                      <button onClick={() => handleDelete(post.slug)} style={s.btnDanger}>删除</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p style={{ textAlign: 'right', color: 'red' }}>{msg}</p>
        </div>
      )}

      {/* 2. 编辑视图 */}
      {view === 'EDITOR' && (
        <div style={s.card}>
          <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center' }}>
            <button onClick={goToList} style={s.btnBack}>&larr; 返回列表</button>
            <h2 style={{ margin: 0 }}>{editingPost.slug ? '编辑文章' : '新建文章'}</h2>
          </div>

          <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>Slug (URL路径):</label>
          <input
            value={editingPost.slug}
            // 如果是编辑已有文章，通常不允许改 Slug (因为会变成新文章)，这里我们简单处理：允许改，改了就是新建/覆盖
            onChange={e => setEditingPost({ ...editingPost, slug: e.target.value })}
            placeholder="my-new-post"
            style={s.input}
          />

          <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>文章标题:</label>
          <input
            value={editingPost.title}
            onChange={e => setEditingPost({ ...editingPost, title: e.target.value })}
            placeholder="输入标题"
            style={s.input}
          />

          <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>内容 (Markdown):</label>
          <textarea
            value={editingPost.content}
            onChange={e => setEditingPost({ ...editingPost, content: e.target.value })}
            style={s.textarea}
          />

          <div style={{ display: 'flex', alignItems: 'center' }}>
            <button onClick={handleSave} disabled={loading} style={s.btnPrimary}>
              {loading ? '保存中...' : '💾 保存'}
            </button>
            <span style={s.status}>{msg}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;