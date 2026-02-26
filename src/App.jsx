import { useEffect, useMemo, useState } from 'react'
import './App.css'
import AddSiteForm from './components/AddSiteForm'
import ImportBookmarks from './components/ImportBookmarks'
import EditSiteForm from './components/EditSiteForm'

const ROOT_CATEGORIES = ['书签栏', '收藏夹栏', 'Bookmarks', 'Bookmarks bar']

function App() {
  const [sites, setSites] = useState([])
  const [persistedCategories, setPersistedCategories] = useState([])
  const [selectedSites, setSelectedSites] = useState([])

  const [showAddForm, setShowAddForm] = useState(false)
  const [showImportForm, setShowImportForm] = useState(false)
  const [showAddCategoryForm, setShowAddCategoryForm] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)

  const [activeCategory, setActiveCategory] = useState('全部')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [sortMode, setSortMode] = useState('recent')

  const [editMode, setEditMode] = useState(true)
  const [newCategory, setNewCategory] = useState('')
  const [editingSite, setEditingSite] = useState(null)

  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    fetchSites()
  }, [])

  useEffect(() => {
    setSelectedSites((prev) => prev.filter((id) => sites.some((site) => site.id === id)))
  }, [sites])

  const categories = useMemo(() => {
    const categorySet = new Set(
      [
        ...persistedCategories,
        ...sites.map((site) => (site.category || '').trim())
      ]
        .filter(Boolean)
        .filter((category) => !ROOT_CATEGORIES.includes(category))
    )

    return ['全部', ...Array.from(categorySet), '未分类']
  }, [persistedCategories, sites])

  const filteredSites = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase()

    let list = sites.filter((site) => {
      if (activeCategory === '未分类') {
        return !site.category || site.category.trim() === ''
      }
      if (activeCategory !== '全部' && site.category !== activeCategory) {
        return false
      }
      if (!keyword) {
        return true
      }
      return (
        (site.name || '').toLowerCase().includes(keyword)
        || (site.url || '').toLowerCase().includes(keyword)
        || (site.category || '').toLowerCase().includes(keyword)
      )
    })

    if (sortMode === 'name') {
      list = [...list].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'zh-Hans-CN'))
    } else {
      list = [...list].sort((a, b) => {
        const timeA = new Date(a.createdAt || 0).getTime()
        const timeB = new Date(b.createdAt || 0).getTime()
        return timeB - timeA
      })
    }

    return list
  }, [activeCategory, searchKeyword, sites, sortMode])

  const groupedSites = useMemo(() => {
    const groupMap = new Map()

    filteredSites.forEach((site) => {
      const groupName = (site.category || '').trim() || '未分类'
      if (!groupMap.has(groupName)) {
        groupMap.set(groupName, [])
      }
      groupMap.get(groupName).push(site)
    })

    if (activeCategory !== '全部') {
      return Array.from(groupMap.entries()).map(([name, items]) => ({ name, items }))
    }

    const categoryOrder = categories.filter((category) => category !== '全部')
    const orderedGroups = categoryOrder
      .filter((category) => groupMap.has(category))
      .map((category) => ({ name: category, items: groupMap.get(category) }))

    const remainingGroups = Array.from(groupMap.entries())
      .filter(([name]) => !categoryOrder.includes(name))
      .map(([name, items]) => ({ name, items }))

    return [...orderedGroups, ...remainingGroups]
  }, [activeCategory, categories, filteredSites])

  const fetchSites = async (autoImportWhenEmpty = true) => {
    setLoading(true)
    try {
      const response = await fetch('/api/sites?meta=1')
      if (!response.ok) {
        throw new Error(`获取站点失败：${response.status}`)
      }

      const data = await response.json()
      let nextSites = []
      let nextCategories = []

      if (Array.isArray(data)) {
        nextSites = cleanSites(data)
        nextCategories = []
      } else {
        nextSites = cleanSites(data.sites || [])
        nextCategories = Array.isArray(data.categories) ? data.categories : []
      }

      setSites(nextSites)
      setPersistedCategories(nextCategories)

      if (nextSites.length === 0 && autoImportWhenEmpty) {
        const imported = await importDefaultBookmarksToRemote()
        if (imported !== null) {
          await fetchSites(false)
        }
      }
    } catch (error) {
      console.error(error)
      setSites([])
      setPersistedCategories([])
      setNotice('线上数据请求失败，请检查 Cloudflare Pages 的 Functions 与 KV 绑定')
    } finally {
      setLoading(false)
    }
  }

  const handleSiteSelect = (id) => {
    setSelectedSites((prev) => (
      prev.includes(id) ? prev.filter((siteId) => siteId !== id) : [...prev, id]
    ))
  }

  const handleBatchDelete = async () => {
    if (selectedSites.length === 0) {
      return
    }

    try {
      const response = await fetch('/api/sites', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedSites })
      })

      if (!response.ok) {
        throw new Error('批量删除失败')
      }
    } catch (error) {
      console.error(error)
    }

    setSites((prev) => prev.filter((site) => !selectedSites.includes(site.id)))
    setSelectedSites([])
  }

  const handleAddSite = (newSite) => {
    setSites((prev) => [...prev, newSite])
    setShowAddForm(false)
    setNotice('站点已添加')
  }

  const handleImportComplete = (count) => {
    fetchSites()
    setShowImportForm(false)
    if (count > 0) {
      setNotice(`导入完成，新增 ${count} 条站点`)
    }
  }

  const handleAddCategory = async (categoryName) => {
    const name = categoryName.trim()
    if (!name) {
      return
    }

    if (categories.includes(name)) {
      setNotice('分类已存在')
      return
    }

    try {
      const response = await fetch('/api/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: name })
      })

      if (!response.ok) {
        throw new Error('添加分类失败')
      }

      const data = await response.json()
      if (Array.isArray(data.categories)) {
        setPersistedCategories(data.categories)
      } else {
        setPersistedCategories((prev) => [...new Set([...prev, name])])
      }
      setNotice(`分类「${name}」已添加`)
    } catch (error) {
      console.error(error)
      setPersistedCategories((prev) => [...new Set([...prev, name])])
      setNotice(`分类「${name}」已添加（本地）`)
    } finally {
      setNewCategory('')
      setShowAddCategoryForm(false)
    }
  }

  const handleEditSite = (site) => {
    setEditingSite(site)
    setShowEditForm(true)
  }

  const handleUpdateSite = async (updatedSite) => {
    try {
      const response = await fetch('/api/sites', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSite)
      })

      if (!response.ok) {
        throw new Error('更新网站失败')
      }

      const nextSites = await response.json()
      if (Array.isArray(nextSites)) {
        setSites(cleanSites(nextSites))
      } else {
        setSites((prev) => prev.map((site) => (site.id === updatedSite.id ? updatedSite : site)))
      }
      setNotice('网站信息已更新')
    } catch (error) {
      console.error(error)
      setSites((prev) => prev.map((site) => (site.id === updatedSite.id ? updatedSite : site)))
      setNotice('网站信息已更新（本地）')
    } finally {
      setEditingSite(null)
      setShowEditForm(false)
    }
  }

  const handleImportDefaultBookmarks = async () => {
    const imported = await importDefaultBookmarksToRemote()
    if (imported !== null) {
      await fetchSites(false)
    }
  }

  const importDefaultBookmarksToRemote = async () => {
    try {
      const fileResponse = await fetch('/default-bookmarks.html')
      if (!fileResponse.ok) {
        throw new Error('无法读取默认书签文件')
      }

      const html = await fileResponse.text()
      const response = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html })
      })

      if (!response.ok) {
        throw new Error('导入默认书签失败')
      }

      const result = await response.json()
      setNotice(`默认书签导入完成：新增 ${result.imported ?? 0} 条，跳过 ${result.skipped ?? 0} 条`)
      return result.imported ?? 0
    } catch (error) {
      console.error(error)
      setNotice('默认书签导入失败，请检查 API 或手动导入文件')
      return null
    }
  }

  const toggleSelectAll = () => {
    if (filteredSites.length === 0) {
      return
    }

    if (selectedSites.length === filteredSites.length) {
      setSelectedSites([])
      return
    }

    setSelectedSites(filteredSites.map((site) => site.id))
  }

  const renderSiteCard = (site) => (
    <article
      key={site.id}
      className={`site-card ${selectedSites.includes(site.id) ? 'selected' : ''}`}
      onClick={() => {
        if (editMode) {
          handleEditSite(site)
          return
        }
        window.open(site.url, '_blank', 'noopener,noreferrer')
      }}
    >
      <div className="site-card-content">
        <img
          className="site-icon"
          src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(site.url)}&sz=64`}
          alt={`${site.name} favicon`}
          onError={(event) => {
            event.currentTarget.src = 'https://www.google.com/s2/favicons?domain=example.com&sz=64'
          }}
        />

        <h3 className="site-name" title={site.name}>{site.name}</h3>
        <p className="site-domain">{getHostname(site.url)}</p>

        {editMode && (
          <input
            className="site-select"
            type="checkbox"
            checked={selectedSites.includes(site.id)}
            onClick={(event) => event.stopPropagation()}
            onChange={() => handleSiteSelect(site.id)}
          />
        )}
      </div>
    </article>
  )

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <h1>虎窝导航</h1>
          <p>美观、简洁、可编辑的个人导航中心</p>
          <div className="hero-stats">
            <span>{sites.length} 个站点</span>
            <span>{categories.length - 2} 个分类</span>
            <span>{editMode ? '编辑模式' : '浏览模式'}</span>
          </div>
        </div>

        <div className="toolbar-actions">
          <>
            <button className="btn btn-primary" onClick={() => setShowAddForm(true)}>添加站点</button>
            <button className="btn btn-success" onClick={() => setShowImportForm(true)}>导入收藏夹</button>
            <button className="btn btn-violet" onClick={handleImportDefaultBookmarks}>导入默认书签</button>
            <button className="btn btn-secondary" onClick={() => setShowAddCategoryForm(true)}>添加分类</button>
            <button className="btn btn-dark" onClick={() => setEditMode((prev) => !prev)}>
              {editMode ? '切换浏览' : '切换编辑'}
            </button>

            {editMode && filteredSites.length > 0 && (
              <button className="btn btn-secondary" onClick={toggleSelectAll}>
                {selectedSites.length === filteredSites.length ? '取消全选' : '全选'}
              </button>
            )}

            {editMode && selectedSites.length > 0 && (
              <button className="btn btn-danger" onClick={handleBatchDelete}>删除选中 ({selectedSites.length})</button>
            )}
          </>
        </div>
      </header>

      <section className="panel">
        <div className="search-row">
          <input
            className="search-input"
            placeholder="搜索名称、网址或分类..."
            value={searchKeyword}
            onChange={(event) => setSearchKeyword(event.target.value)}
          />
          <select className="sort-select" value={sortMode} onChange={(event) => setSortMode(event.target.value)}>
            <option value="recent">按更新时间</option>
            <option value="name">按名称</option>
          </select>
        </div>

        <div className="category-row">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`category-chip ${activeCategory === category ? 'active' : ''}`}
            >
              {category}
            </button>
          ))}
        </div>
      </section>

      {notice && (
        <div className="notice" onClick={() => setNotice('')}>
          {notice}
        </div>
      )}

      <main className="site-grid">
        {!loading && groupedSites.map((group) => (
          <section key={group.name} className="category-section">
            <div className="section-header">
              <h2>{group.name}</h2>
              <span>{group.items.length} 个站点</span>
            </div>
            <div className="section-grid">
              {group.items.map(renderSiteCard)}
            </div>
          </section>
        ))}

        {!loading && filteredSites.length === 0 && (
          <div className="empty-state">
            <p>当前条件下没有匹配站点</p>
            <span>你可以调整分类/搜索，或在编辑模式下添加与导入</span>
          </div>
        )}

        {loading && (
          <div className="empty-state">
            <p>正在加载站点...</p>
          </div>
        )}
      </main>

      {showAddForm && (
        <AddSiteForm
          onAdd={handleAddSite}
          onCancel={() => setShowAddForm(false)}
          categories={categories.filter((category) => !['全部', '未分类'].includes(category))}
        />
      )}

      {showImportForm && (
        <ImportBookmarks
          onComplete={handleImportComplete}
          onCancel={() => setShowImportForm(false)}
        />
      )}

      {showAddCategoryForm && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h2>添加分类</h2>
            <form
              className="modal-form"
              onSubmit={(event) => {
                event.preventDefault()
                handleAddCategory(newCategory)
              }}
            >
              <input
                type="text"
                value={newCategory}
                onChange={(event) => setNewCategory(event.target.value)}
                placeholder="例如：学习"
                required
              />
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowAddCategoryForm(false)
                    setNewCategory('')
                  }}
                >
                  取消
                </button>
                <button type="submit" className="btn btn-primary">添加</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditForm && editingSite && (
        <div className="modal-overlay">
          <div className="modal-card large">
            <div className="modal-title-row">
              <h2>编辑站点</h2>
              <button
                className="icon-close"
                onClick={() => {
                  setShowEditForm(false)
                  setEditingSite(null)
                }}
              >
                ×
              </button>
            </div>
            <EditSiteForm
              site={editingSite}
              categories={categories.filter((category) => !['全部', '未分类'].includes(category))}
              onUpdate={handleUpdateSite}
              onCancel={() => {
                setShowEditForm(false)
                setEditingSite(null)
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function cleanSites(rawSites) {
  return (rawSites || [])
    .filter((site) => site && site.url && site.url !== '#' && !site.isPlaceholder)
    .map((site) => ({
      ...site,
      name: site.name || '未命名站点',
      url: normalizeUrl(site.url),
      category: (site.category || '').trim()
    }))
}

function normalizeUrl(url) {
  const value = (url || '').trim()
  if (!value) {
    return value
  }
  if (/^https?:\/\//i.test(value)) {
    return value
  }
  return `https://${value}`
}

function getHostname(url) {
  try {
    return new URL(url).hostname.replace(/^www\./i, '')
  } catch {
    return ''
  }
}

export default App
