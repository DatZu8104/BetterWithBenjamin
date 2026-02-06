const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function listModels() {
  try {
    // Hack nhỏ để lấy list models vì SDK JS đôi khi ẩn hàm này
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`
    );
    const data = await response.json();
    
    console.log("=== DANH SÁCH MODEL CỦA BẠN ===");
    if (data.models) {
        data.models.forEach(m => {
            if (m.name.includes("gemini")) {
                console.log(`✅ ${m.name.replace("models/", "")}`);
            }
        });
    } else {
        console.error("❌ Lỗi:", data);
    }
  } catch (error) {
    console.error("Lỗi kết nối:", error);
  }
}

listModels();