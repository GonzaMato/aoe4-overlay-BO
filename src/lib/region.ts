export interface Point { x: number; y: number; }
export interface Rectangle extends Point { width: number; height: number; }

export function selectionRect(start: Point, end: Point, width: number, height: number): Rectangle {
  const clamp = (n: number, max: number) => Math.max(0, Math.min(n, max));
  const x1 = clamp(start.x, width), x2 = clamp(end.x, width);
  const y1 = clamp(start.y, height), y2 = clamp(end.y, height);
  return { x: Math.min(x1,x2), y: Math.min(y1,y2), width: Math.abs(x2-x1), height: Math.abs(y2-y1) };
}

export function physicalRegion(rect: Rectangle, screen: Rectangle, viewportWidth: number, viewportHeight: number, target: 'workers' | 'idle' = 'workers'): Rectangle {
  if (viewportWidth <= 0 || viewportHeight <= 0) throw new Error('La pantalla todavía no está lista.');
  const sx = screen.width / viewportWidth, sy = screen.height / viewportHeight;
  const region = {
    x: screen.x + Math.round(rect.x * sx), y: screen.y + Math.round(rect.y * sy),
    width: Math.round((rect.x + rect.width) * sx) - Math.round(rect.x * sx),
    height: Math.round((rect.y + rect.height) * sy) - Math.round(rect.y * sy)
  };
  if (Object.values(region).some(n => !Number.isFinite(n)) || region.width < 10 || region.height < (target === 'idle' ? 10 : 40))
    throw new Error(target === 'idle' ? 'Encerrá el número de aldeanos inactivos.' : 'Arrastrá para encerrar los cuatro contadores de aldeanos.');
  if (region.width > 1000 || region.height > 500)
    throw new Error('La región es demasiado grande. Seleccioná solo los cuatro números de aldeanos.');
  return region;
}
