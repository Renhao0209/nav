const SITES_KEY = 'all_sites';

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', {
      status: 405,
      headers: { Allow: 'POST' }
    });
  }

  try {
    const html = await readHtmlPayload(request);
    if (!html || html.trim() === '') {
      return json({ error: '未检测到书签内容' }, 400);
    }

    const parsedSites = parseBookmarksHtml(html);
    const existingSites = readJson(await env.NAV_SITES.get(SITES_KEY), []);
    const { mergedSites, importedCount, skippedCount } = mergeUniqueSites(existingSites, parsedSites);

    await env.NAV_SITES.put(SITES_KEY, JSON.stringify(mergedSites));

    return json({
      success: true,
      imported: importedCount,
      skipped: skippedCount,
      total: mergedSites.length
    });
  } catch (error) {
    return json({ error: error.message || '导入失败' }, 500);
  }
}

async function readHtmlPayload(request) {
  const contentType = request.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    const body = await request.json();
    return typeof body?.html === 'string' ? body.html : '';
  }

  const formData = await request.formData();
  const file = formData.get('file');
  if (!file || typeof file.text !== 'function') {
    throw new Error('请上传 HTML 书签文件');
  }
  return file.text();
}

function parseBookmarksHtml(html) {
  const sites = [];
  const folderStack = [];
  let pendingFolder = null;

  const tokenRegex = /<h3[^>]*>([\s\S]*?)<\/h3>|<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>|<\/dl\s*>|<dl[^>]*>/gi;
  let match;

  while ((match = tokenRegex.exec(html)) !== null) {
    const [, h3Name, href, anchorText] = match;

    if (h3Name !== undefined) {
      pendingFolder = normalizeText(h3Name);
      continue;
    }

    if (match[0].toLowerCase().startsWith('<dl')) {
      if (pendingFolder) {
        folderStack.push(pendingFolder);
        pendingFolder = null;
      }
      continue;
    }

    if (match[0].toLowerCase().startsWith('</dl')) {
      folderStack.pop();
      continue;
    }

    if (!href) {
      continue;
    }

    if (!/^https?:\/\//i.test(href)) {
      continue;
    }

    const siteName = normalizeText(anchorText) || extractDomain(href);
    const category = pickCategory(folderStack);

    sites.push({
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
      name: siteName,
      url: href.trim(),
      category,
      createdAt: new Date().toISOString()
    });
  }

  return sites;
}

function pickCategory(folderStack) {
  const roots = new Set(['书签栏', '收藏夹栏', 'bookmarks bar', 'bookmarks']);
  for (let index = folderStack.length - 1; index >= 0; index -= 1) {
    const value = (folderStack[index] || '').trim();
    if (!value) {
      continue;
    }
    if (!roots.has(value.toLowerCase())) {
      return value;
    }
  }
  return '';
}

function mergeUniqueSites(existingSites, importedSites) {
  const mergedSites = [...existingSites];
  const signatureSet = new Set(existingSites.map(buildSignature));
  let importedCount = 0;
  let skippedCount = 0;

  importedSites.forEach((site) => {
    const signature = buildSignature(site);
    if (signatureSet.has(signature)) {
      skippedCount += 1;
      return;
    }
    signatureSet.add(signature);
    mergedSites.push(site);
    importedCount += 1;
  });

  return { mergedSites, importedCount, skippedCount };
}

function buildSignature(site) {
  return `${(site.url || '').trim().toLowerCase()}::${(site.name || '').trim().toLowerCase()}`;
}

function normalizeText(text) {
  return (text || '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./i, '');
  } catch {
    return url;
  }
}

function readJson(raw, fallback) {
  if (!raw) {
    return fallback;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}
