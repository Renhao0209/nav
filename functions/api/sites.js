// 处理站点相关的 API 请求
export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const method = request.method;

  // GET 请求 - 获取所有站点
  if (method === 'GET') {
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
  }

  // POST 请求 - 添加站点或分类
  if (method === 'POST') {
    try {
      const data = await request.json();
      
      // 如果是添加分类
      if (data.category && !data.name && !data.url) {
        const sites = JSON.parse(await env.NAV_SITES.get('all_sites') || '[]');
        // 分类已存在，直接返回站点列表
        const categoryExists = sites.some(site => site.category === data.category);
        if (!categoryExists) {
          // 创建一个占位站点来存储分类
          const placeholderSite = {
            id: `category_${Date.now()}`,
            name: `分类占位: ${data.category}`,
            url: '#',
            category: data.category,
            createdAt: new Date().toISOString(),
            isPlaceholder: true
          };
          sites.push(placeholderSite);
          await env.NAV_SITES.put('all_sites', JSON.stringify(sites));
        }
        return new Response(JSON.stringify(sites), {
          status: 201,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // 添加站点
      const site = data;
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
  }

  // DELETE 请求 - 删除站点
  if (method === 'DELETE') {
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
  }

  // PUT 请求 - 更新站点
  if (method === 'PUT') {
    try {
      const updatedSite = await request.json();
      const sites = JSON.parse(await env.NAV_SITES.get('all_sites') || '[]');
      
      const index = sites.findIndex(site => site.id === updatedSite.id);
      if (index === -1) {
        return new Response(JSON.stringify({ error: '站点不存在' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      sites[index] = updatedSite;
      await env.NAV_SITES.put('all_sites', JSON.stringify(sites));
      
      return new Response(JSON.stringify(sites), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  // 不支持的请求方法
  return new Response('Method Not Allowed', {
    status: 405,
    headers: { 'Allow': 'GET, POST, PUT, DELETE' }
  });
}
