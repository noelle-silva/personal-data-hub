import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import HtmlInlineRenderer from './HtmlInlineRenderer';

describe('HtmlInlineRenderer', () => {
  test('渲染基本 HTML', async () => {
    render(<HtmlInlineRenderer content="<p>hello</p>" />);
    expect(await screen.findByText('hello')).toBeInTheDocument();
  });

  test('x-tab-action 转为按钮并 postMessage', async () => {
    const spy = jest.spyOn(window, 'postMessage').mockImplementation(() => {});
    render(
      <HtmlInlineRenderer
        content='<x-tab-action data-action="open-document" data-doc-id="abc">打开</x-tab-action>'
      />
    );

    const btn = await screen.findByRole('button', { name: '打开' });
    fireEvent.click(btn);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});

