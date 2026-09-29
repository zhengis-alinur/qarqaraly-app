import { randomUUID } from 'node:crypto';
import { db } from '../src/lib/db';
import { emptyListing, type Listing } from '../src/lib/types';
import { demoSamples } from './demo-data';
import { prepareDemoPhotos } from './demo-photos';

async function main() {
  if (process.env.ALLOW_DEMO_SEED !== 'true') {
    throw new Error('Для явной загрузки вымышленных примеров установите ALLOW_DEMO_SEED=true.');
  }
  const col = (await db()).collection<Listing>('listings');
  const photos = await prepareDemoPhotos();
  let added = 0;
  let illustrated = 0;
  for (const [index, sample] of demoSamples.entries()) {
    const { slug, ...fields } = sample;
    const data = {
      ...emptyListing,
      ...fields,
      title: `ДЕМО · ${sample.title}`,
      description: `${sample.description}\n\nДемонстрационные данные: объект вымышлен. Название, описание и точка на карте приведены как пример, а не как проверенная информация о Каркаралинске.`,
      address: 'Условная точка в районе Каркаралинска — не реальный адрес',
      amenities: sample.amenities || [],
      photos: photos[slug] || [],
      // A deterministic grid for demonstrating the map, not actual locations.
      lat: Number((49.399 + Math.floor(index / 6) * 0.006).toFixed(6)),
      lng: Number((75.449 + (index % 6) * 0.008).toFixed(6)),
      priceUnit: sample.category === 'transport' ? 'за час' : sample.category === 'stay' ? 'за ночь' : 'за услугу',
      conditions: 'Демонстрационная карточка. Покупка, аренда и посещение по этим сведениям не предоставляются. Координаты нельзя использовать для навигации.',
      hours: 'Режим работы не указан: объект демонстрационный.',
    };
    const now = new Date().toISOString();
    const result = await col.updateOne({ slug }, {
      $setOnInsert: {
        _id: randomUUID(), slug, ownerId: 'demo-unassigned', draft: data, published: data,
        status: 'published', feedback: '', confirmedAt: null, createdAt: now, updatedAt: now,
        revision: 1, demo: true,
      },
    }, { upsert: true });
    added += result.upsertedCount;
    if (!result.upsertedCount) {
      // Only fill empty, untouched demo galleries. Keep user uploads and pending edits.
      const filled = await col.updateOne({
        slug, demo: true, ownerId: 'demo-unassigned', status: 'published',
        'draft.photos': { $size: 0 }, 'published.photos': { $size: 0 },
      }, {
        $set: { 'draft.photos': data.photos, 'published.photos': data.photos },
        $inc: { revision: 1 },
      });
      illustrated += filled.modifiedCount;
    }
  }
  console.log(`Добавлено демо-карточек: ${added}. В наборе: ${demoSamples.length}. Галерей дополнено: ${illustrated}. Существующие фотографии и тексты сохранены.`);
}

main().then(() => process.exit(0)).catch(error => {
  console.error(error.message);
  process.exit(1);
});
