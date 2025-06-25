/**
 * CRSF token for requests.
 */
let csrfToken = '';
let discreetLogin = false;

/**
 * Gets a CSRF token from the server.
 * @returns {Promise<string>} CSRF token
 */
async function getCsrfToken() {
    const response = await fetch('/csrf-token');
    const data = await response.json();
    return data.token;
}

/**
 * Gets a list of users from the server.
 * @returns {Promise<object>} List of users
 */
async function getUserList() {
    const response = await fetch('/api/users/list', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken,
        },
    });

    if (!response.ok) {
        const errorData = await response.json();
        return displayError(errorData.error || 'An error occurred');
    }

    if (response.status === 204) {
        discreetLogin = true;
        return [];
    }

    const userListObj = await response.json();
    console.log(userListObj);
    return userListObj;
}

/**
 * Requests a recovery code for the user.
 * @param {string} handle User handle
 * @returns {Promise<void>}
 */
async function sendRecoveryPart1(handle) {
    const response = await fetch('/api/users/recover-step1', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({ handle }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        return displayError(errorData.error || 'An error occurred');
    }

    showRecoveryBlock();
}

/**
 * Sets a new password for the user using the recovery code.
 * @param {string} handle User handle
 * @param {string} code Recovery code
 * @param {string} newPassword New password
 * @returns {Promise<void>}
 */
async function sendRecoveryPart2(handle, code, newPassword) {
    const recoveryData = {
        handle,
        code,
        newPassword,
    };

    const response = await fetch('/api/users/recover-step2', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify(recoveryData),
    });

    if (!response.ok) {
        const errorData = await response.json();
        return displayError(errorData.error || 'An error occurred');
    }

    console.log(`Successfully recovered password for ${handle}!`);
    await performLogin(handle, newPassword);
}

/**
 * Attempts to log in the user.
 * @param {string} handle User's handle
 * @param {string} password User's password
 * @returns {Promise<void>}
 */
async function performLogin(handle, password) {
    const userInfo = {
        handle: handle,
        password: password,
    };

    try {
        const response = await fetch('/api/users/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': csrfToken,
            },
            body: JSON.stringify(userInfo),
        });

        if (!response.ok) {
            const errorData = await response.json();
            return displayError(errorData.error || 'An error occurred');
        }

        const data = await response.json();

        if (data.handle) {
            console.log(`Successfully logged in as ${handle}!`);
            redirectToHome();
        }
    } catch (error) {
        console.error('Error logging in:', error);
        displayError(String(error));
    }
}

/**
 * Handles the user selection event.
 * @param {object} user User object
 * @returns {Promise<void>}
 */
async function onUserSelected(user) {
    // No password, just log in
    if (!user.password) {
        return await performLogin(user.handle, '');
    }

    $('#passwordRecoveryBlock').hide();
    $('#passwordEntryBlock').show();
    $('#loginButton').off('click').on('click', async () => {
        const password = String($('#userPassword').val());
        await performLogin(user.handle, password);
    });

    $('#recoverPassword').off('click').on('click', async () => {
        await sendRecoveryPart1(user.handle);
    });

    $('#sendRecovery').off('click').on('click', async () => {
        const code = String($('#recoveryCode').val());
        const newPassword = String($('#newPassword').val());
        await sendRecoveryPart2(user.handle, code, newPassword);
    });

    displayError('');
}

/**
 * Displays an error message to the user.
 * @param {string} message Error message
 */
function displayError(message) {
    $('#errorMessage').text(message);
}

/**
 * Redirects the user to the home page.
 * Preserves the query string.
 */
function redirectToHome() {
    // Create a URL object based on the current location
    const currentUrl = new URL(window.location.href);

    // After a login there's no need to preserve the
    // noauto parameter (if present)
    currentUrl.searchParams.delete('noauto');

    // Set the pathname to root and keep the updated query string
    currentUrl.pathname = '/';

    // Redirect to the new URL
    window.location.href = currentUrl.toString();
}

/**
 * Hides the password entry block and shows the password recovery block.
 */
function showRecoveryBlock() {
    $('#passwordEntryBlock').hide();
    $('#passwordRecoveryBlock').show();
    $('#recoveryCode').focus();
}

/**
 * Hides the password recovery block and shows the password entry block.
 */
function onCancelRecoveryClick() {
    $('#passwordRecoveryBlock').hide();
    $('#passwordEntryBlock').show();
    $('#recoveryCode').val('');
    $('#newPassword').val('');
}

/**
 * Shows the register block and hides other blocks.
 */
function showRegisterBlock() {
    $('#passwordEntryBlock').hide();
    $('#passwordRecoveryBlock').hide();
    $('#renewBlock').hide();
    $('#registerBlock').show();
    $('#registerHandle').focus();
}

/**
 * Shows the renew block and hides other blocks.
 */
function showRenewBlock() {
    $('#passwordEntryBlock').hide();
    $('#passwordRecoveryBlock').hide();
    $('#registerBlock').hide();
    $('#renewBlock').show();
    $('#renewHandle').focus();
}

/**
 * Hides the register block and shows the password entry block.
 */
function onCancelRegisterClick() {
    $('#registerBlock').hide();
    $('#passwordEntryBlock').show();
    $('#registerHandle').val('');
    $('#registerName').val('');
    $('#registerPassword').val('');
    $('#registerConfirmPassword').val('');
    $('#registerInvitationCode').val('');
}

/**
 * Hides the renew block and shows the password entry block.
 */
function onCancelRenewClick() {
    $('#renewBlock').hide();
    $('#passwordEntryBlock').show();
    $('#renewHandle').val('');
    $('#renewInvitationCode').val('');
}

/**
 * Attempts to register a new user.
 * @param {string} handle User's handle
 * @param {string} name User's display name
 * @param {string} password User's password
 * @param {string} invitationCode Registration invitation code
 * @returns {Promise<void>}
 */
async function performRegister(handle, name, password, invitationCode) {
    const userInfo = {
        handle: handle,
        name: name,
        password: password,
        invitationCode: invitationCode,
    };

    try {
        const response = await fetch('/api/users/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': csrfToken,
            },
            body: JSON.stringify(userInfo),
        });

        if (!response.ok) {
            const errorData = await response.json();
            return displayError(errorData.error || 'An error occurred');
        }

        const data = await response.json();
        console.log(`Successfully registered user ${handle}!`);
        displayError('');
        onCancelRegisterClick();
        // 注册成功后自动登录
        await performLogin(handle, password);
    } catch (error) {
        console.error('Error registering user:', error);
        displayError(String(error));
    }
}

/**
 * Attempts to renew user subscription.
 * @param {string} handle User's handle
 * @param {string} invitationCode Renewal invitation code
 * @returns {Promise<void>}
 */
async function performRenew(handle, invitationCode) {
    const userInfo = {
        handle: handle,
        invitationCode: invitationCode,
    };

    try {
        const response = await fetch('/api/users/renew', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': csrfToken,
            },
            body: JSON.stringify(userInfo),
        });

        if (!response.ok) {
            const errorData = await response.json();
            return displayError(errorData.error || 'An error occurred');
        }

        const data = await response.json();
        console.log(`Successfully renewed subscription for ${handle}!`);
        displayError('');
        onCancelRenewClick();
        // 续费成功后显示成功消息
        alert('续费成功！您的订阅已延长一个月。');
    } catch (error) {
        console.error('Error renewing subscription:', error);
        displayError(String(error));
    }
}

/**
 * Configures the login page for normal login.
 * @param {import('../../src/users').UserViewModel[]} userList List of users
 */
function configureNormalLogin(userList) {
    console.log('Discreet login is disabled');
    $('#handleEntryBlock').hide();
    $('#normalLoginPrompt').show();
    $('#discreetLoginPrompt').hide();
    console.log(userList);
    for (const user of userList) {
        const userBlock = $('<div></div>').addClass('userSelect');
        const avatarBlock = $('<div></div>').addClass('avatar');
        avatarBlock.append($('<img>').attr('src', user.avatar));
        userBlock.append(avatarBlock);
        userBlock.append($('<span></span>').addClass('userName').text(user.name));
        userBlock.append($('<small></small>').addClass('userHandle').text(user.handle));
        userBlock.on('click', () => onUserSelected(user));
        $('#userList').append(userBlock);
    }
}

/**
 * Configures the login page for discreet login.
 */
function configureDiscreetLogin() {
    console.log('Discreet login is enabled');
    $('#handleEntryBlock').show();
    $('#normalLoginPrompt').hide();
    $('#discreetLoginPrompt').show();
    $('#userList').hide();
    $('#passwordRecoveryBlock').hide();
    $('#passwordEntryBlock').show();
    $('#loginButton').off('click').on('click', async () => {
        const handle = String($('#userHandle').val());
        const password = String($('#userPassword').val());
        await performLogin(handle, password);
    });

    $('#recoverPassword').off('click').on('click', async () => {
        const handle = String($('#userHandle').val());
        await sendRecoveryPart1(handle);
    });

    $('#sendRecovery').off('click').on('click', async () => {
        const handle = String($('#userHandle').val());
        const code = String($('#recoveryCode').val());
        const newPassword = String($('#newPassword').val());
        await sendRecoveryPart2(handle, code, newPassword);
    });
}

(async function () {
    csrfToken = await getCsrfToken();
    const userList = await getUserList();

    if (discreetLogin) {
        configureDiscreetLogin();
    } else {
        configureNormalLogin(userList);
    }
    document.getElementById('shadow_popup').style.opacity = '';
    $('#cancelRecovery').on('click', onCancelRecoveryClick);
    
    // 注册功能事件监听器
    $('#registerButton').on('click', async () => {
        const handle = String($('#registerHandle').val());
        const name = String($('#registerName').val());
        const password = String($('#registerPassword').val());
        const confirmPassword = String($('#registerConfirmPassword').val());
        const invitationCode = String($('#registerInvitationCode').val());

        if (!handle || !name || !password || !invitationCode) {
            displayError('请填写所有必填字段');
            return;
        }

        if (password !== confirmPassword) {
            displayError('密码和确认密码不匹配');
            return;
        }

        await performRegister(handle, name, password, invitationCode);
    });

    $('#cancelRegister').on('click', onCancelRegisterClick);

    // 续费功能事件监听器
    $('#renewButton').on('click', async () => {
        const handle = String($('#renewHandle').val());
        const invitationCode = String($('#renewInvitationCode').val());

        if (!handle || !invitationCode) {
            displayError('请填写所有必填字段');
            return;
        }

        await performRenew(handle, invitationCode);
    });

    $('#cancelRenew').on('click', onCancelRenewClick);

    $(document).on('keydown', (evt) => {
        if (evt.key === 'Enter' && document.activeElement.tagName === 'INPUT') {
            if ($('#passwordRecoveryBlock').is(':visible')) {
                $('#sendRecovery').trigger('click');
            } else if ($('#registerBlock').is(':visible')) {
                $('#registerButton').trigger('click');
            } else if ($('#renewBlock').is(':visible')) {
                $('#renewButton').trigger('click');
            } else {
                $('#loginButton').trigger('click');
            }
        }
    });
})();
