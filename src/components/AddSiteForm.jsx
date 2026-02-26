import { useState } from 'react'

const AddSiteForm = ({ onAdd, onCancel, categories }) => {
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    category: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    if (!formData.name || !formData.url) {
      setError('请填写站点名称和 URL')
      return
    }

    const url = /^https?:\/\//i.test(formData.url) ? formData.url : `https://${formData.url}`
    setLoading(true)

    try {
      const response = await fetch('/api/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, url })
      })

      if (!response.ok) {
        throw new Error('添加失败')
      }

      const newSite = await response.json()
      onAdd(newSite)
    } catch (errorInfo) {
      console.error(errorInfo)
      onAdd({
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        ...formData,
        url,
        createdAt: new Date().toISOString()
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-card large">
        <div className="modal-title-row">
          <h2>添加站点</h2>
          <button className="icon-close" onClick={onCancel}>×</button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          {error && <p className="error-text">{error}</p>}

          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="站点名称，如：GitHub"
            required
          />

          <input
            type="url"
            name="url"
            value={formData.url}
            onChange={handleChange}
            placeholder="站点 URL，如：https://github.com"
            required
          />

          <select name="category" value={formData.category} onChange={handleChange} className="sort-select">
            <option value="">选择分类（可选）</option>
            {(categories || []).map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onCancel}>取消</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? '添加中...' : '添加'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AddSiteForm
