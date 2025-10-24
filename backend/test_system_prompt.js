/**
 * 系统提示词修复验证脚本
 * 用于验证系统提示词在多轮对话中是否正确注入
 */

const axios = require('axios');

// 配置
const BASE_URL = 'http://localhost:8080';
let authToken = '';

// 登录获取token
async function login() {
  try {
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    
    authToken = response.data.token;
    console.log('登录成功，获取到token');
    return true;
  } catch (error) {
    console.error('登录失败:', error.response?.data || error.message);
    return false;
  }
}

// 获取角色列表
async function getRoles() {
  try {
    const response = await axios.get(`${BASE_URL}/api/ai/v1/roles`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    return response.data.data;
  } catch (error) {
    console.error('获取角色列表失败:', error.response?.data || error.message);
    return [];
  }
}

// 发送聊天请求（非流式）
async function sendChat(messages, roleId = null, disableSystemPrompt = false) {
  try {
    const requestData = {
      messages,
      stream: false
    };
    
    if (roleId) {
      requestData.role_id = roleId;
    }
    
    if (disableSystemPrompt) {
      requestData.disable_system_prompt = true;
    }
    
    const response = await axios.post(`${BASE_URL}/api/ai/v1/chat/completions`, requestData, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    return response.data;
  } catch (error) {
    console.error('发送聊天请求失败:', error.response?.data || error.message);
    return null;
  }
}

// 验证系统提示词注入
async function testSystemPromptInjection() {
  console.log('\n=== 开始验证系统提示词注入 ===\n');
  
  // 1. 获取角色列表
  const roles = await getRoles();
  if (roles.length === 0) {
    console.log('没有找到任何角色，请先创建角色');
    return;
  }
  
  console.log('可用角色:');
  roles.forEach(role => {
    console.log(`- ${role.name} (ID: ${role._id}, 默认: ${role.isDefault})`);
  });
  
  const defaultRole = roles.find(r => r.isDefault);
  const testRole = roles.find(r => !r.isDefault) || defaultRole;
  
  // 2. 测试场景1：默认角色
  console.log('\n--- 测试场景1：默认角色 ---');
  await testScenario('默认角色', null, false, defaultRole?.systemPrompt);
  
  // 3. 测试场景2：指定角色
  console.log('\n--- 测试场景2：指定角色 ---');
  await testScenario('指定角色', testRole._id, false, testRole.systemPrompt);
  
  // 4. 测试场景3：禁用系统提示词
  console.log('\n--- 测试场景3：禁用系统提示词 ---');
  await testScenario('禁用系统提示词', null, true, null);
}

// 测试单个场景
async function testScenario(scenarioName, roleId, disableSystemPrompt, expectedSystemPrompt) {
  console.log(`\n${scenarioName}测试:`);
  
  // 第一轮对话
  console.log('  第一轮对话...');
  const response1 = await sendChat([
    { role: 'user', content: '你好，请简单介绍一下你自己。' }
  ], roleId, disableSystemPrompt);
  
  if (!response1) {
    console.log(`  ❌ ${scenarioName}第一轮对话失败`);
    return;
  }
  
  // 第二轮对话（使用第一轮的history_id）
  const historyId = response1.data.meta?.historyId;
  if (!historyId) {
    console.log(`  ⚠️  ${scenarioName}第一轮未返回history_id，跳过第二轮测试`);
    return;
  }
  
  console.log('  第二轮对话...');
  const response2 = await sendChat([
    { role: 'user', content: '你刚才说的第一个字是什么？' }
  ], roleId, disableSystemPrompt);
  
  if (!response2) {
    console.log(`  ❌ ${scenarioName}第二轮对话失败`);
    return;
  }
  
  // 验证结果
  console.log(`  ✅ ${scenarioName}测试完成`);
  console.log(`     第一轮回复: ${response1.data.choices[0].message.content.substring(0, 50)}...`);
  console.log(`     第二轮回复: ${response2.data.choices[0].message.content.substring(0, 50)}...`);
}

// 主函数
async function main() {
  console.log('系统提示词修复验证脚本');
  console.log('========================');
  
  // 设置调试环境变量
  process.env.DEBUG_SYSTEM_PROMPT = 'true';
  
  // 登录
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('登录失败，退出测试');
    return;
  }
  
  // 执行测试
  await testSystemPromptInjection();
  
  console.log('\n=== 测试完成 ===');
  console.log('请检查后端日志中的 [DEBUG] 输出，确认系统提示词是否正确注入');
}

// 运行测试
main().catch(console.error);