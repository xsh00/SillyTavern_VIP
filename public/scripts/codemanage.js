// 邀请码管理系统 JavaScript

let currentCodeType = '';
let invitationCodes = { registrationCodes: [], renewalCodes: [] };
let usageStatistics = {};

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    initializeTabs();
    loadAllData();
});

// 标签页初始化
function initializeTabs() {
    const tabButtons = document.querySelectorAll('.nav-tab');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.getAttribute('data-tab');
            
            // 移除所有活动状态
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // 设置当前活动状态
            button.classList.add('active');
            document.getElementById(tabId).classList.add('active');
            
            // 根据标签页加载相应数据
            if (tabId === 'overview') {
                loadOverviewData();
            } else if (tabId === 'usage') {
                loadUsageData();
            }
        });
    });
}

// 加载所有数据
async function loadAllData() {
    await Promise.all([
        loadCodesData(),
        loadUsageData()
    ]);
    updateOverviewStats();
}

// 加载邀请码数据
async function loadCodesData() {
    try {
        showLoading();
        const response = await fetch('/api/users/invitation-codes', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': await getCSRFToken()
            }
        });

        if (response.ok) {
            invitationCodes = await response.json();
            renderCodesList();
        } else {
            showAlert('加载邀请码数据失败', 'error');
        }
    } catch (error) {
        console.error('加载邀请码数据失败:', error);
        showAlert('网络错误，请稍后重试', 'error');
    } finally {
        hideLoading();
    }
}

// 加载使用统计数据
async function loadUsageData() {
    try {
        const response = await fetch('/api/users/invitation-codes/statistics', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': await getCSRFToken()
            }
        });

        if (response.ok) {
            usageStatistics = await response.json();
            renderUsageStatistics();
            renderUsageChart();
        } else {
            console.error('加载使用统计失败');
        }
    } catch (error) {
        console.error('加载使用统计失败:', error);
    }
}

// 渲染概览统计
function updateOverviewStats() {
    document.getElementById('regCodesCount').textContent = invitationCodes.registrationCodes.length;
    document.getElementById('renewCodesCount').textContent = invitationCodes.renewalCodes.length;
    document.getElementById('todayUsage').textContent = usageStatistics.today?.total || 0;
    document.getElementById('totalUsage').textContent = usageStatistics.total?.total || 0;
}

// 渲染邀请码列表
function renderCodesList() {
    renderRegistrationCodes();
    renderRenewalCodes();
}

// 渲染注册码列表
function renderRegistrationCodes() {
    const container = document.getElementById('regCodesList');
    const codes = invitationCodes.registrationCodes;

    if (codes.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>📝 暂无注册邀请码</h3>
                <p>点击上方按钮添加新的注册邀请码</p>
            </div>
        `;
        return;
    }

    container.innerHTML = codes.map(code => `
        <div class="code-item">
            <span class="code-text">${code}</span>
            <div class="code-actions">
                <button class="btn btn-sm" onclick="copyToClipboard('${code}')" 
                        style="background: #38a169; color: white;">
                    📋 复制
                </button>
                <button class="btn btn-danger btn-sm" onclick="deleteCode('registration', '${code}')">
                    🗑️ 删除
                </button>
            </div>
        </div>
    `).join('');
}

// 渲染续费码列表
function renderRenewalCodes() {
    const container = document.getElementById('renewCodesList');
    const codes = invitationCodes.renewalCodes;

    if (codes.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>🔄 暂无续费邀请码</h3>
                <p>点击上方按钮添加新的续费邀请码</p>
            </div>
        `;
        return;
    }

    container.innerHTML = codes.map(code => `
        <div class="code-item">
            <span class="code-text">${code}</span>
            <div class="code-actions">
                <button class="btn btn-sm" onclick="copyToClipboard('${code}')" 
                        style="background: #38a169; color: white;">
                    📋 复制
                </button>
                <button class="btn btn-danger btn-sm" onclick="deleteCode('renewal', '${code}')">
                    🗑️ 删除
                </button>
            </div>
        </div>
    `).join('');
}

// 渲染使用统计
function renderUsageStatistics() {
    if (!usageStatistics.today) return;

    document.getElementById('todayReg').textContent = usageStatistics.today.registration || 0;
    document.getElementById('todayRenew').textContent = usageStatistics.today.renewal || 0;
    document.getElementById('yesterdayReg').textContent = usageStatistics.yesterday?.registration || 0;
    document.getElementById('yesterdayRenew').textContent = usageStatistics.yesterday?.renewal || 0;

    // 渲染使用记录表格
    const tbody = document.getElementById('usageTableBody');
    const records = usageStatistics.recentUsage || [];

    if (records.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; color: #6c757d; padding: 40px;">
                    暂无使用记录
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = records.map(record => `
        <tr>
            <td><code>${record.code}</code></td>
            <td>
                <span class="badge ${record.type === 'registration' ? 'badge-registration' : 'badge-renewal'}">
                    ${record.type === 'registration' ? '注册' : '续费'}
                </span>
            </td>
            <td>${record.userHandle}</td>
            <td>${record.ip}</td>
            <td>${new Date(record.timestamp).toLocaleString('zh-CN')}</td>
        </tr>
    `).join('');
}

// 渲染使用趋势图表
function renderUsageChart() {
    const canvas = document.getElementById('usageChart');
    const ctx = canvas.getContext('2d');
    const data = usageStatistics.last7Days || [];

    if (data.length === 0) {
        ctx.fillStyle = '#6c757d';
        ctx.font = '16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('暂无数据', canvas.width / 2, canvas.height / 2);
        return;
    }

    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const padding = 40;
    const chartWidth = canvas.width - padding * 2;
    const chartHeight = canvas.height - padding * 2;
    const maxValue = Math.max(...data.map(d => d.total), 1);

    // 绘制坐标轴
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, padding + chartHeight);
    ctx.lineTo(padding + chartWidth, padding + chartHeight);
    ctx.stroke();

    // 绘制数据点和连线
    ctx.strokeStyle = '#667eea';
    ctx.fillStyle = '#667eea';
    ctx.lineWidth = 2;
    ctx.beginPath();

    data.forEach((item, index) => {
        const x = padding + (index / (data.length - 1)) * chartWidth;
        const y = padding + chartHeight - (item.total / maxValue) * chartHeight;

        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }

        // 绘制数据点
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, 2 * Math.PI);
        ctx.fill();
        ctx.restore();
    });

    ctx.stroke();

    // 添加标签
    ctx.fillStyle = '#495057';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    data.forEach((item, index) => {
        const x = padding + (index / (data.length - 1)) * chartWidth;
        const label = new Date(item.date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
        ctx.fillText(label, x, canvas.height - 10);
        
        // 显示数值
        if (item.total > 0) {
            const y = padding + chartHeight - (item.total / maxValue) * chartHeight;
            ctx.fillText(item.total, x, y - 10);
        }
    });
}

// 显示添加邀请码模态框
function showAddCodeModal(type) {
    currentCodeType = type;
    const modal = document.getElementById('addCodeModal');
    const title = document.getElementById('modalTitle');
    
    title.textContent = type === 'registration' ? '添加注册邀请码' : '添加续费邀请码';
    
    // 清空输入框
    document.getElementById('newCodeInput').value = '';
    document.getElementById('prefixInput').value = type === 'registration' ? 'REGISTER' : 'RENEW';
    
    modal.classList.add('show');
}

// 隐藏添加邀请码模态框
function hideAddCodeModal() {
    document.getElementById('addCodeModal').classList.remove('show');
}

// 添加邀请码
async function addCode() {
    const codeInput = document.getElementById('newCodeInput');
    const prefixInput = document.getElementById('prefixInput');
    
    let code = codeInput.value.trim();
    
    // 如果没有输入邀请码，则生成一个
    if (!code) {
        const prefix = prefixInput.value.trim() || 'CODE';
        const generated = await generateCode(currentCodeType, prefix);
        if (!generated) return;
        code = generated;
    }

    try {
        const response = await fetch(`/api/users/invitation-codes/${currentCodeType}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': await getCSRFToken()
            },
            body: JSON.stringify({ code: code })
        });

        if (response.ok) {
            showAlert('邀请码添加成功', 'success');
            hideAddCodeModal();
            await loadCodesData();
            updateOverviewStats();
        } else {
            const error = await response.json();
            showAlert(error.error || '添加失败', 'error');
        }
    } catch (error) {
        console.error('添加邀请码失败:', error);
        showAlert('网络错误，请稍后重试', 'error');
    }
}

// 生成邀请码
async function generateCode(type, prefix) {
    try {
        const response = await fetch('/api/users/invitation-codes/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': await getCSRFToken()
            },
            body: JSON.stringify({ type: type, prefix: prefix })
        });

        if (response.ok) {
            const result = await response.json();
            return result.code;
        } else {
            const error = await response.json();
            showAlert(error.error || '生成失败', 'error');
            return null;
        }
    } catch (error) {
        console.error('生成邀请码失败:', error);
        showAlert('网络错误，请稍后重试', 'error');
        return null;
    }
}

// 批量生成邀请码
async function batchGenerate(type) {
    const countInput = document.getElementById(type === 'registration' ? 'regBatchCount' : 'renewBatchCount');
    const count = parseInt(countInput.value);
    
    if (!count || count < 1 || count > 50) {
        showAlert('请输入1-50之间的数量', 'error');
        return;
    }

    try {
        showLoading();
        const prefix = type === 'registration' ? 'REGISTER' : 'RENEW';
        const promises = [];
        
        for (let i = 0; i < count; i++) {
            promises.push(generateCode(type, prefix));
        }
        
        const results = await Promise.all(promises);
        const successCount = results.filter(result => result).length;
        
        showAlert(`成功生成 ${successCount} 个邀请码`, 'success');
        await loadCodesData();
        updateOverviewStats();
        
        // 重置输入框
        countInput.value = '1';
    } catch (error) {
        console.error('批量生成失败:', error);
        showAlert('批量生成失败', 'error');
    } finally {
        hideLoading();
    }
}

// 删除邀请码
async function deleteCode(type, code) {
    if (!confirm(`确定要删除邀请码 "${code}" 吗？`)) {
        return;
    }

    try {
        const response = await fetch(`/api/users/invitation-codes/${type}/${encodeURIComponent(code)}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': await getCSRFToken()
            }
        });

        if (response.ok) {
            showAlert('邀请码删除成功', 'success');
            await loadCodesData();
            updateOverviewStats();
        } else {
            const error = await response.json();
            showAlert(error.error || '删除失败', 'error');
        }
    } catch (error) {
        console.error('删除邀请码失败:', error);
        showAlert('网络错误，请稍后重试', 'error');
    }
}

// 复制到剪贴板
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showAlert('已复制到剪贴板', 'success');
    } catch (error) {
        // 降级方案
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            showAlert('已复制到剪贴板', 'success');
        } catch (err) {
            showAlert('复制失败，请手动复制', 'error');
        }
        document.body.removeChild(textArea);
    }
}

// 刷新使用数据
async function refreshUsageData() {
    await loadUsageData();
    showAlert('数据已刷新', 'success');
}

// 加载概览数据
function loadOverviewData() {
    updateOverviewStats();
    renderUsageChart();
}

// 显示提示消息
function showAlert(message, type = 'success') {
    const container = document.getElementById('alertContainer');
    const alertId = 'alert-' + Date.now();
    
    const alertHTML = `
        <div id="${alertId}" class="alert alert-${type}" style="margin-bottom: 10px; animation: slideIn 0.3s ease;">
            ${message}
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', alertHTML);
    
    // 3秒后自动删除
    setTimeout(() => {
        const alertElement = document.getElementById(alertId);
        if (alertElement) {
            alertElement.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => alertElement.remove(), 300);
        }
    }, 3000);
}

// 显示加载状态
function showLoading() {
    // 可以在这里添加全局加载指示器
}

// 隐藏加载状态
function hideLoading() {
    // 可以在这里隐藏全局加载指示器
}

// 获取CSRF令牌
async function getCSRFToken() {
    try {
        const response = await fetch('/csrf-token');
        const data = await response.json();
        return data.token;
    } catch (error) {
        console.error('获取CSRF令牌失败:', error);
        return '';
    }
}

// 添加动画样式
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// 点击模态框外部关闭模态框
document.addEventListener('click', function(e) {
    const modal = document.getElementById('addCodeModal');
    if (e.target === modal) {
        hideAddCodeModal();
    }
});

// ESC键关闭模态框
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        hideAddCodeModal();
    }
}); 