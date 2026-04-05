/* PPK-Canteen — Upload / R2 File Serving / OCR API */

export async function onRequest(context) {
  const path = context.params.path || [];
  const method = context.request.method;
  const { BUCKET, AI } = context.env;

  // Serve files: GET /api/upload/{type}/{id}
  if (method === 'GET' && path.length === 2) return serveFile(BUCKET, path[0], path[1]);

  // OCR meter reading: POST /api/upload/ocr-meter
  if (method === 'POST' && path.length === 1 && path[0] === 'ocr-meter') return ocrMeter(AI, context.request);

  return Response.json({ error: 'Not found' }, { status: 404 });
}

async function serveFile(BUCKET, type, id) {
  const allowedTypes = ['documents', 'meter-photos', 'slips'];
  if (!allowedTypes.includes(type)) return Response.json({ error: 'Invalid type' }, { status: 400 });

  // Try common extensions
  const extensions = ['jpg', 'jpeg', 'png', 'webp', 'pdf', 'doc', 'docx', 'xls', 'xlsx'];
  let obj = null;
  for (const ext of extensions) {
    obj = await BUCKET.get(`${type}/${id}.${ext}`);
    if (obj) break;
  }

  // Also try exact key
  if (!obj) obj = await BUCKET.get(`${type}/${id}`);
  if (!obj) return Response.json({ error: 'File not found' }, { status: 404 });

  const headers = new Headers();
  if (obj.httpMetadata?.contentType) headers.set('Content-Type', obj.httpMetadata.contentType);
  headers.set('Cache-Control', 'public, max-age=86400');
  return new Response(obj.body, { headers });
}

async function ocrMeter(AI, request) {
  try {
    const form = await request.formData();
    const file = form.get('photo');
    if (!file) return Response.json({ error: 'ไม่พบรูปภาพ' }, { status: 400 });

    const buf = await file.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buf)));

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
