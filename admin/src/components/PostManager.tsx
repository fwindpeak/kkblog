// src/components/PostManager.tsx
import React, { useState, useEffect, useCallback } from 'react';
import type { Post } from '../types';
import { request } from '../lib/api';
import { IconPen, IconTrash } from './Icons';

export const PostManager: React.FC = () => {
    const [posts, setPosts] = useState<Post[]>([]);
    const [isEditing, setIsEditing] = useState(false);

    // Form State
    const [formData, setFormData] = useState<Post>({ slug: '', title: '', content: '', tags: [] });
    const [tagsInput, setTagsInput] = useState(''); // 临时存储输入的标签字符串


    const loadPosts = useCallback(async () => {
        const data = await request<Post[]>('/api/posts');
        if (data) {
            setPosts(data);
        }
    }, []);

    useEffect(() => {
        loadPosts();
    }, [loadPosts]);




    const handleEdit = (post: Post) => {
        setFormData(post);
        setTagsInput(post.tags.join(', ')); // 数组转字符串显示
        setIsEditing(true);
    };

    const handleCreate = () => {
        setFormData({ slug: '', title: '', content: '', tags: [] });
        setTagsInput('');
        setIsEditing(true);
    };

    const handleDelete = async (slug: string) => {
        if (!confirm('确定删除?')) return;
        await request(`/api/post/${slug}`, 'DELETE');
        loadPosts();
    };

    const handleSave = async () => {
        // 处理 Tags：按逗号分割并去空
        const tagsArray = tagsInput.split(/[,，]/).map(t => t.trim()).filter(t => t);

        // 如果没有填写 slug，根据 title 自动生成一个简单的
        let finalSlug = formData.slug;
        if (!finalSlug && formData.title) {
            finalSlug = formData.title.toLowerCase().replace(/\s+/g, '-').slice(0, 50);
        }

        const payload = { ...formData, slug: finalSlug, tags: tagsArray };

        const res = await request<{ success: boolean }>('/api/post', 'POST', payload);
        if (res?.success) {
            setIsEditing(false);
            loadPosts();
        }
    };

    if (isEditing) {
        return (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-full flex flex-col">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold">{formData.slug ? '编辑文章' : '新建文章'}</h2>
                    <button onClick={() => setIsEditing(false)} className="text-slate-500 hover:text-slate-800">取消</button>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-bold mb-1">标题</label>
                        <input
                            className="w-full p-2 border border-slate-300 rounded"
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                            placeholder="文章标题"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-1">Slug (URL路径)</label>
                        <input
                            className="w-full p-2 border border-slate-300 rounded bg-slate-50 font-mono text-sm"
                            value={formData.slug}
                            onChange={e => setFormData({ ...formData, slug: e.target.value })}
                            placeholder="my-post-url"
                        />
                    </div>
                </div>

                <div className="mb-4">
                    <label className="block text-sm font-bold mb-1">标签 (用逗号分隔)</label>
                    <input
                        className="w-full p-2 border border-slate-300 rounded"
                        value={tagsInput}
                        onChange={e => setTagsInput(e.target.value)}
                        placeholder="Tech, Life, Astro"
                    />
                </div>

                <div className="flex-1 flex flex-col mb-4">
                    <label className="block text-sm font-bold mb-1">内容 (Markdown)</label>
                    <textarea
                        className="flex-1 w-full p-4 border border-slate-300 rounded font-mono text-sm leading-relaxed resize-none focus:ring-2 focus:ring-blue-500 outline-none"
                        value={formData.content}
                        onChange={e => setFormData({ ...formData, content: e.target.value })}
                        placeholder="# 开始写作..."
                    />
                </div>

                <div className="flex justify-end">
                    <button
                        onClick={handleSave}
                        className="px-6 py-2 bg-slate-900 text-white rounded hover:bg-slate-700"
                    >
                        保存文章
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-serif font-bold">文章列表</h2>
                <button onClick={handleCreate} className="px-4 py-2 bg-slate-900 text-white rounded hover:bg-slate-700 text-sm">
                    + 新建文章
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="p-4 font-bold text-slate-600">标题</th>
                            <th className="p-4 font-bold text-slate-600">日期</th>
                            <th className="p-4 font-bold text-slate-600 text-right">操作</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {posts.map(post => (
                            <tr key={post.slug} className="hover:bg-slate-50 transition-colors">
                                <td className="p-4">
                                    <div className="font-bold text-slate-800">{post.title}</div>
                                    <div className="text-xs text-slate-400 font-mono mt-1">{post.slug}</div>
                                    <div className="flex gap-1 mt-1">
                                        {post.tags.map(t => <span key={t} className="bg-slate-100 px-1 rounded text-xs text-slate-500">#{t}</span>)}
                                    </div>
                                </td>
                                <td className="p-4 text-slate-500">
                                    {new Date(post.created_at || '').toLocaleDateString()}
                                </td>
                                <td className="p-4 text-right space-x-2">
                                    <button onClick={() => handleEdit(post)} className="text-blue-600 hover:bg-blue-50 p-1 rounded"><IconPen className="w-4 h-4" /></button>
                                    <button onClick={() => handleDelete(post.slug)} className="text-red-500 hover:bg-red-50 p-1 rounded"><IconTrash className="w-4 h-4" /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};