import { notify } from './notify';

/**
 * @param name Tên mới người dùng vừa nhập
 * @param existingItems Danh sách tên các Folder/Group đã có (Mảng string)
 * @param type Loại đang tạo ('Folder' hoặc 'Group') để hiển thị thông báo cho đúng
 * @returns boolean - Trả về true nếu hợp lệ, false nếu bị trùng
 */
export function checkDuplicateName(name: string, existingItems: string[], type: 'Folder' | 'Group'): boolean {
    const trimmedName = name.trim();
    
    // 1. Kiểm tra rỗng (phòng hờ)
    if (!trimmedName) {
        notify.error("Tên không hợp lệ", `Tên ${type} không được để trống.`);
        return false;
    }

    // 2. Kiểm tra trùng lặp (Không phân biệt chữ hoa/chữ thường)
    const isDuplicate = existingItems.some(
        (item) => item.toLowerCase() === trimmedName.toLowerCase()
    );

    if (isDuplicate) {
        notify.error(
            `${type} Đã Tồn Tại`, 
            `Một ${type.toLowerCase()} mang tên "${trimmedName}" đã có sẵn trong danh sách. Vui lòng chọn tên khác!`
        );
        return false;
    }

    return true; 
}