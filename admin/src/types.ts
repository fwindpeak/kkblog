// src/types.ts

export interface Post {
    id?: number;
    slug: string;
    title: string;
    content: string; // Markdown content
    excerpt?: string;
    tags: string[];
    created_at?: string;
}

export interface Thought {
    id?: number;
    content: string;
    mood: 'neutral' | 'happy' | 'pensive' | 'excited';
    created_at?: string;
}

export interface ApiResponse<T = any> {
    success?: boolean;
    error?: string;
    data?: T;
}