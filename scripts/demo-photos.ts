import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { db } from '../src/lib/db';
import type { Photo } from '../src/lib/types';

type Source = { id: string; caption: string; source?: string };
const selections: Record<string, string[]> = {
  'demo-forest-house': ['cabin', 'forest'],
  'demo-cafe': ['cafe'],
  'demo-trail': ['forest', 'mountains'],
  'demo-market': ['market'],
  'demo-outdoor-shop': ['camping'],
  'demo-souvenir-shop': ['city'],
  'demo-rope-park': ['forest'],
  'demo-craft-workshop': ['cafe'],
  'demo-recreation-pine': ['cabin', 'forest'],
  'demo-recreation-meadow': ['forest', 'camping'],
  'demo-camping': ['camping', 'forest'],
  'demo-atv-rental': ['atv'],
  'demo-bike-rental': ['bike'],
  'demo-horse-rental': ['horse'],
  'demo-kumys-farm': ['horse', 'dairy'],
  'demo-kumys-shop': ['dairy'],
  'demo-kumys-yurt': ['dairy', 'horse'],
  'demo-viewpoint': ['mountains'],
  'demo-stone-arch': ['mountains'],
  'demo-history-house': ['city'],
  'demo-tourist-center': ['city'],
  'demo-bus-station': ['city'],
  'demo-pharmacy': ['medical'],
  'demo-medical-center': ['medical'],
};

export async function prepareDemoPhotos(): Promise<Record<string, Photo[]>> {
  const sources: Record<string, Source> = JSON.parse(await readFile(new URL('./photo-sources.json', import.meta.url), 'utf8'));
  const directory = path.resolve(process.env.UPLOAD_DIR || 'uploads');
  await mkdir(directory, { recursive: true });
  const database = await db();
  const photos: Record<string, Photo> = {};
  for (const [key, source] of Object.entries(sources)) {
    const buffer = await readFile(new URL(`./assets/demo/${key}.webp`, import.meta.url));
    const name = `${createHash('sha256').update(buffer).digest('hex')}.webp`;
    await writeFile(path.join(directory, name), buffer);
    const url = `/uploads/${name}`;
    photos[key] = { url, caption: source.caption };
    await database.collection('photos').updateOne({ url }, { $setOnInsert: {
      url, ownerId: 'demo-unassigned', createdAt: new Date(), demo: true,
      source: source.source || `https://images.unsplash.com/photo-${source.id}`, provider: 'Unsplash',
    } }, { upsert: true });
  }
  return Object.fromEntries(Object.entries(selections).map(([slug, keys]) => [slug, keys.map(key => photos[key])]));
}
