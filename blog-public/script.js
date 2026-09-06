/* ═══════════════════════════════════════════════════════════════
   Rowan Notes Blog — Client Script
   Article loading / bookmarks / share / theme / comments
   ─────────────────────────────────────────────────────────── */

(function () {
  'use strict';

  // ─── Theme Toggle ──────────────────────────────────────────
  const THEME_KEY = 'blog_theme';

  function getStoredTheme() {
    try { return localStorage.getItem(THEME_KEY); } catch { return null; }
  }

  function setStoredTheme(theme) {
    try { localStorage.setItem(THEME_KEY, theme); } catch { /* noop */ }
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const icon = document.querySelector('[data-theme-icon]');
    if (icon) {
      if (theme === 'dark') {
        icon.className = 'ri-sun-line text-lg';
      } else {
        icon.className = 'ri-moon-line text-lg';
      }
    }
  }

  function detectTheme() {
    const stored = getStoredTheme();
    if (stored === 'dark' || stored === 'light') return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  window.toggleTheme = function () {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    setStoredTheme(next);
  };

  // Initialize theme
  applyTheme(detectTheme());

  // Listen for system theme changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function (e) {
    if (!getStoredTheme()) applyTheme(e.matches ? 'dark' : 'light');
  });

  // ─── Language Toggle ───────────────────────────────────────
  var LANGUAGE_KEY = 'blog_language';
  var ARTICLE_LAYOUT_KEY = 'blog_article_layout';
  var ARTICLE_LAYOUT_MODES = ['single', 'double', 'cylinder'];
  var articleCylinderController = null;
  var articleLayoutRequestId = 0;
  var currentLanguage = 'zh';
  var translations = {
    zh: {
      'nav.home': '首页',
      'nav.favorites': '收藏',
      'nav.rss': 'RSS',
      'nav.about': '关于',
      'nav.login': '登录 / 注册',
      'nav.logout': '退出',
      'nav.account': '我的账户',
      'nav.publish': '发布文章',
      'nav.myArticles': '我的文章',
      'nav.notifications': '我的消息',
      'nav.myFavorites': '我的收藏',
      'nav.adminHome': '管理首页',
      'nav.adminLogout': '退出登录',
      'nav.backHome': '返回首页',
      'nav.bookmarks': '书签',
      'profile.kicker': '个人中心',
      'profile.accountTitle': '我的账户',
      'profile.publicKicker': '作者主页',
      'profile.publicTitle': '个人主页',
      'profile.edit': '修改资料',
      'profile.uploadAvatar': '上传头像',
      'profile.avatarHint': 'JPG、PNG 或 WebP，不超过 5 MB',
      'profile.noAvatar': '尚未上传头像',
      'profile.noBio': '还没有填写简介',
      'profile.displayName': '昵称',
      'profile.email': '邮箱',
      'profile.bio': '个人简介',
      'profile.publishedArticles': '已发布文章',
      'profile.joined': '加入时间',
      'profile.cancel': '取消',
      'profile.save': '保存信息',
      'profile.saving': '正在保存...',
      'profile.saved': '资料已保存',
      'profile.loading': '正在加载资料...',
      'profile.loadFailed': '资料暂时无法加载，请稍后重试。',
      'profile.saveFailed': '保存失败，请稍后重试。',
      'profile.nameRequired': '请填写昵称。',
      'profile.avatarInvalid': '请选择 JPG、PNG 或 WebP 图片。',
      'profile.avatarTooLarge': '头像不能超过 5 MB。',
      'profile.uploading': '正在上传头像...',
      'profile.uploadFailed': '头像上传失败，请稍后重试。',
      'profile.notFound': '找不到这个用户的公开资料。',
      'home.kicker': '欢迎来到我们的博客',
      'home.description': '技术实践、Cloudflare 部署和个人项目复盘。',
      'home.explore': '浏览全部文章',
      'home.subscribe': '订阅',
      'home.latest': '最新文章',
      'home.stories': '文章与技术记录',
      'home.collection': '整理网站建设、部署实践、AI 工具和个人项目复盘',
      'home.signal': '个人刊物',
      'home.heroTitleLead': '思绪在',
      'home.heroTitleMotion': '流动',
      'home.heroText': '收集持续发生的想法、观察与故事。',
      'home.articleCount': '篇文章',
      'home.categoryCount': '个分类',
      'home.ongoing': '持续更新',
      'home.topicCloud': 'Cloudflare 与 Web',
      'home.topicData': '数据与 AI 工作流',
      'home.topicReview': '项目与交易复盘',
      'home.featured': '最新一期',
      'home.featuredTitle': '最近写下的内容',
      'home.featuredText': '三篇新近发布的文章。',
      'home.viewAll': '查看全部文章',
      'archive.kicker': '文章归档',
      'archive.title': '全部文章',
      'archive.description': '按发布时间浏览技术实践、项目复盘和持续学习记录。',
      'about.heroKicker': '关于 ROWAN',
      'about.heroTitle': '把实践做成可交付的系统，也把过程写下来。',
      'about.heroText': '我持续打磨个人网站、Cloudflare 部署、AI 工作流与嵌入式项目复盘。',
      'about.authorSubtitle': '持续构建，也持续记录',
      'about.introTips': '你好，很高兴认识你',
      'about.introPrefix': '我是',
      'about.introText': '把实践做成可交付的系统，也把过程写下来。',
      'about.siteTips': '关于本站',
      'about.siteTitleOne': '记录',
      'about.siteTitleTwo': '技术、工作与',
      'about.keywordProjects': '项目',
      'about.keywordLearning': '学习',
      'about.keywordPractice': '实践',
      'about.keywordReviews': '复盘',
      'about.contactCta': '前往主站联系',
      'about.feedbackCta': '打开反馈系统',
      'about.focusKicker': '当前关注',
      'about.focusTitle': '当前关注',
      'about.focusCloud': 'Cloudflare 交付',
      'about.focusCloudText': '从域名、路由到发布，把站点做得稳定、直接。',
      'about.focusAi': 'AI 辅助工作流',
      'about.focusAiText': '把分析、整理和可用界面连接成完整流程。',
      'about.focusEmbedded': '嵌入式实践',
      'about.focusEmbeddedText': '把硬件、软件与测试问题整理成能读懂的复盘。',
      'about.skillsKicker': '工具箱',
      'about.skillsTitle': '技能栈',
      'about.skillsCreative': '开启创造力',
      'about.skillDeployment': '网站部署',
      'about.careerTips': '生涯',
      'about.careerTitle': '无限进步',
      'about.journeyKicker': '正在积累',
      'about.journeyTitle': '正在积累的方向',
      'about.journeyWeb': 'Web 系统与云端交付',
      'about.journeyWebText': '持续完善静态优先的站点结构、边缘路由和轻量数据能力。',
      'about.journeyDevice': '设备与网络现场实践',
      'about.journeyDeviceText': '关注设备、网络、部署和真实使用场景之间的连接。',
      'about.journeyEmbedded': '嵌入式项目复盘',
      'about.journeyEmbeddedText': '把需求、硬件、软件和调试过程写成清晰的项目记录。',
      'about.spacesKicker': '线上空间',
      'about.spacesTitle': '线上空间',
      'about.spaceMain': '个人主站',
      'about.spaceMainText': '项目、经历与联系入口',
      'about.spaceBlog': '博客系统',
      'about.spaceBlogText': '技术笔记与项目复盘',
      'about.spaceMail': '邮件系统',
      'about.spaceMailText': '独立的收发入口',
      'about.spaceLab': '技术实验室',
      'about.spaceLabText': '持续试验与学习记录',
      'about.nowKicker': '现在',
      'about.nowTitle': '让每一次实践留下可复用的记录。',
      'about.nowText': '现在，我继续完善个人网站，发布实现笔记，让项目复盘保持清晰，也通过实际实验持续学习。',
      'about.contactTips': '保持联系',
      'about.contactTitle': '有想法，可以从这里找到我。',
      'sidebar.profile': '技术、工作与生活记录',
      'sidebar.profileText': '记录 Cloudflare 实践、个人项目、交易复盘和持续学习。',
      'sidebar.articles': '文章',
      'sidebar.categoriesCount': '分类',
      'sidebar.categories': '文章分类',
      'sidebar.recent': '最近文章',
      'sidebar.feed': '订阅更新',
      'sidebar.toc': '文章目录',
      'sidebar.noToc': '本文暂无目录',
      'articles.loading': '正在加载文章...',
      'articles.emptyTitle': '暂无文章',
      'articles.emptyDescription': '精彩内容正在准备中，请稍后再来。',
      'articles.loadErrorTitle': '加载失败',
      'articles.loadErrorDescription': '文章暂时加载不了，请稍后重试。',
      'articles.tryAgain': '重试',
      'articles.readMore': '阅读全文',
      'articles.bookmark': '收藏文章',
      'articles.removeBookmark': '移除收藏',
      'articles.share': '分享文章',
      'articles.shareHint': '分享给需要的人',
      'a11y.blogSidebar': '博客侧栏',
      'a11y.publicationStats': '刊物统计',
      'a11y.articleSidebar': '文章辅助导航',
      'share.title': '分享文章',
      'share.copy': '复制',
      'share.copied': '链接已复制到剪贴板。',
      'bookmarks.kicker': '你的收藏',
      'bookmarks.title': '书签',
      'bookmarks.description': '你保存下来稍后阅读的文章',
      'bookmarks.emptyTitle': '暂无书签',
      'bookmarks.emptyDescription': '点击文章上的书签图标保存喜欢的内容，它们会出现在这里。',
      'bookmarks.browse': '浏览文章',
      'auth.kicker': '读者账号',
      'auth.title': '登录或创建普通用户账号',
      'auth.description': '普通账号用于保存阅读身份和后续互动功能。管理后台不在前台导航展示，只能通过独立地址访问。',
      'auth.loginTab': '登录',
      'auth.registerTab': '注册',
      'auth.email': '邮箱',
      'auth.password': '密码',
      'auth.name': '昵称',
      'auth.loginSubmit': '登录',
      'auth.registerSubmit': '创建账号',
      'auth.processing': '处理中...',
      'auth.failed': '操作失败。',
      'auth.loggedIn': '已登录。',
      'auth.alreadyLoggedIn': '你已经登录。',
      'auth.loggedOut': '已退出登录。',
      'publish.kicker': '投稿中心',
      'publish.title': '发布文章',
      'publish.description': '保存草稿后提交审核，审核期间内容将锁定。',
      'publish.articleTitle': '标题',
      'publish.category': '分类',
      'publish.excerpt': '摘要',
      'publish.excerptPlaceholder': '留空时将根据正文自动生成',
      'publish.cover': '封面图片',
      'publish.coverHint': '选择已上传图片，或上传一张新封面',
      'publish.coverSelect': '选择封面图片',
      'publish.noCover': '不设置封面',
      'publish.coverPreview': '封面预览',
      'publish.edit': '编辑',
      'publish.preview': '预览',
      'publish.previewEmpty': '正文预览将在这里显示。',
      'publish.images': '文章图片',
      'publish.coverUpload': '上传封面',
      'publish.imageRules': '最多 5 张，每张不超过 5 MB。',
      'publish.upload': '上传图片',
      'publish.content': '正文',
      'publish.contentPlaceholder': '使用 Markdown 编写正文',
      'publish.unsaved': '尚未保存',
      'publish.save': '保存草稿',
      'publish.submit': '提交审核',
      'myArticles.kicker': '创作记录',
      'myArticles.title': '我的文章',
      'myArticles.loading': '正在加载文章...',
      'myArticles.draft': '草稿',
      'myArticles.pending': '待审核',
      'myArticles.published': '已发布',
      'myArticles.rejected': '未通过',
      'myArticles.continue': '继续编辑',
      'myArticles.delete': '删除草稿',
      'myArticles.deleting': '正在删除...',
      'myArticles.deleted': '草稿已删除，剩余 {count} 篇草稿。',
      'myArticles.deleteConfirm': '确定删除这篇草稿吗？删除后无法恢复。',
      'myArticles.deleteFailed': '删除草稿失败，请稍后重试。',
      'myArticles.viewSubmission': '查看投稿',
      'myArticles.viewPublished': '查看已发布文章',
      'myArticles.empty': '这个分类下还没有文章。',
      'myArticles.untitled': '未命名文章',
      'myArticles.updated': '更新于',
      'comments.kicker': '评论',
      'comments.title': '评论',
      'comments.loading': '正在加载评论...',
      'comments.unavailable': '评论暂时不可用。',
      'comments.emptyTitle': '暂无评论',
      'comments.emptyDescription': '来留下第一条评论。',
      'comments.name': '昵称',
      'comments.email': '邮箱',
      'comments.content': '评论内容',
      'comments.note': '评论提交后会立即公开显示。',
      'comments.submit': '提交评论',
      'comments.submitting': '正在提交评论...',
      'comments.published': '评论已发布。',
      'comments.submitFailed': '无法提交评论。',
      'comments.loadFailed': '无法加载评论。',
      'comments.anonymous': '匿名',
      'comments.reply': '回复',
      'comments.replyTo': '回复 {name}',
      'comments.replyingTo': '正在回复',
      'comments.cancelReply': '取消回复',
      'articleActions.comments': '查看评论',
      'articleActions.top': '返回顶部',
      'search.kicker': '搜索笔记',
      'search.open': '搜索文章',
      'search.title': '搜索文章',
      'search.close': '关闭搜索',
      'search.move': '移动搜索窗口',
      'search.placeholder': '搜索标题、分类或正文关键词',
      'search.initialTitle': '从想法中寻找线索',
      'search.initialText': '标题、摘要、分类和正文都可以搜索。',
      'notifications.open': '我的消息',
      'notifications.kicker': '我的消息',
      'notifications.title': '我的消息',
      'notifications.subtitle': '评论回复、审核结果和客服消息都会出现在这里。',
      'notifications.readAll': '全部已读',
      'notifications.loading': '正在加载消息...',
      'notifications.loadMore': '加载更多',
      'notifications.emptyTitle': '暂无消息',
      'notifications.emptyText': '新的互动和审核结果会显示在这里。',
      'notifications.error': '消息加载失败，请稍后重试。',
      'notifications.retry': '重新加载',
      'notifications.unreadSummary': '你有 {count} 条未读消息',
      'notifications.allRead': '所有消息都已读',
      'notifications.markedAll': '已将全部消息标记为已读。',
      'notifications.commentReplyTitle': '{actor} 回复了你的评论',
      'notifications.commentReplyText': '来自《{article}》',
      'notifications.articleCommentTitle': '{actor} 评论了你的文章',
      'notifications.articleCommentText': '《{article}》收到了一条新评论',
      'notifications.approvedTitle': '你的投稿已审核通过',
      'notifications.approvedText': '《{article}》已经发布',
      'notifications.rejectedTitle': '你的投稿未通过审核',
      'notifications.rejectedText': '《{article}》可以在“我的文章”中查看',
      'notifications.customerTitle': '在线客服回复了你',
      'notifications.customerText': '点击继续查看客服会话'
    },
    en: {
      'nav.home': 'Home',
      'nav.favorites': 'Favorites',
      'nav.rss': 'RSS',
      'nav.about': 'About',
      'nav.login': 'Sign in / Register',
      'nav.logout': 'Sign out',
      'nav.account': 'My account',
      'nav.publish': 'Publish article',
      'nav.myArticles': 'My articles',
      'nav.notifications': 'My messages',
      'nav.myFavorites': 'My favorites',
      'nav.adminHome': 'Admin home',
      'nav.adminLogout': 'Sign out of admin',
      'nav.backHome': 'Back to Home',
      'nav.bookmarks': 'Bookmarks',
      'profile.kicker': 'PROFILE',
      'profile.accountTitle': 'My account',
      'profile.publicKicker': 'AUTHOR',
      'profile.publicTitle': 'Public profile',
      'profile.edit': 'Edit profile',
      'profile.uploadAvatar': 'Upload avatar',
      'profile.avatarHint': 'JPG, PNG or WebP, up to 5 MB',
      'profile.noAvatar': 'No avatar uploaded',
      'profile.noBio': 'No bio yet',
      'profile.displayName': 'Display name',
      'profile.email': 'Email',
      'profile.bio': 'Bio',
      'profile.publishedArticles': 'Published articles',
      'profile.joined': 'Joined',
      'profile.cancel': 'Cancel',
      'profile.save': 'Save profile',
      'profile.saving': 'Saving...',
      'profile.saved': 'Profile saved',
      'profile.loading': 'Loading profile...',
      'profile.loadFailed': 'Profile is unavailable. Please try again.',
      'profile.saveFailed': 'Could not save. Please try again.',
      'profile.nameRequired': 'Enter a display name.',
      'profile.avatarInvalid': 'Choose a JPG, PNG or WebP image.',
      'profile.avatarTooLarge': 'Avatar must be 5 MB or smaller.',
      'profile.uploading': 'Uploading avatar...',
      'profile.uploadFailed': 'Could not upload the avatar. Please try again.',
      'profile.notFound': 'This public profile could not be found.',
      'home.kicker': 'Welcome to our blog',
      'home.description': 'Technical practice, Cloudflare deployments, and personal project retrospectives.',
      'home.explore': 'Read all stories',
      'home.subscribe': 'Subscribe',
      'home.latest': 'Latest Posts',
      'home.stories': 'Discover Our Stories',
      'home.collection': 'Explore our collection of articles, insights, and ideas that inspire',
      'home.signal': 'A PERSONAL PUBLICATION',
      'home.heroTitleLead': 'ideas in',
      'home.heroTitleMotion': 'motion',
      'home.heroText': 'A collection of thoughts, observations, and stories in motion.',
      'home.articleCount': 'articles',
      'home.categoryCount': 'categories',
      'home.ongoing': 'always evolving',
      'home.topicCloud': 'Cloudflare and Web',
      'home.topicData': 'Data and AI workflows',
      'home.topicReview': 'Project and trading reviews',
      'home.featured': 'LATEST ISSUE',
      'home.featuredTitle': 'Recently written',
      'home.featuredText': 'Three newly published stories.',
      'home.viewAll': 'View all articles',
      'archive.kicker': 'ARTICLE ARCHIVE',
      'archive.title': 'All Articles',
      'archive.description': 'Browse technical practice, project reviews, and continuous learning notes by publication date.',
      'about.heroKicker': 'ABOUT ROWAN',
      'about.heroTitle': 'Building practical systems and documenting the work.',
      'about.heroText': 'I keep improving a personal web system through Cloudflare delivery, AI workflows, and embedded-project reviews.',
      'about.authorSubtitle': 'Keep building. Keep documenting.',
      'about.introTips': 'Hello, glad to meet you',
      'about.introPrefix': 'I am',
      'about.introText': 'Building practical systems and documenting the work.',
      'about.siteTips': 'About this site',
      'about.siteTitleOne': 'Notes on',
      'about.siteTitleTwo': 'technology, work, and',
      'about.keywordProjects': 'projects',
      'about.keywordLearning': 'learning',
      'about.keywordPractice': 'practice',
      'about.keywordReviews': 'reviews',
      'about.contactCta': 'Contact on the main site',
      'about.feedbackCta': 'Open feedback',
      'about.focusKicker': 'CURRENT FOCUS',
      'about.focusTitle': 'What I focus on',
      'about.focusCloud': 'Cloudflare delivery',
      'about.focusCloudText': 'From domains and routes to releases, making sites stable and direct.',
      'about.focusAi': 'AI-assisted workflows',
      'about.focusAiText': 'Connecting analysis, organization, and usable interfaces into one flow.',
      'about.focusEmbedded': 'Embedded practice',
      'about.focusEmbeddedText': 'Turning hardware, software, and testing questions into readable reviews.',
      'about.skillsKicker': 'TOOLBOX',
      'about.skillsTitle': 'Skills',
      'about.skillsCreative': 'Unlock creativity',
      'about.skillDeployment': 'Web Deployment',
      'about.careerTips': 'DIRECTION',
      'about.careerTitle': 'Continuous progress',
      'about.journeyKicker': 'WORK IN PROGRESS',
      'about.journeyTitle': 'Directions I am building toward',
      'about.journeyWeb': 'Web systems and cloud delivery',
      'about.journeyWebText': 'Improving static-first site structures, edge routing, and lightweight data capabilities.',
      'about.journeyDevice': 'Device and network field practice',
      'about.journeyDeviceText': 'Connecting devices, networks, deployment, and real usage scenarios.',
      'about.journeyEmbedded': 'Embedded project reviews',
      'about.journeyEmbeddedText': 'Writing requirements, hardware, software, and debugging into clear project records.',
      'about.spacesKicker': 'DIGITAL SPACES',
      'about.spacesTitle': 'Digital spaces',
      'about.spaceMain': 'Main site',
      'about.spaceMainText': 'Projects, experience, and contact entry points',
      'about.spaceBlog': 'Blog system',
      'about.spaceBlogText': 'Technical notes and project reviews',
      'about.spaceMail': 'Mail system',
      'about.spaceMailText': 'An independent mail entry point',
      'about.spaceLab': 'Technical lab',
      'about.spaceLabText': 'Experiments and learning notes',
      'about.nowKicker': 'NOW',
      'about.nowTitle': 'Let each practice leave a reusable record.',
      'about.nowText': 'I am continuing to improve the personal web system, publish implementation notes, keep project reviews readable, and learn through hands-on experiments.',
      'about.contactTips': 'STAY IN TOUCH',
      'about.contactTitle': 'Have an idea? This is where you can reach me.',
      'sidebar.profile': 'Technology, work, and life notes',
      'sidebar.profileText': 'Cloudflare practice, personal projects, trading reviews, and continuous learning.',
      'sidebar.articles': 'Articles',
      'sidebar.categoriesCount': 'Topics',
      'sidebar.categories': 'Categories',
      'sidebar.recent': 'Recent Posts',
      'sidebar.feed': 'Subscribe',
      'sidebar.toc': 'On This Page',
      'sidebar.noToc': 'No sections in this article',
      'articles.loading': 'Loading articles...',
      'articles.emptyTitle': 'No Articles Yet',
      'articles.emptyDescription': "We're working on bringing you useful content. Check back soon.",
      'articles.loadErrorTitle': 'Oops! Something went wrong',
      'articles.loadErrorDescription': "We couldn't load the articles. Please try again.",
      'articles.tryAgain': 'Try Again',
      'articles.readMore': 'Read More',
      'articles.bookmark': 'Bookmark article',
      'articles.removeBookmark': 'Remove bookmark',
      'articles.share': 'Share article',
      'articles.shareHint': 'Share with someone who may find it useful',
      'a11y.blogSidebar': 'Blog sidebar',
      'a11y.publicationStats': 'Publication statistics',
      'a11y.articleSidebar': 'Article navigation',
      'share.title': 'Share Article',
      'share.copy': 'Copy',
      'share.copied': 'Link copied to clipboard.',
      'bookmarks.kicker': 'Your Collection',
      'bookmarks.title': 'Bookmarks',
      'bookmarks.description': "Articles you've saved for later reading",
      'bookmarks.emptyTitle': 'No Bookmarks Yet',
      'bookmarks.emptyDescription': "Save articles you love by clicking the bookmark icon. They'll appear here.",
      'bookmarks.browse': 'Browse Articles',
      'auth.kicker': 'Reader Account',
      'auth.title': 'Sign in or create a reader account',
      'auth.description': 'Reader accounts save your reading identity and future interaction features. The admin console stays off the public navigation and is only available at its separate address.',
      'auth.loginTab': 'Sign in',
      'auth.registerTab': 'Register',
      'auth.email': 'Email',
      'auth.password': 'Password',
      'auth.name': 'Display name',
      'auth.loginSubmit': 'Sign in',
      'auth.registerSubmit': 'Create account',
      'auth.processing': 'Processing...',
      'auth.failed': 'Operation failed.',
      'auth.loggedIn': 'Signed in.',
      'auth.alreadyLoggedIn': 'You are already signed in.',
      'auth.loggedOut': 'Signed out.',
      'publish.kicker': 'Contributor Studio',
      'publish.title': 'Publish an article',
      'publish.description': 'Save your draft, then submit it for review. Pending articles are locked.',
      'publish.articleTitle': 'Title',
      'publish.category': 'Category',
      'publish.excerpt': 'Excerpt',
      'publish.excerptPlaceholder': 'Leave blank to generate it from the article text',
      'publish.cover': 'Cover image',
      'publish.coverHint': 'Choose an uploaded image or upload a new cover',
      'publish.coverSelect': 'Choose a cover image',
      'publish.noCover': 'No cover',
      'publish.coverPreview': 'Cover preview',
      'publish.edit': 'Edit',
      'publish.preview': 'Preview',
      'publish.previewEmpty': 'Your article preview will appear here.',
      'publish.images': 'Article images',
      'publish.coverUpload': 'Upload cover',
      'publish.imageRules': 'Up to 5 images, no more than 5 MB each.',
      'publish.upload': 'Upload image',
      'publish.content': 'Article text',
      'publish.contentPlaceholder': 'Write the article in Markdown',
      'publish.unsaved': 'Not saved yet',
      'publish.save': 'Save draft',
      'publish.submit': 'Submit for review',
      'myArticles.kicker': 'Writing history',
      'myArticles.title': 'My articles',
      'myArticles.loading': 'Loading articles...',
      'myArticles.draft': 'Drafts',
      'myArticles.pending': 'Pending review',
      'myArticles.published': 'Published',
      'myArticles.rejected': 'Rejected',
      'myArticles.continue': 'Continue editing',
      'myArticles.delete': 'Delete draft',
      'myArticles.deleting': 'Deleting...',
      'myArticles.deleted': 'Draft deleted. {count} drafts remaining.',
      'myArticles.deleteConfirm': 'Delete this draft? This action cannot be undone.',
      'myArticles.deleteFailed': 'Could not delete the draft. Please try again.',
      'myArticles.viewSubmission': 'View submission',
      'myArticles.viewPublished': 'View published article',
      'myArticles.empty': 'There are no articles in this group yet.',
      'myArticles.untitled': 'Untitled article',
      'myArticles.updated': 'Updated',
      'comments.kicker': 'Comments',
      'comments.title': 'Comments',
      'comments.loading': 'Loading comments...',
      'comments.unavailable': 'Comments are temporarily unavailable.',
      'comments.emptyTitle': 'No comments yet',
      'comments.emptyDescription': 'Be the first to leave a comment.',
      'comments.name': 'Name',
      'comments.email': 'Email',
      'comments.content': 'Comment',
      'comments.note': 'Comments appear publicly after submission.',
      'comments.submit': 'Post comment',
      'comments.submitting': 'Posting comment...',
      'comments.published': 'Comment published.',
      'comments.submitFailed': 'Unable to post comment.',
      'comments.loadFailed': 'Unable to load comments.',
      'comments.anonymous': 'Anonymous',
      'comments.reply': 'Reply',
      'comments.replyTo': 'Reply to {name}',
      'comments.replyingTo': 'Replying to',
      'comments.cancelReply': 'Cancel',
      'articleActions.comments': 'View comments',
      'articleActions.top': 'Back to top',
      'search.kicker': 'SEARCH NOTES',
      'search.open': 'Search articles',
      'search.title': 'Search articles',
      'search.close': 'Close search',
      'search.move': 'Move search window',
      'search.placeholder': 'Search titles, categories, or article text',
      'search.initialTitle': 'Find a thread in your notes',
      'search.initialText': 'Search across titles, summaries, categories, and article text.',
      'notifications.open': 'My messages',
      'notifications.kicker': 'MY MESSAGES',
      'notifications.title': 'Your notifications',
      'notifications.subtitle': 'Comment replies, review results, and customer-service messages appear here.',
      'notifications.readAll': 'Mark all as read',
      'notifications.loading': 'Loading notifications...',
      'notifications.loadMore': 'Load more',
      'notifications.emptyTitle': 'No notifications yet',
      'notifications.emptyText': 'New interactions and review results will appear here.',
      'notifications.error': 'Notifications could not be loaded. Please try again.',
      'notifications.retry': 'Try again',
      'notifications.unreadSummary': 'You have {count} unread notifications',
      'notifications.allRead': 'You are all caught up',
      'notifications.markedAll': 'All notifications have been marked as read.',
      'notifications.commentReplyTitle': '{actor} replied to your comment',
      'notifications.commentReplyText': 'From “{article}”',
      'notifications.articleCommentTitle': '{actor} commented on your article',
      'notifications.articleCommentText': '“{article}” received a new comment',
      'notifications.approvedTitle': 'Your submission was approved',
      'notifications.approvedText': '“{article}” is now published',
      'notifications.rejectedTitle': 'Your submission was not approved',
      'notifications.rejectedText': 'Review “{article}” under My articles',
      'notifications.customerTitle': 'Customer service replied',
      'notifications.customerText': 'Open the conversation to continue'
    }
  };

  var articleTranslations = {
    'apple-id-us-guide-2026': {
      title: '2026 Guide: Create a US Apple Account in 3 Minutes and Manage Multiple Regions',
      excerpt: 'A complete mobile and desktop workflow for creating a US Apple Account on Apple\'s official website, switching App Store regions, and keeping regional accounts organized.',
      label: 'Practical Guide',
      img: '',
      contentHtml: '<blockquote><p>Original author: <strong>Soranlan</strong> · <a href="https://x.com/i/article/2070702483270504883">View the original article</a></p></blockquote><blockquote><p>Note: Apple Account requirements may change by time and region. Always follow the current instructions shown on Apple\'s official pages.</p></blockquote><p>Creating a US Apple Account is easier than it may sound. You do not necessarily need a US credit card or phone number. The most reliable approach is to register directly through Apple\'s official account website, on either a phone or computer.</p><h2>1. Create a US Apple Account on Apple\'s Website</h2><figure class="article-figure"><img src="/assets/articles/apple-id-us-guide/img-002-HLySNl7aMAAFDl6.webp" alt="Apple Account registration overview" loading="lazy"></figure><p>For long-term stability, begin with Apple\'s official registration page instead of third-party shortcuts.</p><h3>What You Need</h3><ul><li>No US credit card is required during registration.</li><li>A non-US phone number can receive the verification code.</li><li>You can complete the process on a phone or computer.</li></ul><h3>Steps</h3><ol><li>Open <a href="https://account.apple.com">account.apple.com</a> in your browser.</li></ol><figure class="article-figure"><img src="/assets/articles/apple-id-us-guide/img-003-HLyShqYasAAkVHQ.webp" alt="Open the Apple Account website" loading="lazy"></figure><ol start="2"><li>Select <strong>Create Your Apple Account</strong>.</li></ol><figure class="article-figure"><img src="/assets/articles/apple-id-us-guide/img-004-HLySu3laAAAC2iP.webp" alt="Create an Apple Account" loading="lazy"></figure><ol start="3"><li>Set the country or region to <strong>United States</strong>.</li></ol><figure class="article-figure"><img src="/assets/articles/apple-id-us-guide/img-005-HLyTCEwaQAA3fhX.webp" alt="Select United States as the region" loading="lazy"></figure><ol start="4"><li>Enter your name, an unused email address, and a phone number that can receive verification codes. A Chinese number with the +86 prefix can be used when Apple accepts it on the form.</li></ol><figure class="article-figure"><img src="/assets/articles/apple-id-us-guide/img-006-HLyUOhcagAAWOTa.webp" alt="Complete the account information" loading="lazy"></figure><figure class="article-figure"><img src="/assets/articles/apple-id-us-guide/img-007-HLyT_iObAAACnIb.webp" alt="Verify the account information" loading="lazy"></figure><ol start="5"><li>Create a password and complete Apple\'s verification steps.</li></ol><h2>2. Use the US Account in the App Store</h2><figure class="article-figure"><img src="/assets/articles/apple-id-us-guide/img-008-HLyWBTFaMAA4_JP.webp" alt="App Store account screen" loading="lazy"></figure><ol><li>Open the App Store on your iPhone.</li></ol><figure class="article-figure"><img src="/assets/articles/apple-id-us-guide/img-009-HLyWvqPbUAA7I7H.webp" alt="Open the App Store" loading="lazy"></figure><ol start="2"><li>Tap your profile picture in the upper-right corner.</li></ol><figure class="article-figure"><img src="/assets/articles/apple-id-us-guide/img-010-HLyYjqVaAAAX_Sn.webp" alt="Open the App Store profile" loading="lazy"></figure><ol start="3"><li>Scroll down and sign out.</li></ol><figure class="article-figure"><img src="/assets/articles/apple-id-us-guide/img-011-HLyZDWna8AAQvAA.webp" alt="Sign out of the App Store" loading="lazy"></figure><ol start="4"><li>Sign in with the US Apple Account.</li><li>After a successful login, the App Store switches to the US storefront.</li></ol><h2>3. Keep Accounts from Multiple Regions on One iPhone</h2><figure class="article-figure"><img src="/assets/articles/apple-id-us-guide/img-012-HLyZJ9ebsAAVfVD.webp" alt="Multiple Apple Accounts on one iPhone" loading="lazy"></figure><p>A practical setup is to keep your primary account signed in to iCloud for photos, contacts, notes, and backups, while using regional accounts only for Media &amp; Purchases in the App Store.</p><h3>Optional Account Setup</h3><ol><li>Open <strong>Settings</strong>.</li></ol><figure class="article-figure"><img src="/assets/articles/apple-id-us-guide/img-013-HLyaAG7aEAAJ6Sc.webp" alt="Open iPhone Settings" loading="lazy"></figure><ol start="2"><li>Search for Mail, Notes, or Contacts.</li></ol><figure class="article-figure"><img src="/assets/articles/apple-id-us-guide/img-014-HLya0QGasAAXEva.webp" alt="Search for account settings" loading="lazy"></figure><ol start="3"><li>Open the related account settings.</li></ol><figure class="article-figure"><img src="/assets/articles/apple-id-us-guide/img-015-HLybLWQa0AAh0OE.webp" alt="Open account settings" loading="lazy"></figure><ol start="4"><li>Select <strong>Accounts</strong>, then <strong>Add Account</strong>.</li></ol><figure class="article-figure"><img src="/assets/articles/apple-id-us-guide/img-016-HLycCwNbEAAsLfH.webp" alt="Add an account" loading="lazy"></figure><ol start="5"><li>Select <strong>iCloud</strong>.</li></ol><figure class="article-figure"><img src="/assets/articles/apple-id-us-guide/img-017-HLycQw4aEAAtvQs.webp" alt="Select iCloud" loading="lazy"></figure><ol start="6"><li>Enter the Apple Account for the other region.</li></ol><figure class="article-figure"><img src="/assets/articles/apple-id-us-guide/img-018-HLycZE6bEAAo.webp" alt="Sign in with another regional account" loading="lazy"></figure><ol start="7"><li>After signing in, disable Photos, Contacts, iCloud Drive, and any other synchronization options you do not need.</li></ol><h3>Important Precautions</h3><ul><li>Only add accounts that you own.</li><li>Do not enable synchronization unless you need it.</li><li>Keep personal data separated between accounts.</li></ul><h2>4. A Stable Long-Term Setup</h2><ul><li><strong>Primary iCloud account:</strong> keep it signed in for photos, contacts, backups, and iCloud Drive.</li><li><strong>App Store account:</strong> use the US account for US-only apps and switch temporarily when another region is required.</li></ul><h2>5. Summary</h2><figure class="article-figure"><img src="/assets/articles/apple-id-us-guide/img-019-HLycs8nbYAAVGJe.webp" alt="US Apple Account workflow summary" loading="lazy"></figure><ol><li>Register at account.apple.com.</li><li>Choose United States as the region and provide a phone number accepted by Apple.</li><li>Switch the App Store account when you need apps from another region.</li></ol><p>This arrangement keeps iCloud data on the primary account while making regional App Store downloads easier to manage.</p>'
    },
    'okx-swap-crv-zk-review': {
      title: 'A Crypto Trading Review from My OKX Swap History',
      excerpt: 'A review based on OKX live swap archive fills: one small ZK win, one larger CRV drawdown, and what they say about sizing, timing, and exit discipline.',
      contentHtml: '<h2>A Crypto Trading Review from My OKX Swap History</h2><p>This article is not a trading tutorial, and it is not a polished success story. It is a review of real OKX live swap archive fills. The record shows two main instruments: ZK-USDT-SWAP and CRV-USDT-SWAP.</p><p>The recent normal fill list was empty, futures fills were empty, and there were no open swap positions at the time of checking. The meaningful data came from archived perpetual swap fills.</p><figure class="article-figure"><img src="/assets/articles/okx-swap-bill-summary.svg" alt="OKX swap bill summary" loading="lazy"><figcaption>Sanitized bill summary: instrument, time window, average prices, and realized result only. No order IDs, account details, or API information are shown.</figcaption></figure><h3>The Coins in This Record</h3><p><strong>ZK-USDT-SWAP</strong>: opened and closed a long position on May 10, 2026. The total filled size was 53 contracts. Realized P&amp;L was about +0.1484 USDT, or about +0.1414 USDT after fees.</p><p><strong>CRV-USDT-SWAP</strong>: opened a long position starting on May 14, 2026, then exited in batches from May 15 to May 18. The total filled size was 2785 contracts. Realized P&amp;L was about -75.5772 USDT, or about -76.2718 USDT after fees.</p><h3>ZK: A Small, Controlled Test</h3><p>The ZK trade was short and light. The average buy price was around 0.01866, and the average sell price was around 0.01894. The result was only a small gain, but the important part is that the trade stayed controlled.</p><p>For me, this is the healthier kind of test: the idea was small, the exposure was limited, and the exit did not turn into a long negotiation with the market.</p><figure class="article-figure"><img src="/assets/articles/zk-swap-kline-review.svg" alt="ZK swap K-line review" loading="lazy"><figcaption>ZK 1H review: entered and exited on the same day. The profit was small, but the trade path was clean.</figcaption></figure><p>The chart reminds me that a small test is not about the amount earned. It is about whether the action was clean and whether the exit followed the plan.</p><h3>CRV: The Hard Part Was Exiting</h3><p>The CRV record is more useful to review. I entered around 0.2716 on May 14. The trade did not move as expected. I sold part of the position near 0.2612 on May 15, more near 0.2387 on May 16, and the rest around 0.2345, 0.2346, and 0.2242 on May 18.</p><p>The fee was not the main issue. Total fees were below 1 USDT. The loss came from the price path: buying near 0.2716 and exiting around an average sell price of 0.2445. The result was determined by exit discipline, not by fees.</p><figure class="article-figure"><img src="/assets/articles/crv-swap-kline-review.svg" alt="CRV swap K-line review" loading="lazy"><figcaption>CRV 1H review: after entry, price failed to continue as expected. Batch exits stretched the loss instead of containing it.</figcaption></figure><p>This chart is more direct than the bill summary. Price briefly fluctuated after entry, but the center of gravity kept moving lower. Without a predefined invalidation level, batch exits became a reaction rather than a plan.</p><h3>What This Tells Me</h3><p>First, a contract trade cannot rely only on the idea that a coin is interesting. CRV may have narrative and volatility, but a leveraged position lives inside price movement, not narrative.</p><p>Second, splitting orders is not the same as managing risk. If there is no clear invalidation point, splitting simply stretches one bad trade across several fills.</p><p>Third, small wins and larger losses have to be reviewed together. ZK made about 0.14 USDT after fees, while CRV lost about 76.27 USDT after fees. That ratio is the real lesson.</p><h3>What I Would Change Next</h3><p>If I keep trading swaps, I need stricter rules before entering: whether the trade is short-term or swing, why the setup is valid, where the idea is invalidated, the maximum acceptable loss, and how the exit should happen.</p><p>This is not financial advice. It is a personal trading review. The useful part is not the profit screenshot. The useful part is whether a loss can be written clearly enough to make the next decision cleaner.</p>'
    },
    'cloudflare-blog-start': {
      title: 'From the Main Site to a Cloudflare Blog Experiment',
      excerpt: 'The first article in this blog system. It runs on Cloudflare Workers, stores the article index and body in KV, and is built for technical notes, deployment logs, and project retrospectives.',
      contentHtml: '<h2>From the Main Site to a Cloudflare Blog Experiment</h2><p>This is the first article in the blog system. It runs on Cloudflare Workers, with the article index and content stored in KV. That makes it a lightweight place for technical practice, deployment notes, and project retrospectives.</p><p>The main site stays static-first for speed and stability, while the blog carries longer-form notes that can be updated independently.</p>'
    },
    'cloudflare-workers-deploy': {
      title: 'Cloudflare Workers Static Site Deployment Guide',
      excerpt: 'A practical guide to deploying a static website with Cloudflare Workers and Assets, including custom domains, cache strategy, and CI/CD integration.',
      contentHtml: '<h2>Cloudflare Workers Static Site Deployment Guide</h2><p>This guide records how to deploy a static site with Cloudflare Workers and Assets. The core path is simple: keep static files in the assets directory, bind them in Wrangler, and let the Worker handle routing and fallback behavior.</p><p>For production use, the important pieces are a stable custom domain, explicit routes, cache-busting asset versions, and a repeatable deployment command.</p>'
    },
    'd1-feedback-system': {
      title: 'D1 Practice: Feedback and Comment System',
      excerpt: 'A lightweight feedback and comment system built on Cloudflare D1, covering table design, API design, and anti-spam handling.',
      contentHtml: '<h2>D1 Practice: Feedback and Comment System</h2><p>This article explains how Cloudflare D1 can support feedback and comments for a small personal site. D1 is a good fit when the data needs to be structured, queryable, and persistent without running a separate database server.</p><p>The system separates public comment submission from admin review, keeps the public API small, and leaves room for spam filtering and moderation.</p>'
    },
    'personal-site-cloudflare-workers': {
      title: 'Deploying a Personal Showcase Site to Cloudflare Workers',
      excerpt: 'A record of the full launch path from static pages and entrance animations to custom domains and Worker routing, with a static-first design for the main site.',
      contentHtml: '<h2>Deploying a Personal Showcase Site to Cloudflare Workers</h2><p>This article documents the process of moving a personal showcase site onto Cloudflare Workers. The main site is designed around static-first pages, fast routing, and clean public navigation.</p><p>Workers handles routing and deployment, while the richer systems such as blog posts, feedback, and admin workflows live behind separate entry points.</p>'
    },
    'd1-feedback-interview-job-match': {
      title: 'Using D1 for Feedback, Interview Invites, and Match Records',
      excerpt: 'Feedback, interview invitations, and job-match reports need durable storage, so D1 becomes the data loop while articles, portfolio pages, and resumes stay static-first.',
      contentHtml: '<h2>Using D1 for Feedback, Interview Invites, and Match Records</h2><p>Feedback, interview invitations, and job-match reports all need durable storage. D1 provides a compact data layer for these records while the public content remains static-first.</p><p>This split keeps the site fast for visitors and gives the admin side a reliable place to review, filter, and follow up on structured records.</p>'
    },
    'ai-job-matcher-product-loop': {
      title: 'The Product Path for an AI Job Matcher',
      excerpt: 'From pasting a job description to generating a match matrix, saving the report, and reviewing it in the admin console, this turns one AI analysis into a small product loop.',
      contentHtml: '<h2>The Product Path for an AI Job Matcher</h2><p>The AI job matcher starts with a simple workflow: paste a job description, analyze fit, generate a match matrix, and save the report for review.</p><p>Turning that workflow into a product means adding persistence, admin review, status tracking, and a clear loop from input to decision.</p>'
    },
    'embedded-project-review': {
      title: 'Turning Embedded Projects into Readable Retrospectives',
      excerpt: 'A project-writing approach for STM32 access control and quadruped robot work, covering requirements, hardware, software, testing issues, and final outcomes.',
      contentHtml: '<h2>Turning Embedded Projects into Readable Retrospectives</h2><p>Embedded projects are easier to understand when they are written as structured retrospectives. Instead of only listing hardware and code, the article should explain the requirement, design choices, test issues, and final result.</p><p>This format works well for STM32 access control projects, robot projects, and other systems where hardware, firmware, and debugging all matter.</p>'
    }
  };

  function getStoredLanguage() {
    try { return localStorage.getItem(LANGUAGE_KEY); } catch { return null; }
  }

  function setStoredLanguage(language) {
    try { localStorage.setItem(LANGUAGE_KEY, language); } catch { /* noop */ }
  }

  function t(key) {
    return (translations[currentLanguage] && translations[currentLanguage][key]) ||
      (translations.zh && translations.zh[key]) ||
      key;
  }

  function getArticleTranslation(permalink) {
    return currentLanguage === 'en' ? articleTranslations[permalink] : null;
  }

  function getLocalizedArticle(article) {
    var localized = getArticleTranslation(article && article.permalink);
    if (!localized) return article;
    return Object.assign({}, article, {
      title: localized.title || article.title,
      excerpt: localized.excerpt || article.excerpt,
      label: localized.label || article.label,
      img: Object.prototype.hasOwnProperty.call(localized, 'img') ? localized.img : article.img
    });
  }

  function applyCurrentArticleTranslation() {
    var match = window.location.pathname.match(/^\/article\/([^/?#]+)/);
    if (!match) return;
    var permalink = decodeURIComponent(match[1]);
    var localized = getArticleTranslation(permalink);
    var title = document.querySelector('article h1');
    var content = document.querySelector('[data-article-content]');
    var category = document.querySelector('[data-article-category]');
    var publishedDate = document.querySelector('[data-article-published-date]');
    if (!title || !content) return;
    if (!title.getAttribute('data-original-title')) title.setAttribute('data-original-title', title.textContent);
    if (!content.getAttribute('data-original-html')) content.setAttribute('data-original-html', content.innerHTML);
    if (!document.body.getAttribute('data-original-page-title')) document.body.setAttribute('data-original-page-title', document.title);
    if (localized) {
      title.textContent = localized.title;
      content.innerHTML = localized.contentHtml || '<p>' + escapeHtml(localized.excerpt || '') + '</p>';
      document.title = localized.title + ' - Rowan Notes';
    } else {
      title.textContent = title.getAttribute('data-original-title') || title.textContent;
      content.innerHTML = content.getAttribute('data-original-html') || content.innerHTML;
      document.title = document.body.getAttribute('data-original-page-title') || document.title;
    }
    if (category) {
      category.textContent = localized && localized.label
        ? localized.label
        : (category.getAttribute('data-original-category') || category.textContent);
    }
    if (publishedDate) {
      var dateText = publishedDate.querySelector('span');
      var dateValue = publishedDate.getAttribute('datetime');
      var parsedDate = dateValue ? new Date(dateValue) : null;
      if (dateText && parsedDate && !Number.isNaN(parsedDate.getTime())) {
        dateText.textContent = parsedDate.toLocaleDateString(currentLanguage === 'en' ? 'en-US' : 'zh-CN', {
          year: 'numeric', month: 'long', day: 'numeric'
        });
      }
    }
  }

  function applySidebarTranslations() {
    document.querySelectorAll('[data-sidebar-article-permalink]').forEach(function (link) {
      var title = link.querySelector('span');
      if (!title) return;
      if (!title.dataset.originalTitle) title.dataset.originalTitle = title.textContent;
      var localized = getArticleTranslation(link.getAttribute('data-sidebar-article-permalink'));
      title.textContent = localized && localized.title ? localized.title : title.dataset.originalTitle;
    });
  }

  function normalizeArticleLayout(layout) {
    return ARTICLE_LAYOUT_MODES.indexOf(layout) >= 0 ? layout : 'double';
  }

  function getStoredArticleLayout() {
    try { return normalizeArticleLayout(localStorage.getItem(ARTICLE_LAYOUT_KEY)); } catch { return 'double'; }
  }

  function setStoredArticleLayout(layout) {
    try { localStorage.setItem(ARTICLE_LAYOUT_KEY, layout); } catch { /* noop */ }
  }

  function updateArticleLayoutControl() {
    var current = normalizeArticleLayout(document.body.getAttribute('data-article-layout'));
    var currentIndex = ARTICLE_LAYOUT_MODES.indexOf(current);
    var next = ARTICLE_LAYOUT_MODES[(currentIndex + 1) % ARTICLE_LAYOUT_MODES.length];
    var labels = currentLanguage === 'zh'
      ? { single: '单栏排列', double: '双栏排列', cylinder: '圆柱旋转排列' }
      : { single: 'Single column', double: 'Two columns', cylinder: 'Cylinder carousel' };
    document.querySelectorAll('[data-article-layout-option]').forEach(function (button) {
      var mode = normalizeArticleLayout(button.getAttribute('data-article-layout-option'));
      var active = mode === current;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
      button.setAttribute('aria-label', labels[mode]);
      button.setAttribute('title', labels[mode]);
    });
    document.querySelectorAll('[data-article-layout-cycle]').forEach(function (button) {
      var icon = button.querySelector('[data-article-layout-cycle-icon]');
      var iconClasses = {
        single: 'ri-layout-row-line',
        double: 'ri-layout-grid-line',
        cylinder: 'article-layout-cylinder-icon'
      };
      if (icon) icon.className = iconClasses[current];
      button.setAttribute('data-current-layout', current);
      button.setAttribute('aria-label', currentLanguage === 'zh'
        ? ('当前为' + labels[current] + '，点击切换为' + labels[next])
        : ('Current: ' + labels[current] + '. Switch to ' + labels[next]));
      button.setAttribute('title', currentLanguage === 'zh'
        ? ('切换为' + labels[next])
        : ('Switch to ' + labels[next]));
    });
    var stage = document.querySelector('[data-article-cylinder-stage]');
    if (stage) stage.tabIndex = current === 'cylinder' ? 0 : -1;
  }

  function destroyArticleCylinder() {
    if (articleCylinderController && typeof articleCylinderController.cleanup === 'function') {
      articleCylinderController.cleanup();
    }
    articleCylinderController = null;
  }

  function applyArticleLayout(layout, options) {
    var stream = document.querySelector('.article-stream');
    if (!stream) return Promise.resolve();
    var normalized = normalizeArticleLayout(layout);
    options = options || {};
    destroyArticleCylinder();
    document.body.setAttribute('data-article-layout', normalized);
    stream.classList.remove('is-single-column', 'is-double-column', 'is-cylinder');
    stream.classList.add(normalized === 'single' ? 'is-single-column' : (normalized === 'cylinder' ? 'is-cylinder' : 'is-double-column'));
    updateArticleLayoutControl();
    if (options.load === false) return Promise.resolve();
    if (normalized === 'cylinder') return loadAllArticlesForCylinder();
    return window.loadArticles ? window.loadArticles(currentPage || 1, true) : Promise.resolve();
  }

  function initArticleLayout() {
    var stream = document.querySelector('.article-stream');
    var buttons = document.querySelectorAll('[data-article-layout-option]');
    var cycleButtons = document.querySelectorAll('[data-article-layout-cycle]');
    if (!stream || (!buttons.length && !cycleButtons.length)) return;
    cycleButtons.forEach(function (button) { button.hidden = false; });
    applyArticleLayout(getStoredArticleLayout(), { load: false });
    buttons.forEach(function (button) {
      button.addEventListener('click', function () {
        var next = normalizeArticleLayout(button.getAttribute('data-article-layout-option'));
        if (next === document.body.getAttribute('data-article-layout')) return;
        setStoredArticleLayout(next);
        applyArticleLayout(next);
      });
    });
    cycleButtons.forEach(function (button) {
      button.addEventListener('click', function () {
        var current = normalizeArticleLayout(document.body.getAttribute('data-article-layout'));
        var next = ARTICLE_LAYOUT_MODES[(ARTICLE_LAYOUT_MODES.indexOf(current) + 1) % ARTICLE_LAYOUT_MODES.length];
        setStoredArticleLayout(next);
        applyArticleLayout(next);
      });
    });
  }

  function initHomeScrollProgress() {
    var button = document.querySelector('[data-home-scroll-progress]');
    var value = document.querySelector('[data-home-scroll-progress-value]');
    if (!button || !value) return;

    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var ticking = false;
    button.hidden = false;

    function syncProgress() {
      var maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      var percent = maxScroll > 0 ? Math.round((window.scrollY / maxScroll) * 100) : 0;
      var visible = window.scrollY > 120;
      percent = Math.max(0, Math.min(100, percent));
      value.textContent = String(percent);
      button.classList.toggle('is-visible', visible);
      button.setAttribute('aria-hidden', visible ? 'false' : 'true');
      button.setAttribute('aria-label', currentLanguage === 'zh'
        ? ('返回顶部，当前滚动 ' + percent + '%')
        : ('Back to top, ' + percent + '% scrolled'));
      button.tabIndex = visible ? 0 : -1;
      ticking = false;
    }

    function requestProgressSync() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(syncProgress);
    }

    button.__syncProgress = syncProgress;
    button.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
    window.addEventListener('scroll', requestProgressSync, { passive: true });
    window.addEventListener('resize', requestProgressSync, { passive: true });
    syncProgress();
  }

  function applyLanguage(language) {
    currentLanguage = language === 'en' ? 'en' : 'zh';
    document.documentElement.lang = currentLanguage === 'zh' ? 'zh-CN' : 'en';
    document.querySelectorAll('[data-i18n]').forEach(function (element) {
      element.textContent = t(element.getAttribute('data-i18n'));
    });
    document.querySelectorAll('[data-i18n-aria]').forEach(function (element) {
      var label = t(element.getAttribute('data-i18n-aria'));
      element.setAttribute('aria-label', label);
      element.setAttribute('title', label);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function (element) {
      element.setAttribute('placeholder', t(element.getAttribute('data-i18n-placeholder')));
    });
    document.querySelectorAll('[data-share-hint-key]').forEach(function (element) {
      element.setAttribute('data-share-hint', t(element.getAttribute('data-share-hint-key')));
    });
    syncSearchLanguage();
    document.querySelectorAll('[data-language-current]').forEach(function (element) {
      element.textContent = currentLanguage === 'zh' ? '中' : 'EN';
    });
    document.querySelectorAll('[data-language-toggle]').forEach(function (element) {
      var next = currentLanguage === 'zh' ? 'English' : '中文';
      element.setAttribute('aria-label', currentLanguage === 'zh' ? 'Switch to English' : '切换到中文');
      element.setAttribute('title', currentLanguage === 'zh' ? 'Switch to English' : '切换到中文');
      element.dataset.nextLanguageLabel = next;
    });
    document.querySelectorAll('[data-rss-link]').forEach(function (element) {
      element.setAttribute('href', '/rss.xml?lang=' + currentLanguage);
    });
    applyCurrentArticleTranslation();
    applySidebarTranslations();
    updateArticleLayoutControl();
    initBookmarkButtons();
    var progressButton = document.querySelector('[data-home-scroll-progress]');
    if (progressButton && progressButton.__syncProgress) progressButton.__syncProgress();
    if (document.querySelector('[data-article-toc]')) initArticleToc();
    document.dispatchEvent(new CustomEvent('blog:languagechange', { detail: { language: currentLanguage } }));
  }

  function syncSearchLanguage() {
    var dialog = document.querySelector('[data-site-search-dialog]');
    if (!dialog) return;
    var kicker = dialog.querySelector('.site-search-header span');
    var title = dialog.querySelector('.site-search-header h2');
    var closeButton = dialog.querySelector('[data-site-search-close]');
    var dragHandle = dialog.querySelector('[data-site-search-drag-handle]');
    var searchInput = dialog.querySelector('[data-site-search-input]');
    var obsoleteHelp = dialog.querySelector('.site-search-help');
    if (kicker) kicker.textContent = t('search.kicker');
    if (title) title.textContent = t('search.title');
    if (closeButton) {
      closeButton.setAttribute('aria-label', t('search.close'));
      closeButton.setAttribute('title', t('search.close'));
    }
    if (dragHandle) {
      dragHandle.setAttribute('aria-label', t('search.move'));
      dragHandle.setAttribute('title', t('search.move'));
    }
    if (searchInput) searchInput.setAttribute('placeholder', t('search.placeholder'));
    if (obsoleteHelp) obsoleteHelp.remove();
  }

  function initLanguage() {
    var stored = getStoredLanguage();
    applyLanguage(stored === 'en' || stored === 'zh' ? stored : 'zh');
    var toggle = document.querySelector('[data-language-toggle]');
    if (!toggle) return;
    toggle.addEventListener('click', function () {
      var next = currentLanguage === 'zh' ? 'en' : 'zh';
      setStoredLanguage(next);
      applyLanguage(next);
      var articlesData = document.body.getAttribute('data-articles');
      var archiveRerendered = false;
      if (articlesData) {
        try {
          renderArticles(JSON.parse(articlesData));
          archiveRerendered = true;
        } catch { /* noop */ }
      } else if (document.getElementById('articles-container') && window.__lastArticles) {
        renderArticles(window.__lastArticles);
        archiveRerendered = true;
      }
      if (archiveRerendered && document.body.getAttribute('data-article-layout') === 'cylinder') {
        articleCylinderController = initArticleCylinder();
      }
      if (window.__lastPagination) updatePagination(window.__lastPagination);
      var commentsPanel = document.querySelector('[data-comments]');
      if (commentsPanel) loadComments(commentsPanel);
      if (window.location.pathname === '/bookmarks' || window.location.pathname === '/bookmarks/') {
        renderBookmarksPage();
      }
    });
  }

  // ─── Share Modal ───────────────────────────────────────────
  let currentSharePermalink = '';
  let currentShareTitle = '';

  window.shareArticle = function (permalink, title) {
    currentSharePermalink = permalink;
    var localized = getArticleTranslation(permalink);
    var displayTitle = localized && localized.title ? localized.title : title;
    currentShareTitle = displayTitle;
    var modal = document.getElementById('share-modal');
    var titleEl = document.getElementById('share-article-title');
    if (modal && titleEl) {
      titleEl.textContent = displayTitle;
      modal.classList.remove('hidden');
      return;
    }
    var shareUrl = 'https://blog.858846.xyz/article/' + permalink;
    if (navigator.share) {
      navigator.share({ title: displayTitle, url: shareUrl }).catch(function () {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl).then(function () {
        alert(t('share.copied'));
      });
    }
  };

  window.closeShareModal = function () {
    var modal = document.getElementById('share-modal');
    if (modal) modal.classList.add('hidden');
  };

  window.shareOnPlatform = function (platform) {
    var url = encodeURIComponent('https://blog.858846.xyz/article/' + currentSharePermalink);
    var text = encodeURIComponent(currentShareTitle);
    var links = {
      twitter: 'https://twitter.com/intent/tweet?url=' + url + '&text=' + text,
      facebook: 'https://www.facebook.com/sharer/sharer.php?u=' + url,
      linkedin: 'https://www.linkedin.com/sharing/share-offsite/?url=' + url
    };
    if (links[platform]) window.open(links[platform], '_blank', 'width=600,height=400');
  };

  window.copyArticleLink = function () {
    var url = 'https://blog.858846.xyz/article/' + currentSharePermalink;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(function () {
      alert(t('share.copied'));
      });
    } else {
      var ta = document.createElement('textarea');
      ta.value = url;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      alert(t('share.copied'));
    }
  };

  // Close modal on background click
  document.addEventListener('click', function (e) {
    var modal = document.getElementById('share-modal');
    if (modal && e.target === modal) closeShareModal();
  });

  // Close modal on Escape
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeShareModal();
  });

  // ─── Bookmarks (localStorage) ──────────────────────────────
  function getBookmarks() {
    try { return JSON.parse(localStorage.getItem('blog_bookmarks') || '[]'); } catch { return []; }
  }

  function saveBookmarks(bookmarks) {
    try { localStorage.setItem('blog_bookmarks', JSON.stringify(bookmarks)); } catch { /* noop */ }
  }

  function isArticleBookmarked(permalink) {
    return getBookmarks().some(function (b) { return b.permalink === permalink; });
  }

  function updateBookmarkButton(button, isBookmarked) {
    if (!button) return;
    var label = isBookmarked ? t('articles.removeBookmark') : t('articles.bookmark');
    button.classList.toggle('bookmarked', isBookmarked);
    button.setAttribute('title', label);
    button.setAttribute('aria-label', label);
    if (button.hasAttribute('data-share-hint')) button.setAttribute('data-share-hint', label);
    var icon = button.querySelector('i');
    if (icon) {
      icon.classList.toggle('ri-bookmark-fill', isBookmarked);
      icon.classList.toggle('ri-bookmark-line', !isBookmarked);
    }
  }

  function syncBookmarkButtons(permalink, isBookmarked) {
    document.querySelectorAll('.bookmark-btn[data-bookmark-permalink]').forEach(function (button) {
      if (button.getAttribute('data-bookmark-permalink') === permalink) {
        updateBookmarkButton(button, isBookmarked);
      }
    });
  }

  function initBookmarkButtons() {
    document.querySelectorAll('.bookmark-btn[data-bookmark-permalink]').forEach(function (button) {
      updateBookmarkButton(button, isArticleBookmarked(button.getAttribute('data-bookmark-permalink')));
    });
  }

  function initArticleActionHints() {
    var toolbar = document.querySelector('[data-article-toolbar]');
    if (!toolbar || toolbar.dataset.hintsInitialized === 'true') return;
    toolbar.dataset.hintsInitialized = 'true';
    var buttons = Array.from(toolbar.querySelectorAll('.btn-share[data-share-hint]'));
    if (!buttons.length) return;

    var setHintsVisible = function (visible) {
      buttons.forEach(function (button) { button.classList.toggle('is-scroll-hint-visible', visible); });
    };

    if (!('IntersectionObserver' in window)) {
      setHintsVisible(true);
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.target !== toolbar) return;
        buttons.forEach(function (button) { button.classList.toggle('is-scroll-hint-visible', entry.isIntersecting); });
      });
    }, { threshold: 0.25 });
    observer.observe(toolbar);
  }

  window.toggleBookmark = function (permalink, title, img, label, button) {
    var bookmarks = getBookmarks();
    var idx = bookmarks.findIndex(function (b) { return b.permalink === permalink; });
    var isBookmarked;
    if (idx >= 0) {
      bookmarks.splice(idx, 1);
      isBookmarked = false;
    } else {
      bookmarks.push({ permalink: permalink, title: title, img: img || '', label: label || 'General', savedAt: new Date().toISOString() });
      isBookmarked = true;
    }
    saveBookmarks(bookmarks);
    syncBookmarkButtons(permalink, isBookmarked);
    // Refresh bookmarks page if on it
    if (typeof renderBookmarksPage === 'function') renderBookmarksPage();
  };

  // ─── Escape HTML ───────────────────────────────────────────
  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function safeArticleMarkdown(markdown, emptyText) {
    var source = escapeHtml(String(markdown || '')).replace(/\r\n/g, '\n');
    var codeBlocks = [];
    source = source.replace(/```([^\n]*)\n([\s\S]*?)```/g, function (_match, language, code) {
      var token = '@@CODE' + codeBlocks.length + '@@';
      codeBlocks.push('<pre><code data-language="' + escapeHtml(language.trim()) + '">' + code + '</code></pre>');
      return token;
    });
    source = source
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>')
      .replace(/^---$/gm, '<hr>')
      .replace(/!\[([^\]]*)\]\((\/media\/user-articles\/[A-Za-z0-9-]+)(?: &quot;([^&]*)&quot;)?\)/g, '<figure><img src="$2" alt="$1" loading="lazy"><figcaption>$3</figcaption></figure>')
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" rel="noopener noreferrer" target="_blank">$1</a>')
      .replace(/`([^`\n]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
    var blocks = source.split(/\n{2,}/).map(function (block) {
      var trimmed = block.trim();
      if (!trimmed) return '';
      if (/^@@CODE\d+@@$/.test(trimmed) || /^<(?:h2|h3|blockquote|hr|figure)/.test(trimmed)) return trimmed;
      var lines = trimmed.split('\n');
      if (lines.every(function (line) { return /^- /.test(line); })) {
        return '<ul>' + lines.map(function (line) { return '<li>' + line.slice(2) + '</li>'; }).join('') + '</ul>';
      }
      if (lines.every(function (line) { return /^\d+\. /.test(line); })) {
        return '<ol>' + lines.map(function (line) { return '<li>' + line.replace(/^\d+\. /, '') + '</li>'; }).join('') + '</ol>';
      }
      return '<p>' + lines.join('<br>') + '</p>';
    }).join('');
    codeBlocks.forEach(function (block, index) {
      blocks = blocks.replace('@@CODE' + index + '@@', block);
    });
    return blocks || '<p class="publish-preview-empty">' + escapeHtml(emptyText || '') + '</p>';
  }

  function escapeAttr(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  }

  function getArticleVisual(permalink, label, title) {
    var exactVisuals = {
      'okx-swap-crv-zk-review': {
        key: 'trading-desk',
        mark: 'OKX',
        eyebrow: 'SWAP',
        meta: ['CRV', 'ZK', 'P&L'],
        nodes: ['LONG', 'FEE', 'EXIT']
      },
      'cloudflare-blog-start': {
        key: 'blog-lab',
        mark: 'KV',
        eyebrow: 'BLOG',
        meta: ['Workers', 'KV', 'RSS'],
        nodes: ['INDEX', 'POST', 'EDGE']
      },
      'cloudflare-workers-deploy': {
        key: 'edge-deploy',
        mark: 'CF',
        eyebrow: 'DEPLOY',
        meta: ['Assets', 'Route', 'Cache'],
        nodes: ['BUILD', 'EDGE', 'LIVE']
      },
      'd1-feedback-system': {
        key: 'd1-comments',
        mark: 'D1',
        eyebrow: 'SQL',
        meta: ['Feedback', 'Comments', 'API'],
        nodes: ['FORM', 'D1', 'MOD']
      },
      'personal-site-cloudflare-workers': {
        key: 'site-route',
        mark: 'WEB',
        eyebrow: 'ROUTE',
        meta: ['Static', 'Domain', 'Worker'],
        nodes: ['HOME', 'API', 'BLOG']
      },
      'd1-feedback-interview-job-match': {
        key: 'data-flow',
        mark: 'DB',
        eyebrow: 'DATA',
        meta: ['Feedback', 'Invite', 'Match'],
        nodes: ['INPUT', 'D1', 'ADMIN']
      },
      'ai-job-matcher-product-loop': {
        key: 'ai-matcher',
        mark: 'AI',
        eyebrow: 'MATCH',
        meta: ['JD', 'Score', 'Report'],
        nodes: ['JD', 'AI', 'JSON']
      },
      'embedded-project-review': {
        key: 'embedded-lab',
        mark: 'MCU',
        eyebrow: 'HARDWARE',
        meta: ['STM32', 'Robot', 'Test'],
        nodes: ['GPIO', 'PWM', 'UART']
      }
    };
    if (permalink && exactVisuals[permalink]) return exactVisuals[permalink];

    var source = String((label || '') + ' ' + (title || '')).toLowerCase();
    if (source.indexOf('database') >= 0 || source.indexOf('d1') >= 0 || source.indexOf('数据') >= 0) {
      return { key: 'd1-comments', mark: 'D1', eyebrow: 'SQL', meta: ['Table', 'Query', 'API'], nodes: ['ROW', 'D1', 'VIEW'] };
    }
    if (source.indexOf('ai') >= 0 || source.indexOf('codex') >= 0 || source.indexOf('api') >= 0 || source.indexOf('智能') >= 0) {
      return { key: 'ai-matcher', mark: 'AI', eyebrow: 'MODEL', meta: ['Prompt', 'Score', 'JSON'], nodes: ['IN', 'AI', 'OUT'] };
    }
    if (source.indexOf('worker') >= 0 || source.indexOf('cloudflare') >= 0 || source.indexOf('部署') >= 0) {
      return { key: 'edge-deploy', mark: 'CF', eyebrow: 'EDGE', meta: ['Worker', 'Route', 'Cache'], nodes: ['DEV', 'EDGE', 'URL'] };
    }
    if (source.indexOf('embedded') >= 0 || source.indexOf('stm32') >= 0 || source.indexOf('硬件') >= 0 || source.indexOf('嵌入式') >= 0) {
      return { key: 'embedded-lab', mark: 'MCU', eyebrow: 'LAB', meta: ['GPIO', 'PWM', 'Test'], nodes: ['PIN', 'BUS', 'IO'] };
    }
    if (source.indexOf('crypto') >= 0 || source.indexOf('okx') >= 0 || source.indexOf('swap') >= 0 || source.indexOf('合约') >= 0 || source.indexOf('交易') >= 0) {
      return { key: 'trading-desk', mark: 'OKX', eyebrow: 'SWAP', meta: ['Risk', 'P&L', 'Exit'], nodes: ['CRV', 'ZK', 'USDT'] };
    }
    if (source.indexOf('project') >= 0 || source.indexOf('review') >= 0 || source.indexOf('项目') >= 0 || source.indexOf('复盘') >= 0) {
      return { key: 'site-route', mark: 'PR', eyebrow: 'REVIEW', meta: ['Plan', 'Build', 'Result'], nodes: ['WHY', 'HOW', 'DONE'] };
    }
    return { key: 'blog-lab', mark: 'NT', eyebrow: 'NOTE', meta: ['Draft', 'Build', 'Ship'], nodes: ['IDEA', 'NOTE', 'LOG'] };
  }

  function renderArticleVisual(permalink, label, title, compact) {
    var visual = getArticleVisual(permalink, label, title);
    var meta = (visual.meta || []).map(function (item) {
      return '<span>' + escapeHtml(item) + '</span>';
    }).join('');
    var nodes = (visual.nodes || []).map(function (item) {
      return '<span>' + escapeHtml(item) + '</span>';
    }).join('');
    return '<div class="article-visual article-visual-' + visual.key + (compact ? ' article-visual-compact' : '') + '">' +
      '<div class="article-visual-grid" aria-hidden="true"></div>' +
      '<div class="article-visual-motif" aria-hidden="true"><span></span><span></span><span></span></div>' +
      '<div class="article-visual-nodes" aria-hidden="true">' + nodes + '</div>' +
      '<div class="article-logo-mark" aria-hidden="true">' +
        '<span class="article-logo-eyebrow">' + escapeHtml(visual.eyebrow) + '</span>' +
        '<span class="article-logo-letters">' + escapeHtml(visual.mark) + '</span>' +
      '</div>' +
      '<div class="article-visual-meta" aria-hidden="true">' + meta + '</div>' +
    '</div>';
  }

  // ─── Article Rendering ─────────────────────────────────────
  function renderArticleCard(article) {
    var displayArticle = getLocalizedArticle(article);
    var isBm = isArticleBookmarked(article.permalink);
    var safeTitle = escapeHtml(displayArticle.title);
    var safeImg = escapeAttr(displayArticle.img || '');
    var safePermalink = escapeAttr(article.permalink);
    var safeLabel = escapeHtml(displayArticle.label || 'General');
    var safeExcerpt = escapeHtml(displayArticle.excerpt || '');

    var imgHtml = displayArticle.img
      ? '<img src="' + safeImg + '" class="w-full h-48 object-cover" alt="' + safeTitle + '" loading="lazy">'
      : renderArticleVisual(article.permalink, displayArticle.label, displayArticle.title, false);

    return '<article class="article-card article-list-item flex flex-col h-full">' +
      '<div class="card-image relative flex-shrink-0">' +
        imgHtml +
        '<div class="absolute bottom-4 left-4">' +
          '<span class="category-tag px-3 py-1.5 rounded-xl text-xs font-semibold shadow-md">' + safeLabel + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="p-5 flex flex-col flex-grow">' +
        '<div class="article-card-meta flex items-center justify-between text-xs mb-3" style="color:var(--text-muted)">' +
          '<div class="article-card-date inline-flex items-center min-w-0">' +
            '<i class="ri-calendar-line mr-1.5" style="color:var(--accent-primary)"></i>' +
            '<span>' + new Date(article.createDate).toLocaleDateString(currentLanguage === 'zh' ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + '</span>' +
          '</div>' +
          '<button class="bookmark-btn card-action-btn card-bookmark-inline ' + (isBm ? 'bookmarked' : '') + '"' +
            ' data-bookmark-permalink="' + safePermalink + '"' +
            ' onclick="toggleBookmark(\'' + safePermalink + '\', \'' + safeTitle + '\', \'' + safeImg + '\', \'' + safeLabel + '\', this)"' +
            ' title="' + (isBm ? t('articles.removeBookmark') : t('articles.bookmark')) + '"' +
            ' aria-label="' + (isBm ? t('articles.removeBookmark') : t('articles.bookmark')) + '">' +
            '<i class="ri-bookmark-' + (isBm ? 'fill' : 'line') + '"></i>' +
          '</button>' +
        '</div>' +
        '<h3 class="font-bold mb-3 line-clamp-2 leading-snug text-lg" style="color:var(--text-primary)">' + safeTitle + '</h3>' +
        '<p class="text-sm mb-4 line-clamp-3 flex-grow leading-relaxed" style="color:var(--text-muted)">' + safeExcerpt + '</p>' +
        '<div class="flex justify-between items-center pt-4 border-t mt-auto" style="border-color:rgba(128,128,128,0.15)">' +
          '<a href="/article/' + safePermalink + '" class="read-more-link inline-flex items-center text-sm">' + t('articles.readMore') + ' <i class="ri-arrow-right-line ml-1 transition-transform group-hover:translate-x-1"></i></a>' +
          '<button onclick="shareArticle(\'' + safePermalink + '\', \'' + safeTitle + '\')" class="card-action-btn card-share-btn" title="' + t('articles.share') + '" aria-label="' + t('articles.share') + '">' +
            '<i class="ri-share-forward-line"></i>' +
          '</button>' +
        '</div>' +
      '</div>' +
    '</article>';
  }

  function renderCylinderArticleCard(article) {
    var displayArticle = getLocalizedArticle(article);
    var safeTitleAttr = escapeAttr(displayArticle.title);
    var safeImg = escapeAttr(displayArticle.img || '');
    var safePermalink = escapeAttr(article.permalink);
    var visual = displayArticle.img
      ? '<img src="' + safeImg + '" alt="' + safeTitleAttr + '" loading="lazy" data-cylinder-image>'
      : renderArticleVisual(article.permalink, displayArticle.label, displayArticle.title, true);

    return '<article class="article-card article-list-item article-cylinder-card">' +
      '<a href="/article/' + safePermalink + '" class="article-cylinder-card-link" aria-label="' + safeTitleAttr + '">' +
        '<div class="card-image">' + visual + '</div>' +
      '</a>' +
    '</article>';
  }

  function renderCylinderPreview(article) {
    var displayArticle = getLocalizedArticle(article);
    var safeTitle = escapeHtml(displayArticle.title);
    var safeTitleAttr = escapeAttr(displayArticle.title);
    var safeLabel = escapeHtml(displayArticle.label || 'General');
    var safePermalink = escapeAttr(article.permalink);
    var safeImg = escapeAttr(displayArticle.img || '');
    var visual = displayArticle.img
      ? '<img src="' + safeImg + '" alt="' + safeTitleAttr + '" data-cylinder-preview-image>'
      : renderArticleVisual(article.permalink, displayArticle.label, displayArticle.title, false);

    return '<article class="article-cylinder-preview" data-cylinder-preview data-preview-permalink="' + safePermalink + '">' +
      '<span class="article-cylinder-preview-label">' + safeLabel + '</span>' +
      '<a href="/article/' + safePermalink + '" class="article-cylinder-preview-title"><h2>' + safeTitle + '</h2></a>' +
      '<a href="/article/' + safePermalink + '" class="article-cylinder-preview-media">' + visual + '</a>' +
      '<a href="/article/' + safePermalink + '" class="article-cylinder-preview-action">' +
        '<span>' + (currentLanguage === 'zh' ? '查看这篇文章' : 'View this article') + '</span><span aria-hidden="true">+</span>' +
      '</a>' +
    '</article>';
  }

  function renderArticles(articles) {
    var container = document.getElementById('articles-container');
    if (!container) return;
    destroyArticleCylinder();
    window.__lastArticles = articles || [];

    if (!articles || articles.length === 0) {
      container.innerHTML = '<div class="col-span-full text-center py-16">' +
        '<div class="w-20 h-20 rounded-2xl bg-gradient-to-br mx-auto flex items-center justify-center mb-4" style="background:linear-gradient(135deg, var(--pastel-lavender), var(--pastel-pink))">' +
          '<i class="ri-article-line text-4xl" style="color:var(--accent-primary)"></i>' +
        '</div>' +
        '<h3 class="text-xl font-bold mb-2" style="color:var(--text-primary)">' + t('articles.emptyTitle') + '</h3>' +
        '<p class="max-w-md mx-auto mb-6" style="color:var(--text-muted)">' + t('articles.emptyDescription') + '</p>' +
      '</div>';
      var pc = document.getElementById('pagination-container');
      if (pc) pc.innerHTML = '';
      return;
    }

    var cylinderMode = document.body.getAttribute('data-article-layout') === 'cylinder';
    container.innerHTML = articles.map(cylinderMode ? renderCylinderArticleCard : renderArticleCard).join('');
  }

  // ─── Pagination ────────────────────────────────────────────
  function updatePagination(pagination) {
    var container = document.getElementById('pagination-container');
    if (!container) return;

    if (!pagination || pagination.totalPages <= 1) {
      container.innerHTML = '';
      return;
    }

    var html = '<div class="pagination-stack flex flex-col items-center">';
    html += '<div class="pagination-controls flex items-center flex-wrap justify-center">';

    html += '<button onclick="loadArticles(' + (pagination.page - 1) + ')" class="page-btn px-4 py-2.5 rounded-xl font-medium' + (pagination.hasPrevPage ? '' : ' opacity-50 cursor-not-allowed') + '"' + (!pagination.hasPrevPage ? ' disabled' : '') + '><i class="ri-arrow-left-line mr-1"></i> ' + (currentLanguage === 'zh' ? '上一页' : 'Previous') + '</button>';

    var startPage = Math.max(1, pagination.page - 2);
    var endPage = Math.min(pagination.totalPages, pagination.page + 2);
    for (var i = startPage; i <= endPage; i++) {
      html += '<button onclick="loadArticles(' + i + ')" class="page-btn pagination-number rounded-xl font-semibold' + (i === pagination.page ? ' active' : '') + '">' + i + '</button>';
    }

    html += '<button onclick="loadArticles(' + (pagination.page + 1) + ')" class="page-btn px-4 py-2.5 rounded-xl font-medium' + (pagination.hasNextPage ? '' : ' opacity-50 cursor-not-allowed') + '"' + (!pagination.hasNextPage ? ' disabled' : '') + '>' + (currentLanguage === 'zh' ? '下一页' : 'Next') + ' <i class="ri-arrow-right-line ml-1"></i></button>';

    html += '</div>';
    html += '<p class="pagination-summary text-sm bg-white/50 px-4 py-2 rounded-full" style="color:var(--text-muted)">' + (currentLanguage === 'zh' ? ('第 ' + pagination.page + ' / ' + pagination.totalPages + ' 页 · ' + pagination.totalArticles + ' 篇文章') : ('Page ' + pagination.page + ' of ' + pagination.totalPages + ' &bull; ' + pagination.totalArticles + ' articles')) + '</p>';
    html += '</div>';

    container.innerHTML = html;
  }

  // ─── Article Loading (API-based, with SSR fallback) ────────
  var currentPage = 1;
  var totalPages = 1;
  var pageSize = 9;

  function initArticleCylinder() {
    var stage = document.querySelector('[data-article-cylinder-stage]');
    var ring = stage && stage.querySelector('.article-stream.is-cylinder');
    var cards = ring ? Array.prototype.slice.call(ring.querySelectorAll('.article-list-item')) : [];
    if (!stage || !ring || !cards.length || document.body.getAttribute('data-article-layout') !== 'cylinder') return null;

    var articles = Array.isArray(window.__lastArticles) ? window.__lastArticles : [];
    var previewHost = stage.querySelector('[data-cylinder-preview-host]');
    if (!previewHost) {
      previewHost = document.createElement('div');
      previewHost.className = 'article-cylinder-preview-host';
      previewHost.setAttribute('data-cylinder-preview-host', '');
      stage.insertBefore(previewHost, ring);
    }

    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var step = 360 / cards.length;
    var radius = 320;
    var isCompact = false;
    var angle = 0;
    var targetAngle = null;
    var lastFrame = 0;
    var activeCard = -1;
    var previewIndex = -1;
    var animationFrame = 0;
    var resizeFrame = 0;
    var isHovering = false;
    var hasFocus = false;
    var pointerState = null;
    var resumeTimer = 0;

    function modulo(value, divisor) {
      return ((value % divisor) + divisor) % divisor;
    }

    function getActiveIndex() {
      return modulo(Math.round(-angle / step), cards.length);
    }

    function syncCylinderPreview(next) {
      if (next === previewIndex || !articles[next]) return;
      previewIndex = next;
      previewHost.classList.add('is-changing');
      previewHost.innerHTML = renderCylinderPreview(articles[next]);
      var previewImage = previewHost.querySelector('[data-cylinder-preview-image]');
      if (previewImage) {
        previewImage.addEventListener('error', function () {
          var media = previewImage.closest('.article-cylinder-preview-media');
          var displayArticle = getLocalizedArticle(articles[next]);
          if (media) media.innerHTML = renderArticleVisual(
            articles[next].permalink,
            displayArticle.label,
            displayArticle.title,
            false
          );
        }, { once: true });
      }
      window.requestAnimationFrame(function () {
        previewHost.classList.remove('is-changing');
      });
    }

    function syncActiveCard() {
      var next = getActiveIndex();
      if (next === activeCard) return;
      activeCard = next;
      syncCylinderPreview(next);
      cards.forEach(function (card, index) {
        var active = index === activeCard;
        card.classList.toggle('is-active', active);
        card.setAttribute('aria-hidden', active ? 'false' : 'true');
        card.tabIndex = active ? 0 : -1;
        card.querySelectorAll('a, button, input, select, textarea, [tabindex]').forEach(function (control) {
          if (!control.hasAttribute('data-cylinder-tabindex')) {
            control.setAttribute('data-cylinder-tabindex', control.getAttribute('tabindex') || '');
          }
          if (active) {
            var original = control.getAttribute('data-cylinder-tabindex');
            if (original) control.setAttribute('tabindex', original);
            else control.removeAttribute('tabindex');
          } else {
            control.setAttribute('tabindex', '-1');
          }
        });
      });
    }

    function renderArcCardStack(activeIndex, compact) {
      ring.style.transform = 'none';
      var phaseProgress = -angle / step - Math.round(-angle / step);
      cards.forEach(function (card, index) {
        var stackSlot = modulo(index - activeIndex + cards.length / 2 - phaseProgress, cards.length) - cards.length / 2;
        var pullWeight = Math.max(0, 1 - Math.abs(stackSlot));
        var pulled = Math.abs(stackSlot) < 0.5;
        var theta = stackSlot / Math.max(1, cards.length - 1) * Math.PI;
        var pullDistance = compact ? 10 : 14;
        var radiusX = compact ? 130 : 175;
        var radiusY = compact ? 74 : 112;
        var centerX = compact ? 105 : 120;
        var baselineY = 0;
        var depth = Math.max(0, Math.cos(theta));
        var x = centerX - radiusX * Math.cos(theta) - pullDistance * pullWeight;
        var y = baselineY + radiusY * Math.sin(theta);
        var rotation = 0;
        var scale = pulled ? 1 : 0.8 + depth * 0.14;
        var opacity = pulled ? 1 : 0.72 + depth * 0.2;
        var depthZ = pulled ? 24 : -((1 - depth) * (compact ? 26 : 48));
        var depthOrder = 12 + Math.round(depth * 16);
        card.classList.toggle('is-pulled', pulled);
        card.style.zIndex = String(pulled ? 40 : depthOrder);
        card.style.transform = 'translate3d(calc(-50% + ' + x.toFixed(2) + 'px), calc(-50% + ' + y.toFixed(2) + 'px), ' + depthZ.toFixed(2) + 'px) rotateZ(0deg) scale(' + scale.toFixed(3) + ')';
        card.style.setProperty('--cylinder-card-opacity', opacity.toFixed(3));
        card.style.setProperty('--cylinder-depth', depth.toFixed(3));
      });
    }

    function renderCylinder() {
      renderArcCardStack(getActiveIndex(), isCompact);
      syncActiveCard();
    }

    function positionArcNearPreview() {
      var media = previewHost.querySelector('.article-cylinder-preview-media');
      if (media) {
        var mediaBottom = media.getBoundingClientRect().bottom - stage.getBoundingClientRect().top;
        var radiusY = isCompact ? 74 : 112;
        var halfCardHeight = (isCompact ? 70 : 100) * 0.525;
        var arcTop = Math.max(0, mediaBottom + (isCompact ? -10 : -26) + radiusY + halfCardHeight - ring.offsetHeight / 2);
        ring.style.top = arcTop + 'px';
        ring.style.bottom = 'auto';
        stage.style.height = Math.max(stage.offsetHeight, previewHost.offsetHeight + 48, arcTop + ring.offsetHeight + 20) + 'px';
      }
    }

    function closestAngleFor(index) {
      var base = -index * step;
      return base + Math.round((angle - base) / 360) * 360;
    }

    function rotateTo(index) {
      targetAngle = closestAngleFor(modulo(index, cards.length));
      if (reduceMotion) {
        angle = targetAngle;
        targetAngle = null;
        renderCylinder();
      }
    }

    function setGeometry() {
      isCompact = window.innerWidth <= 720;
      radius = 0;
      stage.style.setProperty('--cylinder-card-width', isCompact ? '112px' : '160px');
      stage.style.setProperty('--cylinder-radius', '0px');
      renderCylinder();
      positionArcNearPreview();
    }

    function isPaused() {
      return isHovering || hasFocus || Boolean(pointerState) || document.hidden;
    }

    function animate(timestamp) {
      var elapsed = lastFrame ? Math.min(64, timestamp - lastFrame) : 0;
      lastFrame = timestamp;
      if (targetAngle !== null) {
        var difference = targetAngle - angle;
        if (Math.abs(difference) < 0.08) {
          angle = targetAngle;
          targetAngle = null;
        } else {
          angle += difference * Math.min(1, elapsed / 80);
        }
      }
      renderCylinder();
      animationFrame = window.requestAnimationFrame(animate);
    }

    function pauseThenResume() {
      window.clearTimeout(resumeTimer);
      resumeTimer = window.setTimeout(function () {
        if (!pointerState) targetAngle = closestAngleFor(getActiveIndex());
      }, 90);
    }

    function onPointerDown(event) {
      if (event.button !== undefined && event.button !== 0) return;
      if (event.target.closest('.article-cylinder-preview a')) return;
      pointerState = {
        id: event.pointerId,
        startX: event.clientX,
        lastX: event.clientX,
        lastTime: event.timeStamp || performance.now(),
        velocityX: 0,
        startAngle: angle,
        moved: false
      };
      targetAngle = null;
      stage.classList.add('is-dragging');
    }

    function onNativeDragStart(event) {
      event.preventDefault();
    }

    function onPointerMove(event) {
      if (!pointerState || (event.pointerId !== undefined && event.pointerId !== pointerState.id)) return;
      var delta = event.clientX - pointerState.startX;
      if (Math.abs(delta) > 2 && !pointerState.moved) {
        pointerState.moved = true;
        if (stage.setPointerCapture && event.pointerId !== undefined) stage.setPointerCapture(event.pointerId);
      }
      if (pointerState.moved) event.preventDefault();
      var now = event.timeStamp || performance.now();
      var elapsed = Math.max(1, now - pointerState.lastTime);
      pointerState.velocityX = (event.clientX - pointerState.lastX) / elapsed;
      pointerState.lastX = event.clientX;
      pointerState.lastTime = now;
      angle = pointerState.startAngle + delta * 3;
      renderCylinder();
    }

    function onPointerUp(event) {
      if (!pointerState || (event.pointerId !== undefined && event.pointerId !== pointerState.id)) return;
      var wasMoved = pointerState.moved;
      var releaseVelocity = Math.max(-1.6, Math.min(1.6, pointerState.velocityX));
      var projectedAngle = wasMoved ? angle + releaseVelocity * 150 : angle;
      if (wasMoved && Math.abs(pointerState.velocityX) > 0.15 && Math.abs(projectedAngle - angle) < step) {
        projectedAngle = angle + Math.sign(pointerState.velocityX) * step;
      }
      pointerState = null;
      stage.classList.remove('is-dragging');
      targetAngle = Math.round(projectedAngle / step) * step;
      if (wasMoved) {
        stage.setAttribute('data-cylinder-dragged', 'true');
        window.setTimeout(function () { stage.removeAttribute('data-cylinder-dragged'); }, 80);
      }
    }

    function onClick(event) {
      var card = event.target.closest('.article-list-item');
      if (!card || !ring.contains(card)) return;
      if (stage.hasAttribute('data-cylinder-dragged')) {
        event.preventDefault();
        return;
      }
      var index = cards.indexOf(card);
      event.preventDefault();
      if (index !== activeCard) {
        event.stopPropagation();
        rotateTo(index);
      }
    }

    function onKeyDown(event) {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        rotateTo(activeCard - 1);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        rotateTo(activeCard + 1);
      } else if (event.key === 'Enter') {
        var active = cards[activeCard];
        var link = active && active.querySelector('.article-cylinder-card-link');
        if (link) window.location.href = link.href;
      }
    }

    function onResize() {
      window.cancelAnimationFrame(resizeFrame);
      resizeFrame = window.requestAnimationFrame(setGeometry);
    }

    function onVisibilityChange() {
      lastFrame = 0;
    }

    function onMouseEnter() { isHovering = true; }
    function onMouseLeave() { isHovering = false; pauseThenResume(); }
    function onFocusIn() { hasFocus = true; }
    function onFocusOut(event) {
      if (!stage.contains(event.relatedTarget)) {
        hasFocus = false;
        pauseThenResume();
      }
    }

    stage.addEventListener('pointerdown', onPointerDown);
    ring.addEventListener('dragstart', onNativeDragStart);
    stage.addEventListener('pointermove', onPointerMove);
    stage.addEventListener('pointerup', onPointerUp);
    stage.addEventListener('pointercancel', onPointerUp);
    stage.addEventListener('click', onClick, true);
    stage.addEventListener('keydown', onKeyDown);
    stage.addEventListener('mouseenter', onMouseEnter);
    stage.addEventListener('mouseleave', onMouseLeave);
    stage.addEventListener('focusin', onFocusIn);
    stage.addEventListener('focusout', onFocusOut);
    window.addEventListener('resize', onResize, { passive: true });
    document.addEventListener('visibilitychange', onVisibilityChange);
    var previewResizeObserver = new ResizeObserver(positionArcNearPreview);
    previewResizeObserver.observe(previewHost);
    setGeometry();
    animationFrame = window.requestAnimationFrame(animate);

    return {
      cleanup: function () {
        previewResizeObserver.disconnect();
        stage.style.height = '';
        ring.style.top = '';
        ring.style.bottom = '';
        window.cancelAnimationFrame(animationFrame);
        window.cancelAnimationFrame(resizeFrame);
        window.clearTimeout(resumeTimer);
        stage.removeEventListener('pointerdown', onPointerDown);
        ring.removeEventListener('dragstart', onNativeDragStart);
        stage.removeEventListener('pointermove', onPointerMove);
        stage.removeEventListener('pointerup', onPointerUp);
        stage.removeEventListener('pointercancel', onPointerUp);
        stage.removeEventListener('click', onClick, true);
        stage.removeEventListener('keydown', onKeyDown);
        stage.removeEventListener('mouseenter', onMouseEnter);
        stage.removeEventListener('mouseleave', onMouseLeave);
        stage.removeEventListener('focusin', onFocusIn);
        stage.removeEventListener('focusout', onFocusOut);
        window.removeEventListener('resize', onResize);
        document.removeEventListener('visibilitychange', onVisibilityChange);
        stage.classList.remove('is-dragging');
        if (previewHost && previewHost.parentNode) previewHost.parentNode.removeChild(previewHost);
        ring.style.transform = '';
        cards.forEach(function (card) {
          card.style.transform = '';
          card.classList.remove('is-active');
          card.removeAttribute('aria-hidden');
          card.removeAttribute('tabindex');
          card.querySelectorAll('[data-cylinder-tabindex]').forEach(function (control) {
            var original = control.getAttribute('data-cylinder-tabindex');
            if (original) control.setAttribute('tabindex', original);
            else control.removeAttribute('tabindex');
            control.removeAttribute('data-cylinder-tabindex');
          });
        });
      }
    };
  }

  function loadAllArticlesForCylinder() {
    var container = document.getElementById('articles-container');
    if (!container) return Promise.resolve();
    var requestId = ++articleLayoutRequestId;
    container.classList.add('is-loading');
    return fetch('/api/articles')
      .then(function (res) {
        if (!res.ok) throw new Error('Failed to load all articles');
        return res.json();
      })
      .then(function (data) {
        if (requestId !== articleLayoutRequestId || document.body.getAttribute('data-article-layout') !== 'cylinder') return;
        renderArticles(data.articles || data || []);
        container.classList.remove('is-single-column', 'is-double-column');
        container.classList.add('is-cylinder');
        updatePagination(null);
        document.body.removeAttribute('data-articles');
        articleCylinderController = initArticleCylinder();
      })
      .catch(function (error) {
        if (requestId !== articleLayoutRequestId || document.body.getAttribute('data-article-layout') !== 'cylinder') return;
        console.error('Error loading cylinder articles:', error);
        if (Array.isArray(window.__lastArticles) && window.__lastArticles.length) {
          container.classList.remove('is-single-column', 'is-double-column');
          container.classList.add('is-cylinder');
          if (!articleCylinderController) articleCylinderController = initArticleCylinder();
          return;
        }
        setStoredArticleLayout('double');
        applyArticleLayout('double', { load: false });
        return window.loadArticles(currentPage || 1, true);
      })
      .finally(function () {
        container.classList.remove('is-loading');
      });
  }

  window.loadArticles = function (page, forcePaginated) {
    if (!forcePaginated && document.body.getAttribute('data-article-layout') === 'cylinder') {
      return loadAllArticlesForCylinder();
    }
    page = page || 1;
    currentPage = page;

    return fetch('/api/articles?paginate=true&page=' + page + '&pageSize=' + pageSize)
      .then(function (res) {
        if (!res.ok) throw new Error('Failed to load');
        return res.json();
      })
      .then(function (data) {
        var articles = data.articles || [];
        var pagination = data.pagination || {};
        totalPages = pagination.totalPages || 1;
        window.__lastPagination = pagination;
        renderArticles(articles);
        updatePagination(pagination);
        document.body.removeAttribute('data-articles');
      })
      .catch(function (err) {
        console.error('Error loading articles:', err);
        // Fallback to SSR data embedded in body attribute
        try {
          var raw = document.body.getAttribute('data-articles');
          if (raw) {
            renderArticles(JSON.parse(raw));
            document.body.removeAttribute('data-articles');
          }
        } catch { /* noop */ }

        var container = document.getElementById('articles-container');
        if (container && (!container.children.length || container.querySelector('[class*="py-16"]'))) {
          container.innerHTML = '<div class="col-span-full text-center py-16">' +
            '<div class="w-20 h-20 rounded-2xl mx-auto flex items-center justify-center mb-4" style="background:linear-gradient(135deg, var(--pastel-pink),#fecaca)">' +
              '<i class="ri-error-warning-line text-4xl" style="color:#ef4444"></i>' +
            '</div>' +
            '<h3 class="text-xl font-bold mb-2" style="color:var(--text-primary)">' + t('articles.loadErrorTitle') + '</h3>' +
            '<p class="max-w-md mx-auto mb-6" style="color:var(--text-muted)">' + t('articles.loadErrorDescription') + '</p>' +
            '<button onclick="loadArticles(1)" class="btn-primary text-white px-6 py-3 rounded-xl inline-flex items-center"><i class="ri-refresh-line mr-2"></i>' + t('articles.tryAgain') + '</button>' +
          '</div>';
        }
      });
  };

  // ─── Bookmarks Page Render ──────────────────────────────────
  window.renderBookmarksPage = function () {
    var container = document.getElementById('bookmarks-container');
    if (!container) return;

    var bookmarks = getBookmarks();

    if (bookmarks.length === 0) {
      container.innerHTML = '<div class="col-span-full text-center py-12">' +
        '<div class="w-20 h-20 rounded-2xl mx-auto flex items-center justify-center mb-4" style="background:linear-gradient(135deg, var(--pastel-lavender), var(--pastel-pink))">' +
          '<i class="ri-bookmark-line text-4xl" style="color:var(--accent-primary)"></i>' +
        '</div>' +
        '<h3 class="text-xl font-bold mb-2" style="color:var(--text-primary)">' + t('bookmarks.emptyTitle') + '</h3>' +
        '<p class="max-w-md mx-auto mb-6" style="color:var(--text-muted)">' + t('bookmarks.emptyDescription') + '</p>' +
        '<a href="/" class="btn-primary text-white px-6 py-3 rounded-xl inline-flex items-center"><i class="ri-arrow-left-line mr-2"></i>' + t('bookmarks.browse') + '</a>' +
      '</div>';
      return;
    }

    container.innerHTML = bookmarks.map(function (bm) {
      var displayBm = getLocalizedArticle(bm);
      var safeTitle = escapeHtml(displayBm.title);
      var safeImg = escapeAttr(bm.img);
      var safePermalink = escapeAttr(bm.permalink);
      var safeLabel = escapeHtml(bm.label || 'General');

      var imgHtml = bm.img
        ? '<img src="' + safeImg + '" class="w-full h-48 object-cover" alt="' + safeTitle + '" loading="lazy">'
        : renderArticleVisual(bm.permalink, bm.label, displayBm.title, true);

      return '<article class="article-card article-list-item bookmark-list-item flex flex-col h-full">' +
        '<div class="card-image relative flex-shrink-0">' +
          imgHtml +
          '<div class="absolute bottom-4 left-4">' +
            '<span class="category-tag px-3 py-1.5 rounded-xl text-xs font-semibold shadow-md">' + safeLabel + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="p-5 flex flex-col flex-grow">' +
          '<h3 class="font-bold mb-4 line-clamp-2 leading-snug text-lg" style="color:var(--text-primary)">' + safeTitle + '</h3>' +
          '<div class="flex justify-between items-center mt-auto pt-4 border-t" style="border-color:rgba(128,128,128,0.15)">' +
            '<a href="/article/' + safePermalink + '" class="read-more-link inline-flex items-center text-sm">Read More <i class="ri-arrow-right-line ml-1"></i></a>' +
            '<button onclick="toggleBookmark(\'' + safePermalink + '\', \'' + safeTitle + '\', \'' + safeImg + '\', \'' + safeLabel + '\')" class="card-action-btn card-remove-btn" title="Remove bookmark" aria-label="Remove bookmark">' +
              '<i class="ri-delete-bin-line"></i>' +
            '</button>' +
          '</div>' +
        '</div>' +
      '</article>';
    }).join('');
  };

  // ─── Comments ──────────────────────────────────────────────
  function formatCommentText(key, values) {
    var text = t(key);
    Object.keys(values || {}).forEach(function (name) {
      text = text.replace('{' + name + '}', values[name]);
    });
    return text;
  }

  function renderCommentIdentity(comment, headingTag) {
    var author = comment.author_name || t('comments.anonymous');
    var initial = (Array.from(author)[0] || '?').toUpperCase();
    var heading = headingTag || 'h3';
    var date = '<time class="blog-comment-date">' + new Date(comment.created_at).toLocaleDateString(currentLanguage === 'en' ? 'en-US' : 'zh-CN') + '</time>';
    if (comment.userId) {
      var href = '/user/' + encodeURIComponent(comment.userId);
      return '<div class="blog-comment-identity">' +
        '<a class="blog-comment-avatar" href="' + escapeAttr(href) + '" aria-label="' + escapeAttr(author) + '"><img src="/media/user-avatar/' + encodeURIComponent(comment.userId) + '" alt="" loading="lazy" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><span hidden>' + escapeHtml(initial) + '</span></a>' +
        '<div class="blog-comment-author-block"><' + heading + ' class="blog-comment-author"><a href="' + escapeAttr(href) + '">' + escapeHtml(author) + '</a></' + heading + '>' + date + '</div></div>';
    }
    return '<div class="blog-comment-identity"><span class="blog-comment-avatar blog-comment-avatar--anonymous"><span>' + escapeHtml(initial) + '</span></span><div class="blog-comment-author-block"><' + heading + ' class="blog-comment-author">' + escapeHtml(author) + '</' + heading + '>' + date + '</div></div>';
  }

  function renderCommentCard(comment, replies) {
    var author = comment.author_name || t('comments.anonymous');
    var replyLabel = formatCommentText('comments.replyTo', { name: author });
    return '<article class="blog-comment-thread" id="comment-' + escapeAttr(comment.id || '') + '">' +
      '<div class="blog-comment-card">' +
      '<div class="blog-comment-meta">' + renderCommentIdentity(comment, 'h3') + '</div>' +
      '<p class="blog-comment-content">' + escapeHtml(comment.content || '') + '</p>' +
      '<button class="blog-comment-reply-button" type="button" data-comment-reply="' + escapeHtml(comment.id || '') + '" data-comment-author="' + escapeHtml(author) + '" aria-label="' + escapeHtml(replyLabel) + '">' + t('comments.reply') + '</button>' +
      '</div>' +
      (replies && replies.length ? '<div class="blog-comment-replies">' + replies.map(function (reply) {
        return '<article class="blog-comment-card blog-comment-card--reply" id="comment-' + escapeAttr(reply.id || '') + '">' +
          '<div class="blog-comment-meta">' + renderCommentIdentity(reply, 'h4') + '</div>' +
          '<p class="blog-comment-content">' + escapeHtml(reply.content || '') + '</p>' +
        '</article>';
      }).join('') + '</div>' : '') +
    '</article>';
  }

  function setCommentStatus(panel, message) {
    var status = panel.querySelector('[data-comments-status]');
    if (status) status.textContent = message || '';
  }

  function renderCommentList(panel, comments) {
    var list = panel.querySelector('[data-comments-list]');
    if (!list) return;
    panel.__comments = comments;
    if (!comments.length) {
      list.innerHTML = '<article class="blog-comment-card"><h3 class="blog-comment-author">' + t('comments.emptyTitle') + '</h3><p class="blog-comment-content">' + t('comments.emptyDescription') + '</p></article>';
    } else {
      var roots = comments.filter(function (comment) { return !comment.parent_id; });
      var rootIds = Object.create(null);
      roots.forEach(function (comment) { rootIds[comment.id] = true; });
      comments.forEach(function (comment) {
        if (comment.parent_id && !rootIds[comment.parent_id]) roots.push(comment);
      });
      list.innerHTML = roots.slice().reverse().map(function (comment) {
        var replies = comments.filter(function (reply) { return reply.parent_id === comment.id; });
        return renderCommentCard(comment, replies);
      }).join('');
    }
    setCommentStatus(panel, comments.length ? comments.length + (currentLanguage === 'en' ? (comments.length === 1 ? ' comment' : ' comments') : ' 条评论') : '');
  }

  function loadComments(panel) {
    var permalink = panel.getAttribute('data-comment-permalink');
    var list = panel.querySelector('[data-comments-list]');
    if (!permalink || !list) return;
    setCommentStatus(panel, t('comments.loading'));
    fetch('/api/comments/article/' + encodeURIComponent(permalink))
      .then(function (res) {
        if (!res.ok) throw new Error(t('comments.loadFailed'));
        return res.json();
      })
      .then(function (data) {
        var comments = data.comments || [];
        renderCommentList(panel, comments);
      })
      .catch(function () {
        setCommentStatus(panel, t('comments.unavailable'));
      });
  }

  function initComments() {
    var panel = document.querySelector('[data-comments]');
    if (!panel) return;
    var form = panel.querySelector('[data-comment-form]');
    var replyContext = panel.querySelector('[data-comment-reply-context]');
    var replyName = panel.querySelector('[data-comment-reply-name]');
    var parentField = form && form.querySelector('[name="parentId"]');
    var contentField = form && form.querySelector('[name="content"]');
    loadComments(panel);
    if (!form) return;
    function clearReply() {
      if (parentField) parentField.value = '';
      if (replyName) replyName.textContent = '';
      if (replyContext) replyContext.hidden = true;
    }
    panel.addEventListener('click', function (event) {
      var replyButton = event.target.closest('[data-comment-reply]');
      if (replyButton) {
        if (parentField) parentField.value = replyButton.getAttribute('data-comment-reply') || '';
        if (replyName) replyName.textContent = replyButton.getAttribute('data-comment-author') || t('comments.anonymous');
        if (replyContext) replyContext.hidden = false;
        form.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
        if (contentField) setTimeout(function () { contentField.focus({ preventScroll: true }); }, 220);
        return;
      }
      if (event.target.closest('[data-comment-reply-cancel]')) clearReply();
    });
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var permalink = panel.getAttribute('data-comment-permalink');
      var button = form.querySelector('.blog-comment-submit');
      var payload = Object.fromEntries(new FormData(form).entries());
      if (button) button.disabled = true;
      setCommentStatus(panel, t('comments.submitting'));
      fetch('/api/comments/article/' + encodeURIComponent(permalink), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(function (res) {
          if (!res.ok) return res.json().then(function (data) { throw new Error(data.error || t('comments.submitFailed')); });
          return res.json();
        })
        .then(function (data) {
          form.reset();
          clearReply();
          if (data && data.comment) {
            renderCommentList(panel, [data.comment].concat(panel.__comments || []));
            setTimeout(function () { loadComments(panel); }, 4000);
          } else {
            loadComments(panel);
          }
          setCommentStatus(panel, t('comments.published'));
        })
        .catch(function (error) {
          setCommentStatus(panel, error.message || t('comments.submitFailed'));
        })
        .finally(function () {
          if (button) button.disabled = false;
        });
    });
  }

  function initArticleQuickActions() {
    var commentsTarget = document.getElementById('comments');
    var commentsButton = document.querySelector('[data-article-action="comments"]');
    if (!commentsButton || !commentsTarget || commentsButton.dataset.ready === 'true') return;

    commentsButton.dataset.ready = 'true';
    commentsButton.hidden = false;
    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function alignComments() {
      commentsTarget.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    }

    commentsButton.addEventListener('click', function () {
      alignComments();
      window.setTimeout(alignComments, 700);
      window.setTimeout(alignComments, 2200);
    });
  }

  function initArticleToc() {
    var toc = document.querySelector('[data-article-toc]');
    var content = document.querySelector('[data-article-content]');
    if (!toc || !content) return;

    var headings = Array.from(content.querySelectorAll('h2, h3'));
    toc.__headings = headings;
    if (!headings.length) {
      toc.innerHTML = '<p class="article-toc-empty">' + t('sidebar.noToc') + '</p>';
      return;
    }

    toc.innerHTML = headings.map(function (heading, index) {
      var id = 'article-section-' + (index + 1);
      heading.id = id;
      heading.style.scrollMarginTop = '6.5rem';
      return '<a href="#' + id + '" class="article-toc-link ' + (heading.tagName === 'H3' ? 'is-subsection' : '') + '" data-toc-index="' + index + '">' + escapeHtml(heading.textContent) + '</a>';
    }).join('');

    toc.querySelectorAll('.article-toc-link').forEach(function (link) {
      link.addEventListener('click', function (event) {
        event.preventDefault();
        var heading = toc.__headings[Number(link.dataset.tocIndex)];
        if (heading) heading.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
      });
    });

    function updateActiveToc() {
      var activeIndex = 0;
      (toc.__headings || []).forEach(function (heading, index) {
        if (heading.getBoundingClientRect().top <= 170) activeIndex = index;
      });
      toc.querySelectorAll('.article-toc-link').forEach(function (link, index) {
        link.classList.toggle('is-active', index === activeIndex);
        link.classList.toggle('is-read', index < activeIndex);
        link.classList.toggle('is-upcoming', index > activeIndex);
      });
      toc.__ticking = false;
    }

    if (!toc.__scrollBound) {
      toc.__scrollBound = true;
      window.addEventListener('scroll', function () {
        if (toc.__ticking) return;
        toc.__ticking = true;
        window.requestAnimationFrame(updateActiveToc);
      }, { passive: true });
    }
    updateActiveToc();
  }

  // ─── User Auth ─────────────────────────────────────────────
  function setAuthStatus(message) {
    var status = document.querySelector('[data-user-auth-status]');
    if (status) status.textContent = message || '';
  }

  function setNotificationCount(count) {
    var safeCount = Math.max(0, Number(count) || 0);
    var label = safeCount > 99 ? '99+' : String(safeCount);
    var menuCount = document.querySelector('[data-user-menu-notification-count]');
    if (menuCount) {
      menuCount.textContent = label;
      menuCount.classList.toggle('hidden', safeCount === 0);
    }
  }

  function fetchNotificationCount() {
    return fetch('/api/notifications/unread-count', { headers: { Accept: 'application/json' } })
      .then(function (res) { return res.ok ? res.json() : { unreadCount: 0 }; })
      .then(function (data) { setNotificationCount(data.unreadCount); return Number(data.unreadCount || 0); })
      .catch(function () { setNotificationCount(0); return 0; });
  }

  function updateUserNav(user) {
    var authLink = document.querySelector('[data-user-auth-link]');
    var menu = document.querySelector('[data-user-menu]');
    var name = document.querySelector('[data-user-name]');
    if (!authLink || !menu) return;

    if (user) {
      authLink.classList.add('hidden');
      menu.classList.remove('hidden');
      if (name) name.textContent = user.displayName || user.email || (currentLanguage === 'zh' ? '用户' : 'User');
      fetchNotificationCount();
    } else {
      authLink.classList.remove('hidden');
      menu.classList.add('hidden');
      setNotificationCount(0);
      if (name) name.textContent = currentLanguage === 'zh' ? '用户' : 'User';
    }
  }

  function fetchUserSession() {
    return fetch('/api/auth/session')
      .then(function (res) { return res.ok ? res.json() : { authenticated: false }; })
      .then(function (data) {
        updateUserNav(data.authenticated ? data.user : null);
        return data;
      })
      .catch(function () {
        updateUserNav(null);
        return { authenticated: false };
      });
  }

  function profileRequest(url, options) {
    return fetch(url, Object.assign({ headers: { Accept: 'application/json' } }, options || {})).then(function (response) {
      return response.json().catch(function () { return {}; }).then(function (data) {
        if (!response.ok) {
          var error = new Error(data.error || 'PROFILE_REQUEST_FAILED');
          error.code = data.error || 'PROFILE_REQUEST_FAILED';
          error.status = response.status;
          throw error;
        }
        return data;
      });
    });
  }

  function setProfileStatus(root, message, state) {
    var status = root.querySelector('[data-profile-status]');
    if (!status) return;
    status.textContent = message || '';
    status.dataset.state = state || '';
  }

  function renderProfileAvatar(root, profile, cacheBust) {
    var image = root.querySelector('[data-profile-avatar]');
    var initials = root.querySelector('[data-profile-initials]');
    var name = String(profile && profile.displayName || '').trim();
    if (initials) initials.textContent = (Array.from(name)[0] || 'U').toUpperCase();
    if (!image) return;
    image.onerror = function () { image.hidden = true; };
    if (profile && profile.avatarUrl) {
      image.hidden = false;
      image.alt = name;
      image.src = profile.avatarUrl + (cacheBust ? ('?v=' + encodeURIComponent(cacheBust)) : '');
    } else {
      image.hidden = true;
      image.removeAttribute('src');
    }
  }

  function renderProfileFields(root, profile) {
    var name = root.querySelector('[data-profile-name]');
    var email = root.querySelector('[data-profile-email]');
    var bio = root.querySelector('[data-profile-bio]');
    var count = root.querySelector('[data-profile-published-count]');
    var joined = root.querySelector('[data-profile-joined]');
    if (name) name.textContent = profile.displayName || '—';
    if (email) email.textContent = profile.email || '—';
    if (bio) textContentOrFallback(bio, profile.bio, t('profile.noBio'));
    if (count) count.textContent = String(Math.max(0, Number(profile.publishedCount) || 0));
    if (joined) joined.textContent = profile.createdAt ? new Intl.DateTimeFormat(currentLanguage === 'en' ? 'en-US' : 'zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(profile.createdAt)) : '—';
    renderProfileAvatar(root, profile);
  }

  function textContentOrFallback(element, value, fallback) {
    element.textContent = String(value || '').trim() || fallback;
    element.classList.toggle('is-empty', !String(value || '').trim());
  }

  function initAccountProfile() {
    var root = document.querySelector('[data-account-page]');
    if (!root) return;
    var form = root.querySelector('[data-profile-form]');
    var view = root.querySelector('[data-profile-view]');
    var edit = root.querySelector('[data-profile-edit]');
    var cancel = root.querySelector('[data-profile-cancel]');
    var uploadLabel = root.querySelector('[data-profile-upload-label]');
    var avatarHint = root.querySelector('[data-profile-avatar-hint]');
    var avatarInput = root.querySelector('[data-profile-avatar-input]');
    var nameInput = form && form.elements.displayName;
    var emailInput = form && form.elements.email;
    var bioInput = form && form.elements.bio;
    var saved = null;
    var previewUrl = '';

    function updateCounters() {
      var nameCount = root.querySelector('[data-profile-name-count]');
      var bioCount = root.querySelector('[data-profile-bio-count]');
      if (nameCount) nameCount.textContent = String(Array.from(nameInput?.value || '').length);
      if (bioCount) bioCount.textContent = String(Array.from(bioInput?.value || '').length);
    }
    function fillForm() {
      if (!saved || !form) return;
      nameInput.value = saved.displayName || '';
      emailInput.value = saved.email || '';
      bioInput.value = saved.bio || '';
      updateCounters();
    }
    function setEditing(isEditing) {
      if (!form || !view) return;
      form.classList.toggle('hidden', !isEditing);
      view.classList.toggle('hidden', isEditing);
      if (uploadLabel) uploadLabel.classList.toggle('hidden', !isEditing);
      if (avatarHint) avatarHint.classList.toggle('hidden', !isEditing);
      if (edit) edit.classList.toggle('hidden', isEditing);
      if (isEditing) { fillForm(); nameInput.focus(); }
    }
    function renderSaved() {
      if (!saved) return;
      renderProfileFields(root, saved);
      fillForm();
    }
    setProfileStatus(root, t('profile.loading'));
    profileRequest('/api/user/profile').then(function (data) {
      saved = data.profile;
      renderSaved();
      setProfileStatus(root, '');
    }).catch(function (error) {
      if (error.status === 401) { window.location.replace('/login?returnTo=%2Faccount'); return; }
      setProfileStatus(root, t('profile.loadFailed'), 'error');
    });
    if (edit) edit.addEventListener('click', function () { setProfileStatus(root, ''); setEditing(true); });
    if (cancel) cancel.addEventListener('click', function () {
      fillForm();
      renderSaved();
      setEditing(false);
      setProfileStatus(root, '');
    });
    [nameInput, bioInput].forEach(function (input) { if (input) input.addEventListener('input', updateCounters); });
    if (form) form.addEventListener('submit', function (event) {
      event.preventDefault();
      var displayName = nameInput.value.trim();
      if (!displayName) { setProfileStatus(root, t('profile.nameRequired'), 'error'); nameInput.focus(); return; }
      var controls = Array.from(form.querySelectorAll('button,input,textarea'));
      controls.forEach(function (control) { control.disabled = true; });
      setProfileStatus(root, t('profile.saving'), 'saving');
      profileRequest('/api/user/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ displayName: displayName, bio: bioInput.value }) })
        .then(function (data) {
          saved = data.profile;
          renderSaved();
          setEditing(false);
          setProfileStatus(root, t('profile.saved'), 'success');
          return fetchUserSession();
        }).catch(function () { setProfileStatus(root, t('profile.saveFailed'), 'error'); })
        .finally(function () { controls.forEach(function (control) { control.disabled = false; }); });
    });
    if (avatarInput) avatarInput.addEventListener('change', function () {
      var file = avatarInput.files && avatarInput.files[0];
      if (!file) return;
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setProfileStatus(root, t('profile.avatarInvalid'), 'error'); avatarInput.value = ''; return; }
      if (file.size > 5 * 1024 * 1024) { setProfileStatus(root, t('profile.avatarTooLarge'), 'error'); avatarInput.value = ''; return; }
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      previewUrl = URL.createObjectURL(file);
      renderProfileAvatar(root, { displayName: nameInput.value || saved?.displayName, avatarUrl: previewUrl });
      var body = new FormData(); body.append('avatar', file);
      setProfileStatus(root, t('profile.uploading'), 'saving');
      profileRequest('/api/user/avatar', { method: 'POST', body: body })
        .then(function (data) { saved = data.profile; renderProfileAvatar(root, saved, Date.now()); setProfileStatus(root, t('profile.saved'), 'success'); return fetchUserSession(); })
        .catch(function () { renderSaved(); setProfileStatus(root, t('profile.uploadFailed'), 'error'); })
        .finally(function () { if (previewUrl) URL.revokeObjectURL(previewUrl); previewUrl = ''; avatarInput.value = ''; });
    });
    document.addEventListener('blog:languagechange', function () { if (saved) renderSaved(); });
  }

  function initPublicProfile() {
    var root = document.querySelector('[data-public-profile-page]');
    if (!root) return;
    var userId = root.getAttribute('data-profile-user-id');
    var loadedProfile = null;
    var errorStatus = 0;
    setProfileStatus(root, t('profile.loading'));
    profileRequest('/api/users/' + encodeURIComponent(userId) + '/profile').then(function (data) {
      loadedProfile = data.profile;
      renderProfileFields(root, loadedProfile);
      setProfileStatus(root, '');
    }).catch(function (error) {
      errorStatus = error.status || 500;
      setProfileStatus(root, error.status === 404 ? t('profile.notFound') : t('profile.loadFailed'), 'error');
    });
    document.addEventListener('blog:languagechange', function () {
      if (loadedProfile) renderProfileFields(root, loadedProfile);
      if (errorStatus) setProfileStatus(root, errorStatus === 404 ? t('profile.notFound') : t('profile.loadFailed'), 'error');
    });
  }

  function postAuth(url, form) {
    var button = form.querySelector('button[type="submit"]');
    var payload = Object.fromEntries(new FormData(form).entries());
    if (button) button.disabled = true;
    setAuthStatus(t('auth.processing'));
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (res) {
        return res.json().then(function (data) {
          if (!res.ok) throw new Error(data.error || t('auth.failed'));
          return data;
        });
      })
      .then(function (data) {
        updateUserNav(data.user);
        setAuthStatus(t('auth.loggedIn'));
        var requested = new URLSearchParams(window.location.search).get('returnTo') || '/';
        var returnTo = /^\/(?!\/)/.test(requested) ? requested : '/';
        window.setTimeout(function () { window.location.href = returnTo; }, 450);
      })
      .catch(function (error) {
        setAuthStatus(error.message || t('auth.failed'));
      })
      .finally(function () {
        if (button) button.disabled = false;
      });
  }

  function initUserAuth() {
    var loginForm = document.querySelector('[data-user-login-form]');
    var registerForm = document.querySelector('[data-user-register-form]');
    var tabs = Array.from(document.querySelectorAll('[data-auth-tab]'));

    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        var mode = tab.getAttribute('data-auth-tab');
        tabs.forEach(function (item) { item.classList.toggle('is-active', item === tab); });
        if (loginForm) loginForm.classList.toggle('hidden', mode !== 'login');
        if (registerForm) registerForm.classList.toggle('hidden', mode !== 'register');
        setAuthStatus('');
      });
    });

    if (loginForm) {
      loginForm.addEventListener('submit', function (event) {
        event.preventDefault();
        postAuth('/api/auth/login', loginForm);
      });
    }

    if (registerForm) {
      registerForm.addEventListener('submit', function (event) {
        event.preventDefault();
        postAuth('/api/auth/register', registerForm);
      });
    }

    fetchUserSession().then(function (data) {
      if (data.authenticated && (loginForm || registerForm)) {
        setAuthStatus(t('auth.alreadyLoggedIn'));
      }
    });
  }

  function initUserNav() {
    var logout = document.querySelector('[data-user-logout]');
    var trigger = document.querySelector('[data-user-account-trigger]');
    var accountMenu = document.querySelector('[data-user-account-menu]');
    fetchUserSession();
    function closeAccountMenu() {
      if (accountMenu) accountMenu.classList.add('hidden');
      if (trigger) trigger.setAttribute('aria-expanded', 'false');
    }
    if (trigger && accountMenu) {
      trigger.addEventListener('click', function (event) {
        event.stopPropagation();
        var opening = accountMenu.classList.contains('hidden');
        accountMenu.classList.toggle('hidden', !opening);
        trigger.setAttribute('aria-expanded', String(opening));
      });
      document.addEventListener('click', function (event) {
        if (!accountMenu.contains(event.target) && !trigger.contains(event.target)) closeAccountMenu();
      });
      document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') closeAccountMenu();
      });
    }
    if (!logout) return;
    logout.addEventListener('click', function () {
      logout.disabled = true;
      fetch('/api/auth/logout', { method: 'POST' })
        .then(function () {
          closeAccountMenu();
          updateUserNav(null);
          if (window.location.pathname === '/login' || window.location.pathname === '/login/') {
            setAuthStatus(t('auth.loggedOut'));
          }
        })
        .finally(function () { logout.disabled = false; });
    });
  }

  // ─── User Notifications ──────────────────────────────────
  function initNotifications() {
    var root = document.querySelector('[data-notifications-page]');
    if (!root) return;
    var list = root.querySelector('[data-notifications-list]');
    var summary = root.querySelector('[data-notification-summary]');
    var readAll = root.querySelector('[data-notifications-read-all]');
    var loadMore = root.querySelector('[data-notifications-load-more]');
    var status = root.querySelector('[data-notifications-status]');
    var state = { items: [], nextCursor: '', unreadCount: 0, loading: false };

    function fill(template, values) {
      return String(template || '').replace(/\{([^}]+)\}/g, function (_match, key) {
        return values[key] == null ? '' : String(values[key]);
      });
    }

    function notificationCopy(item) {
      var payload = item.payload || {};
      var actor = payload.actorName || (currentLanguage === 'zh' ? '有人' : 'Someone');
      var article = payload.articleTitle || (currentLanguage === 'zh' ? '这篇文章' : 'this article');
      var mapping = {
        comment_reply: ['ri-reply-line', 'notifications.commentReplyTitle', 'notifications.commentReplyText'],
        article_comment: ['ri-chat-3-line', 'notifications.articleCommentTitle', 'notifications.articleCommentText'],
        submission_approved: ['ri-checkbox-circle-line', 'notifications.approvedTitle', 'notifications.approvedText'],
        submission_rejected: ['ri-close-circle-line', 'notifications.rejectedTitle', 'notifications.rejectedText'],
        customer_service_reply: ['ri-customer-service-2-line', 'notifications.customerTitle', 'notifications.customerText']
      };
      var config = mapping[item.type] || ['ri-notification-3-line', 'notifications.title', 'notifications.subtitle'];
      return {
        icon: config[0],
        title: fill(t(config[1]), { actor: actor, article: article }),
        text: fill(t(config[2]), { actor: actor, article: article })
      };
    }

    function render() {
      summary.textContent = state.unreadCount
        ? fill(t('notifications.unreadSummary'), { count: state.unreadCount })
        : t('notifications.allRead');
      readAll.disabled = state.unreadCount === 0 || state.loading;
      setNotificationCount(state.unreadCount);
      if (!state.items.length) {
        list.innerHTML = '<div class="notifications-empty"><i class="ri-notification-off-line" aria-hidden="true"></i><h2>' + escapeHtml(t('notifications.emptyTitle')) + '</h2><p>' + escapeHtml(t('notifications.emptyText')) + '</p></div>';
      } else {
        list.innerHTML = state.items.map(function (item) {
          var copy = notificationCopy(item);
          var unread = !item.readAt;
          return '<button type="button" class="notification-item' + (unread ? ' is-unread' : '') + '" data-notification-id="' + escapeAttr(item.id) + '" data-notification-href="' + escapeAttr(item.href || '/notifications') + '">' +
            '<span class="notification-item-icon"><i class="' + copy.icon + '" aria-hidden="true"></i></span>' +
            '<span class="notification-item-copy"><strong>' + escapeHtml(copy.title) + '</strong><span>' + escapeHtml(copy.text) + '</span><time datetime="' + escapeAttr(item.createdAt) + '">' + escapeHtml(new Date(item.createdAt).toLocaleString(currentLanguage === 'en' ? 'en-US' : 'zh-CN', { dateStyle: 'medium', timeStyle: 'short' })) + '</time></span>' +
            (unread ? '<span class="notification-unread-dot" aria-hidden="true"></span>' : '') +
            '<i class="ri-arrow-right-s-line notification-item-arrow" aria-hidden="true"></i>' +
          '</button>';
        }).join('');
      }
      list.setAttribute('aria-busy', 'false');
      loadMore.classList.toggle('hidden', !state.nextCursor);
      loadMore.disabled = state.loading;
    }

    function load(reset) {
      if (state.loading) return Promise.resolve();
      state.loading = true;
      var failed = false;
      if (reset) {
        state.items = [];
        state.nextCursor = '';
        list.setAttribute('aria-busy', 'true');
        list.innerHTML = '<p class="notifications-state">' + escapeHtml(t('notifications.loading')) + '</p>';
      }
      var query = state.nextCursor && !reset ? '?limit=30&cursor=' + encodeURIComponent(state.nextCursor) : '?limit=30';
      return fetch('/api/notifications' + query, { headers: { Accept: 'application/json' } })
        .then(function (res) { return res.json().then(function (data) { if (!res.ok) throw new Error(data.error || 'LOAD_FAILED'); return data; }); })
        .then(function (data) {
          state.items = reset ? (data.notifications || []) : state.items.concat(data.notifications || []);
          state.nextCursor = data.nextCursor || '';
          state.unreadCount = Number(data.unreadCount || 0);
          status.textContent = '';
        })
        .catch(function () {
          failed = true;
          list.innerHTML = '<div class="notifications-empty notifications-error"><i class="ri-error-warning-line" aria-hidden="true"></i><h2>' + escapeHtml(t('notifications.error')) + '</h2><button type="button" data-notifications-retry>' + escapeHtml(t('notifications.retry')) + '</button></div>';
          var retry = list.querySelector('[data-notifications-retry]');
          if (retry) retry.addEventListener('click', function () { load(true); });
        })
        .finally(function () {
          state.loading = false;
          if (failed) list.setAttribute('aria-busy', 'false');
          else render();
        });
    }

    list.addEventListener('click', function (event) {
      var itemButton = event.target.closest('[data-notification-id]');
      if (!itemButton) return;
      var id = itemButton.getAttribute('data-notification-id');
      var href = itemButton.getAttribute('data-notification-href') || '/notifications';
      var item = state.items.find(function (entry) { return entry.id === id; });
      if (!item || item.readAt) { window.location.href = href; return; }
      fetch('/api/notifications/read', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: id })
      }).then(function () { window.location.href = href; }).catch(function () { window.location.href = href; });
    });

    readAll.addEventListener('click', function () {
      if (readAll.disabled) return;
      readAll.disabled = true;
      fetch('/api/notifications/read-all', { method: 'POST' })
        .then(function (res) { if (!res.ok) throw new Error('READ_FAILED'); return res.json(); })
        .then(function () {
          var readAt = new Date().toISOString();
          state.items.forEach(function (item) { item.readAt = item.readAt || readAt; });
          state.unreadCount = 0;
          status.textContent = t('notifications.markedAll');
          render();
        })
        .catch(function () { status.textContent = t('notifications.error'); readAll.disabled = false; });
    });
    loadMore.addEventListener('click', function () { load(false); });
    document.addEventListener('blog:languagechange', render);
    load(true);
  }

  // ─── User Article Editor ──────────────────────────────────
  function initPublishEditor() {
    var root = document.querySelector('[data-publish-editor]');
    if (!root) return;

    var form = root.querySelector('[data-publish-form]');
    var titleInput = form.querySelector('[name="title"]');
    var categoryInput = form.querySelector('[name="category"]');
    var excerptInput = form.querySelector('[name="excerpt"]');
    var contentInput = form.querySelector('[name="content"]');
    var coverSelect = form.querySelector('[data-cover-select]');
    var coverUploadInput = form.querySelector('[data-cover-upload-input]');
    var coverUploadTrigger = form.querySelector('[data-cover-upload-trigger]');
    var coverPreview = form.querySelector('[data-cover-preview]');
    var coverPreviewImage = form.querySelector('[data-cover-preview-image]');
    var preview = form.querySelector('[data-editor-preview]');
    var workspace = form.querySelector('.publish-workspace');
    var attachmentInput = form.querySelector('[data-attachment-input]');
    var attachmentList = form.querySelector('[data-attachment-list]');
    var saveState = form.querySelector('[data-publish-save-state]');
    var saveButton = form.querySelector('[data-save-draft]');
    var submitButton = form.querySelector('[data-submit-review]');
    var article = null;
    var assets = [];
    var autosaveTimer = 0;
    var savePromise = null;
    var dirty = false;
    var conflict = false;
    var changeSequence = 0;

    function setEditorStatus(message, state) {
      saveState.textContent = message || '';
      saveState.dataset.state = state || '';
    }

    function apiJson(url, options) {
      return fetch(url, options).then(function (response) {
        return response.text().then(function (text) {
          var data = {};
          try { data = text ? JSON.parse(text) : {}; } catch { data = {}; }
          if (!response.ok) {
            var error = new Error(data.error || 'REQUEST_FAILED');
            error.code = data.error || 'REQUEST_FAILED';
            error.field = data.field || '';
            error.status = response.status;
            throw error;
          }
          return data;
        });
      });
    }

    function localBackupKey() {
      return article ? 'blog_user_draft_' + article.id : '';
    }

    function values() {
      return {
        title: titleInput.value,
        category: categoryInput.value,
        excerpt: excerptInput.value,
        contentMarkdown: contentInput.value,
        coverAssetId: coverSelect.value || null
      };
    }

    function saveLocalBackup() {
      var key = localBackupKey();
      if (!key) return;
      try {
        localStorage.setItem(key, JSON.stringify({
          version: article.version,
          savedAt: new Date().toISOString(),
          values: values()
        }));
      } catch {}
    }

    function restoreLocalBackup() {
      var key = localBackupKey();
      if (!key) return;
      try {
        var backup = JSON.parse(localStorage.getItem(key) || 'null');
        if (!backup || !backup.values || backup.version < article.version) return;
        titleInput.value = backup.values.title || '';
        categoryInput.value = backup.values.category || '';
        excerptInput.value = backup.values.excerpt || '';
        contentInput.value = backup.values.contentMarkdown || '';
        coverSelect.value = backup.values.coverAssetId || '';
        dirty = true;
        setEditorStatus(currentLanguage === 'zh' ? '已恢复本地草稿' : 'Local draft restored', 'local');
      } catch {}
    }

    function safeMarkdown(markdown) {
      return safeArticleMarkdown(markdown, t('publish.previewEmpty'));
    }

    function renderPreview() {
      preview.innerHTML = safeMarkdown(contentInput.value);
    }

    function renderCoverPreview() {
      var selectedAsset = assets.find(function (asset) { return asset.id === coverSelect.value; });
      coverPreview.hidden = !selectedAsset;
      if (!selectedAsset) {
        coverPreviewImage.removeAttribute('src');
        coverPreviewImage.alt = '';
        return;
      }
      coverPreviewImage.src = selectedAsset.url;
      coverPreviewImage.alt = selectedAsset.altText || (currentLanguage === 'zh' ? '封面预览' : 'Cover preview');
    }

    function fillCoverOptions() {
      var selected = coverSelect.value || article?.coverAssetId || '';
      coverSelect.replaceChildren();
      var empty = document.createElement('option');
      empty.value = '';
      empty.textContent = currentLanguage === 'zh' ? '不设置封面' : 'No cover';
      coverSelect.appendChild(empty);
      assets.forEach(function (asset, index) {
        var option = document.createElement('option');
        option.value = asset.id;
        option.textContent = asset.altText || asset.caption || ((currentLanguage === 'zh' ? '图片 ' : 'Image ') + (index + 1));
        coverSelect.appendChild(option);
      });
      coverSelect.value = assets.some(function (asset) { return asset.id === selected; }) ? selected : '';
      renderCoverPreview();
    }

    function renderAttachments() {
      attachmentList.replaceChildren();
      assets.forEach(function (asset) {
        var card = document.createElement('article');
        card.className = 'publish-attachment-card';
        card.dataset.assetId = asset.id;
        var image = document.createElement('img');
        image.src = asset.url;
        image.alt = asset.altText || '';
        image.loading = 'lazy';
        var fields = document.createElement('div');
        fields.className = 'publish-attachment-fields';
        var alt = document.createElement('input');
        alt.maxLength = 160;
        alt.value = asset.altText || '';
        alt.placeholder = currentLanguage === 'zh' ? '替代文字' : 'Alt text';
        var caption = document.createElement('input');
        caption.maxLength = 300;
        caption.value = asset.caption || '';
        caption.placeholder = currentLanguage === 'zh' ? '图片说明' : 'Caption';
        var controls = document.createElement('div');
        controls.className = 'publish-attachment-controls';
        var insert = document.createElement('button');
        insert.type = 'button';
        insert.textContent = currentLanguage === 'zh' ? '插入正文' : 'Insert';
        var remove = document.createElement('button');
        remove.type = 'button';
        remove.textContent = currentLanguage === 'zh' ? '删除' : 'Delete';
        controls.append(insert, remove);
        fields.append(alt, caption, controls);
        card.append(image, fields);
        attachmentList.appendChild(card);

        var metadataTimer = 0;
        function updateMetadata() {
          window.clearTimeout(metadataTimer);
          metadataTimer = window.setTimeout(function () {
            apiJson('/api/user/articles/' + encodeURIComponent(article.id) + '/assets/' + encodeURIComponent(asset.id), {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ altText: alt.value, caption: caption.value })
            }).then(function (data) {
              Object.assign(asset, data.asset);
              fillCoverOptions();
            }).catch(function (error) { setEditorStatus(error.code, 'error'); });
          }, 600);
        }
        alt.addEventListener('input', updateMetadata);
        caption.addEventListener('input', updateMetadata);
        insert.addEventListener('click', function () {
          var markdown = '![' + (alt.value || 'image').replace(/[\[\]]/g, '') + '](' + asset.url;
          if (caption.value) markdown += ' "' + caption.value.replace(/"/g, "'") + '"';
          markdown += ')';
          insertMarkdown('', '', markdown);
        });
        remove.addEventListener('click', function () {
          if (!window.confirm(currentLanguage === 'zh' ? '确定删除这张图片？' : 'Delete this image?')) return;
          apiJson('/api/user/articles/' + encodeURIComponent(article.id) + '/assets/' + encodeURIComponent(asset.id), { method: 'DELETE' })
            .then(function () {
              assets = assets.filter(function (item) { return item.id !== asset.id; });
              if (article.coverAssetId === asset.id) article.coverAssetId = null;
              renderAttachments();
              fillCoverOptions();
              markDirty();
            })
            .catch(function (error) { setEditorStatus(error.code, 'error'); });
        });
      });
      fillCoverOptions();
    }

    function applyArticle(nextArticle, restoreBackup) {
      article = nextArticle;
      assets = Array.isArray(nextArticle.assets) ? nextArticle.assets.slice() : [];
      titleInput.value = nextArticle.title || '';
      categoryInput.value = nextArticle.category || '';
      excerptInput.value = nextArticle.excerpt || '';
      contentInput.value = nextArticle.contentMarkdown || '';
      fillCoverOptions();
      if (restoreBackup) restoreLocalBackup();
      renderAttachments();
      renderPreview();
    }

    function markDirty() {
      if (!article || conflict) return;
      dirty = true;
      changeSequence += 1;
      saveLocalBackup();
      renderPreview();
      setEditorStatus(currentLanguage === 'zh' ? '有未保存的更改' : 'Unsaved changes', 'dirty');
      window.clearTimeout(autosaveTimer);
      autosaveTimer = window.setTimeout(function () { saveDraft(false); }, 3000);
    }

    function saveDraft(force) {
      if (!article || conflict) return Promise.reject(new Error('EDITOR_UNAVAILABLE'));
      if (savePromise) return savePromise.then(function () { return force && dirty ? saveDraft(true) : article; });
      if (!dirty && !force) return Promise.resolve(article);
      window.clearTimeout(autosaveTimer);
      var savingSequence = changeSequence;
      setEditorStatus(currentLanguage === 'zh' ? '正在保存...' : 'Saving...', 'saving');
      savePromise = apiJson('/api/user/articles/' + encodeURIComponent(article.id), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.assign(values(), { version: article.version }))
      }).then(function (data) {
        article = Object.assign(article, data.article);
        assets = data.article.assets || assets;
        dirty = changeSequence !== savingSequence;
        saveLocalBackup();
        setEditorStatus(
          dirty
            ? (currentLanguage === 'zh' ? '保存期间有新的更改' : 'New changes are waiting')
            : (currentLanguage === 'zh' ? '草稿已保存' : 'Draft saved'),
          dirty ? 'dirty' : 'saved'
        );
        if (dirty) {
          window.clearTimeout(autosaveTimer);
          autosaveTimer = window.setTimeout(function () { saveDraft(false); }, 3000);
        }
        return article;
      }).catch(function (error) {
        if (error.code === 'VERSION_CONFLICT') {
          conflict = true;
          window.clearTimeout(autosaveTimer);
          setEditorStatus(currentLanguage === 'zh' ? '草稿已在其他页面更新，请刷新后继续。' : 'This draft changed elsewhere. Refresh to continue.', 'conflict');
        } else {
          setEditorStatus(error.code || error.message, 'error');
        }
        throw error;
      }).finally(function () { savePromise = null; });
      return savePromise;
    }

    function insertMarkdown(before, after, placeholder) {
      var start = contentInput.selectionStart;
      var end = contentInput.selectionEnd;
      var selected = contentInput.value.slice(start, end) || placeholder || '';
      contentInput.setRangeText(before + selected + after, start, end, 'end');
      contentInput.focus();
      markDirty();
    }

    var markdownActions = {
      'heading-2': function () { insertMarkdown('## ', '', 'Heading'); },
      'heading-3': function () { insertMarkdown('### ', '', 'Heading'); },
      bold: function () { insertMarkdown('**', '**', 'bold text'); },
      italic: function () { insertMarkdown('*', '*', 'italic text'); },
      quote: function () { insertMarkdown('> ', '', 'quote'); },
      'ordered-list': function () { insertMarkdown('1. ', '', 'list item'); },
      'unordered-list': function () { insertMarkdown('- ', '', 'list item'); },
      code: function () { insertMarkdown('`', '`', 'code'); },
      link: function () { insertMarkdown('[', '](https://)', 'link text'); },
      'horizontal-rule': function () { insertMarkdown('\n\n---\n\n', '', ''); },
      image: function () { attachmentInput.click(); }
    };

    root.querySelectorAll('[data-markdown-action]').forEach(function (button) {
      button.addEventListener('click', function () {
        var action = markdownActions[button.dataset.markdownAction];
        if (action) action();
      });
    });
    root.querySelectorAll('[data-editor-mode]').forEach(function (button) {
      button.addEventListener('click', function () {
        var showingPreview = button.dataset.editorMode === 'preview';
        workspace.classList.toggle('is-preview', showingPreview);
        root.querySelectorAll('[data-editor-mode]').forEach(function (item) {
          var active = item === button;
          item.classList.toggle('is-active', active);
          item.setAttribute('aria-selected', String(active));
        });
        if (showingPreview) renderPreview();
      });
    });
    [titleInput, categoryInput, excerptInput, contentInput, coverSelect].forEach(function (input) {
      input.addEventListener('input', markDirty);
      input.addEventListener('change', markDirty);
    });
    coverSelect.addEventListener('change', function () {
      renderCoverPreview();
    });

    function uploadImage(file, setAsCover) {
      if (!file || !article) return;
      if (assets.length >= 5 || file.size > 5 * 1024 * 1024) {
        setEditorStatus(currentLanguage === 'zh' ? '图片数量或大小超过限制。' : 'Image count or size exceeds the limit.', 'error');
        return;
      }
      var body = new FormData();
      body.append('image', file);
      setEditorStatus(currentLanguage === 'zh' ? '正在上传图片...' : 'Uploading image...', 'saving');
      apiJson('/api/user/articles/' + encodeURIComponent(article.id) + '/assets', { method: 'POST', body: body })
        .then(function (data) {
          assets.push(data.asset);
          if (setAsCover) article.coverAssetId = data.asset.id;
          renderAttachments();
          if (setAsCover) markDirty();
          setEditorStatus(
            currentLanguage === 'zh' ? (setAsCover ? '封面已上传并选中' : '图片已上传') : (setAsCover ? 'Cover uploaded and selected' : 'Image uploaded'),
            setAsCover ? 'dirty' : 'saved'
          );
        })
        .catch(function (error) {
          var message = error.code || error.message;
          if (error.code === 'STORAGE_QUOTA_REACHED') {
            message = currentLanguage === 'zh'
              ? '图片存储已达到免费额度保护上限，请联系管理员。'
              : 'Image storage reached the free-tier safety limit. Please contact the administrator.';
          }
          setEditorStatus(message, 'error');
        });
    }

    attachmentInput.addEventListener('change', function () {
      var file = attachmentInput.files?.[0];
      attachmentInput.value = '';
      uploadImage(file, false);
    });

    coverUploadInput.addEventListener('change', function () {
      var file = coverUploadInput.files?.[0];
      coverUploadInput.value = '';
      uploadImage(file, true);
    });
    coverUploadTrigger.addEventListener('click', function () {
      coverUploadInput.click();
    });

    saveButton.addEventListener('click', function () {
      saveButton.disabled = true;
      saveDraft(true).catch(function () {}).finally(function () { saveButton.disabled = false; });
    });

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var draft = values();
      if (!draft.title.trim() || !draft.category.trim() || !draft.contentMarkdown.trim()) {
        setEditorStatus(currentLanguage === 'zh' ? '提交前请填写标题、分类和正文。' : 'Title, category, and content are required.', 'error');
        return;
      }
      submitButton.disabled = true;
      dirty = true;
      saveDraft(true)
        .then(function () {
          return apiJson('/api/user/articles/' + encodeURIComponent(article.id) + '/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ version: article.version })
          });
        })
        .then(function () {
          try { localStorage.removeItem(localBackupKey()); } catch {}
          window.location.href = '/my-articles?submitted=1';
        })
        .catch(function (error) { setEditorStatus(error.code || error.message, 'error'); })
        .finally(function () { submitButton.disabled = false; });
    });

    var requestedId = new URLSearchParams(window.location.search).get('id');
    var load = requestedId
      ? apiJson('/api/user/articles/' + encodeURIComponent(requestedId))
      : apiJson('/api/user/articles', { method: 'POST' });
    load.then(function (data) {
      applyArticle(data.article, true);
      if (!requestedId) {
        var url = new URL(window.location.href);
        url.searchParams.set('id', article.id);
        history.replaceState({}, '', url.pathname + url.search);
      }
      setEditorStatus(currentLanguage === 'zh' ? '草稿已就绪' : 'Draft ready', 'saved');
    }).catch(function (error) {
      setEditorStatus(error.code || error.message, 'error');
      form.querySelectorAll('input, textarea, select, button').forEach(function (control) { control.disabled = true; });
    });
  }

  function initMyArticles() {
    var root = document.querySelector('[data-my-articles-page]');
    if (!root) return;
    var list = root.querySelector('[data-my-articles-list]');
    var preview = root.querySelector('[data-my-article-preview]');
    var deleteStatus = root.querySelector('[data-my-articles-delete-status]');
    var tabs = Array.from(root.querySelectorAll('[data-my-articles-status]'));
    var groups = { draft: [], pending: [], published: [], rejected: [] };
    var activeStatus = 'draft';

    function apiJson(url, options) {
      return fetch(url, options).then(function (response) {
        return response.text().then(function (text) {
          var data = {};
          try { data = text ? JSON.parse(text) : {}; } catch { data = {}; }
          if (!response.ok) {
            var error = new Error(data.error || 'REQUEST_FAILED');
            error.code = data.error || 'REQUEST_FAILED';
            error.status = response.status;
            throw error;
          }
          return data;
        });
      });
    }

    function formatArticleDate(value) {
      if (!value) return '';
      try {
        return new Intl.DateTimeFormat(currentLanguage === 'zh' ? 'zh-CN' : 'en', {
          year: 'numeric', month: 'short', day: 'numeric'
        }).format(new Date(value));
      } catch { return value; }
    }

    function articleAction(article) {
      if (article.status === 'draft') {
        return { href: '/publish?id=' + encodeURIComponent(article.id), label: t('myArticles.continue') };
      }
      if (article.status === 'pending' || article.status === 'rejected') {
        return { href: '/my-articles?id=' + encodeURIComponent(article.id), label: t('myArticles.viewSubmission') };
      }
      return {
        href: '/article/' + encodeURIComponent(article.publishedPermalink || article.permalink),
        label: t('myArticles.viewPublished')
      };
    }

    function renderReadonlyPreview(article) {
      if (!article || (article.status !== 'pending' && article.status !== 'rejected')) {
        preview.classList.add('hidden');
        preview.replaceChildren();
        return;
      }
      preview.replaceChildren();
      var close = document.createElement('button');
      close.type = 'button';
      close.className = 'my-article-preview-close';
      close.setAttribute('aria-label', currentLanguage === 'zh' ? '关闭投稿预览' : 'Close submission preview');
      close.innerHTML = '<i class="ri-close-line" aria-hidden="true"></i>';
      var header = document.createElement('header');
      var category = document.createElement('span');
      category.textContent = article.category || t('myArticles.pending');
      var title = document.createElement('h2');
      title.textContent = article.title || t('myArticles.untitled');
      var summary = document.createElement('p');
      summary.textContent = article.excerpt || '';
      header.append(category, title, summary);
      var content = document.createElement('div');
      content.className = 'my-article-preview-content';
      content.innerHTML = safeArticleMarkdown(article.contentMarkdown, '');
      preview.append(close, header, content);
      preview.classList.remove('hidden');
      close.addEventListener('click', function () {
        preview.classList.add('hidden');
        history.replaceState({}, '', '/my-articles');
      });
    }

    function renderGroup() {
      list.replaceChildren();
      var articles = groups[activeStatus] || [];
      if (!articles.length) {
        var empty = document.createElement('div');
        empty.className = 'my-articles-empty';
        empty.innerHTML = '<i class="ri-draft-line" aria-hidden="true"></i>';
        var text = document.createElement('p');
        text.textContent = t('myArticles.empty');
        empty.appendChild(text);
        list.appendChild(empty);
        return;
      }
      articles.forEach(function (article) {
        var card = document.createElement('article');
        card.className = 'my-article-card';
        if (article.coverAssetId) {
          var image = document.createElement('img');
          image.src = '/media/user-articles/' + encodeURIComponent(article.coverAssetId);
          image.alt = '';
          image.loading = 'lazy';
          card.appendChild(image);
        }
        var body = document.createElement('div');
        body.className = 'my-article-card-body';
        var meta = document.createElement('div');
        meta.className = 'my-article-card-meta';
        var category = document.createElement('span');
        category.textContent = article.category || t('myArticles.untitled');
        var updated = document.createElement('time');
        updated.dateTime = article.updatedAt || '';
        updated.textContent = t('myArticles.updated') + ' ' + formatArticleDate(article.updatedAt);
        meta.append(category, updated);
        var title = document.createElement('h2');
        title.textContent = article.title || t('myArticles.untitled');
        var excerpt = document.createElement('p');
        excerpt.textContent = article.excerpt || '';
        var actionData = articleAction(article);
        var action = document.createElement('a');
        action.href = actionData.href;
        action.textContent = actionData.label;
        action.className = 'my-article-card-action';
        var actions = document.createElement('div');
        actions.className = 'my-article-card-actions';
        actions.appendChild(action);
        if (article.status === 'draft') {
          var remove = document.createElement('button');
          remove.type = 'button';
          remove.className = 'my-article-card-delete';
          remove.textContent = t('myArticles.delete');
          remove.addEventListener('click', function () {
            if (!window.confirm(t('myArticles.deleteConfirm'))) return;
            remove.disabled = true;
            remove.textContent = t('myArticles.deleting');
            if (deleteStatus) deleteStatus.textContent = '';
            apiJson('/api/user/articles/' + encodeURIComponent(article.id), { method: 'DELETE' })
              .then(function () {
                groups.draft = groups.draft.filter(function (item) { return item.id !== article.id; });
                renderGroup();
                if (deleteStatus) deleteStatus.textContent = t('myArticles.deleted').replace('{count}', String(groups.draft.length));
              })
              .catch(function () {
                remove.disabled = false;
                remove.textContent = t('myArticles.delete');
                window.alert(t('myArticles.deleteFailed'));
              });
          });
          actions.appendChild(remove);
        }
        body.append(meta, title, excerpt, actions);
        card.appendChild(body);
        list.appendChild(card);
      });
    }

    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        activeStatus = tab.dataset.myArticlesStatus;
        tabs.forEach(function (item) {
          var active = item === tab;
          item.classList.toggle('is-active', active);
          item.setAttribute('aria-selected', String(active));
        });
        renderGroup();
      });
    });

    fetch('/api/user/articles')
      .then(function (response) {
        if (!response.ok) throw new Error('LOAD_FAILED');
        return response.json();
      })
      .then(function (data) {
        (data.articles || []).forEach(function (article) {
          if (groups[article.status]) groups[article.status].push(article);
        });
        var selectedId = new URLSearchParams(window.location.search).get('id');
        var selected = groups.pending.concat(groups.rejected).find(function (article) { return article.id === selectedId; });
        if (selected) {
          activeStatus = selected.status;
          tabs.forEach(function (tab) {
            var active = tab.dataset.myArticlesStatus === selected.status;
            tab.classList.toggle('is-active', active);
            tab.setAttribute('aria-selected', String(active));
          });
          renderReadonlyPreview(selected);
        }
        renderGroup();
      })
      .catch(function () {
        list.textContent = currentLanguage === 'zh' ? '文章加载失败，请稍后重试。' : 'Could not load articles. Please try again.';
      });
  }

  function initAdminAccountMenu() {
    var account = document.querySelector('[data-admin-account]');
    if (!account) return;
    var trigger = account.querySelector('[data-admin-account-trigger]');
    var menu = account.querySelector('[data-admin-account-menu]');
    var logout = account.querySelector('[data-admin-logout]');
    if (!trigger || !menu || !logout) return;

    function closeMenu() {
      menu.hidden = true;
      trigger.setAttribute('aria-expanded', 'false');
    }

    trigger.addEventListener('click', function () {
      var opening = menu.hidden;
      menu.hidden = !opening;
      trigger.setAttribute('aria-expanded', String(opening));
    });
    document.addEventListener('click', function (event) {
      if (!account.contains(event.target)) closeMenu();
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && !menu.hidden) {
        closeMenu();
        trigger.focus();
      }
    });
    logout.addEventListener('click', function () {
      logout.disabled = true;
      fetch('/api/admin/logout', { method: 'POST' })
        .then(function (response) {
          if (!response.ok) throw new Error('退出失败');
          window.location.replace('/admin/');
        })
        .catch(function () {
          logout.disabled = false;
        });
    });
  }

  // ─── Admin ─────────────────────────────────────────────────
  function initAdmin() {
    var loginForm = document.querySelector('[data-admin-login]');
    var status = document.querySelector('[data-admin-status]');
    var submissionsPanel = document.querySelector('[data-admin-submissions]');
    var submissionsList = document.querySelector('[data-admin-submissions-list]');
    var submissionPreview = document.querySelector('[data-admin-submission-preview]');
    var refreshSubmissions = document.querySelector('[data-admin-submissions-refresh]');

    function getAdminReturnTo() {
      var returnTo = new URLSearchParams(window.location.search).get('returnTo');
      if (returnTo === '/admin/customer-service') return returnTo;
      if (returnTo === '/admin/submissions') return returnTo;
      if (/^\/admin\/submissions\/[^/]+$/.test(returnTo || '')) return returnTo;
      return '';
    }

    function setStatus(message) {
      if (status) status.textContent = message || '';
    }

    function submissionDate(value) {
      if (!value) return '';
      try { return new Intl.DateTimeFormat(currentLanguage === 'zh' ? 'zh-CN' : 'en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)); }
      catch { return value; }
    }

    function adminMarkdown(markdown) {
      var source = escapeHtml(String(markdown || '')).replace(/\r\n/g, '\n');
      source = source
        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
        .replace(/^## (.+)$/gm, '<h2>$1</h2>')
        .replace(/^# (.+)$/gm, '<h1>$1</h1>')
        .replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>')
        .replace(/!\[([^\]]*)\]\((\/media\/user-articles\/[A-Za-z0-9-]+)(?: &quot;([^&]*)&quot;)?\)/g, '<figure><img src="$2" alt="$1" loading="lazy"><figcaption>$3</figcaption></figure>')
        .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" rel="noopener noreferrer" target="_blank">$1</a>')
        .replace(/`([^`\n]+)`/g, '<code>$1</code>')
        .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
      return source.split(/\n{2,}/).map(function (block) {
        var text = block.trim();
        if (!text) return '';
        if (/^<(?:h1|h2|h3|blockquote|figure)/.test(text)) return text;
        var lines = text.split('\n');
        if (lines.every(function (line) { return /^- /.test(line); })) {
          return '<ul>' + lines.map(function (line) { return '<li>' + line.slice(2) + '</li>'; }).join('') + '</ul>';
        }
        return '<p>' + lines.join('<br>') + '</p>';
      }).join('');
    }

    function renderSubmission(submission) {
      submissionPreview.replaceChildren();
      var header = document.createElement('header');
      header.className = 'admin-submission-preview-header';
      var heading = document.createElement('div');
      var category = document.createElement('span');
      category.className = 'admin-submission-category';
      category.textContent = submission.category || 'General';
      var title = document.createElement('h3');
      title.textContent = submission.title;
      var meta = document.createElement('p');
      meta.textContent = (submission.authorName || 'User') + ' · ' + submissionDate(submission.submittedAt);
      heading.append(category, title, meta);
      var publish = document.createElement('button');
      publish.className = 'admin-submission-publish';
      publish.type = 'button';
      publish.innerHTML = '<i class="ri-send-plane-fill" aria-hidden="true"></i><span>发布文章</span>';
      header.append(heading, publish);

      var summary = document.createElement('p');
      summary.className = 'admin-submission-summary';
      summary.textContent = submission.excerpt || '未填写摘要';
      var content = document.createElement('div');
      content.className = 'admin-submission-content article-body';
      content.innerHTML = adminMarkdown(submission.contentMarkdown);
      var attachments = document.createElement('div');
      attachments.className = 'admin-submission-assets';
      (submission.assets || []).forEach(function (asset) {
        var figure = document.createElement('figure');
        var image = document.createElement('img');
        image.src = asset.url;
        image.alt = asset.altText || '';
        image.loading = 'lazy';
        var caption = document.createElement('figcaption');
        caption.textContent = asset.caption || asset.altText || '文章附件';
        figure.append(image, caption);
        attachments.appendChild(figure);
      });
      submissionPreview.append(header, summary, content);
      if (attachments.childElementCount) submissionPreview.appendChild(attachments);

      publish.addEventListener('click', function () {
        if (!window.confirm('确认将这篇用户投稿发布到博客？')) return;
        publish.disabled = true;
        publish.querySelector('span').textContent = '正在发布...';
        fetch('/api/admin/submissions/' + encodeURIComponent(submission.id) + '/publish', { method: 'POST' })
          .then(function (res) {
            return res.json().then(function (data) {
              if (!res.ok) throw new Error(data.error || '发布失败。');
              return data;
            });
          })
          .then(function (data) {
            setStatus('投稿已发布：' + data.url);
            submissionPreview.innerHTML = '<div class="admin-submission-success"><i class="ri-checkbox-circle-line" aria-hidden="true"></i><strong>发布成功</strong><a href="' + data.url + '">查看文章</a></div>';
            loadSubmissions();
          })
          .catch(function (error) {
            setStatus(error.message || '发布失败。');
            publish.disabled = false;
            publish.querySelector('span').textContent = '发布文章';
          });
      });
    }

    function loadSubmission(id, selectedButton) {
      submissionsList.querySelectorAll('.admin-submission-item').forEach(function (button) {
        button.classList.toggle('is-active', button === selectedButton);
      });
      submissionPreview.innerHTML = '<div class="admin-submission-empty">正在加载完整内容...</div>';
      fetch('/api/admin/submissions/' + encodeURIComponent(id))
        .then(function (res) {
          return res.json().then(function (data) {
            if (!res.ok) throw new Error(data.error || '加载失败。');
            return data;
          });
        })
        .then(function (data) { renderSubmission(data.submission); })
        .catch(function (error) {
          submissionPreview.innerHTML = '<div class="admin-submission-empty">' + escapeHtml(error.message || '加载失败。') + '</div>';
        });
    }

    function setRefreshLoading(isLoading) {
      if (!refreshSubmissions) return;
      refreshSubmissions.classList.toggle('is-loading', isLoading);
      refreshSubmissions.disabled = isLoading;
      refreshSubmissions.setAttribute('aria-busy', String(isLoading));
    }

    function loadSubmissions(showRefreshState) {
      if (!submissionsList) return;
      if (showRefreshState) setRefreshLoading(true);
      submissionsList.innerHTML = '<div class="admin-submission-list-status">正在加载待审核投稿...</div>';
      var minimumRefreshDelay = showRefreshState
        ? new Promise(function (resolve) { setTimeout(resolve, 600); })
        : Promise.resolve();
      var request = fetch('/api/admin/submissions?status=pending')
        .then(function (res) {
          return res.json().then(function (data) {
            if (!res.ok) throw new Error(data.error || '加载失败。');
            return data;
          });
        });
      Promise.all([request, minimumRefreshDelay])
        .then(function (results) {
          var data = results[0];
          submissionsList.replaceChildren();
          if (!data.submissions || !data.submissions.length) {
            submissionsList.innerHTML = '<div class="admin-submission-list-status">暂无投稿内容~</div>';
            return;
          }
          data.submissions.forEach(function (submission) {
            var button = document.createElement('a');
            button.className = 'admin-submission-item';
            button.href = '/admin/submissions/' + encodeURIComponent(submission.id);
            var title = document.createElement('strong');
            title.textContent = submission.title;
            var meta = document.createElement('span');
            meta.textContent = (submission.authorName || 'User') + ' · ' + submissionDate(submission.submittedAt);
            var arrow = document.createElement('i');
            arrow.className = 'ri-arrow-right-line';
            arrow.setAttribute('aria-hidden', 'true');
            button.append(title, meta, arrow);
            submissionsList.appendChild(button);
          });
        })
        .catch(function (error) {
          submissionsList.innerHTML = '<div class="admin-submission-list-status">' + escapeHtml(error.message || '加载失败。') + '</div>';
        })
        .finally(function () {
          if (showRefreshState) setRefreshLoading(false);
        });
    }

    function completeAdminLogin() {
      var returnTo = getAdminReturnTo();
      if (returnTo) {
        window.location.assign(returnTo);
        return;
      }
      window.location.replace('/admin/');
    }

    if (loginForm) {
      fetch('/api/admin/session')
        .then(function (res) { return res.json(); })
        .then(function (data) { if (data.authenticated) completeAdminLogin(); })
        .catch(function () { /* noop */ });

      loginForm.addEventListener('submit', function (event) {
        event.preventDefault();
        var payload = Object.fromEntries(new FormData(loginForm).entries());
        setStatus('正在登录...');
        fetch('/api/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
          .then(function (res) {
            if (!res.ok) throw new Error('登录失败。');
            return res.json();
          })
          .then(completeAdminLogin)
          .catch(function (error) { setStatus(error.message); });
      });
    } else if (submissionsPanel) {
      loadSubmissions();
    }

    refreshSubmissions?.addEventListener('click', function () {
      loadSubmissions(true);
    });
  }

  function initAdminSubmissionDetail() {
    var root = document.querySelector('[data-admin-submission-detail]');
    if (!root) return;
    var articleRoot = root.querySelector('[data-admin-submission-detail-content]');
    var statusRoot = root.querySelector('[data-admin-submission-detail-status]');
    var submissionId = root.getAttribute('data-submission-id');

    function setDetailStatus(message) {
      if (statusRoot) statusRoot.textContent = message || '';
    }

    function submissionDate(value) {
      if (!value) return '';
      try {
        return new Intl.DateTimeFormat(currentLanguage === 'zh' ? 'zh-CN' : 'en', {
          dateStyle: 'medium',
          timeStyle: 'short'
        }).format(new Date(value));
      } catch { return value; }
    }

    function detailMarkdown(markdown) {
      var source = escapeHtml(String(markdown || '')).replace(/\r\n/g, '\n');
      source = source
        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
        .replace(/^## (.+)$/gm, '<h2>$1</h2>')
        .replace(/^# (.+)$/gm, '<h1>$1</h1>')
        .replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>')
        .replace(/!\[([^\]]*)\]\((\/media\/user-articles\/[A-Za-z0-9-]+)(?: &quot;([^&]*)&quot;)?\)/g, '<figure><img src="$2" alt="$1" loading="lazy"><figcaption>$3</figcaption></figure>')
        .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" rel="noopener noreferrer" target="_blank">$1</a>')
        .replace(/`([^`\n]+)`/g, '<code>$1</code>')
        .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
      return source.split(/\n{2,}/).map(function (block) {
        var text = block.trim();
        if (!text) return '';
        if (/^<(?:h1|h2|h3|blockquote|figure)/.test(text)) return text;
        var lines = text.split('\n');
        if (lines.every(function (line) { return /^- /.test(line); })) {
          return '<ul>' + lines.map(function (line) { return '<li>' + line.slice(2) + '</li>'; }).join('') + '</ul>';
        }
        return '<p>' + lines.join('<br>') + '</p>';
      }).join('');
    }

    function renderDetail(submission) {
      articleRoot.replaceChildren();
      var header = document.createElement('header');
      header.className = 'admin-submission-preview-header';
      var heading = document.createElement('div');
      var category = document.createElement('span');
      category.className = 'admin-submission-category';
      category.textContent = submission.category || 'General';
      var title = document.createElement('h1');
      title.textContent = submission.title;
      var meta = document.createElement('p');
      meta.textContent = (submission.authorName || 'User') + ' · ' + submissionDate(submission.submittedAt);
      heading.append(category, title, meta);

      var publish = document.createElement('button');
      publish.className = 'admin-submission-publish';
      publish.type = 'button';
      publish.innerHTML = '<i class="ri-send-plane-fill" aria-hidden="true"></i><span>发布文章</span>';
      var reject = document.createElement('button');
      reject.className = 'admin-submission-reject';
      reject.type = 'button';
      reject.innerHTML = '<i class="ri-close-circle-line" aria-hidden="true"></i><span>审核不通过</span>';
      var actions = document.createElement('div');
      actions.className = 'admin-submission-actions';
      actions.append(reject, publish);
      if (submission.status !== 'pending') {
        publish.disabled = true;
        reject.disabled = true;
        publish.querySelector('span').textContent = '已处理';
      }
      header.append(heading, actions);

      var summary = document.createElement('p');
      summary.className = 'admin-submission-summary';
      summary.textContent = submission.excerpt || '未填写摘要';
      var content = document.createElement('div');
      content.className = 'admin-submission-content article-body';
      content.innerHTML = detailMarkdown(submission.contentMarkdown);
      var attachments = document.createElement('div');
      attachments.className = 'admin-submission-assets';
      (submission.assets || []).forEach(function (asset) {
        var figure = document.createElement('figure');
        var image = document.createElement('img');
        image.src = asset.url;
        image.alt = asset.altText || '';
        image.loading = 'lazy';
        var caption = document.createElement('figcaption');
        caption.textContent = asset.caption || asset.altText || '文章附件';
        figure.append(image, caption);
        attachments.appendChild(figure);
      });
      articleRoot.append(header, summary, content);
      if (attachments.childElementCount) articleRoot.appendChild(attachments);

      reject.addEventListener('click', function () {
        if (!window.confirm('确认将这篇投稿标记为审核不通过？用户会在“未通过”列表中看到它。')) return;
        reject.disabled = true;
        publish.disabled = true;
        reject.querySelector('span').textContent = '正在处理...';
        fetch('/api/admin/submissions/' + encodeURIComponent(submission.id) + '/reject', { method: 'POST' })
          .then(function (res) {
            return res.json().then(function (data) {
              if (!res.ok) throw new Error(data.error || '操作失败。');
              return data;
            });
          })
          .then(function () {
            articleRoot.innerHTML = '<div class="admin-submission-success"><i class="ri-close-circle-line" aria-hidden="true"></i><strong>已标记为审核不通过</strong><span>用户可在“我的文章”的“未通过”列表查看。</span></div>';
          })
          .catch(function (error) {
            setDetailStatus(error.message || '操作失败。');
            reject.disabled = false;
            publish.disabled = false;
            reject.querySelector('span').textContent = '审核不通过';
          });
      });

      publish.addEventListener('click', function () {
        if (!window.confirm('确认将这篇用户投稿发布到博客？')) return;
        publish.disabled = true;
        publish.querySelector('span').textContent = '正在发布...';
        fetch('/api/admin/submissions/' + encodeURIComponent(submission.id) + '/publish', { method: 'POST' })
          .then(function (res) {
            return res.json().then(function (data) {
              if (!res.ok) throw new Error(data.error || '发布失败。');
              return data;
            });
          })
          .then(function (data) {
            articleRoot.innerHTML = '<div class="admin-submission-success admin-submission-success--published">'
              + '<div class="admin-publish-celebration" aria-hidden="true"><span>🎉</span><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>'
              + '<strong>发布成功</strong><p>文章已经正式发布到博客。</p>'
              + '<a class="admin-submission-success-link" href="' + data.url + '">查看已发布文章<i class="ri-arrow-right-up-line" aria-hidden="true"></i></a></div>';
          })
          .catch(function (error) {
            setDetailStatus(error.message || '发布失败。');
            publish.disabled = false;
            publish.querySelector('span').textContent = '发布文章';
          });
      });
    }

    fetch('/api/admin/submissions/' + encodeURIComponent(submissionId))
      .then(function (res) {
        return res.json().then(function (data) {
          if (!res.ok) throw new Error(data.error || '加载失败。');
          return data;
        });
      })
      .then(function (data) { renderDetail(data.submission); })
      .catch(function (error) {
        articleRoot.innerHTML = '<div class="admin-submission-empty">' + escapeHtml(error.message || '加载失败。') + '</div>';
      });
  }

  // ─── Homepage Init ─────────────────────────────────────────
  function initAveniaGlobe() {
    var canvas = document.querySelector('[data-binary-globe]');
    if (!canvas || !canvas.getContext) return;

    var context = canvas.getContext('2d');
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var width = 0;
    var height = 0;
    var frameRequest = 0;
    var lastPaint = 0;

    function resize() {
      var rect = canvas.getBoundingClientRect();
      var ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      draw(performance.now());
    }

    function hash(row, column, phase) {
      var value = Math.sin((row * 91.71) + (column * 37.19) + (phase * 13.13)) * 43758.5453;
      return value - Math.floor(value);
    }

    function draw(time) {
      if (!width || !height) return;
      context.clearRect(0, 0, width, height);

      var dark = document.documentElement.getAttribute('data-theme') === 'dark';
      var radius = Math.min(width * 0.49, height * 1.08);
      var centerX = width * 0.56;
      var centerY = height * 1.04;
      var fontSize = Math.max(7.4, Math.min(11, radius / 52));
      var rowStep = fontSize * 1.12;
      var columnStep = fontSize * 0.69;
      var phase = reduceMotion ? 0 : time / 720;
      var rowIndex = 0;

      context.save();
      context.beginPath();
      context.arc(centerX, centerY, radius, 0, Math.PI * 2);
      context.clip();
      context.font = fontSize + 'px "DM Mono", "Cascadia Mono", Consolas, monospace';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillStyle = dark ? '#f7f2e9' : '#090909';

      for (var y = centerY - radius; y <= Math.min(height + rowStep, centerY + radius); y += rowStep) {
        var normalizedY = (y - centerY) / radius;
        var halfWidth = radius * Math.sqrt(Math.max(0, 1 - (normalizedY * normalizedY)));
        var drift = reduceMotion ? 0 : Math.sin((phase * 0.34) + (rowIndex * 0.71)) * columnStep * 0.72;
        var startX = centerX - halfWidth + drift;
        var endX = centerX + halfWidth;
        var columnIndex = 0;

        for (var x = startX; x <= endX; x += columnStep) {
          var normalizedX = (x - centerX) / radius;
          var depth = Math.sqrt(Math.max(0, 1 - (normalizedX * normalizedX) - (normalizedY * normalizedY)));
          var sideLight = (normalizedX + 1) * 0.5;
          var texture = hash(rowIndex, columnIndex, Math.floor(phase * 0.42));
          var opacity = 0.08 + (sideLight * 0.4) + (depth * 0.2) + (texture * 0.13);
          context.globalAlpha = Math.min(0.86, Math.max(0.055, opacity));
          context.fillText(hash(rowIndex + 17, columnIndex + 31, Math.floor(phase * 0.16)) > 0.5 ? '1' : '0', x, y);
          columnIndex += 1;
        }
        rowIndex += 1;
      }
      context.restore();
      context.globalAlpha = 1;
    }

    function animate(time) {
      if (time - lastPaint > 42) {
        draw(time);
        lastPaint = time;
      }
      frameRequest = window.requestAnimationFrame(animate);
    }

    var observer = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null;
    if (observer) observer.observe(canvas);
    else window.addEventListener('resize', resize, { passive: true });
    resize();
    if (!reduceMotion) frameRequest = window.requestAnimationFrame(animate);

    window.addEventListener('pagehide', function () {
      if (frameRequest) window.cancelAnimationFrame(frameRequest);
      if (observer) observer.disconnect();
    }, { once: true });
  }

  function initAveniaStats() {
    var values = Array.from(document.querySelectorAll('[data-stat-value]'));
    var stats = Array.from(document.querySelectorAll('[data-avenia-stat]'));
    if (!stats.length) return;

    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var hasStarted = false;

    if (reduceMotion) {
      document.querySelectorAll('.avenia-number-arc animate').forEach(function (animation) {
        animation.remove();
      });
    }

    function startCounters() {
      if (hasStarted) return;
      hasStarted = true;
      stats.forEach(function (stat, index) {
        window.setTimeout(function () { stat.classList.add('is-active'); }, reduceMotion ? 0 : index * 110);
      });
      values.forEach(function (value, index) {
        var target = Number(value.getAttribute('data-stat-value'));
        if (!Number.isFinite(target)) return;
        if (reduceMotion) {
          value.textContent = String(target);
          return;
        }
        value.textContent = '0';
        var startTime = 0;
        var duration = 1400 + index * 120;
        function tick(time) {
          if (!startTime) startTime = time;
          var progress = Math.min(1, (time - startTime) / duration);
          var eased = 1 - Math.pow(1 - progress, 3);
          value.textContent = String(Math.round(target * eased));
          if (progress < 1) window.requestAnimationFrame(tick);
        }
        window.requestAnimationFrame(tick);
      });
    }

    if (reduceMotion) {
      startCounters();
      return;
    }

    // Leave one painted frame at zero before the count-up begins.
    window.requestAnimationFrame(function () {
      window.setTimeout(startCounters, 90);
    });
  }

  function initHomepage() {
    initAveniaGlobe();
    initAveniaStats();
    var articlesData = document.body.getAttribute('data-articles');
    if (articlesData) {
      try {
        var articles = JSON.parse(articlesData);
        if (articles.length > 0) {
          renderArticles(articles);
          document.body.removeAttribute('data-articles');
          return;
        }
      } catch { /* fall through to API fetch */ }
    }
    window.loadArticles(1);
  }

  function hydrateArticleArchiveFromEmbeddedData() {
    var articlesData = document.body.getAttribute('data-articles');
    if (!articlesData) return false;
    try {
      var articles = JSON.parse(articlesData);
      if (!Array.isArray(articles) || !articles.length) return false;
      renderArticles(articles);
      document.body.removeAttribute('data-articles');
      updatePagination(null);
      articleCylinderController = initArticleCylinder();
      return Boolean(articleCylinderController);
    } catch (error) {
      console.error('Error hydrating archive articles:', error);
      return false;
    }
  }

  function initArticleArchive() {
    if (document.body.getAttribute('data-article-layout') === 'cylinder') {
      hydrateArticleArchiveFromEmbeddedData();
      loadAllArticlesForCylinder();
    } else window.loadArticles(1, true);
  }

  // ─── Site Search ──────────────────────────────────────────
  function initSiteSearch() {
    if (document.body.classList.contains('home-redesign')) return;
    var trigger = document.querySelector('[data-site-search-trigger]');
    var layer = document.querySelector('[data-site-search-layer]');
    var dialog = document.querySelector('[data-site-search-dialog]');
    var input = document.querySelector('[data-site-search-input]');
    var results = document.querySelector('[data-site-search-results]');
    var closeButton = document.querySelector('[data-site-search-close]');
    var dragHandle = document.querySelector('[data-site-search-drag-handle]');
    if (!trigger || !layer || !dialog || !input || !results || !closeButton || !dragHandle) return;
    syncSearchLanguage();

    var requestController = null;
    var debounceTimer = 0;
    var lastFocused = null;
    var dragState = null;

    function setDialogOffset(x, y) {
      dialog.dataset.dragX = String(x);
      dialog.dataset.dragY = String(y);
      dialog.style.setProperty('--site-search-drag-x', x + 'px');
      dialog.style.setProperty('--site-search-drag-y', y + 'px');
    }

    function resetDialogOffset() {
      dragState = null;
      dialog.classList.remove('is-dragging');
      setDialogOffset(0, 0);
    }
    function emptyMarkup() {
      return '<div class="site-search-empty"><span>⌕</span><strong>' + escapeHtml(t('search.initialTitle')) + '</strong><p>' + escapeHtml(t('search.initialText')) + '</p></div>';
    }

    function openSearch() {
      lastFocused = document.activeElement;
      resetDialogOffset();
      layer.classList.remove('hidden');
      document.body.classList.add('site-search-open');
      window.requestAnimationFrame(function () {
        layer.classList.add('is-open');
        input.focus();
      });
    }

    function closeSearch() {
      if (requestController) requestController.abort();
      window.clearTimeout(debounceTimer);
      layer.classList.remove('is-open');
      document.body.classList.remove('site-search-open');
      window.setTimeout(function () { layer.classList.add('hidden'); }, 180);
      if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
    }

    dragHandle.addEventListener('pointerdown', function (event) {
      if (window.matchMedia('(max-width: 640px)').matches || event.button !== 0) return;
      event.preventDefault();
      var rect = dialog.getBoundingClientRect();
      dragState = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        offsetX: Number(dialog.dataset.dragX || 0),
        offsetY: Number(dialog.dataset.dragY || 0),
        rect: rect
      };
      dialog.classList.add('is-dragging');
      dragHandle.setPointerCapture(event.pointerId);
    });

    window.addEventListener('pointermove', function (event) {
      if (!dragState || dragState.pointerId !== event.pointerId) return;
      event.preventDefault();
      var edge = 12;
      var dx = event.clientX - dragState.startX;
      var dy = event.clientY - dragState.startY;
      var minX = dragState.offsetX + edge - dragState.rect.left;
      var maxX = dragState.offsetX + window.innerWidth - edge - dragState.rect.right;
      var minY = dragState.offsetY + edge - dragState.rect.top;
      var maxY = dragState.offsetY + window.innerHeight - edge - dragState.rect.bottom;
      setDialogOffset(
        Math.round(Math.max(minX, Math.min(maxX, dragState.offsetX + dx))),
        Math.round(Math.max(minY, Math.min(maxY, dragState.offsetY + dy)))
      );
    });

    function finishDialogDrag(event) {
      if (!dragState || dragState.pointerId !== event.pointerId) return;
      dragState = null;
      dialog.classList.remove('is-dragging');
      if (dragHandle.hasPointerCapture(event.pointerId)) dragHandle.releasePointerCapture(event.pointerId);
    }
    window.addEventListener('pointerup', finishDialogDrag);
    window.addEventListener('pointercancel', finishDialogDrag);
    dragHandle.addEventListener('lostpointercapture', function (event) {
      if (!dragState || dragState.pointerId !== event.pointerId) return;
      dragState = null;
      dialog.classList.remove('is-dragging');
    });

    function renderSearchResults(items, query) {
      if (!items.length) {
        results.innerHTML = '<div class="site-search-empty"><span>∅</span><strong>' + (currentLanguage === 'en' ? 'No matching articles' : '没有找到相关内容') + '</strong><p>' + (currentLanguage === 'en' ? 'Try another keyword or an article category.' : '换一个关键词，或尝试文章分类。') + '</p></div>';
        return;
      }
      results.innerHTML = '<div class="site-search-count">' + (currentLanguage === 'en' ? (items.length + ' results for “' + escapeHtml(query) + '”') : ('找到 ' + items.length + ' 条与“' + escapeHtml(query) + '”相关的文章')) + '</div>' + items.map(function (article) {
        var date = article.createDate ? new Date(article.createDate).toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' }) : '';
        return '<a class="site-search-result" href="/article/' + escapeAttr(article.permalink) + '">' +
          '<span class="site-search-result-index" aria-hidden="true">↗</span>' +
          '<span class="site-search-result-copy"><span class="site-search-result-meta"><em>' + escapeHtml(article.label) + '</em><time>' + escapeHtml(date) + '</time></span>' +
          '<strong>' + escapeHtml(article.title) + '</strong><p>' + escapeHtml(article.excerpt || '') + '</p></span></a>';
      }).join('');
    }

    function runSearch(query) {
      if (requestController) requestController.abort();
      if (query.length < 2) {
        results.innerHTML = emptyMarkup();
        return;
      }
      requestController = new AbortController();
      results.innerHTML = '<div class="site-search-loading"><span></span><p>' + (currentLanguage === 'en' ? 'Searching notes…' : '正在翻阅笔记…') + '</p></div>';
      fetch('/api/search?q=' + encodeURIComponent(query), { signal: requestController.signal, headers: { Accept: 'application/json' } })
        .then(function (response) { if (!response.ok) throw new Error('SEARCH_FAILED'); return response.json(); })
        .then(function (payload) { renderSearchResults(Array.isArray(payload.results) ? payload.results : [], query); })
        .catch(function (error) {
          if (error.name === 'AbortError') return;
          results.innerHTML = '<div class="site-search-empty"><span>!</span><strong>' + (currentLanguage === 'en' ? 'Search is temporarily unavailable' : '暂时无法搜索') + '</strong><p>' + (currentLanguage === 'en' ? 'Please try again shortly.' : '请稍后再试。') + '</p></div>';
        });
    }

    trigger.addEventListener('click', openSearch);
    closeButton.addEventListener('click', closeSearch);
    layer.addEventListener('click', function (event) { if (event.target === layer) closeSearch(); });
    input.addEventListener('input', function () {
      window.clearTimeout(debounceTimer);
      var query = input.value.trim();
      debounceTimer = window.setTimeout(function () { runSearch(query); }, 180);
    });
    document.addEventListener('keydown', function (event) {
      var isTyping = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement && document.activeElement.tagName);
      if (event.key === '/' && !isTyping && layer.classList.contains('hidden')) { event.preventDefault(); openSearch(); }
      if (event.key === 'Escape' && !layer.classList.contains('hidden')) closeSearch();
      if (event.key === 'Tab' && !layer.classList.contains('hidden')) {
        var focusable = Array.from(dialog.querySelectorAll('button, input, a[href]')).filter(function (node) { return !node.disabled; });
        if (!focusable.length) return;
        var first = focusable[0]; var last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    });
  }

  // ─── About Experience ─────────────────────────────────────
  function initAboutExperience() {
    var stage = document.querySelector('[data-about-hello]');
    var keywords = Array.from(document.querySelectorAll('[data-about-keyword]'));
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var finePointer = window.matchMedia('(pointer: fine)').matches;
    var cursor = stage && stage.querySelector('.about-hello-cursor');
    var shapes = stage ? Array.from(stage.querySelectorAll('.about-hello-shape')) : [];
    var pointerTarget = { x: 0, y: 0 };
    var shapePositions = shapes.map(function () { return { x: 0, y: 0 }; });
    var shapeEase = [0.19, 0.13, 0.085];
    var pointerFrame = 0;
    var keywordIndex = Math.max(0, keywords.findIndex(function (item) {
      return item.classList.contains('is-visible');
    }));
    var keywordTimer = 0;

    function positionAboutHelloLayers() {
      if (!stage) return;
      if (cursor) {
        cursor.style.transform = 'translate3d(' + pointerTarget.x.toFixed(2) + 'px,' + pointerTarget.y.toFixed(2) + 'px,0)';
      }
      shapes.forEach(function (shape, index) {
        var position = shapePositions[index];
        var ease = shapeEase[index] || 0.1;
        position.x += (pointerTarget.x - position.x) * ease;
        position.y += (pointerTarget.y - position.y) * ease;
        shape.style.transform = 'translate3d(' + position.x.toFixed(2) + 'px,' + position.y.toFixed(2) + 'px,0)';
      });
      pointerFrame = window.requestAnimationFrame(positionAboutHelloLayers);
    }

    function syncAboutPointerShapes(event) {
      if (!stage) return;
      var bounds = stage.getBoundingClientRect();
      pointerTarget.x = Math.max(0, Math.min(bounds.width, event.clientX - bounds.left));
      pointerTarget.y = Math.max(0, Math.min(bounds.height, event.clientY - bounds.top));
      stage.classList.add('is-pointer-active');
    }

    function resetAboutPointerShapes() {
      if (!stage) return;
      var bounds = stage.getBoundingClientRect();
      pointerTarget.x = bounds.width / 2;
      pointerTarget.y = bounds.height / 2;
      stage.classList.remove('is-pointer-active');
    }

    function showKeyword(nextIndex) {
      keywordIndex = nextIndex % keywords.length;
      keywords.forEach(function (item, index) {
        item.classList.toggle('is-visible', index === keywordIndex);
      });
    }

    function stopKeywordRotation() {
      if (!keywordTimer) return;
      window.clearInterval(keywordTimer);
      keywordTimer = 0;
    }

    function startKeywordRotation() {
      if (reduceMotion || keywords.length < 2 || keywordTimer || document.hidden) return;
      keywordTimer = window.setInterval(function () {
        showKeyword(keywordIndex + 1);
      }, 2400);
    }

    if (stage && !reduceMotion && finePointer) {
      resetAboutPointerShapes();
      shapePositions.forEach(function (position) {
        position.x = pointerTarget.x;
        position.y = pointerTarget.y;
      });
      pointerFrame = window.requestAnimationFrame(positionAboutHelloLayers);
      stage.addEventListener('pointermove', syncAboutPointerShapes);
      stage.addEventListener('pointerleave', resetAboutPointerShapes);
      window.addEventListener('pagehide', function () {
        if (pointerFrame) window.cancelAnimationFrame(pointerFrame);
      }, { once: true });
    }

    if (keywords.length) {
      showKeyword(keywordIndex);
      startKeywordRotation();
      document.addEventListener('visibilitychange', function () {
        if (document.hidden) stopKeywordRotation();
        else startKeywordRotation();
      });
    }
  }

  // ─── Auto-init ─────────────────────────────────────────────
  function init() {
    var path = window.location.pathname;
    initLanguage();
    initArticleLayout();
    initHomeScrollProgress();
    initUserNav();
    initAdminAccountMenu();
    initSiteSearch();
    initBookmarkButtons();
    initArticleActionHints();

    if (path === '/' || path === '') {
      initHomepage();
    } else if (path === '/articles' || path === '/articles/') {
      initArticleArchive();
    } else if (path === '/about' || path === '/about/') {
      initAboutExperience();
    } else if (path.indexOf('/article/') === 0) {
      initComments();
      initArticleQuickActions();
      initArticleToc();
    } else if (path === '/bookmarks' && typeof renderBookmarksPage === 'function') {
      // renderBookmarksPage called inline
    } else if (path === '/admin/' || path === '/admin' || path === '/admin/submissions' || path === '/admin/submissions/') {
      initAdmin();
    } else if (path.indexOf('/admin/submissions/') === 0) {
      initAdminSubmissionDetail();
    } else if (path === '/publish' || path === '/publish/') {
      initPublishEditor();
    } else if (path === '/my-articles' || path === '/my-articles/') {
      initMyArticles();
    } else if (path === '/notifications' || path === '/notifications/') {
      initNotifications();
    } else if (path === '/account' || path === '/account/') {
      initAccountProfile();
    } else if (path.indexOf('/user/') === 0) {
      initPublicProfile();
    } else if (path === '/login' || path === '/login/' || path === '/register' || path === '/register/') {
      initUserAuth();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

