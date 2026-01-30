import { buildMixedItems } from './buildMixedItems';

describe('buildMixedItems', () => {
  test('uses contentItems order when present', () => {
    const doc = { _id: 'd1', updatedAt: '2020-01-01T00:00:00.000Z' };
    const quote = { _id: 'q1', updatedAt: '2020-01-02T00:00:00.000Z' };
    const page = {
      contentItems: [
        { kind: 'Quote', refId: 'q1' },
        { kind: 'Document', refId: 'd1' },
      ],
      referencedDocumentIds: [doc],
      referencedQuoteIds: [quote],
      referencedAttachmentIds: [],
    };

    const items = buildMixedItems(page);
    expect(items.map((i) => i.id)).toEqual(['Quote:q1', 'Document:d1']);
    expect(items[0].data).toBe(quote);
    expect(items[1].data).toBe(doc);
  });

  test('falls back to updatedAt desc when no contentItems', () => {
    const page = {
      referencedDocumentIds: [{ _id: 'd1', updatedAt: '2020-01-01T00:00:00.000Z' }],
      referencedQuoteIds: [{ _id: 'q1', updatedAt: '2020-01-03T00:00:00.000Z' }],
      referencedAttachmentIds: [{ _id: 'a1', updatedAt: '2020-01-02T00:00:00.000Z' }],
    };

    const items = buildMixedItems(page);
    expect(items.map((i) => i.id)).toEqual(['Quote:q1', 'Attachment:a1', 'Document:d1']);
  });
});

