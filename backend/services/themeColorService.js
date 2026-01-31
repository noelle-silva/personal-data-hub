/**
 * 主题颜色服务
 * 处理壁纸颜色提取和Material You主题生成
 * 通用、颜色无关的取色引擎（不基于任何色相特判）
 */

const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');
const config = require('../config/config');
const {
  CorePalette,
  QuantizerCelebi,
  Score,
  Scheme,
  argbFromHex,
  hexFromArgb,
  themeFromSourceColor
} = require('@material/material-color-utilities');
const Wallpaper = require('../models/Wallpaper');

// 通用配置阈值（可通过环境变量覆盖）
const CONFIG = {
  PRIMARY_MIN_SHARE: config.themeColor.primaryMinShare,
  MIN_SATURATION: config.themeColor.minSaturation,
  CLUSTER_K: config.themeColor.clusterK,
  TINT_MAX_LIGHT: config.themeColor.tintMaxLight,
  TINT_MAX_DARK: config.themeColor.tintMaxDark,
  NEUTRAL_SAT_THRESHOLD: config.themeColor.neutralSatThreshold,
  NEUTRAL_SHARE_THRESHOLD: config.themeColor.neutralShareThreshold,
  MIN_HUE_DISTANCE: config.themeColor.minHueDistance,
  TOPN_DIAGNOSTICS: config.themeColor.topnDiagnostics
};

/**
 * 主题颜色服务类
 */
class ThemeColorService {
  /**
   * 获取主题颜色存储目录
   * @returns {String} 主题颜色存储目录路径
   */
  static getColorThemeDir() {
    return path.join(__dirname, '../assets/themes/colors');
  }

  /**
   * ARGB 转 HSL（通用，颜色无关）
   * @param {Number} argb - ARGB整数
   * @returns {Object} {h, s, l} 范围 h∈[0,360), s,l∈[0,1]
   */
  static argbToHsl(argb) {
    const r = ((argb >> 16) & 0xff) / 255;
    const g = ((argb >> 8) & 0xff) / 255;
    const b = (argb & 0xff) / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    return { h: h * 360, s, l };
  }

  /**
   * 获取饱和度（从ARGB）
   * @param {Number} argb - ARGB整数
   * @returns {Number} 饱和度 [0,1]
   */
  static getSaturationFromArgb(argb) {
    return this.argbToHsl(argb).s;
  }

  /**
   * 获取亮度（从ARGB）
   * @param {Number} argb - ARGB整数
   * @returns {Number} 亮度 [0,1]
   */
  static getLightnessFromArgb(argb) {
    return this.argbToHsl(argb).l;
  }

  /**
   * 计算全局色度 Cf（所有像素饱和度的均值，用于背景着色自适应）
   * @param {Array} argbPixels - ARGB整数数组
   * @returns {Number} Cf ∈ [0,1]
   */
  static computeGlobalChroma(argbPixels) {
    if (!argbPixels.length) return 0;
    const sumSat = argbPixels.reduce((acc, argb) => acc + this.getSaturationFromArgb(argb), 0);
    return sumSat / argbPixels.length;
  }

  /**
   * 从量化结果构建颜色占比直方图与TopN候选（通用）
   * @param {Object} quantizerResult - QuantizerCelebi.quantize 返回的 Map
   * @param {Number} totalPixels - 总像素数
   * @param {Number} topN - 返回前N个候选，默认8
   * @returns {Object} { histogram: Map<argb, share>, topCandidates: Array<{argb,share,sat,l}> }
   */
  static buildColorHistogram(quantizerResult, totalPixels, topN = CONFIG.TOPN_DIAGNOSTICS) {
    const histogram = new Map();
    quantizerResult.forEach((count, argb) => {
      const share = count / totalPixels;
      histogram.set(argb, share);
    });
    // 按占比降序，并附加HSL信息
    const candidates = Array.from(histogram.entries())
      .map(([argb, share]) => ({
        argb,
        share,
        sat: this.getSaturationFromArgb(argb),
        l: this.getLightnessFromArgb(argb),
        hue: this.getHueFromArgb(argb)
      }))
      .sort((a, b) => b.share - a.share)
      .slice(0, topN);
    return { histogram, topCandidates: candidates };
  }

  /**
   * 确保主题颜色存储目录存在
   */
  static async ensureColorThemeDir() {
    const colorThemeDir = this.getColorThemeDir();
    try {
      await fs.access(colorThemeDir);
    } catch (error) {
      // 目录不存在，创建目录
      await fs.mkdir(colorThemeDir, { recursive: true });
    }
  }

  /**
   * 从壁纸文件生成主题颜色
   * @param {String} wallpaperId - 壁纸ID
   * @param {String} userId - 用户ID
   * @returns {Object} 生成的主题颜色数据
   */
  static async generateThemeFromWallpaper(wallpaperId, userId) {
    try {
      console.log(`开始为用户 ${userId} 和壁纸 ${wallpaperId} 生成主题颜色`);
      
      // 获取壁纸信息
      const wallpaper = await Wallpaper.findOne({ _id: wallpaperId, userId });
      if (!wallpaper) {
        throw new Error('壁纸不存在或无权访问');
      }
      console.log(`找到壁纸: ${wallpaper.originalName}, 路径: ${wallpaper.filePath}`);

      // 读取壁纸文件
      const imageBuffer = await fs.readFile(wallpaper.filePath);
      console.log(`成功读取壁纸文件，大小: ${imageBuffer.length} 字节`);

      // 使用sharp获取图像信息并调整大小以提高性能
      const { data, info } = await sharp(imageBuffer)
        .resize({
          width: 64, // 小尺寸以提高性能
          height: 64,
          fit: 'inside'
        })
        .raw()
        .toBuffer({ resolveWithObject: true });

      console.log(`图像处理完成，尺寸: ${info.width}x${info.height}`);

      // 提取像素数据
      const pixelCount = info.width * info.height;

      // 将像素数据转换为Material Color Utilities格式 (ARGB整数数组)
      const imagePixels = [];
      for (let i = 0; i < pixelCount; i++) {
        const r = data[i * 4];
        const g = data[i * 4 + 1];
        const b = data[i * 4 + 2];
        const a = data[i * 4 + 3];
        
        // 只处理不透明的像素，转换为ARGB整数
        if (a > 0) {
          // 将RGBA转换为ARGB整数格式
          const argb = (a << 24) | (r << 16) | (g << 8) | b;
          imagePixels.push(argb);
        }
      }

      console.log(`提取到 ${imagePixels.length} 个不透明像素`);

      if (imagePixels.length === 0) {
        throw new Error('图像中没有找到不透明像素，无法生成主题');
      }

      // 使用QuantizerCelebi进行颜色量化
      const quantizerResult = QuantizerCelebi.quantize(imagePixels, CONFIG.CLUSTER_K);
      console.log(`颜色量化完成，生成 ${quantizerResult.size} 个颜色`);
      
      // 检查量化结果是否有效
      if (!quantizerResult || quantizerResult.size === 0) {
        throw new Error('颜色量化失败，无法从图像中提取到有效颜色');
      }

      // 构建颜色占比直方图与TopN候选（通用统计）
      const { histogram, topCandidates } = this.buildColorHistogram(quantizerResult, pixelCount, CONFIG.TOPN_DIAGNOSTICS);
      const globalChroma = this.computeGlobalChroma(imagePixels);
      console.log(`全局色度 Cf: ${globalChroma.toFixed(3)}`);

      // 使用Score对颜色进行评分
      const scoredColors = Score.score(quantizerResult);
      
      // 检查评分结果是否有效
      if (!scoredColors || scoredColors.length === 0) {
        throw new Error('颜色评分失败，无法选择最佳种子色');
      }
      
      // 提取多样化种子色（通用策略，传入直方图用于占比过滤）
      let seeds = this.extractDiverseSeeds(scoredColors, histogram);
      console.log(`提取到 ${seeds.length} 个种子色:`, seeds.map(s => hexFromArgb(s.argb)));
      
      // 兜底：如果没有种子色，使用评分最高的颜色作为种子
      if (seeds.length === 0 && scoredColors.length > 0) {
        const fallbackArgb = scoredColors[0];
        const { h: hue, s: sat, l } = this.argbToHsl(fallbackArgb);
        seeds = [{
          argb: fallbackArgb,
          score: 1.0,
          hue,
          sat,
          l,
          share: histogram.get(fallbackArgb) || 0
        }];
        console.log('使用评分最高的颜色作为兜底种子:', hexFromArgb(fallbackArgb));
      }
      
      const sourceColorArgb = seeds[0]?.argb ?? scoredColors[0];
      const sourceColorHex = hexFromArgb(sourceColorArgb);
      console.log(`主种子色: ${sourceColorHex} (ARGB: ${sourceColorArgb})`);

      // 生成5种变体的主题方案
      const variants = ['tonalSpot', 'vibrant', 'expressive', 'fidelity', 'muted'];
      const schemes = {};

      // 使用多种子生成主题方案
      try {
        // 为每个变体生成基于多种子的主题（传入全局色度用于背景着色自适应）
        for (const variant of variants) {
          schemes[variant] = this.generateMultiSeedScheme(seeds, variant, globalChroma);
        }
        
        console.log('成功生成所有变体的多种子主题方案');
      } catch (schemeError) {
        console.error('生成多种子主题方案时出错，使用默认方案:', schemeError);
        // 回退到单种子方案
        const lightScheme = Scheme.light(sourceColorArgb);
        const darkScheme = Scheme.dark(sourceColorArgb);
        
        if (!lightScheme || !darkScheme) {
          throw new Error('无法生成回退主题方案');
        }
        
        variants.forEach(variant => {
          let adjustedLightScheme = lightScheme;
          let adjustedDarkScheme = darkScheme;
          
          if (variant === 'vibrant') {
            adjustedLightScheme = this.adjustSchemeSaturation(lightScheme, 1.5);
            adjustedDarkScheme = this.adjustSchemeSaturation(darkScheme, 1.5);
          } else if (variant === 'expressive') {
            adjustedLightScheme = this.adjustSchemeHue(lightScheme, 30);
            adjustedDarkScheme = this.adjustSchemeHue(darkScheme, 30);
          } else if (variant === 'fidelity') {
            adjustedLightScheme = this.adjustSchemeBrightness(lightScheme, 0.85);
            adjustedDarkScheme = this.adjustSchemeBrightness(darkScheme, 0.85);
          } else if (variant === 'muted') {
            adjustedLightScheme = this.adjustSchemeSaturation(lightScheme, 0.25);
            adjustedDarkScheme = this.adjustSchemeSaturation(darkScheme, 0.25);
          }
          
          schemes[variant] = {
            light: this.applyBackgroundTint(this.schemeToTokens(adjustedLightScheme), sourceColorHex, 'light'),
            dark: this.applyBackgroundTint(this.schemeToTokens(adjustedDarkScheme), sourceColorHex, 'dark')
          };
        });
        
        console.log('使用默认方案生成主题方案');
      }

      // 构建主题数据（增加诊断信息）
      const diagnostics = {
        globalChroma: parseFloat((globalChroma ?? 0).toFixed(4)),
        topCandidates: topCandidates.map(c => ({
          hex: hexFromArgb(c.argb),
          hue: parseFloat((c.hue ?? 0).toFixed(1)),
          sat: parseFloat((c.sat ?? 0).toFixed(3)),
          share: parseFloat((c.share ?? 0).toFixed(4))
        })),
        primarySelectionReason: `主色选择: hue=${(seeds[0]?.hue ?? 0).toFixed(1)} sat=${(seeds[0]?.sat ?? 0).toFixed(3)} share=${(seeds[0]?.share ?? 0).toFixed(4)} weight=${(seeds[0]?.score ?? 0).toFixed(4)}`
      };

      const themeData = {
        wallpaper: {
          id: wallpaper._id,
          url: wallpaper.url,
          hash: wallpaper.hash,
          originalName: wallpaper.originalName
        },
        sourceColor: sourceColorHex,
        seeds: seeds.map(s => ({
          color: hexFromArgb(s.argb),
          score: s.score,
          hue: s.hue,
          sat: s.sat,
          share: s.share
        })),
        variants: variants,
        schemes: schemes,
        diagnostics: diagnostics,
        generatedAt: new Date().toISOString()
      };

      // 确保存储目录存在
      await this.ensureColorThemeDir();

      // 保存主题数据到文件
      const fileName = `${userId}-${wallpaper.hash}.json`;
      const filePath = path.join(this.getColorThemeDir(), fileName);
      await fs.writeFile(filePath, JSON.stringify(themeData, null, 2));

      // 同时创建当前主题别名文件
      const currentFileName = `current-${userId}.json`;
      const currentFilePath = path.join(this.getColorThemeDir(), currentFileName);
      await fs.writeFile(currentFilePath, JSON.stringify(themeData, null, 2));

      // 记录关键 token 采样，确保不会出现全黑
      console.log('多种子主题颜色生成完成，关键颜色采样:');
      console.log('- 种子色:', seeds.map(s => hexFromArgb(s.argb)));
      console.log('- Light 模式关键色:', {
        primary: schemes.tonalSpot.light.primary,
        secondary: schemes.tonalSpot.light.secondary,
        tertiary: schemes.tonalSpot.light.tertiary,
        background: schemes.tonalSpot.light.background,
        surface: schemes.tonalSpot.light.surface,
        onBackground: schemes.tonalSpot.light.onBackground,
        onSurface: schemes.tonalSpot.light.onSurface
      });
      console.log('- Dark 模式关键色:', {
        primary: schemes.tonalSpot.dark.primary,
        secondary: schemes.tonalSpot.dark.secondary,
        tertiary: schemes.tonalSpot.dark.tertiary,
        background: schemes.tonalSpot.dark.background,
        surface: schemes.tonalSpot.dark.surface,
        onBackground: schemes.tonalSpot.dark.onBackground,
        onSurface: schemes.tonalSpot.dark.onSurface
      });
      
      console.log(`主题颜色生成成功，保存到: ${filePath} 和 ${currentFilePath}`);
      return themeData;
    } catch (error) {
      console.error('生成主题颜色失败:', error);
      console.error('错误堆栈:', error.stack);
      throw new Error(`生成主题颜色失败: ${error.message}`);
    }
  }

  /**
   * 将Material Scheme转换为MD-SYS tokens
   * @param {Object} scheme - Material Scheme对象
   * @returns {Object} MD-SYS tokens
   */
  static schemeToTokens(scheme) {
    return {
      primary: hexFromArgb(scheme.primary),
      onPrimary: hexFromArgb(scheme.onPrimary),
      primaryContainer: hexFromArgb(scheme.primaryContainer),
      onPrimaryContainer: hexFromArgb(scheme.onPrimaryContainer),
      secondary: hexFromArgb(scheme.secondary),
      onSecondary: hexFromArgb(scheme.onSecondary),
      secondaryContainer: hexFromArgb(scheme.secondaryContainer),
      onSecondaryContainer: hexFromArgb(scheme.onSecondaryContainer),
      tertiary: hexFromArgb(scheme.tertiary),
      onTertiary: hexFromArgb(scheme.onTertiary),
      tertiaryContainer: hexFromArgb(scheme.tertiaryContainer),
      onTertiaryContainer: hexFromArgb(scheme.onTertiaryContainer),
      error: hexFromArgb(scheme.error),
      onError: hexFromArgb(scheme.onError),
      errorContainer: hexFromArgb(scheme.errorContainer),
      onErrorContainer: hexFromArgb(scheme.onErrorContainer),
      background: hexFromArgb(scheme.background),
      onBackground: hexFromArgb(scheme.onBackground),
      surface: hexFromArgb(scheme.surface),
      onSurface: hexFromArgb(scheme.onSurface),
      surfaceVariant: hexFromArgb(scheme.surfaceVariant),
      onSurfaceVariant: hexFromArgb(scheme.onSurfaceVariant),
      outline: hexFromArgb(scheme.outline),
      outlineVariant: hexFromArgb(scheme.outlineVariant),
      shadow: hexFromArgb(scheme.shadow),
      scrim: hexFromArgb(scheme.scrim),
      inverseSurface: hexFromArgb(scheme.inverseSurface),
      inverseOnSurface: hexFromArgb(scheme.inverseOnSurface),
      inversePrimary: hexFromArgb(scheme.inversePrimary)
    };
  }

  /**
   * 获取用户的当前主题颜色
   * @param {String} userId - 用户ID
   * @returns {Object|null} 主题颜色数据
   */
  static async getCurrentThemeColors(userId) {
    try {
      const currentFileName = `current-${userId}.json`;
      const currentFilePath = path.join(this.getColorThemeDir(), currentFileName);
      
      const data = await fs.readFile(currentFilePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      // 文件不存在或读取失败
      return null;
    }
  }

  /**
   * 获取指定壁纸的主题颜色
   * @param {String} userId - 用户ID
   * @param {String} wallpaperHash - 壁纸哈希
   * @returns {Object|null} 主题颜色数据
   */
  static async getWallpaperThemeColors(userId, wallpaperHash) {
    try {
      const fileName = `${userId}-${wallpaperHash}.json`;
      const filePath = path.join(this.getColorThemeDir(), fileName);
      
      const data = await fs.readFile(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      // 文件不存在或读取失败
      return null;
    }
  }

  /**
   * 删除壁纸相关的主题颜色文件
   * @param {String} userId - 用户ID
   * @param {String} wallpaperHash - 壁纸哈希
   * @returns {Boolean} 删除是否成功
   */
  static async deleteWallpaperThemeColors(userId, wallpaperHash) {
    try {
      const fileName = `${userId}-${wallpaperHash}.json`;
      const filePath = path.join(this.getColorThemeDir(), fileName);
      
      await fs.unlink(filePath);
      return true;
    } catch (error) {
      console.error('删除壁纸主题颜色文件失败:', error);
      return false;
    }
  }

  /**
   * 调整颜色的饱和度
   * @param {Number} argbColor - ARGB颜色值
   * @param {Number} factor - 饱和度因子 (1.0为原始值，>1.0增加饱和度，<1.0降低饱和度)
   * @returns {Number} 调整后的ARGB颜色值
   */
  static adjustColorSaturation(argbColor, factor) {
    try {
      // 提取RGBA分量
      const a = (argbColor >> 24) & 0xff;
      const r = (argbColor >> 16) & 0xff;
      const g = (argbColor >> 8) & 0xff;
      const b = argbColor & 0xff;
      
      // 转换为HSL
      const max = Math.max(r, g, b) / 255;
      const min = Math.min(r, g, b) / 255;
      const l = (max + min) / 2;
      
      let h, s;
      
      if (max === min) {
        h = s = 0; // 灰色
      } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        
        switch (max * 255) {
          case r:
            h = ((g / 255 - b / 255) / d + (g < b ? 6 : 0)) / 6;
            break;
          case g:
            h = ((b / 255 - r / 255) / d + 2) / 6;
            break;
          case b:
            h = ((r / 255 - g / 255) / d + 4) / 6;
            break;
        }
      }
      
      // 调整饱和度
      s = Math.max(0, Math.min(1, s * factor));
      
      // 转换回RGB
      const { r: newR, g: newG, b: newB } = this.hslToRgb(h, s, l);
      
      // 转换回ARGB
      return (a << 24) | (Math.round(newR * 255) << 16) | (Math.round(newG * 255) << 8) | Math.round(newB * 255);
    } catch (error) {
      console.error('调整颜色饱和度失败:', error);
      return argbColor;
    }
  }

  /**
   * 调整颜色的色相
   * @param {Number} argbColor - ARGB颜色值
   * @param {Number} degrees - 色相调整角度 (0-360)
   * @returns {Number} 调整后的ARGB颜色值
   */
  static adjustColorHue(argbColor, degrees) {
    try {
      // 提取RGBA分量
      const a = (argbColor >> 24) & 0xff;
      const r = (argbColor >> 16) & 0xff;
      const g = (argbColor >> 8) & 0xff;
      const b = argbColor & 0xff;
      
      // 转换为HSL
      const max = Math.max(r, g, b) / 255;
      const min = Math.min(r, g, b) / 255;
      const l = (max + min) / 2;
      
      let h, s;
      
      if (max === min) {
        h = s = 0; // 灰色，调整色相没有意义
        return argbColor;
      } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        
        switch (max * 255) {
          case r:
            h = ((g / 255 - b / 255) / d + (g < b ? 6 : 0)) / 6;
            break;
          case g:
            h = ((b / 255 - r / 255) / d + 2) / 6;
            break;
          case b:
            h = ((r / 255 - g / 255) / d + 4) / 6;
            break;
        }
      }
      
      // 调整色相
      h = (h + degrees / 360) % 1;
      if (h < 0) h += 1;
      
      // 转换回RGB
      const { r: newR, g: newG, b: newB } = this.hslToRgb(h, s, l);
      
      // 转换回ARGB
      return (a << 24) | (Math.round(newR * 255) << 16) | (Math.round(newG * 255) << 8) | Math.round(newB * 255);
    } catch (error) {
      console.error('调整颜色色相失败:', error);
      return argbColor;
    }
  }

  /**
   * 调整颜色的亮度
   * @param {Number} argbColor - ARGB颜色值
   * @param {Number} factor - 亮度因子 (1.0为原始值，>1.0增加亮度，<1.0降低亮度)
   * @returns {Number} 调整后的ARGB颜色值
   */
  static adjustColorBrightness(argbColor, factor) {
    try {
      // 提取RGBA分量
      const a = (argbColor >> 24) & 0xff;
      const r = (argbColor >> 16) & 0xff;
      const g = (argbColor >> 8) & 0xff;
      const b = argbColor & 0xff;
      
      // 转换为HSL
      const max = Math.max(r, g, b) / 255;
      const min = Math.min(r, g, b) / 255;
      const l = (max + min) / 2;
      
      let h, s;
      
      if (max === min) {
        h = s = 0; // 灰色
      } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        
        switch (max * 255) {
          case r:
            h = ((g / 255 - b / 255) / d + (g < b ? 6 : 0)) / 6;
            break;
          case g:
            h = ((b / 255 - r / 255) / d + 2) / 6;
            break;
          case b:
            h = ((r / 255 - g / 255) / d + 4) / 6;
            break;
        }
      }
      
      // 调整亮度
      const newL = Math.max(0, Math.min(1, l * factor));
      
      // 转换回RGB
      const { r: newR, g: newG, b: newB } = this.hslToRgb(h, s, newL);
      
      // 转换回ARGB
      return (a << 24) | (Math.round(newR * 255) << 16) | (Math.round(newG * 255) << 8) | Math.round(newB * 255);
    } catch (error) {
      console.error('调整颜色亮度失败:', error);
      return argbColor;
    }
  }

  /**
   * HSL转RGB
   * @param {Number} h - 色相 (0-1)
   * @param {Number} s - 饱和度 (0-1)
   * @param {Number} l - 亮度 (0-1)
   * @returns {Object} RGB值 (0-1范围)
   */
  static hslToRgb(h, s, l) {
    let r, g, b;

    if (s === 0) {
      r = g = b = l; // 灰色
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }

    return { r, g, b };
  }

  /**
   * 调整方案的饱和度
   * @param {Object} scheme - Material Scheme对象
   * @param {Number} factor - 饱和度因子
   * @returns {Object} 调整后的方案
   */
  static adjustSchemeSaturation(scheme, factor) {
    try {
      const adjustedScheme = this.cloneScheme(scheme);
      
      // 调整主要颜色的饱和度
      if (adjustedScheme.primary) {
        adjustedScheme.primary = this.adjustColorSaturation(adjustedScheme.primary, factor);
      }
      if (adjustedScheme.secondary) {
        adjustedScheme.secondary = this.adjustColorSaturation(adjustedScheme.secondary, factor);
      }
      if (adjustedScheme.tertiary) {
        adjustedScheme.tertiary = this.adjustColorSaturation(adjustedScheme.tertiary, factor);
      }
      
      return adjustedScheme;
    } catch (error) {
      console.error('调整方案饱和度失败:', error);
      return scheme;
    }
  }

  /**
   * 调整方案的色相
   * @param {Object} scheme - Material Scheme对象
   * @param {Number} degrees - 色相调整角度
   * @returns {Object} 调整后的方案
   */
  static adjustSchemeHue(scheme, degrees) {
    try {
      const adjustedScheme = this.cloneScheme(scheme);
      
      // 调整主要颜色的色相
      if (adjustedScheme.primary) {
        adjustedScheme.primary = this.adjustColorHue(adjustedScheme.primary, degrees);
      }
      if (adjustedScheme.secondary) {
        adjustedScheme.secondary = this.adjustColorHue(adjustedScheme.secondary, degrees);
      }
      if (adjustedScheme.tertiary) {
        adjustedScheme.tertiary = this.adjustColorHue(adjustedScheme.tertiary, degrees);
      }
      
      return adjustedScheme;
    } catch (error) {
      console.error('调整方案色相失败:', error);
      return scheme;
    }
  }

  /**
   * 调整方案的亮度
   * @param {Object} scheme - Material Scheme对象
   * @param {Number} factor - 亮度因子
   * @returns {Object} 调整后的方案
   */
  static adjustSchemeBrightness(scheme, factor) {
    try {
      const adjustedScheme = this.cloneScheme(scheme);
      
      // 调整主要颜色的亮度
      if (adjustedScheme.primary) {
        adjustedScheme.primary = this.adjustColorBrightness(adjustedScheme.primary, factor);
      }
      if (adjustedScheme.secondary) {
        adjustedScheme.secondary = this.adjustColorBrightness(adjustedScheme.secondary, factor);
      }
      if (adjustedScheme.tertiary) {
        adjustedScheme.tertiary = this.adjustColorBrightness(adjustedScheme.tertiary, factor);
      }
      
      return adjustedScheme;
    } catch (error) {
      console.error('调整方案亮度失败:', error);
      return scheme;
    }
  }

  /**
   * 深度克隆 Material Scheme 对象
   * @param {Object} scheme - Material Scheme对象
   * @returns {Object} 克隆后的 Scheme 对象
   */
  static cloneScheme(scheme) {
    try {
      // Material Scheme 对象包含所有颜色属性，需要完整复制
      const clonedScheme = {};
      
      // 复制所有已知的颜色属性
      const colorProperties = [
        'primary', 'onPrimary', 'primaryContainer', 'onPrimaryContainer',
        'secondary', 'onSecondary', 'secondaryContainer', 'onSecondaryContainer',
        'tertiary', 'onTertiary', 'tertiaryContainer', 'onTertiaryContainer',
        'error', 'onError', 'errorContainer', 'onErrorContainer',
        'background', 'onBackground', 'surface', 'onSurface',
        'surfaceVariant', 'onSurfaceVariant', 'outline', 'outlineVariant',
        'shadow', 'scrim', 'inverseSurface', 'inverseOnSurface', 'inversePrimary'
      ];
      
      colorProperties.forEach(prop => {
        if (scheme[prop] !== undefined) {
          clonedScheme[prop] = scheme[prop];
        }
      });
      
      return clonedScheme;
    } catch (error) {
      console.error('克隆 Scheme 对象失败:', error);
      return scheme;
    }
  }

  /**
   * 从评分颜色中提取多样化的种子色（通用、颜色无关）
   * @param {Array} scoredColors - Score.score 返回的 ARGB 数组
   * @param {Map} histogram - 颜色占比直方图 Map<argb, share>
   * @returns {Array} 多个种子色对象 {argb, score, hue, sat, l, share}
   */
  static extractDiverseSeeds(scoredColors, histogram) {
    const seeds = [];
    const minHueDistance = CONFIG.MIN_HUE_DISTANCE;

    // 预计算每个候选的指标
    const candidates = scoredColors.map((argb, idx) => {
      const share = histogram.get(argb) || 0;
      const { h: hue, s: sat, l } = this.argbToHsl(argb);
      // 综合权重 = Score排名(隐含) × 占比 × 饱和度 × 稳定性(1-idx*0.05)
      const stability = Math.max(0.5, 1 - idx * 0.05);
      const weight = (1 - idx * 0.1) * share * sat * stability;
      return { argb, hue, sat, l, share, weight, idx };
    });

    // 按综合权重降序排序
    candidates.sort((a, b) => b.weight - a.weight);

    for (const candidate of candidates) {
      // 通用准入规则：占比与饱和度阈值
      if (candidate.share < CONFIG.PRIMARY_MIN_SHARE || candidate.sat < CONFIG.MIN_SATURATION) {
        console.log(`跳过低权重候选: share=${candidate.share.toFixed(3)} sat=${candidate.sat.toFixed(3)} hue=${candidate.hue.toFixed(1)}`);
        continue;
      }

      // 检查与已有种子的最小色相间距
      const isDiverse = seeds.every(seed => {
        const hueDistance = Math.abs(candidate.hue - seed.hue);
        const minDist = Math.min(hueDistance, 360 - hueDistance);
        return minDist >= minHueDistance;
      });

      if (isDiverse || seeds.length < 3) {
        seeds.push({
          argb: candidate.argb,
          score: candidate.weight,
          hue: candidate.hue,
          sat: candidate.sat,
          l: candidate.l,
          share: candidate.share
        });
        console.log(`种子${seeds.length}: hue=${candidate.hue.toFixed(1)} sat=${candidate.sat.toFixed(3)} share=${candidate.share.toFixed(3)} weight=${candidate.weight.toFixed(4)}`);
      }

      if (seeds.length >= 5) break;
    }

    // 如果真实簇不足3个，从已选种子的相邻真实簇补足（不人造旋转）
    while (seeds.length < 3 && candidates.length > seeds.length) {
      // 找到未选且与已选种子色相距离最近的候选
      let bestCandidate = null;
      let bestDist = Infinity;
      for (const cand of candidates) {
        if (seeds.some(s => s.argb === cand.argb)) continue;
        const minDistToSeeds = Math.min(...seeds.map(s => {
          const d = Math.abs(cand.hue - s.hue);
          return Math.min(d, 360 - d);
        }));
        if (minDistToSeeds < bestDist && minDistToSeeds >= minHueDistance) {
          bestDist = minDistToSeeds;
          bestCandidate = cand;
        }
      }
      if (!bestCandidate) break;
      seeds.push({
        argb: bestCandidate.argb,
        score: bestCandidate.weight,
        hue: bestCandidate.hue,
        sat: bestCandidate.sat,
        l: bestCandidate.l,
        share: bestCandidate.share
      });
      console.log(`补足种子${seeds.length}: hue=${bestCandidate.hue.toFixed(1)} sat=${bestCandidate.sat.toFixed(3)} share=${bestCandidate.share.toFixed(3)}`);
    }

    return seeds.slice(0, 5);
  }

  /**
   * 从ARGB颜色获取色相
   * @param {Number} argbColor - ARGB颜色值
   * @returns {Number} 色相角度 (0-360)
   */
  static getHueFromArgb(argbColor) {
    const r = (argbColor >> 16) & 0xff;
    const g = (argbColor >> 8) & 0xff;
    const b = argbColor & 0xff;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    
    if (delta === 0) return 0;
    
    let hue;
    switch (max) {
      case r:
        hue = ((g - b) / delta + (g < b ? 6 : 0)) * 60;
        break;
      case g:
        hue = ((b - r) / delta + 2) * 60;
        break;
      case b:
        hue = ((r - g) / delta + 4) * 60;
        break;
    }
    
    return hue;
  }

  /**
   * 基于多种子生成主题方案（通用、颜色无关）
   * @param {Array} seeds - 种子色数组（已通过extractDiverseSeeds筛选）
   * @param {String} variant - 变体名称
   * @param {Number} globalChroma - 全局色度 Cf
   * @returns {Object} 包含light和dark的tokens
   */
  static generateMultiSeedScheme(seeds, variant, globalChroma) {
    const primarySeed = seeds[0];
    const secondarySeed = seeds[1] || primarySeed;
    const tertiarySeed = seeds[2] || primarySeed;
    
    // 为每个种子生成基础主题
    const primaryTheme = themeFromSourceColor(primarySeed.argb);
    const secondaryTheme = themeFromSourceColor(secondarySeed.argb);
    const tertiaryTheme = themeFromSourceColor(tertiarySeed.argb);
    
    // 应用变体调整
    let adjustedPrimaryTheme = primaryTheme;
    let adjustedSecondaryTheme = secondaryTheme;
    let adjustedTertiaryTheme = tertiaryTheme;
    
    if (variant === 'vibrant') {
      adjustedPrimaryTheme = themeFromSourceColor(this.adjustColorSaturation(primarySeed.argb, 1.5));
      adjustedSecondaryTheme = themeFromSourceColor(this.adjustColorSaturation(secondarySeed.argb, 1.5));
      adjustedTertiaryTheme = themeFromSourceColor(this.adjustColorSaturation(tertiarySeed.argb, 1.5));
    } else if (variant === 'expressive') {
      adjustedPrimaryTheme = themeFromSourceColor(this.adjustColorHue(primarySeed.argb, 30));
      adjustedSecondaryTheme = themeFromSourceColor(this.adjustColorHue(secondarySeed.argb, 30));
      adjustedTertiaryTheme = themeFromSourceColor(this.adjustColorHue(tertiarySeed.argb, 30));
    } else if (variant === 'fidelity') {
      adjustedPrimaryTheme = themeFromSourceColor(this.adjustColorBrightness(primarySeed.argb, 0.85));
      adjustedSecondaryTheme = themeFromSourceColor(this.adjustColorBrightness(secondarySeed.argb, 0.85));
      adjustedTertiaryTheme = themeFromSourceColor(this.adjustColorBrightness(tertiarySeed.argb, 0.85));
    } else if (variant === 'muted') {
      adjustedPrimaryTheme = themeFromSourceColor(this.adjustColorSaturation(primarySeed.argb, 0.25));
      adjustedSecondaryTheme = themeFromSourceColor(this.adjustColorSaturation(secondarySeed.argb, 0.25));
      adjustedTertiaryTheme = themeFromSourceColor(this.adjustColorSaturation(tertiarySeed.argb, 0.25));
    }
    
    // 合并tokens（传入全局色度用于背景着色自适应）
    const lightTokens = this.mergeMultiSeedTokens(
      this.schemeToTokens(adjustedPrimaryTheme.schemes.light),
      this.schemeToTokens(adjustedSecondaryTheme.schemes.light),
      this.schemeToTokens(adjustedTertiaryTheme.schemes.light),
      'light',
      globalChroma
    );
    
    const darkTokens = this.mergeMultiSeedTokens(
      this.schemeToTokens(adjustedPrimaryTheme.schemes.dark),
      this.schemeToTokens(adjustedSecondaryTheme.schemes.dark),
      this.schemeToTokens(adjustedTertiaryTheme.schemes.dark),
      'dark',
      globalChroma
    );
    
    return {
      light: lightTokens,
      dark: darkTokens
    };
  }

  /**
   * 合并多种子tokens
   * @param {Object} primaryTokens - 主色tokens
   * @param {Object} secondaryTokens - 辅色tokens
   * @param {Object} tertiaryTokens - 第三色tokens
   * @param {String} mode - 主题模式
   * @returns {Object} 合并后的tokens
   */
  static mergeMultiSeedTokens(primaryTokens, secondaryTokens, tertiaryTokens, mode, globalChroma) {
    const merged = { ...primaryTokens };
    
    // 覆盖辅色系
    merged.secondary = secondaryTokens.secondary;
    merged.onSecondary = secondaryTokens.onSecondary;
    merged.secondaryContainer = secondaryTokens.secondaryContainer;
    merged.onSecondaryContainer = secondaryTokens.onSecondaryContainer;
    
    // 覆盖第三色系
    merged.tertiary = tertiaryTokens.tertiary;
    merged.onTertiary = tertiaryTokens.onTertiary;
    merged.tertiaryContainer = tertiaryTokens.tertiaryContainer;
    merged.onTertiaryContainer = tertiaryTokens.onTertiaryContainer;
    
    // 应用背景轻度着色
    return this.applyBackgroundTint(merged, primaryTokens.primary, mode, globalChroma);
  }

  /**
   * 应用背景轻度着色（通用、颜色无关；基于全局色度Cf自适应上限）
   * @param {Object} tokens - 颜色tokens
   * @param {String} primaryColor - 主色（十六进制）
   * @param {String} mode - 主题模式 ('light'|'dark')
   * @param {Number} globalChroma - 全局色度 Cf ∈[0,1]
   * @returns {Object} 着色后的tokens
   */
  static applyBackgroundTint(tokens, primaryColor, mode, globalChroma) {
    // 健壮性保护：确保 globalChroma 是有效数字
    const cg = typeof globalChroma === 'number' ? globalChroma : 0;
    
    // 计算自适应着色因子：Cf越高，允许的上限越高，但不超过配置上限
    const maxTint = mode === 'light' ? CONFIG.TINT_MAX_LIGHT : CONFIG.TINT_MAX_DARK;
    // 简单线性映射：Cf=0时因子=0，Cf=1时因子=maxTint
    const adaptiveTint = Math.min(cg * maxTint * 2, maxTint); // *2让中低Cf也有轻微着色

    // 近中性壁纸识别：低饱和像素占比高时，进一步降低或关闭着色
    const lowSaturationRatio = this.computeLowSaturationRatio(tokens, primaryColor);
    const isNearNeutral = lowSaturationRatio >= CONFIG.NEUTRAL_SHARE_THRESHOLD;
    const finalTint = isNearNeutral ? adaptiveTint * 0.2 : adaptiveTint; // 中性场景降到20%

    console.log(`背景着色: Cf=${cg.toFixed(3)} lowSatRatio=${lowSaturationRatio.toFixed(3)} isNearNeutral=${isNearNeutral} finalTint=${finalTint.toFixed(4)}`);

    // 对背景和表面进行轻度着色
    tokens.background = this.blendHexColors(tokens.background, primaryColor, finalTint);
    tokens.surface = this.blendHexColors(tokens.surface, primaryColor, finalTint);

    // 确保可读性，调整对比色
    tokens.onBackground = this.ensureContrast(tokens.background, tokens.onBackground);
    tokens.onSurface = this.ensureContrast(tokens.surface, tokens.onSurface);

    return tokens;
  }

  /**
   * 估算低饱和像素占比（用于近中性壁纸识别，通用）
   * @param {Object} tokens - 当前tokens
   * @param {String} primaryColor - 主色（十六进制）
   * @returns {Number} 低饱和像素占比估计 [0,1]
   */
  static computeLowSaturationRatio(tokens, primaryColor) {
    // 简化估计：如果背景与主色饱和度都低于阈值，判定为低饱和场景
    const bgRgb = this.hexToRgb(tokens.background);
    const priRgb = this.hexToRgb(primaryColor);
    if (!bgRgb || !priRgb) return 0;
    const bgSat = this.getSaturationFromArgb((255 << 24) | (bgRgb.r << 16) | (bgRgb.g << 8) | bgRgb.b);
    const priSat = this.getSaturationFromArgb((255 << 24) | (priRgb.r << 16) | (priRgb.g << 8) | priRgb.b);
    // 粗略估计：两者均低于中性阈值则认为低饱和占比高
    return (bgSat < CONFIG.NEUTRAL_SAT_THRESHOLD && priSat < CONFIG.NEUTRAL_SAT_THRESHOLD) ? 0.8 : 0.2;
  }

  /**
   * 混合两种颜色
   * @param {String} color1 - 第一种颜色（十六进制）
   * @param {String} color2 - 第二种颜色（十六进制）
   * @param {Number} factor - 混合因子 (0-1)
   * @returns {String} 混合后的颜色
   */
  static blendHexColors(color1, color2, factor) {
    if (!color1 || !color2) return color1 || color2;
    
    try {
      const rgb1 = this.hexToRgb(color1);
      const rgb2 = this.hexToRgb(color2);
      
      const blended = {
        r: Math.round(rgb1.r * (1 - factor) + rgb2.r * factor),
        g: Math.round(rgb1.g * (1 - factor) + rgb2.g * factor),
        b: Math.round(rgb1.b * (1 - factor) + rgb2.b * factor)
      };
      
      return this.rgbToHex(blended.r, blended.g, blended.b);
    } catch (error) {
      console.error('颜色混合失败:', error);
      return color1;
    }
  }

  /**
   * 十六进制转RGB
   * @param {String} hex - 十六进制颜色
   * @returns {Object} RGB对象
   */
  static hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  /**
   * RGB转十六进制
   * @param {Number} r - 红色分量
   * @param {Number} g - 绿色分量
   * @param {Number} b - 蓝色分量
   * @returns {String} 十六进制颜色
   */
  static rgbToHex(r, g, b) {
    const toHex = (n) => {
      const hex = Math.round(Math.max(0, Math.min(255, n))).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  /**
   * 确保颜色对比度
   * @param {String} backgroundColor - 背景色
   * @param {String} textColor - 文本色
   * @returns {String} 调整后的文本色
   */
  static ensureContrast(backgroundColor, textColor) {
    // 简单的对比度检查，如果对比度不足，返回黑色或白色
    const bgRgb = this.hexToRgb(backgroundColor);
    const textRgb = this.hexToRgb(textColor);
    
    if (!bgRgb || !textRgb) return textColor;
    
    // 计算亮度差异
    const bgLuminance = (0.299 * bgRgb.r + 0.587 * bgRgb.g + 0.114 * bgRgb.b) / 255;
    const textLuminance = (0.299 * textRgb.r + 0.587 * textRgb.g + 0.114 * textRgb.b) / 255;
    const contrast = Math.abs(bgLuminance - textLuminance);
    
    // 如果对比度太低，根据背景亮度选择黑色或白色
    if (contrast < 0.3) {
      return bgLuminance > 0.5 ? '#000000' : '#ffffff';
    }
    
    return textColor;
  }
}

module.exports = ThemeColorService;
