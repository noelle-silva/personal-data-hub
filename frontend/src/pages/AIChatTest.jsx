import React, { useState } from 'react';
import {
  Container,
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  Switch,
  FormControlLabel
} from '@mui/material';
import { styled } from '@mui/material/styles';
import MarkdownInlineRenderer from '../components/MarkdownInlineRenderer';

// 样式化的容器
const TestContainer = styled(Container)(({ theme }) => ({
  paddingTop: theme.spacing(4),
  paddingBottom: theme.spacing(4),
}));

// 样式化的测试卡片
const TestCard = styled(Card)(({ theme }) => ({
  marginBottom: theme.spacing(3),
}));

// 样式化的消息容器
const MessageContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  borderRadius: theme.spacing(1),
  backgroundColor: theme.palette.background.paper,
  border: `1px solid ${theme.palette.divider}`,
}));

// 测试用的ToolUse示例
const toolUseExample = `<<<[TOOL_REQUEST]>>>
<tool_name>search_web</tool_name>
<parameters>
{
  "query": "React hooks tutorial",
  "limit": 5
}
</parameters>
<<<[END_TOOL_REQUEST]>>>`;

// 测试用的工具结果示例
const toolResultExample = `[[VCP调用结果信息汇总:
- 工具名称: search_web
- 执行状态: 成功
- 返回内容: 找到5个相关结果
- 可访问URL: https://example.com/search-results
- 处理时间: 1.2秒
]]`;

// 测试用的Maid日志示例
const maidDiaryExample = `<<<DailyNoteStart>>>
Maid: Alice
Date: 2023-10-19
Content: 今天帮助用户完成了一个复杂的React项目，使用了自定义hooks来管理状态。用户对结果非常满意，还夸奖了我的代码组织能力。感觉很有成就感！
<<<DailyNoteEnd>>>`;

// 混合内容示例
const mixedContentExample = `这是一个普通的消息，包含一些**粗体**和*斜体*文本。

下面是一个工具调用：

<<<[TOOL_REQUEST]>>>
<tool_name>calculate_expression</tool_name>
<parameters>
{
  "expression": "2 + 2 * 3"
}
</parameters>
<<<[END_TOOL_REQUEST]>>>

然后是工具的结果：

[[VCP调用结果信息汇总:
- 工具名称: calculate_expression
- 执行状态: 成功
- 返回内容: 8
]]

还有一些普通的markdown内容：

- 列表项1
- 列表项2
- 列表项3

\`\`\`javascript
function example() {
  return "Hello, world!";
}
\`\`\`

最后是一个日记：

<<<DailyNoteStart>>>
Maid: Bob
Date: 2023-10-19
Content: 今天学习了新的JavaScript特性，特别是async/await的使用方法。
<<<DailyNoteEnd>>>`;

const AIChatTest = () => {
  const [testContent, setTestContent] = useState(mixedContentExample);
  const [enableEnhancements, setEnableEnhancements] = useState(true);
  const [customContent, setCustomContent] = useState('');

  const handleLoadExample = (content) => {
    setTestContent(content);
  };

  const handleUseCustomContent = () => {
    if (customContent.trim()) {
      setTestContent(customContent);
    }
  };

  return (
    <TestContainer maxWidth="lg">
      <Typography variant="h4" component="h1" gutterBottom>
        AI聊天增强渲染测试
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            测试控制
          </Typography>
          <FormControlLabel
            control={
              <Switch
                checked={enableEnhancements}
                onChange={(e) => setEnableEnhancements(e.target.checked)}
              />
            }
            label="启用AI聊天增强功能"
          />
          <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              onClick={() => handleLoadExample(toolUseExample)}
            >
              加载ToolUse示例
            </Button>
            <Button
              variant="outlined"
              onClick={() => handleLoadExample(toolResultExample)}
            >
              加载工具结果示例
            </Button>
            <Button
              variant="outlined"
              onClick={() => handleLoadExample(maidDiaryExample)}
            >
              加载Maid日志示例
            </Button>
            <Button
              variant="outlined"
              onClick={() => handleLoadExample(mixedContentExample)}
            >
              加载混合内容示例
            </Button>
          </Box>
        </CardContent>
      </Card>

      <TestCard>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            输入内容
          </Typography>
          <TextField
            multiline
            rows={8}
            fullWidth
            variant="outlined"
            value={testContent}
            onChange={(e) => setTestContent(e.target.value)}
            placeholder="在这里输入要测试的内容..."
          />
          <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              onClick={handleUseCustomContent}
              disabled={!customContent.trim()}
            >
              使用自定义内容
            </Button>
          </Box>
        </CardContent>
      </TestCard>

      <TestCard>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            自定义内容
          </Typography>
          <TextField
            multiline
            rows={4}
            fullWidth
            variant="outlined"
            value={customContent}
            onChange={(e) => setCustomContent(e.target.value)}
            placeholder="在这里输入自定义内容，然后点击上面的按钮..."
          />
        </CardContent>
      </TestCard>

      <TestCard>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            渲染结果
          </Typography>
          <MessageContainer>
            <MarkdownInlineRenderer
              content={testContent}
              scopeClass="ai-chat-enhanced"
              enableAIChatEnhancements={enableEnhancements}
            />
          </MessageContainer>
        </CardContent>
      </TestCard>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            说明
          </Typography>
          <Typography variant="body2" color="text.secondary">
            此页面用于测试AI聊天增强渲染功能。您可以：
          </Typography>
          <ul>
            <li>使用预设的示例内容测试不同类型的特殊块</li>
            <li>输入自定义内容进行测试</li>
            <li>通过开关控制是否启用增强功能，对比效果差异</li>
            <li>测试内容包含ToolUse、工具结果和Maid日志三种特殊块</li>
          </ul>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            增强功能包括：
          </Typography>
          <ul>
            <li>ToolUse块：显示工具名称和参数</li>
            <li>工具结果块：显示执行状态和结果，支持折叠/展开</li>
            <li>Maid日志块：显示日记标题、日期、Maid名称和内容</li>
            <li>暗色主题适配</li>
          </ul>
        </CardContent>
      </Card>
    </TestContainer>
  );
};

export default AIChatTest;
