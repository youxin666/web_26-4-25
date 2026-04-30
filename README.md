# 🎬 音乐松弛小宇宙 - Scrollytelling 网页

> 耳机一戴，谁都不爱：我的音乐松弛小宇宙

## 项目概述

这是一个创意 **scrollytelling** 网页，通过用户滚动与视频进度同步的方式，讲述"耳机·音乐·松弛"的叙事。

### 核心特性

- ✨ **滚动驱动视频进度** - 向下滚 = 前进，向上滚 = 倒放
- 🎥 **三段式视频切换** - 开头循环 → 主视频 → 结尾循环
- 📱 **完全响应式** - PC 多栏 / 移动端堆叠
- ⚡ **高性能** - requestAnimationFrame 平滑seek，无卡顿
- 🎨 **极简设计** - 参考Brandly风格，黑白高对比
- ♿ **易用友好** - iOS Safari playsInline 支持

---

## 📂 项目结构

```
web 26-4-25/
├── index.html          # 主HTML结构 & 文案内容
├── styles.css          # 样式表 & 排版应用
├── script.js           # 核心scrollytelling逻辑
├── intro-loop.mp4      # 开头循环视频（需要放入）
├── main.mp4            # 主视频（需要放入）
├── outro-loop.mp4      # 结尾循环视频（需要放入）
└── README.md           # 本文档
```

---

## 🎯 视频叙事拆解

### 三个关键节奏点

| 时间段 | 场景 | 文案 | 情绪 |
|------|------|------|------|
| **0:00 - 0:10** | 开头 | 耳机一戴，世界消音。独属于我的小宇宙，现在启动 | 🎧 沉浸入场 |
| **0:10 - 0:23** | 中间 | 音乐一响，身体不由自主。这一刻，我就是自己舞台上的主角 | 🎉 释放律动 |
| **0:23 - 0:30** | 结尾 | 歌声落幕，我已瘫平。松弛才是顶级奢侈，放下就是最好的释放 | 😌 躺平治愈 |

---

## 🎥 视频配置要求

### 需要的三个视频文件

| 视频 | 说明 | 配置 |
|------|------|------|
| **intro-loop.mp4** | 开头循环动画 | 建议 5-10 秒，loop muted autoplay |
| **main.mp4** | 主视频（滚动驱动） | 关键！决定页面总高度 = 视频时长 × 100vh |
| **outro-loop.mp4** | 结尾循环动画 | 建议 5-10 秒，loop muted autoplay |

### 视频放置

1. 将三个视频文件放到 `web 26-4-25/` 目录
2. 确保文件名**完全匹配**：
   - `intro-loop.mp4`
   - `main.mp4`
   - `outro-loop.mp4`

### 视频编码建议

```bash
# FFmpeg 转码示例（高效率）
ffmpeg -i input.mov -c:v libx264 -crf 23 -preset fast \
  -c:a aac -b:a 128k -movflags +faststart output.mp4
```

---

## 🔧 技术实现细节

### 1️⃣ 三段式视频切换逻辑

```javascript
// 滚动进度映射
滚动进度 = 0 → intro-loop（自动循环）
滚动进度 0-1 → main（滚动驱动，不自动）
滚动进度 ≥ 0.98 → outro-loop（自动循环）

// 0.5s 淡入淡出过渡，避免硬切
transition: opacity 0.5s ease-in-out
```

### 2️⃣ 滚动进度同步

```javascript
// 页面高度自动计算
页面高度 = main 视频时长 × 100vh

// 实时计算滚动进度
scrollProgress = window.scrollY / (scrollHeight - windowHeight)

// 映射到视频时间（避免频繁seek）
mainVideoTime = scrollProgress × mainVideoDuration
```

### 3️⃣ 性能优化

- ✅ 使用 `requestAnimationFrame` 平滑处理滚动
- ✅ 只在进度差异 > 5% 时 seek，避免卡顿
- ✅ 三个视频同时 preload，确保流畅
- ✅ 使用 `will-change` CSS 优化动画
- ✅ 懒加载场景元素（Intersection Observer）

### 4️⃣ 排版参考应用（Brandly风格）

```css
/* 极简黑白设计 */
背景: #000
文字: #fff
强调色: #ff8c42 (橙色渐变)

/* 字体层级 */
主标题: Playfair Display 700, clamp(3rem, 12vw, 6rem)
副标题: Montserrat 600, clamp(1.2rem, 4vw, 2rem)
文案: Montserrat 400, clamp(1rem, 2vw, 1.2rem)

/* 对齐与布局 */
中心对齐，响应式自适应
mobile: 堆叠布局
desktop: 多栏布局
```

---

## 📱 响应式支持

### 设备兼容性

| 设备 | 状态 | 备注 |
|------|------|------|
| **Desktop** | ✅ 完全支持 | 多栏布局，流畅滚动 |
| **Tablet** | ✅ 完全支持 | 自动适配 |
| **Mobile** | ✅ 完全支持 | playsInline + iOS 10+ |
| **iOS Safari** | ✅ 完全支持 | 必须 muted + playsInline |
| **Chrome/Firefox** | ✅ 完全支持 | 标准HTML5视频 |

### 断点设置

```css
1024px - 平板
768px  - 小平板
480px  - 手机
```

---

## 🚀 部署与使用

### 本地测试

```bash
# 方案1：用Python简易服务器（推荐测试）
cd web 26-4-25
python -m http.server 8000
# 访问 http://localhost:8000

# 方案2：用Node.js http-server
npx http-server

# 方案3：用VS Code Live Server扩展
# 右键点击index.html → Open with Live Server
```

### 调试模式

在URL中添加 `?debug` 查看实时状态：

```
http://localhost:8000/?debug
# 控制台会每秒输出：
# - scrollProgress (0-1)
# - currentPhase (intro/main/outro)
# - currentScene (1/2/3)
# - mainVideoTime (秒)
# - mainVideoDuration (秒)
```

### 全屏发布

```bash
# 上传到服务器即可，纯前端无需后端
# 支持所有静态主机：Vercel, Netlify, GitHub Pages等
```

---

## ⚙️ 自定义配置

### 修改文案

编辑 `index.html` 中的 `.content-box` 部分：

```html
<h1 class="main-title">
    你的标题<br>
    <span class="highlight">高亮部分</span>
</h1>
<p class="description">你的描述文案</p>
```

### 修改颜色主题

编辑 `styles.css` 中的强调色：

```css
/* 现在是橙色 */
background: linear-gradient(135deg, #ff8c42, #ffa94d);

/* 改成蓝色 */
background: linear-gradient(135deg, #3498db, #2980b9);
```

### 调整视频阶段阈值

编辑 `script.js` 中的配置：

```javascript
this.INTRO_OUTRO_THRESHOLD = 0.02;  // 改为 0.05 延长intro
this.OUTRO_START_THRESHOLD = 0.98;  // 改为 0.90 更早进outro
```

---

## 🐛 常见问题

### Q: 视频无法加载？

**A:** 检查以下几点：
1. 视频文件是否在正确位置 `web 26-4-25/`
2. 文件名是否完全匹配（大小写敏感）
3. 浏览器是否支持 MP4 格式
4. 是否通过 http:// 访问（不能用 file://）

### Q: 滚动不同步？

**A:**
1. 打开调试模式 `?debug` 查看实时进度
2. 确保 `main.mp4` 正确加载（检查浏览器控制台）
3. 检查网络是否足够快（视频预加载需要时间）

### Q: iOS 视频不自动播放？

**A:** 这是 Apple 的安全策略。我们的实现：
- 所有视频都添加了 `muted` 属性
- 开头/结尾视频才能自动播放（全屏视频）
- 主视频由滚动驱动，无需自动播放

### Q: 能否改成其他视频格式？

**A:** 可以，但需要修改 HTML：

```html
<!-- WebM 格式（更小体积）-->
<source src="intro-loop.webm" type="video/webm">
<source src="intro-loop.mp4" type="video/mp4">

<!-- HLS 流（大文件推荐）-->
<source src="stream.m3u8" type="application/x-mpegURL">
```

### Q: 想要加后端数据？

**A:** 可以轻松集成：
- **静态内容** → 现在的纯HTML/CSS/JS就够
- **动态内容** → 用 fetch 替换文案即可
- **评论/互动** → 加个后端API + 数据库

### Q: 文字排版能否调整？

**A:** 完全可以：
- 修改 `styles.css` 中的 `font-size`, `letter-spacing`, `line-height`
- 改变字体：在 `index.html` 的 `<link>` 中修改 Google Fonts

---

## 🎨 排版参考应用（详细）

### 排版特点分析（来自 Brandly 参考图）

| 特点 | 实现 |
|------|------|
| **字体** | 无衬线主体（Montserrat）+ 衬线标题（Playfair Display） |
| **字重** | 标题超粗体700 + 正文常规400 |
| **大小层级** | 标题 > 副标题 > 正文（3:2:1 比例） |
| **颜色** | 黑#000 + 白#fff + 橙#ff8c42 |
| **对齐** | 中心对齐 + 强调元素加下划线 |
| **装饰** | CTA按钮 + 标签 + 进度条 |
| **气质** | 极简但强对比、大胆而不生硬 |

### 应用规则

1. **标题** - Playfair Display 大胆，使用强调色渐变
2. **副标题** - Montserrat 常规灰色，全大写
3. **文案** - 常规权重，高行距（1.8）
4. **CTA** - 白色背景黑字，圆角胶囊形
5. **标签** - 白色边框，悬停反转
6. **进度条** - 橙色渐变，顶部固定

---

## 📊 性能指标

| 指标 | 目标 | 实现 |
|------|------|------|
| FCP (首屏绘制) | < 2s | ✅ HTML/CSS 极轻 |
| LCP (最大内容绘制) | < 2.5s | ✅ 视频后台加载 |
| CLS (累积布局偏移) | < 0.1 | ✅ fixed 布局无抖动 |
| 帧率 | 60fps | ✅ 用 RAF 限流 |
| 文件大小 | | HTML+CSS+JS < 50KB |

---

## 🔐 浏览器支持

- ✅ Chrome 60+
- ✅ Firefox 55+
- ✅ Safari 11+
- ✅ Edge 79+
- ✅ iOS Safari 11+
- ✅ Android Chrome

---

## 📝 许可证

自由使用

---

## 💡 扩展建议

1. **添加音频** - 同步背景音乐到滚动进度
2. **互动元素** - 滚动到特定位置时触发动画
3. **分享功能** - 当前进度截图分享
4. **数据统计** - 跟踪用户滚动热点
5. **多语言** - 国际化文案

---

**🎬 开始你的scrollytelling之旅吧！**

需要帮助？查看控制台日志或打开 `?debug` 模式。
