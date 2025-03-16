/**
 * 颜色工具类 - 处理颜色对比度和可读性，支持多种颜色格式
 */

/**
 * 颜色类型定义
 */
export type RGB = [number, number, number];
export type RGBA = [number, number, number, number];
export type HSL = [number, number, number];
export type HSV = [number, number, number];

/**
 * 颜色格式类型
 */
export enum ColorFormat {
  HEX = 'hex',
  RGB = 'rgb',
  RGBA = 'rgba',
  HSL = 'hsl',
  HSV = 'hsv'
}

/**
 * 检测颜色格式类型
 * @param color 颜色字符串
 * @returns 颜色格式类型
 */
export function detectColorFormat(color: string): ColorFormat | null {
  // 检测HEX格式 (#fff 或 #ffffff 或 #ffffffff)
  if (/^#([0-9A-F]{3,4}|[0-9A-F]{6}|[0-9A-F]{8})$/i.test(color)) {
    return ColorFormat.HEX;
  }
  
  // 检测RGB格式 (rgb(255, 255, 255))
  if (/^rgb\s*\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/i.test(color)) {
    return ColorFormat.RGB;
  }
  
  // 检测RGBA格式 (rgba(255, 255, 255, 0.5))
  if (/^rgba\s*\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*([0-9]*[.])?[0-9]+\s*\)$/i.test(color)) {
    return ColorFormat.RGBA;
  }
  
  // 检测HSL格式 (hsl(360, 100%, 50%))
  if (/^hsl\s*\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*\)$/i.test(color)) {
    return ColorFormat.HSL;
  }
  
  // 检测HSV格式 (hsv(360, 100%, 100%))
  if (/^hsv\s*\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*\)$/i.test(color)) {
    return ColorFormat.HSV;
  }
  
  return null;
}

/**
 * 将rgba颜色字符串转换为RGBA数组
 * @param rgba rgba颜色字符串，如 'rgba(255, 255, 255, 1)'
 * @returns RGBA数组 [r, g, b, a]
 */
export function rgbaStringToRgba(rgba: string): RGBA {
  // 匹配rgba格式
  const match = rgba.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)/i);
  if (!match) return [0, 0, 0, 1]; // 默认黑色，完全不透明
  
  const alpha = match[4] ? parseFloat(match[4]) : 1;
  return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3]), alpha];
}

/**
 * 将RGBA数组转换为rgba字符串
 * @param rgba RGBA数组 [r, g, b, a]
 * @returns rgba颜色字符串，如 'rgba(255, 255, 255, 0.5)'
 */
export function rgbaToRgbaString(rgba: RGBA): string {
  const [r, g, b, a] = rgba;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/**
 * 将HSL字符串转换为HSL数组
 * @param hsl HSL字符串，如 'hsl(360, 100%, 50%)'
 * @returns HSL数组 [h, s, l]
 */
export function hslStringToHsl(hsl: string): HSL {
  const match = hsl.match(/hsl\s*\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%\s*\)/i);
  if (!match) return [0, 0, 0]; // 默认黑色
  
  return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
}

/**
 * 将HSL数组转换为HSL字符串
 * @param hsl HSL数组 [h, s, l]
 * @returns HSL字符串，如 'hsl(360, 100%, 50%)'
 */
export function hslToHslString(hsl: HSL): string {
  const [h, s, l] = hsl;
  return `hsl(${h}, ${s}%, ${l}%)`;
}

/**
 * 将HSV字符串转换为HSV数组
 * @param hsv HSV字符串，如 'hsv(360, 100%, 100%)'
 * @returns HSV数组 [h, s, v]
 */
export function hsvStringToHsv(hsv: string): HSV {
  const match = hsv.match(/hsv\s*\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%\s*\)/i);
  if (!match) return [0, 0, 0]; // 默认黑色
  
  return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
}

/**
 * 将HSV数组转换为HSV字符串
 * @param hsv HSV数组 [h, s, v]
 * @returns HSV字符串，如 'hsv(360, 100%, 100%)'
 */
export function hsvToHsvString(hsv: HSV): string {
  const [h, s, v] = hsv;
  return `hsv(${h}, ${s}%, ${v}%)`;
}

/**
 * 将HEX颜色字符串转换为RGB数组
 * @param hex HEX颜色字符串，如 '#ffffff'
 * @returns RGB数组 [r, g, b]
 */
export function hexToRgb(hex: string): RGB {
  // 移除#前缀
  hex = hex.replace(/^#/, '');
  
  // 处理简写形式 (#fff -> #ffffff)
  if (hex.length === 3) {
    hex = hex.split('').map(char => char + char).join('');
  }
  
  // 处理带透明度的HEX (#ffffffff)
  if (hex.length === 8) {
    hex = hex.substring(0, 6);
  }
  
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  return [r, g, b];
}

/**
 * 将RGB数组转换为HEX颜色字符串
 * @param rgb RGB数组 [r, g, b]
 * @returns HEX颜色字符串，如 '#ffffff'
 */
export function rgbToHex(rgb: RGB): string {
  const [r, g, b] = rgb;
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * 将RGB数组转换为RGB字符串
 * @param rgb RGB数组 [r, g, b]
 * @returns RGB字符串，如 'rgb(255, 255, 255)'
 */
export function rgbToRgbString(rgb: RGB): string {
  const [r, g, b] = rgb;
  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * 将RGB字符串转换为RGB数组
 * @param rgb RGB字符串，如 'rgb(255, 255, 255)'
 * @returns RGB数组 [r, g, b]
 */
export function rgbStringToRgb(rgb: string): RGB {
  const match = rgb.match(/rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i);
  if (!match) return [0, 0, 0]; // 默认黑色
  
  return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
}

/**
 * 将HSL转换为RGB
 * @param hsl HSL数组 [h, s, l]
 * @returns RGB数组 [r, g, b]
 */
export function hslToRgb(hsl: HSL): RGB {
  let [h, s, l] = hsl;
  
  // 将s和l转换为0-1范围
  s /= 100;
  l /= 100;
  
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  
  let r = 0, g = 0, b = 0;
  
  if (h >= 0 && h < 60) {
    r = c; g = x; b = 0;
  } else if (h >= 60 && h < 120) {
    r = x; g = c; b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0; g = c; b = x;
  } else if (h >= 180 && h < 240) {
    r = 0; g = x; b = c;
  } else if (h >= 240 && h < 300) {
    r = x; g = 0; b = c;
  } else if (h >= 300 && h < 360) {
    r = c; g = 0; b = x;
  }
  
  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255)
  ];
}

/**
 * 将HSV转换为RGB
 * @param hsv HSV数组 [h, s, v]
 * @returns RGB数组 [r, g, b]
 */
export function hsvToRgb(hsv: HSV): RGB {
  let [h, s, v] = hsv;
  
  // 将s和v转换为0-1范围
  s /= 100;
  v /= 100;
  
  const c = v * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = v - c;
  
  let r = 0, g = 0, b = 0;
  
  if (h >= 0 && h < 60) {
    r = c; g = x; b = 0;
  } else if (h >= 60 && h < 120) {
    r = x; g = c; b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0; g = c; b = x;
  } else if (h >= 180 && h < 240) {
    r = 0; g = x; b = c;
  } else if (h >= 240 && h < 300) {
    r = x; g = 0; b = c;
  } else if (h >= 300 && h < 360) {
    r = c; g = 0; b = x;
  }
  
  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255)
  ];
}

/**
 * 计算颜色亮度
 * @param rgb RGB数组 [r, g, b]
 * @returns 亮度值，范围0-1
 */
export function calculateLuminance(rgb: RGB): number {
  const [r, g, b] = rgb;
  // 使用相对亮度公式: 0.299*R + 0.587*G + 0.114*B
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

/**
 * 根据背景色获取适合的文本颜色（黑色或白色）
 * @param backgroundColor 背景颜色，支持多种格式
 * @returns 适合的文本颜色，黑色或白色
 */
export function getTextColorForBackground(backgroundColor: string): string {
  // 检测颜色格式
  const format = detectColorFormat(backgroundColor);
  let rgb: RGB = [0, 0, 0];
  
  // 根据不同格式转换为RGB
  switch (format) {
    case ColorFormat.HEX:
      rgb = hexToRgb(backgroundColor);
      break;
    case ColorFormat.RGB:
      rgb = rgbStringToRgb(backgroundColor);
      break;
    case ColorFormat.RGBA:
      const rgba = rgbaStringToRgba(backgroundColor);
      rgb = [rgba[0], rgba[1], rgba[2]];
      break;
    case ColorFormat.HSL:
      rgb = hslToRgb(hslStringToHsl(backgroundColor));
      break;
    case ColorFormat.HSV:
      rgb = hsvToRgb(hsvStringToHsv(backgroundColor));
      break;
    default:
      // 默认返回黑色
      return 'rgba(0, 0, 0, 1)';
  }
  
  // 计算亮度
  const luminance = calculateLuminance(rgb);
  
  // 亮度阈值，通常0.5是分界点
  // 亮度高于阈值返回黑色文本，否则返回白色文本
  return luminance > 0.5 ? 'rgba(0, 0, 0, 1)' : 'rgba(255, 255, 255, 1)';
}