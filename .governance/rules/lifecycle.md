# Lifecycle — 文档生命周期与待沉淀区晋升流程

> **生命周期**：永久保留 — 框架机制入口。
>
> **身份**：L2 Project Rules 薄入口。定义文档生命周期标注格式与待沉淀区晋升流程。
>
> **加载机制**：Cline Rules 条件加载。

---

## 文档生命周期标注

所有 `.governance/` 下文档**必须**在文件头标注生命周期,格式:

| 类型 | 格式 |
|------|------|
| 永久保留 | `永久保留 — <理由>` |
| 版本绑定 | `版本绑定 — <版本>,<归档条件>` |
| 任务绑定 | `任务绑定 — <任务>,<归档条件>` |
| 事件绑定 | `事件绑定 — <事件>,<归档条件>` |
| 会话绑定 | `每次覆写,无归档` |

归档条件**必须**具体可判定(如"v1.0 实现完成后"),禁止"以后""适时"。

## 待沉淀区格式

`HANDOFF.md` 必须包含"待沉淀经验"结构化区块:

```markdown
## 待沉淀经验

> 此区由 rule-appender 自动追加,人工 review 后晋升到 rules/ 或删除。
> 晋升流程见本文件下方。

| id | 经验 | 来源 | 沉淀日期 | 状态 | ttl(天) | 最后验证 | 权重 |
|----|------|------|---------|------|---------|---------|------|
|（空,rule-appender 追加）|
```

## 晋升流程

1. **追加**:人判断"这值得沉淀" → 调用 `rule-appender` 能力机械追加到 `HANDOFF.md` 待沉淀区
2. **Review**:人工 review,决定晋升 / 删除 / 改写
3. **晋升**:移动到 `.governance/rules/`(若装好即生效)或 `.governance/examples/`(若需手动复制)
4. **删除**:从待沉淀区移除,不晋升

**判断由人做,追加由机器做,晋升由人做**。

## 规则退役流程

每条规则满足退役判据之一即触发评估:场景消失 / 被覆盖 / 长期未触发 / 重叠度过高 / 治理膨胀警报。

退役保留期 `<rule_retire_keep_days>` 天(见 constitution 项目可调参数),便于误退役回滚。物理删除时登记到 `docs/ARCHIVE.md`(若存在)。

**禁止退役**:执行门控类规则仅因"长期未触发"退役——未触发恰证明其有效。

## 引用

- 退役判据详表:[`core/constitution.md` §7](../core/constitution.md)
- 待沉淀区所在:`HANDOFF.md`(根目录)
- 追加能力:`capabilities/rule-appender`(GV-6)


-## 表值普期子包钟 (Memory Staleness)

校点层 memory framewo��(mem0 60K stars, Letta, Zep) 廈所、表炽、模型档订天可代议前停记形接辺�{格.

### 箧算分析中

 | 热弌 (age) | 级凹 (weight) | 正弌 |
 |-------------| --------------|-------|
 | age < ttl * 0.5 | 1.0 | fresh |
 | age < ttl | 0.5 | aging |
 | age >= ttl | 0.1 | stale |
 | age >= ttl * 2 | (sweeper 删閟) | expired |

黄违 TTL = 90日。每借近乜在 rule-appender 放入时长是 ttl 值 历分validated。

### 放入时长务命 (SessionStart)

`handoff-provider` 在 SessionStart 放入HANDOFF.md 三个，订共 processStaleness() 对庄实水线务命身务，
P stale 选每 是否８ `<!-- STALE /测试（主题防快返乡处理）` aging 选毌＜候里构，a Trace 所有倡重皅 stale_count / filtered_count

### 人辉接制摐 (staleness-sweeper)
staleness-sweeper 菜派历分在等对接成量额，人辉更接制 HANDOFF.mdΆ�属改全局溢绣：
@ 保证仅人：完全后改全更仅法这里一礹⤍，并选拉。
R多福认词屟怒正弌到逖。age > ttl * 2仅保证宓复一礹⤍
C stale 选毌移于0p#�i!9�!��h��k���H����:f,�d���ܙy�(y�b�+�B��H����:!��,i�Y[L]K�\
yo��an9.#yk�:#�9�/�(j9`/9�k��'�kd9c!zd�ˈ9�$y�*���z-)�.���&���d�9��9.��d#y..��SX:,$��`ycl��*����eo�b�yno�d#;�#�[[�\��\��Y\\�9.��/�y��z/�yb!���8� ���X�H9�m9��yi&�c�y�.N�;�&ya�y�m9�:/�za�9.#z-`z+ṥ/�i!;�#9k�9aj:+��c�����9��yb-�S�ё��Y9��yo#��9`&za�:,hy/빥.z/�za�8� ������9c๥l9�.yaj9���.����H�[[�\����Y\\���\X�[]Y\���[[�\��\��Y\\�8(
B�H9g*9c��i!9�!��b�+�yb-��d�Y�[���[[�\��]][˝�;�"��"B�H�X�H:c/9k�;�&��\X�[]Y\���X�\�8(JB�H:.��b�yb-��d��\X�[]Y\�ܘ^]\�X\[�\��"9.b�//�d#ze�:g��."��\�ݘ[Y]Y��ZY�9c�{�"B