import { readFile, writeFile, mkdir } from 'node:fs/promises';
import sharp from 'sharp';

const directory = new URL('./assets/demo/', import.meta.url);
const sources: Record<string, { id: string }> = JSON.parse(await readFile(new URL('./photo-sources.json', import.meta.url), 'utf8'));
await mkdir(directory, { recursive: true });
// Small batches avoid a burst of requests to the image host.
const requested = process.argv.slice(2);
const entries = Object.entries(sources).filter(([key]) => !requested.length || requested.includes(key));
for (let offset = 0; offset < entries.length; offset += 3) {
  const results = await Promise.allSettled(entries.slice(offset, offset + 3).map(async ([key, source]) => {
    const response = await fetch(`https://images.unsplash.com/photo-${source.id}?auto=format&fit=crop&w=1400&q=85`, { signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(`${key}: HTTP ${response.status}`);
    const buffer = await sharp(Buffer.from(await response.arrayBuffer()))
      .rotate().resize(1200, 900, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 78 }).toBuffer();
    await writeFile(new URL(`${key}.webp`, directory), buffer);
    console.log(`${key}: ${Math.round(buffer.length / 1024)} КБ`);
  }));
  for (const result of results) if (result.status === 'rejected') { console.error(String(result.reason)); process.exitCode = 1; }
}
