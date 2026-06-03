'use server';

import {
  NewResourceParams,
  insertResourceSchema,
  resources,
} from '@/lib/db/schema/resources';
import { db } from '../db';
import { generateEmbeddings } from '../ai/embedding';
import { embeddings as embeddingsTable } from '../db/schema/embeddings';

export const createResource = async (input: NewResourceParams) => {
  try {
    const { content } = insertResourceSchema.parse(input);

    // Generate embeddings first so a failure here never leaves an orphaned
    // resource row with no embeddings.
    const embeddings = await generateEmbeddings(content);

    // Insert the resource and its embeddings atomically: if either insert
    // fails, the whole thing rolls back.
    await db.transaction(async tx => {
      const [resource] = await tx
        .insert(resources)
        .values({ content })
        .returning();

      await tx.insert(embeddingsTable).values(
        embeddings.map(embedding => ({
          resourceId: resource.id,
          ...embedding,
        })),
      );
    });

    return 'Resource successfully created and embeddings generated.';
  } catch (e) {
    console.error('[createResource] Error:', e);
    if (e instanceof Error)
      return `Error: ${e.message.length > 0 ? e.message : 'please try again.'}`;
    return 'Error: please try again.';
  }
};