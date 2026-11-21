# Arcaea 单曲 ptt 计算器（v7.0+）

静态单页：输入结算分数与谱面定数，勾选是否通关，实时得到单曲潜力值。

![预览](preview.png)

通关（TC / Easy Clear / FR / PM）额外 **+0.200**；Track Lost 不加。下限 0 在加完奖励之后取。

## 公式

    s ≥ 10,000,000        base = 定数 + 2
    9,800,000 ≤ s < 1e7   base = 定数 + 1 + (s − 9,800,000) / 200,000
    s < 9,800,000         base = 定数 + (s − 9,500,000) / 300,000

    ptt = max(0, base + (本次通关 ? 0.200 : 0))

- 奖励绑定「这一次」的通关状态，与该谱历史是否 TC 无关。
- 页面展示三位小数（四舍五入）；按两位显示时保留两位小数。
- 分数输入上限 10,002,200（2200 物量、全大 Pure 的理论值）。

## 使用

直接打开 `index.html`，无需构建或本地服务器。

- 三个快捷示例：PM 12.0 / TC 9,950,000 / TL 9,950,000
- 分享参数：`index.html?score=9950000&diff=10.5&clear=1`（`clear=1` 通关，`0` 为 TL）
- 修改输入时会同步更新地址栏，复制 URL 即可分享当前结果。

## 文件

| 文件 | 说明 |
| --- | --- |
| `index.html` | 页面结构 |
| `styles.css` | 样式与响应式布局 |
| `app.js` | 公式、渲染、Canvas 曲线 |
| `tests/verify.mjs` | 精确有理数对拍 |
| `tests/browser.mjs` | Edge/Chrome 无头页面冒烟 |
| `tests/cases.json` | 真实成绩样本 |
| `preview.png` | 页面预览图 |

## 验证

    cd arcaea-ptt
    node tests/verify.mjs
    node tests/browser.mjs

`verify.mjs` 从 `app.js` 抽出数学部分，与统一分母 600000 的 BigInt 有理数参考逐例比对：基础值、通关奖励、原始值、下限、三位显示、边界网格、30000 组随机、单调性、评级阈值，共 34432 项（含 31 个恰好 .0005 的半数进位展示用例）。`browser.mjs` 用无头浏览器实际加载页面并读取 `#ptt` / `#grade`，覆盖 11 个用例；可用 `EDGE_PATH` 指定浏览器。

## 背景

公式来自 Arcaea 7.0 起的单曲潜力值机制：通关（PM / FR / TC）额外 +0.200；b30+r10 改为 b50+b10 的配套改动。本项目只算单曲，不含 b50+b10 总 ptt。
