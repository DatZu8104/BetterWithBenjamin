const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// --- SỬA ĐỔI QUAN TRỌNG: Dùng sessionStorage ---

export const setApiToken = (token: string) => {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('auth_token', token);
  }
};

export const clearApiToken = () => {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('auth_token');
  }
};

// Hàm lấy token từ Storage mỗi khi gọi API
const getHeaders = () => {
  let token = '';
  if (typeof window !== 'undefined') {
    token = sessionStorage.getItem('auth_token') || '';
  }
  return {
    'Content-Type': 'application/json',
    'Authorization': token
  };
};

export const api = {
  // --- AUTH ---
  register: async (username: string, password: string) => {
    const res = await fetch(`${API_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    return res.json();
  },

  login: async (username: string, password: string) => {
    const res = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    return res.json();
  },

  changePassword: async (oldPass: string, newPass: string) => {
    const res = await fetch(`${API_URL}/change-password`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ oldPassword: oldPass, newPassword: newPass })
    });
    return res.json();
  },

  // --- DATA SYNC ---
  syncData: async () => {
    // Kiểm tra token từ sessionStorage
    const token = typeof window !== 'undefined' ? sessionStorage.getItem('auth_token') : null;
    if (!token) return null;

    try {
        const res = await fetch(`${API_URL}/sync`, { headers: getHeaders() });
        if (!res.ok) return null;
        return await res.json();
    } catch (error) {
        return null;
    }
  },

  importData: async (jsonData: any) => {
    const res = await fetch(`${API_URL}/import`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(jsonData)
    });
    if (!res.ok) throw new Error("Import failed");
    return res.json();
  },

  // --- WORDS ---
  addWord: async (data: any) => {
    const res = await fetch(`${API_URL}/words`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error("Failed to save word");
    return res.json();
  },

  deleteWord: async (id: string) => {
    await fetch(`${API_URL}/words/${id}`, { method: 'DELETE', headers: getHeaders() });
  },

  updateWord: async (id: string, data: any) => {
    const res = await fetch(`${API_URL}/words/${id}`, { method: 'PATCH', headers: getHeaders(), body: JSON.stringify(data) });
    return res.json();
  },

  resetProgressBatch: async (ids: string[]) => {
    const res = await fetch(`${API_URL}/words/reset-batch`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ ids }) });
    return res.json();
  },
  adminImportUser: async (userId: string, jsonData: any) => {
      const res = await fetch(`${API_URL}/admin/users/${userId}/import`, {
        method: 'POST',
        headers: getHeaders(), // Hàm getHeaders() phải lấy token từ sessionStorage như bài trước
        body: JSON.stringify(jsonData)
      });
      if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Lỗi nhập dữ liệu");
      }
      return res.json();
    },
  // --- FOLDERS & GROUPS ---
  addFolder: async (data: any) => {
    await fetch(`${API_URL}/folders`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) });
  },
  deleteFolder: async (name: string) => {
    await fetch(`${API_URL}/folders/${name}`, { method: 'DELETE', headers: getHeaders() });
  },
  
  updateGroup: async (groupName: string, folder: string, isGlobal: boolean = false) => {
    const res = await fetch(`${API_URL}/groups`, { 
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ groupName, folder, isGlobal })
    });
    
    if (!res.ok) {
        throw new Error("Lỗi cập nhật nhóm");
    }
    return res.json();
  },
  
  deleteGroup: async (groupName: string) => {
    const res = await fetch(`${API_URL}/groups/${encodeURIComponent(groupName)}`, { 
      method: 'DELETE', 
      headers: getHeaders()
    });
    
    // ✅ THÊM ĐOẠN NÀY ĐỂ BẮT LỖI
    if (!res.ok) {
        console.error("Lỗi xóa nhóm:", res.status, res.statusText);
        throw new Error("Không thể xóa nhóm (Lỗi Server hoặc sai đường dẫn)");
    }
  },

  // --- ADMIN ---
  getUsers: async () => {
    const res = await fetch(`${API_URL}/admin/users`, { headers: getHeaders() });
    if (!res.ok) throw new Error("Unauthorized");
    return res.json();
  },
  deleteUser: async (userId: string) => {
    await fetch(`${API_URL}/admin/users/${userId}`, { method: 'DELETE', headers: getHeaders() });
  },
  getUserWords: async (userId: string) => {
    const res = await fetch(`${API_URL}/admin/users/${userId}/words`, { headers: getHeaders() });
    return res.json();
  },
  adminDeleteWord: async (wordId: string) => {
    await fetch(`${API_URL}/admin/words/${wordId}`, { method: 'DELETE', headers: getHeaders() });
  },
};