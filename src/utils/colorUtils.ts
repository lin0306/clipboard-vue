/**
 * 颜色工具类 - 使用 colord 库处理颜色对比度和可读性
 */
import { colord, extend } from "colord";
import namesPlugin from "colord/plugins/names";
import mixPlugin from "colord/plugins/mix";
import a11yPlugin from "colord/plugins/a11y";

// 扩展 colord 功能
extend([namesPlugin, mixPlugin, a11yPlugin]);

/**
 * 颜色格式类型
 */
export enum ColorFormat {
  HEX = 'hex',
  RGB = 'rgb',
  RGBA = 'rgba',
  HSL = 'hsl',
  HSV = 'hsv',
  CMYK = 'cmyk',
  NAME = 'name'
}

/**
 * 检测颜色格式类型
 * @param color 颜色字符串
 * @returns 颜色格式类型
 */
export function detectColorFormat(color: string): ColorFormat | null {
  const c = colord(color);
  if (!c.isValid()) return null;
  
  if (color.startsWith('#')) return ColorFormat.HEX;
  if (color.startsWith('rgb(')) return ColorFormat.RGB;
  if (color.startsWith('rgba(')) return ColorFormat.RGBA;
  if (color.startsWith('hsl(')) return ColorFormat.HSL;
  if (color.startsWith('hsv(')) return ColorFormat.HSV;
  if (color.startsWith('cmyk(')) return ColorFormat.CMYK;
  
  // 如果是颜色名称
  if (c.toName()) return ColorFormat.NAME;
  
  return null;
}

/**
 * 将颜色转换为 HEX 格式
 * @param color 任何有效的颜色表示
 * @returns HEX 颜色字符串
 */
export function toHex(color: string): string {
  return colord(color).toHex();
}

/**
 * 将颜色转换为 RGB 格式
 * @param color 任何有效的颜色表示
 * @returns RGB 颜色字符串
 */
export function toRgb(color: string): string {
  return colord(color).toRgbString();
}

/**
 * 将颜色转换为 RGBA 格式
 * @param color 任何有效的颜色表示
 * @param alpha 透明度值 (0-1)
 * @returns RGBA 颜色字符串
 */
export function toRgba(color: string, alpha?: number): string {
  const c = colord(color);
  if (alpha !== undefined) {
    return c.alpha(alpha).toRgbString();
  }
  return c.toRgbString();
}

/**
 * 将颜色转换为 HSL 格式
 * @param color 任何有效的颜色表示
 * @returns HSL 颜色字符串
 */
export function toHsl(color: string): string {
  return colord(color).toHslString();
}

/**
 * 将颜色转换为 HSV 对象
 * @param color 任何有效的颜色表示
 * @returns HSV 对象 {h, s, v}
 */
export function toHsv(color: string): {h: number, s: number, v: number} {
  return colord(color).toHsv();
}

/**
 * 调整颜色亮度
 * @param color 任何有效的颜色表示
 * @param amount 调整量 (-1 到 1)，正值变亮，负值变暗
 * @returns 调整后的颜色
 */
export function adjustBrightness(color: string, amount: number): string {
  const c = colord(color);
  if (amount >= 0) {
    return c.lighten(amount).toHex();
  } else {
    return c.darken(Math.abs(amount)).toHex();
  }
}

/**
 * 调整颜色饱和度
 * @param color 任何有效的颜色表示
 * @param amount 调整量 (-1 到 1)，正值增加饱和度，负值减少饱和度
 * @returns 调整后的颜色
 */
export function adjustSaturation(color: string, amount: number): string {
  const c = colord(color);
  if (amount >= 0) {
    return c.saturate(amount).toHex();
  } else {
    return c.desaturate(Math.abs(amount)).toHex();
  }
}

/**
 * 计算颜色亮度
 * @param color 任何有效的颜色表示
 * @returns 亮度值，范围0-1
 */
export function calculateLuminance(color: string): number {
  return colord(color).luminance();
}

/**
 * 计算两个颜色的对比度
 * @param color1 第一个颜色
 * @param color2 第二个颜色
 * @returns 对比度值 (1-21)
 */
export function calculateContrast(color1: string, color2: string): number {
  return colord(color1).contrast(colord(color2));
}

/**
 * 根据背景色获取适合的文本颜色（黑色或白色）
 * @param backgroundColor 背景颜色
 * @returns 适合的文本颜色，黑色或白色
 */
export function getTextColorForBackground(backgroundColor: string): string {
  // 使用 colord 的 isReadable 方法判断
  const bgColor = colord(backgroundColor);
  
  // 检查白色文本在此背景上是否可读
  const whiteContrast = bgColor.contrast("#ffffff");
  const blackContrast = bgColor.contrast("#000000");
  
  // 返回对比度更高的颜色
  return whiteContrast > blackContrast ? "#ffffff" : "#000000";
}

/**
 * 混合两种颜色
 * @param color1 第一个颜色
 * @param color2 第二个颜色
 * @param ratio 混合比例 (0-1)，0 表示完全是 color1，1 表示完全是 color2
 * @returns 混合后的颜色
 */
export function mixColors(color1: string, color2: string, ratio: number = 0.5): string {
  return colord(color1).mix(color2, ratio).toHex();
}

/**
 * 检查颜色是否有效
 * @param color 要检查的颜色
 * @returns 是否是有效的颜色
 */
export function isValidColor(color: string): boolean {
  return colord(color).isValid();
}