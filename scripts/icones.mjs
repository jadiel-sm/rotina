// Gera os ícones PNG (192 e 512) sem dependências: fundo verde, círculo e "check" brancos.
// Desenho dentro dos 60% centrais, então serve também como ícone "maskable" do Android.
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

const FUNDO = [31, 107, 88], BRANCO = [255, 255, 255];

function distSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}
function branco(x, y) {
  const r = Math.hypot(x - 0.5, y - 0.5);
  if (Math.abs(r - 0.27) < 0.022) return true;
  const e = 0.032;
  return distSeg(x, y, 0.385, 0.505, 0.465, 0.585) < e || distSeg(x, y, 0.465, 0.585, 0.625, 0.42) < e;
}

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (const b of buf) {
    c = (crc ^ b) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function bloco(tipo, dados) {
  const t = Buffer.from(tipo);
  const tam = Buffer.alloc(4); tam.writeUInt32BE(dados.length);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, dados])));
  return Buffer.concat([tam, t, dados, crc]);
}
function png(n) {
  const S = 4; // supersampling para borda suave
  const linhas = Buffer.alloc(n * (n * 3 + 1));
  for (let y = 0; y < n; y++) {
    linhas[y * (n * 3 + 1)] = 0;
    for (let x = 0; x < n; x++) {
      let cob = 0;
      for (let sy = 0; sy < S; sy++) for (let sx = 0; sx < S; sx++) {
        if (branco((x + (sx + 0.5) / S) / n, (y + (sy + 0.5) / S) / n)) cob++;
      }
      const a = cob / (S * S);
      const o = y * (n * 3 + 1) + 1 + x * 3;
      for (let c = 0; c < 3; c++) linhas[o + c] = Math.round(FUNDO[c] * (1 - a) + BRANCO[c] * a);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(n, 0); ihdr.writeUInt32BE(n, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8 bits, RGB
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    bloco('IHDR', ihdr), bloco('IDAT', deflateSync(linhas, { level: 9 })), bloco('IEND', Buffer.alloc(0)),
  ]);
}

const pasta = new URL('../icones/', import.meta.url);
mkdirSync(pasta, { recursive: true });
for (const n of [192, 512]) writeFileSync(new URL('icone-' + n + '.png', pasta), png(n));
console.log('ícones gerados');
