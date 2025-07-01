import crypto from 'node:crypto';
import lodash from 'lodash';

import storage from 'node-persist';
import express from 'express';
import { RateLimiterMemory, RateLimiterRes } from 'rate-limiter-flexible';
import { getIpFromRequest, getRealIpFromHeader } from '../express-common.js';
import { color, Cache, getConfigValue } from '../util.js';
import { 
    KEY_PREFIX, 
    getUserAvatar, 
    toKey, 
    getPasswordHash, 
    getPasswordSalt,
    getAllUserHandles,
    ensurePublicDirectoriesExist,
    getUserDirectories
} from '../users.js';
import { checkForNewContent, CONTENT_TYPES } from './content-manager.js';

import { 
    validateRegistrationCode, 
    validateRenewalCode,
    validateTrialCode,
    removeRegistrationCode,
    removeRenewalCode,
    removeTrialCode
} from '../invitation-codes.js';
import { writeSecret } from './secrets.js';

const DISCREET_LOGIN = getConfigValue('enableDiscreetLogin', false, 'boolean');
const PREFER_REAL_IP_HEADER = getConfigValue('rateLimiting.preferRealIpHeader', false, 'boolean');
const MFA_CACHE = new Cache(5 * 60 * 1000);

const getIpAddress = (request) => PREFER_REAL_IP_HEADER ? getRealIpFromHeader(request) : getIpFromRequest(request);

export const router = express.Router();
const loginLimiter = new RateLimiterMemory({
    points: 5,
    duration: 60,
});
const recoverLimiter = new RateLimiterMemory({
    points: 5,
    duration: 300,
});

router.post('/list', async (_request, response) => {
    try {
        if (DISCREET_LOGIN) {
            return response.sendStatus(204);
        }

        /** @type {import('../users.js').User[]} */
        const users = await storage.values(x => x.key.startsWith(KEY_PREFIX));

        /** @type {Promise<import('../users.js').UserViewModel>[]} */
        const viewModelPromises = users
            .filter(x => x.enabled)
            .map(user => new Promise(async (resolve) => {
                getUserAvatar(user.handle).then(avatar =>
                    resolve({
                        handle: user.handle,
                        name: user.name,
                        created: user.created,
                        avatar: avatar,
                        password: !!user.password,
                    }),
                );
            }));

        const viewModels = await Promise.all(viewModelPromises);
        viewModels.sort((x, y) => (x.created ?? 0) - (y.created ?? 0));
        return response.json(viewModels);
    } catch (error) {
        console.error('User list failed:', error);
        return response.sendStatus(500);
    }
});

router.post('/login', async (request, response) => {
    try {
        if (!request.body.handle) {
            console.warn('Login failed: Missing required fields');
            return response.status(400).json({ error: 'Missing required fields' });
        }

        const ip = getIpAddress(request);
        await loginLimiter.consume(ip);

        /** @type {import('../users.js').User} */
        const user = await storage.getItem(toKey(request.body.handle));

        if (!user) {
            console.error('Login failed: User', request.body.handle, 'not found');
            return response.status(403).json({ error: 'Incorrect credentials' });
        }

        if (!user.enabled) {
            console.warn('Login failed: User', user.handle, 'is disabled');
            return response.status(403).json({ error: 'User is disabled' });
        }

        if (user.password && user.password !== getPasswordHash(request.body.password, user.salt)) {
            console.warn('Login failed: Incorrect password for', user.handle);
            return response.status(403).json({ error: 'Incorrect credentials' });
        }

        // 检查订阅状态（管理员不受限制）
        if (!user.admin) {
            const now = Date.now();
            const subscriptionExpires = user.subscriptionExpires || 0;
            
            if (subscriptionExpires > 0 && subscriptionExpires < now) {
                console.warn('Login failed: Subscription expired for', user.handle);
                return response.status(403).json({ 
                    error: 'Subscription expired', 
                    message: '您的订阅已过期，请续费后继续使用。',
                    subscriptionExpires: subscriptionExpires 
                });
            }
        }

        if (!request.session) {
            console.error('Session not available');
            return response.sendStatus(500);
        }

        await loginLimiter.delete(ip);
        request.session.handle = user.handle;
        console.info('Login successful:', user.handle, 'from', ip, 'at', new Date().toLocaleString());
        return response.json({ handle: user.handle });
    } catch (error) {
        if (error instanceof RateLimiterRes) {
            console.error('Login failed: Rate limited from', getIpAddress(request));
            return response.status(429).send({ error: 'Too many attempts. Try again later or recover your password.' });
        }

        console.error('Login failed:', error);
        return response.sendStatus(500);
    }
});

router.post('/recover-step1', async (request, response) => {
    try {
        if (!request.body.handle) {
            console.warn('Recover step 1 failed: Missing required fields');
            return response.status(400).json({ error: 'Missing required fields' });
        }

        const ip = getIpAddress(request);
        await recoverLimiter.consume(ip);

        /** @type {import('../users.js').User} */
        const user = await storage.getItem(toKey(request.body.handle));

        if (!user) {
            console.error('Recover step 1 failed: User', request.body.handle, 'not found');
            return response.status(404).json({ error: 'User not found' });
        }

        if (!user.enabled) {
            console.error('Recover step 1 failed: User', user.handle, 'is disabled');
            return response.status(403).json({ error: 'User is disabled' });
        }

        const mfaCode = String(crypto.randomInt(1000, 9999));
        console.log();
        console.log(color.blue(`${user.name}, your password recovery code is: `) + color.magenta(mfaCode));
        console.log();
        MFA_CACHE.set(user.handle, mfaCode);
        return response.sendStatus(204);
    } catch (error) {
        if (error instanceof RateLimiterRes) {
            console.error('Recover step 1 failed: Rate limited from', getIpAddress(request));
            return response.status(429).send({ error: 'Too many attempts. Try again later or contact your admin.' });
        }

        console.error('Recover step 1 failed:', error);
        return response.sendStatus(500);
    }
});

router.post('/recover-step2', async (request, response) => {
    try {
        if (!request.body.handle || !request.body.code) {
            console.warn('Recover step 2 failed: Missing required fields');
            return response.status(400).json({ error: 'Missing required fields' });
        }

        /** @type {import('../users.js').User} */
        const user = await storage.getItem(toKey(request.body.handle));
        const ip = getIpAddress(request);

        if (!user) {
            console.error('Recover step 2 failed: User', request.body.handle, 'not found');
            return response.status(404).json({ error: 'User not found' });
        }

        if (!user.enabled) {
            console.warn('Recover step 2 failed: User', user.handle, 'is disabled');
            return response.status(403).json({ error: 'User is disabled' });
        }

        const mfaCode = MFA_CACHE.get(user.handle);

        if (request.body.code !== mfaCode) {
            await recoverLimiter.consume(ip);
            console.warn('Recover step 2 failed: Incorrect code');
            return response.status(403).json({ error: 'Incorrect code' });
        }

        if (request.body.newPassword) {
            const salt = getPasswordSalt();
            user.password = getPasswordHash(request.body.newPassword, salt);
            user.salt = salt;
            await storage.setItem(toKey(user.handle), user);
        } else {
            user.password = '';
            user.salt = '';
            await storage.setItem(toKey(user.handle), user);
        }

        await recoverLimiter.delete(ip);
        MFA_CACHE.remove(user.handle);
        return response.sendStatus(204);
    } catch (error) {
        if (error instanceof RateLimiterRes) {
            console.error('Recover step 2 failed: Rate limited from', getIpAddress(request));
            return response.status(429).send({ error: 'Too many attempts. Try again later or contact your admin.' });
        }

        console.error('Recover step 2 failed:', error);
        return response.sendStatus(500);
    }
});

// 注册新用户
router.post('/register', async (request, response) => {
    try {
        if (!request.body.handle || !request.body.name || !request.body.password || !request.body.invitationCode) {
            console.warn('Register failed: Missing required fields');
            return response.status(400).json({ error: 'Missing required fields' });
        }

        const ip = getIpAddress(request);
        await loginLimiter.consume(ip);

        // 验证邀请码（支持注册码和体验码）
        const isRegistrationCode = validateRegistrationCode(request.body.invitationCode);
        const isTrialCode = validateTrialCode(request.body.invitationCode);
        
        if (!isRegistrationCode && !isTrialCode) {
            console.warn('Register failed: Invalid invitation code');
            return response.status(403).json({ error: 'Invalid invitation code' });
        }

        const handles = await getAllUserHandles();
        const handle = lodash.kebabCase(String(request.body.handle).toLowerCase().trim());

        if (!handle) {
            console.warn('Register failed: Invalid handle');
            return response.status(400).json({ error: 'Invalid handle' });
        }

        if (handles.some(x => x === handle)) {
            console.warn('Register failed: User with that handle already exists');
            return response.status(409).json({ error: 'User already exists' });
        }

        const salt = getPasswordSalt();
        const password = getPasswordHash(request.body.password, salt);
        
        // 根据邀请码类型设置订阅时长
        let subscriptionDuration;
        if (isTrialCode) {
            // 体验码：1天
            subscriptionDuration = 24 * 60 * 60 * 1000; // 1天的毫秒数
        } else {
            // 注册码：默认30天
            subscriptionDuration = getConfigValue('defaultSubscriptionDuration', 2592000000, 'number');
        }
        
        const subscriptionExpires = Date.now() + subscriptionDuration;

        const newUser = {
            handle: handle,
            name: request.body.name || 'Anonymous',
            created: Date.now(),
            password: password,
            salt: salt,
            admin: false,
            enabled: true,
            subscriptionExpires: subscriptionExpires,
        };

        await storage.setItem(toKey(handle), newUser);

        // 注册成功后移除已用的邀请码，并记录使用情况
        if (isRegistrationCode) {
            removeRegistrationCode(request.body.invitationCode, newUser.handle, ip);
        } else if (isTrialCode) {
            removeTrialCode(request.body.invitationCode, newUser.handle, ip);
        }

        // 创建用户目录
        console.info('Creating data directories for', newUser.handle);
        await ensurePublicDirectoriesExist();
        const directories = getUserDirectories(newUser.handle);
        await checkForNewContent([directories], [CONTENT_TYPES.SETTINGS]);

        // 设置默认的自定义 API 密钥
        const { writeSecret } = await import('./secrets.js');
        writeSecret(directories, 'api_key_custom', 'sk-ocsltHKgbHTkrcsu9VIe0qCUBbeUWhadscjmf0LE7KSKpdec');
        console.info('Created user directories for', newUser.handle, 'with default custom API configuration');

        await loginLimiter.delete(ip);
        console.info('Registration successful:', newUser.handle, 'from', ip, 'at', new Date().toLocaleString());
        return response.json({ handle: newUser.handle, subscriptionExpires: newUser.subscriptionExpires });
    } catch (error) {
        if (error instanceof RateLimiterRes) {
            console.error('Register failed: Rate limited from', getIpAddress(request));
            return response.status(429).send({ error: 'Too many attempts. Try again later.' });
        }

        console.error('Register failed:', error);
        return response.sendStatus(500);
    }
});

// 续费用户订阅
router.post('/renew', async (request, response) => {
    try {
        if (!request.body.handle || !request.body.invitationCode) {
            console.warn('Renew failed: Missing required fields');
            return response.status(400).json({ error: 'Missing required fields' });
        }

        const ip = getIpAddress(request);
        await loginLimiter.consume(ip);

        // 验证邀请码
        if (!validateRenewalCode(request.body.invitationCode)) {
            console.warn('Renew failed: Invalid invitation code');
            return response.status(403).json({ error: 'Invalid invitation code' });
        }

        /** @type {import('../users.js').User} */
        const user = await storage.getItem(toKey(request.body.handle));

        if (!user) {
            console.error('Renew failed: User', request.body.handle, 'not found');
            return response.status(404).json({ error: 'User not found' });
        }

        if (!user.enabled) {
            console.warn('Renew failed: User', user.handle, 'is disabled');
            return response.status(403).json({ error: 'User is disabled' });
        }

        const defaultSubscriptionDuration = getConfigValue('defaultSubscriptionDuration', 2592000000, 'number');
        const currentExpires = user.subscriptionExpires || 0;
        const newExpires = Math.max(currentExpires, Date.now()) + defaultSubscriptionDuration;
        
        user.subscriptionExpires = newExpires;
        await storage.setItem(toKey(request.body.handle), user);

        // 续费成功后移除已用的邀请码，并记录使用情况
        removeRenewalCode(request.body.invitationCode, user.handle, ip);

        await loginLimiter.delete(ip);
        console.info('Renewal successful:', user.handle, 'from', ip, 'at', new Date().toLocaleString());
        return response.json({ handle: user.handle, subscriptionExpires: user.subscriptionExpires });
    } catch (error) {
        if (error instanceof RateLimiterRes) {
            console.error('Renew failed: Rate limited from', getIpAddress(request));
            return response.status(429).send({ error: 'Too many attempts. Try again later.' });
        }

        console.error('Renew failed:', error);
        return response.sendStatus(500);
    }
});

// 检查用户订阅状态
router.post('/check-subscription', async (request, response) => {
    try {
        if (!request.body.handle) {
            console.warn('Check subscription failed: Missing required fields');
            return response.status(400).json({ error: 'Missing required fields' });
        }

        /** @type {import('../users.js').User} */
        const user = await storage.getItem(toKey(request.body.handle));

        if (!user) {
            console.error('Check subscription failed: User', request.body.handle, 'not found');
            return response.status(404).json({ error: 'User not found' });
        }

        const now = Date.now();
        const subscriptionExpires = user.subscriptionExpires || 0;
        const isExpired = subscriptionExpires < now;
        const daysRemaining = Math.max(0, Math.ceil((subscriptionExpires - now) / (1000 * 60 * 60 * 24)));

        return response.json({
            handle: user.handle,
            subscriptionExpires: subscriptionExpires,
            isExpired: isExpired,
            daysRemaining: daysRemaining,
            hasSubscription: subscriptionExpires > 0
        });
    } catch (error) {
        console.error('Check subscription failed:', error);
        return response.sendStatus(500);
    }
});
