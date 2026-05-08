import sharp from "sharp";

const MAX_EDGE = 1280;

/**
 * 将两张图各自等比缩放至不超过 MAX_EDGE，再白底填充到相同画布，便于模型对齐理解。
 */
export async function alignImagePair(
  designBuf: Buffer,
  devBuf: Buffer,
): Promise<{ designPng: Buffer; devPng: Buffer; width: number; height: number }> {
  const fitInside = async (input: Buffer) => {
    return sharp(input)
      .resize(MAX_EDGE, MAX_EDGE, {
        fit: "inside",
        withoutEnlargement: false,
      })
      .png()
      .toBuffer();
  };

  let d = await fitInside(designBuf);
  let v = await fitInside(devBuf);

  const md = await sharp(d).metadata();
  const mv = await sharp(v).metadata();
  const w = Math.max(md.width ?? 0, mv.width ?? 0);
  const h = Math.max(md.height ?? 0, mv.height ?? 0);

  if (w === 0 || h === 0) {
    throw new Error("无法读取图片尺寸。");
  }

  const pad = async (buf: Buffer) => {
    const m = await sharp(buf).metadata();
    const bw = m.width ?? 0;
    const bh = m.height ?? 0;
    return sharp(buf)
      .extend({
        top: 0,
        left: 0,
        bottom: Math.max(0, h - bh),
        right: Math.max(0, w - bw),
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      })
      .png()
      .toBuffer();
  };

  d = await pad(d);
  v = await pad(v);

  return { designPng: d, devPng: v, width: w, height: h };
}
