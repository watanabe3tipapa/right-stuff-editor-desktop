import { describe, expect, it } from "vitest";
import { cosineSimilarityTexts, jaccardSimilarity } from "./similarity";

describe("jaccardSimilarity", () => {
  it("同じ文面は 1", () => {
    expect(jaccardSimilarity("apple banana", "apple banana")).toBeCloseTo(1, 5);
  });

  it("共通する語が無いときは 0", () => {
    expect(jaccardSimilarity("apple", "zebra")).toBe(0);
  });

  it("空文字列は 0", () => {
    expect(jaccardSimilarity("", "apple")).toBe(0);
  });

  it("助詞や記号は大文字小文字を無視する", () => {
    expect(jaccardSimilarity("The Apple, the Banana!", "apple banana")).toBeCloseTo(1, 5);
  });

  it("日本語でも比較できる", () => {
    expect(jaccardSimilarity("猫と犬", "猫と犬")).toBeCloseTo(1, 5);
    expect(jaccardSimilarity("猫と犬", "車と自転車")).toBe(0);
  });
});

describe("cosineSimilarityTexts", () => {
  it("同じ文面は 1", () => {
    expect(cosineSimilarityTexts("apple banana", "apple banana")).toBeCloseTo(1, 5);
  });

  it("空文字列は 0", () => {
    expect(cosineSimilarityTexts("", "apple")).toBe(0);
  });

  it("語が重なるほど値は高くなる", () => {
    const partial = cosineSimilarityTexts("apple banana cherry", "apple banana");
    const none = cosineSimilarityTexts("apple banana cherry", "zebra yak");
    expect(partial).toBeGreaterThan(none);
  });
});
