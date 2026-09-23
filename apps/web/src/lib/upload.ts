type FileInfo = { type: string; size: number };
export function validateUpload(incoming: FileInfo[], existing: FileInfo[] = []): string | null {
  if (incoming.length + existing.length > 5) return 'Bitta tahlil uchun ko‘pi bilan 5 ta surat tanlang.';
  if (incoming.some(file => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type))) return 'JPEG, PNG yoki WebP tanlang. HEIC suratni JPEG’ga aylantiring.';
  if (incoming.some(file => file.size > 10 * 1024 * 1024 || file.size === 0)) return 'Har surat hajmi 0 dan katta va 10 MiB dan oshmasin.';
  if ([...incoming, ...existing].reduce((sum, file) => sum + file.size, 0) > 30 * 1024 * 1024) return 'Suratlarning jami hajmi 30 MiB dan oshmasin.';
  return null;
}
