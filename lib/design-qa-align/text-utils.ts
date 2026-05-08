/** 归一化用于匹配的文本 */
export function normalizeText(s: string | undefined): string {
  if (s == null) return "";
  return s.replace(/\s+/g, " ").trim();
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array(n + 1).fill(0),
  );
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
    }
  }
  return dp[m][n];
}

/** 0~1，1 为完全相同 */
export function textSimilarity(a: string | undefined, b: string | undefined): number {
  const x = normalizeText(a);
  const y = normalizeText(b);
  if (!x && !y) return 0.55;
  if (!x || !y) return 0;
  if (x === y) return 1;
  const dist = levenshtein(x, y);
  const maxLen = Math.max(x.length, y.length, 1);
  return Math.max(0, 1 - dist / maxLen);
}
