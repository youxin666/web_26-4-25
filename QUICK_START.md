# 🚀 快速开始指南

## 5 分钟内启动你的 Scrollytelling 网页

---

## ✅ 第一步：准备视频文件

### 需要 3 个视频文件

将这些视频文件放到 `web 26-4-25/` 文件夹中：

```
web 26-4-25/
├── intro-loop.mp4        ← 需要！
├── main.mp4              ← 需要！（最重要）
├── outro-loop.mp4        ← 需要！
├── index.html
├── styles.css
└── script.js
```

### 文件名必须完全匹配（大小写敏感！）

❌ 错误：
- `Intro-loop.mp4`
- `MAIN.mp4`
- `intro_loop.mp4`

✅ 正确：
- `intro-loop.mp4`
- `main.mp4`
- `outro-loop.mp4`

---

## ✅ 第二步：本地测试

### 方案 A: 用 Python (推荐)

```bash
# 打开终端，进入项目文件夹
cd e:\Coding\web\ 26-4-25

# 启动本地服务器
python -m http.server 8000

# 在浏览器打开
http://localhost:8000
```

### 方案 B: 用 VS Code Live Server

1. 在 VS Code 中安装 **Live Server** 扩展
2. 右键点击 `index.html` → **Open with Live Server**
3. 浏览器自动打开

### 方案 C: 用 Node.js

```bash
# 需要先装 npm
npx http-server

# 打开浏览器访问提示的地址
```

---

## ✅ 第三步：滚动测试

1. **打开网页** → 看到开头视频循环播放（Intro）
2. **向下滚** → 主视频开始进行
3. **继续向下滚** → 视频进度随滚动条前进
4. **向上滚** → 视频倒放
5. **滚到底部** → 结尾视频循环播放（Outro）

---

## ✅ 第四步：调试与微调

### 打开调试模式

在 URL 后添加 `?debug`：

```
http://localhost:8000/?debug
```

控制台会每秒输出：

```
┌─ scrollProgress: 0.245  (滚动进度 0-1)
├─ currentPhase: main     (当前阶段: intro/main/outro)
├─ currentScene: 1        (当前场景: 1/2/3)
├─ mainVideoTime: 7.35s   (主视频当前时间)
└─ mainVideoDuration: 30  (主视频总时长)
```

### 常见问题排查

| 问题 | 排查步骤 |
|------|--------|
| 视频加载失败 | 1. 检查浏览器控制台 (F12) <br> 2. 确保视频文件在正确位置 <br> 3. 文件名大小写要匹配 |
| 滚动不同步 | 1. 打开 `?debug` 查看进度 <br> 2. 确认 `mainVideoDuration` 是否正确 <br> 3. 刷新页面重新加载 |
| iOS 视频不播放 | 已配置 `muted` + `playsInline`，应该可以 |
| 文案显示不全 | 在移动端测试，CSS 已做响应式 |

---

## ✅ 第五步：自定义内容

### 修改文案

编辑 `index.html`，找到对应的 `<section class="scene">` 修改：

**场景 1：** 寻找 `scene-1` 部分
```html
<h1 class="main-title">
    你的文案<br>
    <span class="highlight">高亮部分</span>
</h1>
```

**场景 2：** 寻找 `scene-2` 部分
**场景 3：** 寻找 `scene-3` 部分

### 修改颜色

编辑 `styles.css`，找到 `highlight` 部分：

```css
.highlight {
    background: linear-gradient(135deg, #ff8c42, #ffa94d);
    /* 改成你的颜色 */
    /* 蓝色: #3498db, #2980b9 */
    /* 绿色: #27ae60, #229954 */
    /* 紫色: #9b59b6, #8e44ad */
}
```

### 调整视频阶段

编辑 `script.js`，找到这些配置：

```javascript
// 改这两个数字来调整转换点
this.INTRO_OUTRO_THRESHOLD = 0.02;  // Intro 占比 2%
this.OUTRO_START_THRESHOLD = 0.98;  // Outro 从 98% 开始
```

---

## 📱 响应式测试

### Chrome DevTools 测试

1. 按 `F12` 打开开发者工具
2. 点击 `📱` 响应式设计模式
3. 选择不同设备测试：
   - iPhone 12 Pro
   - iPad Pro
   - Desktop

### 需要测试的断点

- [ ] 手机 (320px)
- [ ] 手机 (480px)
- [ ] 平板 (768px)
- [ ] 平板 (1024px)
- [ ] 桌面 (1440px)
- [ ] 超大屏 (2560px)

---

## 🎬 视频推荐配置

### 编码建议

```bash
# 使用 FFmpeg 优化视频
ffmpeg -i input.mov -c:v libx264 -crf 23 -preset fast \
  -c:a aac -b:a 128k -movflags +faststart output.mp4
```

### 文件大小建议

| 视频 | 建议大小 | 时长 |
|------|--------|------|
| intro-loop.mp4 | < 5MB | 5-10s |
| main.mp4 | < 20MB | 20-40s |
| outro-loop.mp4 | < 5MB | 5-10s |

---

## 🌐 部署到线上

### 方案 A: Vercel (推荐，免费)

```bash
# 1. 安装 Vercel CLI
npm i -g vercel

# 2. 进入项目文件夹
cd web\ 26-4-25

# 3. 部署
vercel

# 4. 按提示完成（选择 "Not under version control"）
```

### 方案 B: Netlify (免费)

1. 前往 [netlify.com](https://netlify.com)
2. 点击 "Drag and drop your site here"
3. 拖拽 `web 26-4-25` 文件夹
4. 等待部署完成

### 方案 C: GitHub Pages (免费)

```bash
# 1. 初始化 git
cd web\ 26-4-25
git init

# 2. 添加文件
git add .
git commit -m "Initial commit"

# 3. 推送到 GitHub
# （需要先在 GitHub 创建空仓库）
git push -u origin main

# 4. 在 GitHub 设置中启用 Pages
# Settings → Pages → Source: main branch
```

---

## 🎨 进阶定制

### 改变字体

编辑 `index.html` 的 `<head>` 部分：

```html
<!-- 改这行的 Google Fonts -->
<link href="https://fonts.googleapis.com/css2?family=YOUR_FONT:wght@400;600;700&display=swap" rel="stylesheet">
```

然后在 `styles.css` 改字体名：

```css
body {
    font-family: 'YOUR_FONT', sans-serif;
}
```

### 改变场景数量

默认 3 场景，想改成 4 场景：

1. 在 `index.html` 加第 4 个 `<section>`
2. 在 `script.js` 的 `sceneThresholds` 中加一行：
```javascript
this.sceneThresholds = [
    { scene: 1, threshold: 0.15 },
    { scene: 2, threshold: 0.5 },
    { scene: 3, threshold: 0.75 },  // ← 新加
    { scene: 4, threshold: 1.0 }
];
```

---

## 📊 性能检查

### Lighthouse 测试

1. Chrome 打开网页
2. 按 `F12` → Lighthouse 标签
3. 点击 "Analyze page load"

**目标分数：** 90+（绿色）

### 网络分析

1. DevTools → Network 标签
2. 刷新页面
3. 检查：
   - 总文件大小 < 50MB
   - 加载时间 < 5s
   - 视频占比最大

---

## ✨ 最终检查清单

部署前确认：

- [ ] 三个视频文件都在正确位置
- [ ] 文件名完全匹配（大小写敏感）
- [ ] 本地测试滚动同步正常
- [ ] 移动端响应式无问题
- [ ] 文案拼写检查无误
- [ ] 颜色 / 字体修改完成
- [ ] 调试模式显示正确数据
- [ ] 所有浏览器都能播放视频

---

## 🆘 需要帮助？

### 查看完整文档

1. **项目概览** → 打开 `README.md`
2. **排版深度讲解** → 打开 `TYPOGRAPHY_GUIDE.md`
3. **代码注释** → 查看 `script.js` 和 `styles.css`

### 常见错误代码

| 错误 | 原因 | 解决 |
|------|------|------|
| 404 Not Found | 视频文件不存在 | 检查文件位置和名称 |
| CORS 错误 | 本地用 file:// 打开 | 用 localhost 服务器 |
| 视频卡顿 | 网络太慢或视频太大 | 压缩视频或增加 crf 值 |
| 文案重叠 | 字号太大 | 调整 `clamp()` 的值 |

---

## 🎉 恭喜！

你已经有了一个完整的 scrollytelling 网页！

🚀 下一步：
1. 添加你的真实视频和文案
2. 分享给朋友
3. 收集反馈并优化

**祝你的"音乐松弛小宇宙"大火！🎵**

---

**遇到问题？** 打开 `?debug` 模式查看控制台日志，或查看 `README.md` 常见问题部分。

