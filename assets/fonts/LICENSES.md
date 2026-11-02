# Bundled font licenses

The OFL fonts and their copyright notices are listed below. The complete
SIL Open Font License 1.1 text is in `OFL-1.1.txt`.

| Directory | Font | Copyright / source |
|---|---|---|
| `noto-sans-sc/` | Noto Sans SC v40 | Copyright Google Inc. Source: [Google Fonts](https://github.com/google/fonts/tree/main/ofl/notosanssc); packaged from [`@fontsource-variable/noto-sans-sc` 5.3.0](https://www.npmjs.com/package/@fontsource-variable/noto-sans-sc). Complete notice: [`Noto-Sans-SC-License.txt`](noto-sans-sc/Noto-Sans-SC-License.txt); asset hashes: [`SHA256SUMS`](noto-sans-sc/SHA256SUMS). |
| `smiley-sans/` | Smiley Sans / 得意黑 | Copyright © 2022–2024 atelierAnchor. Reserved Font Names: Smiley, 得意黑. <https://github.com/atelier-anchor/smiley-sans> |
| `douyin-meihaoti/` | DouyinSans / 抖音美好体 | Copyright © 2023 Beijing Zitiao Network Technology Co., Ltd. <https://github.com/bytedance/fonts> |
| `qingsong-shouxieti-yi/` | JasonHandwriting1 / 清松手写体一 | Copyright © 2020 Jason (Yu Ching Sung). <http://www.writes.com.tw> |
| `qingsong-shouxieti-san-p/` | JasonHandwriting3p / 清松手写体三P | Copyright © 2020 Jason (Yu Ching Sung). <http://www.writes.com.tw> |

The bundled WOFF2 files remain licensed under the SIL Open Font License 1.1.

## Interface fonts (`public/fonts/`)

The editor's own typefaces, self-hosted so the app never loads fonts from a third-party
server (specs/01). The three brand faces match <https://vixaventora.com/> (specs/09); they are
the Google Fonts `latin` subset (covers Spanish: á é í ó ú ñ ü ¿ ¡), variable by weight,
downloaded on 2026-11-01. All are SIL Open Font License 1.1 (`OFL-1.1.txt`).

| File | Font | Copyright / source | SHA-256 |
|---|---|---|---|
| `InstrumentSans-Variable.woff2` | Instrument Sans (wght 400–700) | Copyright 2022 The Instrument Sans Project Authors. <https://github.com/Instrument/instrument-sans> | `6219bc4bfdfc5d9b2201dcdf046218b122a758f932e25ed5f168f929b7ca2311` |
| `SourceSerif4-Variable.woff2` | Source Serif 4 (wght 400–600) | Copyright 2014 The Source Serif 4 Project Authors. <https://github.com/adobe-fonts/source-serif> | `2a24bad466f09b88b8e9cbc488bf774117c912e66374c57bf4716855849143f8` |
| `JetBrainsMono-Variable.woff2` | JetBrains Mono (wght 400–700) | Copyright 2020 The JetBrains Mono Project Authors. <https://github.com/JetBrains/JetBrainsMono> | `2c32b9b3ee358c119e210f6f5195f9bd34894d78a785ff2e95d60e718e400af4` |
| `Geist-*.woff2` | Geist | Vercel, OFL-1.1 (as noted in `src/index.css`). <https://github.com/vercel/geist-font> — fallback in the UI stacks and default face of text layers in videos |  |
| `IoskeleyMono-*.woff2` | IoskeleyMono (served as `Geist Mono`) | OFL-1.1, an Iosevka build (as noted in `src/index.css`). <https://github.com/ahatem/IoskeleyMono> — monospace fallback |  |

The other bundled fonts use their publishers' free-commercial-use terms and
are not open-source fonts: Huxiaobo Nanshen Ti, Huxiaobo Saobao Ti,
Huxiaobo Zhenshuai Ti, Pangmen Zhengdao Biaoti Ti and Pangmen Zhengdao
Qingsong Ti.
