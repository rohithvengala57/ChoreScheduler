const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function nanoid(len: number): string {
  let out = "";
  for (let i = 0; i < len; i++) out += CHARS[Math.floor(Math.random() * CHARS.length)];
  return out;
}
