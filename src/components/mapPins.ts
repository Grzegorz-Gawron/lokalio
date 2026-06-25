// Wspólny wygląd pinów (Leaflet + Mapbox) — jedna prawda dla obu silników mapy.
export function pinHtml(emoji: string, color: string, active: boolean): string {
  const s = active ? 42 : 32;
  const glow = active
    ? `box-shadow:0 0 0 6px ${color}33, 0 6px 12px rgba(15,23,41,.4);`
    : 'box-shadow:0 4px 10px rgba(15,23,41,.35);';
  return `<div style="width:48px;height:48px;display:flex;align-items:center;justify-content:center;">
    <div style="width:${s}px;height:${s}px;border-radius:50% 50% 50% 0;transform:rotate(45deg);background:${color};display:flex;align-items:center;justify-content:center;border:3px solid #fff;${glow}">
      <span style="transform:rotate(-45deg);font-size:${active ? 19 : 15}px;line-height:1;">${emoji}</span>
    </div>
  </div>`;
}

export const USER_HTML = `<div style="width:26px;height:26px;display:flex;align-items:center;justify-content:center;">
  <div style="width:16px;height:16px;border-radius:50%;background:#185FA5;border:3px solid #fff;box-shadow:0 0 0 7px rgba(24,95,165,.18);"></div></div>`;
