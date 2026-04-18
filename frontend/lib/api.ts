const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export const setApiToken = (token: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('token', token);
  }
};

export const clearApiToken = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('token');
  }
};

const getHeaders = () => {
  let token = '';
  if (typeof window !== 'undefined') {
    token = localStorage.getItem('token') || '';
    token = token.replace(/(^"|"$)/g, "");
    token = token.replace(/^Bearer\s+/i, "");
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
    try {
        const res = await fetch(`${API_URL}/sync?t=${new Date().getTime()}`, { 
            headers: getHeaders(),
            cache: 'no-store' 
        });
        if (!res.ok) return null;
        return await res.json();
    } catch (error) {
        return null;
    }
  },
getSystemWords: async () => {
    try {
        const res = await fetch(`${API_URL}/sync-system?t=${new Date().getTime()}`, { 
            headers: getHeaders(),
            cache: 'no-store' 
        });
        if (!res.ok) {
            console.error("❌ Lỗi API từ Server:", res.status);
            return [];
        }
        return await res.json();
    } catch (error) {
        console.error("Lỗi tải bộ từ hệ thống:", error);
        return [];
    }
  },
  updateMasterStatus: async (savedWordId: string, isMastered: boolean) => {
    const res = await fetch(`${API_URL}/saved-words/${savedWordId}/master`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ isMastered })
    });
    if (!res.ok) throw new Error("Lỗi cập nhật trạng thái");
    return res.json();
  },

  resetFolderProgress: async (folderId: string) => {
    const res = await fetch(`${API_URL}/folders/${folderId}/reset`, {
      method: 'PUT',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error("Lỗi reset thư mục");
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

  resetProgressBatch: async (ids: string[], wordType: 'personal' | 'system' = 'personal') => {
    const res = await fetch(`${API_URL}/words/reset-batch`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ ids, wordType }) });
    return res.json();
  },

  // --- FOLDERS & GROUPS  ---
  addFolder: async (data: { name: string; color?: string; isGlobal?: boolean; isSystemSaved?: boolean }) => {
    const res = await fetch(`${API_URL}/folders`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error("Failed to add folder");
    return res.json();
  },
  deleteFolder: async (name: string) => {
    const res = await fetch(`${API_URL}/folders/${encodeURIComponent(name)}`, { 
        method: 'DELETE', 
        headers: getHeaders() 
    });
    if (!res.ok) throw new Error("Failed to delete folder"); 
  },
  
  updateGroup: async (groupName: string, folder: string, isGlobal: boolean = false) => {
    const res = await fetch(`${API_URL}/groups`, { 
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ groupName, folder, isGlobal })
    });
    if (!res.ok) throw new Error("Lỗi cập nhật nhóm");
    return res.json();
  },
  
  deleteGroup: async (groupName: string) => {
    const res = await fetch(`${API_URL}/groups/${encodeURIComponent(groupName)}`, { 
      method: 'DELETE', 
      headers: getHeaders()
    });
    if (!res.ok) throw new Error("Lỗi xóa nhóm");
  },

  getFoldersList: async (studyContext?: 'system' | 'personal') => {
    try {
      const url = studyContext
        ? `${API_URL}/folders?context=${studyContext}`
        : `${API_URL}/folders`;
      const res = await fetch(url, { headers: getHeaders() });
      if (!res.ok) return [];
      return res.json();
    } catch {
      return [];
    }
  },

  createFolderAndGetId: async (
    name: string,
    color: string = '#3b82f6',
    isGlobal: boolean = false,
    isSystemSaved: boolean = false,
    studyContext: 'system' | 'personal' = 'system'
  ) => {
    const res = await fetch(`${API_URL}/folders`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ name, color, isGlobal, isSystemSaved, studyContext })
    });
    if (!res.ok) throw new Error("Lỗi tạo thư mục mới");
    return res.json();
  },

  deleteFolderById: async (id: string) => {
    const res = await fetch(`${API_URL}/folders/${id}`, { method: 'DELETE', headers: getHeaders() });
    if (!res.ok) throw new Error("Lỗi xóa thư mục");
    return res.json();
  },

  getFolderDetail: async (id: string) => {
    const res = await fetch(`${API_URL}/folders/${id}`, { headers: getHeaders() });
    if (!res.ok) throw new Error("Lỗi tải chi tiết thư mục");
    return res.json();
  },

  addWordsToFolder: async (folderId: string, wordIds: string[]) => {
    const res = await fetch(`${API_URL}/folders/${folderId}/add-words`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ wordIds })
    });
    if (!res.ok) throw new Error("Lỗi thêm từ vào thư mục");
    return res.json();
  },

  getSavedWordIds: async () => {
    try {
      const res = await fetch(`${API_URL}/saved-words/all-ids`, { headers: getHeaders() });
      if (!res.ok) return [];
      return res.json();
    } catch {
      return [];
    }
  },

  renameFolder: async (folderId: string, newName: string) => {
    const res = await fetch(`${API_URL}/folders/${folderId}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ name: newName })
    });
    if (!res.ok) throw new Error("Lỗi đổi tên thư mục");
    return res.json();
  },

  removeWordFromFolder: async (savedWordId: string) => {
    const res = await fetch(`${API_URL}/saved-words/${savedWordId}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error("Lỗi rút từ khỏi thư mục");
    return res.json();
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
  getUserProgress: async (userId: string) => {
    const res = await fetch(`${API_URL}/admin/users/${userId}/progress`, { headers: getHeaders() });
    if (!res.ok) throw new Error("Lỗi lấy dữ liệu tiến độ");
    return res.json();
  },
  adminDeleteWord: async (wordId: string) => {
    await fetch(`${API_URL}/admin/words/${wordId}`, { method: 'DELETE', headers: getHeaders() });
  },
  adminImportUser: async (userId: string, jsonData: any) => {
    const res = await fetch(`${API_URL}/admin/users/${userId}/import`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(jsonData)
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Lỗi nhập dữ liệu");
    }
    return res.json();
  },
  adminImportOxford: async (jsonData: any) => {
    const res = await fetch(`${API_URL}/admin/import-oxford-full`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(jsonData)
    });
    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Lỗi khi import Oxford");
    }
    return res.json();
  },
  // --- THỐNG KÊ TIẾN ĐỘ THƯ MỤC ---
  
  getPersonalGroupStats: async () => {
    const res = await fetch(`${API_URL}/stats/personal-groups-progress`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch personal group stats');
    return res.json();
  },

  getSystemGroupStats: async () => {
    const res = await fetch(`${API_URL}/stats/system-groups-progress`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch system group stats');
    return res.json();
  },

  // ADMIN: Di chuyển từ vựng từ group này sang group khác
  moveSystemGroupWords: async (sourceGroup: string, targetGroup: string) => {
    const res = await fetch(`${API_URL}/admin/groups/${encodeURIComponent(sourceGroup)}/move-words`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ targetGroup })
    });
    if (!res.ok) throw new Error("Error moving words");
    return res.json();
  },
};