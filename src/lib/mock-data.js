/**
 * mock-data.js — ĐÃ XÓA SẠCH DATA CỨNG
 * Tất cả data thật sẽ được lấy từ backend / webhook thực tế.
 */

// Quick Reply mặc định ban đầu (người dùng có thể xóa/thêm trong Cài đặt)
export const quickReplyTemplates = [];

// Không có tài khoản mặc định — người dùng tự thêm qua OAuth
export const mockAccounts = [];

// Backwards-compat alias
export const mockCredentials = [];

// Không có cuộc hội thoại nào — chờ webhook thực gửi về
export const mockConversations = [];

// Không có tin nhắn nào
export const mockMessages = {};

// Không có bài đăng nào
export const mockScheduledPosts = [];
