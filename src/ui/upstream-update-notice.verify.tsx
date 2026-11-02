import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { DesktopWindowControlButtons } from '../components/DesktopWindowControls';

const moduleUrl = new URL('./UpstreamUpdateNoticeView.tsx', import.meta.url);
const noticeModule = await import(moduleUrl.href).catch(() => null);

assert.ok(noticeModule, 'Apply应提供非阻塞的Up游版本提示');

const { UpstreamUpdateNoticeView } = noticeModule;
const markup = renderToStaticMarkup(
  <div data-dashboard-chrome>
    <UpstreamUpdateNoticeView
      message="Discover Vixaventora 新版本 V0.2.0，当前版本 V0.1.9。可以直接Download并Install。"
      actionLabel="Download update"
      closeLabel="Close"
      onAction={() => undefined}
      onDismiss={() => undefined}
    />
    <DesktopWindowControlButtons
      translate={(text) => text}
      onAction={() => undefined}
    />
  </div>,
);

assert.match(markup, /Discover Vixaventora 新版本 V0\.2\.0/, '新版提示必须明确给出官方产品与版本');
assert.match(markup, />Download update<\/button>/, '桌面新版提示必须提供直接Download动作');
assert.match(markup, /role="status"/, '非阻塞提示应使用状态语义');
assert.doesNotMatch(markup, /<a\b/, 'Update入口必须走受控桌面 IPC 而不是任意链接');
assert.match(markup, /top:50%/, 'Update提示应在首页Vertical居Center');
assert.match(markup, /left:50%/, 'Update提示应在首页Horizontal居Center');
assert.match(markup, /z-index:190/, 'Update提示必须位于Settings弹窗Down方，避免遮挡SettingsAction');
assert.match(markup, /transform:translate\(-50%,\s*-50%\)/, 'Update提示应以自身Center心对准窗口Center心');
assert.match(markup, /aria-label="Window controls"/, '桌面Window controls必须与首页Update提示在同一 dashboard chrome Center可渲染');
assert.equal((markup.match(/class="vx-window-control /g) ?? []).length, 3, 'macOS 标题栏应保留三个Window controls按钮');


console.log('upstream-update-notice.verify: dashboard-only centered upstream update notice OK');
