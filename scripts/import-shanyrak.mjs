import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { MongoClient } from 'mongodb';

const content = JSON.parse(await readFile(new URL('../content/shanyrak.json', import.meta.url), 'utf8'));
const client = await MongoClient.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/qarqaraly');
try {
  for (const { slug, data } of content.records) {
    const now = new Date().toISOString();
    const result = await client.db().collection('listings').updateOne({ slug }, { $setOnInsert: {
      _id: randomUUID(), slug, ownerId: 'editorial-unassigned', draft: data, published: data,
      status: 'published', feedback: '', confirmedAt: null, createdAt: now, updatedAt: now,
      revision: 1, demo: false, editorialSource: { checkedAt: content.checkedAt, urls: content.sources },
    } }, { upsert: true });
    console.log(`${slug}: ${result.upsertedCount ? 'added' : 'already exists; unchanged'}`);
  }
} finally {
  await client.close();
}
