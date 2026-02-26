import { useState } from 'react'

const ImportBookmarks = ({ onComplete, onCancel }) => {
  const [file, setFile] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleFileChange = (event) => {
    const selectedFile = event.target.files?.[0]
    if (!selectedFile) {
      return
    }

    if (selectedFile.type === 'text/html' || selectedFile.name.endsWith('.html')) {
      setFile(selectedFile)
      setError('')
      return
    }

    setFile(null)
    setError('请上传 HTML 格式的书签文件')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    if (!file) {
      setError('请选择收藏夹文件')
      return
    }

    setLoading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/import', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error('导入失败')
      }

      const result = await response.json()
      onComplete(result.imported || 0)
    } catch (errorInfo) {
      console.error(errorInfo)
      setError('导入失败，请稍后再试')
      onComplete(0)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-card large">
        <div className="modal-title-row">
          <h2>导入收藏夹</h2>
          <button className="icon-close" onClick={onCancel}>×</button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          {error && <p className="error-text">{error}</p>}

          <input type="file" accept=".html" onChange={handleFileChange} required />

          {file && <p>已选择：{file.name}</p>}

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onCancel}>取消</button>
            <button type="submit" className="btn btn-success" disabled={loading || !file}>
              {loading ? '导入中...' : '开始导入'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ImportBookmarks
