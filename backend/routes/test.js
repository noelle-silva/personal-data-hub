/**
 * 测试路由
 * 用于测试各种功能，包括SSE流式响应
 */

const express = require('express');
const router = express.Router();

/**
 * @route   GET /api/test/sse
 * @desc    测试SSE流式响应，特别测试多字节字符处理
 * @access  Public
 */
router.get('/sse', (req, res) => {
  // 设置SSE响应头
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  
  // 刷新响应头
  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders();
  }

  // 测试内容，包含多字节字符
  const testContent = [
    { type: 'chunk', content: '这是第一段测试内容，包含中文' },
    { type: 'chunk', content: 'This is English content' },
    { type: 'chunk', content: '混合内容：中文English日本語🌟' },
    { type: 'chunk', content: '测试特殊字符：😀😃😄😁😆😅😂🤣☺️😊😇🙂🙃😉😌😍🥰😘😗😙😚😋😛😝😜🤪🤨🧐🤓😎🤩🥳😏😒😞😔😟😕🙁☹️😣😖😫😩🥺😢😭😤😠😡🤬🤯😳🥵🥶😱😨😰😥😓🤗🤔🤭🤫🤥😶😐😑😬🙄😯😦😧😮😲🥱😴🤤😪😵🤐🥴🤢🤮🤧😷🤒🤕🤑🤠😈👿👹👺🤡💩👻💀☠️👽👾🤖🎃😺😸😹😻😼😽🙀😿😾' },
    { type: 'chunk', content: '最后一段内容，包含一些可能被截断的字符：测试结束' }
  ];

  let index = 0;
  
  // 发送数据块
  const sendChunk = () => {
    if (index < testContent.length) {
      const item = testContent[index];
      
      if (item.type === 'chunk') {
        // 模拟OpenAI格式的响应
        const chunk = {
          id: `test-${index}`,
          object: 'chat.completion.chunk',
          created: Date.now(),
          model: 'test-model',
          choices: [
            {
              index: 0,
              delta: {
                content: item.content
              },
              finish_reason: null
            }
          ]
        };
        
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      }
      
      index++;
      
      // 模拟网络延迟
      setTimeout(sendChunk, 200);
    } else {
      // 发送结束标记
      res.write('data: [DONE]\n\n');
      res.end();
    }
  };
  
  // 开始发送
  sendChunk();
});

/**
 * @route   GET /api/test/sse-split
 * @desc    测试SSE流式响应，按字节切片写出完整SSE帧，模拟网络分片
 * @access  Public
 */
router.get('/sse-split', (req, res) => {
  // 设置SSE响应头
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  
  // 刷新响应头
  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders();
  }

  // 测试内容，包含多字节字符
  const testChunks = [
    '这是第一段，',
    '包含中文',
    '和English',
    '混合内容：',
    '😀🌟🎉',
    '测试结束'
  ];
  
  let chunkIndex = 0;
  
  const sendChunk = () => {
    if (chunkIndex < testChunks.length) {
      const content = testChunks[chunkIndex];
      
      // 创建OpenAI格式的响应
      const chunk = {
        id: `test-${chunkIndex}`,
        object: 'chat.completion.chunk',
        created: Date.now(),
        model: 'test-model',
        choices: [
          {
            index: 0,
            delta: {
              content: content
            },
            finish_reason: null
          }
        ]
      };
      
      // 构建完整的SSE行
      const sseLine = `data: ${JSON.stringify(chunk)}\n\n`;
      
      // 转换为Buffer并按小字节切片写出，模拟网络分片
      const buffer = Buffer.from(sseLine, 'utf8');
      let offset = 0;
      const sliceSize = 3; // 每3个字节一个分片，刻意切分多字节字符
      
      const sendSlice = () => {
        if (offset < buffer.length) {
          const end = Math.min(offset + sliceSize, buffer.length);
          const slice = buffer.slice(offset, end);
          
          // 写入分片
          res.write(slice);
          
          offset = end;
          
          // 继续发送下一个分片
          setImmediate(sendSlice);
        } else {
          // 当前chunk发送完成，继续下一个chunk
          chunkIndex++;
          setTimeout(sendChunk, 200); // 模拟网络延迟
        }
      };
      
      // 开始发送当前chunk的分片
      sendSlice();
    } else {
      // 所有chunk发送完成，发送结束标记
      const doneLine = 'data: [DONE]\n\n';
      const doneBuffer = Buffer.from(doneLine, 'utf8');
      
      // 也对DONE标记进行分片发送
      let offset = 0;
      const sliceSize = 2;
      
      const sendDoneSlice = () => {
        if (offset < doneBuffer.length) {
          const end = Math.min(offset + sliceSize, doneBuffer.length);
          const slice = doneBuffer.slice(offset, end);
          
          res.write(slice);
          
          offset = end;
          
          setImmediate(sendDoneSlice);
        } else {
          // 完全结束
          res.end();
        }
      };
      
      // 开始发送DONE分片
      sendDoneSlice();
    }
  };
  
  // 开始发送
  sendChunk();
});

module.exports = router;