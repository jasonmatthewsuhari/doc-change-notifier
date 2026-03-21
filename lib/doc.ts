import crypto from 'crypto';

export function extractDocId(url: string): string | null {
  const match = url.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

export async function fetchDocContent(docId: string): Promise<string> {
  const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=txt`;
  const res = await fetch(exportUrl, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch doc: ${res.status}`);
  return res.text();
}

export function hashContent(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}
