import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Typography,
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
  Slider,
  Collapse,
  useMediaQuery
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
  Add as AddIcon,
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import aiService from '../services/ai';
import MarkdownInlineRenderer from './MarkdownInlineRenderer';
import { generateAIChatEnhancedStylesScoped } from '../utils/aiChatEnhancedStyles';
import { preprocessAIMessageContent } from '../utils/aiChatPreprocessor';

// 生成作用域样式
const aiChatStyles = generateAIChatEnhancedStylesScoped('ai-chat-panel');

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
const ControlPanel = styled(Paper)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  borderRadius: theme.spacing(2),
}));

// 样式化的面板头部
const PanelHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: theme.spacing(2),
  borderBottom: `1px solid ${theme.palette.divider}`,
}));

const AIChatPanel = ({ onClose }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isStreaming, setIsStreaming] = useState(true);
  const [currentResponse, setCurrentResponse] = useState('');
  const [currentController, setCurrentController] = useState(null);
  const finishReasonRef = useRef(null);
  
  // AI角色相关状态
  const [roles, setRoles] = useState([]);
  const [selectedRoleId, setSelectedRoleId] = useState('none'); // 默认为'none'
  const [rolesLoading, setRolesLoading] = useState(false);
  
  // 聊天历史相关状态
  const [chatHistories, setChatHistories] = useState([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState('');
  const [historiesLoading, setHistoriesLoading] = useState(false);
  
  // 温度相关状态
  const [temperature, setTemperature] = useState(0.7);
  const [isTempManuallySet, setIsTempManuallySet] = useState(false);
  
  // 模型手动修改标志
  const [isModelManuallySet, setIsModelManuallySet] = useState(false);
  
  // 高级设置展开状态
  const [advancedSettingsOpen, setAdvancedSettingsOpen] = useState(false);
  
  // AI功能启用状态
  const [aiEnabled, setAiEnabled] = useState(true);
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const streamBufferRef = useRef('');
  const streamDebounceRef = useRef(null);

  // 加载模型列表
  useEffect(() => {
    const loadModels = async () => {
      try {
        const response = await aiService.getModels();
        if (response.success) {
          setModels(response.data);
          setAiEnabled(true);
          // 设置默认模型
          if (response.data.length > 0 && !selectedModel) {
            setSelectedModel(response.data[0].id);
          }
        }
      } catch (error) {
        console.error('加载模型列表失败:', error);
        if (error.response?.status === 503) {
          setError('AI功能已禁用，请在设置页面启用AI功能并配置供应商');
          setAiEnabled(false);
        } else {
          setError('加载模型列表失败，请刷新页面重试');
        }
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
        role_id: selectedRoleId === 'none' || !selectedRoleId ? 'all' : selectedRoleId,
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

  // 当角色改变时，重新加载聊天历史列表
  useEffect(() => {
    loadChatHistories();
    // 切换角色时，清除选中的聊天历史
    setSelectedHistoryId('');
    setMessages([]);
  }, [selectedRoleId]);

  // 从localStorage恢复上次选择的角色和温度
  useEffect(() => {
    const savedRoleId = localStorage.getItem('aiChatPanel_selectedRoleId');
    if (savedRoleId) {
      // 兼容迁移：如果读取到 'default'，则重置为空值
      if (savedRoleId === 'default') {
        setSelectedRoleId('');
        localStorage.removeItem('aiChatPanel_selectedRoleId');
      } else {
        setSelectedRoleId(savedRoleId);
      }
    }
    
    const savedTemperature = localStorage.getItem('aiChatPanel_temperature');
    if (savedTemperature) {
      setTemperature(parseFloat(savedTemperature));
      setIsTempManuallySet(true);
    }
    
    const savedIsModelManuallySet = localStorage.getItem('aiChatPanel_isModelManuallySet');
    if (savedIsModelManuallySet) {
      setIsModelManuallySet(JSON.parse(savedIsModelManuallySet));
    }
  }, []);

  // 保存选择的角色到localStorage
  useEffect(() => {
    localStorage.setItem('aiChatPanel_selectedRoleId', selectedRoleId);
  }, [selectedRoleId]);

  // 保存温度到localStorage
  useEffect(() => {
    localStorage.setItem('aiChatPanel_temperature', temperature.toString());
  }, [temperature]);

  // 保存模型手动修改标志到localStorage
  useEffect(() => {
    localStorage.setItem('aiChatPanel_isModelManuallySet', JSON.stringify(isModelManuallySet));
  }, [isModelManuallySet]);

  // 当选择的角色改变时，如果用户没有手动修改过模型和温度，则使用角色的默认值
  useEffect(() => {
    // 只有在选择了具体角色时才应用角色的默认模型和温度
    if (selectedRoleId && selectedRoleId !== 'none') {
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
  }, [selectedRoleId, roles, isModelManuallySet, isTempManuallySet, selectedModel, temperature]);

  // 监听供应商切换事件，刷新模型列表
  useEffect(() => {
    const handleProviderSwitch = () => {
      console.log('[AIChatPanel] 检测到供应商切换，刷新模型列表');
      setSelectedModel(''); // 清空当前选择的模型
      // 重新加载模型列表
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
          if (error.response?.status === 503) {
            setError('AI功能已禁用，请在设置页面启用AI功能并配置供应商');
          } else {
            setError('加载模型列表失败，请刷新页面重试');
          }
        }
      };
      loadModels();
    };

    // 监听自定义事件
    window.addEventListener('ai-provider-switched', handleProviderSwitch);
    
    return () => {
      window.removeEventListener('ai-provider-switched', handleProviderSwitch);
    };
  }, [selectedModel]);

  // 滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentResponse]);

  // 发送消息
  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading) return;
    
    // 检查是否已选择角色或明确选择无系统提示词
    if (!selectedRoleId) {
      setError('请先选择一个AI角色或选择"无系统提示词"选项');
      return;
    }

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
    streamBufferRef.current = '';

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
    } else if (selectedRoleId) {
      requestParams.role_id = selectedRoleId;
    }

    try {
      if (isStreaming) {
        // 流式请求
        const controller = await aiService.createStreamingChatCompletion({
          ...requestParams,
          onChunk: (chunk) => {
            if (chunk.choices && chunk.choices[0]?.delta?.content) {
              const newContent = chunk.choices[0].delta.content;
              streamBufferRef.current += newContent;
              
              // 使用防抖优化流式渲染性能
              if (streamDebounceRef.current) {
                clearTimeout(streamDebounceRef.current);
              }
              
              streamDebounceRef.current = setTimeout(() => {
                setCurrentResponse(streamBufferRef.current);
              }, 150);
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
          onFinish: (finishData) => {
            // 记录finish_reason
            finishReasonRef.current = finishData.finish_reason;
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
            // 清除防抖定时器并立即更新显示
            if (streamDebounceRef.current) {
              clearTimeout(streamDebounceRef.current);
              streamDebounceRef.current = null;
            }
            
            // 从缓冲区读取最终响应
            if (streamBufferRef.current.trim()) {
              const assistantMessage = {
                id: `assistant-${Date.now()}`,
                role: 'assistant',
                content: streamBufferRef.current,
                timestamp: new Date(),
                model: selectedModel,
                incomplete: finishReasonRef.current === 'length'
              };
              setMessages(prev => [...prev, assistantMessage]);
            }
            setCurrentResponse('');
            streamBufferRef.current = '';
            finishReasonRef.current = null;
            setIsLoading(false);
            setCurrentController(null);
          }
        });
        
        setCurrentController(controller);
      } else {
        // 非流式请求
        const response = await aiService.createChatCompletion(requestParams);

        if (response.success) {
          const choice = response.data.choices[0];
          const assistantMessage = {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: choice.message.content,
            timestamp: new Date(),
            model: selectedModel,
            usage: response.data.usage,
            incomplete: choice.finish_reason === 'length'
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
      if (error.response?.status === 503) {
        setError('AI功能已禁用，请在设置页面启用AI功能并配置供应商');
      } else {
        setError(error.message || '发送消息失败，请重试');
      }
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
      
      // 清除防抖定时器
      if (streamDebounceRef.current) {
        clearTimeout(streamDebounceRef.current);
        streamDebounceRef.current = null;
      }
      
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
    }
  };

  // 处理键盘事件
  const handleKeyPress = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  // 处理历史选择
  const handleHistorySelect = async (historyId) => {
    try {
      setSelectedHistoryId(historyId);
      const response = await aiService.getChatHistoryById(historyId);
      if (response.success) {
        const formattedMessages = response.data.messages.map(msg => ({
          id: `${msg.role}-${Date.now()}-${Math.random()}`,
          role: msg.role,
          content: msg.content,
          timestamp: new Date(msg.timestamp)
        }));
        setMessages(formattedMessages);
      }
    } catch (error) {
      console.error('加载聊天历史失败:', error);
      setError('加载聊天历史失败，请重试');
    }
  };

  // 新建聊天
  const handleNewChat = () => {
    setMessages([]);
    setSelectedHistoryId('');
    setError(null);
  };

  // 跳转到设置页面
  const handleGoToSettings = () => {
    navigate('/设置');
  };

  // 渲染消息内容
  const renderMessageContent = (content) => {
    return (
      <MarkdownInlineRenderer
        content={content}
        enableAIChatEnhancements={true}
        scopeClass="ai-chat-panel"
      />
    );
  };

  // 如果AI功能未启用，显示提示信息
  if (!aiEnabled) {
    return (
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <PanelHeader>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <BotIcon />
            AI 助手
          </Typography>
          <IconButton size="small" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </PanelHeader>
        
        <Box sx={{ 
          flexGrow: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center',
          padding: theme.spacing(3)
        }}>
          <BotIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            AI 功能未启用
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
            请在设置页面启用 AI 功能并配置供应商后使用
          </Typography>
          <Button 
            variant="contained" 
            startIcon={<SettingsIcon />}
            onClick={handleGoToSettings}
          >
            前往设置
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <PanelHeader>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <BotIcon />
          AI 助手
        </Typography>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </PanelHeader>

      {/* 控制面板 */}
      <ControlPanel>
        {/* 角色选择 */}
        <FormControl fullWidth size="small" sx={{ mb: 2 }}>
          <InputLabel>AI 角色</InputLabel>
          <Select
            value={selectedRoleId}
            label="AI 角色"
            onChange={(e) => setSelectedRoleId(e.target.value)}
            disabled={rolesLoading}
          >
            <MenuItem value="none">无系统提示词</MenuItem>
            {roles.map((role) => (
              <MenuItem key={role._id} value={role._id}>
                {role.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* 模型选择 */}
        <FormControl fullWidth size="small" sx={{ mb: 2 }}>
          <InputLabel>模型</InputLabel>
          <Select
            value={selectedModel}
            label="模型"
            onChange={(e) => {
              setSelectedModel(e.target.value);
              setIsModelManuallySet(true);
            }}
          >
            {models.map((model) => (
              <MenuItem key={model.id} value={model.id}>
                {model.id}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* 高级设置切换 */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Button
            size="small"
            startIcon={advancedSettingsOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            onClick={() => setAdvancedSettingsOpen(!advancedSettingsOpen)}
          >
            高级设置
          </Button>
          
          {/* 新建聊天按钮 */}
          <Button
            size="small"
            startIcon={<AddIcon />}
            onClick={handleNewChat}
          >
            新建聊天
          </Button>
        </Box>

        {/* 高级设置 */}
        <Collapse in={advancedSettingsOpen}>
          <Box sx={{ mt: 2 }}>
            {/* 温度控制 */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" gutterBottom>
                温度: {temperature}
              </Typography>
              <Slider
                value={temperature}
                onChange={(_, value) => {
                  setTemperature(value);
                  setIsTempManuallySet(true);
                }}
                min={0}
                max={2}
                step={0.1}
                marks={[
                  { value: 0, label: '精确' },
                  { value: 1, label: '平衡' },
                  { value: 2, label: '创意' }
                ]}
                size="small"
              />
            </Box>

            {/* 流式开关 */}
            <FormControlLabel
              control={
                <Switch
                  checked={isStreaming}
                  onChange={(e) => setIsStreaming(e.target.checked)}
                  size="small"
                />
              }
              label="流式输出"
            />
          </Box>
        </Collapse>
      </ControlPanel>

      {/* 错误提示 */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* 消息列表 */}
      <MessageContainer>
        {messages.length === 0 && !currentResponse && (
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center',
            height: '100%',
            color: 'text.secondary'
          }}>
            <BotIcon sx={{ fontSize: 48, mb: 2 }} />
            <Typography variant="body1">
              开始与 AI 助手对话
            </Typography>
          </Box>
        )}
        
        {messages.map((message) => (
          <MessageCard key={message.id} isUser={message.role === 'user'}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
              <Avatar sx={{ width: 24, height: 24 }}>
                {message.role === 'user' ? <PersonIcon /> : <BotIcon />}
              </Avatar>
              <Box sx={{ flexGrow: 1 }}>
                {renderMessageContent(message.content)}
                {message.incomplete && (
                  <Chip 
                    label="响应被截断" 
                    size="small" 
                    color="warning" 
                    sx={{ mt: 1 }}
                  />
                )}
              </Box>
            </Box>
          </MessageCard>
        ))}
        
        {/* 当前流式响应 */}
        {currentResponse && (
          <MessageCard isUser={false}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
              <Avatar sx={{ width: 24, height: 24 }}>
                <BotIcon />
              </Avatar>
              <Box sx={{ flexGrow: 1 }}>
                {renderMessageContent(currentResponse)}
                <CircularProgress size={16} sx={{ mt: 1 }} />
              </Box>
            </Box>
          </MessageCard>
        )}
        
        <div ref={messagesEndRef} />
      </MessageContainer>

      {/* 输入区域 */}
      <InputContainer>
        <TextField
          fullWidth
          multiline
          maxRows={4}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="输入消息..."
          disabled={isLoading}
          inputRef={inputRef}
          size="small"
        />
        <Box sx={{ display: 'flex', gap: 1 }}>
          {isLoading ? (
            <Button
              fullWidth
              variant="outlined"
              startIcon={<StopIcon />}
              onClick={handleStopGeneration}
            >
              停止生成
            </Button>
          ) : (
            <Button
              fullWidth
              variant="contained"
              endIcon={<SendIcon />}
              onClick={handleSendMessage}
              disabled={!inputText.trim() || !selectedRoleId}
            >
              发送
            </Button>
          )}
        </Box>
      </InputContainer>
    </Box>
  );
};

export default AIChatPanel;