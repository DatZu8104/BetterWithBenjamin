// lib/api.ts
const API_URL = 'http://localhost:5000/api';

const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': token || ''
  };
};

export const api = {
  // Lấy toàn bộ dữ liệu (Sync)
  syncData: async () => {
    const res = await fetch(`${API_URL}/sync`, { headers: getHeaders() });
    return res.json();
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
  }
};