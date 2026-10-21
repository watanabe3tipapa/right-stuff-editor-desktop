/**
 * Simple local similarity utilities (no external deps). Used for "related documents".
 */

const stopWords = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "in",
  "is",
  "it",
  "of",
  "on",
  "or",
  "the",
  "to",
  "with",
  "was",
  "were",
  "that",
  "this",
  "these",
  "those",
]);

const normalize = (text: string): string => {
  return text
    .toLowerCase()
    .normalize("NFC")
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const tokenize = (text: string): string[] => {
  const norm = normalize(text);
  if (!norm) return [];
  return norm
    .split(" ")
    .filter((t) => t.length > 1 && !stopWords.has(t));
};

export const jaccardSimilarity = (a: string, b: string): number => {
  const ta = new Set(tokenize(a));
  const tb = new Set(tokenize(b));
  if (ta.size === 0 || tb.size === 0) return 0;
  let intersection = 0;
  for (const x of ta) {
    if (tb.has(x)) intersection++;
  }
  const union = ta.size + tb.size - intersection;
  return intersection / union;
};

export const termFrequency = (tokens: string[]): Map<string, number> => {
  const tf = new Map<string, number>();
  for (const t of tokens) {
    tf.set(t, (tf.get(t) ?? 0) + 1);
  }
  return tf;
};

export const cosineSimilarityTexts = (a: string, b: string): number => {
  const ta = tokenize(a);
  const tb = tokenize(b);
  if (ta.length === 0 || tb.length === 0) return 0;
  const tfA = termFrequency(ta);
  const tfB = termFrequency(tb);
  const vocab = new Set<string>([...tfA.keys(), ...tfB.keys()]);
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (const w of vocab) {
    const va = tfA.get(w) ?? 0;
    const vb = tfB.get(w) ?? 0;
    dot += va * vb;
    magA += va * va;
    magB += vb * vb;
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
};

export default {
  jaccardSimilarity,
  cosineSimilarityTexts,
};
