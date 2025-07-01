import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { getConfigValue } from './util.js';

const INVITATION_CODES_FILE = path.join(process.cwd(), 'default', 'invitation-codes.yaml');
const USAGE_LOG_FILE = path.join(process.cwd(), 'default', 'invitation-codes-usage.json');

/**
 * 读取邀请码配置文件
 * @returns {Object} 邀请码配置对象
 */
function readInvitationCodes() {
    try {
        if (!fs.existsSync(INVITATION_CODES_FILE)) {
            // 如果文件不存在，创建默认配置
            const defaultConfig = {
                registrationCodes: [],
                renewalCodes: [],
                trialCodes: []
            };
            writeInvitationCodes(defaultConfig);
            return defaultConfig;
        }

        const content = fs.readFileSync(INVITATION_CODES_FILE, 'utf8');
        return yaml.load(content) || { registrationCodes: [], renewalCodes: [], trialCodes: [] };
    } catch (error) {
        console.error('读取邀请码配置文件失败:', error.message);
        return { registrationCodes: [], renewalCodes: [], trialCodes: [] };
    }
}

/**
 * 写入邀请码配置文件
 * @param {Object} config 邀请码配置对象
 */
function writeInvitationCodes(config) {
    try {
        const content = yaml.dump(config, { 
            indent: 2, 
            lineWidth: 120,
            noRefs: true 
        });
        fs.writeFileSync(INVITATION_CODES_FILE, content, 'utf8');
    } catch (error) {
        console.error('写入邀请码配置文件失败:', error.message);
        throw error;
    }
}

/**
 * 读取使用情况日志
 * @returns {Array} 使用记录数组
 */
function readUsageLog() {
    try {
        if (!fs.existsSync(USAGE_LOG_FILE)) {
            return [];
        }
        const content = fs.readFileSync(USAGE_LOG_FILE, 'utf8');
        return JSON.parse(content) || [];
    } catch (error) {
        console.error('读取使用情况日志失败:', error.message);
        return [];
    }
}

/**
 * 写入使用情况日志
 * @param {Array} usageLog 使用记录数组
 */
function writeUsageLog(usageLog) {
    try {
        const content = JSON.stringify(usageLog, null, 2);
        fs.writeFileSync(USAGE_LOG_FILE, content, 'utf8');
    } catch (error) {
        console.error('写入使用情况日志失败:', error.message);
    }
}

/**
 * 记录邀请码使用情况
 * @param {string} code 邀请码
 * @param {string} type 类型 ('registration' 或 'renewal' 或 'trial')
 * @param {string} userHandle 用户名
 * @param {string} ip 用户IP
 */
function logCodeUsage(code, type, userHandle, ip) {
    try {
        const usageLog = readUsageLog();
        const record = {
            code: code,
            type: type,
            userHandle: userHandle,
            ip: ip,
            timestamp: Date.now(),
            date: new Date().toISOString().split('T')[0]
        };
        usageLog.push(record);
        
        // 保留最近30天的记录
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        const filteredLog = usageLog.filter(record => record.timestamp > thirtyDaysAgo);
        
        writeUsageLog(filteredLog);
    } catch (error) {
        console.error('记录邀请码使用情况失败:', error.message);
    }
}

/**
 * 获取使用情况统计
 * @returns {Object} 统计信息
 */
export function getUsageStatistics() {
    try {
        const usageLog = readUsageLog();
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        // 按日期统计
        const dailyStats = {};
        const typeStats = { registration: 0, renewal: 0, trial: 0 };
        
        usageLog.forEach(record => {
            const date = record.date;
            if (!dailyStats[date]) {
                dailyStats[date] = { registration: 0, renewal: 0, trial: 0 };
            }
            if (dailyStats[date][record.type] !== undefined) {
                dailyStats[date][record.type]++;
            }
            if (typeStats[record.type] !== undefined) {
                typeStats[record.type]++;
            }
        });
        
        // 获取最近7天的统计
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            last7Days.push({
                date: date,
                registration: dailyStats[date]?.registration || 0,
                renewal: dailyStats[date]?.renewal || 0,
                trial: dailyStats[date]?.trial || 0,
                total: (dailyStats[date]?.registration || 0) + (dailyStats[date]?.renewal || 0) + (dailyStats[date]?.trial || 0)
            });
        }
        
        return {
            today: {
                registration: dailyStats[today]?.registration || 0,
                renewal: dailyStats[today]?.renewal || 0,
                trial: dailyStats[today]?.trial || 0,
                total: (dailyStats[today]?.registration || 0) + (dailyStats[today]?.renewal || 0) + (dailyStats[today]?.trial || 0)
            },
            yesterday: {
                registration: dailyStats[yesterday]?.registration || 0,
                renewal: dailyStats[yesterday]?.renewal || 0,
                trial: dailyStats[yesterday]?.trial || 0,
                total: (dailyStats[yesterday]?.registration || 0) + (dailyStats[yesterday]?.renewal || 0) + (dailyStats[yesterday]?.trial || 0)
            },
            last7Days: last7Days,
            total: {
                registration: typeStats.registration,
                renewal: typeStats.renewal,
                trial: typeStats.trial,
                total: typeStats.registration + typeStats.renewal + typeStats.trial
            },
            recentUsage: usageLog.slice(-20).reverse() // 最近20条记录
        };
    } catch (error) {
        console.error('获取使用情况统计失败:', error.message);
        return {
            today: { registration: 0, renewal: 0, trial: 0, total: 0 },
            yesterday: { registration: 0, renewal: 0, trial: 0, total: 0 },
            last7Days: [],
            total: { registration: 0, renewal: 0, trial: 0, total: 0 },
            recentUsage: []
        };
    }
}

/**
 * 获取注册邀请码列表
 * @returns {string[]} 注册邀请码数组
 */
export function getRegistrationCodes() {
    const config = readInvitationCodes();
    return config.registrationCodes || [];
}

/**
 * 获取续费邀请码列表
 * @returns {string[]} 续费邀请码数组
 */
export function getRenewalCodes() {
    const config = readInvitationCodes();
    return config.renewalCodes || [];
}

/**
 * 获取体验邀请码列表
 * @returns {string[]} 体验邀请码数组
 */
export function getTrialCodes() {
    const config = readInvitationCodes();
    return config.trialCodes || [];
}

/**
 * 验证注册邀请码
 * @param {string} code 邀请码
 * @returns {boolean} 是否有效
 */
export function validateRegistrationCode(code) {
    const codes = getRegistrationCodes();
    return codes.includes(code);
}

/**
 * 验证续费邀请码
 * @param {string} code 邀请码
 * @returns {boolean} 是否有效
 */
export function validateRenewalCode(code) {
    const codes = getRenewalCodes();
    return codes.includes(code);
}

/**
 * 验证体验邀请码
 * @param {string} code 邀请码
 * @returns {boolean} 是否有效
 */
export function validateTrialCode(code) {
    const codes = getTrialCodes();
    return codes.includes(code);
}

/**
 * 添加注册邀请码
 * @param {string} code 邀请码
 * @returns {boolean} 是否添加成功
 */
export function addRegistrationCode(code) {
    const config = readInvitationCodes();
    if (!config.registrationCodes) {
        config.registrationCodes = [];
    }
    
    if (config.registrationCodes.includes(code)) {
        return false; // 已存在
    }
    
    config.registrationCodes.push(code);
    writeInvitationCodes(config);
    return true;
}

/**
 * 添加续费邀请码
 * @param {string} code 邀请码
 * @returns {boolean} 是否添加成功
 */
export function addRenewalCode(code) {
    const config = readInvitationCodes();
    if (!config.renewalCodes) {
        config.renewalCodes = [];
    }
    
    if (config.renewalCodes.includes(code)) {
        return false; // 已存在
    }
    
    config.renewalCodes.push(code);
    writeInvitationCodes(config);
    return true;
}

/**
 * 添加体验邀请码
 * @param {string} code 邀请码
 * @returns {boolean} 是否添加成功
 */
export function addTrialCode(code) {
    const config = readInvitationCodes();
    if (!config.trialCodes) {
        config.trialCodes = [];
    }
    
    if (config.trialCodes.includes(code)) {
        return false; // 已存在
    }
    
    config.trialCodes.push(code);
    writeInvitationCodes(config);
    return true;
}

/**
 * 删除注册邀请码
 * @param {string} code 邀请码
 * @returns {boolean} 是否删除成功
 */
export function removeRegistrationCode(code, userHandle = null, ip = null) {
    const config = readInvitationCodes();
    if (!config.registrationCodes) {
        return false;
    }
    
    const index = config.registrationCodes.indexOf(code);
    if (index === -1) {
        return false;
    }
    
    config.registrationCodes.splice(index, 1);
    writeInvitationCodes(config);
    
    // 记录使用情况
    if (userHandle && ip) {
        logCodeUsage(code, 'registration', userHandle, ip);
    }
    
    return true;
}

/**
 * 删除续费邀请码
 * @param {string} code 邀请码
 * @returns {boolean} 是否删除成功
 */
export function removeRenewalCode(code, userHandle = null, ip = null) {
    const config = readInvitationCodes();
    if (!config.renewalCodes) {
        return false;
    }
    
    const index = config.renewalCodes.indexOf(code);
    if (index === -1) {
        return false;
    }
    
    config.renewalCodes.splice(index, 1);
    writeInvitationCodes(config);
    
    // 记录使用情况
    if (userHandle && ip) {
        logCodeUsage(code, 'renewal', userHandle, ip);
    }
    
    return true;
}

/**
 * 删除体验邀请码
 * @param {string} code 邀请码
 * @returns {boolean} 是否删除成功
 */
export function removeTrialCode(code, userHandle = null, ip = null) {
    const config = readInvitationCodes();
    if (!config.trialCodes) {
        return false;
    }
    
    const index = config.trialCodes.indexOf(code);
    if (index === -1) {
        return false;
    }
    
    config.trialCodes.splice(index, 1);
    writeInvitationCodes(config);
    
    // 记录使用情况
    if (userHandle && ip) {
        logCodeUsage(code, 'trial', userHandle, ip);
    }
    
    return true;
}

/**
 * 获取所有邀请码配置
 * @returns {Object} 完整的邀请码配置
 */
export function getAllInvitationCodes() {
    return readInvitationCodes();
}

/**
 * 生成随机邀请码
 * @param {string} prefix 前缀
 * @returns {string} 生成的邀请码
 */
export function generateInvitationCode(prefix = 'CODE') {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${prefix}-${timestamp}-${random}`.toUpperCase();
} 