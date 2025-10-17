<div align="center">
  <img src="./icon-512.png" alt="项目Logo" width="100" />
  <h1>D&D战斗助手 (D&D Combat Assistant)</h1>
  <p>一款为DM打造的本地化D&D战斗辅助工具</p>
  
  <p>
    <img alt="Vue.js" src="https://img.shields.io/badge/Vue.js-3-4FC08D?style=for-the-badge&logo=vue.js">
    <img alt="Local-First" src="https://img.shields.io/badge/Data-Local First-F7DF1E?style=for-the-badge&logo=javascript">
    <img alt="PWA Ready" src="https://img.shields.io/badge/PWA-Ready-5A0FC8?style=for-the-badge&logo=pwa">
    <img alt="License" src="https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge">
  </p>
</div>

---

## 简介

**D&D战斗助手**是一个纯本地化的战斗辅助工具，无需注册、无需联网、无需付费。所有数据（怪物、PC、战斗记录）都安全地存储在浏览器的 IndexedDB 中，完全由你掌控。

核心理念：**快速、私密、高度可定制**

---

## 核心特性

### 📦 全功能数据库
- **怪物库**：支持按名称、CR、类型筛选
- **PC角色库**：管理玩家角色
- **动作库**：模块化的攻击、法术、能力，方便复用

### ⚔️ 自动化战斗流程
- **先攻管理**：一键掷先攻并自动排序，支持拖拽调整
- **自动化动作执行**：
  - 自动完成命中检定（支持优劣势）
  - 智能判定重击/大失败
  - 自动计算伤害
  - 自动应用易伤、抗性和免疫
- **豁免检定**：完善的范围伤害处理流程
- **状态管理**：自动追踪状态持续回合和动作冷却

### 🎨 深度定制
- **生物编辑器**：从基础属性到伤害抗性，完全可定制
- **头像与背景**：支持图片上传和裁剪，增强视觉体验
- **战斗特效**：重击、大失败等关键检定带有全屏动画通知

### 🔒 本地优先，离线可用
- **数据安全**：所有信息存储在本地，不上传服务器
- **PWA支持**：可安装到桌面或手机，完全支持离线使用
- **数据备份**：通过 JSON 文件导入/导出

### 🚀 高效操作
- **快捷键**：双击 `D` 快速投骰，`→` / `←` 切换回合
- **怪物组合**：预设遭遇组合，一键添加整队敌人
- **便捷交互**：多选目标、一键清空等常用操作

---

## 快速开始

### 🌐 在线使用（推荐）

访问线上地址：[**https://tyyf-dnd-helper.pages.dev/**](https://tyyf-dnd-helper.pages.dev/)

**建议安装为桌面应用：**
- **PC端 (Chrome/Edge)**：点击地址栏的"安装"图标
- **移动端**：使用浏览器的"添加到主屏幕"功能

### 💻 本地部署

```bash
# 克隆仓库
git clone https://github.com/tianyouyingfan/local_simple_dnd_tool.git

# 进入目录
cd local_simple_dnd_tool

# 启动本地服务器（方式一）
npm install -g http-server
http-server

# 或使用 VS Code 的 Live Server 插件（方式二）
```

---

## 使用指南

### 1. 怪物库

**浏览与筛选**
- 按名称搜索、CR筛选、类型筛选

**创建/编辑怪物**
1. 点击"新建怪物"或"编辑"进入编辑器
2. **基础信息**：设置头像、背景、名称、CR、AC、HP等
3. **属性设置**：配置六大属性，调整值自动计算
4. **抗性配置**：添加伤害类型和状态的抗性/易伤/免疫
5. **动作管理**：
   - 创建私有动作
   - 从动作库添加通用能力
6. **CR调整**：实验性功能，自动调整怪物属性匹配目标CR
7. **保存选项**：
   - "更改并关闭"：覆盖原数据
   - "另存为自定义"：创建新怪物

### 2. PC角色库与动作库

- **PC角色库**：管理玩家角色，支持自定义头像和私有动作
- **动作库**：全局动作模板库，预设常用攻击、法术和能力

### 3. 战斗系统

**战前准备**
1. **添加参战者**：从怪物库、PC库或怪物组合中添加
2. **掷先攻**：自动投掷并排序，支持手动拖拽调整

**回合流程**
1. **行动者面板**（左侧）：
   - HP管理：应用伤害/治疗
   - 状态管理：施加和追踪状态效果
   - 选择动作：查看可用动作
   
2. **目标选择**（右侧）：
   - 单击选择/取消目标
   - 支持多选
   - "选择组"快速选中整组单位
   
3. **执行动作**：
   - 设置优势/劣势
   - 点击"执行"按钮
   - 系统自动处理：
     - 攻击检定与AC比较
     - 重击/大失败判定（带全屏动画）
     - 伤害计算（含抗性处理）
     - 豁免检定（弹出选择器）
   
4. **结束回合**：
   - 点击"下一个"切换行动者
   - 自动更新状态持续时间
   - 自动移除已击败单位

### 4. 数据管理

- **导入/导出**：JSON格式备份和恢复所有数据
- **快捷投骰**：双击 `D` 键快速投骰
- **主题切换**：预留功能，待后续版本实现

---

## 技术架构

- **前端框架**：Vue 3 + Composition API
- **状态管理**：轻量级响应式状态管理（reactive/ref）
- **数据持久化**：Dexie.js (IndexedDB 封装)
- **模块化**：清晰的目录结构和职责划分
- **离线支持**：Service Worker 实现 PWA 离线功能

---

## Roadmap

- [ ] 优化怪物图鉴视图，模仿官方排版
- [ ] 改进CR调整算法，引入DMG攻防等级对照表
- [ ] 添加法术库与法术位追踪
- [ ] 战役与地图管理功能
- [ ] 移动端布局优化
- [ ] 完整主题系统（光明/黑暗模式）

---

## 贡献指南

欢迎任何形式的贡献：

- **Bug报告**：通过 GitHub Issues 提交
- **功能建议**：通过 Issues 提出想法
- **代码贡献**：
  1. Fork 仓库
  2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
  3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
  4. Push 到分支 (`git push origin feature/AmazingFeature`)
  5. 开启 Pull Request

---

## 许可协议

本项目采用 [MIT License](LICENSE.txt) 授权。

---

<div align="center">
  <p><strong>祝你的冒险旅程顺利！</strong></p>
</div>