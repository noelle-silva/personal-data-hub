import { extractAttachmentIds, replaceWithAttachmentUrls } from './attachmentUrlCache';

describe('attachmentUrlCache', () => {
  beforeEach(() => {
    window.__PDH_GATEWAY_URL__ = 'http://127.0.0.1:1234';
  });

  afterEach(() => {
    delete window.__PDH_GATEWAY_URL__;
  });

  test('extractAttachmentIds returns unique ids', () => {
    const id = '0123456789abcdef01234567';
    const content = `a attach://${id} b attach://${id}`;
    expect(extractAttachmentIds(content)).toEqual([id]);
  });

  test('replaceWithAttachmentUrls replaces attach://', async () => {
    const id = '0123456789abcdef01234567';
    const content = `before attach://${id} after`;
    const result = await replaceWithAttachmentUrls(content);
    expect(result).toBe(`before http://127.0.0.1:1234/attachments/${id} after`);
  });
});

