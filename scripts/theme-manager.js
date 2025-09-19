/**
 * 테마 관리 모듈
 * 다크/라이트 테마 전환, 시스템 테마 감지, 테마 설정 저장 기능을 제공합니다.
 */

class ThemeManager {
    constructor() {
        this.currentTheme = 'light';
        this.systemTheme = 'light';
        this.autoTheme = false;
        this.themeTransition = true;
        
        // DOM 요소 참조
        this.themeToggle = null;
        this.htmlElement = null;
        
        // 이벤트 리스너 바인딩
        this.handleThemeToggle = this.handleThemeToggle.bind(this);
        this.handleSystemThemeChange = this.handleSystemThemeChange.bind(this);
        
        this.init();
    }

    /**
     * 테마 시스템을 초기화합니다.
     */
    init() {
        this.initializeDOMElements();
        this.detectSystemTheme();
        this.loadThemeSettings();
        this.attachEventListeners();
        this.applyTheme(this.currentTheme);
    }

    /**
     * DOM 요소들을 초기화합니다.
     */
    initializeDOMElements() {
        this.themeToggle = document.getElementById('theme-toggle');
        this.htmlElement = document.documentElement;
        
        if (!this.themeToggle) {
            console.warn('테마 토글 버튼을 찾을 수 없습니다.');
        }
    }

    /**
     * 시스템 테마를 감지합니다.
     */
    detectSystemTheme() {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            this.systemTheme = 'dark';
        } else {
            this.systemTheme = 'light';
        }
    }

    /**
     * 이벤트 리스너를 등록합니다.
     */
    attachEventListeners() {
        if (this.themeToggle) {
            this.themeToggle.addEventListener('click', this.handleThemeToggle);
        }

        // 시스템 테마 변경 감지
        if (window.matchMedia) {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            mediaQuery.addEventListener('change', this.handleSystemThemeChange);
        }

        // 키보드 단축키 (Ctrl+Shift+T)
        document.addEventListener('keydown', (event) => {
            if (event.ctrlKey && event.shiftKey && event.key === 'T') {
                event.preventDefault();
                this.toggleTheme();
            }
        });
    }

    /**
     * 테마 토글을 처리합니다.
     */
    handleThemeToggle() {
        this.toggleTheme();
    }

    /**
     * 시스템 테마 변경을 처리합니다.
     * @param {MediaQueryListEvent} event - 미디어 쿼리 이벤트
     */
    handleSystemThemeChange(event) {
        this.systemTheme = event.matches ? 'dark' : 'light';
        
        if (this.autoTheme) {
            this.applyTheme(this.systemTheme);
        }
    }

    /**
     * 테마를 전환합니다.
     */
    toggleTheme() {
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.setTheme(newTheme);
    }

    /**
     * 테마를 설정합니다.
     * @param {string} theme - 테마 ('light' 또는 'dark')
     */
    setTheme(theme) {
        if (theme !== 'light' && theme !== 'dark') {
            console.warn('유효하지 않은 테마:', theme);
            return;
        }

        this.currentTheme = theme;
        this.autoTheme = false; // 수동 설정 시 자동 모드 해제
        
        this.applyTheme(theme);
        this.updateThemeToggle();
        this.saveThemeSettings();
        
        // 테마 변경 이벤트 발생
        this.dispatchThemeChangeEvent(theme);
    }

    /**
     * 자동 테마 모드를 설정합니다.
     * @param {boolean} enabled - 자동 모드 활성화 여부
     */
    setAutoTheme(enabled) {
        this.autoTheme = enabled;
        
        if (enabled) {
            this.applyTheme(this.systemTheme);
        }
        
        this.saveThemeSettings();
    }

    /**
     * 테마를 적용합니다.
     * @param {string} theme - 적용할 테마
     */
    applyTheme(theme) {
        if (!this.htmlElement) return;

        // 테마 전환 애니메이션
        if (this.themeTransition) {
            this.htmlElement.style.transition = 'background-color 0.3s ease, color 0.3s ease';
        }

        // data-theme 속성 설정
        this.htmlElement.setAttribute('data-theme', theme);
        
        // 메타 태그 업데이트 (SEO 및 브라우저 최적화)
        this.updateMetaThemeColor(theme);
        
        // 테마 전환 애니메이션 제거
        if (this.themeTransition) {
            setTimeout(() => {
                this.htmlElement.style.transition = '';
            }, 300);
        }
    }

    /**
     * 메타 테마 컬러를 업데이트합니다.
     * @param {string} theme - 테마
     */
    updateMetaThemeColor(theme) {
        let metaThemeColor = document.querySelector('meta[name="theme-color"]');
        
        if (!metaThemeColor) {
            metaThemeColor = document.createElement('meta');
            metaThemeColor.name = 'theme-color';
            document.head.appendChild(metaThemeColor);
        }
        
        // 테마별 색상 설정
        const colors = {
            light: '#ffffff',
            dark: '#0f172a'
        };
        
        metaThemeColor.content = colors[theme] || colors.light;
    }

    /**
     * 테마 토글 버튼을 업데이트합니다.
     */
    updateThemeToggle() {
        if (!this.themeToggle) return;

        const icons = {
            light: '🌙',
            dark: '☀️'
        };
        
        this.themeToggle.textContent = icons[this.currentTheme] || icons.light;
        this.themeToggle.title = `현재: ${this.currentTheme === 'light' ? '라이트' : '다크'} 테마 (클릭하여 전환)`;
    }

    /**
     * 테마 설정을 저장합니다.
     */
    saveThemeSettings() {
        try {
            const settings = {
                currentTheme: this.currentTheme,
                autoTheme: this.autoTheme,
                systemTheme: this.systemTheme
            };
            localStorage.setItem('jsonTableThemeSettings', JSON.stringify(settings));
        } catch (error) {
            console.warn('테마 설정 저장 실패:', error);
        }
    }

    /**
     * 테마 설정을 로드합니다.
     */
    loadThemeSettings() {
        try {
            const saved = localStorage.getItem('jsonTableThemeSettings');
            if (saved) {
                const settings = JSON.parse(saved);
                this.currentTheme = settings.currentTheme || 'light';
                this.autoTheme = settings.autoTheme || false;
                this.systemTheme = settings.systemTheme || 'light';
            } else {
                // 저장된 설정이 없으면 시스템 테마 사용
                this.currentTheme = this.systemTheme;
                this.autoTheme = true;
            }
        } catch (error) {
            console.warn('테마 설정 로드 실패:', error);
            this.currentTheme = this.systemTheme;
            this.autoTheme = true;
        }
    }

    /**
     * 테마 변경 이벤트를 발생시킵니다.
     * @param {string} theme - 변경된 테마
     */
    dispatchThemeChangeEvent(theme) {
        const event = new CustomEvent('themechange', {
            detail: {
                theme: theme,
                previousTheme: this.currentTheme === 'light' ? 'dark' : 'light',
                autoTheme: this.autoTheme,
                systemTheme: this.systemTheme
            }
        });
        
        document.dispatchEvent(event);
    }

    /**
     * 현재 테마를 가져옵니다.
     * @returns {string} 현재 테마
     */
    getCurrentTheme() {
        return this.currentTheme;
    }

    /**
     * 시스템 테마를 가져옵니다.
     * @returns {string} 시스템 테마
     */
    getSystemTheme() {
        return this.systemTheme;
    }

    /**
     * 자동 테마 모드 여부를 가져옵니다.
     * @returns {boolean} 자동 테마 모드 여부
     */
    isAutoTheme() {
        return this.autoTheme;
    }

    /**
     * 테마 전환 애니메이션을 설정합니다.
     * @param {boolean} enabled - 애니메이션 활성화 여부
     */
    setThemeTransition(enabled) {
        this.themeTransition = enabled;
    }

    /**
     * 테마 설정을 초기화합니다.
     */
    resetThemeSettings() {
        this.currentTheme = this.systemTheme;
        this.autoTheme = true;
        this.applyTheme(this.currentTheme);
        this.updateThemeToggle();
        this.saveThemeSettings();
    }

    /**
     * 테마별 CSS 변수를 동적으로 업데이트합니다.
     * @param {Object} customColors - 사용자 정의 색상
     */
    updateCustomColors(customColors) {
        if (!this.htmlElement) return;

        const root = this.htmlElement;
        
        Object.entries(customColors).forEach(([property, value]) => {
            root.style.setProperty(`--${property}`, value);
        });
    }

    /**
     * 고대비 모드를 설정합니다.
     * @param {boolean} enabled - 고대비 모드 활성화 여부
     */
    setHighContrastMode(enabled) {
        if (enabled) {
            this.htmlElement.setAttribute('data-high-contrast', 'true');
        } else {
            this.htmlElement.removeAttribute('data-high-contrast');
        }
    }

    /**
     * 색맹 사용자를 위한 색상 보정을 설정합니다.
     * @param {string} type - 색맹 타입 ('protanopia', 'deuteranopia', 'tritanopia')
     */
    setColorBlindSupport(type) {
        if (type && ['protanopia', 'deuteranopia', 'tritanopia'].includes(type)) {
            this.htmlElement.setAttribute('data-colorblind', type);
        } else {
            this.htmlElement.removeAttribute('data-colorblind');
        }
    }

    /**
     * 테마 정보를 가져옵니다.
     * @returns {Object} 테마 정보
     */
    getThemeInfo() {
        return {
            currentTheme: this.currentTheme,
            systemTheme: this.systemTheme,
            autoTheme: this.autoTheme,
            supportedThemes: ['light', 'dark'],
            features: {
                systemThemeDetection: !!window.matchMedia,
                localStorage: !!window.localStorage,
                customProperties: !!CSS.supports('color', 'var(--test)')
            }
        };
    }

    /**
     * 테마 미리보기를 제공합니다.
     * @param {string} theme - 미리보기할 테마
     * @param {number} duration - 미리보기 지속 시간 (밀리초)
     */
    previewTheme(theme, duration = 2000) {
        const originalTheme = this.currentTheme;
        
        this.applyTheme(theme);
        
        setTimeout(() => {
            this.applyTheme(originalTheme);
        }, duration);
    }

    /**
     * 테마 통계를 가져옵니다.
     * @returns {Object} 테마 통계
     */
    getThemeStats() {
        try {
            const saved = localStorage.getItem('jsonTableThemeSettings');
            const settings = saved ? JSON.parse(saved) : {};
            
            return {
                currentTheme: this.currentTheme,
                autoTheme: this.autoTheme,
                systemTheme: this.systemTheme,
                hasCustomSettings: !!saved,
                lastUpdated: settings.lastUpdated || null
            };
        } catch (error) {
            console.warn('테마 통계 로드 실패:', error);
            return {
                currentTheme: this.currentTheme,
                autoTheme: this.autoTheme,
                systemTheme: this.systemTheme,
                hasCustomSettings: false,
                lastUpdated: null
            };
        }
    }
}

// 전역에서 사용할 수 있도록 내보내기
window.ThemeManager = ThemeManager;
