import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Divider,
  Tooltip,
  Slider
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  Send as SendIcon,
  Stop as StopIcon,
  SmartToy as BotIcon,
  Person as PersonIcon,
  Settings as SettingsIcon,
  Tune as TuneIcon,
  Refresh as RefreshIcon,
  History as HistoryIcon,
  Add as AddIcon
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
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isStreaming, setIsStreaming] = useState(true);
  const [currentResponse, setCurrentResponse] = useState('');
  const [currentController, setCurrentController] = useState(null);
  
  // AI角色相关状态
  const [roles, setRoles] = useState([]);
  const [selectedRoleId, setSelectedRoleId] = useState('default'); // 'default', 'none', 或具体的role ID
  const [rolesLoading, setRolesLoading] = useState(false);
  
  // 聊天历史相关状态
  const [chatHistories, setChatHistories] = useState([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState(''); // 空字符串表示未选择会话
  const [historiesLoading, setHistoriesLoading] = useState(false);
  
  // 温度相关状态
  const [temperature, setTemperature] = useState(0.7);
  const [isTempManuallySet, setIsTempManuallySet] = useState(false);
  
  // 模型手动修改标志
  const [isModelManuallySet, setIsModelManuallySet] = useState(false);
  
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

  // 加载AI角色列表
  const loadRoles = async () => {
    try {
      setRolesLoading(true);
      const response = await aiService.listRoles();
      if (response.success) {
        setRoles(response.data);
      }
    } catch (error) {
      console.error('加载AI角色失败:', error);
    } finally {
      setRolesLoading(false);
    }
  };

  // 初始化时加载角色列表
  useEffect(() => {
    loadRoles();
  }, []);

  // 加载聊天历史列表
  const loadChatHistories = async () => {
    try {
      setHistoriesLoading(true);
      const response = await aiService.listChatHistories({
        role_id: selectedRoleId === 'default' || selectedRoleId === 'none' ? 'all' : selectedRoleId,
        limit: 50
      });
      if (response.success) {
        setChatHistories(response.data.histories);
      }
    } catch (error) {
      console.error('加载聊天历史失败:', error);
    } finally {
      setHistoriesLoading(false);
    }
  };

  // 当页面获得焦点时刷新角色列表（从设置页返回时）
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadRoles();
        loadChatHistories();
      }
    };

    const handleFocus = () => {
      loadRoles();
      loadChatHistories();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // 当角色改变时，重新加载聊天历史列表
  useEffect(() => {
    loadChatHistories();
    // 切换角色时，清除选中的聊天历史
    setSelectedHistoryId('');
    setMessages([]);
  }, [selectedRoleId]);

  // 从localStorage恢复上次选择的角色和温度
  useEffect(() => {
    const savedRoleId = localStorage.getItem('aiChat_selectedRoleId');
    if (savedRoleId) {
      setSelectedRoleId(savedRoleId);
    }
    
    const savedTemperature = localStorage.getItem('aiChat_temperature');
    if (savedTemperature) {
      setTemperature(parseFloat(savedTemperature));
      setIsTempManuallySet(true);
    }
    
    const savedIsModelManuallySet = localStorage.getItem('aiChat_isModelManuallySet');
    if (savedIsModelManuallySet) {
      setIsModelManuallySet(JSON.parse(savedIsModelManuallySet));
    }
  }, []);

  // 保存选择的角色到localStorage
  useEffect(() => {
    localStorage.setItem('aiChat_selectedRoleId', selectedRoleId);
  }, [selectedRoleId]);

  // 保存温度到localStorage
  useEffect(() => {
    localStorage.setItem('aiChat_temperature', temperature.toString());
  }, [temperature]);

  // 保存模型手动修改标志到localStorage
  useEffect(() => {
    localStorage.setItem('aiChat_isModelManuallySet', JSON.stringify(isModelManuallySet));
  }, [isModelManuallySet]);

  // 当选择的角色改变时，如果用户没有手动修改过模型和温度，则使用角色的默认值
  useEffect(() => {
    if (selectedRoleId !== 'default' && selectedRoleId !== 'none') {
      const selectedRole = roles.find(role => role._id === selectedRoleId);
      if (selectedRole) {
        // 只有在用户没有手动修改过的情况下才更新
        if (!isModelManuallySet && selectedRole.defaultModel && selectedRole.defaultModel !== selectedModel) {
          setSelectedModel(selectedRole.defaultModel);
        }
        if (!isTempManuallySet && selectedRole.defaultTemperature !== undefined && selectedRole.defaultTemperature !== temperature) {
          setTemperature(selectedRole.defaultTemperature);
        }
      }
    }
  }, [selectedRoleId, roles, isModelManuallySet, isTempManuallySet]);

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

    // 准备AI请求参数
    const requestParams = {
      messages: requestMessages,
      model: selectedModel,
      temperature: temperature
    };

    // 添加聊天历史ID（如果已选择）
    if (selectedHistoryId) {
      requestParams.history_id = selectedHistoryId;
    }

    // 添加角色或系统提示词参数
    if (selectedRoleId === 'none') {
      requestParams.disable_system_prompt = true;
    } else if (selectedRoleId !== 'default') {
      requestParams.role_id = selectedRoleId;
    }
    // 如果没有选择角色，则使用默认逻辑（后端会自动选择默认角色或默认提示词）

    try {
      if (isStreaming) {
        // 流式请求
        const controller = await aiService.createStreamingChatCompletion({
          ...requestParams,
          onChunk: (chunk) => {
            if (chunk.choices && chunk.choices[0]?.delta?.content) {
              const newContent = chunk.choices[0].delta.content;
              streamBufferRef.current += newContent; // 同步更新缓冲区
              setCurrentResponse(prev => prev + newContent);
            }
          },
          onHistory: (historyData) => {
            // 接收到新创建的聊天历史信息
            if (historyData.id) {
              setSelectedHistoryId(historyData.id);
              // 重新加载聊天历史列表
              loadChatHistories();
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
        const response = await aiService.createChatCompletion(requestParams);

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
          
          // 如果返回了新的historyId，更新选中的聊天历史
          if (response.data.meta?.historyId) {
            setSelectedHistoryId(response.data.meta.historyId);
            // 重新加载聊天历史列表
            loadChatHistories();
          }
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

  // 处理聊天历史选择
  const handleHistorySelect = async (historyId) => {
    if (historyId === selectedHistoryId) return;
    
    try {
      setSelectedHistoryId(historyId);
      
      if (historyId) {
        // 加载选中的聊天历史
        const response = await aiService.getChatHistoryById(historyId);
        if (response.success) {
          // 转换消息格式
          const formattedMessages = response.data.messages.map(msg => ({
            id: `${msg.role}-${new Date(msg.timestamp).getTime()}`,
            role: msg.role,
            content: msg.content,
            timestamp: new Date(msg.timestamp),
            model: msg.model,
            incomplete: msg.incomplete
          }));
          setMessages(formattedMessages);
        }
      } else {
        // 清空消息
        setMessages([]);
      }
    } catch (error) {
      console.error('加载聊天历史失败:', error);
      setError('加载聊天历史失败，请重试');
    }
  };

  // 创建新会话
  const handleNewChat = () => {
    setSelectedHistoryId('');
    setMessages([]);
    clearError();
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
                onChange={(e) => {
                  setSelectedModel(e.target.value);
                  setIsModelManuallySet(true);
                }}
                disabled={isLoading}
              >
                {models.map((model) => (
                  <MenuItem key={model.id} value={model.id}>
                    {model.id}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FormControl sx={{ minWidth: 200 }}>
                <InputLabel id="roleSelectLabel">角色</InputLabel>
                <Select
                  value={selectedRoleId}
                  label="角色"
                  labelId="roleSelectLabel"
                  id="roleSelect"
                  onChange={(e) => {
                    console.log('角色选择器 onChange:', e.target.value, '当前值:', selectedRoleId);
                    setSelectedRoleId(e.target.value);
                  }}
                  disabled={isLoading || rolesLoading || roles.length === 0}
                >
                  {roles.length === 0 ? (
                    <MenuItem value="default" disabled>
                      暂无可用角色
                    </MenuItem>
                  ) : (
                    [
                      <MenuItem key="default" value="default">使用默认角色</MenuItem>,
                      <MenuItem key="none" value="none">无系统提示词</MenuItem>,
                      ...roles.map((role) => (
                        <MenuItem key={role._id} value={String(role._id)}>
                          {role.name}
                          {role.isDefault && ' (默认)'}
                        </MenuItem>
                      ))
                    ]
                  )}
                </Select>
              </FormControl>
              <Tooltip title="刷新角色列表">
                <IconButton
                  onClick={loadRoles}
                  disabled={rolesLoading}
                  size="small"
                  sx={{ mt: 1 }}
                >
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FormControl sx={{ minWidth: 200 }}>
                <InputLabel id="historySelectLabel">会话</InputLabel>
                <Select
                  value={selectedHistoryId}
                  label="会话"
                  labelId="historySelectLabel"
                  id="historySelect"
                  onChange={(e) => {
                    handleHistorySelect(e.target.value);
                  }}
                  disabled={isLoading || historiesLoading}
                >
                  <MenuItem value="">
                    <em>新建会话</em>
                  </MenuItem>
                  {chatHistories.map((history) => (
                    <MenuItem key={history._id} value={history._id}>
                      {history.title}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Tooltip title="新建会话">
                <IconButton
                  onClick={handleNewChat}
                  disabled={isLoading}
                  size="small"
                  sx={{ mt: 1 }}
                >
                  <AddIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="刷新会话列表">
                <IconButton
                  onClick={loadChatHistories}
                  disabled={historiesLoading}
                  size="small"
                  sx={{ mt: 1 }}
                >
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
            </Box>
            
            <Box sx={{ minWidth: 200 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                温度: {temperature.toFixed(1)}
              </Typography>
              <Slider
                value={temperature}
                onChange={(e, newValue) => {
                  setTemperature(newValue);
                  setIsTempManuallySet(true);
                }}
                min={0}
                max={2}
                step={0.1}
                disabled={isLoading}
                marks={[
                  { value: 0, label: '0' },
                  { value: 0.7, label: '0.7' },
                  { value: 1.5, label: '1.5' },
                  { value: 2, label: '2' }
                ]}
                valueLabelDisplay="auto"
              />
            </Box>
            
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
            
            <Tooltip title="管理提示词设置">
              <IconButton
                color="primary"
                onClick={() => navigate('/设置')}
                disabled={isLoading}
              >
                <TuneIcon />
              </IconButton>
            </Tooltip>
            
            {selectedModel && (
              <Chip
                label={`当前模型: ${selectedModel}`}
                variant="outlined"
                size="small"
              />
            )}
            
            {roles.length === 0 && (
              <Chip
                label="暂无角色，请在设置中创建"
                variant="outlined"
                size="small"
                color="warning"
              />
            )}
            
            {selectedRoleId !== 'default' && selectedRoleId !== 'none' && roles.length > 0 && (
              <Chip
                label={`角色: ${roles.find(r => r._id === selectedRoleId)?.name || '未知'}`}
                variant="outlined"
                size="small"
                color="secondary"
              />
            )}
            
            {selectedRoleId === 'none' && (
              <Chip
                label="无系统提示词"
                variant="outlined"
                size="small"
                color="warning"
              />
            )}
            
            {isTempManuallySet && (
              <Chip
                label={`温度: ${temperature.toFixed(1)} (手动)`}
                variant="outlined"
                size="small"
                color="info"
              />
            )}
            
            {isModelManuallySet && (
              <Chip
                label={`模型: ${selectedModel} (手动)`}
                variant="outlined"
                size="small"
                color="info"
              />
            )}
            
            {/* 临时调试Chip，显示当前 selectedRoleId */}
            <Chip
              label={`DEBUG: selectedRoleId=${selectedRoleId}`}
              variant="outlined"
              size="small"
              color="info"
              sx={{ ml: 1 }}
            />
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