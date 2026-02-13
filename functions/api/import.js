// 处理收藏夹导入的 API 请求
export async function onRequest(context) {
  const { request, env } = context;
  const method = request.method;

  // 只处理 POST 请求
  if (method !== 'POST') {
    return new Response('Method Not Allowed', {
      status: 405,
      headers: { 'Allow': 'POST' }
    });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    
    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const html = await file.text();
    const sites = parseBookmarksHtml(html);
    
    const existingSites = JSON.parse(await env.NAV_SITES.get('all_sites') || '[]');
    const mergedSites = [...existingSites, ...sites];
    
    await env.NAV_SITES.put('all_sites', JSON.stringify(mergedSites));
    
    return new Response(JSON.stringify({ success: true, imported: sites.length }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// 解析书签 HTML（使用字符串解析，兼容 Cloudflare Workers 环境）
function parseBookmarksHtml(html) {
  const sites = [];
  let currentFolder = '';

  // 简单的字符串解析逻辑，提取书签信息
  // 查找所有 <a> 标签
  const aTagRegex = /<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let match;

  while ((match = aTagRegex.exec(html)) !== null) {
    const url = match[1];
    const name = match[2].replace(/<[^>]+>/g, '').trim();

    // 查找最近的 <h3> 标签作为分类
    const h3Regex = /<h3[^>]*>([\s\S]*?)<\/h3>/gi;
    let h3Match;
    let lastH3Index = -1;
    let folderName = '';

    while ((h3Match = h3Regex.exec(html)) !== null) {
      if (h3Match.index < match.index) {
        lastH3Index = h3Match.index;
        folderName = h3Match[1].replace(/<[^>]+>/g, '').trim();
      } else {
        break;
      }
    }

    const site = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      name: name,
      url: url,
      category: folderName,
      createdAt: new Date().toISOString()
    };

    sites.push(site);
  }

  return sites;
}
