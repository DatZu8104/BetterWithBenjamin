const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// --- 1. BIẾN LƯU TOKEN TRÊN RAM (Sẽ mất khi F5) ---
let memoryToken = '';

// --- 2. HÀM SET TOKEN (Dùng khi đăng nhập thành công) ---
export const setApiToken = (token: string) => {
  memoryToken = token;
};

// --- 3. HÀM LẤY HEADERS (Dùng biến RAM thay vì localStorage) ---
const getHeaders = () => {
  return {
    'Content-Type': 'application/json',
    'Authorization': memoryToken || '' 
  };
};

export const api = {
  // --- ADMIN API ---
  getUsers: async () => {
    const res = await fetch(`${API_URL}/admin/users`, { headers: getHeaders() });
    if (!res.ok) throw new Error("Không có quyền Admin");
    return res.json();
  },

  deleteUser: async (userId: string) => {
    await fetch(`${API_URL}/admin/users/${userId}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
  },

  getUserWords: async (userId: string) => {
    const res = await fetch(`${API_URL}/admin/users/${userId}/words`, { headers: getHeaders() });
    return res.json();
  },

  adminDeleteWord: async (wordId: string) => {
    await fetch(`${API_URL}/admin/words/${wordId}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
  },

  // --- DATA SYNC ---
  syncData: async () => {
    // Kiểm tra nếu chưa có token trong RAM thì không gọi API
    if (!memoryToken) return null;
    
    try {
        const res = await fetch(`${API_URL}/sync`, { headers: getHeaders() });
        if (!res.ok) return null;
        return await res.json();
    } catch (error) {
        console.error("API Error:", error);
        return null;
    }
  },

  // --- WORDS ---
  addWord: async (data: any) => {
    const res = await fetch(`${API_URL}/words`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  },

  deleteWord: async (id: string) => {
    await fetch(`${API_URL}/words/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
  },

  updateWord: async (id: string, data: any) => {
    const res = await fetch(`${API_URL}/words/${id}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // --- BATCH ACTION ---
  resetProgressBatch: async (ids: string[]) => {
    const res = await fetch(`${API_URL}/words/reset-batch`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ ids })
    });
    return res.json();
  },

  // --- FOLDERS ---
  addFolder: async (data: any) => {
    await fetch(`${API_URL}/folders`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
  },

  deleteFolder: async (name: string) => {
    await fetch(`${API_URL}/folders/${name}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
  },

  // --- GROUPS ---
  updateGroup: async (groupName: string, folder: string) => {
    await fetch(`${API_URL}/groups`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ groupName, folder })
    });
  },

  deleteGroup: async (groupName: string) => {
    await fetch(`${API_URL}/groups`, {
      method: 'DELETE',
      headers: getHeaders(),
      body: JSON.stringify({ groupName })
    });
  },

  // --- IMPORT / EXPORT / USER ---
  importData: async (jsonData: any) => {
    const res = await fetch(`${API_URL}/import`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(jsonData)
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
  }
};