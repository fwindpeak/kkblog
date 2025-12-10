// src/App.tsx
import { useState } from 'react';
import { request } from './lib/api';
import { PostManager } from './components/PostManager';
import { ThoughtManager } from './components/ThoughtManager';
import { IconBook, IconChatBubble, IconRocket } from './components/Icons';

function App() {
  const [token, setToken] = useState(localStorage.getItem('admin_token') || '');
  const [view, setView] = useState<'posts' | 'thoughts'>('posts');
  const [isBuilding, setIsBuilding] = useState(false);

  // 简单的登录界面
  if (!token) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-100">
        <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-sm">
          <h2 className="text-2xl font-bold mb-6 text-center">Admin Login</h2>
          <form onSubmit={(e: any) => {
            e.preventDefault();
            const t = e.target.secret.value;
            localStorage.setItem('admin_token', t);
            setToken(t);
          }}>
            <input name="secret" type="password" placeholder="Server Secret" className="w-full p-3 border rounded mb-4" />
            <button className="w-full bg-slate-900 text-white p-3 rounded font-bold">解锁</button>
          </form>
        </div>
      </div>
    );
  }

  // 触发构建
  const handleBuild = async () => {
    if (!confirm("确定要发布并构建静态网站吗？")) return;
    setIsBuilding(true);
    const res = await request<{ status: string }>('/api/build', 'POST');
    alert(res?.status || "构建指令已发送");
    setIsBuilding(false);
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans">

      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-6 border-b border-slate-100">
          <h1 className="text-xl font-black tracking-tight">MY BLOG <span className="text-slate-400 font-normal">ADMIN</span></h1>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <button
            onClick={() => setView('posts')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${view === 'posts' ? 'bg-slate-100 text-slate-900 font-bold' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <IconBook className="w-5 h-5" /> 文章管理
          </button>
          <button
            onClick={() => setView('thoughts')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${view === 'thoughts' ? 'bg-slate-100 text-slate-900 font-bold' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <IconChatBubble className="w-5 h-5" /> 随笔记录
          </button>
        </nav>

        <div className="p-4 border-t border-slate-100">
          <button
            onClick={handleBuild}
            disabled={isBuilding}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg shadow-md hover:shadow-lg transition-all active:scale-95 disabled:opacity-50"
          >
            <IconRocket className={`w-5 h-5 ${isBuilding ? 'animate-pulse' : ''}`} />
            {isBuilding ? '构建中...' : '发布网站'}
          </button>
          <button
            onClick={() => { localStorage.removeItem('admin_token'); setToken(''); }}
            className="w-full mt-2 text-xs text-slate-400 hover:text-red-500 py-2"
          >
            退出登录
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden p-8">
        <div className="h-full max-w-5xl mx-auto">
          {view === 'posts' && <PostManager />}
          {view === 'thoughts' && <ThoughtManager />}
        </div>
      </main>
    </div>
  );
}

export default App;