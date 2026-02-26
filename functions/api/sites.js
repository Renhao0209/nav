const SITES_KEY = 'all_sites';
const CATEGORIES_KEY = 'all_categories';

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const method = request.method;

  if (method === 'GET') {
    try {
      const sites = await getSites(env);
      const categories = await getCategories(env, sites);

      if (url.searchParams.get('meta') === '1') {
        return json({ sites, categories });
      }

      return json(sites);
    } catch (error) {
      return json({ error: error.message }, 500);
    }
  }

  if (method === 'POST') {
    try {
      const data = await request.json();

      if (data.category && !data.name && !data.url) {
        const categoryName = (data.category || '').trim();
        if (!categoryName) {
          return json({ error: '分类不能为空' }, 400);
        }

        const categories = await getCategories(env);
        const nextCategories = categories.includes(categoryName)
          ? categories
          : [...categories, categoryName];

        await env.NAV_SITES.put(CATEGORIES_KEY, JSON.stringify(nextCategories));
        return json({ success: true, categories: nextCategories }, 201);
      }

      const sites = await getSites(env);
      const nextSite = normalizeSite(data);
      const nextSites = [...sites, nextSite];
      await env.NAV_SITES.put(SITES_KEY, JSON.stringify(nextSites));

      if (nextSite.category) {
        const categories = await getCategories(env, nextSites);
        if (!categories.includes(nextSite.category)) {
          categories.push(nextSite.category);
          await env.NAV_SITES.put(CATEGORIES_KEY, JSON.stringify(categories));
        }
      }

      return json(nextSite, 201);
    } catch (error) {
      return json({ error: error.message }, 500);
    }
  }

  if (method === 'DELETE') {
    try {
      const { ids } = await request.json();
      const targetIds = Array.isArray(ids) ? ids : [];
      const sites = await getSites(env);
      const nextSites = sites.filter((site) => !targetIds.includes(site.id));
      await env.NAV_SITES.put(SITES_KEY, JSON.stringify(nextSites));

      return json({ success: true, deleted: sites.length - nextSites.length });
    } catch (error) {
      return json({ error: error.message }, 500);
    }
  }

  if (method === 'PUT') {
    try {
      const updatedSite = await request.json();
      const sites = await getSites(env);
      const targetIndex = sites.findIndex((site) => site.id === updatedSite.id);

      if (targetIndex < 0) {
        return json({ error: '站点不存在' }, 404);
      }

      const nextSite = {
        ...sites[targetIndex],
        ...normalizeSite(updatedSite, true),
        id: sites[targetIndex].id,
        createdAt: sites[targetIndex].createdAt || new Date().toISOString()
      };

      const nextSites = [...sites];
      nextSites[targetIndex] = nextSite;
      await env.NAV_SITES.put(SITES_KEY, JSON.stringify(nextSites));

      if (nextSite.category) {
        const categories = await getCategories(env, nextSites);
        if (!categories.includes(nextSite.category)) {
          categories.push(nextSite.category);
          await env.NAV_SITES.put(CATEGORIES_KEY, JSON.stringify(categories));
        }
      }

      return json(nextSites);
    } catch (error) {
      return json({ error: error.message }, 500);
    }
  }

  return new Response('Method Not Allowed', {
    status: 405,
    headers: { Allow: 'GET, POST, PUT, DELETE' }
  });
}

async function getSites(env) {
  const raw = await env.NAV_SITES.get(SITES_KEY);
  const sites = readJson(raw, []);
  return sites.filter((site) => site && !site.isPlaceholder && site.url && site.url !== '#');
}

async function getCategories(env, sites = null) {
  const persisted = readJson(await env.NAV_SITES.get(CATEGORIES_KEY), []);
  const sourceSites = sites || (await getSites(env));
  const fromSites = sourceSites
    .map((site) => (site.category || '').trim())
    .filter(Boolean);

  return [...new Set([...persisted, ...fromSites])];
}

function normalizeSite(site, keepId = false) {
  const payload = {
    name: (site?.name || '').trim(),
    url: normalizeUrl(site?.url || ''),
    category: (site?.category || '').trim(),
    createdAt: site?.createdAt || new Date().toISOString()
  };

  if (!payload.name || !payload.url) {
    throw new Error('站点名称和 URL 不能为空');
  }

  if (!keepId) {
    payload.id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  return payload;
}

function normalizeUrl(url) {
  const value = url.trim();
  if (!value) {
    return value;
  }
  if (/^https?:\/\//i.test(value)) {
    return value;
  }
  return `https://${value}`;
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
