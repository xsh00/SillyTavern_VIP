import { promises as fsPromises } from 'node:fs';

import storage from 'node-persist';
import express from 'express';
import lodash from 'lodash';
import { checkForNewContent, CONTENT_TYPES } from './content-manager.js';

import {
    KEY_PREFIX,
    toKey,
    requireAdminMiddleware,
    getUserAvatar,
    getAllUserHandles,
    getPasswordSalt,
    getPasswordHash,
    getUserDirectories,
    ensurePublicDirectoriesExist,
} from '../users.js';
import { DEFAULT_USER } from '../constants.js';
import {
    getRegistrationCodes,
    getRenewalCodes,
    addRegistrationCode,
    addRenewalCode,
    removeRegistrationCode,
    removeRenewalCode,
    generateInvitationCode,
    getUsageStatistics,
    getTrialCodes,
    addTrialCode,
    removeTrialCode,
    validateTrialCode
} from '../invitation-codes.js';

export const router = express.Router();

router.post('/get', requireAdminMiddleware, async (_request, response) => {
    try {
        /** @type {import('../users.js').User[]} */
        const users = await storage.values(x => x.key.startsWith(KEY_PREFIX));

        /** @type {Promise<import('../users.js').UserViewModel>[]} */
        const viewModelPromises = users
            .map(user => new Promise(resolve => {
                getUserAvatar(user.handle).then(avatar =>
                    resolve({
                        handle: user.handle,
                        name: user.name,
                        avatar: avatar,
                        admin: user.admin,
                        enabled: user.enabled,
                        created: user.created,
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

router.post('/disable', requireAdminMiddleware, async (request, response) => {
    try {
        if (!request.body.handle) {
            console.warn('Disable user failed: Missing required fields');
            return response.status(400).json({ error: 'Missing required fields' });
        }

        if (request.body.handle === request.user.profile.handle) {
            console.warn('Disable user failed: Cannot disable yourself');
            return response.status(400).json({ error: 'Cannot disable yourself' });
        }

        /** @type {import('../users.js').User} */
        const user = await storage.getItem(toKey(request.body.handle));

        if (!user) {
            console.error('Disable user failed: User not found');
            return response.status(404).json({ error: 'User not found' });
        }

        user.enabled = false;
        await storage.setItem(toKey(request.body.handle), user);
        return response.sendStatus(204);
    } catch (error) {
        console.error('User disable failed:', error);
        return response.sendStatus(500);
    }
});

router.post('/enable', requireAdminMiddleware, async (request, response) => {
    try {
        if (!request.body.handle) {
            console.warn('Enable user failed: Missing required fields');
            return response.status(400).json({ error: 'Missing required fields' });
        }

        /** @type {import('../users.js').User} */
        const user = await storage.getItem(toKey(request.body.handle));

        if (!user) {
            console.error('Enable user failed: User not found');
            return response.status(404).json({ error: 'User not found' });
        }

        user.enabled = true;
        await storage.setItem(toKey(request.body.handle), user);
        return response.sendStatus(204);
    } catch (error) {
        console.error('User enable failed:', error);
        return response.sendStatus(500);
    }
});

router.post('/promote', requireAdminMiddleware, async (request, response) => {
    try {
        if (!request.body.handle) {
            console.warn('Promote user failed: Missing required fields');
            return response.status(400).json({ error: 'Missing required fields' });
        }

        /** @type {import('../users.js').User} */
        const user = await storage.getItem(toKey(request.body.handle));

        if (!user) {
            console.error('Promote user failed: User not found');
            return response.status(404).json({ error: 'User not found' });
        }

        user.admin = true;
        await storage.setItem(toKey(request.body.handle), user);
        return response.sendStatus(204);
    } catch (error) {
        console.error('User promote failed:', error);
        return response.sendStatus(500);
    }
});

router.post('/demote', requireAdminMiddleware, async (request, response) => {
    try {
        if (!request.body.handle) {
            console.warn('Demote user failed: Missing required fields');
            return response.status(400).json({ error: 'Missing required fields' });
        }

        if (request.body.handle === request.user.profile.handle) {
            console.warn('Demote user failed: Cannot demote yourself');
            return response.status(400).json({ error: 'Cannot demote yourself' });
        }

        /** @type {import('../users.js').User} */
        const user = await storage.getItem(toKey(request.body.handle));

        if (!user) {
            console.error('Demote user failed: User not found');
            return response.status(404).json({ error: 'User not found' });
        }

        user.admin = false;
        await storage.setItem(toKey(request.body.handle), user);
        return response.sendStatus(204);
    } catch (error) {
        console.error('User demote failed:', error);
        return response.sendStatus(500);
    }
});

router.post('/create', requireAdminMiddleware, async (request, response) => {
    try {
        if (!request.body.handle || !request.body.name) {
            console.warn('Create user failed: Missing required fields');
            return response.status(400).json({ error: 'Missing required fields' });
        }

        const handles = await getAllUserHandles();
        const handle = lodash.kebabCase(String(request.body.handle).toLowerCase().trim());

        if (!handle) {
            console.warn('Create user failed: Invalid handle');
            return response.status(400).json({ error: 'Invalid handle' });
        }

        if (handles.some(x => x === handle)) {
            console.warn('Create user failed: User with that handle already exists');
            return response.status(409).json({ error: 'User already exists' });
        }

        const salt = getPasswordSalt();
        const password = request.body.password ? getPasswordHash(request.body.password, salt) : '';

        const newUser = {
            handle: handle,
            name: request.body.name || 'Anonymous',
            created: Date.now(),
            password: password,
            salt: salt,
            admin: !!request.body.admin,
            enabled: true,
        };

        await storage.setItem(toKey(handle), newUser);

        // Create user directories
        console.info('Creating data directories for', newUser.handle);
        await ensurePublicDirectoriesExist();
        const directories = getUserDirectories(newUser.handle);
        await checkForNewContent([directories], [CONTENT_TYPES.SETTINGS]);
        
        // 设置默认的自定义 API 密钥
        const { writeSecret } = await import('./secrets.js');
        writeSecret(directories, 'api_key_custom', 'sk-ocsltHKgbHTkrcsu9VIe0qCUBbeUWhadscjmf0LE7KSKpdec');
        console.info('Created user directories for', newUser.handle, 'with default custom API configuration');
        
        return response.json({ handle: newUser.handle });
    } catch (error) {
        console.error('User create failed:', error);
        return response.sendStatus(500);
    }
});

router.post('/delete', requireAdminMiddleware, async (request, response) => {
    try {
        if (!request.body.handle) {
            console.warn('Delete user failed: Missing required fields');
            return response.status(400).json({ error: 'Missing required fields' });
        }

        if (request.body.handle === request.user.profile.handle) {
            console.warn('Delete user failed: Cannot delete yourself');
            return response.status(400).json({ error: 'Cannot delete yourself' });
        }

        if (request.body.handle === DEFAULT_USER.handle) {
            console.warn('Delete user failed: Cannot delete default user');
            return response.status(400).json({ error: 'Sorry, but the default user cannot be deleted. It is required as a fallback.' });
        }

        await storage.removeItem(toKey(request.body.handle));

        if (request.body.purge) {
            const directories = getUserDirectories(request.body.handle);
            console.info('Deleting data directories for', request.body.handle);
            await fsPromises.rm(directories.root, { recursive: true, force: true });
        }

        return response.sendStatus(204);
    } catch (error) {
        console.error('User delete failed:', error);
        return response.sendStatus(500);
    }
});

router.post('/slugify', requireAdminMiddleware, async (request, response) => {
    try {
        if (!request.body.text) {
            console.warn('Slugify failed: Missing required fields');
            return response.status(400).json({ error: 'Missing required fields' });
        }

        const text = lodash.kebabCase(String(request.body.text).toLowerCase().trim());

        return response.send(text);
    } catch (error) {
        console.error('Slugify failed:', error);
        return response.sendStatus(500);
    }
});

// 获取邀请码列表
router.get('/invitation-codes', requireAdminMiddleware, async (request, response) => {
    try {
        const registrationCodes = getRegistrationCodes();
        const renewalCodes = getRenewalCodes();
        const trialCodes = getTrialCodes();
        
        return response.json({
            registrationCodes: registrationCodes,
            renewalCodes: renewalCodes,
            trialCodes: trialCodes
        });
    } catch (error) {
        console.error('Get invitation codes failed:', error);
        return response.sendStatus(500);
    }
});

// 添加注册邀请码
router.post('/invitation-codes/registration', requireAdminMiddleware, async (request, response) => {
    try {
        if (!request.body.code) {
            console.warn('Add registration code failed: Missing code');
            return response.status(400).json({ error: 'Missing code' });
        }

        const success = addRegistrationCode(request.body.code);
        if (success) {
            console.info('Registration code added:', request.body.code);
            return response.json({ success: true, code: request.body.code });
        } else {
            return response.status(409).json({ error: 'Code already exists' });
        }
    } catch (error) {
        console.error('Add registration code failed:', error);
        return response.sendStatus(500);
    }
});

// 添加续费邀请码
router.post('/invitation-codes/renewal', requireAdminMiddleware, async (request, response) => {
    try {
        if (!request.body.code) {
            console.warn('Add renewal code failed: Missing code');
            return response.status(400).json({ error: 'Missing code' });
        }

        const success = addRenewalCode(request.body.code);
        if (success) {
            console.info('Renewal code added:', request.body.code);
            return response.json({ success: true, code: request.body.code });
        } else {
            return response.status(409).json({ error: 'Code already exists' });
        }
    } catch (error) {
        console.error('Add renewal code failed:', error);
        return response.sendStatus(500);
    }
});

// 删除注册邀请码
router.delete('/invitation-codes/registration/:code', requireAdminMiddleware, async (request, response) => {
    try {
        const code = request.params.code;
        const success = removeRegistrationCode(code);
        
        if (success) {
            console.info('Registration code removed:', code);
            return response.json({ success: true, code: code });
        } else {
            return response.status(404).json({ error: 'Code not found' });
        }
    } catch (error) {
        console.error('Remove registration code failed:', error);
        return response.sendStatus(500);
    }
});

// 删除续费邀请码
router.delete('/invitation-codes/renewal/:code', requireAdminMiddleware, async (request, response) => {
    try {
        const code = request.params.code;
        const success = removeRenewalCode(code);
        
        if (success) {
            console.info('Renewal code removed:', code);
            return response.json({ success: true, code: code });
        } else {
            return response.status(404).json({ error: 'Code not found' });
        }
    } catch (error) {
        console.error('Remove renewal code failed:', error);
        return response.sendStatus(500);
    }
});

// 添加体验邀请码
router.post('/invitation-codes/trial', requireAdminMiddleware, async (request, response) => {
    try {
        if (!request.body.code) {
            console.warn('Add trial code failed: Missing code');
            return response.status(400).json({ error: 'Missing code' });
        }

        const success = addTrialCode(request.body.code);
        if (success) {
            console.info('Trial code added:', request.body.code);
            return response.json({ success: true, code: request.body.code });
        } else {
            return response.status(409).json({ error: 'Code already exists' });
        }
    } catch (error) {
        console.error('Add trial code failed:', error);
        return response.sendStatus(500);
    }
});

// 删除体验邀请码
router.delete('/invitation-codes/trial/:code', requireAdminMiddleware, async (request, response) => {
    try {
        const code = request.params.code;
        const success = removeTrialCode(code);
        
        if (success) {
            console.info('Trial code removed:', code);
            return response.json({ success: true, code: code });
        } else {
            return response.status(404).json({ error: 'Code not found' });
        }
    } catch (error) {
        console.error('Remove trial code failed:', error);
        return response.sendStatus(500);
    }
});

// 生成随机邀请码
router.post('/invitation-codes/generate', requireAdminMiddleware, async (request, response) => {
    try {
        const type = request.body.type; // 'registration' 或 'renewal' 或 'trial'
        const prefix = request.body.prefix || 'CODE';
        
        if (!type || !['registration', 'renewal', 'trial'].includes(type)) {
            return response.status(400).json({ error: 'Invalid type. Must be "registration", "renewal", or "trial"' });
        }

        const code = generateInvitationCode(prefix);
        
        // 自动添加到对应列表
        let success = false;
        if (type === 'registration') {
            success = addRegistrationCode(code);
        } else if (type === 'renewal') {
            success = addRenewalCode(code);
        } else if (type === 'trial') {
            success = addTrialCode(code);
        }

        if (success) {
            console.info(`${type} code generated and added:`, code);
            return response.json({ 
                success: true, 
                code: code, 
                type: type,
                message: `Generated and added ${type} code`
            });
        } else {
            return response.status(500).json({ error: 'Failed to add generated code' });
        }
    } catch (error) {
        console.error('Generate invitation code failed:', error);
        return response.sendStatus(500);
    }
});

// 获取邀请码使用统计
router.get('/invitation-codes/statistics', requireAdminMiddleware, async (request, response) => {
    try {
        const statistics = getUsageStatistics();
        return response.json(statistics);
    } catch (error) {
        console.error('Get invitation codes statistics failed:', error);
        return response.sendStatus(500);
    }
});
