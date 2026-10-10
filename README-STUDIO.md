# 摸鱼浮画 · 浮画工作室

SakuraBot 本地改版，基于 [zhuanqianfish/MoyuFloat](https://github.com/zhuanqianfish/MoyuFloat)，MIT。原版来源提交：`31a5d1e`。上游 README 保留在 README.md，独立油猴脚本 `mokey/` 保持原版。

Studio adaptation by Ghoscro / Micker. Public source contains editor code, original demonstration artwork and synthetic test fixtures. Private data, credentials and private automation are excluded. The supplied launcher targets loopback only. Outside SakuraBot, serve this directory with any static server; `start.ps1` specifically uses the local SakuraBot port manager.

双击 **启动浮画.cmd**，或运行 `start.ps1`。启动器使用 SakuraBot 端口登记与检查，服务仅监听本机。地址：<http://127.0.0.1:18432/>。已有同一页面时直接打开，不启动第二个服务。需要 PATH 中的 Python；网页无需安装 npm 依赖。

操作顺序：导入图片 → 生成／导入深度 → 选择氛围 → 按 L 拖动灯光 → 对比原图 → 导出 PNG。示例包含原创 SVG 山水与近似手工深度，启动即可试用。

- 暗色编辑工作台、大画布、画布下方六种光照预设、窄屏面板导航。
- 撤销／重做保留最近 12 次编辑，包括画笔和灯光。Ctrl+Z、Ctrl+Shift+Z。
- 保存 `.moyu` 工程文件，包含图片、深度、材质球和参数；打开即可继续。Ctrl+S。
- 重置参数保留当前图片与深度；“体验示例”单独切回示例。
- PNG 导出合成画面，尺寸与当前工作图一致，隐藏灯位和对比分界；另可导出深度 PNG。
- 图像长边最多 4096 像素，还受设备纹理上限限制；工作尺寸显示在界面。超过限制的输入会缩小，因此导出尺寸是显示的工作尺寸。

图片、工程和推理在浏览器本地处理。没有图片上传、遥测或账号。AI 首次使用需要联网加载 ONNX Runtime 与 Depth Anything V2 Small 模型；模型下载完成后尝试存入浏览器缓存。网络、缓存策略和设备兼容性可能影响 AI，失败可重试或使用亮度深度／手工深度。普通渲染、预设、画笔和保存不依赖 AI 下载。

独立网页实际使用原生 WebGL；上游 README 中的 Three.js 描述与该入口实现有差异。新增代码位于 `js/engine.js`、`assets/studio.css`，原始样式位于 `assets/base.css`。设计及验证见 DESIGN.md、docs/REVERSE.md、docs/VERIFICATION.md。

本地模型安装：运行 `python setup_model.py`。下载固定 revision 的公开模型，支持中断续传，完整尺寸及 SHA-256 核验后才安装。页面优先读取校验过的本地文件；模型权重保存在 `models/` 并排除于 Git，下载回执记录来源。公网下载失败可保留 `.part` 后重新运行；首次加载推理组件仍需联网。

Git 中保留上游历史；回退查看 `git show 31a5d1e:index.html`。本轮改版在 `codex/studio-redesign` 分支，原 fork 的 main 保留上游基线。
