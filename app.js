const {
    createApp,
    reactive,
    ref,
    computed,
    watch,
    nextTick
} = Vue;
 // Dexie 初始化
const db = new Dexie('dnd-assist-v2');
db.version(3).stores({
    monsters: '++id, name, cr, isCustom',
    abilities: '++id, name',
    pcs: '++id, name',
    actions: '++id, name, type, onHitStatus, onHitStatusRounds, onHitSaveAbility, onHitSaveDC',
    monsterGroups: '++id, name',
});

        async function seedIfEmpty() {
            const count = await db.monsters.count();
            if (count > 0) return;
            await db.abilities.bulkAdd([{
                name: '再生',
                description: '每回合开始时回复若干生命值。'
            }, {
                name: '敏捷闪避',
                description: '在可见来源的范围效果伤害上掷成功时不受伤，失败时只受半伤。'
            }, ]);
            const actionCount = await db.actions.count();
            if (actionCount === 0) {
                await db.actions.bulkAdd([
                    { name: '弯刀 (attack)', type: 'attack', attackBonus: 4, damageDice: '1d6+2', damageType: '斩击' },
                    { name: '短弓 (attack)', type: 'attack', attackBonus: 4, damageDice: '1d6+2', damageType: '穿刺' },
                ]);
            }
            await db.monsters.bulkAdd([{
                name: '哥布林',
                cr: 0.25,
                type: ['humanoid', 'goblinoid'],
                ac: 15,
                hp: {
                    average: 7,
                    roll: '2d6'
                },
                speed: {
                    walk: 30
                },
                abilities: {
                    str: 8,
                    dex: 14,
                    con: 10,
                    int: 10,
                    wis: 8,
                    cha: 8
                },
                resistances: {
                    damage: [],
                    conditions: []
                },
                vulnerabilities: {
                    damage: [],
                    conditions: []
                },
                immunities: {
                    damage: [],
                    conditions: []
                },
                actions: [{
                    id: crypto.randomUUID(),
                    name: '弯刀',
                    type: 'attack',
                    attackBonus: 4,
                    damageDice: '1d6+2',
                    damageType: '斩击'
                }, {
                    id: crypto.randomUUID(),
                    name: '短弓',
                    type: 'attack',
                    attackBonus: 4,
                    damageDice: '1d6+2',
                    damageType: '穿刺'
                }, ],
                isCustom: false
            }, {
                name: '食人魔',
                cr: 2,
                type: ['giant'],
                ac: 11,
                hp: {
                    average: 59,
                    roll: '7d10+21'
                },
                speed: {
                    walk: 40
                },
                abilities: {
                    str: 19,
                    dex: 8,
                    con: 16,
                    int: 5,
                    wis: 7,
                    cha: 7
                },
                resistances: {
                    damage: [],
                    conditions: []
                },
                vulnerabilities: {
                    damage: [],
                    conditions: []
                },
                immunities: {
                    damage: [],
                    conditions: []
                },
                actions: [{
                    id: crypto.randomUUID(),
                    name: '巨棍',
                    type: 'attack',
                    attackBonus: 6,
                    damageDice: '2d8+4',
                    damageType: '钝击'
                }, {
                    id: crypto.randomUUID(),
                    name: '标枪',
                    type: 'attack',
                    attackBonus: 6,
                    damageDice: '2d6+4',
                    damageType: '穿刺'
                }, ],
                isCustom: false
            }, {
                name: '成年红龙',
                cr: 17,
                type: ['dragon'],
                ac: 19,
                hp: {
                    average: 256,
                    roll: '19d12+133'
                },
                speed: {
                    walk: 40,
                    fly: 80
                },
                abilities: {
                    str: 27,
                    dex: 10,
                    con: 25,
                    int: 16,
                    wis: 13,
                    cha: 21
                },
                resistances: {
                    damage: [],
                    conditions: []
                },
                vulnerabilities: {
                    damage: [],
                    conditions: []
                },
                immunities: {
                    damage: ['fire'],
                    conditions: []
                },
                actions: [{
                    id: crypto.randomUUID(),
                    name: '咬击',
                    type: 'attack',
                    attackBonus: 14,
                    damageDice: '2d10+8',
                    damageType: '穿刺'
                }, {
                    id: crypto.randomUUID(),
                    name: '吐息武器',
                    type: 'save',
                    saveAbility: 'dex',
                    saveDC: 21,
                    damageDice: '18d6',
                    damageType: '火焰',
                    onSuccess: 'half',
                    recharge: 6,
                }, ],
                isCustom: false
            }]);
            await db.pcs.bulkAdd([{
                name: '艾瑞克',
                ac: 16,
                hpMax: 32,
                hpCurrent: 32,
                abilities: {
                    str: 16,
                    dex: 12,
                    con: 14,
                    int: 10,
                    wis: 10,
                    cha: 12
                },
                actions: [],
                features: '一名经验丰富的战士，忠诚可靠。'
            }, {
                name: '琳',
                ac: 14,
                hpMax: 24,
                hpCurrent: 24,
                abilities: {
                    str: 8,
                    dex: 16,
                    con: 12,
                    int: 14,
                    wis: 12,
                    cha: 10
                },
                actions: [],
                features: '一位敏捷的游侠，擅长弓箭和野外生存。'
            }, ]);
        }

        function deepClone(obj) {
            return JSON.parse(JSON.stringify(obj));
        }
        // 工具函数
        function abilityMod(score) {
            return Math.floor((score - 10) / 2);
        }

        function rollD20(mode = 'normal') {
            const r1 = Math.floor(Math.random() * 20) + 1;
            if (mode === 'normal') return {
                value: r1,
                isCrit: r1 === 20,
                isFumble: r1 === 1,
                raw: [r1]
            };
            const r2 = Math.floor(Math.random() * 20) + 1;
            const pick = mode === 'adv' ? Math.max(r1, r2) : Math.min(r1, r2);
            return {
                value: pick,
                isCrit: pick === 20,
                isFumble: pick === 1,
                raw: [r1, r2]
            };
        }

        function parseDiceExpr(expr) {
            if (!expr) return { dice: [], flat: 0 };
            const dice = [];
            let flat = 0;
            const parts = expr.replace(/-/g, '+-').split('+');
            for (const part of parts) {
                const trimmed = part.trim();
                if (trimmed.includes('d')) {
                    dice.push(trimmed);
                } else if (trimmed) {
                    flat += parseInt(trimmed, 10) || 0;
                }
            }
            return { dice, flat };
        }

        function rollDamage(expr, isCrit = false, damageType = 'generic') {
            if (!expr) return [{ amount: 0, type: damageType }];
            
            const { dice, flat } = parseDiceExpr(expr);
            let total = flat;

            for (const d of dice) {
                const [countStr, facesStr] = d.toLowerCase().split('d');
                const count = isCrit ? (parseInt(countStr, 10) || 1) * 2 : (parseInt(countStr, 10) || 1);
                const faces = parseInt(facesStr, 10);
                if (isNaN(faces)) continue;

                for (let i = 0; i < count; i++) {
                    total += Math.floor(Math.random() * faces) + 1;
                }
            }
            
            return [{ amount: Math.max(0, total), type: damageType }];
        }

        function rollDamageWithDetails(expr, isCrit = false, damageType = 'generic') {
            if (!expr) return { total: 0, rolls: [], flat: 0, type: damageType };
            
            const { dice, flat } = parseDiceExpr(expr);
            let total = flat;
            const rolls = [];

            for (const d of dice) {
                const [countStr, facesStr] = d.toLowerCase().split('d');
                const count = isCrit ? (parseInt(countStr, 10) || 1) * 2 : (parseInt(countStr, 10) || 1);
                const faces = parseInt(facesStr, 10);
                if (isNaN(faces)) continue;

                for (let i = 0; i < count; i++) {
                    const roll = Math.floor(Math.random() * faces) + 1;
                    rolls.push(roll);
                    total += roll;
                }
            }
            
            return { total: Math.max(0, total), rolls, flat, type: damageType };
        }

        function formatDamageList(dl) {
            return dl.map(x => `${x.amount} ${x.type}`).join(' + ') || '0';
        }

        function clamp(n, min, max) {
            return Math.max(min, Math.min(max, n));
        }

        // 简化的 CR 自动调整占位（TODO：替换为正式规则表）
        function adjustMonsterToCR(mon, targetCR) {
            const out = deepClone(mon);
            const cr = Number(targetCR) || mon.cr || 1;
            // 非正式：以 CR 线性近似，作为占位
            const scale = (cr) / (mon.cr || 1);
            out.cr = cr;
            out.ac = Math.round(clamp((mon.ac || 12) + (scale - 1) * 2, 8, 25));
            const baseHP = mon.hp?.average ?? mon.hp ?? 10;
            out.hp = {
                average: Math.round(clamp(baseHP * scale, 5, 600)),
                roll: mon.hp?.roll || ''
            };
            // 调整动作攻击加值与伤害骰（仅把伤害/轮提升为近似；骰子智能反算 TODO）
            (out.actions || []).forEach(a => {
                if (a.type === 'attack') {
                    a.attackBonus = Math.round((a.attackBonus || 3) + (scale - 1) * 2);
                    // 粗略伤害上调：额外 +Xd6
                    a.damageDice = a.damageDice ? `${a.damageDice}+${Math.max(1, Math.round(scale))}d6` : `${Math.max(1, Math.round(1*scale))}d6`;
                }
                if (a.type === 'save') {
                    a.saveDC = Math.round((a.saveDC || 12) + (scale - 1) * 2);
                    a.damageDice = a.damageDice ? `${a.damageDice}+${Math.max(1, Math.round(scale))}d6` : `${Math.max(2, Math.round(2*scale))}d6`;
                }
            });
            return out;
        }

        createApp({
            setup() {
                const route = ref('battle'); // 默认跳到战斗页便于看布局
                const monsters = ref([]);
                const abilities = ref([]);
                const pcs = ref([]);
                const actions = ref([]);
                const monsterGroups = ref([]);
                const monsterFilters = reactive({
                    keyword: '',
                    cr: '',
                    types: []
                });
                const monsterTypes = ref(['aberration', 'beast', 'celestial', 'construct', 'dragon', 'elemental', 'fey', 'fiend', 'giant', 'humanoid', 'monstrosity', 'ooze', 'plant', 'undead', 'goblinoid']);
                const damageTypes = ref(['钝击', '穿刺', '斩击', '火焰', '寒冷', '力场', '毒素', '酸性', '闪电', '心灵', '光耀', '死灵', '雷鸣']);
                const conditionTypes = ref(['charmed', 'frightened', 'poisoned', 'prone', 'restrained', 'blinded']);
                const monsterTypeTranslations = {
                    'aberration': '异怪',
                    'beast': '野兽',
                    'celestial': '天界生物',
                    'construct': '构装体',
                    'dragon': '龙',
                    'elemental': '元素',
                    'fey': '精类',
                    'fiend': '邪魔',
                    'giant': '巨人',
                    'humanoid': '人形生物',
                    'monstrosity': '怪兽',
                    'ooze': '泥怪',
                    'plant': '植物',
                    'undead': '不死生物',
                    'goblinoid': '类哥布林'
                };
                const translateType = (t) => monsterTypeTranslations[t] || t;
                const crOptions = ref(['0', '0.125', '0.25', '0.5', ...Array.from({
                    length: 30
                }, (_, i) => (i + 1).toString())]);
                const battle = reactive({
                    participants: [],
                    currentIndex: 0,
                    round: 1,
                    dragIndex: null,
                });

                watch(battle, (newState) => {
                    localStorage.setItem('dnd-battle-state', JSON.stringify(newState));
                }, { deep: true });
                const ui = reactive({
                    actorViewer: {
                        open: false,
                        actor: null,
                    },
                    monsterEditor: {
                        open: false,
                        mode: 'edit', // 'view' or 'edit'
                    },
                    abilityPool: {
                        open: false,
                        keyword: '',
                        nested: false
                    },
                    imageCropper: {
                        open: false,
                        imageUrl: null,
                        aspectRatio: 720 / 480, // 模态框大致宽高比
                    },
                    avatarCropper: {
                        open: false,
                        imageUrl: null,
                        aspectRatio: 1, // 1:1 for circular avatar
                    },
                    actionPool: {
                        open: false,
                        keyword: '',
                        nested: false
                    },
                    actionsViewer: { 
                        open: false, 
                        draft: null, 
                        title: '' 
                    },
                    saveCheck: {
                      open: false,
                      targetName: '',
                      dc: 0,
                      ability: '',
                      callback: null
                    },
                    // 在这里添加新的对象
                    saveOutcomePicker: {
                        open: false,
                        title: '',
                        targets: [], // 存储目标对象
                        action: null, // 存储动作详情
                        damages: [], // 存储已掷骰的伤害结果 [{ amount: 15, type: '火焰' }]
                        outcomes: {} // 存储每个目标的豁免结果 { targetUid: 'fail' | 'half' | 'zero' }
                    },
                    abilityEditor: {
                        open: false
                    },
                    pcEditor: {
                        open: false,
                        mode: 'edit',
                    },
                    activeEditor: null, // 'monster' or 'pc'
                    actionEditor: {
                        open: false,
                        saveTarget: 'global',
                        nested: false,
                    },
                    statusPicker: {
                        open: false,
                        targetUid: null,
                        selectedName: '束缚 Restrained',
                        rounds: 3,
                        icon: '⛓️'
                    },
                    addParticipants: {
                        open: false,
                        keywordM: '',
                        keywordP: ''
                    },
                    hpEditor: {
                        open: false,
                        targetUid: null,
                        delta: null
                    },
                    monsterGroupManager: { open: false },
                    monsterGroupEditor: { open: false, keyword: '' },
                    quickDamage: {
                        open: false,
                        targetUid: null,
                        damageAmount: null,
                        targetName: ''
                    },
                    actionOnCooldown: false,
                    selectedAction: null,
                    rollMode: 'normal',
                    autoApplyDamage: true,
                    selectedTargets: [],
                    log: '',
                    notificationQueue: [],
                    critNotification: {
                        open: false,
                        type: 'success', // 'success' or 'failure'
                        attacker: '',
                        target: ''
                    },
                    normalHitNotification: {
                        open: false,
                        attacker: '',
                        target: '',
                        toHitRoll: '',
                        toHitResult: 0,
                        targetAC: 0,
                        damageExpression: '',
                        damageRolls: '',
                        rawDamage: 0,
                        finalDamage: 0,
                        damageType: '',
                        damageModifierInfo: '',
                    },
                    missNotification: {
                        open: false,
                        attacker: '',
                        target: '',
                        toHitRoll: '',
                        toHitResult: 0,
                        targetAC: 0,
                    },
                    toasts: [],
                });
                const hpDelta = ref(5);
                const quickDamageInput = ref(null);
                const participantTiles = ref(new Map());
                const currentActor = computed(() => battle.participants[battle.currentIndex] || null);

                watch(currentActor, (newActor) => {
                    if (newActor) {
                        nextTick(() => {
                            const tile = participantTiles.value.get(newActor.uid);
                            if (tile) {
                                tile.scrollIntoView({
                                    behavior: 'smooth',
                                    block: 'nearest',
                                    inline: 'center'
                                });
                            }
                        });
                    }
                });

                // 怪物编辑器草稿
                const emptyMonster = () => ({
                    name: '',
                    avatar: '',
                    cr: 1,
                    backgroundImage: '',
                    type: [],
                    ac: 12,
                    hp: {
                        average: 10,
                        roll: '1d8+2'
                    },
                    speed: {
                        walk: 30
                    },
                    abilities: {
                        str: 10,
                        dex: 10,
                        con: 10,
                        int: 10,
                        wis: 10,
                        cha: 10
                    },
                    resistances: { damage: [], conditions: [] },
                    vulnerabilities: { damage: [], conditions: [] },
                    immunities: { damage: [], conditions: [] },
                    actions: [],
                    isDefault: false
                });
                const emptyGroup = () => ({
                    name: '',
                    monsters: []
                });
                const uiState = reactive({
                    monsterDraft: emptyMonster(),
                    targetCR: null,
                    abilityDraft: {
                        name: '',
                        description: ''
                    },
                    pcDraft: {
                        name: '',
                        ac: 14,
                        hpMax: 20,
                        hpCurrent: 20,
                        abilities: {
                            str: 10,
                            dex: 10,
                            con: 10,
                            int: 10,
                            wis: 10,
                            cha: 10
                        },
                        actions: []
                    },
                    actionDraft: { name: '', type: 'attack', damages: [], recharge: 0 },
                    groupDraft: {
                        name: '',
                        monsters: [] // 格式: [{ monsterId: number, name: string, count: number }]
                    },
                });

                const formatDamages = (damages) => {
                    if (!damages || damages.length === 0) return '无伤害';
                    return damages.map(d => `${d.dice} ${d.type}`).join(', ');
                };
                
                // 在这里添加新函数
                function formatRolledDamages(rolledDamages) {
                    if (!rolledDamages || rolledDamages.length === 0) return '0';
                    return rolledDamages.map(d => `${d.amount} ${d.type}`).join(' + ');
                }

                const filteredMonsters = computed(() => {
                    return monsters.value.filter(m => !monsterFilters.keyword || m.name.includes(monsterFilters.keyword)).filter(m => !monsterFilters.cr || String(m.cr) === monsterFilters.cr).filter(m => monsterFilters.types.length === 0 || (m.type || []).some(t => monsterFilters.types.includes(t)));
                });

                function toggleTypeFilter(t) {
                    const idx = monsterFilters.types.indexOf(t);
                    if (idx >= 0) monsterFilters.types.splice(idx, 1);
                    else monsterFilters.types.push(t);
                }

                function toggleMonsterDraftType(typeKey) {
                    const types = uiState.monsterDraft.type;
                    const index = types.indexOf(typeKey);
                    if (index > -1) {
                        types.splice(index, 1);
                    } else {
                        types.push(typeKey);
                    }
                }

                function toggleDamageModifier(property, damageType) {
                    const draft = ui.activeEditor === 'pc' ? uiState.pcDraft : uiState.monsterDraft;
                    if (!draft[property] || !draft[property].damage) return;
                    const arr = draft[property].damage; 
                    const idx = arr.indexOf(damageType);
                    if (idx > -1) {
                        arr.splice(idx, 1);
                    } else {
                        arr.push(damageType);
                    }
                }

                function toggleConditionImmunity(condition) {
                    const draft = ui.activeEditor === 'pc' ? uiState.pcDraft : uiState.monsterDraft;
                    if (!draft.immunities || !draft.immunities.conditions) return;
                    const arr = draft.immunities.conditions;
                    const idx = arr.indexOf(condition);
                    if (idx > -1) {
                        arr.splice(idx, 1);
                    } else {
                        arr.push(condition);
                    }
                }
                
                const filteredAbilities = computed(() => {
                    return abilities.value.filter(a => !ui.abilityPool.keyword || a.name.includes(ui.abilityPool.keyword));
                });
                const filteredActions = computed(() => {
                    return actions.value.filter(a => !ui.actionPool.keyword || a.name.includes(ui.actionPool.keyword));
                });

                function openActorViewer(actor) {
                    ui.actorViewer.actor = deepClone(actor);
                    ui.actorViewer.open = true;
                }

                // 加载数据
                async function loadAll() {
                    monsters.value = await db.monsters.toArray();
                    abilities.value = await db.abilities.toArray();
                    pcs.value = await db.pcs.toArray();
                    actions.value = await db.actions.toArray();
                    monsterGroups.value = await db.monsterGroups.toArray();
                }
                async function seedDemo() {
                    await seedIfEmpty();
                    await loadAll();
                    toast('已载入演示数据');
                }
                // 怪物 CRUD
                function openMonsterEditor(m = null) {
                    const draft = deepClone(m || emptyMonster());
                    draft.isCustom = !!draft.isCustom;
                    uiState.monsterDraft = draft;
                    uiState.targetCR = draft.cr;
                    ui.monsterEditor.mode = m ? 'view' : 'edit'; // 新建时默认为编辑，查看时默认为视图
                    ui.activeEditor = 'monster';
                    ui.monsterEditor.open = true;
                }
                async function updateMonster() {
                    const draft = deepClone(uiState.monsterDraft);
                    if (!draft.id) {
                        toast('错误：该怪物没有ID，无法更新。请使用“另存为”');
                        return;
                    }
                    if (draft.name) {
                        await db.monsters.put(draft); // 使用 put() 来更新现有条目
                        await loadAll();
                        ui.monsterEditor.open = false;
                        toast('怪物数据已更新');
                    } else {
                        toast('名称不能为空');
                    }
                }
                async function saveMonsterAsNew() {
                    const draft = deepClone(uiState.monsterDraft);
                    draft.isCustom = true;
                    draft.id = undefined; // Ensure it's a new entry
                    if (draft.name) {
                        await db.monsters.add(draft);
                        await loadAll();
                        ui.monsterEditor.open = false;
                        toast('已保存为自定义怪物');
                    } else {
                        toast('名称不能为空');
                    }
                }
                async function duplicateMonster(m) {
                    const copy = deepClone(m);
                    copy.id = undefined;
                    copy.name = m.name + '（副本）';
                    copy.isCustom = true;
                    await db.monsters.add(copy);
                    await loadAll();
                    toast('已复制');
                }
                async function deleteMonster(id) {
                    if (!confirm('确认删除该怪物？')) return;
                    await db.monsters.delete(id);
                    await loadAll();
                    toast('已删除');
                }
                // 能力池
                function openAbilityPool() {
                    ui.abilityPool.nested = ui.monsterEditor.open || ui.pcEditor.open || ui.actionsViewer.open;
                    ui.abilityPool.open = true;
                }

                function openAbilityEditor(ab = null) {
                    uiState.abilityDraft = ab ? deepClone(ab) : {
                        name: '',
                        description: ''
                    };
                    ui.abilityEditor.open = true;
                }

                function openActionsViewer(draft, type) {
                    ui.actionsViewer.draft = draft;
                    ui.actionsViewer.title = `管理 ${draft.name} 的动作`;
                    ui.actionsViewer.open = true;
                }
                async function saveAbility() {
                    const ab = deepClone(uiState.abilityDraft);
                    if (!ab.name) return toast('请填写名称');
                    if (ab.id) await db.abilities.put(ab);
                    else await db.abilities.add(ab);
                    await loadAll();
                    ui.abilityEditor.open = false;
                    toast('能力已保存');
                }
                async function deleteAbility(id) {
                    if (!confirm('确认删除该能力？')) return;
                    await db.abilities.delete(id);
                    abilities.value = await db.abilities.toArray();
                    toast('已删除');
                }

                function attachAbilityToDraft(ab) {
                    uiState.monsterDraft.actions = uiState.monsterDraft.actions || [];
                    uiState.monsterDraft.actions.push({
                        id: crypto.randomUUID(),
                        name: ab.name,
                        type: 'utility',
                        note: ab.description
                    });
                    toast('已添加到当前怪物动作/能力中');
                    ui.abilityPool.open = false;
                }

                function openActionPool() {
                    ui.actionPool.nested = ui.pcEditor.open || ui.monsterEditor.open || ui.actionsViewer.open;
                    ui.actionPool.open = true;
                }

                function attachActionToDraft(action) {
                    const draft = ui.activeEditor === 'pc' ? uiState.pcDraft : uiState.monsterDraft;
                    if (!draft) return;
                    draft.actions = draft.actions || [];
                    const actionCopy = deepClone(action);
                    delete actionCopy.id;
                    draft.actions.push(actionCopy);
                    toast(`已将动作添加到当前${ui.activeEditor === 'pc' ? 'PC' : '怪物'}`);
                    ui.actionPool.open = false;
                }

                // Action CRUD
                function openActionEditor(action = null) {
                    ui.actionEditor.nested = false;
                    if (action) {
                        const draft = deepClone(action);
                        // Compatibility: Convert old data model to new one
                        if (draft.damageDice && !draft.damages) {
                            draft.damages = [{
                                dice: draft.damageDice,
                                type: draft.damageType,
                                id: crypto.randomUUID()
                            }];
                            delete draft.damageDice;
                            delete draft.damageType;
                        }
                        // Ensure damages array exists and has at least one item with a unique id
                        if (!draft.damages || draft.damages.length === 0) {
                             draft.damages = [{ dice: '', type: '斩击', id: crypto.randomUUID() }];
                        } else {
                             draft.damages.forEach(d => d.id = d.id || crypto.randomUUID());
                        }
                        uiState.actionDraft = draft;
                    } else {
                        // Creating a new action
                        uiState.actionDraft = {
                            name: '新动作',
                            type: 'attack',
                            attackBonus: 4,
                            damages: [{ dice: '1d6+2', type: '斩击', id: crypto.randomUUID() }],
                            recharge: 0,
                            saveAbility: 'dex',
                            saveDC: 13,
                            onSuccess: 'half',
                            onHitStatus: '',
                            onHitStatusRounds: 1,
                            onHitSaveAbility: 'dex',
                            onHitSaveDC: 13,
                        };
                    }
                    ui.actionEditor.saveTarget = 'global';
                    ui.actionEditor.open = true;
                }
                function openActionEditorForDraft(action = null) {
                    ui.actionEditor.nested = true;
                    // 如果传入了action，说明是编辑现有私有动作
                    if (action) {
                        const draft = deepClone(action);
                        // 确保damages数组存在且每个项目都有id
                        if (!draft.damages || draft.damages.length === 0) {
                             draft.damages = [{ dice: '', type: '斩击', id: crypto.randomUUID() }];
                        } else {
                             draft.damages.forEach(d => d.id = d.id || crypto.randomUUID());
                        }
                        uiState.actionDraft = draft;
                    } else {
                        // 否则是新建一个空的私有动作
                        uiState.actionDraft = {
                            id: crypto.randomUUID(), // 私有动作也需要一个唯一ID用于v-for的key和编辑
                            name: '新动作',
                            type: 'attack',
                            attackBonus: 4,
                            damages: [{ dice: '1d6+2', type: '斩击', id: crypto.randomUUID() }],
                            recharge: 0,
                            saveAbility: 'dex',
                            saveDC: 13,
                            onSuccess: 'half',
                        };
                    }
                    ui.actionEditor.saveTarget = 'private'; // **关键步骤**: 设置保存目标为'private'
                    ui.actionEditor.open = true;
                }
                async function saveAction() {
                    const draft = deepClone(uiState.actionDraft);
                    if (!draft.name) return toast('请填写名称');

                    if (ui.actionEditor.saveTarget === 'private') {
                        // 场景：保存私有动作
                        const creatureDraft = ui.actionsViewer.draft; // 获取当前正在编辑的生物
                        if (creatureDraft && creatureDraft.actions) {
                            const actionIndex = creatureDraft.actions.findIndex(a => a.id === draft.id);
                            if (actionIndex > -1) {
                                // 更新现有私有动作
                                creatureDraft.actions[actionIndex] = draft;
                            } else {
                                // 添加新的私有动作
                                creatureDraft.actions.push(draft);
                            }
                            toast('私有动作已保存');
                        }
                    } else {
                        // 场景：保存到公共动作库 (原始逻辑)
                        if (draft.id && typeof draft.id === 'number') { // 检查是否是来自数据库的记录
                             await db.actions.put(draft);
                        } else {
                             delete draft.id; // 从私有动作复制过来的可能带有uuid，要移除
                             await db.actions.add(draft);
                        }
                        await loadAll(); // 重新加载公共库
                        toast('公共动作已保存');
                    }

                    ui.actionEditor.open = false; // 关闭编辑器
                }
                function addDamageToActionDraft() {
                    if (uiState.actionDraft && uiState.actionDraft.damages) {
                        uiState.actionDraft.damages.push({
                            dice: '',
                            type: '斩击',
                            id: crypto.randomUUID()
                        });
                    }
                }
                async function deleteAction(id) {
                    if (!confirm('确认删除该动作？')) return;
                    await db.actions.delete(id);
                    actions.value = await db.actions.toArray();
                    toast('已删除');
                }

                // PC CRUD
                function openPCEditor(pc = null) {
                    if (pc) {
                        const draft = deepClone(pc);
                        draft.isDefault = pc.isDefault || false;
                        if (!draft.actions) draft.actions = [];
                        if (!draft.features) draft.features = '';
                        // Ensure old PCs have the new data structure
                        if (!draft.resistances) draft.resistances = { damage: [], conditions: [] };
                        if (!draft.vulnerabilities) draft.vulnerabilities = { damage: [], conditions: [] };
                        if (!draft.immunities) draft.immunities = { damage: [], conditions: [] };
                        uiState.pcDraft = draft;
                        ui.pcEditor.mode = 'view';
                    } else {
                        uiState.pcDraft = {
                            name: '',
                            avatar: '',
                            ac: 14,
                            hpMax: 20,
                            hpCurrent: 20,
                            abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
                            actions: [],
                            features: '',
                            resistances: { damage: [], conditions: [] },
                            vulnerabilities: { damage: [], conditions: [] },
                            immunities: { damage: [], conditions: [] },
                            isDefault: false,
                        };
                        ui.pcEditor.mode = 'edit';
                    }
                    ui.activeEditor = 'pc';
                    ui.pcEditor.open = true;
                }
async function savePC() {
    const draft = deepClone(uiState.pcDraft);
    if (!draft.name) {
        toast('请填写名称');
        return;
    }
    if (draft.id) {
        await db.pcs.put(draft);
    } else {
        draft.id = undefined;
        await db.pcs.add(draft);
    }
    await loadAll();
    ui.pcEditor.open = false;
    toast('PC已保存');
}
                async function deletePC(id) {
                    if (!confirm('确认删除该PC？')) return;
                    await db.pcs.delete(id);
                    pcs.value = await db.pcs.toArray();
                    toast('已删除');
                }
                // CR 调整
                function autoAdjustCR() {
                    const adjusted = adjustMonsterToCR(unbindProxy(uiState.monsterDraft), uiState.targetCR);
                    // 注意：我们仍在编辑器中展示，可让DM二次确认后保存为自定义怪物
                    uiState.monsterDraft = adjusted;
                    toast('已按占位规则调整（TODO：替换为正式智能规则表）');
                }

                async function resetBattle() {
                    if (!confirm('确定要初始化战斗吗？当前战场将被清空，并自动载入所有默认参战单位。')) {
                        return;
                    }
                    
                    battle.participants = [];
                    battle.round = 1;
                    battle.currentIndex = 0;
                    localStorage.removeItem('dnd-battle-state');
                    ui.log = '战斗已初始化。';

                    const defaultMonsters = monsters.value.filter(m => m.isDefault);
                    const defaultPcs = pcs.value.filter(pc => pc.isDefault);

                    defaultMonsters.forEach(monster => {
                        battle.participants.push(standardizeToParticipant(monster));
                    });

                    defaultPcs.forEach(pc => {
                        battle.participants.push(standardizeToParticipant(pc));
                    });

                    toast(`初始化完成，已自动加入 ${battle.participants.length} 个默认单位。`);
                }

                // 参与战斗
                function standardizeToParticipant(x) {
                    const uid = crypto.randomUUID();
                    const isPc = !!x.hpMax;
                    return {
                        uid,
                        baseId: x.id || null,
                        name: x.name,
                        type: isPc ? 'pc' : 'monster',
                        avatar: x.avatar || (x.type?.includes?.('dragon') ? '🐲' : (isPc ? '🧝' : '👾')),
                        ac: x.ac || 12,
                        hpMax: x.hpMax || x.hp?.average || 10,
                        hpCurrent: x.hpCurrent || x.hp?.average || 10,
                        abilities: x.abilities || { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
                        resistances: deepClone(x.resistances || { damage: [], conditions: [] }),
                        vulnerabilities: deepClone(x.vulnerabilities || { damage: [], conditions: [] }),
                        immunities: deepClone(x.immunities || { damage: [], conditions: [] }),
                        actions: deepClone(x.actions || []).map(a => ({...a, cooldown: 0})),
                        statuses: [],
                        initiative: null,
                        // Add more fields for viewer
                        cr: x.cr,
                        speed: x.speed,
                        monsterType: x.type, // Renamed to avoid conflict with participant type 'pc'/'monster'
                        features: x.features,
                        backgroundImage: x.backgroundImage,
                    };
                }

                function addToBattleFromEditor(entity, type) {
                    const p = standardizeToParticipant(entity);
                    battle.participants.push(p);
                    if (type === 'monster') {
                        ui.monsterEditor.open = false;
                    } else if (type === 'pc') {
                        ui.pcEditor.open = false;
                    }
                    route.value = 'battle';
                    toast(`${p.name} 已加入战斗`);
                }

                // --- 图片裁剪相关 ---
                const cropperCanvas = ref(null);
                const cropperModal = ref(null);
                const avatarCropperCanvas = ref(null);
                const avatarCropperModal = ref(null);
                let cropBox = reactive({ x: 50, y: 50, width: 200, height: 200 });
                let isDragging = false;
                let dragStart = { x: 0, y: 0 };
                let sourceImage = null;

                function onBgImageSelect(e) {
                    const file = e.target.files[0];
                    if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                            ui.imageCropper.imageUrl = event.target.result;
                            ui.imageCropper.open = true;
                            nextTick(initCropper);
                        };
                        reader.readAsDataURL(file);
                    }
                    e.target.value = ''; // 重置input以便再次选择同个文件
                }

                function initCropper() {
                    const canvas = cropperCanvas.value;
                    if (!canvas) return;
                    const ctx = canvas.getContext('2d');
                    const img = new Image();
                    sourceImage = img;
                    img.onload = () => {
                        const modalWidth = cropperModal.value?.clientWidth || 680;
                        const canvasWidth = Math.min(img.width, modalWidth - 24); // 减去padding
                        const scale = canvasWidth / img.width;
                        const canvasHeight = img.height * scale;
                        canvas.width = canvasWidth;
                        canvas.height = canvasHeight;

                        const boxWidth = canvasWidth * 0.8;
                        const boxHeight = boxWidth / ui.imageCropper.aspectRatio;
                        cropBox.x = (canvasWidth - boxWidth) / 2;
                        cropBox.y = (canvasHeight - boxHeight) / 2;
                        cropBox.width = boxWidth;
                        cropBox.height = boxHeight;

                        drawCropper();
                    };
                    img.src = ui.imageCropper.imageUrl;
                }

                function drawCropper() {
                    const canvas = cropperCanvas.value;
                    const ctx = canvas.getContext('2d');
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(sourceImage, 0, 0, canvas.width, canvas.height);
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.clearRect(cropBox.x, cropBox.y, cropBox.width, cropBox.height);
                    ctx.drawImage(sourceImage, 
                        (cropBox.x / canvas.width) * sourceImage.width, (cropBox.y / canvas.height) * sourceImage.height, 
                        (cropBox.width / canvas.width) * sourceImage.width, (cropBox.height / canvas.height) * sourceImage.height,
                        cropBox.x, cropBox.y, cropBox.width, cropBox.height
                    );
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(cropBox.x, cropBox.y, cropBox.width, cropBox.height);
                }

                function startDrag(e) {
                    const canvas = e.target;
                    const rect = canvas.getBoundingClientRect();
                    const mouseX = e.clientX - rect.left;
                    const mouseY = e.clientY - rect.top;
                    if (mouseX > cropBox.x && mouseX < cropBox.x + cropBox.width &&
                        mouseY > cropBox.y && mouseY < cropBox.y + cropBox.height) {
                        isDragging = true;
                        dragStart.x = mouseX - cropBox.x;
                        dragStart.y = mouseY - cropBox.y;
                    }
                }
                function drag(e) {
                    if (isDragging) {
                        const canvas = e.target;
                        const rect = canvas.getBoundingClientRect();
                        const mouseX = e.clientX - rect.left;
                        const mouseY = e.clientY - rect.top;
                        cropBox.x = clamp(mouseX - dragStart.x, 0, canvas.width - cropBox.width);
                        cropBox.y = clamp(mouseY - dragStart.y, 0, canvas.height - cropBox.height);
                        if (ui.avatarCropper.open) {
                            drawAvatarCropper();
                        } else {
                            drawCropper();
                        }
                    }
                }
                function endDrag() {
                    isDragging = false;
                }

                function confirmCrop() {
                    const tempCanvas = document.createElement('canvas');
                    const tempCtx = tempCanvas.getContext('2d');
                    const scaleX = sourceImage.width / cropperCanvas.value.width;
                    const scaleY = sourceImage.height / cropperCanvas.value.height;

                    const sourceX = cropBox.x * scaleX;
                    const sourceY = cropBox.y * scaleY;
                    const sourceWidth = cropBox.width * scaleX;
                    const sourceHeight = cropBox.height * scaleY;

                    tempCanvas.width = sourceWidth;
                    tempCanvas.height = sourceHeight;
                    tempCtx.drawImage(sourceImage, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, sourceWidth, sourceHeight);
                    
                    uiState.monsterDraft.backgroundImage = tempCanvas.toDataURL('image/jpeg', 0.9);
                    ui.imageCropper.open = false;
                }

                // --- 头像裁剪相关 ---
                function onAvatarImageSelect(e) {
                    const file = e.target.files[0];
                    if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                            ui.avatarCropper.imageUrl = event.target.result;
                            ui.avatarCropper.open = true;
                            nextTick(initAvatarCropper);
                        };
                        reader.readAsDataURL(file);
                    }
                    e.target.value = '';
                }

                function initAvatarCropper() {
                    const canvas = avatarCropperCanvas.value;
                    if (!canvas) return;
                    const ctx = canvas.getContext('2d');
                    const img = new Image();
                    sourceImage = img;
                    img.onload = () => {
                        const modalWidth = avatarCropperModal.value?.clientWidth || 680;
                        const canvasWidth = Math.min(img.width, modalWidth - 24);
                        const scale = canvasWidth / img.width;
                        const canvasHeight = img.height * scale;
                        canvas.width = canvasWidth;
                        canvas.height = canvasHeight;

                        const boxSize = Math.min(canvasWidth, canvasHeight) * 0.8;
                        cropBox.x = (canvasWidth - boxSize) / 2;
                        cropBox.y = (canvasHeight - boxSize) / 2;
                        cropBox.width = boxSize;
                        cropBox.height = boxSize;

                        drawAvatarCropper();
                    };
                    img.src = ui.avatarCropper.imageUrl;
                }

                function drawAvatarCropper() {
                    const canvas = avatarCropperCanvas.value;
                    const ctx = canvas.getContext('2d');
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(sourceImage, 0, 0, canvas.width, canvas.height);
                    
                    // Draw semi-transparent overlay
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);

                    // Carve out the circular clipping region
                    ctx.save();
                    ctx.beginPath();
                    ctx.arc(cropBox.x + cropBox.width / 2, cropBox.y + cropBox.height / 2, cropBox.width / 2, 0, Math.PI * 2, true);
                    ctx.clip();
                    
                    // Draw the underlying image inside the circle
                    ctx.drawImage(sourceImage, 0, 0, canvas.width, canvas.height);
                    ctx.restore();

                    // Draw the circular border
                    ctx.beginPath();
                    ctx.arc(cropBox.x + cropBox.width / 2, cropBox.y + cropBox.height / 2, cropBox.width / 2, 0, Math.PI * 2, true);
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                }

                function confirmAvatarCrop() {
                    const tempCanvas = document.createElement('canvas');
                    const tempCtx = tempCanvas.getContext('2d');
                    const scaleX = sourceImage.width / avatarCropperCanvas.value.width;
                    const scaleY = sourceImage.height / avatarCropperCanvas.value.height;

                    const sourceX = cropBox.x * scaleX;
                    const sourceY = cropBox.y * scaleY;
                    const sourceWidth = cropBox.width * scaleX;
                    const sourceHeight = cropBox.height * scaleY;

                    tempCanvas.width = sourceWidth;
                    tempCanvas.height = sourceHeight;

                    // Create a circular clipping path
                    tempCtx.beginPath();
                    tempCtx.arc(sourceWidth / 2, sourceHeight / 2, sourceWidth / 2, 0, Math.PI * 2, true);
                    tempCtx.clip();

                    // Draw the image
                    tempCtx.drawImage(sourceImage, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, sourceWidth, sourceHeight);
                    
                    const dataUrl = tempCanvas.toDataURL('image/png');

                    if (ui.activeEditor === 'monster') {
                        uiState.monsterDraft.avatar = dataUrl;
                    } else if (ui.activeEditor === 'pc') {
                        uiState.pcDraft.avatar = dataUrl;
                    }

                    ui.avatarCropper.open = false;
                }
                // --- 结束图片裁剪 ---

                function addToBattleFromMonster(m) {
                    battle.participants.push(standardizeToParticipant(m));
                    route.value = 'battle';
                    toast('已加入战斗');
                }

                function addToBattleFromPC(pc) {
                    battle.participants.push(standardizeToParticipant(pc));
                    route.value = 'battle';
                    toast('已加入战斗');
                }
                // 添加参战单位 modal
                function promptAddParticipants() {
                    ui.addParticipants.open = true;
                }

                function addParticipantsFromMonster(m, count = 1) {
                    for (let i = 0; i < count; i++) {
                        const p = standardizeToParticipant(m);
                        if (count > 1) p.name = `${m.name} #${i+1}`;
                        battle.participants.push(p);
                    }
                    toast('怪物已加入');
                }

                function addParticipantsFromPC(pc) {
                    battle.participants.push(standardizeToParticipant(pc));
                    toast('PC已加入');
                }
                // 先攻与回合
function rollInitiative() {
    for (const p of battle.participants) {
        const dexModifier = abilityMod(p.abilities.dex || 10);
        const d20Roll = Math.floor(Math.random() * 20) + 1;
        p.initiativeRoll = d20Roll; // Store the raw d20 roll
        p.initiativeModifier = dexModifier; // Store the modifier
        p.initiative = d20Roll + dexModifier; // Keep the total for sorting
    }

    battle.participants.sort((a, b) => {
        const aNatural20 = a.initiativeRoll === 20;
        const bNatural20 = b.initiativeRoll === 20;

        if (aNatural20 && !bNatural20) {
            return -1; // a goes first
        } else if (!aNatural20 && bNatural20) {
            return 1; // b goes first
        } else if (aNatural20 && bNatural20) {
            // Both rolled 20, sort by modifier
            return (b.initiativeModifier || 0) - (a.initiativeModifier || 0);
        } else {
            // Neither rolled 20, sort by total initiative
            return (b.initiative || 0) - (a.initiative || 0);
        }
    });

    battle.currentIndex = 0;
    battle.round = 1;
    toast('已掷先攻并排序');
}

                function setCurrentActor(uid) {
                    const idx = battle.participants.findIndex(p => p.uid === uid);
                    if (idx >= 0) battle.currentIndex = idx;
                }

                function nextTurn() {
                        if (!battle.participants.length) return;

                        const activeParticipant = currentActor.value;
                        let participantWasRemoved = false;

                        // 检查当前行动者是否是已阵亡的怪物
                        if (activeParticipant && activeParticipant.hpCurrent <= 0 && activeParticipant.type === 'monster') {
                            const deadMonsterName = activeParticipant.name;
                            // 直接使用 removeParticipant 函数，它会处理索引
                            removeParticipant(activeParticipant.uid);
                            toast(`怪物【${deadMonsterName}】已在回合结束后移除。`);
                            participantWasRemoved = true;
                            // 注意：此时 currentIndex 不需要改变，因为下一个单位已经移动到了当前索引
                        }

                        // 如果没有移除单位，正常推进回合
                        if (!participantWasRemoved) {
                            battle.currentIndex++;
                        }

                        // 检查是否需要轮转到回合开始
                        if (battle.currentIndex >= battle.participants.length) {
                            battle.currentIndex = 0; // 轮转
                            battle.round++;
                        }

                        // 为新回合的行动者处理状态和冷却
                        if (currentActor.value) {
                            decrementParticipantStatuses(currentActor.value);
                            decrementActionCooldowns(currentActor.value);
                        }
                    }
                function prevTurn() {
                    if (!battle.participants.length) return;
                    battle.currentIndex--;
                    if (battle.currentIndex < 0) {
                        battle.currentIndex = battle.participants.length - 1;
                        battle.round = Math.max(1, battle.round - 1);
                    }
                    // 回合开始：处理当前行动者的状态 -1 (如果回退到上一个回合，状态不应该减少，所以这里不调用)
                    // 如果需要回退状态，则需要更复杂的逻辑，目前只处理前进
                }

                function decrementParticipantStatuses(participant) {
                    const remain = [];
                    for (const s of participant.statuses) {
                        const ns = { ...s,
                            rounds: s.rounds - 1
                        };
                        if (ns.rounds > 0) remain.push(ns);
                    }
                    participant.statuses = remain;
                }

                function decrementActionCooldowns(participant) {
                    if (!participant.actions) return;
                    participant.actions.forEach(a => {
                        if (a.cooldown > 0) {
                            a.cooldown--;
                        }
                    });
                }

                function removeParticipant(uid) {
                    const i = battle.participants.findIndex(p => p.uid === uid);
                    if (i >= 0) {
                        battle.participants.splice(i, 1);
                        if (battle.currentIndex >= battle.participants.length) battle.currentIndex = 0;
                    }
                }
                // 先攻条拖拽
                function onDragStart(idx) {
                    battle.dragIndex = idx;
                }

                function onDrop(idx) {
                    const from = battle.dragIndex;
                    if (from == null) return;
                    const item = battle.participants.splice(from, 1)[0];
                    battle.participants.splice(idx, 0, item);
                    battle.dragIndex = null;
                }
                // HP 修改器
                function applyHPDelta(p, delta) {
                    delta = Number(delta) || 0;
                    if (delta === 0) return;
                    p.hpCurrent = clamp(p.hpCurrent + delta, 0, p.hpMax);
                    // Mark monster as defeated if HP drops to 0 or below
                    if (p.hpCurrent <= 0 && p.type === 'monster') {
                        p.isDefeated = true;
                        toast(`怪物【${p.name}】血量归零，将在回合结束后移除。`);
                    }
                }

                function closeQuickDamageEditor() {
                    ui.quickDamage.open = false;
                }

                async function openQuickDamageEditor(participant) {
                    ui.quickDamage.targetUid = participant.uid;
                    ui.quickDamage.targetName = participant.name;
                    ui.quickDamage.damageAmount = null;
                    ui.quickDamage.open = true;
                    await nextTick();
                    quickDamageInput.value?.focus();
                }

                function applyQuickDamage() {
                    const { damageAmount, targetUid } = ui.quickDamage;
                    if (typeof damageAmount !== 'number' || damageAmount <= 0) {
                        closeQuickDamageEditor();
                        return;
                    }
                    const target = battle.participants.find(p => p.uid === targetUid);
                    if (target) {
                        applyHPDelta(target, -Math.abs(damageAmount));
                    }
                    closeQuickDamageEditor();
                }
                
                // 状态
                const statusCatalog = ref([{
                    name: '倒地 Prone',
                    icon: '🛌'
                }, {
                    name: '束缚 Restrained',
                    icon: '⛓️'
                }, {
                    name: '致盲 Blinded',
                    icon: '🕶️'
                }, {
                    name: '中毒 Poisoned',
                    icon: '☠️'
                }, {
                    name: '魅惑 Charmed',
                    icon: '💞'
                }, {
                    name: '恐慌 Frightened',
                    icon: '😱'
                }, ]);

                function openHPEditor(participant) {
                    ui.hpEditor.open = true;
                    ui.hpEditor.targetUid = participant.uid;
                    ui.hpEditor.delta = null;
                }

                function openStatusPicker(target) {
                    ui.statusPicker.open = true;
                    ui.statusPicker.targetUid = target.uid;
                    // Initialize selectedName and icon when opening the picker
                    if (statusCatalog.value.length > 0) {
                        ui.statusPicker.selectedName = statusCatalog.value[0].name;
                        ui.statusPicker.icon = statusCatalog.value[0].icon;
                    }
                }

                // Watch for changes in selectedName to update the icon
                watch(() => ui.statusPicker.selectedName, (newName) => {
                    const selectedStatus = statusCatalog.value.find(s => s.name === newName);
                    if (selectedStatus) {
                        ui.statusPicker.icon = selectedStatus.icon;
                    }
                });

                function applyStatus() {
                    const t = battle.participants.find(p => p.uid === ui.statusPicker.targetUid);
                    if (!t) return;
                    t.statuses.push({
                        id: crypto.randomUUID(),
                        name: ui.statusPicker.selectedName,
                        icon: ui.statusPicker.icon || '⏳',
                        rounds: ui.statusPicker.rounds || 1,
                    });
                    ui.statusPicker.open = false; // Auto-close
                }

                function removeStatus(target, statusId) {
                    target.statuses = target.statuses.filter(s => s.id !== statusId);
                }
                // 目标选择
                const groupedParticipants = computed(() => {
                    const groups = {
                        pcs: { groupName: '玩家角色 (PCs)', members: [] },
                        monsters: { groupName: '怪物 (Monsters)', members: [] }
                    };
                    for (const p of battle.participants) {
                        if (p.type === 'pc') {
                            groups.pcs.members.push(p);
                        } else if (p.type === 'monster') {
                            groups.monsters.members.push(p);
                        }
                    }
                    return Object.values(groups).filter(g => g.members.length > 0);
                });

                function toggleTarget(uid) {
                    const i = ui.selectedTargets.indexOf(uid);
                    if (i >= 0) ui.selectedTargets.splice(i, 1);
                    else ui.selectedTargets.push(uid);
                }

                function toggleSelectGroup(g) {
                    const ids = g.members.map(m => m.uid);
                    const allIn = ids.every(id => ui.selectedTargets.includes(id));
                    if (allIn) {
                        ui.selectedTargets = ui.selectedTargets.filter(id => !ids.includes(id));
                    } else { // 合并去重
                        const set = new Set(ui.selectedTargets.concat(ids));
                        ui.selectedTargets = Array.from(set);
                    }
                }

                function selectNone() {
                    ui.selectedTargets = [];
                }
                const promptSaveCheck = (target, action, onSaveFail) => {
                  ui.saveCheck.targetName = target.name;
                  ui.saveCheck.dc = action.onHitSaveDC;
                  ui.saveCheck.ability = action.onHitSaveAbility;
                  ui.saveCheck.callback = (saveSucceeded) => {
                    if (!saveSucceeded) {
                      onSaveFail(); // 只有当豁免失败时，才执行传入的回调
                    }
                    ui.log += `${target.name} 的 ${action.onHitSaveAbility.toUpperCase()} 豁免检定 (DC ${action.onHitSaveDC}) ${saveSucceeded ? '成功' : '失败'}.\n`;
                    // 在所有逻辑执行完毕后，再关闭模态框
                    ui.saveCheck.open = false;
                  };
                  ui.saveCheck.open = true;
                };
                // 动作与自动化攻击流程
                function selectAction(a) {
                    ui.selectedAction = deepClone(a);
                    ui.log = '已选择动作：' + a.name + '\n';
                }

                function calculateModifiedDamage(target, damageAmount, damageType) {
                    if (target.immunities?.damage?.includes(damageType)) {
                        return 0;
                    }
                    if (target.vulnerabilities?.damage?.includes(damageType)) {
                        return damageAmount * 2;
                    }
                    if (target.resistances?.damage?.includes(damageType)) {
                        return Math.floor(damageAmount / 2);
                    }
                    return damageAmount;
                }

                function runAction() {
                    if (ui.actionOnCooldown) return;
                    ui.actionOnCooldown = true;
                    setTimeout(() => { ui.actionOnCooldown = false; }, 5000);

                    const actor = currentActor.value;
                    const action = ui.selectedAction;
                    // Compatibility for old damage format
                    if (action.type === 'attack' && !action.damages && action.damageDice) {
                        action.damages = [{ dice: action.damageDice, type: action.damageType || 'generic' }];
                    } else if (action.type === 'save' && !action.damages && action.damageDice) {
                        action.damages = [{ dice: action.damageDice, type: action.damageType || 'generic' }];
                    }
                    if (!actor || !action) return;
                    const targets = battle.participants.filter(p => ui.selectedTargets.includes(p.uid));
                    if (!targets.length) {
                        toast('请先在右侧选择目标');
                        return;
                    }
                    let log = `【${actor.name}】使用「${action.name}」对 ${targets.length} 个目标：\n`;
                    if (action.type === 'attack') {
                        for (const t of targets) {
                            const d20 = rollD20(ui.rollMode);
                            const toHit = d20.value + (action.attackBonus || 0);
                            const hit = (d20.value === 20) || (toHit >= t.ac);
                            log += `- 目标【${t.name}】 -> d20(${d20.raw.join(',')}) + ${action.attackBonus||0} = ${toHit} vs AC ${t.ac} => ${d20.isCrit ?'重击':(hit?'命中':'未命中')}\n`;

                            if (d20.isCrit || d20.isFumble) {
                                ui.notificationQueue.push({
                                    type: 'crit',
                                    data: {
                                        type: d20.isCrit ? 'success' : 'failure',
                                        attacker: actor.name,
                                        target: t.name,
                                    }
                                });
                            }
                            
                            if (hit && !d20.isFumble) { // Hit logic
                                let totalFinalDamage = 0;
                                let damageLogParts = [];

                                // For normal hit notification, we process one damage instance at a time
                                // Let's assume for now the notification shows the first damage instance details
                                let notificationShown = false;

                                for (const damage of action.damages) {
                                    if (!damage.dice) continue;
                                    
                                    const dmgDetails = rollDamageWithDetails(damage.dice, d20.isCrit, damage.type);
                                    const rawDmgAmount = dmgDetails.total;
                                    const finalDmgAmount = calculateModifiedDamage(t, rawDmgAmount, damage.type);
                                    totalFinalDamage += finalDmgAmount;
                                    
                                    let partLog = `${rawDmgAmount} ${damage.type}`;
                                    if (finalDmgAmount !== rawDmgAmount) {
                                        partLog += ` (变为 ${finalDmgAmount})`;
                                    }
                                    damageLogParts.push(partLog);

                                    // Show normal hit notification for non-crits
                                    if (hit && !d20.isCrit && !notificationShown) {
                                        let damageModifierInfo = '';
                                        if (finalDmgAmount < rawDmgAmount) damageModifierInfo = '（抗性）';
                                        if (finalDmgAmount > rawDmgAmount) damageModifierInfo = '（易伤）';
                                        if (finalDmgAmount === 0 && rawDmgAmount > 0) damageModifierInfo = '（免疫）';

                                        ui.notificationQueue.push({
                                            type: 'hit',
                                            data: {
                                                attacker: actor.name,
                                                target: t.name,
                                                toHitRoll: `d20(${d20.raw.join(',')}) + ${action.attackBonus || 0}`,
                                                toHitResult: toHit,
                                                targetAC: t.ac,
                                                damageExpression: `${damage.dice} ${damage.type}`,
                                                damageRolls: `(${dmgDetails.rolls.join(' + ')}) + ${dmgDetails.flat}`,
                                                rawDamage: rawDmgAmount,
                                                finalDamage: finalDmgAmount,
                                                damageType: damage.type,
                                                damageModifierInfo: damageModifierInfo,
                                            }
                                        });
                                        notificationShown = true;
                                    }
                                }

                                log += ` 伤害: ${damageLogParts.join(' + ')} = 总计 ${totalFinalDamage} 伤害\n`;

                                if (ui.autoApplyDamage) {
                                    t.hpCurrent = clamp(t.hpCurrent - totalFinalDamage, 0, t.hpMax);
                                    log += ` 已自动扣血：-${totalFinalDamage}，剩余HP ${t.hpCurrent}\n`;
                                } else {
                                    log += ` （未自动扣血）\n`;
                                }

                                // Apply on-hit status
                                if (action.onHitStatus) {
                                    const applyStatus = () => {
                                        const existingStatus = t.statuses.find(s => s.name === action.onHitStatus);
                                        if (!existingStatus) {
                                            const statusInfo = statusCatalog.value.find(sc => sc.name === action.onHitStatus) || {};
                                            t.statuses.push({
                                                id: crypto.randomUUID(),
                                                name: action.onHitStatus,
                                                rounds: action.onHitStatusRounds || 1,
                                                icon: statusInfo.icon || '⏳'
                                            });
                                            log += `  -> ${t.name} 获得了状态: ${action.onHitStatus}.\n`;
                                        }
                                    };

                                    if (action.onHitSaveAbility && action.onHitSaveDC) {
                                        promptSaveCheck(t, action, applyStatus);
                                    } else {
                                        applyStatus();
                                    }
                                }
                            }
                            else if (!hit && !d20.isFumble) { // Miss logic (but not a fumble)
                                ui.notificationQueue.push({
                                    type: 'miss',
                                    data: {
                                        attacker: actor.name,
                                        target: t.name,
                                        toHitRoll: `d20(${d20.raw.join(',')}) + ${action.attackBonus || 0}`,
                                        toHitResult: toHit,
                                        targetAC: t.ac,
                                    }
                                });
                            }
                        }
                        ui.log = log;
                    } else if (action.type === 'save') {
                        log += `发动范围效果: ${action.name} (DC ${action.saveDC} ${action.saveAbility?.toUpperCase()})\n`;
                        
                        // 1. 掷一次总伤害
                        const rolledDamages = [];
                        for (const damage of action.damages) {
                            if (!damage.dice) continue;
                            const dmgResult = rollDamage(damage.dice, false, damage.type);
                            rolledDamages.push(...dmgResult);
                        }
                        log += `总潜在伤害: ${formatRolledDamages(rolledDamages)}\n`;

                        // 2. 准备并打开模态框
                        ui.saveOutcomePicker.title = `处理 "${action.name}" 的豁免结果`;
                        ui.saveOutcomePicker.action = deepClone(action);
                        ui.saveOutcomePicker.targets = deepClone(targets);
                        ui.saveOutcomePicker.damages = rolledDamages;
                        
                        // 3. 初始化所有目标的豁免结果 (使用智能默认值)
                        ui.saveOutcomePicker.outcomes = {};
                        for (const t of targets) {
                            // 如果动作成功是半伤，则默认半伤；否则默认失败。
                            ui.saveOutcomePicker.outcomes[t.uid] = action.onSuccess === 'half' ? 'half' : 'fail'; 
                        }

                        ui.log = log + '请在弹出的窗口中为每个目标选择豁免结果。';
                        ui.saveOutcomePicker.open = true;
                    } else {
                        ui.log = '该动作不支持自动结算（utility）。';
                    }

                    // Cooldown
                    if (action.recharge > 0) {
                        const actorAction = actor.actions.find(a => a.name === action.name); // Find by name, might need better ID later
                        if (actorAction) {
                            actorAction.cooldown = action.recharge;
                            log += `\n「${action.name}」进入冷却，${action.recharge}回合后可用。`;
                            ui.log = log;
                        }
                    }
                    processNotificationQueue();
                }

                function applySaveOutcomes() {
                    const { targets, damages, outcomes, action } = ui.saveOutcomePicker;
                    let log = `处理 "${action.name}" 的豁免结果：\n`;

                    if (!targets.length) {
                        ui.saveOutcomePicker.open = false;
                        return;
                    }

                    // 预先计算好每种伤害类型的总伤害
                    const totalDamageByType = damages.reduce((acc, dmg) => {
                        acc[dmg.type] = (acc[dmg.type] || 0) + dmg.amount;
                        return acc;
                    }, {});

                    for (const tempTarget of targets) {
                        const target = battle.participants.find(p => p.uid === tempTarget.uid);
                        if (!target) continue;

                        const outcome = outcomes[target.uid];
                        let totalModifiedDamage = 0;
                        let damageLogParts = [];

                        // 针对每种伤害类型，计算修正后的伤害
                        for (const type in totalDamageByType) {
                            const rawAmount = totalDamageByType[type];
                            const modifiedAmount = calculateModifiedDamage(target, rawAmount, type);
                            if (modifiedAmount > 0) {
                                damageLogParts.push(`${modifiedAmount} ${type}`);
                            }
                            totalModifiedDamage += modifiedAmount;
                        }
                        
                        let finalDamageToApply = 0;
                        let outcomeText = '';
                        switch (outcome) {
                            case 'fail':
                                finalDamageToApply = totalModifiedDamage;
                                outcomeText = '豁免失败';
                                break;
                            case 'half':
                                finalDamageToApply = Math.ceil(totalModifiedDamage / 2); // 向上取整
                                outcomeText = '伤害减半';
                                break;
                            case 'zero':
                                finalDamageToApply = 0;
                                outcomeText = '伤害全免';
                                break;
                        }

                        log += `- 目标【${target.name}】 -> ${outcomeText}，受到 ${finalDamageToApply} 点伤害 (${damageLogParts.join(' + ') || '无'}).\n`;
                        
                        if (ui.autoApplyDamage && finalDamageToApply > 0) {
                            applyHPDelta(target, -finalDamageToApply);
                            log += `  已自动扣血, 剩余 HP ${target.hpCurrent}.\n`;
                        }
                    }

                    ui.log = log;
                    ui.saveOutcomePicker.open = false; // 关闭模态框
                }

                // 导出导入
                async function exportAll() {
                    const data = {
                        meta: {
                            app: 'dnd-assist-v2',
                            exportedAt: new Date().toISOString(),
                            version: 1
                        },
                        monsters: await db.monsters.toArray(),
                        abilities: await db.abilities.toArray(),
                        pcs: await db.pcs.toArray(),
                        actions: await db.actions.toArray(),
                        monsterGroups: await db.monsterGroups.toArray(), // 新增此行
                    };
                    const blob = new Blob([JSON.stringify(data, null, 2)], {
                        type: 'application/json'
                    });
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = `dnd-local-v2-export-${Date.now()}.json`;
                    a.click();
                    URL.revokeObjectURL(a.href);
                }
                async function importAll(e) {
                    const file = e.target.files[0];
                    if (!file) return;
                    const text = await file.text();
                    try {
                        const data = JSON.parse(text);
                        if (!data.monsters || !data.abilities || !data.pcs || !data.actions || !data.monsterGroups) throw new Error('格式不完整');
                        if (!confirm('导入将清空并替换当前的怪物库、PC库、能力库、动作库和怪物组合。确定要继续吗？')) return;
                        await db.transaction('rw', db.monsters, db.abilities, db.pcs, db.actions, db.monsterGroups, async () => {
                            await db.monsters.clear();
                            await db.abilities.clear();
                            await db.pcs.clear();
                            await db.actions.clear();
                            await db.monsterGroups.clear(); // 新增
                            await db.monsters.bulkAdd(data.monsters);
                            await db.abilities.bulkAdd(data.abilities);
                            await db.pcs.bulkAdd(data.pcs);
                            if (data.actions) { await db.actions.bulkAdd(data.actions); }
                            if (data.monsterGroups) { await db.monsterGroups.bulkAdd(data.monsterGroups); } // 新增
                        });
                        await loadAll();
                        toast('导入成功');
                    } catch (err) {
                        alert('导入失败：' + err.message);
                    } finally {
                        e.target.value = '';
                    }
                }
                // Toast 提示系统
                function toast(msg) {
                    const id = crypto.randomUUID();
                    ui.toasts.push({ id, message: msg });

                    // 设置一个计时器，3秒后自动移除该 toast
                    setTimeout(() => {
                        removeToast(id);
                    }, 3000);
                }

                function removeToast(id) {
                    const index = ui.toasts.findIndex(t => t.id === id);
                    if (index > -1) {
                        ui.toasts.splice(index, 1);
                    }
                }
                // 杂项
                function mod(v) {
                    return abilityMod(Number(v) || 10);
                }

                function toggleTheme() { // 预留：当前为暗色，TODO：切换到浅色主题（替换CSS变量）
                    alert('TODO：浅色主题切换');
                }

                function unbindProxy(v) {
                    return JSON.parse(JSON.stringify(v));
                }
                // 当前行动者 HP 输入清零同步
                watch(() => battle.currentIndex, () => {
                    hpDelta.value = 5;
                });

                watch(() => battle.participants, () => {
                    // Rerender后ref会重新执行，但以防万一，这里清理一下map里不存在的uid
                    const existingUids = new Set(battle.participants.map(p => p.uid));
                    for (const uid of participantTiles.value.keys()) {
                        if (!existingUids.has(uid)) {
                            participantTiles.value.delete(uid);
                        }
                    }
                }, { deep: true });

                const filteredMonstersForGroup = computed(() => {
                    const keyword = ui.monsterGroupEditor.keyword.toLowerCase();
                    if (!keyword) return monsters.value;
                    return monsters.value.filter(m => m.name.toLowerCase().includes(keyword));
                });
                
                // --- 怪物组合管理相关函数 ---
                function openGroupManager() {
                    ui.monsterGroupManager.open = true;
                }

                function openGroupEditor(group = null) {
                    if (group) {
                        uiState.groupDraft = deepClone(group);
                    } else {
                        uiState.groupDraft = emptyGroup();
                    }
                    ui.monsterGroupEditor.keyword = ''; // 重置搜索词
                    ui.monsterGroupEditor.open = true;
                }

                function addMonsterToGroupDraft(monster) {
                    const existing = uiState.groupDraft.monsters.find(m => m.monsterId === monster.id);
                    if (existing) {
                        existing.count++;
                    } else {
                        uiState.groupDraft.monsters.push({
                            monsterId: monster.id,
                            name: monster.name,
                            count: 1
                        });
                    }
                }

                async function saveGroup() {
                    const draft = deepClone(uiState.groupDraft);
                    if (!draft.name || draft.monsters.length === 0) {
                        toast('请填写组名并添加至少一个怪物');
                        return;
                    }
                    // 清理数量小于1的怪物
                    draft.monsters = draft.monsters.filter(m => m.count >= 1);

                    if (draft.id) {
                        await db.monsterGroups.put(draft);
                    } else {
                        await db.monsterGroups.add(draft);
                    }
                    await loadAll(); // 重新加载所有数据，包括monsterGroups
                    ui.monsterGroupEditor.open = false;
                    toast('怪物组合已保存');
                }

                async function deleteGroup(id) {
                    if (!confirm('确定要永久删除这个怪物组合吗？此操作不可撤销。')) return;
                    await db.monsterGroups.delete(id);
                    await loadAll();
                    toast('组合已删除');
                }

                function addParticipantsFromGroup(group) {
                    let addedCount = 0;
                    for (const groupMonster of group.monsters) {
                        const monsterTemplate = monsters.value.find(m => m.id === groupMonster.monsterId);
                        if (monsterTemplate) {
                            for (let i = 0; i < groupMonster.count; i++) {
                                const p = standardizeToParticipant(monsterTemplate);
                                // 如果一个组里同名怪多于1个，则自动编号
                                if (groupMonster.count > 1) {
                                    p.name = `${monsterTemplate.name} #${i + 1}`;
                                }
                                battle.participants.push(p);
                                addedCount++;
                            }
                        }
                    }
                    toast(`已从组合 [${group.name}] 添加 ${addedCount} 个怪物`);
                }

                // 首次载入
                (async () => {
                    try {
                        const savedState = localStorage.getItem('dnd-battle-state');
                        if (savedState) {
                            const parsedState = JSON.parse(savedState);
                            Object.assign(battle, parsedState);
                        }
                    } catch (e) {
                        console.error('Failed to load battle state from localStorage:', e);
                        localStorage.removeItem('dnd-battle-state');
                    }
                    await seedIfEmpty();
                    await loadAll();
                })();

                function dismissCurrentNotification() {
                    // 关闭所有可能的通知窗口
                    ui.critNotification.open = false;
                    ui.normalHitNotification.open = false;
                    ui.missNotification.open = false;
                    // 延迟一小段时间再处理下一个，以确保UI更新
                    nextTick(() => {
                        processNotificationQueue();
                    });
                }

                function processNotificationQueue() {
                    // 如果当前有通知正在显示，或者队列为空，则不执行任何操作
                    if (ui.critNotification.open || ui.normalHitNotification.open || ui.missNotification.open || ui.notificationQueue.length === 0) {
                        return;
                    }

                    const notification = ui.notificationQueue.shift(); // 从队列中取出第一个通知

                    if (notification.type === 'crit') {
                        Object.assign(ui.critNotification, notification.data);
                        ui.critNotification.open = true;
                    } else if (notification.type === 'hit') {
                        Object.assign(ui.normalHitNotification, notification.data);
                        ui.normalHitNotification.open = true;
                    } else if (notification.type === 'miss') {
                        Object.assign(ui.missNotification, notification.data);
                        ui.missNotification.open = true;
                    }
                }

                return {
                    monsterGroups,
                    openGroupManager,
                    openGroupEditor,
                    deleteGroup,
                    addMonsterToGroupDraft,
                    saveGroup,
                    addParticipantsFromGroup,
                    filteredMonstersForGroup,
                    openActorViewer,
                    route,
                    monsters,
                    abilities,
                    pcs,
                    actions,
                    monsterFilters,
                    monsterTypes,
                    damageTypes,
                    translateType,
                    crOptions,
                    filteredMonsters,
                    toggleTypeFilter,
                    ui,
                    uiState,
                    formatDamages,
                    formatRolledDamages,
                    toggleMonsterDraftType,
                    conditionTypes,
                    toggleDamageModifier,
                    toggleConditionImmunity,
                    openMonsterEditor,
                    updateMonster,
                    saveMonsterAsNew,
                    duplicateMonster,
                    deleteMonster,
                    openAbilityPool,
                    openAbilityEditor,
                    saveAbility,
                    openActionsViewer,
                    deleteAbility,
                    filteredAbilities,
                    attachAbilityToDraft,
                    filteredActions,
                    openActionPool,
                    attachActionToDraft,
                    openPCEditor,
                    savePC,
                    deletePC,
                    openActionEditor,
                    openActionEditorForDraft,
                    saveAction,
                    addDamageToActionDraft,
                    deleteAction,
                    seedDemo,
                    battle,
                    currentActor,
                    hpDelta,
                    promptAddParticipants,
                    addParticipantsFromMonster,
                    addParticipantsFromPC,
                    addToBattleFromEditor,
                    addToBattleFromMonster,
                    addToBattleFromPC,
                    rollInitiative,
                    nextTurn,
                    prevTurn,
                    setCurrentActor,
                    onDragStart,
                    onDrop,
                    removeParticipant,
                    applyHPDelta,
                    statusCatalog,
                    openHPEditor,
                    openStatusPicker,
                    applyStatus,
                    removeStatus,
                    groupedParticipants,
                    toggleTarget,
                    toggleSelectGroup,
                    selectNone,
                    selectAction,
                    runAction,
                    applySaveOutcomes,
                    exportAll,
                    importAll,
                    mod,
                    toggleTheme,
                    autoAdjustCR,
                    cropperCanvas,
                    cropperModal,
                    onBgImageSelect,
                    confirmCrop,
                    avatarCropperCanvas,
                    avatarCropperModal,
                    onAvatarImageSelect,
                    confirmAvatarCrop,
                    startDrag,
                    drag,
                    endDrag,
                    resetBattle,
                    quickDamageInput,
                    openQuickDamageEditor,
                    applyQuickDamage,
                    closeQuickDamageEditor,
                    participantTiles, // Expose for the ref function
                    dismissCurrentNotification,
                    removeToast,
                };
            }
        }).mount('#app');
