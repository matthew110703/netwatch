import fs from 'node:fs';

const xml = fs.readFileSync(process.argv[2], 'utf8');
const nodeRe = /<node\b[^>]*>/g;
const hits = [];

for (const chunk of xml.match(nodeRe) ?? []) {
  const text = chunk.match(/text="([^"]*)"/)?.[1] ?? '';
  const desc = chunk.match(/content-desc="([^"]*)"/)?.[1] ?? '';
  const b = chunk.match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);
  if (!b) continue;
  const x1 = +b[1];
  const y1 = +b[2];
  const x2 = +b[3];
  const y2 = +b[4];
  const label = text || desc;
  if (!label) continue;
  hits.push({
    label: text,
    desc,
    cx: Math.round((x1 + x2) / 2),
    cy: Math.round((y1 + y2) / 2),
    bounds: `[${x1},${y1}][${x2},${y2}]`,
  });
}

const want = /play|search|movies|my list|home|watch|switch|theme|back|browse|tv\b/i;
for (const h of hits.filter((h) => want.test(`${h.label} ${h.desc}`))) {
  console.log(JSON.stringify(h));
}