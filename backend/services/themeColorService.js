/**
 * 主题颜色服务
 * 处理壁纸颜色提取和Material You主题生成
 */

const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');
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
      const quantizerResult = QuantizerCelebi.quantize(imagePixels, 128);
      console.log(`颜色量化完成，生成 ${quantizerResult.size} 个颜色`);
      
      // 检查量化结果是否有效
      if (!quantizerResult || quantizerResult.size === 0) {
        throw new Error('颜色量化失败，无法从图像中提取到有效颜色');
      }
      
      // 使用Score对颜色进行评分，选择最佳种子色
      const scoredColors = Score.score(quantizerResult);
      
      // 检查评分结果是否有效
      if (!scoredColors || scoredColors.length === 0) {
        throw new Error('颜色评分失败，无法选择最佳种子色');
      }
      
      const sourceColorArgb = scoredColors[0];
      const sourceColorHex = hexFromArgb(sourceColorArgb);
      console.log(`选择种子色: ${sourceColorHex} (ARGB: ${sourceColorArgb})`);

      // 生成核心调色板
      const corePalette = CorePalette.of(sourceColorArgb);

      // 生成5种变体的主题方案
      const variants = ['tonalSpot', 'vibrant', 'expressive', 'fidelity', 'muted'];
      const schemes = {};

      // 使用正确的Material Color Utilities API生成不同变体的主题
      try {
        // 使用 themeFromSourceColor 生成基础主题
        const baseTheme = themeFromSourceColor(sourceColorArgb);
        console.log('成功生成基础主题');
        
        // 检查主题对象是否有效
        if (!baseTheme || !baseTheme.schemes || !baseTheme.schemes.light || !baseTheme.schemes.dark) {
          throw new Error('生成的主题对象无效');
        }
        
        // 获取基础方案
        schemes.tonalSpot = {
          light: this.schemeToTokens(baseTheme.schemes.light),
          dark: this.schemeToTokens(baseTheme.schemes.dark)
        };

        // 为不同变体创建不同的颜色方案
        // 通过调整源颜色的饱和度和亮度来创建变体
        
        // Vibrant - 大幅增加饱和度，让颜色更鲜艳
        const vibrantSourceColor = this.adjustColorSaturation(sourceColorArgb, 1.5);
        const vibrantTheme = themeFromSourceColor(vibrantSourceColor);
        schemes.vibrant = {
          light: this.schemeToTokens(vibrantTheme.schemes.light),
          dark: this.schemeToTokens(vibrantTheme.schemes.dark)
        };
        
        // Expressive - 大幅调整色相，创造更明显的色彩变化
        const expressiveSourceColor = this.adjustColorHue(sourceColorArgb, 30);
        const expressiveTheme = themeFromSourceColor(expressiveSourceColor);
        schemes.expressive = {
          light: this.schemeToTokens(expressiveTheme.schemes.light),
          dark: this.schemeToTokens(expressiveTheme.schemes.dark)
        };
        
        // Fidelity - 调整亮度和对比度，保持原色但增强可读性
        const fidelitySourceColor = this.adjustColorBrightness(sourceColorArgb, 0.85);
        const fidelityTheme = themeFromSourceColor(fidelitySourceColor);
        schemes.fidelity = {
          light: this.schemeToTokens(fidelityTheme.schemes.light),
          dark: this.schemeToTokens(fidelityTheme.schemes.dark)
        };
        
        // Muted - 低饱和柔和变体，饱和度降至0.25
        const mutedSourceColor = this.adjustColorSaturation(sourceColorArgb, 0.25);
        const mutedTheme = themeFromSourceColor(mutedSourceColor);
        schemes.muted = {
          light: this.schemeToTokens(mutedTheme.schemes.light),
          dark: this.schemeToTokens(mutedTheme.schemes.dark)
        };
        
        console.log('成功生成所有变体的主题方案');
      } catch (schemeError) {
        console.error('生成主题方案时出错，使用默认方案:', schemeError);
        // 如果新API不支持，回退到基础方案
        const lightScheme = Scheme.light(sourceColorArgb);
        const darkScheme = Scheme.dark(sourceColorArgb);
        
        // 检查回退方案是否有效
        if (!lightScheme || !darkScheme) {
          throw new Error('无法生成回退主题方案');
        }
        
        // 即使在回退模式下，也尝试创建不同的变体
        variants.forEach(variant => {
          let adjustedLightScheme = lightScheme;
          let adjustedDarkScheme = darkScheme;
          
          if (variant === 'vibrant') {
            // 大幅增加饱和度
            adjustedLightScheme = this.adjustSchemeSaturation(lightScheme, 1.5);
            adjustedDarkScheme = this.adjustSchemeSaturation(darkScheme, 1.5);
          } else if (variant === 'expressive') {
            // 大幅调整色相
            adjustedLightScheme = this.adjustSchemeHue(lightScheme, 30);
            adjustedDarkScheme = this.adjustSchemeHue(darkScheme, 30);
          } else if (variant === 'fidelity') {
            // 调整亮度和对比度
            adjustedLightScheme = this.adjustSchemeBrightness(lightScheme, 0.85);
            adjustedDarkScheme = this.adjustSchemeBrightness(darkScheme, 0.85);
          } else if (variant === 'muted') {
            // 低饱和柔和变体：饱和度降至0.25
            adjustedLightScheme = this.adjustSchemeSaturation(lightScheme, 0.25);
            adjustedDarkScheme = this.adjustSchemeSaturation(darkScheme, 0.25);
          }
          
          schemes[variant] = {
            light: this.schemeToTokens(adjustedLightScheme),
            dark: this.schemeToTokens(adjustedDarkScheme)
          };
        });
        
        console.log('使用默认方案生成主题方案');
      }

      // 构建主题数据
      const themeData = {
        wallpaper: {
          id: wallpaper._id,
          url: wallpaper.url,
          hash: wallpaper.hash,
          originalName: wallpaper.originalName
        },
        sourceColor: sourceColorHex,
        variants: variants,
        schemes: schemes,
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
      console.log('主题颜色生成完成，关键颜色采样:');
      console.log('- 种子色:', sourceColorHex);
      console.log('- Light 模式关键色:', {
        primary: schemes.tonalSpot.light.primary,
        background: schemes.tonalSpot.light.background,
        surface: schemes.tonalSpot.light.surface,
        onBackground: schemes.tonalSpot.light.onBackground,
        onSurface: schemes.tonalSpot.light.onSurface
      });
      console.log('- Dark 模式关键色:', {
        primary: schemes.tonalSpot.dark.primary,
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
}

module.exports = ThemeColorService;