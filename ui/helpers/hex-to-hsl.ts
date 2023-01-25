export default (hex: string) => {
  const r = Number.parseInt(hex.slice(1, 3), 16) / 255;
  const g = Number.parseInt(hex.slice(3, 5), 16) / 255;
  const b = Number.parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  const s =
    max === min ? 0 : l < 0.5 ? (max - min) / (max + min) : (max - min) / (2 - max - min);

  const h =
    max === min
      ? 0
      : r === max
      ? (g - b) / (max - min)
      : g === max
      ? 2 + (b - r) / (max - min)
      : 4 + (r - g) / (max - min);

  return [h * 60, s * 100, l * 100] as const;
};
