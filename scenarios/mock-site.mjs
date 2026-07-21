import { createServer } from 'node:http';

const HOST = process.env.MOCK_SITE_HOST?.trim() || '127.0.0.1';
const PORT = Number(process.env.MOCK_SITE_PORT || '4410');

const USERS = {
  editor_qa: { password: 'password_editor', role: 'editor' },
  admin_qa: { password: 'password_admin', role: 'admin' },
  usuario_qa: { password: 'password_qa', role: 'editor' },
};

const server = createServer(async (request, response) => {
  const method = request.method || 'GET';
  const requestUrl = new URL(request.url || '/', `http://${HOST}:${PORT}`);

  if (method === 'GET' && requestUrl.pathname === '/') {
    return sendHtml(response, homePage());
  }

  if (method === 'GET' && requestUrl.pathname === '/about') {
    return sendHtml(response, aboutPage());
  }

  if (method === 'GET' && requestUrl.pathname === '/login') {
    return sendHtml(response, loginPage());
  }

  if (method === 'POST' && requestUrl.pathname === '/login') {
    const body = await readRequestBody(request);
    const params = new URLSearchParams(body);
    const user = params.get('email')?.trim() || '';
    const password = params.get('password') || '';

    const record = USERS[user];

    if (!record || record.password !== password) {
      return sendHtml(response, loginPage('Credenciales invalidas para entorno QA.'), 401);
    }

    response.writeHead(302, {
      location: `/app/${record.role}`,
      'set-cookie': `ira_mock_role=${record.role}; Path=/; HttpOnly; SameSite=Lax`,
    });
    response.end();
    return;
  }

  if (method === 'GET' && requestUrl.pathname.startsWith('/app/')) {
    const role = readRoleFromCookies(request.headers.cookie || '');

    if (!role) {
      response.writeHead(302, { location: '/login' });
      response.end();
      return;
    }

    if (requestUrl.pathname === '/app/editor' && role === 'editor') {
      return sendHtml(response, appPage('editor'));
    }

    if (requestUrl.pathname === '/app/admin' && role === 'admin') {
      return sendHtml(response, appPage('admin'));
    }

    return sendHtml(response, forbiddenPage(), 403);
  }

  if (method === 'GET' && requestUrl.pathname === '/logout') {
    response.writeHead(302, {
      location: '/login',
      'set-cookie': 'ira_mock_role=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax',
    });
    response.end();
    return;
  }

  sendHtml(response, notFoundPage(), 404);
});

server.listen(PORT, HOST, () => {
  console.log(`Mock site disponible en http://${HOST}:${PORT}`);
  console.log('Credenciales QA: editor_qa/password_editor, admin_qa/password_admin');
});

process.on('SIGINT', () => {
  server.close(() => {
    process.exit(0);
  });
});

function sendHtml(response, html, statusCode = 200) {
  response.writeHead(statusCode, {
    'content-type': 'text/html; charset=utf-8',
    'cache-control': 'no-store',
  });

  response.end(html);
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];

    request.on('data', (chunk) => {
      chunks.push(chunk);
    });

    request.on('end', () => {
      resolve(Buffer.concat(chunks).toString('utf8'));
    });

    request.on('error', reject);
  });
}

function readRoleFromCookies(rawCookies) {
  const pairs = rawCookies
    .split(';')
    .map((entry) => entry.trim())
    .filter(Boolean);

  for (const entry of pairs) {
    const [name, value] = entry.split('=');

    if (name === 'ira_mock_role' && value) {
      return value;
    }
  }

  return null;
}

function shell(title, body) {
  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <style>
      body { font-family: system-ui, -apple-system, sans-serif; margin: 2rem auto; max-width: 720px; line-height: 1.5; }
      input, button { font: inherit; padding: 0.5rem; }
      label { display: block; margin: 0.75rem 0 0.25rem; }
      .card { border: 1px solid #d0d7de; border-radius: 8px; padding: 1rem; }
      .error { color: #b00020; }
      nav a { margin-right: 0.75rem; }
    </style>
  </head>
  <body>
    ${body}
  </body>
</html>`;
}

function homePage() {
  return shell(
    'Mock publico',
    `<h1>Mock publico de auditoria</h1>
     <p>Este sitio sirve para validar escenarios de auditoria.</p>
     <nav>
       <a href="/about">About</a>
       <a href="/login">Login</a>
     </nav>
     <p><img src="" alt="" /></p>`,
  );
}

function aboutPage() {
  return shell(
    'About',
    `<h1>About</h1>
     <p>Pagina de contenido estatico para rastreo basico.</p>
     <a href="/">Volver</a>`,
  );
}

function loginPage(errorMessage = '') {
  return shell(
    'Login QA',
    `<h1>Acceso QA</h1>
     <p>Usa credenciales de prueba para acceder a zona protegida.</p>
     ${errorMessage ? `<p class="error">${errorMessage}</p>` : ''}
     <form method="post" action="/login" class="card">
       <label for="email">Usuario</label>
       <input id="email" name="email" type="text" autocomplete="username" required />
       <label for="password">Password</label>
       <input id="password" name="password" type="password" autocomplete="current-password" required />
       <p><button type="submit" data-testid="login-submit">Entrar</button></p>
     </form>
     <p><a href="/">Volver al inicio</a></p>`,
  );
}

function appPage(role) {
  const title = role === 'admin' ? 'Panel Admin QA' : 'Panel Editor QA';
  return shell(
    title,
    `<h1>${title}</h1>
     <p>Sesion autenticada para rol: <strong>${role}</strong>.</p>
     <nav>
       <a href="/logout">Cerrar sesion</a>
     </nav>
     <button aria-label="menu principal">Menu</button>`,
  );
}

function forbiddenPage() {
  return shell(
    '403',
    `<h1>Sin permisos</h1>
     <p>Tu sesion no tiene permisos para este recurso.</p>
     <a href="/login">Volver al login</a>`,
  );
}

function notFoundPage() {
  return shell(
    '404',
    `<h1>404</h1>
     <p>Ruta no encontrada.</p>
     <a href="/">Volver al inicio</a>`,
  );
}
