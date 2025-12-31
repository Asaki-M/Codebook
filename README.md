# Codebook

一个用于记录「代码片段」并按「分类」管理的浏览器扩展（Plasmo + React + Tailwind）。

## 功能

- 代码片段管理：新建 / 编辑 / 删除 / 复制
- 分类：创建时设置分类，左侧按分类筛选
- 搜索：支持按标题 / 代码 / 分类 / 语言搜索
- 备份：CSV 导出与导入（支持合并导入 / 覆盖导入）
- 本地存储：使用 IndexedDB 保存数据（容量更大，适合存代码；数据仅保存在本机）
- 无滚动条设计：列表用分页展示；详情区内容过长会截断（可复制/编辑查看完整内容）

## 安装与开发

### 依赖安装

```bash
pnpm install
```

### 本地开发（Chrome）

```bash
pnpm dev
```

然后在 Chrome 打开 `chrome://extensions/`：

- 开启「开发者模式」
- 点击「加载已解压的扩展程序」
- 选择目录：`build/chrome-mv3-dev`

### 生产构建 / 打包

```bash
pnpm build
pnpm package
```

## 使用说明

- 点击浏览器工具栏的扩展图标，打开 Codebook popup 页面
- 右上角按钮：
  - 新建：创建一个代码片段（填写标题/分类/语言/代码）
  - 导出 CSV：下载备份文件
  - 导入 CSV：选择 CSV 文件后，可选择「合并导入」或「覆盖导入」
- 片段列表：没有滚动条，使用「上一页 / 下一页」翻页
- 片段详情：内容过长会截断；需要完整内容可「复制」或「编辑」

## CSV 说明

导出的 CSV 包含以下列（第一行是 header）：

`id,title,category,language,code,createdAt,updatedAt`

导入行为：

- 合并导入：按 `id` 去重，同 `id` 的数据会被导入文件覆盖
- 覆盖导入：清空现有数据后导入

## 开发辅助

- 类型检查：`pnpm exec tsc -p tsconfig.json --noEmit`

## CI / Release

- Push 到 `main` 会触发 GitHub Actions：`.github/workflows/release.yml`
- 工作流会执行 `pnpm package`，并创建一个 Release，tag 来自 `package.json` 的 `version`（例如 `v0.0.2`），附件为 `build/*.zip`
- 如果该版本的 Release 已存在，则不会重复创建（但仍会打包并上传 Actions artifact）

### 发版流程（建议）

1. 修改 `package.json` 里的 `version`（例如 `0.0.1` → `0.0.2`）并提交/合并到 `main`
2. 推送到 `main` 后会自动创建 `v0.0.2` 的 Release
