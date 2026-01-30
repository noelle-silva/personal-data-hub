export const buildMixedItems = (page) => {
  if (!page) return [];

  if (Array.isArray(page.contentItems) && page.contentItems.length > 0) {
    return page.contentItems.map((item) => {
      let data = null;
      switch (item.kind) {
        case 'Document':
          data = page.referencedDocumentIds?.find((doc) => doc._id === item.refId);
          break;
        case 'Quote':
          data = page.referencedQuoteIds?.find((quote) => quote._id === item.refId);
          break;
        case 'Attachment':
          data = page.referencedAttachmentIds?.find((att) => att._id === item.refId);
          break;
        default:
          data = null;
      }

      return {
        id: `${item.kind}:${item.refId}`,
        kind: item.kind,
        data,
      };
    });
  }

  const mixedItems = [];

  page.referencedDocumentIds?.forEach((doc) => {
    mixedItems.push({
      id: `Document:${doc._id}`,
      kind: 'Document',
      data: doc,
      updatedAt: doc.updatedAt,
    });
  });

  page.referencedQuoteIds?.forEach((quote) => {
    mixedItems.push({
      id: `Quote:${quote._id}`,
      kind: 'Quote',
      data: quote,
      updatedAt: quote.updatedAt,
    });
  });

  page.referencedAttachmentIds?.forEach((attachment) => {
    mixedItems.push({
      id: `Attachment:${attachment._id}`,
      kind: 'Attachment',
      data: attachment,
      updatedAt: attachment.updatedAt,
    });
  });

  mixedItems.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  return mixedItems;
};

