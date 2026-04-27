import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Settings store — manages platform credentials and app settings
 * ✅ Dữ liệu được lưu vào localStorage, tồn tại qua reload/đóng trình duyệt
 */
export const useSettingsStore = create(
  persist(
    (set, get) => ({
  // State
  credentials: [],
  hashtags: [],
  quickReplies: [],
  isLoading: false,
  testResults: {},
  bankInfo: {
    bankName: '',
    accountNo: '',
    accountName: '',
    bin: '',
  },
  currentUser: null,
  staffList: [
    { id: '3', username: 'admin', password: '1', name: 'Quản trị viên', role: 'Quản lý', permissions: { post: true, chat: true, analytics: true } }
  ],

  // Actions
  login: (username, password) => {
    const { staffList } = get();
    const user = staffList.find(s => s.username === username && s.password === password);
    if (user) {
      set({ currentUser: user });
      return true;
    }
    return false;
  },
  logout: () => set({ currentUser: null }),
  addStaff: (staffData) => set((state) => ({
    staffList: [...state.staffList, { id: `staff-${Date.now()}`, ...staffData }]
  })),
  updateStaff: (staffId, updates) => set((state) => ({
    staffList: state.staffList.map(s => s.id === staffId ? { ...s, ...updates } : s)
  })),
  deleteStaff: (staffId) => set((state) => ({
    staffList: state.staffList.filter(s => s.id !== staffId)
  })),
  updateStaffPermissions: (staffId, permissions) => set((state) => ({
    staffList: state.staffList.map(s => s.id === staffId ? { ...s, permissions: { ...s.permissions, ...permissions } } : s)
  })),
  updateBankInfo: (updates) => set((state) => ({ bankInfo: { ...state.bankInfo, ...updates } })),
  addHashtag: (tag) => set((state) => {
    if(!state.hashtags.includes(tag)) return { hashtags: [...state.hashtags, tag] };
    return state;
  }),
  deleteHashtag: (tag) => set((state) => ({ hashtags: state.hashtags.filter(t => t !== tag) })),
  
  saveQuickReply: (data) => set((state) => {
    const existingIndex = state.quickReplies.findIndex(q => q.id === data.id);
    if(existingIndex >= 0) {
      const updated = [...state.quickReplies];
      updated[existingIndex] = data;
      return { quickReplies: updated };
    }
    return { quickReplies: [...state.quickReplies, { id: `qr-${Date.now()}`, ...data }] };
  }),
  deleteQuickReply: (id) => set((state) => ({ quickReplies: state.quickReplies.filter(q => q.id !== id) })),

  saveCredential: (data) => {
    const { credentials } = get();
    const existing = credentials.find((c) => c.id === data.id);

    if (existing) {
      // Update
      set({
        credentials: credentials.map((c) =>
          c.id === data.id ? { ...c, ...data } : c
        ),
      });
    } else {
      // Create
      const newCred = {
        id: `cred-${Date.now()}`,
        isActive: true,
        ...data,
      };
      set({ credentials: [...credentials, newCred] });
    }
  },

  deleteCredential: (id) => {
    set((state) => ({
      credentials: state.credentials.filter((c) => c.id !== id),
    }));
  },

  testConnection: async (id) => {
    set((state) => ({
      testResults: { ...state.testResults, [id]: { loading: true } },
    }));

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const credential = get().credentials.find((c) => c.id === id);
    const success = credential?.isActive ?? false;

    set((state) => ({
      testResults: {
        ...state.testResults,
        [id]: {
          loading: false,
          success,
          message: success ? 'Kết nối thành công!' : 'Kết nối thất bại. Kiểm tra lại token.',
        },
      },
    }));
  },

  toggleActive: (id) => {
    set((state) => ({
      credentials: state.credentials.map((c) =>
        c.id === id ? { ...c, isActive: !c.isActive } : c
      ),
    }));
  },
}),
{
  name: 'omniDesk-settings', // key trong localStorage
  partialize: (state) => ({
    // Chỉ lưu những trường quan trọng — bỏ qua state tạm thời
    credentials: state.credentials,
    hashtags: state.hashtags,
    quickReplies: state.quickReplies,
    bankInfo: state.bankInfo,
    staffList: state.staffList,
    // Không lưu: testResults, isLoading, currentUser (phải đăng nhập lại)
  }),
}
)
);
