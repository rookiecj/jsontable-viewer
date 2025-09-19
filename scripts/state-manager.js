/**
 * 상태 관리 모듈
 * 로컬 스토리지를 활용한 상태 저장/복원 기능을 제공합니다.
 */

class StateManager {
    constructor() {
        this.storageKey = 'json-table-viewer-state';
        this.maxStorageSize = 5 * 1024 * 1024; // 5MB 제한
        this.autoSaveDelay = 1000; // 1초 지연
        this.autoSaveTimer = null;
    }

    /**
     * 상태를 저장합니다.
     * @param {Object} state - 저장할 상태 객체
     * @returns {boolean} 저장 성공 여부
     */
    saveState(state) {
        try {
            // 상태 객체 검증
            if (!this.validateState(state)) {
                console.warn('유효하지 않은 상태 객체입니다.');
                return false;
            }

            // 상태 객체에 타임스탬프 추가
            const stateWithTimestamp = {
                ...state,
                lastUpdated: new Date().toISOString()
            };

            // JSON 문자열로 변환
            const stateString = JSON.stringify(stateWithTimestamp);

            // 저장소 크기 확인
            if (stateString.length > this.maxStorageSize) {
                console.warn('저장소 크기 제한을 초과했습니다.');
                return false;
            }

            // 로컬 스토리지에 저장
            localStorage.setItem(this.storageKey, stateString);
            
            console.log('상태가 성공적으로 저장되었습니다.');
            return true;

        } catch (error) {
            console.error('상태 저장 중 오류가 발생했습니다:', error);
            this.handleStorageError(error);
            return false;
        }
    }

    /**
     * 상태를 로드합니다.
     * @returns {Object|null} 로드된 상태 객체 또는 null
     */
    loadState() {
        try {
            const stateString = localStorage.getItem(this.storageKey);
            
            if (!stateString) {
                console.log('저장된 상태가 없습니다.');
                return null;
            }

            const state = JSON.parse(stateString);

            // 상태 객체 검증
            if (!this.validateState(state)) {
                console.warn('저장된 상태가 유효하지 않습니다.');
                this.clearState();
                return null;
            }

            console.log('상태가 성공적으로 로드되었습니다.');
            return state;

        } catch (error) {
            console.error('상태 로드 중 오류가 발생했습니다:', error);
            this.handleStorageError(error);
            return null;
        }
    }

    /**
     * 상태를 삭제합니다.
     * @returns {boolean} 삭제 성공 여부
     */
    clearState() {
        try {
            localStorage.removeItem(this.storageKey);
            console.log('상태가 성공적으로 삭제되었습니다.');
            return true;
        } catch (error) {
            console.error('상태 삭제 중 오류가 발생했습니다:', error);
            return false;
        }
    }

    /**
     * 자동 저장을 설정합니다.
     * @param {Object} state - 저장할 상태 객체
     */
    autoSave(state) {
        // 기존 타이머 취소
        if (this.autoSaveTimer) {
            clearTimeout(this.autoSaveTimer);
        }

        // 새로운 타이머 설정
        this.autoSaveTimer = setTimeout(() => {
            this.saveState(state);
        }, this.autoSaveDelay);
    }

    /**
     * 상태 객체의 유효성을 검증합니다.
     * @param {Object} state - 검증할 상태 객체
     * @returns {boolean} 유효성 여부
     */
    validateState(state) {
        if (!state || typeof state !== 'object') {
            return false;
        }

        // 필수 필드 확인
        const requiredFields = ['jsonInput'];
        for (const field of requiredFields) {
            if (!(field in state)) {
                return false;
            }
        }

        // jsonInput이 문자열인지 확인
        if (typeof state.jsonInput !== 'string') {
            return false;
        }

        // tableOptions가 객체인지 확인 (있는 경우)
        if (state.tableOptions && typeof state.tableOptions !== 'object') {
            return false;
        }

        return true;
    }

    /**
     * 저장소 오류를 처리합니다.
     * @param {Error} error - 오류 객체
     */
    handleStorageError(error) {
        if (error.name === 'QuotaExceededError') {
            console.error('저장소 용량이 부족합니다. 일부 데이터를 삭제해주세요.');
            this.showStorageError('저장소 용량이 부족합니다. 브라우저 설정에서 저장소를 정리해주세요.');
        } else if (error.name === 'SecurityError') {
            console.error('저장소 접근이 차단되었습니다.');
            this.showStorageError('저장소 접근이 차단되었습니다. 브라우저 설정을 확인해주세요.');
        } else {
            console.error('저장소 오류:', error.message);
            this.showStorageError('저장소 오류가 발생했습니다: ' + error.message);
        }
    }

    /**
     * 저장소 오류 메시지를 표시합니다.
     * @param {string} message - 오류 메시지
     */
    showStorageError(message) {
        // 간단한 알림 표시 (향후 토스트 알림으로 개선 가능)
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #dc2626;
            color: white;
            padding: 12px 16px;
            border-radius: 8px;
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
            z-index: 1000;
            max-width: 300px;
            font-size: 14px;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // 5초 후 자동 제거
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
    }

    /**
     * 저장소 사용량을 확인합니다.
     * @returns {Object} 저장소 사용량 정보
     */
    getStorageUsage() {
        try {
            let totalSize = 0;
            let itemCount = 0;

            for (let key in localStorage) {
                if (localStorage.hasOwnProperty(key)) {
                    const value = localStorage.getItem(key);
                    totalSize += key.length + value.length;
                    itemCount++;
                }
            }

            return {
                totalSize: totalSize,
                itemCount: itemCount,
                maxSize: this.maxStorageSize,
                usagePercent: (totalSize / this.maxStorageSize) * 100
            };
        } catch (error) {
            console.error('저장소 사용량 확인 중 오류:', error);
            return null;
        }
    }

    /**
     * 저장소를 정리합니다.
     * @param {number} maxAge - 최대 보관 기간 (밀리초)
     * @returns {number} 삭제된 항목 수
     */
    cleanupStorage(maxAge = 30 * 24 * 60 * 60 * 1000) { // 기본 30일
        try {
            const now = Date.now();
            let deletedCount = 0;

            for (let key in localStorage) {
                if (localStorage.hasOwnProperty(key)) {
                    try {
                        const value = localStorage.getItem(key);
                        const data = JSON.parse(value);
                        
                        if (data.lastUpdated) {
                            const lastUpdated = new Date(data.lastUpdated).getTime();
                            if (now - lastUpdated > maxAge) {
                                localStorage.removeItem(key);
                                deletedCount++;
                            }
                        }
                    } catch (error) {
                        // JSON 파싱 실패 시 삭제
                        localStorage.removeItem(key);
                        deletedCount++;
                    }
                }
            }

            console.log(`${deletedCount}개의 오래된 항목이 삭제되었습니다.`);
            return deletedCount;
        } catch (error) {
            console.error('저장소 정리 중 오류:', error);
            return 0;
        }
    }

    /**
     * 상태를 내보냅니다.
     * @returns {string} JSON 문자열로 변환된 상태
     */
    exportState() {
        try {
            const state = this.loadState();
            if (!state) {
                return null;
            }
            return JSON.stringify(state, null, 2);
        } catch (error) {
            console.error('상태 내보내기 중 오류:', error);
            return null;
        }
    }

    /**
     * 상태를 가져옵니다.
     * @param {string} stateJson - JSON 문자열로 된 상태
     * @returns {boolean} 가져오기 성공 여부
     */
    importState(stateJson) {
        try {
            const state = JSON.parse(stateJson);
            if (!this.validateState(state)) {
                console.warn('가져올 상태가 유효하지 않습니다.');
                return false;
            }
            return this.saveState(state);
        } catch (error) {
            console.error('상태 가져오기 중 오류:', error);
            return false;
        }
    }

    /**
     * 기본 상태 객체를 생성합니다.
     * @returns {Object} 기본 상태 객체
     */
    createDefaultState() {
        return {
            jsonInput: '',
            tableOptions: {
                sortColumn: null,
                sortDirection: 'asc',
                searchTerm: ''
            },
            lastUpdated: new Date().toISOString()
        };
    }

    /**
     * 상태 변경을 감지합니다.
     * @param {Object} currentState - 현재 상태
     * @param {Object} previousState - 이전 상태
     * @returns {boolean} 변경 여부
     */
    hasStateChanged(currentState, previousState) {
        if (!previousState) return true;
        
        return (
            currentState.jsonInput !== previousState.jsonInput ||
            JSON.stringify(currentState.tableOptions) !== JSON.stringify(previousState.tableOptions)
        );
    }

    /**
     * 상태 백업을 생성합니다.
     * @returns {Object} 백업 정보
     */
    createBackup() {
        try {
            const state = this.loadState();
            if (!state) {
                return null;
            }

            const backup = {
                data: state,
                timestamp: new Date().toISOString(),
                version: '1.0'
            };

            return backup;
        } catch (error) {
            console.error('백업 생성 중 오류:', error);
            return null;
        }
    }

    /**
     * 백업에서 상태를 복원합니다.
     * @param {Object} backup - 백업 객체
     * @returns {boolean} 복원 성공 여부
     */
    restoreFromBackup(backup) {
        try {
            if (!backup || !backup.data) {
                console.warn('유효하지 않은 백업입니다.');
                return false;
            }

            return this.saveState(backup.data);
        } catch (error) {
            console.error('백업 복원 중 오류:', error);
            return false;
        }
    }
}

// 전역에서 사용할 수 있도록 내보내기
window.StateManager = StateManager;
