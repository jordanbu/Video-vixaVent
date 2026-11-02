import {
  LLM_PROVIDER_PRESETS,
  isLocalLlmProvider,
  llmProviderConfigNames,
} from '../../../shared/llm-providers';
import type { VendorId } from './vendorIcons';
import { secret, text, type SettingsVendorPage } from './settingsFields';

const llmPage = (preset: (typeof LLM_PROVIDER_PRESETS)[number]): SettingsVendorPage => {
  const names = llmProviderConfigNames(preset.id);
  return {
    key: `llm/${preset.id}`,
    vendor: preset.id as VendorId,
    title: preset.label,
    note: preset.id === 'anthropic'
      ? '内置 Agent 可使用 Anthropic API Key，也可以在下方「Anthropic · Claude Code」页用 Claude 订阅登录（无需 API Key）。'
        + '独立运行的 Claude Code 会话也可以通过「外部 Agent 接入 (MCP)」驱动 Vixaventora。'
      : 'Each provider keeps its own endpoint, key, and model. Test the connection, then choose from the models returned by that API.',
    ...(preset.id === 'anthropic'
      ? { noteAction: { label: 'External agents (MCP)', action: 'open-mcp-guide' } }
      : {}),
    fields: [
      {
        name: names.baseUrl,
        label: 'API URL',
        kind: 'text',
        defaultLabel: preset.baseUrl,
        note: 'Enter the complete API prefix. You can use the official endpoint, your own gateway, or a compatible relay.',
      },
      secret(names.apiKey, isLocalLlmProvider(preset.id) ? 'API Key (optional)' : 'API Key'),
      ...(preset.id === 'openai' ? [{
        name: 'LLM_OPENAI_API_MODE',
        label: 'API format',
        kind: 'select' as const,
        defaultLabel: 'Responses API (recommended)',
        note: 'Choose the protocol your service actually supports. OpenAI uses the Responses API; compatible services use Chat Completions.',
        options: [{ value: 'chat', label: 'Chat Completions API' }],
      }] : []),
      {
        name: names.model,
        label: 'Model',
        kind: 'text',
        defaultLabel: preset.defaultModel,
        discoverableModel: true,
        note: 'After testing, choose a returned model or enter a model ID manually.',
        options: [{ value: preset.defaultModel, label: preset.defaultModel }],
      },
    ],
  };
};

const CODEX_PAGE: SettingsVendorPage = {
  key: 'llm/codex',
  vendor: 'openai',
  title: 'OpenAI · Codex',
  connection: 'codex',
  note: 'Sign in with a ChatGPT subscription. The official Codex CLI manages credentials, renewal, and logout; Vixaventora never reads or displays OAuth credentials.',
  fields: [
    {
      name: 'CODEX_MODEL', label: 'Codex model', kind: 'text',
      defaultLabel: 'Codex default model', discoverableModel: true,
      note: 'After signing in, load the models available to this account or enter a model ID manually.',
    },
    {
      name: 'CODEX_REASONING_EFFORT', label: 'Reasoning effort', kind: 'select',
      options: [{ value: '', label: 'Model default' }],
      note: 'Load models to see the effort levels supported by the current model. Leave this unset to use the model default.',
    },
  ],
};

const COPILOT_PAGE: SettingsVendorPage = {
  key: 'llm/copilot',
  vendor: 'copilot',
  title: 'GitHub Copilot',
  connection: 'copilot',
  note: '使用 GitHub Copilot 订阅：官方 Copilot CLI 管理登录与凭据（终端运行 copilot login），'
    + 'Vixaventora 通过 Copilot SDK 直接驱动编辑工具，不会读取或显示凭据。'
    + '会话状态隔离在 ~/.vixaventora/copilot，不影响你自己的 ~/.copilot。',
  fields: [
    {
      name: 'COPILOT_MODEL', label: 'Copilot model', kind: 'text',
      defaultLabel: 'Copilot default model', discoverableModel: true,
      note: 'After signing in, load the models available to this subscription or enter a model ID manually. Only tool-calling models can be used for editing.',
    },
    {
      name: 'COPILOT_REASONING_EFFORT', label: 'Reasoning effort', kind: 'select',
      options: [{ value: '', label: 'Model default' }],
      note: 'Load models to see the effort levels supported by the current model. Leave this unset to use the model default.',
    },
  ],
};

const CLAUDE_CODE_PAGE: SettingsVendorPage = {
  key: 'llm/claude-code',
  vendor: 'anthropic',
  title: 'Anthropic · Claude Code',
  connection: 'claude-code',
  note: '使用 Claude 订阅登录，由官方 Claude Code CLI 管理凭据、续期与退出，Vixaventora 不会读取或显示 OAuth 凭据。'
    + '在终端运行 claude auth login（或 claude setup-token 获取长期令牌）完成登录后，点击“重新检测”。',
  fields: [
    {
      name: 'CLAUDE_CODE_MODEL', label: 'Claude Code model', kind: 'text',
      defaultLabel: 'Claude Code default model', discoverableModel: true,
      note: 'After signing in, choose from the available models or enter an alias manually (e.g. sonnet / opus / haiku).',
    },
  ],
};

const XAI_OAUTH_PAGE: SettingsVendorPage = {
  key: 'llm/xai-oauth', vendor: 'xai-oauth', title: 'xAI · Grok (Subscription sign-in)',
  connection: 'xai-oauth',
  note: 'Sign in with your SuperGrok or X Premium+ subscription: the official Grok CLI owns login and credentials (run grok login in a terminal); Vixaventora imports the session and refreshes it automatically, and never reads or displays OAuth credentials.',
  fields: [{
    name: 'LLM_XAI_OAUTH_MODEL', label: 'Model', kind: 'text', defaultLabel: 'grok-4.6',
    discoverableModel: true,
    note: 'After testing, choose a returned model or enter a model ID manually.',
    options: [{ value: 'grok-4.6', label: 'grok-4.6' }],
  }],
};

// Sponsored placement: OFox sits 4th in Agent 大脑 (Anthropic, OpenAI,
// OpenAI · Codex, OFox), independent of its position in LLM_PROVIDER_PRESETS.
const OFOX_PRESET = LLM_PROVIDER_PRESETS.find((preset) => preset.id === 'ofox');
const AGENT_VENDOR_PAGES: readonly SettingsVendorPage[] = LLM_PROVIDER_PRESETS.flatMap((preset) => {
  if (preset.id === 'xai-oauth') return [XAI_OAUTH_PAGE];
  if (preset.id === 'ofox') return [];
  const page = llmPage(preset);
  if (preset.id === 'anthropic') return [page, CLAUDE_CODE_PAGE];
  if (preset.id !== 'openai') return [page];
  return OFOX_PRESET
    ? [page, CODEX_PAGE, llmPage(OFOX_PRESET), COPILOT_PAGE]
    : [page, CODEX_PAGE, COPILOT_PAGE];
});

const VISION_PAGE: SettingsVendorPage = {
  key: 'llm/vision', vendor: 'vision', title: 'Vision understanding', fields: [],
};

export const PROXY_PAGE: SettingsVendorPage = {
  key: 'agent/proxy', vendor: 'proxy', title: 'Network proxy', kind: 'settings',
  note: '国内网络访问海外模型（Gemini / OpenAI / Anthropic / Mistral 等）失败时，'
    + '可在此填写本地代理地址（如 http://127.0.0.1:7890）。'
    + '留空则使用系统环境变量（HTTPS_PROXY / HTTP_PROXY）。'
    + '生效范围：Agent 模型、AI 生成、模型下载、R2 云同步。',
  fields: [text('PROXY_URL', 'Proxy URL', 'Example: http://127.0.0.1:7890')],
};

export const AGENT_VENDOR_PAGES_WITH_VISION: readonly SettingsVendorPage[] = [
  ...AGENT_VENDOR_PAGES,
  VISION_PAGE,
];
