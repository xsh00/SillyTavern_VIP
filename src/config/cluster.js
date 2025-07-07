// SillyTavern 集群配置
import cluster from 'node:cluster';
import os from 'node:os';
import { getPerformanceConfig } from './performance.js';

/**
 * 集群管理器配置
 */
export class ClusterManager {
    constructor() {
        this.performanceConfig = getPerformanceConfig();
        this.workerCount = this.calculateOptimalWorkers();
        this.workers = new Map();
    }

    /**
     * 计算最佳工作进程数量
     */
    calculateOptimalWorkers() {
        const cpuCount = os.cpus().length;
        const totalMemoryGB = os.totalmem() / (1024 ** 3);
        
        // 为高性能服务器优化
        if (totalMemoryGB >= 16 && cpuCount >= 8) {
            return Math.min(cpuCount - 1, 6); // 预留1个CPU给主进程，最多6个worker
        } else if (totalMemoryGB >= 8 && cpuCount >= 4) {
            return Math.min(cpuCount - 1, 4);
        } else {
            return Math.min(cpuCount, 2);
        }
    }

    /**
     * 启动集群
     */
    start() {
        if (cluster.isPrimary) {
            console.log(`启动集群模式: ${this.workerCount} 个工作进程`);
            console.log(`系统资源: ${this.performanceConfig.system.cpuCount}CPU, ${this.performanceConfig.system.totalMemory}MB RAM`);
            
            // 创建工作进程
            for (let i = 0; i < this.workerCount; i++) {
                this.forkWorker(i);
            }

            // 监听工作进程退出
            cluster.on('exit', (worker, code, signal) => {
                console.warn(`工作进程 ${worker.process.pid} 退出 (${signal || code})`);
                this.restartWorker(worker);
            });

            // 监听工作进程在线
            cluster.on('online', (worker) => {
                console.log(`工作进程 ${worker.process.pid} 已启动`);
            });

            // 负载均衡统计
            setInterval(() => {
                this.logClusterStats();
            }, 60000); // 每分钟输出统计

        } else {
            // 工作进程启动应用
            return this.startWorker();
        }
    }

    /**
     * 创建工作进程
     */
    forkWorker(index) {
        const worker = cluster.fork({
            WORKER_ID: index,
            WORKER_COUNT: this.workerCount
        });
        
        this.workers.set(worker.id, {
            worker,
            index,
            startTime: Date.now(),
            restartCount: 0
        });

        return worker;
    }

    /**
     * 重启工作进程
     */
    restartWorker(deadWorker) {
        const workerInfo = this.workers.get(deadWorker.id);
        if (!workerInfo) return;

        workerInfo.restartCount++;
        
        // 防止频繁重启
        if (workerInfo.restartCount > 5) {
            console.error(`工作进程 ${workerInfo.index} 重启次数过多，停止重启`);
            return;
        }

        // 延迟重启
        setTimeout(() => {
            this.forkWorker(workerInfo.index);
            this.workers.delete(deadWorker.id);
        }, 1000);
    }

    /**
     * 工作进程启动逻辑
     */
    async startWorker() {
        const workerId = process.env.WORKER_ID;
        const workerCount = process.env.WORKER_COUNT;

        console.log(`工作进程 ${workerId}/${workerCount} 启动中...`);

        // 返回工作进程配置
        return {
            workerId: parseInt(workerId),
            workerCount: parseInt(workerCount),
            isClusterMode: true,
            
            // 为每个工作进程调整配置
            adjustedConfig: this.getWorkerConfig(parseInt(workerId))
        };
    }

    /**
     * 获取工作进程特定配置
     */
    getWorkerConfig(workerId) {
        const baseConfig = this.performanceConfig;
        
        // 为工作进程分配内存
        const memoryPerWorker = Math.floor(baseConfig.system.totalMemory * 0.8 / this.workerCount);
        
        return {
            ...baseConfig,
            worker: {
                id: workerId,
                maxMemory: `${memoryPerWorker}mb`,
                port: 8000 + workerId, // 为每个工作进程分配不同端口
            },
            cache: {
                ...baseConfig.cache,
                memoryCacheCapacity: `${Math.floor(256 / this.workerCount)}mb` // 分割缓存
            }
        };
    }

    /**
     * 输出集群统计信息
     */
    logClusterStats() {
        const stats = {
            totalWorkers: this.workers.size,
            activeWorkers: Array.from(this.workers.values()).filter(w => w.worker.isDead() === false).length,
            totalRestarts: Array.from(this.workers.values()).reduce((sum, w) => sum + w.restartCount, 0),
            avgUptime: this.calculateAverageUptime()
        };

        console.log('集群统计:', stats);
    }

    /**
     * 计算平均运行时间
     */
    calculateAverageUptime() {
        const now = Date.now();
        const uptimes = Array.from(this.workers.values()).map(w => now - w.startTime);
        return Math.round(uptimes.reduce((sum, time) => sum + time, 0) / uptimes.length / 1000);
    }

    /**
     * 优雅关闭集群
     */
    async shutdown() {
        console.log('开始关闭集群...');
        
        for (const [id, workerInfo] of this.workers) {
            workerInfo.worker.send('shutdown');
        }

        // 等待所有工作进程关闭
        await new Promise(resolve => {
            const checkShutdown = () => {
                const aliveWorkers = Array.from(this.workers.values()).filter(w => !w.worker.isDead());
                if (aliveWorkers.length === 0) {
                    resolve();
                } else {
                    setTimeout(checkShutdown, 100);
                }
            };
            checkShutdown();
        });

        console.log('集群关闭完成');
    }
}

/**
 * 负载均衡配置
 */
export function getLoadBalancerConfig() {
    return {
        strategy: 'round-robin', // 轮询策略
        healthCheck: {
            enabled: true,
            interval: 30000,      // 30秒检查一次
            timeout: 5000,        // 5秒超时
            maxFailures: 3        // 最大失败次数
        },
        stickySessions: true,     // 启用会话粘性
        retryAttempts: 3,         // 重试次数
        circuit: {
            enabled: true,
            threshold: 10,        // 失败阈值
            timeout: 60000,       // 熔断器超时
            resetTimeout: 30000   // 重置超时
        }
    };
} 