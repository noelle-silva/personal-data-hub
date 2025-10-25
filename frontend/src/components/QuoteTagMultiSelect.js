import React, { useState, useEffect } from 'react';
import {
  Autocomplete,
  TextField,
  Chip,
  Box,
  Typography,
  CircularProgress,
  styled
} from '@mui/material';
import { useSelector, useDispatch } from 'react-redux';
import {
  fetchAvailableQuoteTags,
  selectAvailableQuoteTags,
  selectSelectedQuoteTags,
  setSelectedTags,
  selectQuoteFilterStatus,
  selectQuoteTagsLoading
} from '../store/quotesFilterSlice';

// 样式化的容器
const Container = styled(Box)(({ theme }) => ({
  width: '100%',
  maxWidth: 600,
  marginBottom: theme.spacing(3),
}));

// 样式化的标签计数
const TagCount = styled(Typography)(({ theme }) => ({
  fontSize: '0.75rem',
  color: theme.palette.text.secondary,
  marginLeft: theme.spacing(0.5),
}));

const QuoteTagMultiSelect = () => {
  const dispatch = useDispatch();
  const availableTags = useSelector(selectAvailableQuoteTags);
  const selectedTags = useSelector(selectSelectedQuoteTags);
  const status = useSelector(selectQuoteFilterStatus);
  const tagsLoading = useSelector(selectQuoteTagsLoading);
  
  // 本地状态：输入框的值
  const [inputValue, setInputValue] = useState('');
  
  // 组件挂载时获取可用标签
  useEffect(() => {
    dispatch(fetchAvailableQuoteTags());
  }, [dispatch]);
  
  // 处理标签选择变化
  const handleChange = (event, newValue) => {
    // 将对象数组转换为字符串数组
    const tagNames = newValue.map(tag => typeof tag === 'string' ? tag : tag.name);
    dispatch(setSelectedTags(tagNames));
  };
  
  // 处理输入变化
  const handleInputChange = (event, newInputValue) => {
    setInputValue(newInputValue);
  };
  
  // 过滤选项（本地过滤，因为标签数量通常不会很多）
  const getFilteredOptions = () => {
    if (!inputValue) return availableTags;
    
    const lowercasedInput = inputValue.toLowerCase();
    return availableTags.filter(tag => 
      tag.name.toLowerCase().includes(lowercasedInput)
    );
  };
  
  // 渲染选项
  const renderOption = (props, option) => (
    <Box component="li" {...props}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
        <Typography variant="body2">{option.name}</Typography>
        <TagCount>({option.count})</TagCount>
      </Box>
    </Box>
  );
  
  // 渲染标签
  const renderTags = (tagValue, getTagProps) => (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
      {tagValue.map((option, index) => (
        <Chip
          key={option}
          variant="outlined"
          label={option}
          {...getTagProps({ index })}
          sx={{
            borderRadius: 12, // 12px 圆角，符合辅助组件规范
            fontSize: '0.8rem',
          }}
        />
      ))}
    </Box>
  );
  
  return (
    <Container>
      <Autocomplete
        multiple
        id="quote-tag-multi-select"
        options={getFilteredOptions()}
        value={selectedTags}
        onChange={handleChange}
        onInputChange={handleInputChange}
        getOptionLabel={(option) => typeof option === 'string' ? option : option.name}
        isOptionEqualToValue={(option, value) => {
          const optionName = typeof option === 'string' ? option : option.name;
          return optionName === value;
        }}
        renderOption={renderOption}
        renderTags={renderTags}
        filterOptions={(options) => options} // 禁用内置过滤，使用自定义过滤
        loading={tagsLoading}
        noOptionsText={inputValue ? '未找到匹配标签' : '暂无可用标签'}
        clearText="清除"
        closeText="关闭"
        openText="打开"
        disableCloseOnSelect={false}
        blurOnSelect={false}
        limitTags={5} // 最多显示5个标签，超出部分用 +N 表示
        sx={{
          '& .MuiOutlinedInput-root': {
            borderRadius: 16, // 16px 圆角，符合交互组件规范
          },
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            variant="outlined"
            label="选择标签进行筛选"
            placeholder={selectedTags.length === 0 ? "搜索并选择标签..." : ""}
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {status === 'loading' ? (
                    <CircularProgress color="inherit" size={20} />
                  ) : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
            aria-label="选择标签进行筛选"
          />
        )}
      />
    </Container>
  );
};

export default QuoteTagMultiSelect;