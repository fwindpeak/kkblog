// src/components/ThoughtManager.tsx
import React, { useState, useEffect } from 'react';
import type { Thought } from '../types';
import { request } from '../lib/api';
import { IconTrash } from './Icons';

export const ThoughtManager: React.FC = () => {
    const [thoughts, setThoughts] = useState<Thought[]>([]);
    const [content, setContent] = useState('');
    const [mood, setMood] = useState<Thought['mood']>('neutral');

    useEffect(() => {
        loadThoughts();
    }, []);

    const loadThoughts = async () => {
        const data = await request<Thought[]>('/api/thoughts');
        if (data) setThoughts(data);
    };

    const handleSubmit = async () => {
        if (!content) return;
        const res = await request<{ success: boolean }>('/api/thought', 'POST', { content, mood });
        if (res?.success) {
            setContent('');
            setMood('neutral');
            loadThoughts();
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('删除此条随笔?')) return;
        // 注意：后端 API 路径是 /api/thought/:id
        await request(`/api/thought/${id}`, 'DELETE');
        loadThoughts();
    };

    const moodEmoji = {
        neutral: '😐 平静',
        happy: '😄 愉快',
        pensive: '🤔 沉思',
        excited: '🤩 兴奋'
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full">
            {/* 左侧：发布框 */}
            <div className="md:col-span-1 space-y-4">
                <h2 className="text-2xl font-serif font-bold mb-4">记录想法</h2>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                    <textarea
                        className="w-full h-32 p-3 border border-slate-200 rounded resize-none focus:ring-2 focus:ring-blue-500 outline-none mb-3"
                        placeholder="此刻你在想什么..."
                        value={content}
                        onChange={e => setContent(e.target.value)}
                    />
                    <div className="flex justify-between items-center">
                        <select
                            className="p-2 border border-slate-200 rounded text-sm bg-white"
                            value={mood}
                            onChange={(e: any) => setMood(e.target.value)}
                        >
                            {Object.entries(moodEmoji).map(([k, v]) => (
                                <option key={k} value={k}>{v}</option>
                            ))}
                        </select>
                        <button
                            onClick={handleSubmit}
                            disabled={!content}
                            className="px-4 py-2 bg-slate-900 text-white rounded text-sm hover:bg-slate-700 disabled:opacity-50"
                        >
                            发布
                        </button>
                    </div>
                </div>
            </div>

            {/* 右侧：列表 */}
            <div className="md:col-span-2 overflow-y-auto pr-2">
                <h2 className="text-xl font-bold mb-4 text-slate-500">历史记录 ({thoughts.length})</h2>
                <div className="space-y-4">
                    {thoughts.map(thought => (
                        <div key={thought.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 group relative">
                            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleDelete(thought.id!)} className="text-red-400 hover:text-red-600">
                                    <IconTrash className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="prose prose-sm mb-2 text-slate-800 font-serif">
                                {thought.content}
                            </div>

                            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                                <span>{new Date(thought.created_at!).toLocaleString()}</span>
                                <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">
                                    {moodEmoji[thought.mood].split(' ')[0]}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};