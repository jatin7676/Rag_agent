import { embed, embedMany } from 'ai';
import { google } from '@ai-sdk/google';
import { db } from '../db';
import { cosineDistance, desc, gt, sql } from 'drizzle-orm';
import { embeddings } from '../db/schema/embeddings';

const embeddingModel = google.textEmbeddingModel('gemini-embedding-001');

// The DB column is vector(768), so we must force the model to output 768 dims.
// gemini-embedding-001 defaults to 3072 dims, which would break inserts/queries.
const EMBEDDING_DIMENSIONS = 768;

const generateChunks = (input: string): string[] => {
  return input
    .trim()
    .split('.')
    .map(chunk => chunk.trim())
    .filter(chunk => chunk !== '');
};

export const generateEmbeddings = async (
  value: string,
): Promise<Array<{ embedding: number[]; content: string }>> => {
  const chunks = generateChunks(value);
  const { embeddings: embeddingVectors } = await embedMany({
    model: embeddingModel,
    values: chunks,
    providerOptions: {
      google: {
        outputDimensionality: EMBEDDING_DIMENSIONS,
        taskType: 'RETRIEVAL_DOCUMENT',
      },
    },
  });
  return embeddingVectors.map((e, i) => ({ content: chunks[i], embedding: e }));
};

export const generateEmbedding = async (value: string): Promise<number[]> => {
  const input = value.replaceAll('\n', ' ');
  const { embedding } = await embed({
    model: embeddingModel,
    value: input,
    providerOptions: {
      google: {
        outputDimensionality: EMBEDDING_DIMENSIONS,
        taskType: 'RETRIEVAL_QUERY',
      },
    },
  });
  return embedding;
};

export const findRelevantContent = async (userQuery: string) => {
  try {
    const userQueryEmbedded = await generateEmbedding(userQuery);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const similarity = sql<number>`1 - (${cosineDistance(embeddings.embedding as any, userQueryEmbedded)})`;
    const similarGuides = await db
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .select({ name: embeddings.content, similarity: similarity as any })
      .from(embeddings)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .where(gt(similarity as any, 0.3) as any)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .orderBy(desc(similarity as any) as any)
      .limit(4);
    return similarGuides;
  } catch (e) {
    console.error('[findRelevantContent] Error:', e);
    // Surface the failure to the model instead of silently returning nothing,
    // which previously looked like "no relevant information found".
    return `Error retrieving information: ${
      e instanceof Error ? e.message : 'please try again.'
    }`;
  }
};
