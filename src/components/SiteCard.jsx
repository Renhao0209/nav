import React from 'react'

const SiteCard = ({ site, onSelect, isSelected }) => {
  // 从 favicon.im 获取图标
  const faviconUrl = `https://favicon.im/zh/${site.url}`

  return (
    <div 
      className={`bg-white rounded-lg shadow-sm overflow-hidden transition-all hover:shadow-md ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
    >
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-md overflow-hidden flex-shrink-0">
              <img 
                src={faviconUrl} 
                alt={`${site.name} icon`} 
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40" fill="none"%3E%3Crect width="40" height="40" rx="8" fill="%23f3f4f6"/%3E%3Cpath d="M10 20H30" stroke="%239ca3af" strokeWidth="2" strokeLinecap="round"/%3E%3Cpath d="M20 10V30" stroke="%239ca3af" strokeWidth="2" strokeLinecap="round"/%3E%3C/svg%3E'
                }}
              />
            </div>
            <div>
              <h3 className="font-medium text-gray-900 truncate max-w-[160px]">{site.name}</h3>
              {site.category && (
                <p className="text-xs text-gray-500 mt-1">{site.category}</p>
              )}
            </div>
          </div>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onSelect(site.id)}
            className="h-4 w-4 text-blue-600 rounded"
          />
        </div>
        <a 
          href={site.url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-sm text-blue-600 hover:text-blue-800 truncate block"
        >
          {site.url}
        </a>
      </div>
    </div>
  )
}

export default SiteCard