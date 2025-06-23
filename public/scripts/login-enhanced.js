/**
 * 登录页面增强效果
 */

// 页面加载完成后初始化
$(document).ready(function() {
    // 添加页面加载动画
    addPageLoadAnimation();
    
    // 添加输入框焦点效果
    addInputFocusEffects();
    
    // 添加按钮点击效果
    addButtonClickEffects();
    
    // 添加错误消息动画
    addErrorAnimation();
});

/**
 * 添加页面加载动画
 */
function addPageLoadAnimation() {
    // 为登录卡片添加淡入动画
    $('#dialogue_popup').addClass('slideInUp');
    
    // 为logo添加缩放动画
    setTimeout(() => {
        $('.logo').addClass('success-animation');
    }, 300);
}

/**
 * 添加输入框焦点效果
 */
function addInputFocusEffects() {
    $('.text_pole').on('focus', function() {
        $(this).addClass('focused');
    }).on('blur', function() {
        $(this).removeClass('focused');
    });
}

/**
 * 添加按钮点击效果
 */
function addButtonClickEffects() {
    $('.menu_button').on('click', function() {
        // 添加点击波纹效果
        const button = $(this);
        const ripple = $('<span class="ripple"></span>');
        
        button.append(ripple);
        
        setTimeout(() => {
            ripple.remove();
        }, 600);
    });
}

/**
 * 添加错误消息动画
 */
function addErrorAnimation() {
    // 监听错误消息的变化
    const errorElement = $('#errorMessage');
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'childList' && errorElement.text().trim() !== '') {
                errorElement.addClass('error-animation');
                setTimeout(() => {
                    errorElement.removeClass('error-animation');
                }, 500);
            }
        });
    });
    
    observer.observe(errorElement[0], { childList: true, subtree: true });
}

/**
 * 显示加载状态
 */
function showLoading(buttonElement) {
    const originalText = buttonElement.text();
    buttonElement.html('<span class="loading-indicator">处理中...</span>');
    buttonElement.prop('disabled', true);
    
    return function() {
        buttonElement.text(originalText);
        buttonElement.prop('disabled', false);
    };
}

/**
 * 显示成功状态
 */
function showSuccess(element) {
    element.addClass('success-animation');
    setTimeout(() => {
        element.removeClass('success-animation');
    }, 600);
}

/**
 * 添加用户选择卡片的悬停效果
 */
function enhanceUserSelectCards() {
    $('.userSelect').on('mouseenter', function() {
        $(this).addClass('hovered');
    }).on('mouseleave', function() {
        $(this).removeClass('hovered');
    });
}

/**
 * 添加键盘导航支持
 */
function addKeyboardNavigation() {
    $(document).on('keydown', function(e) {
        // Enter键提交表单
        if (e.key === 'Enter') {
            const focusedElement = $(':focus');
            if (focusedElement.hasClass('text_pole')) {
                const nextInput = focusedElement.next('.text_pole');
                if (nextInput.length > 0) {
                    nextInput.focus();
                } else {
                    // 如果没有下一个输入框，尝试点击登录按钮
                    $('#loginButton').click();
                }
            }
        }
        
        // Escape键清除错误消息
        if (e.key === 'Escape') {
            $('#errorMessage').text('').hide();
        }
    });
}

/**
 * 添加响应式调整
 */
function addResponsiveAdjustments() {
    function adjustForScreenSize() {
        const width = $(window).width();
        const height = $(window).height();
        
        if (width < 480) {
            // 小屏幕优化
            $('#dialogue_popup').addClass('mobile-optimized');
        } else {
            $('#dialogue_popup').removeClass('mobile-optimized');
        }
        
        if (height < 600) {
            // 低高度屏幕优化
            $('#dialogue_popup').addClass('compact-mode');
        } else {
            $('#dialogue_popup').removeClass('compact-mode');
        }
    }
    
    // 初始调整
    adjustForScreenSize();
    
    // 窗口大小改变时调整
    $(window).on('resize', adjustForScreenSize);
}

/**
 * 添加主题检测
 */
function addThemeDetection() {
    // 检测系统主题偏好
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        $('body').addClass('dark-theme');
    }
    
    // 监听主题变化
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(e) {
        if (e.matches) {
            $('body').addClass('dark-theme');
        } else {
            $('body').removeClass('dark-theme');
        }
    });
}

/**
 * 添加可访问性支持
 */
function addAccessibilitySupport() {
    // 添加ARIA标签
    $('.text_pole').each(function() {
        const input = $(this);
        const placeholder = input.attr('placeholder');
        if (placeholder) {
            input.attr('aria-label', placeholder);
        }
    });
    
    // 添加焦点指示器
    $('.menu_button, .userSelect').attr('tabindex', '0');
    
    // 添加键盘焦点样式
    $('.menu_button, .userSelect').on('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            $(this).click();
        }
    });
}

// 初始化所有增强功能
$(document).ready(function() {
    addPageLoadAnimation();
    addInputFocusEffects();
    addButtonClickEffects();
    addErrorAnimation();
    enhanceUserSelectCards();
    addKeyboardNavigation();
    addResponsiveAdjustments();
    addThemeDetection();
    addAccessibilitySupport();
}); 