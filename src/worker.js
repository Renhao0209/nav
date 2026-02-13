export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // API 路由处理
    if (path.startsWith('/api/')) {
      const apiPath = path.substring(5);

      // 获取所有站点
      if (apiPath === 'sites' && request.method === 'GET') {
        return await this.getSites(env);
      }

      // 添加站点
      if (apiPath === 'sites' && request.method === 'POST') {
        return await this.addSite(request, env);
      }

      // 删除站点
      if (apiPath === 'sites' && request.method === 'DELETE') {
        return await this.deleteSites(request, env);
      }

      // 导入收藏夹
      if (apiPath === 'import' && request.method === 'POST') {
        return await this.importBookmarks(request, env);
      }

      return new Response('Not Found', { status: 404 });
    }

    // 静态文件处理
    return env.ASSETS.fetch(request);
  },

  // 获取所有站点
  async getSites(env) {
    try {
      const sites = await env.NAV_SITES.get('all_sites');
      return new Response(sites || '[]', {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  },

  // 添加站点
  async addSite(request, env) {
    try {
      const site = await request.json();
      const sites = JSON.parse(await env.NAV_SITES.get('all_sites') || '[]');
      
      // 生成唯一 ID
      site.id = Date.now().toString();
      // 添加时间戳
      site.createdAt = new Date().toISOString();
      
      sites.push(site);
      await env.NAV_SITES.put('all_sites', JSON.stringify(sites));
      
      return new Response(JSON.stringify(site), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  },

  // 删除站点
  async deleteSites(request, env) {
    try {
      const { ids } = await request.json();
      const sites = JSON.parse(await env.NAV_SITES.get('all_sites') || '[]');
      
      const filteredSites = sites.filter(site => !ids.includes(site.id));
      await env.NAV_SITES.put('all_sites', JSON.stringify(filteredSites));
      
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  },

  // 导入收藏夹
  async importBookmarks(request, env) {
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
      const sites = this.parseBookmarksHtml(html);
      
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
  },

  // 解析书签 HTML
  parseBookmarksHtml(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const sites = [];

    const parseNode = (node, folder = '') => {
      if (node.tagName === 'A') {
        const site = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          name: node.textContent.trim(),
          url: node.href,
          category: folder,
          createdAt: new Date().toISOString()
        };
        sites.push(site);
      }

      if (node.tagName === 'DL') {
        for (const child of node.children) {
          if (child.tagName === 'DT') {
            if (child.firstElementChild && child.firstElementChild.tagName === 'H3') {
              const folderName = child.firstElementChild.textContent.trim();
              const nextDl = child.nextElementSibling;
              if (nextDl && nextDl.tagName === 'DL') {
                parseNode(nextDl, folderName);
              }
            } else {
              parseNode(child.firstElementChild, folder);
            }
          }
        }
      }
    };

    const bookmarkNodes = doc.querySelectorAll('dl');
    bookmarkNodes.forEach(node => parseNode(node));

    return sites;
  }
};
