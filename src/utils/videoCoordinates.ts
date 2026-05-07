export interface Point {
  x: number;
  y: number;
}

type ObjectFitMode = 'contain' | 'cover';

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function getFittedMediaRect(
  containerWidth: number,
  containerHeight: number,
  mediaWidth: number,
  mediaHeight: number,
  fit: ObjectFitMode,
) {
  if (containerWidth <= 0 || containerHeight <= 0 || mediaWidth <= 0 || mediaHeight <= 0) {
    return {
      x: 0,
      y: 0,
      width: containerWidth,
      height: containerHeight,
    };
  }

  const scale = fit === 'cover'
    ? Math.max(containerWidth / mediaWidth, containerHeight / mediaHeight)
    : Math.min(containerWidth / mediaWidth, containerHeight / mediaHeight);
  const width = mediaWidth * scale;
  const height = mediaHeight * scale;

  return {
    x: (containerWidth - width) / 2,
    y: (containerHeight - height) / 2,
    width,
    height,
  };
}

export function containerPointToVideoPoint(
  clientPoint: Point,
  containerRect: DOMRect,
  mediaWidth: number,
  mediaHeight: number,
  fit: ObjectFitMode = 'cover',
): Point {
  const fitted = getFittedMediaRect(
    containerRect.width,
    containerRect.height,
    mediaWidth,
    mediaHeight,
    fit,
  );

  return {
    x: clamp01((clientPoint.x - containerRect.left - fitted.x) / fitted.width),
    y: clamp01((clientPoint.y - containerRect.top - fitted.y) / fitted.height),
  };
}

export function videoPointToContainerPoint(
  point: Point,
  containerWidth: number,
  containerHeight: number,
  mediaWidth: number,
  mediaHeight: number,
  fit: ObjectFitMode = 'cover',
): Point {
  const fitted = getFittedMediaRect(
    containerWidth,
    containerHeight,
    mediaWidth,
    mediaHeight,
    fit,
  );

  return {
    x: clamp01((fitted.x + point.x * fitted.width) / containerWidth),
    y: clamp01((fitted.y + point.y * fitted.height) / containerHeight),
  };
}
