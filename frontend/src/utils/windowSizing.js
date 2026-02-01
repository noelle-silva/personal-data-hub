const clamp = (value, min, max) => {
  if (Number.isNaN(value)) return min;
  return Math.max(min, Math.min(max, value));
};

export const getAppBarHeight = (viewportWidth) => (viewportWidth < 600 ? 56 : 64);

export const normalizeViewport = (viewport) => {
  const width = viewport?.width ?? 1200;
  const height = viewport?.height ?? 800;
  const appBarHeight = viewport?.appBarHeight ?? getAppBarHeight(width);
  const margin = viewport?.margin ?? 20;
  return { width, height, appBarHeight, margin };
};

export const getViewportSnapshot = () => {
  if (typeof window === 'undefined') return normalizeViewport(null);
  const width = window.innerWidth || 1200;
  const height = window.innerHeight || 800;
  return normalizeViewport({ width, height, appBarHeight: getAppBarHeight(width), margin: 20 });
};

export const getAvailableArea = (viewport) => {
  const v = normalizeViewport(viewport);
  const availableWidth = Math.max(240, v.width - (v.margin * 2));
  const availableHeight = Math.max(240, v.height - v.appBarHeight - (v.margin * 2));
  return { ...v, availableWidth, availableHeight };
};

export const getDefaultWindowSizeForViewport = (contentType, viewport) => {
  const { availableWidth, availableHeight } = getAvailableArea(viewport);

  const isDocument = !contentType || contentType === 'document';
  const widthRatio = isDocument ? 0.9 : 0.85;
  const maxWidth = Math.min(availableWidth, isDocument ? 1380 : 1200);
  const minWidth = Math.min(availableWidth, isDocument ? 900 : 720);
  const targetWidth = Math.floor(availableWidth * widthRatio);
  const width = clamp(targetWidth, minWidth, maxWidth);

  const maxHeight = availableHeight;
  const minHeight = Math.min(maxHeight, 520);
  const targetHeight = Math.floor(availableHeight * 0.9);
  const height = clamp(targetHeight, minHeight, maxHeight);

  return { width, height };
};

export const getMaximizedWindowRect = (viewport) => {
  const { margin, appBarHeight, availableWidth, availableHeight } = getAvailableArea(viewport);
  return {
    position: { x: margin, y: appBarHeight + margin },
    size: { width: availableWidth, height: availableHeight }
  };
};

export const clampWindowPositionToViewport = ({ position, size, viewport }) => {
  const v = normalizeViewport(viewport);
  const safeSize = size || getDefaultWindowSizeForViewport('document', v);

  const minX = v.margin;
  const minY = v.appBarHeight + v.margin;
  const maxX = Math.max(minX, v.width - v.margin - safeSize.width);
  const maxY = Math.max(minY, v.height - v.margin - safeSize.height);

  return {
    x: clamp(position?.x ?? minX, minX, maxX),
    y: clamp(position?.y ?? minY, minY, maxY)
  };
};

