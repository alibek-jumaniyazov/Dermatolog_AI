import { describe, expect, it } from 'vitest';
import { validateUpload } from './upload';
const image = (mib: number, type = 'image/jpeg') => ({ size: mib * 1024 * 1024, type });
describe('Upload safeguards before sending private files', () => {
  it('allows the exact per-file and total boundaries', () => expect(validateUpload([image(10), image(10)], [image(10)])).toBeNull());
  it('counts existing server images and local selections together', () => expect(validateUpload([image(1)], Array.from({ length: 5 }, () => image(1)))).not.toBeNull());
  it('rejects an empty file, SVG and HEIC', () => { for (const file of [image(0), image(1, 'image/svg+xml'), image(1, 'image/heic')]) expect(validateUpload([file])).not.toBeNull(); });
  it('does not accept an oversized file merely because the total is small', () => expect(validateUpload([image(10.01)])).not.toBeNull());
  it('enforces the total budget across existing and incoming images', () => expect(validateUpload([image(10), image(10)], [image(10), image(0.1)])).not.toBeNull());
});
