import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import MarkdownInlineRenderer from './MarkdownInlineRenderer';
import { renderMarkdownToHtml } from '../utils/markdownRenderer';
import { replaceWithAttachmentUrls } from '../services/attachmentUrlCache';

jest.mock('../utils/markdownRenderer', () => ({
  renderMarkdownToHtml: jest.fn(),
  generateBaseStylesScoped: jest.fn(() => ''),
  generateHighlightStylesScoped: jest.fn(() => ''),
  generateKatexStylesScoped: jest.fn(() => '')
}));

jest.mock('../utils/tabActionStyles', () => ({
  generateTabActionFancyCssScoped: jest.fn(() => ''),
  generateQuoteActionFancyCssScoped: jest.fn(() => ''),
  generateAttachmentActionFancyCssScoped: jest.fn(() => '')
}));

jest.mock('../utils/aiChatEnhancedStyles', () => ({
  generateAIChatEnhancedStylesScoped: jest.fn(() => '')
}));

jest.mock('../utils/aiChatPreprocessor', () => ({
  preprocessAIMessageContent: jest.fn((content) => content)
}));

jest.mock('../services/attachmentUrlCache', () => ({
  extractAttachmentIds: jest.fn((content) => {
    const regex = /attach:\/\/([a-fA-F0-9]{24})/g;
    const ids = new Set();
    let match;
    while ((match = regex.exec(content)) !== null) {
      ids.add(match[1]);
    }
    return Array.from(ids);
  }),
  replaceWithAttachmentUrls: jest.fn(async (content) => content)
}));

test('MarkdownInlineRenderer 在 DOMPurify 前把 attach:// 转换为可访问 URL（img/video）', async () => {
  const id = '68e40bae66039f7f74d20199';
  const html = `<p>hi</p><img src="attach://${id}" alt="a" /><video src="attach://${id}" controls></video>`;

  renderMarkdownToHtml.mockReturnValue(html);
  replaceWithAttachmentUrls.mockImplementation(async (content) => {
    return content.replaceAll(`attach://${id}`, `http://gw/attachments/${id}`);
  });

  const { container } = render(<MarkdownInlineRenderer content="x" cacheKey="k" />);

  await waitFor(() => {
    const img = screen.getByRole('img');
    expect(img.getAttribute('src')).toBe(`http://gw/attachments/${id}`);

    const video = container.querySelector('video');
    expect(video).not.toBeNull();
    expect(video.getAttribute('src')).toBe(`http://gw/attachments/${id}`);
  });

  expect(replaceWithAttachmentUrls).toHaveBeenCalledWith(html);
});

