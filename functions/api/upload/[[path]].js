/* PPK-Canteen — Upload / File Serving (D1) / OCR API */

function arrayBufferToBase64(buf) {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export async function onRequest(context) {
  const path = context.params.path || [];
  const method = context.request.method;
  const { DB, AI } = context.env;

  // Serve files: GET /api/upload/{id}
  if (method === 'GET' && path.length === 1) return serveFile(DB, path[0]);

  // OCR meter reading: POST /api/upload/ocr-meter
  if (method === 'POST' && path.length === 1 && path[0] === 'ocr-meter') return ocrMeter(AI, context.request);

  return Response.json({ error: 'Not found' }, { status: 404 });
}

async function serveFile(DB, id) {
  const row = await DB.prepare('SELECT data, content_type FROM files WHERE id = ?').bind(id).first();
  if (!row) return Response.json({ error: 'File not found' }, { status: 404 });

  const binary = Uint8Array.from(atob(row.data), c => c.charCodeAt(0));
  return new Response(binary, {
    headers: {
      'Content-Type': row.content_type || 'image/jpeg',
      'Cache-Control': 'public, max-age=86400'
    }
  });
}

async function ocrMeter(AI, request) {
  try {
    const form = await request.formData();
    const file = form.get('photo');
    if (!file) return Response.json({ error: 'ไม่พบรูปภาพ' }, { status: 400 });

    const buf = await file.arrayBuffer();
    const base64 = arrayBufferToBase64(buf);

    const result = await AI.run('@cf/meta/llama-3.2-11b-vision-instruct', {
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'This is a photo of a water or electric meter. Read the meter value (number displayed). Return ONLY the numeric value, nothing else. If you cannot read it, return "ERROR".'
            },
            {
              type: 'image',
              image: base64
            }
          ]
        }
      ],
      max_tokens: 50
    });

    const raw = (result?.response || '').trim();
    const digits = raw.replace(/[^0-9.]/g, '');
    const value = parseFloat(digits);

    if (isNaN(value)) {
      return Response.json({ data: { raw, value: null, success: false, message: 'ไม่สามารถอ่านค่ามิเตอร์ได้ กรุณากรอกเอง' } });
    }

    return Response.json({ data: { raw, value, success: true } });
  } catch (err) {
    return Response.json({ data: { value: null, success: false, message: 'OCR ล้มเหลว: ' + err.message } });
  }
}
