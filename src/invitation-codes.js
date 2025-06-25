import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { getConfigValue } from './util.js';

const INVITATION_CODES_FILE = path.join(process.cwd(), 'default', 'invitation-codes.yaml');

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
                renewalCodes: []
            };
            writeInvitationCodes(defaultConfig);
            return defaultConfig;
        }

        const content = fs.readFileSync(INVITATION_CODES_FILE, 'utf8');
        return yaml.load(content) || { registrationCodes: [], renewalCodes: [] };
    } catch (error) {
        console.error('读取邀请码配置文件失败:', error.message);
        return { registrationCodes: [], renewalCodes: [] };
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
 * 删除注册邀请码
 * @param {string} code 邀请码
 * @returns {boolean} 是否删除成功
 */
export function removeRegistrationCode(code) {
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
    return true;
}

/**
 * 删除续费邀请码
 * @param {string} code 邀请码
 * @returns {boolean} 是否删除成功
 */
export function removeRenewalCode(code) {
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