import { NextResponse } from "next/server";
import { runDesignQAAlign } from "@/lib/design-qa-align";

/**
 * POST /api/design-qa-align
 *
 * Body JSON:
 * - designNodes | figmaNodes: 设计侧节点数组（含 x,y,width,height，可选 color,text）
 * - domNodes: DOM 侧节点数组（同上，通常由 getBoundingClientRect + getComputedStyle 序列化）
 * - options?: { designScale?, designOffset?, weights?, minMatchScore? }
 *
 * 纯算法对齐，不调用视觉模型。
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体须为 JSON。" }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "请求体须为对象。" }, { status: 400 });
  }

  const o = body as Record<string, unknown>;
  const domNodes = o.domNodes;
  const designNodes = o.designNodes ?? o.figmaNodes;

  if (!Array.isArray(domNodes)) {
    return NextResponse.json(
      { error: "domNodes 为必填，且必须为数组。" },
      { status: 400 },
    );
  }
  const options =
    o.options && typeof o.options === "object" && !Array.isArray(o.options)
      ? (o.options as Record<string, unknown>)
      : undefined;

  try {
    const parsedOptions = options
      ? {
          designScale:
            typeof options.designScale === "number"
              ? options.designScale
              : undefined,
          designOffset:
            options.designOffset &&
            typeof options.designOffset === "object" &&
            !Array.isArray(options.designOffset)
              ? {
                  x: Number(
                    (options.designOffset as Record<string, unknown>).x ?? 0,
                  ),
                  y: Number(
                    (options.designOffset as Record<string, unknown>).y ?? 0,
                  ),
                }
              : undefined,
          minMatchScore:
            typeof options.minMatchScore === "number"
              ? options.minMatchScore
              : undefined,
          weights:
            options.weights &&
            typeof options.weights === "object" &&
            !Array.isArray(options.weights)
              ? {
                  text: Number(
                    (options.weights as Record<string, unknown>).text ?? NaN,
                  ),
                  position: Number(
                    (options.weights as Record<string, unknown>).position ??
                      NaN,
                  ),
                  size: Number(
                    (options.weights as Record<string, unknown>).size ?? NaN,
                  ),
                }
              : undefined,
        }
      : undefined;

    const cleanWeights = parsedOptions?.weights;
    const weights =
      cleanWeights &&
      [cleanWeights.text, cleanWeights.position, cleanWeights.size].every(
        (n) => Number.isFinite(n),
      )
        ? {
            text: cleanWeights.text,
            position: cleanWeights.position,
            size: cleanWeights.size,
          }
        : undefined;

    const result = runDesignQAAlign({
      designNodes: Array.isArray(designNodes) ? designNodes : [],
      domNodes,
      options: {
        ...parsedOptions,
        weights,
      },
    });

    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "对齐失败";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
