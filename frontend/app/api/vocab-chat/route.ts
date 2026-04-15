import { NextRequest, NextResponse } from 'next/server';

const MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
];

async function callGemini(
  apiKey: string,
  model: string,
  systemPrompt: string,
  contents: any[]
) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: { maxOutputTokens: 1024, temperature: 0.7 },
      }),
    }
  );
  return res;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, systemPrompt } = body;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY chưa được cấu hình' }, { status: 500 });
    }

    const contents = messages.map((m: { role: string; content: string }) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    // Thử từng model, nếu bị overload (503) thì chuyển sang model tiếp theo
    for (const model of MODELS) {
      const res = await callGemini(apiKey, model, systemPrompt, contents);

      if (res.status === 503 || res.status === 429) {
        console.warn(`Model ${model} overloaded, trying next...`);
        continue; // thử model tiếp
      }

      if (!res.ok) {
        const errData = await res.json();
        return NextResponse.json(
          { error: errData?.error?.message || 'Lỗi từ Gemini API' },
          { status: res.status }
        );
      }

      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      return NextResponse.json({ text, model }); // trả về model đã dùng (debug)
    }

    // Tất cả model đều bị overload
    return NextResponse.json(
      { error: 'Dịch vụ AI đang bận, vui lòng thử lại sau vài giây.' },
      { status: 503 }
    );

  } catch (error: any) {
    console.error('Vocab chat route error:', error);
    return NextResponse.json({ error: 'Lỗi server nội bộ' }, { status: 500 });
  }
}