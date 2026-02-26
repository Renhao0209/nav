import { useEffect, useState } from 'react'

const EditSiteForm = ({ site, categories, onUpdate, onCancel }) => {
  const [formData, setFormData] = useState({ name: '', url: '', category: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!site) {
      return
    }

    setFormData({
      name: site.name || '',
      url: site.url || '',
      category: site.category || ''
    })
  }, [site])

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

    setLoading(true)

    try {
      const normalizedUrl = /^https?:\/\//i.test(formData.url) ? formData.url : `https://${formData.url}`
      onUpdate({ ...site, ...formData, url: normalizedUrl })
    } catch (errorInfo) {
      console.error(errorInfo)
      setError('更新失败，请稍后再试')
      setLoading(false)
    }
  }

  return (
    <form className="modal-form" onSubmit={handleSubmit}>
      {error && <p className="error-text">{error}</p>}

      <input
        type="text"
        name="name"
        value={formData.name}
        onChange={handleChange}
        placeholder="站点名称"
        required
      />

      <input
        type="url"
        name="url"
        value={formData.url}
        onChange={handleChange}
        placeholder="站点 URL"
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
          {loading ? '更新中...' : '更新'}
        </button>
      </div>
    </form>
  )
}

export default EditSiteForm
