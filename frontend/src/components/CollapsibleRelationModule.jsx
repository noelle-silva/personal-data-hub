import React, { useState } from 'react';
import {
  Box,
  Typography,
  Collapse,
  useTheme,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

// 关系模块容器
const RelationModule = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.background.default,
  borderRadius: 16,
  padding: theme.spacing(2),
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(1.5),
}));

// 关系模块标题
const RelationModuleTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 'bold',
  color: theme.palette.primary.main,
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
}));

/**
 * 可展开/收起的引用模块组件
 * @param {Object} props - 组件属性
 * @param {string} props.title - 模块标题
 * @param {number} props.count - 引用数量（可选）
 * @param {React.ReactNode} props.children - 子组件
 * @param {boolean} props.defaultExpanded - 默认是否展开
 * @param {React.ReactNode} props.actions - 右侧操作按钮
 * @param {Function} props.onExpandedChange - 展开状态变化回调
 * @param {boolean} props.expanded - 外部控制的展开状态
 */
const CollapsibleRelationModule = ({
  title,
  count,
  children,
  defaultExpanded = true,
  actions,
  onExpandedChange,
  expanded: externalExpanded,
  ...props
}) => {
  const theme = useTheme();
  
  // 如果外部传入了expanded，则使用外部状态，否则使用内部状态
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
  const expanded = externalExpanded !== undefined ? externalExpanded : internalExpanded;
  
  const handleToggleExpanded = () => {
    const newExpanded = !expanded;
    
    // 如果有外部控制，则调用外部回调
    if (onExpandedChange) {
      onExpandedChange(newExpanded);
    } else {
      // 否则使用内部状态
      setInternalExpanded(newExpanded);
    }
  };
  
  return (
    <RelationModule {...props}>
      {/* 整个标题区域都可以点击 */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          padding: theme.spacing(0.5),
          borderRadius: 1,
          '&:hover': {
            backgroundColor: theme.palette.action.hover,
          },
          transition: 'background-color 0.2s ease',
        }}
        onClick={handleToggleExpanded}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <ExpandMoreIcon
            sx={{
              mr: 1,
              transition: 'transform 0.2s ease',
              transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)',
              fontSize: '1.2rem'
            }}
          />
          <RelationModuleTitle variant="subtitle2">
            {title}
            {count !== undefined && ` (${count})`}
          </RelationModuleTitle>
        </Box>
        {/* 防止点击操作按钮时触发展开/收起 */}
        <Box
          onClick={(e) => e.stopPropagation()}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5
          }}
        >
          {actions}
        </Box>
      </Box>
      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <Box sx={{ mt: 1 }}>
          {children}
        </Box>
      </Collapse>
    </RelationModule>
  );
};

export default CollapsibleRelationModule;
