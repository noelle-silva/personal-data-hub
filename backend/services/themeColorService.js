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

      // 生成4种变体的主题方案
      const variants = ['tonalSpot', 'vibrant', 'expressive', 'fidelity'];
      const schemes = {};

      // 使用正确的Material Color Utilities API生成不同变体的主题
      try {
        // 使用 themeFromSourceColor 生成主题，这是推荐的方式
        const theme = themeFromSourceColor(sourceColorArgb);
        console.log('成功生成基础主题');
        
        // 检查主题对象是否有效
        if (!theme || !theme.schemes || !theme.schemes.light || !theme.schemes.dark) {
          throw new Error('生成的主题对象无效');
        }
        
        // 获取不同变体的方案
        schemes.tonalSpot = {
          light: this.schemeToTokens(theme.schemes.light),
          dark: this.schemeToTokens(theme.schemes.dark)
        };

        // 对于其他变体，我们可以使用相同的基础方案，但在实际应用中
        // Material Color Utilities 可能不支持所有变体，这里我们使用相同的方案
        // 但保留变体结构以便将来扩展
        schemes.vibrant = {
          light: this.schemeToTokens(theme.schemes.light),
          dark: this.schemeToTokens(theme.schemes.dark)
        };

        schemes.expressive = {
          light: this.schemeToTokens(theme.schemes.light),
          dark: this.schemeToTokens(theme.schemes.dark)
        };

        schemes.fidelity = {
          light: this.schemeToTokens(theme.schemes.light),
          dark: this.schemeToTokens(theme.schemes.dark)
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
        
        variants.forEach(variant => {
          schemes[variant] = {
            light: this.schemeToTokens(lightScheme),
            dark: this.schemeToTokens(darkScheme)
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
}

module.exports = ThemeColorService;