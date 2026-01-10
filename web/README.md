# Web 可玩版（表驱动）

目标：把 `docs/prd/demo/kd_sim_demo_v2_min_home_and_pages.html` 的 Demo 变成**可扩展、可先玩起来**的网页版本，后续主要通过补充 `docs/数值/*.csv` 来增加丰富度。

## 运行方式

> 推荐在仓库根目录启动静态服务（避免浏览器 file:// 拦截 CSV 读取）。

在仓库根目录执行：

```bash
python3 -m http.server 5173
```

然后打开：

`http://localhost:5173/web/`

## 数据源

- 默认读取：`../docs/数值`（相对 `web/`）
- 如果你的目录结构有调整，可以在页面右上角/设置里修改“数据源路径”，保存后会重载数据。

## 目前已接入的表（新表头样例）

- `docs/数值/events_new_schema_sample.csv`：每周事件（conditions/occurrence/权重规则）
- `docs/数值/choices_new_schema_sample.csv`：事件选项（resolution/outcomes 结构化效果）
- `docs/数值/world_events.csv`：世界事件（概率触发、持续、多倍率叠加）
- `docs/数值/achievements.csv`：成就（达成即自动领取奖励）
- `docs/数值/shop_types.csv`、`docs/数值/locations.csv`、`docs/数值/mbti.csv`：用于开局与经营结算

## 验证（可选）

在仓库根目录执行：

```bash
node web/scripts/validate-data.mjs
```

用于检查 CSV 的基础一致性（如 choice 引用的 event 是否存在、概率范围是否合法等）。
