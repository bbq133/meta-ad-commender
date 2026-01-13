// Google Sheet 配置服务
// 从 Google Sheet 读取系统配置数据

// Google Sheet ID
const SHEET_ID = '1FJfjyY84ujCnQ_3VGbLAaKn6Klqv5RzfTe14_El-z2w';

// 工作表名称到 gid 的映射（Google Sheet 每个工作表有唯一的 gid）
// 注意：gid 可以从 Google Sheet URL 的 #gid=XXX 部分获取
const SHEET_GID_MAP: Record<string, number> = {
    'config': 0  // config 工作表确认为 gid=0
    // 其他工作表的 gid 未知，使用 gviz/tq 格式
};

// CSV 导出 URL 模板
// 使用 export 格式（实时数据，无缓存）用于已知 gid 的工作表
// 使用 gviz/tq 格式（可能有缓存延迟）用于未知 gid 的工作表
const getSheetCSVUrl = (sheetName: string) => {
    const gid = SHEET_GID_MAP[sheetName];
    if (gid !== undefined) {
        // 使用 export 格式（实时，无缓存）- 解决 API Key 缓存问题
        console.log(`🔗 Using export URL for ${sheetName} (gid=${gid})`);
        return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}`;
    }
    // 使用 gviz/tq 格式
    console.log(`🔗 Using gviz/tq URL for ${sheetName}`);
    return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
};

// 配置类型定义
export interface SystemConfig {
    defaultDateDays: number;
    geminiApiKey: string;
}

export interface BusinessLineConfig {
    name: string;
    analysisLevel: 'Campaign' | 'AdSet' | 'Ad';
    budget: number;
    kpiType: 'ROI' | 'CPC' | 'CPM';
    targetValue: number;
    ruleField: string;
    ruleOperator: string;
    ruleValue: string;
}

export interface AdLayerConfig {
    layer: 'awareness' | 'traffic' | 'conversion';
    ruleField: string;
    ruleOperator: string;
    ruleValue: string;
}

export interface AppConfig {
    system: SystemConfig;
    businessLines: BusinessLineConfig[];
    adLayers: AdLayerConfig[];
    loadedAt: string;
}

// 缓存配置
const CACHE_KEY = 'google_sheet_config_cache';
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5分钟缓存

/**
 * 解析 CSV 文本（处理引号内的逗号）
 */
function parseCSV(csvText: string): Record<string, string>[] {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return [];

    // 解析单行 CSV（处理引号）
    const parseLine = (line: string): string[] => {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    current += '"';
                    i++; // 跳过下一个引号
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }

        result.push(current.trim());
        return result;
    };

    const headers = parseLine(lines[0]);

    return lines.slice(1).map(line => {
        const values = parseLine(line);
        const row: Record<string, string> = {};
        headers.forEach((header, index) => {
            row[header] = values[index] || '';
        });
        return row;
    });
}

/**
 * 获取 Google Sheet 数据
 */
async function fetchSheetData(sheetName: string): Promise<Record<string, string>[]> {
    const url = getSheetCSVUrl(sheetName);

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch sheet ${sheetName}: ${response.statusText}`);
        }
        const csvText = await response.text();

        // 调试：输出原始 CSV 文本
        console.log(`📄 [${sheetName}] Raw CSV from Google Sheet:`);
        console.log('---RAW CSV START---');
        console.log(csvText);
        console.log('---RAW CSV END---');

        return parseCSV(csvText);
    } catch (error) {
        console.error(`Error fetching sheet ${sheetName}:`, error);
        throw error;
    }
}

/**
 * 加载系统配置
 */
async function loadSystemConfig(): Promise<SystemConfig> {
    const rows = await fetchSheetData('config');

    console.log('📊 Raw config data:', rows);

    const configMap = new Map<string, string>();
    rows.forEach(row => {
        // 打印每一行的键和值，帮助调试
        console.log('🔍 Config row keys:', Object.keys(row), 'values:', Object.values(row));
        if (row.config_key && row.config_value !== undefined) {
            configMap.set(row.config_key.trim(), String(row.config_value).trim());
            console.log(`  ✅ Set config: ${row.config_key} = ${row.config_value}`);
        }
    });

    const geminiKey = configMap.get('gemini_api_key') || '';
    console.log('🔑 Gemini API Key from config:', geminiKey ? `${geminiKey.substring(0, 10)}...` : '(empty)');

    return {
        defaultDateDays: parseInt(configMap.get('default_date_days') || '7', 10),
        geminiApiKey: geminiKey
    };
}

/**
 * 加载业务线配置
 */
async function loadBusinessLines(): Promise<BusinessLineConfig[]> {
    const rows = await fetchSheetData('business_lines');

    console.log('📊 Raw business_lines data:', rows);

    const configs = rows
        .filter(row => row.name) // 过滤空行
        .map(row => ({
            name: row.name,
            analysisLevel: (row.analysis_level as 'Campaign' | 'AdSet' | 'Ad') || 'Campaign',
            budget: parseFloat(row.budget) || 0,
            kpiType: (row.kpi_type as 'ROI' | 'CPC' | 'CPM') || 'ROI',
            targetValue: parseFloat(row.target_value) || 0,
            ruleField: row.rule_field || 'Campaign Name',
            ruleOperator: row.rule_operator || 'Contains',
            ruleValue: row.rule_value || ''
        }));

    console.log('✅ Parsed business lines:', configs);
    return configs;
}

/**
 * 加载广告层级配置
 */
async function loadAdLayers(): Promise<AdLayerConfig[]> {
    // 尝试加载 funnel_thresholds 表（用户创建的表名）
    const rows = await fetchSheetData('funnel_thresholds');

    return rows
        .filter(row => row.layer) // 过滤空行
        .map(row => ({
            layer: row.layer as 'awareness' | 'traffic' | 'conversion',
            ruleField: row.rule_field || 'Campaign Name',
            ruleOperator: row.rule_operator || 'Contains',
            ruleValue: row.rule_value || ''
        }));
}

/**
 * 加载全部配置（带缓存）
 */
export async function loadAppConfig(forceRefresh = false): Promise<AppConfig> {
    // 检查缓存
    if (!forceRefresh) {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
            try {
                const config = JSON.parse(cached) as AppConfig;
                const loadedAt = new Date(config.loadedAt).getTime();
                const now = Date.now();

                if (now - loadedAt < CACHE_DURATION_MS) {
                    console.log('📦 Using cached Google Sheet config');
                    return config;
                }
            } catch (e) {
                console.warn('Failed to parse cached config');
            }
        }
    }

    console.log('🔄 Loading config from Google Sheets...');

    // 并行加载所有配置
    const [system, businessLines, adLayers] = await Promise.all([
        loadSystemConfig(),
        loadBusinessLines(),
        loadAdLayers()
    ]);

    const config: AppConfig = {
        system,
        businessLines,
        adLayers,
        loadedAt: new Date().toISOString()
    };

    // 保存到缓存
    localStorage.setItem(CACHE_KEY, JSON.stringify(config));

    console.log('✅ Config loaded:', config);

    return config;
}

/**
 * 清除配置缓存
 */
export function clearConfigCache(): void {
    console.log('🗑️ Clearing config cache...');
    const before = localStorage.getItem(CACHE_KEY);
    localStorage.removeItem(CACHE_KEY);
    const after = localStorage.getItem(CACHE_KEY);
    console.log('🗑️ Cache cleared successfully!', { had: !!before, now: !!after });
}

/**
 * 获取默认配置（当 Google Sheet 不可用时）
 */
export function getDefaultConfig(): AppConfig {
    return {
        system: {
            defaultDateDays: 7,
            geminiApiKey: ''
        },
        businessLines: [
            {
                name: 'AO',
                analysisLevel: 'Campaign',
                budget: 5000,
                kpiType: 'ROI',
                targetValue: 4.5,
                ruleField: 'Campaign Name',
                ruleOperator: 'Contains',
                ruleValue: '-AO'
            }
        ],
        adLayers: [
            { layer: 'awareness', ruleField: 'Campaign Name', ruleOperator: 'Contains', ruleValue: '-AW-' },
            { layer: 'traffic', ruleField: 'Campaign Name', ruleOperator: 'Contains', ruleValue: '-TR-' },
            { layer: 'conversion', ruleField: 'Campaign Name', ruleOperator: 'Contains', ruleValue: '-CV-' }
        ],
        loadedAt: new Date().toISOString()
    };
}
