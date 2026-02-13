# 虎窝导航

一个基于 Cloudflare Pages 和 Workers 的网址导航站点，支持添加、删除、编辑、导入收藏夹等功能，具有密码保护的编辑模式。

## 功能特性

- ✅ 密码保护的编辑模式
- ✅ 添加新的导航站点
- ✅ 编辑现有站点信息
- ✅ 批量删除站点
- ✅ 导入浏览器导出的收藏夹文件
- ✅ 分类管理（添加分类）
- ✅ 按分类展示站点
- ✅ 未分类站点自动归类
- ✅ 默认显示「常用网站」分类
- ✅ 编辑模式下的全选功能
- ✅ 自动获取网站图标（使用 favicon.im）
- ✅ 响应式设计，适配桌面和移动设备
- ✅ 本地开发模拟数据

## 技术栈

- **前端**：React + Vite + Tailwind CSS
- **后端**：Cloudflare Pages Functions
- **存储**：Cloudflare KV
- **部署**：Cloudflare Pages

## 快速开始

### 本地开发

1. 克隆项目
2. 安装依赖
   ```bash
   npm install
   ```
3. 启动开发服务器
   ```bash
   npm run dev
   ```
4. 访问 http://localhost:5173
5. 本地开发时，编辑模式默认密码为 `admin123`

### 部署到 Cloudflare Pages

1. 登录 Cloudflare 控制台
2. 创建一个新的 Pages 项目
3. 连接 GitHub 仓库
4. 配置构建参数：
   - 构建命令：`npm run build`
   - 构建输出目录：`dist`
5. 在 Workers KV 中创建一个命名空间，名称为 `NAV_SITES`
6. 在 Pages 项目设置中绑定 KV 命名空间：
   - 变量名：`NAV_SITES`
   - KV 命名空间：选择创建的 `NAV_SITES`
7. 在 Pages 项目设置中添加环境变量：
   - 变量名：`VITE_PASSWORD`
   - 变量值：设置您的编辑模式密码
   - 环境：生产
8. 部署项目

## 项目结构

```
├── functions/              # Cloudflare Pages Functions
│   └── api/
│       ├── sites.js        # 站点管理 API
│       └── import.js       # 收藏夹导入 API
├── src/
│   ├── components/         # 前端组件
│   │   ├── SiteCard.jsx    # 站点卡片组件
│   │   ├── AddSiteForm.jsx # 添加站点表单
│   │   ├── EditSiteForm.jsx # 编辑站点表单
│   │   └── ImportBookmarks.jsx # 导入收藏夹组件
│   ├── App.jsx             # 主应用组件
│   └── main.jsx            # 应用入口
├── wrangler.toml           # Cloudflare Worker 配置
├── tailwind.config.js      # Tailwind CSS 配置
└── package.json            # 项目依赖
```

## 核心功能

### 进入编辑模式
1. 点击右上角的 "编辑" 按钮
2. 输入密码（本地开发默认：`admin123`）
3. 进入编辑模式后，可以进行站点管理操作

### 添加站点
1. 在编辑模式下，点击 "添加站点" 按钮
2. 填写站点名称、URL
3. 从下拉菜单中选择分类
4. 点击 "添加" 按钮

### 编辑站点
1. 在编辑模式下，点击要编辑的站点卡片
2. 在弹出的编辑表单中修改站点信息
3. 点击 "更新" 按钮保存修改

### 批量删除站点
1. 在编辑模式下，勾选要删除的站点
2. 点击 "批量删除" 按钮

### 导入收藏夹
1. 在编辑模式下，点击 "导入收藏夹" 按钮
2. 选择浏览器导出的 HTML 格式收藏夹文件
3. 点击 "导入" 按钮

### 管理分类
1. 在编辑模式下，点击 "添加分类" 按钮
2. 输入分类名称
3. 点击 "添加" 按钮
4. 新分类会出现在添加/编辑站点的分类下拉菜单中

### 分类导航
- 点击分类标签可以过滤显示对应分类的站点
- 没有分类的站点会显示在 "未分类" 标签下
- 网站默认显示 "常用网站" 分类

## 注意事项

- 本地开发时，由于没有连接 Cloudflare KV，会使用模拟数据
- 部署到 Cloudflare Pages 后，需要正确配置 KV 命名空间和环境变量才能正常使用
- 导入收藏夹时，会自动保留原有的文件夹结构作为分类
- 编辑模式密码通过 Cloudflare Pages 环境变量 `VITE_PASSWORD` 设置

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT License
