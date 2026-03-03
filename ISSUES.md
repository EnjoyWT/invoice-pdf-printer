# 问题记录 / Issue Notes

用于记录可复现的交互/功能问题、原因分析与处理方案，方便后续回溯。

---

## 2026-03-03 — PDF 预览缩略图侧栏滚动失效（主视图滚动后）

### 现象（实际行为）

- 在 `PdfViewer` 中，先用鼠标/触控板滚动主视图（PDF 页面区域）。
- 左侧缩略图侧栏会跟随主视图进行自动定位滚动（同步当前页）。
- 此时把鼠标移到左侧缩略图侧栏，继续滚动滚轮：缩略图侧栏“滚不动/被拉回”，用户无法手动浏览缩略图列表。

### 预期行为

- 无论主视图是否刚发生滚动同步，用户在缩略图侧栏区域滚动时，都应当以用户手势为优先，缩略图侧栏保持可滚动。

### 影响范围

- 桌面端（PC）`PdfViewer` 的缩略图侧栏（`@embedpdf/plugin-thumbnail` 渲染的 `ThumbnailsPane`）。

### 根因分析（关键点）

1. **缩略图真正的滚动容器不是外层 `.thumbnails-sidebar`**  
   `@embedpdf/plugin-thumbnail` 的 `ThumbnailsPane` 内部会渲染一个带 `overflowY: auto` 的根 `div`，并在其上监听 `scroll`。  
   同时 **`scroll` 事件不冒泡**，如果把 `@scroll` 绑在外层容器上，会导致“用户正在滚动缩略图”的检测不稳定/不生效。

2. **程序滚动与用户滚动发生竞争（smooth 滚动尤为明显）**  
   主视图在 `onPageChange` 时会调用 `thumbnailCap.scrollToThumb(pageIndex)` 来同步缩略图位置。  
   `scrollToThumb` 默认会以 `scrollBehavior: "smooth"` 发起一段持续的程序滚动，期间用户滚轮输入容易被其持续的滚动动画“顶回去”，体感就像侧栏无法滚动。

### 处理方案（代码改动）

对应实现位于：`src/components/pdf/PdfViewer.vue`

1. **将用户交互事件绑定到 `ThumbnailsPane`（真实滚动容器）**
   - `@scroll="onThumbnailsScroll"`
   - `@wheel.passive.stop="onThumbnailsWheel"`
   - `@mousedown/@touchstart="onThumbnailsPointerDown"`
   - `@mouseenter/@mouseleave` 用于悬停状态

2. **用户开始操作缩略图侧栏时，立即打断程序同步**
   - `onThumbnailsWheel` / `onThumbnailsPointerDown` 会将 `isUserScrollingThumbnails` 置为 `true`，并清除/终止 `isProgrammaticScrolling` 的计时窗口。
   - 维持一个短时间锁（当前为 3 秒），避免主视图继续把缩略图“拉回去”。

3. **禁用缩略图同步的平滑滚动，减少与用户手势的冲突**
   - 在 `ThumbnailPluginPackage` 配置中设置 `scrollBehavior: "auto"`，使 `scrollToThumb` 采用瞬间定位而非持续 smooth 动画。

### 验证方式（回归步骤）

1. 打开任意 PDF，展开缩略图侧栏。
2. 在主视图（PDF 页面区域）滚动多页，确认缩略图会跟随定位。
3. 立刻将鼠标移入缩略图侧栏，滚动滚轮/触控板：应当可以正常上下滚动缩略图列表，且不应被同步逻辑持续拉回。

### 备注（如果仍有复现）

- 优先确认输入设备（鼠标滚轮 vs 触控板）与浏览器（Chrome/Safari/Edge）。
- 若仍出现“滚不动”，通常意味着还有其他上层容器在拦截滚轮事件或存在额外的程序滚动源；可在 `onThumbnailsWheel` 处临时加日志/断点确认是否被触发。

