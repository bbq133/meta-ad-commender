// 配置 Context
// 使用 React Context 在全局提供配置数据

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { loadAppConfig, AppConfig, clearConfigCache, getDefaultConfig } from '../services/googleSheetConfigService';

interface ConfigContextType {
    config: AppConfig | null;
    isLoading: boolean;
    error: string | null;
    refreshConfig: () => Promise<void>;
}

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

export const ConfigProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [config, setConfig] = useState<AppConfig | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refreshConfig = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            clearConfigCache();
            const newConfig = await loadAppConfig(true);
            setConfig(newConfig);
        } catch (err: any) {
            console.error('Config refresh error:', err);
            setError(err.message || 'Failed to load config');
            // 使用默认配置作为降级
            setConfig(getDefaultConfig());
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadAppConfig()
            .then(setConfig)
            .catch(err => {
                console.error('Initial config load error:', err);
                setError(err.message);
                // 使用默认配置作为降级
                setConfig(getDefaultConfig());
            })
            .finally(() => setIsLoading(false));
    }, []);

    return (
        <ConfigContext.Provider value={{ config, isLoading, error, refreshConfig }}>
            {children}
        </ConfigContext.Provider>
    );
};

export const useConfig = (): ConfigContextType => {
    const context = useContext(ConfigContext);
    if (!context) {
        throw new Error('useConfig must be used within ConfigProvider');
    }
    return context;
};

// 便捷 hooks
export const useSystemConfig = () => {
    const { config } = useConfig();
    return config?.system || null;
};

export const useBusinessLines = () => {
    const { config } = useConfig();
    return config?.businessLines || [];
};

export const useAdLayers = () => {
    const { config } = useConfig();
    return config?.adLayers || [];
};
