import React, { useEffect, useState } from 'react';
import { CardContent, TextField, Typography } from '@mui/material';
import { SettingsCard } from '../components/SettingsShell';
import { getAttachmentEmbedWidthPercent, setAttachmentEmbedWidthPercent } from '../../../utils/attachmentEmbed';

const ClipboardSettingsCard = () => {
  const [value, setValue] = useState(String(getAttachmentEmbedWidthPercent()));

  useEffect(() => {
    setValue(String(getAttachmentEmbedWidthPercent()));
  }, []);

  const handleBlur = () => {
    const saved = setAttachmentEmbedWidthPercent(value);
    setValue(String(saved));
  };

  return (
    <SettingsCard>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          复制/引用
        </Typography>

        <TextField
          label="复制图片/视频 HTML 默认宽度（%）"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={handleBlur}
          type="number"
          inputProps={{ min: 10, max: 100 }}
          helperText="10~100；100% 为满铺。会写入复制出的 <img>/<video> 的 style 与 data-pdh-width。"
          fullWidth
        />
      </CardContent>
    </SettingsCard>
  );
};

export default ClipboardSettingsCard;

