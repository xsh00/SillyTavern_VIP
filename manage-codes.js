#!/usr/bin/env node

/**
 * 邀请码管理工具
 * 用于管理SillyTavern的注册和续费邀请码
 */

import readline from 'node:readline';
import { 
    getRegistrationCodes, 
    getRenewalCodes,
    addRegistrationCode,
    addRenewalCode,
    removeRegistrationCode,
    removeRenewalCode,
    generateInvitationCode
} from './src/invitation-codes.js';

/**
 * 显示当前邀请码
 */
function showCodes() {
    console.log('\n=== 当前邀请码配置 ===');
    
    const registrationCodes = getRegistrationCodes();
    console.log('\n注册邀请码:');
    if (registrationCodes.length > 0) {
        registrationCodes.forEach((code, index) => {
            console.log(`  ${index + 1}. ${code}`);
        });
    } else {
        console.log('  暂无注册邀请码');
    }

    const renewalCodes = getRenewalCodes();
    console.log('\n续费邀请码:');
    if (renewalCodes.length > 0) {
        renewalCodes.forEach((code, index) => {
            console.log(`  ${index + 1}. ${code}`);
        });
    } else {
        console.log('  暂无续费邀请码');
    }
}

/**
 * 主菜单
 */
async function showMenu() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const question = (query) => new Promise((resolve) => rl.question(query, resolve));

    while (true) {
        console.log('\n=== SillyTavern 邀请码管理工具 ===');
        console.log('1. 查看当前邀请码');
        console.log('2. 添加注册邀请码');
        console.log('3. 添加续费邀请码');
        console.log('4. 删除注册邀请码');
        console.log('5. 删除续费邀请码');
        console.log('6. 生成随机注册邀请码');
        console.log('7. 生成随机续费邀请码');
        console.log('8. 退出');
        
        const choice = await question('\n请选择操作 (1-8): ');
        
        switch (choice.trim()) {
            case '1':
                showCodes();
                break;
                
            case '2':
                const regCode = await question('请输入注册邀请码: ');
                if (regCode.trim()) {
                    if (addRegistrationCode(regCode.trim())) {
                        console.log('注册邀请码添加成功');
                    } else {
                        console.log('该注册邀请码已存在');
                    }
                }
                break;
                
            case '3':
                const renewCode = await question('请输入续费邀请码: ');
                if (renewCode.trim()) {
                    if (addRenewalCode(renewCode.trim())) {
                        console.log('续费邀请码添加成功');
                    } else {
                        console.log('该续费邀请码已存在');
                    }
                }
                break;
                
            case '4':
                const delRegCode = await question('请输入要删除的注册邀请码: ');
                if (delRegCode.trim()) {
                    if (removeRegistrationCode(delRegCode.trim())) {
                        console.log('注册邀请码删除成功');
                    } else {
                        console.log('未找到该注册邀请码');
                    }
                }
                break;
                
            case '5':
                const delRenewCode = await question('请输入要删除的续费邀请码: ');
                if (delRenewCode.trim()) {
                    if (removeRenewalCode(delRenewCode.trim())) {
                        console.log('续费邀请码删除成功');
                    } else {
                        console.log('未找到该续费邀请码');
                    }
                }
                break;
                
            case '6':
                const newRegCode = generateInvitationCode('REGISTER');
                console.log(`生成的注册邀请码: ${newRegCode}`);
                const addReg = await question('是否添加到配置文件? (y/n): ');
                if (addReg.toLowerCase() === 'y') {
                    if (addRegistrationCode(newRegCode)) {
                        console.log('注册邀请码添加成功');
                    } else {
                        console.log('该注册邀请码已存在');
                    }
                }
                break;
                
            case '7':
                const newRenewCode = generateInvitationCode('RENEW');
                console.log(`生成的续费邀请码: ${newRenewCode}`);
                const addRenew = await question('是否添加到配置文件? (y/n): ');
                if (addRenew.toLowerCase() === 'y') {
                    if (addRenewalCode(newRenewCode)) {
                        console.log('续费邀请码添加成功');
                    } else {
                        console.log('该续费邀请码已存在');
                    }
                }
                break;
                
            case '8':
                console.log('退出管理工具');
                rl.close();
                process.exit(0);
                break;
                
            default:
                console.log('无效选择，请重新输入');
        }
    }
}

// 启动管理工具
if (import.meta.url === `file://${process.argv[1]}`) {
    showMenu().catch(console.error);
} 