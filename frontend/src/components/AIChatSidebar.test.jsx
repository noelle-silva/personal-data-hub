import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import AIChatSidebar from './AIChatSidebar';

describe('AIChatSidebar', () => {
  beforeEach(() => {
    window.matchMedia = (query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    });

    jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      cb(0);
      return 1;
    });
    jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  });

  afterEach(() => {
    window.requestAnimationFrame.mockRestore();
    window.cancelAnimationFrame.mockRestore();
  });

  test('分界线支持键盘调整宽度', () => {
    render(
      <AIChatSidebar
        isOpen
        onClose={() => {}}
        defaultWidth={420}
        minWidth={320}
        overlayThreshold={Infinity}
      >
        <div>content</div>
      </AIChatSidebar>
    );

    const handle = screen.getByRole('separator', { name: '调整 AI 侧边栏宽度' });
    handle.focus();
    fireEvent.keyDown(handle, { key: 'ArrowLeft' });
    expect(screen.getByRole('separator', { name: '调整 AI 侧边栏宽度' })).toHaveAttribute('aria-valuenow', '436');
  });
});
