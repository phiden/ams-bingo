const { getStore } = require('@netlify/blobs');

const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no 0/O/1/I/L, avoids confusion when read aloud

function generateCode(length = 6) {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

const JSON_HEADERS = { 'Content-Type': 'application/json' };

function respond(statusCode, body) {
  return { statusCode, headers: JSON_HEADERS, body: JSON.stringify(body) };
}

exports.handler = async (event) => {
  const store = getStore('boards');
  const method = event.httpMethod;
  const params = event.queryStringParameters || {};
  const action = params.action;
  const id = (params.id || '').toUpperCase();

  try {
    // Create a new board
    if (method === 'POST' && action === 'create') {
      const body = JSON.parse(event.body || '{}');
      const items = Array.isArray(body.items) ? body.items : [];

      if (items.length !== 25) {
        return respond(400, { error: 'A board needs exactly 25 items.' });
      }
      for (const item of items) {
        if (!item || typeof item.text !== 'string' || !item.text.trim()) {
          return respond(400, { error: 'Every square needs text.' });
        }
      }

      let boardId;
      for (let attempt = 0; attempt < 6; attempt++) {
        const candidate = generateCode();
        const existing = await store.get(candidate);
        if (!existing) {
          boardId = candidate;
          break;
        }
      }
      if (!boardId) {
        return respond(500, { error: 'Could not generate a board code, try again.' });
      }

      const record = {
        id: boardId,
        title: (body.title || 'Bingo').slice(0, 80),
        subtitle: (body.subtitle || '').slice(0, 80),
        items: items.map((item, i) => ({ id: item.id || i + 1, text: String(item.text).slice(0, 120) })),
        checked: {},
        createdAt: new Date().toISOString(),
      };

      await store.setJSON(boardId, record);
      return respond(200, record);
    }

    // Everything below requires an existing board id
    if (!id) {
      return respond(400, { error: 'Missing board id.' });
    }

    // Fetch a board
    if (method === 'GET') {
      const record = await store.get(id, { type: 'json' });
      if (!record) return respond(404, { error: 'No board found with that code.' });
      return respond(200, record);
    }

    // Toggle a square
    if (method === 'POST' && action === 'toggle') {
      const body = JSON.parse(event.body || '{}');
      const record = await store.get(id, { type: 'json' });
      if (!record) return respond(404, { error: 'No board found with that code.' });

      const itemId = String(body.itemId);
      const itemExists = record.items.some((item) => String(item.id) === itemId);
      if (!itemExists) return respond(400, { error: 'That square does not exist on this board.' });

      record.checked[itemId] = !record.checked[itemId];
      await store.setJSON(id, record);
      return respond(200, record);
    }

    // Reset all checks
    if (method === 'POST' && action === 'reset') {
      const record = await store.get(id, { type: 'json' });
      if (!record) return respond(404, { error: 'No board found with that code.' });

      record.checked = {};
      await store.setJSON(id, record);
      return respond(200, record);
    }

    return respond(400, { error: 'Unsupported request.' });
  } catch (err) {
    console.error(err);
    return respond(500, { error: 'Something went wrong on the server.' });
  }
};
