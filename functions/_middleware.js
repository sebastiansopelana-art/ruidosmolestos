// Cloudflare Pages middleware for private routes. Configuration is fail-closed.
// AUTH_PASSWORD and AUTH_SESSION_KEY must be encrypted secrets, never Git files.
const PUBLIC_DEMO_ASSETS = new Set([
  '/aire/estetica/megahertz-meteo-v2.css',
  '/aire/estetica/megahertz-commercial.css',
  '/aire/estetica/megahertz-logo-progress-v2.css',
  '/aire/megahertz-neon-animado.svg',
  '/aire/megahertz-i18n.js',
  '/aire/megahertz-logo-progress-v2.js',
]);
const COOKIE = '__Host-mh_session';
const encoder = new TextEncoder();
const headers = { 'Cache-Control': 'no-store, private', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' };
const text = (body, status = 200, more = {}) => new Response(body, { status, headers: { ...headers, 'Content-Type': 'text/plain; charset=utf-8', ...more } });
const redirect = (path, cookie) => new Response(null, { status: 303, headers: { ...headers, Location: path, ...(cookie ? { 'Set-Cookie': cookie } : {}) } });
const b64 = bytes => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
function safeReturn(value) {
  if (!value || value.length > 2048 || !value.startsWith('/') || value.startsWith('//') || /[\\\x00-\x1f]/.test(value)) return '/aire/';
  return value;
}
async function mac(key, value) {
  const k = await crypto.subtle.importKey('raw', encoder.encode(key), {name:'HMAC', hash:'SHA-256'}, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, encoder.encode(value)));
}
function equal(a,b) {
  if (a.length !== b.length) return false;
  let d=0; for(let i=0;i<a.length;i++) d |= a[i]^b[i]; return d===0;
}
async function sessionKey(env) { return b64(await mac(env.AUTH_SESSION_KEY, 'session-key-v1:' + env.AUTH_PASSWORD)); }
async function isAuthorized(request, env) {
  const cookie = request.headers.get('Cookie') || '';
  const m = cookie.match(/(?:^|;\s*)__Host-mh_session=([0-9]{10})\.([A-Za-z0-9_-]{43})(?:;|$)/);
  if (!m) return false;
  const expiry=Number(m[1]), now=Math.floor(Date.now()/1000);
  if (expiry <= now || expiry > now+8*60*60+60) return false;
  const expected=b64(await mac(await sessionKey(env), 'session-v1:'+m[1]));
  return equal(encoder.encode(m[2]),encoder.encode(expected));
}
function configured(env) { return typeof env.AUTH_PASSWORD === 'string' && env.AUTH_PASSWORD.length >= 16 && typeof env.AUTH_SESSION_KEY === 'string' && env.AUTH_SESSION_KEY.length >= 32; }
function isPrivate(path) {
  const lower=path.toLowerCase();
  return ((lower === '/aire' || lower.startsWith('/aire/')) && !PUBLIC_DEMO_ASSETS.has(path)) || lower === '/studio' || lower === '/studio.html' || lower === '/api/redaccion-chat' || lower === '/api/redaccion-chat/';
}
function loginPage(returnTo, failed) {
  const p = new URLSearchParams({return: returnTo});
  return new Response(`<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Acceso privado · MegaHertz</title><style>body{background:#071624;color:#eefaff;font:16px system-ui;display:grid;place-items:center;min-height:90vh}main{background:#102c3d;padding:2rem;border-radius:16px;width:min(85vw,400px)}h1{color:#76eee5}input,button{box-sizing:border-box;width:100%;padding:1rem;margin:.5rem 0;border-radius:8px;border:0;font-size:1rem}button{background:#52d9d2;color:#07202b;font-weight:bold}</style><main><h1>MEGAHERTZ</h1><p>Acceso privado</p>${failed?'<p role="alert">No se pudo ingresar. Revisá la contraseña.</p>':''}<form method="post" action="/_acceso?${p.toString()}"><label for="password">Contraseña</label><input id="password" name="password" type="password" autocomplete="current-password" required maxlength="256"><button>Ingresar</button></form></main></html>`, {status:failed?401:200,headers:{...headers,'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'"}});
}
export async function onRequest(context) {
  const {request,env}=context; const url=new URL(request.url);
  let path; try {path=decodeURIComponent(url.pathname);} catch {return text('Solicitud inválida',400);}
  if (path.includes('\\') || /[\x00-\x1f]/.test(path)) return text('Solicitud inválida',400);
  const authRoute=path === '/_acceso' || path === '/_salir';
  if (!authRoute && !isPrivate(path)) return context.next();
  if (!configured(env)) return text('Acceso privado temporalmente no disponible.',503);
  if (path === '/_salir') {
    if (request.method !== 'POST' || request.headers.get('Origin') !== url.origin) return text('Solicitud inválida',403);
    return redirect('/_acceso',`${COOKIE}=; Path=/; Max-Age=0; Secure; HttpOnly; SameSite=Strict`);
  }
  if (path === '/_acceso') {
    const target=safeReturn(url.searchParams.get('return'));
    if (request.method === 'GET') return loginPage(target,false);
    if (request.method !== 'POST' || request.headers.get('Origin') !== url.origin || !(request.headers.get('Content-Type')||'').toLowerCase().startsWith('application/x-www-form-urlencoded')) return text('Solicitud inválida',403);
    if (Number(request.headers.get('Content-Length') || 0) > 1024) return text('Solicitud demasiado grande',413);
    const body=await request.text(); if(body.length>1024) return text('Solicitud demasiado grande',413);
    const password=new URLSearchParams(body).get('password') || '';
    const left=await mac(env.AUTH_SESSION_KEY,'password-v1:'+password), right=await mac(env.AUTH_SESSION_KEY,'password-v1:'+env.AUTH_PASSWORD);
    if (!equal(left,right)) return loginPage(target,true);
    const expiry=String(Math.floor(Date.now()/1000)+8*60*60), sig=b64(await mac(await sessionKey(env),'session-v1:'+expiry));
    return redirect(target,`${COOKIE}=${expiry}.${sig}; Path=/; Max-Age=28800; Secure; HttpOnly; SameSite=Strict`);
  }
  if (!(await isAuthorized(request,env))) {
    if (request.method !== 'GET' && request.method !== 'HEAD') return text('Acceso no autorizado',401);
    return redirect('/_acceso?'+new URLSearchParams({return:url.pathname+url.search}));
  }
  const response=await context.next(); const h=new Headers(response.headers); h.set('Cache-Control','no-store, private'); h.set('X-Content-Type-Options','nosniff');
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers:h});
}
