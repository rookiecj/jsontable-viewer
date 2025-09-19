/**
 * 메인 애플리케이션 모듈
 * 모든 기능을 통합하고 사용자 인터랙션을 처리합니다.
 */

class JSONTableViewer {
    constructor() {
        this.jsonParser = null;
        this.tableRenderer = null;
        this.stateManager = null;
        
        // DOM 요소 참조
        this.jsonInput = null;
        this.parseBtn = null;
        this.formatBtn = null;
        this.clearBtn = null;
        this.sampleBtn = null;
        this.searchInput = null;
        this.searchToggle = null;
        this.searchClear = null;
        this.fileInput = null;
        
        // 현재 상태
        this.currentData = null;
        this.currentState = null;
        
        // 초기화
        this.init();
    }

    /**
     * 애플리케이션을 초기화합니다.
     */
    init() {
        try {
            // 모듈 초기화
            this.jsonParser = new JSONParser();
            this.tableRenderer = new TableRenderer();
            this.stateManager = new StateManager();

            // DOM 요소 참조 설정
            this.initializeDOMElements();

            // 이벤트 리스너 등록
            this.attachEventListeners();

            // 저장된 상태 복원
            this.restoreState();

            // 테이블 렌더러 초기화
            this.tableRenderer.initialize();

            console.log('JSON Table Viewer가 성공적으로 초기화되었습니다.');

        } catch (error) {
            console.error('애플리케이션 초기화 중 오류가 발생했습니다:', error);
            this.showError('애플리케이션 초기화 중 오류가 발생했습니다.');
        }
    }

    /**
     * DOM 요소 참조를 설정합니다.
     */
    initializeDOMElements() {
        this.jsonInput = document.getElementById('json-input');
        this.parseBtn = document.getElementById('parse-btn');
        this.formatBtn = document.getElementById('format-btn');
        this.clearBtn = document.getElementById('clear-btn');
        this.sampleBtn = document.getElementById('sample-btn');
        this.searchInput = document.getElementById('search-input');
        this.searchToggle = document.getElementById('search-toggle');
        this.searchClear = document.getElementById('search-clear');
        this.fileInput = document.getElementById('file-input');

        // 필수 요소 확인
        if (!this.jsonInput || !this.parseBtn || !this.formatBtn || !this.clearBtn || !this.sampleBtn) {
            throw new Error('필수 DOM 요소를 찾을 수 없습니다.');
        }
    }

    /**
     * 이벤트 리스너를 등록합니다.
     */
    attachEventListeners() {
        // Parse JSON 버튼
        this.parseBtn.addEventListener('click', () => {
            this.parseJSON();
        });

        // Format JSON 버튼
        this.formatBtn.addEventListener('click', () => {
            this.formatJSON();
        });

        // Clear 버튼
        this.clearBtn.addEventListener('click', () => {
            this.clearData();
        });

        // Load Sample 버튼
        this.sampleBtn.addEventListener('click', () => {
            this.loadSampleData();
        });

        // 검색 토글 버튼
        if (this.searchToggle) {
            this.searchToggle.addEventListener('click', () => {
                this.toggleSearch();
            });
        }

        // 검색 초기화 버튼
        if (this.searchClear) {
            this.searchClear.addEventListener('click', () => {
                this.clearSearch();
            });
        }

        // 검색 입력 이벤트
        if (this.searchInput) {
            this.searchInput.addEventListener('input', (event) => {
                this.handleSearch(event.target.value);
            });
        }

        // JSON 입력 자동 저장
        this.jsonInput.addEventListener('input', () => {
            this.autoSaveState();
        });

        // JSON 입력 textarea에 드래그 앤 드롭 이벤트
        this.attachTextareaDragAndDropListeners();

        // 파일 입력 이벤트
        if (this.fileInput) {
            this.fileInput.addEventListener('change', (event) => {
                this.handleFileSelect(event);
            });
        }

        // 키보드 단축키
        document.addEventListener('keydown', (event) => {
            this.handleKeyboardShortcuts(event);
        });

        // 페이지 언로드 시 상태 저장
        window.addEventListener('beforeunload', () => {
            this.saveCurrentState();
        });

        // 테이블 헤더 클릭 (정렬 기능)
        document.addEventListener('click', (event) => {
            if (event.target.matches('th.sortable')) {
                this.handleSortClick(event.target);
            }
        });
    }

    /**
     * JSON을 파싱하고 테이블을 렌더링합니다.
     */
    parseJSON() {
        try {
            const jsonString = this.jsonInput.value.trim();
            
            if (!jsonString) {
                this.showError('JSON 데이터를 입력해주세요.');
                return;
            }

            // 로딩 상태 표시
            this.tableRenderer.showLoading();

            // JSON 파싱
            const result = this.jsonParser.parseJSON(jsonString);

            if (result.success) {
                // 성공 시 테이블 렌더링
                this.currentData = result.data;
                this.tableRenderer.renderTable(result.data);
                
                // 상태 저장
                this.saveCurrentState();
                
                // 성공 메시지 표시
                this.showSuccess(`성공적으로 파싱되었습니다. (${result.rowCount}행, ${result.columnCount}열)`);
                
            } else {
                // 실패 시 에러 표시
                this.tableRenderer.showError(result.error);
                this.showError(result.error);
            }

        } catch (error) {
            console.error('JSON 파싱 중 오류:', error);
            this.tableRenderer.showError('예상치 못한 오류가 발생했습니다.');
            this.showError('예상치 못한 오류가 발생했습니다.');
        }
    }

    /**
     * JSON 데이터를 포맷팅합니다.
     */
    formatJSON() {
        try {
            const jsonString = this.jsonInput.value.trim();
            
            if (!jsonString) {
                this.showError('포맷팅할 JSON 데이터를 입력해주세요.');
                return;
            }

            // JSON 유효성 검사
            let parsedData;
            try {
                parsedData = JSON.parse(jsonString);
            } catch (parseError) {
                this.showError(`JSON 형식이 올바르지 않습니다: ${parseError.message}`);
                return;
            }

            // JSON 포맷팅 (들여쓰기 2칸)
            const formattedJSON = JSON.stringify(parsedData, null, 2);
            
            // 포맷팅된 JSON을 입력창에 적용
            this.jsonInput.value = formattedJSON;
            
            // 상태 저장
            this.autoSaveState();
            
            // 성공 메시지 표시
            this.showSuccess('JSON이 성공적으로 포맷팅되었습니다.');
            
        } catch (error) {
            console.error('JSON 포맷팅 중 오류:', error);
            this.showError('JSON 포맷팅 중 오류가 발생했습니다.');
        }
    }

    /**
     * 데이터를 초기화합니다.
     */
    clearData() {
        this.jsonInput.value = '';
        this.currentData = null;
        this.tableRenderer.clearTable();
        this.stateManager.clearState();
        this.showSuccess('데이터가 초기화되었습니다.');
    }

    /**
     * 샘플 데이터를 로드합니다.
     */
    loadSampleData() {
        const sampleData = this.jsonParser.getSampleData('simpleArray');
        this.jsonInput.value = sampleData;
        this.autoSaveState();
        this.showSuccess('샘플 데이터가 로드되었습니다.');
    }

    /**
     * 자동 저장을 수행합니다.
     */
    autoSaveState() {
        const currentState = this.getCurrentState();
        this.stateManager.autoSave(currentState);
    }

    /**
     * 현재 상태를 저장합니다.
     */
    saveCurrentState() {
        const currentState = this.getCurrentState();
        this.stateManager.saveState(currentState);
    }

    /**
     * 현재 상태를 가져옵니다.
     * @returns {Object} 현재 상태 객체
     */
    getCurrentState() {
        return {
            jsonInput: this.jsonInput.value,
            tableOptions: {
                sortColumn: null,
                sortDirection: 'asc',
                searchTerm: ''
            }
        };
    }

    /**
     * 저장된 상태를 복원합니다.
     */
    restoreState() {
        try {
            const savedState = this.stateManager.loadState();
            
            if (savedState) {
                this.jsonInput.value = savedState.jsonInput;
                this.currentState = savedState;
                
                // JSON이 있으면 자동으로 파싱
                if (savedState.jsonInput.trim()) {
                    this.parseJSON();
                }
                
                console.log('저장된 상태가 복원되었습니다.');
            }
        } catch (error) {
            console.error('상태 복원 중 오류:', error);
        }
    }

    /**
     * 키보드 단축키를 처리합니다.
     * @param {KeyboardEvent} event - 키보드 이벤트
     */
    handleKeyboardShortcuts(event) {
        // Ctrl+Enter: JSON 파싱
        if (event.ctrlKey && event.key === 'Enter') {
            event.preventDefault();
            this.parseJSON();
        }

        // Ctrl+Shift+F: JSON 포맷팅
        if (event.ctrlKey && event.shiftKey && event.key === 'F') {
            event.preventDefault();
            this.formatJSON();
        }

        // Ctrl+F: 검색 포커스
        if (event.ctrlKey && event.key === 'f') {
            event.preventDefault();
            this.toggleSearch();
            if (this.searchInput && this.searchInput.style.display !== 'none') {
                this.searchInput.focus();
            }
        }

        // Ctrl+S: 상태 저장
        if (event.ctrlKey && event.key === 's') {
            event.preventDefault();
            this.saveCurrentState();
            this.showSuccess('상태가 저장되었습니다.');
        }

        // Escape: 검색 초기화 또는 에러 메시지 닫기
        if (event.key === 'Escape') {
            if (this.searchInput && this.searchInput.style.display !== 'none') {
                this.clearSearch();
            } else {
                this.hideNotifications();
            }
        }
    }

    /**
     * JSON 입력 textarea에 드래그 앤 드롭 이벤트 리스너를 등록합니다.
     */
    attachTextareaDragAndDropListeners() {
        // 드래그 오버 이벤트
        this.jsonInput.addEventListener('dragover', (event) => {
            event.preventDefault();
            this.jsonInput.classList.add('drag-over');
        });

        // 드래그 리브 이벤트
        this.jsonInput.addEventListener('dragleave', (event) => {
            event.preventDefault();
            // textarea를 완전히 벗어났을 때만 클래스 제거
            if (!this.jsonInput.contains(event.relatedTarget)) {
                this.jsonInput.classList.remove('drag-over');
            }
        });

        // 드래그 엔터 이벤트
        this.jsonInput.addEventListener('dragenter', (event) => {
            event.preventDefault();
            this.jsonInput.classList.add('drag-over');
        });

        // 드롭 이벤트
        this.jsonInput.addEventListener('drop', (event) => {
            event.preventDefault();
            this.jsonInput.classList.remove('drag-over');
            
            const files = event.dataTransfer.files;
            if (files.length > 0) {
                this.handleFileDrop(files[0]);
            }
        });
    }

    /**
     * 파일 드롭을 처리합니다.
     * @param {File} file - 드롭된 파일
     */
    handleFileDrop(file) {
        this.processFile(file);
    }

    /**
     * 파일 선택을 처리합니다.
     * @param {Event} event - 파일 선택 이벤트
     */
    handleFileSelect(event) {
        const file = event.target.files[0];
        if (file) {
            this.processFile(file);
        }
    }

    /**
     * 파일을 처리합니다.
     * @param {File} file - 처리할 파일
     */
    processFile(file) {
        // 파일 타입 확인
        if (!this.isValidFileType(file)) {
            this.showError('JSON 관련 파일(.json, .jsonl, .geojson, .ndjson) 또는 텍스트 파일(.txt)만 업로드할 수 있습니다.');
            return;
        }

        // 파일 크기 확인 (10MB 제한)
        if (file.size > 10 * 1024 * 1024) {
            this.showError('파일 크기는 10MB를 초과할 수 없습니다.');
            return;
        }

        // 파일 읽기
        const reader = new FileReader();
        
        reader.onload = (event) => {
            try {
                const content = event.target.result;
                const processedContent = this.processFileContent(content, file.name);
                this.jsonInput.value = processedContent;
                
                // 자동으로 JSON 파싱 시도
                this.parseJSON();
                
                this.showSuccess(`파일 "${file.name}"이 성공적으로 로드되었습니다.`);
            } catch (error) {
                console.error('파일 처리 중 오류:', error);
                this.showError('파일 처리 중 오류가 발생했습니다: ' + error.message);
            }
        };

        reader.onerror = () => {
            this.showError('파일을 읽는 중 오류가 발생했습니다.');
        };

        reader.readAsText(file, 'UTF-8');
    }

    /**
     * 파일 내용을 형식에 따라 처리합니다.
     * @param {string} content - 파일 내용
     * @param {string} fileName - 파일 이름
     * @returns {string} 처리된 내용
     */
    processFileContent(content, fileName) {
        const fileExtension = fileName.toLowerCase().split('.').pop();
        
        switch (fileExtension) {
            case 'jsonl':
            case 'ndjson':
                // JSONL/NDJSON: 각 줄이 독립적인 JSON 객체
                return this.processJSONL(content);
            case 'geojson':
                // GeoJSON: 지리적 데이터 형식
                return this.processGeoJSON(content);
            case 'json':
            case 'txt':
            default:
                // 일반 JSON 또는 텍스트 파일
                return content;
        }
    }

    /**
     * JSONL 형식을 처리합니다.
     * @param {string} content - JSONL 내용
     * @returns {string} JSON 배열 형태로 변환된 내용
     */
    processJSONL(content) {
        const lines = content.trim().split('\n');
        const jsonObjects = [];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line) {
                try {
                    const jsonObj = JSON.parse(line);
                    jsonObjects.push(jsonObj);
                } catch (error) {
                    console.warn(`JSONL 라인 ${i + 1} 파싱 실패:`, error.message);
                    // 파싱 실패한 라인은 문자열로 처리
                    jsonObjects.push({ line: i + 1, content: line, error: 'Invalid JSON' });
                }
            }
        }
        
        return JSON.stringify(jsonObjects, null, 2);
    }

    /**
     * GeoJSON 형식을 처리합니다.
     * @param {string} content - GeoJSON 내용
     * @returns {string} 처리된 GeoJSON 내용
     */
    processGeoJSON(content) {
        try {
            const geoJson = JSON.parse(content);
            
            // GeoJSON의 FeatureCollection을 테이블로 표시하기 위해 변환
            if (geoJson.type === 'FeatureCollection' && geoJson.features) {
                const features = geoJson.features.map((feature, index) => {
                    const row = {
                        id: feature.id || index,
                        type: feature.type,
                        geometry_type: feature.geometry?.type || null,
                        geometry_coordinates: feature.geometry?.coordinates ? 
                            JSON.stringify(feature.geometry.coordinates) : null,
                        properties: feature.properties ? 
                            JSON.stringify(feature.properties) : null
                    };
                    
                    // properties의 개별 필드들도 추가
                    if (feature.properties) {
                        Object.keys(feature.properties).forEach(key => {
                            row[`prop_${key}`] = feature.properties[key];
                        });
                    }
                    
                    return row;
                });
                
                return JSON.stringify(features, null, 2);
            }
            
            // 다른 GeoJSON 형식은 그대로 반환
            return content;
        } catch (error) {
            console.warn('GeoJSON 파싱 실패:', error.message);
            return content;
        }
    }

    /**
     * 파일 타입이 유효한지 확인합니다.
     * @param {File} file - 확인할 파일
     * @returns {boolean} 유효한 파일 타입 여부
     */
    isValidFileType(file) {
        const validTypes = [
            'application/json',
            'text/json',
            'text/plain',
            'application/geo+json',
            'application/vnd.geo+json'
        ];
        
        const validExtensions = ['.json', '.jsonl', '.geojson', '.ndjson', '.txt'];
        
        // MIME 타입 확인
        if (validTypes.includes(file.type)) {
            return true;
        }
        
        // 파일 확장자 확인
        const fileName = file.name.toLowerCase();
        return validExtensions.some(ext => fileName.endsWith(ext));
    }

    /**
     * 검색 토글을 처리합니다.
     */
    toggleSearch() {
        if (!this.searchInput || !this.searchClear) {
            return;
        }

        const isVisible = this.searchInput.style.display !== 'none';
        
        if (isVisible) {
            // 검색창 숨기기
            this.searchInput.style.display = 'none';
            this.searchClear.style.display = 'none';
            this.searchToggle.textContent = '🔍';
        } else {
            // 검색창 보이기
            this.searchInput.style.display = 'inline-block';
            this.searchClear.style.display = 'inline-block';
            this.searchToggle.textContent = '✕';
            this.searchInput.focus();
        }
    }

    /**
     * 검색을 처리합니다.
     * @param {string} searchTerm - 검색어
     */
    handleSearch(searchTerm) {
        if (!this.currentData || !this.tableRenderer) {
            return;
        }

        // 디바운싱 적용
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
            this.tableRenderer.searchTable(searchTerm, this.currentData);
            
            if (searchTerm.trim()) {
                this.showSuccess(`"${searchTerm}" 검색 결과를 표시합니다.`);
            }
        }, 300);
    }

    /**
     * 검색을 초기화합니다.
     */
    clearSearch() {
        if (!this.searchInput || !this.tableRenderer) {
            return;
        }

        this.searchInput.value = '';
        
        if (this.currentData) {
            // 원본 데이터로 테이블 재렌더링
            this.tableRenderer.renderTable(this.currentData);
        }
        
        this.showSuccess('검색이 초기화되었습니다.');
    }

    /**
     * 정렬 클릭을 처리합니다.
     * @param {HTMLElement} header - 클릭된 헤더 요소
     */
    handleSortClick(header) {
        if (!this.currentData || this.currentData.length === 0) {
            return;
        }

        const column = header.getAttribute('data-column');
        const currentDirection = header.getAttribute('aria-sort');
        
        let newDirection = 'asc';
        if (currentDirection === 'asc') {
            newDirection = 'desc';
        } else if (currentDirection === 'desc') {
            newDirection = 'asc';
        }

        this.tableRenderer.sortTable(column, newDirection, this.currentData);
        this.showSuccess(`"${column}" 컬럼으로 ${newDirection === 'asc' ? '오름차순' : '내림차순'} 정렬되었습니다.`);
    }

    /**
     * 성공 메시지를 표시합니다.
     * @param {string} message - 메시지
     */
    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    /**
     * 에러 메시지를 표시합니다.
     * @param {string} message - 메시지
     */
    showError(message) {
        this.showNotification(message, 'error');
    }

    /**
     * 알림을 표시합니다.
     * @param {string} message - 메시지
     * @param {string} type - 알림 타입 ('success', 'error', 'warning')
     */
    showNotification(message, type = 'info') {
        // 기존 알림 제거
        this.hideNotifications();

        const notification = document.createElement('div');
        notification.className = `notification notification--${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 16px;
            border-radius: 8px;
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
            z-index: 1000;
            max-width: 400px;
            font-size: 14px;
            font-weight: 500;
            animation: slideIn 0.3s ease-out;
        `;

        // 타입별 스타일 설정
        switch (type) {
            case 'success':
                notification.style.background = '#16a34a';
                notification.style.color = 'white';
                break;
            case 'error':
                notification.style.background = '#dc2626';
                notification.style.color = 'white';
                break;
            case 'warning':
                notification.style.background = '#d97706';
                notification.style.color = 'white';
                break;
            default:
                notification.style.background = '#2563eb';
                notification.style.color = 'white';
        }

        notification.textContent = message;
        document.body.appendChild(notification);

        // 3초 후 자동 제거
        setTimeout(() => {
            this.hideNotification(notification);
        }, 3000);
    }

    /**
     * 특정 알림을 숨깁니다.
     * @param {HTMLElement} notification - 숨길 알림 요소
     */
    hideNotification(notification) {
        if (notification && notification.parentNode) {
            notification.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }
    }

    /**
     * 모든 알림을 숨깁니다.
     */
    hideNotifications() {
        const notifications = document.querySelectorAll('.notification');
        notifications.forEach(notification => {
            this.hideNotification(notification);
        });
    }

    /**
     * 애플리케이션 정보를 가져옵니다.
     * @returns {Object} 애플리케이션 정보
     */
    getAppInfo() {
        return {
            name: 'JSON Table Viewer',
            version: '1.0.0',
            description: 'JSON 데이터를 테이블 형태로 변환하여 표시하는 웹 애플리케이션',
            features: [
                'JSON 파싱 및 검증',
                '테이블 렌더링',
                '상태 저장/복원',
                '정렬 기능',
                '반응형 디자인'
            ]
        };
    }

    /**
     * 디버그 정보를 출력합니다.
     */
    debug() {
        console.log('=== JSON Table Viewer Debug Info ===');
        console.log('App Info:', this.getAppInfo());
        console.log('Current Data:', this.currentData);
        console.log('Current State:', this.currentState);
        console.log('Storage Usage:', this.stateManager.getStorageUsage());
        console.log('=====================================');
    }
}

// CSS 애니메이션 추가
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

// DOM이 로드된 후 애플리케이션 초기화
document.addEventListener('DOMContentLoaded', () => {
    window.jsonTableViewer = new JSONTableViewer();
    
    // 전역 디버그 함수 (개발용)
    window.debugApp = () => {
        window.jsonTableViewer.debug();
    };
});

// 전역에서 사용할 수 있도록 내보내기
window.JSONTableViewer = JSONTableViewer;
