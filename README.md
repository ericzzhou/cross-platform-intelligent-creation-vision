# Cross-Platform-Intelligent-Creation-Vision
智创视界: “智创” 体现了借助 AI 进行创新创作的特点，突出了项目利用人工智能技术为用户提供独特价值的核心优势。“视界” 一词既涵盖了照片所呈现的视觉世界，也包含了 PDF 文档所带来的知识视野，象征着该应用能够帮助用户拓展和丰富他们在视觉和知识层面的体验，同时也寓意着这款应用将为用户开启一个全新的、智能的创作与浏览视野。



# 文件处理器创建指南

## 1. 目录结构
```
src/renderer/handlers/[type]/
├── main.js           # 主进程处理器逻辑
├── index.html        # 处理器视图
├── config.json       # 处理器配置
├── preload.js        # 预加载脚本
├── styles/           # 样式文件目录
│   └── [type].css   # 主样式文件
└── scripts/          # 渲染进程脚本目录
    └── [type].js    # 主脚本文件
```

## 2. 必需文件及其作用

### 2.1 config.json
```json
{
  "name": "处理器名称",
  "extensions": ["支持的文件扩展名数组"],
  "window": {
    "width": 窗口宽度,
    "height": 窗口高度,
    "minWidth": 最小宽度,
    "minHeight": 最小高度
  }
}
```

### 2.2 main.js
- 继承 BaseHandler 类
- 实现必要的方法：
  - constructor(filePath)
  - initialize()
  - load()
  - getChannelName(action)
  - setupIPC()
  - updateTitle()

### 2.3 preload.js
- 使用 contextBridge 暴露 API
- 处理 IPC 通信
- 定义渲染进程可用的接口

### 2.4 index.html
- 必须包含的基础结构：
  ```html
  <div class="title-bar">
    <div class="title">未命名</div>
    <div class="window-controls">
      <button class="minimize">...</button>
      <button class="maximize">...</button>
      <button class="close">...</button>
    </div>
  </div>
  ```

## 3. 通用功能实现

### 3.1 窗口控制
- 最小化/最大化/关闭按钮
- ESC 键关闭
- 标题栏拖拽
- 窗口状态同步

### 3.2 文件处理
- 文件拖放支持
- 文件保存提示
- 文件信息显示
- 编码自动识别

### 3.3 标题栏格式
```javascript
const title = modified ? `* ${fileName} [${filePath}]` : `${fileName} [${filePath}]`;
```

## 4. 开发步骤

1. 创建目录结构
2. 配置 config.json
3. 实现主进程逻辑 (main.js)
4. 设计界面 (index.html)
5. 实现渲染进程逻辑
6. 定义预加载脚本
7. 添加样式文件
8. 测试功能

## 5. 注意事项

### 5.1 IPC 通信
- 使用实例特定的通道名称
- 及时清理不再使用的通道
- 验证消息来源

### 5.2 窗口管理
- 检查窗口是否已销毁
- 正确处理窗口关闭事件
- 保持窗口引用

### 5.3 文件处理
- 异步操作使用 try-catch
- 正确处理文件编码
- 保存前检查修改状态

### 5.4 UI 设计
- 保持与其他处理器一致的外观
- 实现响应式布局
- 添加适当的加载和错误状态

## 6. 示例代码

### 6.1 基本处理器结构
```javascript
class TypeHandler extends BaseHandler {
  constructor(filePath) {
    super(filePath);
    this.ipc = ipcMain;
    this.filePath = filePath;
  }

  async initialize() {
    const channels = this.setupIPC();
    this.createWindow({...});
    await this.load();
  }

  setupIPC() {
    const channels = super.setupIPC();
    // 添加处理器特定的 IPC 处理
    return channels;
  }
}
```

### 6.2 预加载脚本结构
```javascript
contextBridge.exposeInMainWorld('typeAPI', {
  // 基础窗口控制
  windowControl: {
    minimize: () => ipcRenderer.invoke(channels.minimize),
    maximize: () => ipcRenderer.invoke(channels.maximize),
    close: () => ipcRenderer.invoke(channels.close)
  },
  // 处理器特定功能
  // ...
});
```

## 7. 测试清单

1. 基础功能
   - [ ] 窗口控制按钮
   - [ ] 文件拖放
   - [ ] ESC 关闭
   - [ ] 标题栏显示

2. 文件操作
   - [ ] 打开文件
   - [ ] 保存文件
   - [ ] 编码识别
   - [ ] 修改提示

3. 界面响应
   - [ ] 窗口缩放
   - [ ] 错误提示
   - [ ] 加载状态
   - [ ] 交互反馈