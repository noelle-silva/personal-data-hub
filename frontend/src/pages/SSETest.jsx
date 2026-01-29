import React, { useState, useRef } from 'react';
import {
  Container,
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  Alert,
  Paper,
  CircularProgress,
  Chip,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { resolveApiUrl } from '../services/serverConfig';

// 样式化的容器
const TestContainer = styled(Container)(({ theme }) => ({
  paddingTop: theme.spacing(4),
  paddingBottom: theme.spacing(4),
}));

// 样式化的消息容器
const MessageContainer = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  marginTop: theme.spacing(2),
  marginBottom: theme.spacing(2),
  backgroundColor: theme.palette.background.paper,
  border: `1px solid ${theme.palette.divider}`,
  maxHeight: '400px',
  overflowY: 'auto',
}));

// 样式化的消息卡片
const MessageCard = styled(Paper)(({ theme, isUser }) => ({
  padding: theme.spacing(2),
  marginBottom: theme.spacing(1),
  backgroundColor: isUser 
    ? theme.palette.primary.main 
    : theme.palette.background.paper,
  color: isUser 
    ? theme.palette.primary.contrastText 
    : theme.palette.text.primary,
  borderRadius: theme.spacing(1),
}));

const SSETest = () => {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [testType, setTestType] = useState('normal');
  const [receivedContent, setReceivedContent] = useState('');
  const controllerRef = useRef(null);
  const messagesEndRef = useRef(null);

  // 滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 测试SSE连接
  const testSSEConnection = async () => {
    if (isLoading) return;

    setIsLoading(true);
    setError(null);
    setMessages([]);
    setReceivedContent('');

    try {
      // 创建AbortController
      const controller = new AbortController();
      controllerRef.current = controller;

      // 确定测试端点
      const endpoint = testType === 'split' 
        ? resolveApiUrl('/api/test/sse-split')
        : resolveApiUrl('/api/test/sse');
      
      // 发送请求
      const response = await fetch(endpoint, {
        method: 'GET',
        credentials: 'include',
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`请求失败: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let completed = false;

      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            // 流结束时，flush 解码器以处理可能的多字节字符末尾
            const tail = decoder.decode();
            if (tail) {
              buffer += tail;
            }
            break;
          }
          
          // 解码数据块
          buffer += decoder.decode(value, { stream: true });
          
          // 处理SSE数据，支持 CRLF 换行符
          const lines = buffer.split(/\r?\n/);
          buffer = lines.pop() || ''; // 保留最后一行（可能不完整）
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim(); // 去除可能的空白字符和 CR
              
              // 检查是否结束
              if (data === '[DONE]') {
                completed = true;
                break; // 跳出循环，确保在 finally 中处理完成逻辑
              }
              
              try {
                // 解析JSON数据
                const chunk = JSON.parse(data);
                
                // 添加消息
                const message = {
                  id: chunk.id,
                  content: chunk.choices?.[0]?.delta?.content || '',
                  timestamp: new Date(),
                  finishReason: chunk.choices?.[0]?.finish_reason
                };
                
                setMessages(prev => [...prev, message]);
                
                // 收集内容
                if (message.content) {
                  setReceivedContent(prev => prev + message.content);
                }
              } catch (parseError) {
                console.warn('解析SSE数据失败:', parseError, data);
              }
            }
          }
          
          // 如果已经收到 [DONE] 标记，跳出读取循环
          if (completed) break;
        }
        
        // 处理 buffer 中剩余的数据（如果有）
        if (buffer && !completed) {
          const lines = buffer.split(/\r?\n/);
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim();
              
              if (data === '[DONE]') {
                completed = true;
                break;
              }
              
              try {
                const chunk = JSON.parse(data);
                
                const message = {
                  id: chunk.id,
                  content: chunk.choices?.[0]?.delta?.content || '',
                  timestamp: new Date(),
                  finishReason: chunk.choices?.[0]?.finish_reason
                };
                
                setMessages(prev => [...prev, message]);
                
                if (message.content) {
                  setReceivedContent(prev => prev + message.content);
                }
              } catch (parseError) {
                console.warn('解析SSE数据失败:', parseError, data);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('请求已取消');
      } else {
        setError(error.message || '测试失败');
      }
    } finally {
      setIsLoading(false);
      controllerRef.current = null;
    }
  };

  // 停止测试
  const stopTest = () => {
    if (controllerRef.current) {
      controllerRef.current.abort();
      controllerRef.current = null;
      setIsLoading(false);
    }
  };

  // 清除结果
  const clearResults = () => {
    setMessages([]);
    setReceivedContent('');
    setError(null);
  };

  return (
    <TestContainer maxWidth="lg">
      <Typography variant="h4" component="h1" gutterBottom>
        SSE 流式响应测试
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            测试配置
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
            <Button
              variant="outlined"
              onClick={() => setTestType('normal')}
              disabled={isLoading}
              color={testType === 'normal' ? 'primary' : 'inherit'}
            >
              正常测试
            </Button>
            <Button
              variant="outlined"
              onClick={() => setTestType('split')}
              disabled={isLoading}
              color={testType === 'split' ? 'primary' : 'inherit'}
            >
              多字节字符切分测试
            </Button>
            <Chip 
              label={`当前: ${testType === 'split' ? '多字节字符切分' : '正常'}`}
              color="primary"
              variant="outlined"
            />
          </Box>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Button
              variant="contained"
              onClick={testSSEConnection}
              disabled={isLoading}
              startIcon={isLoading ? <CircularProgress size={16} /> : null}
            >
              {isLoading ? '测试中...' : '开始测试'}
            </Button>
            {isLoading && (
              <Button
                variant="outlined"
                onClick={stopTest}
                color="error"
              >
                停止
              </Button>
            )}
            <Button
              variant="outlined"
              onClick={clearResults}
              disabled={isLoading}
            >
              清除结果
            </Button>
          </Box>
        </CardContent>
      </Card>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            接收到的消息 ({messages.length})
          </Typography>
          <MessageContainer>
            {messages.length === 0 ? (
              <Typography color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                暂无消息
              </Typography>
            ) : (
              messages.map((message) => (
                <MessageCard key={message.id}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      {message.content}
                    </Typography>
                    <Typography variant="caption" sx={{ ml: 1, whiteSpace: 'nowrap' }}>
                      {message.timestamp.toLocaleTimeString()}
                    </Typography>
                  </Box>
                </MessageCard>
              ))
            )}
            <div ref={messagesEndRef} />
          </MessageContainer>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            拼接后的完整内容
          </Typography>
          <TextField
            multiline
            rows={6}
            fullWidth
            variant="outlined"
            value={receivedContent}
            InputProps={{
              readOnly: true,
              style: { fontFamily: 'monospace' }
            }}
            placeholder="接收到的内容将在这里显示..."
          />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            字符数: {receivedContent.length}
          </Typography>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            测试说明
          </Typography>
          <Typography variant="body2" component="div">
            <ul>
              <li><strong>正常测试</strong>：发送包含多字节字符的正常数据流</li>
              <li><strong>多字节字符切分测试</strong>：刻意将多字节字符切分到不同的数据块中，测试客户端是否能正确处理</li>
              <li>如果修复成功，即使多字节字符被切分，拼接后的内容也应该完整无误</li>
              <li>特别注意中文、日文和emoji字符是否完整显示</li>
            </ul>
          </Typography>
        </CardContent>
      </Card>
    </TestContainer>
  );
};

export default SSETest;
