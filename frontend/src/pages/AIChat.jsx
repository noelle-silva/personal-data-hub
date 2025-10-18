import React, { useState, useEffect, useRef } from 'react';
import {
  Container,
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Alert,
  IconButton,
  Paper,
  Avatar,
  useTheme,
  CircularProgress,
  Switch,
  FormControlLabel,
  Divider
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  Send as SendIcon,
  Stop as StopIcon,
  SmartToy as BotIcon,
  Person as PersonIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import aiService from '../services/ai';

// 样式化的消息容器
const MessageContainer = styled(Box)(({ theme }) => ({
  flexGrow: 1,
  overflowY: 'auto',
  padding: theme.spacing(2),
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2),
  minHeight: 0,
}));

// 样式化的消息卡片
const MessageCard = styled(Paper)(({ theme, isUser }) => ({
  padding: theme.spacing(2),
  maxWidth: '80%',
  alignSelf: isUser ? 'flex-end' : 'flex-start',
  backgroundColor: isUser 
    ? theme.palette.primary.main 
    : theme.palette.background.paper,
  color: isUser 
    ? theme.palette.primary.contrastText 
    : theme.palette.text.primary,
  borderRadius: theme.spacing(2),
  boxShadow: theme.shadows[2],
}));

// 样式化的输入容器
const InputContainer = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2),
  borderRadius: theme.spacing(2),
  boxShadow: theme.shadows[2],
}));

// 样式化的控制面板
const ControlPanel = styled(Card)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  borderRadius: theme.spacing(2),
}));

const AIChat = () => {
  const theme = useTheme();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isStreaming, setIsStreaming] = useState(true);
  const [currentResponse, setCurrentResponse] = useState('');
  const [currentController, setCurrentController] = useState(null);
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const streamBufferRef = useRef(''); // 流式响应缓冲区，避免闭包问题

  // 加载模型列表
  useEffect(() => {
    const loadModels = async () => {
      try {
        const response = await aiService.getModels();
        if (response.success) {
          setModels(response.data);
          // 设置默认模型
          if (response.data.length > 0 && !selectedModel) {
            setSelectedModel(response.data[0].id);
          }
        }
      } catch (error) {
        console.error('加载模型列表失败:', error);
        setError('加载模型列表失败，请刷新页面重试');
      }
    };

    loadModels();
  }, [selectedModel]);

  // 滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentResponse]);

  // 发送消息
  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: inputText.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setError(null);
    setIsLoading(true);
    setCurrentResponse('');
    streamBufferRef.current = ''; // 清空流式缓冲区

    const requestMessages = [...messages, userMessage].map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    try {
      if (isStreaming) {
        // 流式请求
        const controller = await aiService.createStreamingChatCompletion({
          messages: requestMessages,
          model: selectedModel,
          onChunk: (chunk) => {
            if (chunk.choices && chunk.choices[0]?.delta?.content) {
              const newContent = chunk.choices[0].delta.content;
              streamBufferRef.current += newContent; // 同步更新缓冲区
              setCurrentResponse(prev => prev + newContent);
            }
          },
          onError: (error) => {
            console.error('流式请求失败:', error);
            // 如果有部分响应，保存它
            if (streamBufferRef.current.trim()) {
              const assistantMessage = {
                id: `assistant-${Date.now()}`,
                role: 'assistant',
                content: streamBufferRef.current,
                timestamp: new Date(),
                model: selectedModel,
                incomplete: true
              };
              setMessages(prev => [...prev, assistantMessage]);
            }
            setError(error.message || '发送消息失败，请重试');
            setCurrentResponse('');
            streamBufferRef.current = '';
            setIsLoading(false);
            setCurrentController(null);
          },
          onComplete: () => {
            // 从缓冲区读取最终响应
            if (streamBufferRef.current.trim()) {
              const assistantMessage = {
                id: `assistant-${Date.now()}`,
                role: 'assistant',
                content: streamBufferRef.current,
                timestamp: new Date(),
                model: selectedModel
              };
              setMessages(prev => [...prev, assistantMessage]);
            }
            setCurrentResponse('');
            streamBufferRef.current = '';
            setIsLoading(false);
            setCurrentController(null);
          }
        });
        
        setCurrentController(controller);
      } else {
        // 非流式请求
        const response = await aiService.createChatCompletion({
          messages: requestMessages,
          model: selectedModel
        });

        if (response.success) {
          const assistantMessage = {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: response.data.choices[0].message.content,
            timestamp: new Date(),
            model: selectedModel,
            usage: response.data.usage
          };
          setMessages(prev => [...prev, assistantMessage]);
        }
      }
    } catch (error) {
      console.error('发送消息失败:', error);
      setError(error.message || '发送消息失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  // 停止生成
  const handleStopGeneration = () => {
    if (currentController) {
      currentController.abort();
      setCurrentController(null);
      setIsLoading(false);
      
      // 从缓冲区读取部分响应并保存
      if (streamBufferRef.current.trim()) {
        const assistantMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: streamBufferRef.current,
          timestamp: new Date(),
          model: selectedModel,
          incomplete: true
        };
        setMessages(prev => [...prev, assistantMessage]);
      }
      setCurrentResponse('');
      streamBufferRef.current = '';
    }
  };

  // 处理键盘事件
  const handleKeyPress = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  // 清除错误
  const clearError = () => {
    setError(null);
  };

  return (
    <Container maxWidth="lg" sx={{ height: '100%', display: 'flex', flexDirection: 'column', py: 2 }}>
      <Typography variant="h4" component="h1" gutterBottom align="center">
        AI Chat
      </Typography>

      {/* 控制面板 */}
      <ControlPanel>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>模型</InputLabel>
              <Select
                value={selectedModel}
                label="模型"
                onChange={(e) => setSelectedModel(e.target.value)}
                disabled={isLoading}
              >
                {models.map((model) => (
                  <MenuItem key={model.id} value={model.id}>
                    {model.id}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <FormControlLabel
              control={
                <Switch
                  checked={isStreaming}
                  onChange={(e) => setIsStreaming(e.target.checked)}
                  disabled={isLoading}
                />
              }
              label="流式响应"
            />
            
            {selectedModel && (
              <Chip 
                label={`当前模型: ${selectedModel}`} 
                variant="outlined" 
                size="small"
              />
            )}
          </Box>
        </CardContent>
      </ControlPanel>

      {/* 错误提示 */}
      {error && (
        <Alert 
          severity="error" 
          onClose={clearError}
          sx={{ mb: 2 }}
        >
          {error}
        </Alert>
      )}

      {/* 消息容器 */}
      <Card sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', mb: 2, overflow: 'hidden' }}>
        <MessageContainer>
          {messages.length === 0 && !isLoading && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <BotIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                开始与AI对话
              </Typography>
              <Typography variant="body2" color="text.secondary">
                输入消息并按Enter键发送
              </Typography>
            </Box>
          )}
          
          {messages.map((message) => (
            <MessageCard key={message.id} isUser={message.role === 'user'}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                <Avatar sx={{ bgcolor: message.role === 'user' ? 'primary.main' : 'secondary.main' }}>
                  {message.role === 'user' ? <PersonIcon /> : <BotIcon />}
                </Avatar>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                    {message.content}
                  </Typography>
                  {message.incomplete && (
                    <Typography variant="caption" sx={{ fontStyle: 'italic', mt: 1, display: 'block' }}>
                      (响应已中断)
                    </Typography>
                  )}
                  <Typography variant="caption" sx={{ mt: 1, display: 'block', opacity: 0.7 }}>
                    {message.timestamp.toLocaleTimeString()}
                    {message.model && ` • ${message.model}`}
                  </Typography>
                </Box>
              </Box>
            </MessageCard>
          ))}
          
          {/* 当前流式响应 */}
          {currentResponse && (
            <MessageCard isUser={false}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                <Avatar sx={{ bgcolor: 'secondary.main' }}>
                  <BotIcon />
                </Avatar>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                    {currentResponse}
                    <CircularProgress size={16} sx={{ ml: 1 }} />
                  </Typography>
                </Box>
              </Box>
            </MessageCard>
          )}
          
          <div ref={messagesEndRef} />
        </MessageContainer>
      </Card>

      {/* 输入区域 */}
      <InputContainer>
        <TextField
          multiline
          maxRows={4}
          fullWidth
          placeholder="输入消息..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={isLoading}
          inputRef={inputRef}
        />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            按 Enter 发送，Shift+Enter 换行
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {isLoading && (
              <Button
                variant="outlined"
                startIcon={<StopIcon />}
                onClick={handleStopGeneration}
                color="error"
              >
                停止
              </Button>
            )}
            <Button
              variant="contained"
              endIcon={<SendIcon />}
              onClick={handleSendMessage}
              disabled={!inputText.trim() || isLoading}
            >
              发送
            </Button>
          </Box>
        </Box>
      </InputContainer>
    </Container>
  );
};

export default AIChat;