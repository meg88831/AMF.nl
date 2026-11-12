const http = require('http');

const PORT = 3000;

// Tijdelijke opslag in het geheugen van de server
let tasks = [
  { id: 1, text: 'app.js succesvol gestart', done: true },
  { id: 2, text: 'Een nieuwe taak toevoegen', done: false }
];
let nextId = 3;

// De webinterface die door app.js wordt geserveerd
const htmlPage = `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Node.js Takenlijst</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: #0f172a;
      color: #f8fafc;
      display: flex;
      justify-content: center;
      padding: 3rem 1rem;
      margin: 0;
    }
    .card {
      background: #1e293b;
      padding: 2rem;
      border-radius: 16px;
      width: 100%;
      max-width: 460px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4);
    }
    h1 { margin-top: 0; font-size: 1.5rem; }
    form { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; }
    input {
      flex: 1;
      padding: 0.65rem 0.9rem;
      border-radius: 8px;
      border: 1px solid #334155;
      background: #0f172a;
      color: white;
      font-size: 1rem;
    }
    button {
      padding: 0.65rem 1rem;
      border: none;
      border-radius: 8px;
      background: #3b82f6;
      color: white;
      font-weight: 600;
      cursor: pointer;
    }
    button:hover { background: #2563eb; }
    ul { list-style: none; padding: 0; margin: 0; }
    li {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem;
      background: #0f172a;
      border-radius: 8px;
      margin-bottom: 0.5rem;
    }
    .task-text { cursor: pointer; flex: 1; }
    .done { text-decoration: line-through; opacity: 0.5; }
    .del-btn {
      background: #ef4444;
      padding: 0.35rem 0.65rem;
      font-size: 0.85rem;
      margin-left: 0.5rem;
    }
    .del-btn:hover { background: #dc2626; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Takenlijst (Node.js app.js)</h1>
    <form id="task-form">
      <input type="text" id="task-input" placeholder="Nieuwe taak..." required />
      <button type="submit">Toevoegen</button>
    </form>
    <ul id="task-list"></ul>
  </div>

  <script>
    const list = document.getElementById('task-list');
    const form = document.getElementById('task-form');
    const input = document.getElementById('task-input');

    async function loadTasks() {
      const res = await fetch('/api/tasks');
      const tasks = await res.json();
      list.innerHTML = '';

      tasks.forEach(function(task) {
        const li = document.createElement('li');

        const span = document.createElement('span');
        span.textContent = task.text;
        span.className = 'task-text' + (task.done ? ' done' : '');
        span.onclick = async function() {
          await fetch('/api/tasks/' + task.id, { method: 'PATCH' });
          loadTasks();
        };

        const delBtn = document.createElement('button');
        delBtn.textContent = 'Verwijder';
        delBtn.className = 'del-btn';
        delBtn.onclick = async function() {
          await fetch('/api/tasks/' + task.id, { method: 'DELETE' });
          loadTasks();
        };

        li.appendChild(span);
        li.appendChild(delBtn);
        list.appendChild(li);
      });
    }

    form.onsubmit = async function(e) {
      e.preventDefault();
      const text = input.value.trim();
      if (!text) return;

      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text })
      });

      input.value = '';
      loadTasks();
    };

    loadTasks();
  </script>
</body>
</html>`;

// Hulpfunctie om JSON responses te sturen
function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

// De HTTP-server
const server = http.createServer((req, res) => {
  const url = req.url;
  const method = req.method;

  // 1. Serveer de webpagina
  if (method === 'GET' && url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(htmlPage);
    return;
  }

  // 2. Haal alle taken op (API)
  if (method === 'GET' && url === '/api/tasks') {
    sendJson(res, 200, tasks);
    return;
  }

  // 3. Voeg een nieuwe taak toe (API)
  if (method === 'POST' && url === '/api/tasks') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const parsed = JSON.parse(body);
        if (!parsed.text || typeof parsed.text !== 'string') {
          return sendJson(res, 400, { error: 'Tekst is verplicht' });
        }
        const newTask = {
          id: nextId++,
          text: parsed.text.trim(),
          done: false
        };
        tasks.push(newTask);
        sendJson(res, 201, newTask);
      } catch {
        sendJson(res, 400, { error: 'Ongeldige JSON' });
      }
    });
    return;
  }

  // 4. Vink taak aan/uit of verwijder taak (API)
  const match = url.match(/^\/api\/tasks\/(\d+)$/);
  if (match) {
    const id = Number(match[1]);
    const taskIndex = tasks.findIndex(t => t.id === id);

    if (taskIndex === -1) {
      return sendJson(res, 404, { error: 'Taak niet gevonden' });
    }

    if (method === 'PATCH') {
      tasks[taskIndex].done = !tasks[taskIndex].done;
      return sendJson(res, 200, tasks[taskIndex]);
    }

    if (method === 'DELETE') {
      const deleted = tasks.splice(taskIndex, 1)[0];
      return sendJson(res, 200, deleted);
    }
  }

  // 404 voor onbekende routes
  sendJson(res, 404, { error: 'Route niet gevonden' });
});

server.listen(PORT, () => {
  console.log(`Server draait op http://localhost:${PORT}`);
});
