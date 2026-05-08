# Design QA Tool

AI 设计走查工具，用于对比设计稿截图与开发实现截图，输出面向开发落地的 UI 差异报告。

## 当前能力

- 双图上传：设计稿作为基准，开发截图作为实现结果。
- 图片预处理：使用 `sharp` 将两张图缩放并补白到同一画布，降低模型误判。
- 视觉模型走查：支持 OpenAI 或智谱 GLM，返回结构化 JSON。
- 报告展示：一致度、优先级统计、差异类型、修改建议、验收点。
- 区域标注：模型返回 `designRegion` / `devRegion` 时，可在截图预览上高亮差异位置。
- 本地历史：浏览器内保留最近 8 次走查结果。
- 报告导出：支持 Markdown 与 JSON。
- 结构化对齐接口：`/api/design-qa-align` 可接收 Figma/DOM 节点 JSON，做纯算法差异计算。

## 环境变量

复制 `.env.example` 为 `.env.local`，至少配置一个模型供应商：

```env
ZHIPU_API_KEY=
ZHIPU_MODEL=glm-4.5v
```

或：

```env
OPENAI_API_KEY=
OPENAI_VISION_MODEL=gpt-4o-mini
```

可选：

```env
COMPARE_VISION_PROVIDER=zhipu
```

## 开发

```bash
npm run dev
```

打开 `http://localhost:3000`。

## DOM 节点采集

`public/design-qa-dom-collector.js` 是一个浏览器控制台采集脚本。打开需要走查的页面，在控制台粘贴脚本内容运行，它会尽量把可见 DOM 节点复制到剪贴板。

采集结果中的 `domNodes` 可以发送到 `/api/design-qa-align`，与 Figma 导出的 `designNodes` 做结构化对齐。

## 核心文件

- `components/design-qa-workbench.tsx`：前端工作台。
- `app/api/compare/route.ts`：截图对比接口。
- `app/api/design-qa-align/route.ts`：结构化节点对齐接口。
- `lib/compare-prompt.ts`：模型输出协议。
- `lib/parse-design-qa.ts`：模型 JSON 解析。
- `lib/design-qa-align/*`：节点匹配与差异计算。
