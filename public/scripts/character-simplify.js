/**
 * SillyTavern 角色管理界面简化脚本
 * 功能：1. 添加高级功能折叠区域 2. 设置默认表格视图 3. 简化界面
 */

(function() {
    'use strict';

    // 等待DOM加载完成
    function waitForElement(selector, callback) {
        const element = document.querySelector(selector);
        if (element) {
            callback(element);
        } else {
            setTimeout(() => waitForElement(selector, callback), 100);
        }
    }

    // 创建高级功能折叠区域
    function createAdvancedControlsSection() {
        const charListFixedTop = document.getElementById('charListFixedTop');
        if (!charListFixedTop) return;

        // 创建折叠容器
        const advancedControls = document.createElement('div');
        advancedControls.className = 'character-advanced-controls';
        advancedControls.innerHTML = `
            <button class="character-advanced-toggle collapsed" type="button">
                <span>高级功能</span>
                <i class="toggle-icon fa-solid fa-chevron-down"></i>
            </button>
                         <div class="character-advanced-content">
                 <div class="advanced-buttons-row-1">
                     <div id="advanced_rm_button_create" class="menu_button fa-solid fa-user-plus" title="创建新角色"></div>
                     <div id="advanced_external_import_button" class="menu_button fa-solid fa-cloud-arrow-down" title="从外部URL导入内容"></div>
                     <div id="advanced_rm_button_group_chats" class="menu_button fa-solid fa-users-gear" title="创建新群聊"></div>
                 </div>
                 <div class="advanced-buttons-row-2">
                     <i id="advanced_charListGridToggle" class="fa-solid fa-table-cells-large menu_button" title="切换角色网格视图"></i>
                     <i id="advanced_bulkEditButton" class="fa-solid fa-edit menu_button" title="批量编辑角色"></i>
                 </div>
                 <div class="advanced-tag-controls">
                     <label>标签过滤:</label>
                     <div id="advanced_tag_filters" class="advanced-tag-area"></div>
                 </div>
             </div>
        `;

        // 将折叠区域插入到搜索表单之前
        const searchForm = document.getElementById('form_character_search_form');
        if (searchForm) {
            searchForm.parentNode.insertBefore(advancedControls, searchForm);
        }

        // 设置折叠切换功能
        setupToggleFunction(advancedControls);

        // 将原始按钮的功能复制到新按钮
        copyButtonFunctionality();
    }

    // 设置折叠切换功能
    function setupToggleFunction(container) {
        const toggle = container.querySelector('.character-advanced-toggle');
        const content = container.querySelector('.character-advanced-content');

        if (toggle && content) {
            toggle.addEventListener('click', function() {
                const isCollapsed = this.classList.contains('collapsed');
                
                if (isCollapsed) {
                    this.classList.remove('collapsed');
                    content.classList.add('show');
                } else {
                    this.classList.add('collapsed');
                    content.classList.remove('show');
                }
            });
        }
    }

    // 复制原始按钮的功能到新按钮
    function copyButtonFunctionality() {
        // 创建新角色
        const originalCreate = document.getElementById('rm_button_create');
        const newCreate = document.getElementById('advanced_rm_button_create');
        if (originalCreate && newCreate) {
            newCreate.addEventListener('click', () => originalCreate.click());
        }

        // 外部导入
        const originalExternal = document.getElementById('external_import_button');
        const newExternal = document.getElementById('advanced_external_import_button');
        if (originalExternal && newExternal) {
            newExternal.addEventListener('click', () => originalExternal.click());
        }

        // 创建群聊
        const originalGroup = document.getElementById('rm_button_group_chats');
        const newGroup = document.getElementById('advanced_rm_button_group_chats');
        if (originalGroup && newGroup) {
            newGroup.addEventListener('click', () => originalGroup.click());
        }

        // 网格切换
        const originalGrid = document.getElementById('charListGridToggle');
        const newGrid = document.getElementById('advanced_charListGridToggle');
        if (originalGrid && newGrid) {
            newGrid.addEventListener('click', () => originalGrid.click());
            // 同步图标状态
            const syncGridIcon = () => {
                if (originalGrid.classList.contains('fa-table-cells-large')) {
                    newGrid.className = 'fa-solid fa-table-cells-large menu_button';
                } else {
                    newGrid.className = 'fa-solid fa-list menu_button';
                }
            };
            syncGridIcon();
            // 监听原始按钮的变化
            const observer = new MutationObserver(syncGridIcon);
            observer.observe(originalGrid, { attributes: true, attributeFilter: ['class'] });
        }

        // 批量编辑
        const originalBulk = document.getElementById('bulkEditButton');
        const newBulk = document.getElementById('advanced_bulkEditButton');
        if (originalBulk && newBulk) {
            newBulk.addEventListener('click', () => originalBulk.click());
        }

        // 移动标签控制到高级功能区域
        const originalTagControls = document.querySelector('.rm_tag_controls');
        const advancedTagArea = document.getElementById('advanced_tag_filters');
        if (originalTagControls && advancedTagArea) {
            // 克隆原始标签控制元素
            const clonedTagControls = originalTagControls.cloneNode(true);
            if (clonedTagControls instanceof HTMLElement) {
                clonedTagControls.style.display = 'block';
                advancedTagArea.appendChild(clonedTagControls);
            }
        }
    }

    // 设置默认网格视图
    function setDefaultGridView() {
        setTimeout(() => {
            // 检查body是否有charListGrid类
            const hasCharListGrid = document.body.classList.contains('charListGrid');
            
            if (!hasCharListGrid) {
                // 如果没有网格视图类，触发切换
                const gridToggle = document.getElementById('charListGridToggle');
                if (gridToggle) {
                    gridToggle.click();
                    console.log('已切换到网格视图');
                }
            } else {
                console.log('已经是网格视图');
            }
            
            // 确保power_user设置正确（如果存在的话）
            if (typeof window['power_user'] !== 'undefined') {
                window['power_user'].charListGrid = true;
            }
        }, 500);
    }

    // 添加界面改进
    function improveInterface() {
        // 为导入按钮添加更明显的样式
        const importButton = document.getElementById('character_import_button');
        if (importButton) {
            importButton.style.backgroundColor = '#0066cc';
            importButton.style.color = 'white';
            importButton.style.fontWeight = 'bold';
            importButton.style.border = '1px solid #0066cc';
        }

        // 简化搜索区域
        const searchForm = document.getElementById('form_character_search_form');
        if (searchForm) {
            searchForm.style.gap = '5px';
            searchForm.style.alignItems = 'center';
        }
    }

    // 监听页面变化，确保在切换到角色管理面板时应用设置
    function observeCharacterPanel() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                    const target = mutation.target;
                    if (target instanceof HTMLElement && target.id === 'rm_characters_block' && target.style.display !== 'none') {
                        // 角色管理面板显示时，应用设置
                        setTimeout(() => {
                            if (!document.querySelector('.character-advanced-controls')) {
                                createAdvancedControlsSection();
                            }
                            setDefaultGridView();
                            improveInterface();
                        }, 100);
                    }
                }
            });
        });

        const charBlock = document.getElementById('rm_characters_block');
        if (charBlock) {
            observer.observe(charBlock, { attributes: true, attributeFilter: ['style'] });
        }
    }

    // 初始化函数
    function initialize() {
        waitForElement('#rm_characters_block', () => {
            // 如果角色管理面板已经显示，立即初始化
            const charBlock = document.getElementById('rm_characters_block');
            if (charBlock && charBlock.style.display !== 'none') {
                createAdvancedControlsSection();
                setDefaultGridView();
                improveInterface();
            }

            // 设置观察器监听面板切换
            observeCharacterPanel();
        });
    }

    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

    // 立即尝试设置网格视图（如果页面已加载）
    if (document.readyState !== 'loading') {
        // 给页面一点时间加载
        setTimeout(() => {
            if (!document.body.classList.contains('charListGrid')) {
                document.body.classList.add('charListGrid');
                console.log('设置默认网格视图');
            }
        }, 100);
    }

})(); 