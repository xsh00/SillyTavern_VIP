import {
    addOneMessage,
    characters,
    chat,
    displayVersion,
    doNewChat,
    event_types,
    eventSource,
    getCharacters,
    getCurrentChatId,
    getRequestHeaders,
    getSystemMessageByType,
    getThumbnailUrl,
    is_send_press,
    neutralCharacterName,
    newAssistantChat,
    openCharacterChat,
    printCharactersDebounced,
    selectCharacterById,
    system_avatar,
    system_message_types,
    this_chid,
} from '../script.js';
import { getGroupAvatar, groups, is_group_generating, openGroupById, openGroupChat } from './group-chats.js';
import { t } from './i18n.js';
import { renderTemplateAsync } from './templates.js';
import { accountStorage } from './util/AccountStorage.js';
import { sortMoments, timestampToMoment } from './utils.js';

const assistantAvatarKey = 'assistant';
const defaultAssistantAvatar = 'default_Assistant.png';

const DEFAULT_DISPLAYED = 3;
const MAX_DISPLAYED = 15;

export function getPermanentAssistantAvatar() {
    const assistantAvatar = accountStorage.getItem(assistantAvatarKey);
    if (assistantAvatar === null) {
        return defaultAssistantAvatar;
    }

    const character = characters.find(x => x.avatar === assistantAvatar);
    if (character === undefined) {
        accountStorage.removeItem(assistantAvatarKey);
        return defaultAssistantAvatar;
    }

    return assistantAvatar;
}

export async function openWelcomeScreen() {
    const currentChatId = getCurrentChatId();
    if (currentChatId !== undefined || chat.length > 0) {
        return;
    }

    const recentChats = await getRecentChats();
    const chatAfterFetch = getCurrentChatId();
    if (chatAfterFetch !== currentChatId) {
        console.debug('Chat changed while fetching recent chats.');
        return;
    }

    await sendWelcomePanel(recentChats);
    sendAssistantMessage();
    sendWelcomePrompt();
}

async function sendAssistantMessage() {
    let subInfo = '';
    try {
        const res = await fetch('/api/users/me');
        if (res.ok) {
            const user = await res.json();
            if (user.subscriptionExpires && user.subscriptionExpires > 0) {
                const days = user.daysRemaining;
                const date = new Date(user.subscriptionExpires).toLocaleDateString('zh-CN');
                subInfo = `\n> 🕒 <b>您的订阅剩余 <span style='color:#ffb300'>${days}</span> 天，到期日：<span style='color:#ffb300'>${date}</span></b>\n---\n`;
            } else {
                subInfo = `\n> 🕒 <b>当前账户无订阅限制</b>\n---\n`;
            }
        }
    } catch (e) {
        // ignore
    }
    const currentAssistantAvatar = getPermanentAssistantAvatar();
    const character = characters.find(x => x.avatar === currentAssistantAvatar);
    const name = character ? character.name : neutralCharacterName;
    const avatar = character ? getThumbnailUrl('avatar', character.avatar) : system_avatar;

    const message = {
        name: name,
        force_avatar: avatar,
        mes: `${subInfo}
<div align="center">
<h1 style="color: #4a90e2; font-size: 28px; margin-bottom: 20px;">
🌟 云酒馆公告 🌟
</h1>
</div>

---

<div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 15px; border-radius: 10px; margin: 15px 0;">
<p style="color: white; font-weight: bold; font-size: 16px; text-align: center; margin: 0;">
⚠️ 本平台仅供个人合法合规使用，请勿使用本平台进行违法犯罪、低俗内容等对话 ⚠️
</p>
</div>

---

<div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #28a745;">
<h3 style="color: #28a745; margin-top: 0;">📚 酒馆使用教程</h3>

<p style="font-size: 16px; line-height: 1.6;">
<strong style="color: #dc3545;">📖 使用教程（必看）：</strong><br>
<a href="https://docs.qq.com/doc/DTFVCdXV6UHBSWk1O" target="_blank" style="color: #007bff; text-decoration: none; font-weight: bold;">
🔗 https://docs.qq.com/doc/DTFVCdXV6UHBSWk1O
</a>
</p>

<p style="font-size: 14px; color: #6c757d;">
💡 <em>新注册的账号可直接选择角色卡开始聊天</em>
</p>

<p style="font-size: 16px;">
<strong style="color: #17a2b8;">🛠️ 客服联系VX：</strong><span style="color: #28a745; font-weight: bold;">jiuguan3678</span>
</p>
</div>

---

<div style="background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%); padding: 20px; border-radius: 8px; margin: 15px 0;">
<h3 style="color: #d63384; text-align: center; margin-top: 0;">💎 精品API次数卡</h3>

<div style="background: rgba(255,255,255,0.8); padding: 15px; border-radius: 6px; margin: 10px 0;">
<p style="font-size: 16px; font-weight: bold; color: #495057; margin-bottom: 8px;">
🤖 <span style="color: #e83e8c;">支持模型：</span>
</p>
<p style="font-size: 14px; color: #6f42c1; line-height: 1.5;">
Claude 3.5 | Claude 3.7 | Claude 4.0 Opus<br>
Grok-3 | Gemini 2.5 Pro 等高级模型
</p>
</div>

<div style="text-align: center; margin-top: 15px;">
<p style="font-size: 18px; font-weight: bold; color: #dc3545; margin-bottom: 10px;">
🛒 购买渠道
</p>
<a href="#" style="display: inline-block; background: #ff6b6b; color: white; padding: 8px 20px; margin: 5px; border-radius: 20px; text-decoration: none; font-weight: bold;">
🛍️ 淘宝店铺
</a>
<a href="#" style="display: inline-block; background: #4ecdc4; color: white; padding: 8px 20px; margin: 5px; border-radius: 20px; text-decoration: none; font-weight: bold;">
🐠 闲鱼店铺
</a>
</div>
</div>

<div style="background: #e3f2fd; padding: 15px; border-radius: 8px; border: 1px solid #bbdefb; margin-top: 20px;">
<p style="color: #1565c0; font-size: 14px; text-align: center; margin: 0;">
💝 <strong>感谢您的使用，祝您聊天愉快！</strong> 💝
</p>
</div>

        `,
        is_system: false,
        is_user: false,
        extra: {
            type: system_message_types.ASSISTANT_MESSAGE,
        },
    };

    chat.push(message);
    addOneMessage(message, { scroll: false });
}

function sendWelcomePrompt() {
    const message = getSystemMessageByType(system_message_types.WELCOME_PROMPT);
    chat.push(message);
    addOneMessage(message, { scroll: false });
}

/**
 * Sends the welcome panel to the chat.
 * @param {RecentChat[]} chats List of recent chats
 */
async function sendWelcomePanel(chats) {
    try {
        const chatElement = document.getElementById('chat');
        const sendTextArea = document.getElementById('send_textarea');
        if (!chatElement) {
            console.error('Chat element not found');
            return;
        }
        const templateData = {
            chats,
            empty: !chats.length,
            more: chats.some(chat => chat.hidden),
        };
        const template = await renderTemplateAsync('welcomePanel', templateData);
        const fragment = document.createRange().createContextualFragment(template);
        fragment.querySelectorAll('.welcomePanel').forEach((root) => {
            const recentHiddenClass = 'recentHidden';
            const recentHiddenKey = 'WelcomePage_RecentChatsHidden';
            if (accountStorage.getItem(recentHiddenKey) === 'true') {
                root.classList.add(recentHiddenClass);
            }
            root.querySelectorAll('.showRecentChats').forEach((button) => {
                button.addEventListener('click', () => {
                    root.classList.remove(recentHiddenClass);
                    accountStorage.setItem(recentHiddenKey, 'false');
                });
            });
            root.querySelectorAll('.hideRecentChats').forEach((button) => {
                button.addEventListener('click', () => {
                    root.classList.add(recentHiddenClass);
                    accountStorage.setItem(recentHiddenKey, 'true');
                });
            });
        });
        fragment.querySelectorAll('.recentChat').forEach((item) => {
            item.addEventListener('click', () => {
                const avatarId = item.getAttribute('data-avatar');
                const groupId = item.getAttribute('data-group');
                const fileName = item.getAttribute('data-file');
                if (avatarId && fileName) {
                    void openRecentCharacterChat(avatarId, fileName);
                }
                if (groupId && fileName) {
                    void openRecentGroupChat(groupId, fileName);
                }
            });
        });
        const hiddenChats = fragment.querySelectorAll('.recentChat.hidden');
        fragment.querySelectorAll('button.showMoreChats').forEach((button) => {
            const showRecentChatsTitle = t`Show more recent chats`;
            const hideRecentChatsTitle = t`Show less recent chats`;

            button.setAttribute('title', showRecentChatsTitle);
            button.addEventListener('click', () => {
                const rotate = button.classList.contains('rotated');
                hiddenChats.forEach((chatItem) => {
                    chatItem.classList.toggle('hidden', rotate);
                });
                button.classList.toggle('rotated', !rotate);
                button.setAttribute('title', rotate ? showRecentChatsTitle : hideRecentChatsTitle);
            });
        });
        fragment.querySelectorAll('button.openTemporaryChat').forEach((button) => {
            button.addEventListener('click', async () => {
                await newAssistantChat({ temporary: true });
                if (sendTextArea instanceof HTMLTextAreaElement) {
                    sendTextArea.focus();
                }
            });
        });
        fragment.querySelectorAll('.recentChat.group').forEach((groupChat) => {
            const groupId = groupChat.getAttribute('data-group');
            const group = groups.find(x => x.id === groupId);
            if (group) {
                const avatar = groupChat.querySelector('.avatar');
                if (!avatar) {
                    return;
                }
                const groupAvatar = getGroupAvatar(group);
                $(avatar).replaceWith(groupAvatar);
            }
        });
        chatElement.append(fragment.firstChild);
    } catch (error) {
        console.error('Welcome screen error:', error);
    }
}

/**
 * Opens a recent character chat.
 * @param {string} avatarId Avatar file name
 * @param {string} fileName Chat file name
 */
async function openRecentCharacterChat(avatarId, fileName) {
    const characterId = characters.findIndex(x => x.avatar === avatarId);
    if (characterId === -1) {
        console.error(`Character not found for avatar ID: ${avatarId}`);
        return;
    }

    try {
        await selectCharacterById(characterId);
        const currentChatId = getCurrentChatId();
        if (currentChatId === fileName) {
            console.debug(`Chat ${fileName} is already open.`);
            return;
        }
        await openCharacterChat(fileName);
    } catch (error) {
        console.error('Error opening recent chat:', error);
        toastr.error(t`Failed to open recent chat. See console for details.`);
    }
}

/**
 * Opens a recent group chat.
 * @param {string} groupId Group ID
 * @param {string} fileName Chat file name
 */
async function openRecentGroupChat(groupId, fileName) {
    const group = groups.find(x => x.id === groupId);
    if (!group) {
        console.error(`Group not found for ID: ${groupId}`);
        return;
    }

    try {
        await openGroupById(groupId);
        const currentChatId = getCurrentChatId();
        if (currentChatId === fileName) {
            console.debug(`Chat ${fileName} is already open.`);
            return;
        }
        await openGroupChat(groupId, fileName);
    } catch (error) {
        console.error('Error opening recent group chat:', error);
        toastr.error(t`Failed to open recent group chat. See console for details.`);
    }
}

/**
 * Gets the list of recent chats from the server.
 * @returns {Promise<RecentChat[]>} List of recent chats
 *
 * @typedef {object} RecentChat
 * @property {string} file_name Name of the chat file
 * @property {string} chat_name Name of the chat (without extension)
 * @property {string} file_size Size of the chat file
 * @property {number} chat_items Number of items in the chat
 * @property {string} mes Last message content
 * @property {string} last_mes Timestamp of the last message
 * @property {string} avatar Avatar URL
 * @property {string} char_thumbnail Thumbnail URL
 * @property {string} char_name Character or group name
 * @property {string} date_short Date in short format
 * @property {string} date_long Date in long format
 * @property {string} group Group ID (if applicable)
 * @property {boolean} is_group Indicates if the chat is a group chat
 * @property {boolean} hidden Chat will be hidden by default
 */
async function getRecentChats() {
    const response = await fetch('/api/chats/recent', {
        method: 'POST',
        headers: getRequestHeaders(),
        body: JSON.stringify({ max: MAX_DISPLAYED }),
    });

    if (!response.ok) {
        console.warn('Failed to fetch recent character chats');
        return [];
    }

    /** @type {RecentChat[]} */
    const data = await response.json();

    data.sort((a, b) => sortMoments(timestampToMoment(a.last_mes), timestampToMoment(b.last_mes)))
        .map(chat => ({ chat, character: characters.find(x => x.avatar === chat.avatar), group: groups.find(x => x.id === chat.group) }))
        .filter(t => t.character || t.group)
        .forEach(({ chat, character, group }, index) => {
            const chatTimestamp = timestampToMoment(chat.last_mes);
            chat.char_name = character?.name || group?.name || '';
            chat.date_short = chatTimestamp.format('l');
            chat.date_long = chatTimestamp.format('LL LT');
            chat.chat_name = chat.file_name.replace('.jsonl', '');
            chat.char_thumbnail = character ? getThumbnailUrl('avatar', character.avatar) : system_avatar;
            chat.is_group = !!group;
            chat.hidden = index >= DEFAULT_DISPLAYED;
            chat.avatar = chat.avatar || '';
            chat.group = chat.group || '';
        });

    return data;
}

export async function openPermanentAssistantChat({ tryCreate = true, created = false } = {}) {
    const avatar = getPermanentAssistantAvatar();
    const characterId = characters.findIndex(x => x.avatar === avatar);
    if (characterId === -1) {
        if (!tryCreate) {
            console.error(`Character not found for avatar ID: ${avatar}. Cannot create.`);
            return;
        }

        try {
            console.log(`Character not found for avatar ID: ${avatar}. Creating new assistant.`);
            await createPermanentAssistant();
            return openPermanentAssistantChat({ tryCreate: false, created: true });
        }
        catch (error) {
            console.error('Error creating permanent assistant:', error);
            toastr.error(t`Failed to create ${neutralCharacterName}. See console for details.`);
            return;
        }
    }

    try {
        await selectCharacterById(characterId);
        if (!created) {
            await doNewChat({ deleteCurrentChat: false });
        }
        console.log(`Opened permanent assistant chat for ${neutralCharacterName}.`, getCurrentChatId());
    } catch (error) {
        console.error('Error opening permanent assistant chat:', error);
        toastr.error(t`Failed to open permanent assistant chat. See console for details.`);
    }
}

async function createPermanentAssistant() {
    if (is_group_generating || is_send_press) {
        throw new Error(t`Cannot create while generating.`);
    }

    const formData = new FormData();
    formData.append('ch_name', neutralCharacterName);
    formData.append('file_name', defaultAssistantAvatar.replace('.png', ''));
    formData.append('creator_notes', t`Automatically created character. Feel free to edit.`);

    try {
        const avatarResponse = await fetch(system_avatar);
        const avatarBlob = await avatarResponse.blob();
        formData.append('avatar', avatarBlob, defaultAssistantAvatar);
    } catch (error) {
        console.warn('Error fetching system avatar. Fallback image will be used.', error);
    }

    const headers = getRequestHeaders();
    delete headers['Content-Type'];

    const fetchResult = await fetch('/api/characters/create', {
        method: 'POST',
        headers: headers,
        body: formData,
        cache: 'no-cache',
    });

    if (!fetchResult.ok) {
        throw new Error(t`Creation request did not succeed.`);
    }

    await getCharacters();
}

export async function openPermanentAssistantCard() {
    const avatar = getPermanentAssistantAvatar();
    const characterId = characters.findIndex(x => x.avatar === avatar);
    if (characterId === -1) {
        toastr.info(t`Assistant not found. Try sending a chat message.`);
        return;
    }

    await selectCharacterById(characterId);
}

/**
 * Assigns a character as the assistant.
 * @param {string?} characterId Character ID
 */
export function assignCharacterAsAssistant(characterId) {
    if (characterId === undefined) {
        return;
    }
    /** @type {import('./char-data.js').v1CharData} */
    const character = characters[characterId];
    if (!character) {
        return;
    }

    const currentAssistantAvatar = getPermanentAssistantAvatar();
    if (currentAssistantAvatar === character.avatar) {
        if (character.avatar === defaultAssistantAvatar) {
            toastr.info(t`${character.name} is a system assistant. Choose another character.`);
            return;
        }

        toastr.info(t`${character.name} is no longer your assistant.`);
        accountStorage.removeItem(assistantAvatarKey);
        return;
    }

    accountStorage.setItem(assistantAvatarKey, character.avatar);
    printCharactersDebounced();
    toastr.success(t`Set ${character.name} as your assistant.`);
}

export function initWelcomeScreen() {
    const events = [event_types.CHAT_CHANGED, event_types.APP_READY];
    for (const event of events) {
        eventSource.makeFirst(event, openWelcomeScreen);
    }

    eventSource.on(event_types.CHARACTER_MANAGEMENT_DROPDOWN, (target) => {
        if (target !== 'set_as_assistant') {
            return;
        }
        assignCharacterAsAssistant(this_chid);
    });

    eventSource.on(event_types.CHARACTER_RENAMED, (oldAvatar, newAvatar) => {
        if (oldAvatar === getPermanentAssistantAvatar()) {
            accountStorage.setItem(assistantAvatarKey, newAvatar);
        }
    });
}
