// SillyTavern 性能优化配置
import os from 'node:os';
import { getConfigValue } from '../util.js';

/**
 * 检测系统资源并返回适当的配置
 */
export function getPerformanceConfig() {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const cpuCount = os.cpus().length;
    
    // 内存分类 (字节)
    const memoryCategory = getMemoryCategory(totalMemory);
    
    return {
        // 缓存配置
        cache: getCacheConfig(memoryCategory),
        
        // 并发控制
        concurrency: getConcurrencyConfig(cpuCount, memoryCategory),
        
        // 文件处理
        fileHandling: getFileHandlingConfig(memoryCategory),
        
        // 网络配置
        network: getNetworkConfig(),
        
        // 系统信息
        system: {
            totalMemory: Math.round(totalMemory / 1024 / 1024), // MB
            freeMemory: Math.round(freeMemory / 1024 / 1024),   // MB
            cpuCount,
            category: memoryCategory
        }
    };
}

/**
 * 根据内存大小分类系统
 */
function getMemoryCategory(totalMemory) {
    const memoryGB = totalMemory / (1024 ** 3);
    
    if (memoryGB <= 1) return 'minimal';      // <= 1GB
    if (memoryGB <= 2) return 'low';          // <= 2GB  
    if (memoryGB <= 4) return 'medium';       // <= 4GB
    if (memoryGB <= 8) return 'high';         // <= 8GB
    return 'maximum';                          // > 8GB
}

/**
 * 缓存配置
 */
function getCacheConfig(category) {
    const configs = {
        minimal: {
            memoryCacheCapacity: '16mb',
            diskCacheEnabled: true,
            lazyLoadCharacters: true,
            cacheCleanupInterval: 60 * 1000,      // 1分钟
            maxCacheEntries: 50
        },
        low: {
            memoryCacheCapacity: '32mb',
            diskCacheEnabled: true,
            lazyLoadCharacters: true,
            cacheCleanupInterval: 2 * 60 * 1000,  // 2分钟
            maxCacheEntries: 100
        },
        medium: {
            memoryCacheCapacity: '64mb',
            diskCacheEnabled: true,
            lazyLoadCharacters: false,
            cacheCleanupInterval: 5 * 60 * 1000,  // 5分钟
            maxCacheEntries: 200
        },
        high: {
            memoryCacheCapacity: '128mb',
            diskCacheEnabled: true,
            lazyLoadCharacters: false,
            cacheCleanupInterval: 10 * 60 * 1000, // 10分钟
            maxCacheEntries: 500
        },
        maximum: {
            memoryCacheCapacity: '256mb',
            diskCacheEnabled: true,
            lazyLoadCharacters: false,
            cacheCleanupInterval: 15 * 60 * 1000, // 15分钟
            maxCacheEntries: 1000
        }
    };
    
    return configs[category];
}

/**
 * 并发控制配置
 */
function getConcurrencyConfig(cpuCount, category) {
    const baseConfig = {
        minimal: { maxConcurrent: 2, queueSize: 10 },
        low: { maxConcurrent: 4, queueSize: 20 },
        medium: { maxConcurrent: 8, queueSize: 50 },
        high: { maxConcurrent: 12, queueSize: 100 },
        maximum: { maxConcurrent: 16, queueSize: 200 }
    };
    
    const config = baseConfig[category];
    
    // 根据 CPU 核心数调整
    config.maxConcurrent = Math.min(config.maxConcurrent, cpuCount * 2);
    
    return config;
}

/**
 * 文件处理配置
 */
function getFileHandlingConfig(category) {
    const configs = {
        minimal: {
            maxFileSize: '10mb',
            maxFiles: 5,
            compressionLevel: 9,        // 最高压缩
            thumbnailQuality: 60
        },
        low: {
            maxFileSize: '25mb',
            maxFiles: 10,
            compressionLevel: 6,        // 平衡压缩
            thumbnailQuality: 70
        },
        medium: {
            maxFileSize: '50mb',
            maxFiles: 20,
            compressionLevel: 4,        // 快速压缩
            thumbnailQuality: 80
        },
        high: {
            maxFileSize: '100mb',
            maxFiles: 50,
            compressionLevel: 3,
            thumbnailQuality: 85
        },
        maximum: {
            maxFileSize: '200mb',
            maxFiles: 100,
            compressionLevel: 1,        // 最快压缩
            thumbnailQuality: 90
        }
    };
    
    return configs[category];
}

/**
 * 网络配置
 */
function getNetworkConfig() {
    return {
        keepAliveTimeout: 65000,        // 65秒
        headersTimeout: 66000,          // 66秒
        requestTimeout: 30000,          // 30秒
        maxHeaderSize: 16384,           // 16KB
        connectionLimit: 1000
    };
}

/**
 * 应用性能配置到 Express 应用
 */
export function applyPerformanceConfig(app, config) {
    // 设置服务器超时
    app.use((req, res, next) => {
        req.setTimeout(config.network.requestTimeout);
        res.setTimeout(config.network.requestTimeout);
        next();
    });
    
    // 连接数限制
    let connectionCount = 0;
    app.use((req, res, next) => {
        if (connectionCount >= config.concurrency.maxConcurrent) {
            return res.status(429).json({ 
                error: 'Server busy, please try again later',
                retryAfter: 5 
            });
        }
        
        connectionCount++;
        res.on('finish', () => connectionCount--);
        res.on('close', () => connectionCount--);
        
        next();
    });
}

/**
 * 监控性能指标
 */
export function getPerformanceMetrics() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    return {
        memory: {
            rss: Math.round(memUsage.rss / 1024 / 1024),           // MB
            heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
            heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),   // MB
            external: Math.round(memUsage.external / 1024 / 1024),   // MB
            heapUsagePercent: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100)
        },
        cpu: {
            user: cpuUsage.user,
            system: cpuUsage.system
        },
        uptime: Math.round(process.uptime()),
        timestamp: Date.now()
    };
} 