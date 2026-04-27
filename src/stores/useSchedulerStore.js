import { create } from 'zustand';
import { mockScheduledPosts } from '@/lib/mock-data';

/**
 * Scheduler store — manages scheduled posts state
 */
export const useSchedulerStore = create((set, get) => ({
  // State
  posts: mockScheduledPosts,
  isLoading: false,
  filterStatus: 'all', // 'all' | 'pending' | 'published' | 'failed'

  // Computed
  get filteredPosts() {
    const state = get();
    if (state.filterStatus === 'all') return state.posts;
    return state.posts.filter((p) => p.status === state.filterStatus);
  },

  get stats() {
    const posts = get().posts;
    return {
      total: posts.length,
      pending: posts.filter((p) => p.status === 'pending').length,
      published: posts.filter((p) => p.status === 'published').length,
      failed: posts.filter((p) => p.status === 'failed').length,
    };
  },

  // Actions
  setFilterStatus: (status) => set({ filterStatus: status }),

  createPost: (data) => {
    const newPost = {
      id: `post-${Date.now()}`,
      ...data,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    set((state) => ({ posts: [newPost, ...state.posts] }));
    return newPost;
  },

  updatePost: (id, data) => {
    set((state) => ({
      posts: state.posts.map((p) => (p.id === id ? { ...p, ...data } : p)),
    }));
  },

  deletePost: (id) => {
    set((state) => ({
      posts: state.posts.filter((p) => p.id !== id),
    }));
  },
}));
