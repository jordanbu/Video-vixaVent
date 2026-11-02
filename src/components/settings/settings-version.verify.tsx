import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';

const moduleUrl = new URL('./SettingsVersionControl.tsx', import.meta.url);
const versionModule = await import(moduleUrl.href).catch(() => null);

assert.ok(versionModule, 'Settings标题栏应提供独立的版本与Check for updates控件');

const { SettingsVersionControl } = versionModule;
let requested = false;
const markup = renderToStaticMarkup(
  <SettingsVersionControl
    versionLabel="当前版本号：V0.1.9"
    actionLabel="Download update"
    disabled={false}
    onAction={() => { requested = true; }}
  />,
);

assert.match(markup, /当前版本号：V0\.1\.9/, 'Settings标题栏必须展示 package.json 对应版本');
assert.match(markup, />Download update<\/button>/, '桌面版Discover新版后必须提供直接Download入口');
assert.doesNotMatch(markup, /AutoUpdate/, 'Download必须保留用户Confirm，不得变成静默AutoUpdate');

const element = SettingsVersionControl({
  versionLabel: '当前版本号：V0.1.9',
  actionLabel: 'Download update',
  disabled: false,
  onAction: () => { requested = true; },
});
const button = element.props.children[1];
button.props.onClick();
assert.equal(requested, true, '点击Download update必须触发受控Update动作');

console.log('settings-version.verify: current version and manual check control OK');
