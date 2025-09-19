/**
 * 테이블 렌더링 모듈
 * JSON 데이터를 HTML 테이블로 변환하여 표시하는 기능을 제공합니다.
 */

class TableRenderer {
    constructor() {
        this.tableContainer = null;
        this.tableHead = null;
        this.tableBody = null;
        this.tableInfo = null;
        this.emptyState = null;
        this.errorState = null;
        this.loadingState = null;
        this.tableWrapper = null;
        
        // 반응형 테이블 설정
        this.tableSettings = {
            minColumnWidth: 100,
            maxColumnWidth: 300,
            defaultColumnWidth: 150,
            autoResize: true
        };
        
        // 컬럼 타입 설정 관리
        this.columnTypes = {}; // 컬럼별 출력 타입 저장
        
        // 윈도우 리사이즈 디바운싱
        this.resizeTimeout = null;
    }

    /**
     * DOM 요소들을 초기화합니다.
     */
    initialize() {
        this.tableContainer = document.getElementById('table-container');
        this.tableHead = document.getElementById('table-head');
        this.tableBody = document.getElementById('table-body');
        this.tableInfo = document.getElementById('table-info');
        this.emptyState = document.getElementById('empty-state');
        this.errorState = document.getElementById('error-state');
        this.loadingState = document.getElementById('loading-state');
        this.tableWrapper = document.getElementById('table-wrapper');
        
        // 컬럼 타입 설정 로드
        this.loadColumnTypes();
        
        // 윈도우 리사이즈 이벤트 리스너 등록
        this.attachResizeListener();
    }

    /**
     * 테이블을 렌더링합니다.
     * @param {Array} data - 테이블 데이터 배열
     * @param {Object} options - 렌더링 옵션
     */
    renderTable(data, options = {}) {
        try {
            // DOM 요소 초기화
            this.initialize();

            // 빈 데이터 처리
            if (!data || data.length === 0) {
                this.showEmptyState();
                return;
            }

            // 현재 데이터 저장 (컬럼 타입 변경 시 사용)
            this.currentData = data;

            // 테이블 헤더 생성
            const headers = this.extractHeaders(data);
            this.renderTableHeader(headers);

            // 테이블 바디 생성
            this.renderTableBody(data, headers);

            // 테이블 정보 업데이트
            this.updateTableInfo(data);

            // 테이블 표시
            this.showTable();
            
            // 테이블 크기 자동 조정 (컬럼 너비 포함)
            setTimeout(() => {
                this.adjustTableToWindow();
                this.optimizeColumnWidths();
            }, 100);

        } catch (error) {
            console.error('테이블 렌더링 오류:', error);
            this.showError('테이블 렌더링 중 오류가 발생했습니다: ' + error.message);
        }
    }

    /**
     * 데이터에서 헤더를 추출합니다.
     * @param {Array} data - 테이블 데이터
     * @returns {Array} 헤더 배열
     */
    extractHeaders(data) {
        if (!data || data.length === 0) {
            return [];
        }

        // JSON 구조 분석
        const structure = this.analyzeJSONStructure(data);
        
        if (structure.type === 'array_of_objects') {
            // 일반적인 객체 배열인 경우
            return this.extractHeadersFromObjects(data);
        } else if (structure.type === 'object_with_arrays') {
            // 객체 내부에 배열이 있는 경우 (예: {key: [values], key2: [values]})
            return structure.keys;
        } else if (structure.type === 'nested_object') {
            // 중첩된 객체 구조인 경우
            return this.extractHeadersFromNestedStructure(data);
        } else {
            // 기존 방식으로 fallback
            return this.extractHeadersFromObjects(data);
        }
    }

    /**
     * JSON 구조를 분석합니다.
     * @param {any} data - 분석할 데이터
     * @returns {Object} 구조 분석 결과
     */
    analyzeJSONStructure(data) {
        if (!Array.isArray(data)) {
            return { type: 'unknown', keys: [] };
        }

        if (data.length === 0) {
            return { type: 'empty', keys: [] };
        }

        const firstItem = data[0];
        
        // 객체 배열인지 확인
        if (typeof firstItem === 'object' && firstItem !== null && !Array.isArray(firstItem)) {
            return { type: 'array_of_objects', keys: [] };
        }

        // 배열인지 확인
        if (Array.isArray(firstItem)) {
            return { type: 'array_of_arrays', keys: [] };
        }

        // 원시 값 배열인지 확인
        if (typeof firstItem !== 'object') {
            return { type: 'array_of_primitives', keys: [] };
        }

        return { type: 'unknown', keys: [] };
    }

    /**
     * 객체 배열에서 헤더를 추출합니다.
     * @param {Array} data - 객체 배열
     * @returns {Array} 헤더 배열
     */
    extractHeadersFromObjects(data) {
        const headerSet = new Set();
        
        data.forEach(row => {
            if (typeof row === 'object' && row !== null) {
                Object.keys(row).forEach(key => {
                    headerSet.add(key);
                });
            }
        });

        return Array.from(headerSet).sort();
    }

    /**
     * 중첩된 구조에서 헤더를 추출합니다.
     * @param {Array} data - 데이터 배열
     * @returns {Array} 헤더 배열
     */
    extractHeadersFromNestedStructure(data) {
        const headerSet = new Set();
        
        data.forEach(row => {
            if (typeof row === 'object' && row !== null) {
                // 중첩된 객체를 평면화하여 헤더 추출
                this.flattenObjectKeys(row, headerSet);
            }
        });

        return Array.from(headerSet).sort();
    }

    /**
     * 중첩된 객체의 키를 평면화합니다.
     * @param {Object} obj - 중첩된 객체
     * @param {Set} keySet - 키를 저장할 Set
     * @param {string} prefix - 키 접두사
     */
    flattenObjectKeys(obj, keySet, prefix = '') {
        Object.keys(obj).forEach(key => {
            const fullKey = prefix ? `${prefix}.${key}` : key;
            
            if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
                // 중첩된 객체인 경우 재귀적으로 처리
                this.flattenObjectKeys(obj[key], keySet, fullKey);
            } else {
                // 리프 노드인 경우 키 추가
                keySet.add(fullKey);
            }
        });
    }

    /**
     * 점 표기법을 사용하여 중첩된 객체에서 값을 가져옵니다.
     * @param {Object} obj - 객체
     * @param {string} path - 점 표기법 경로 (예: 'user.profile.name')
     * @returns {*} 값
     */
    getNestedValue(obj, path) {
        if (!obj || !path) {
            return obj;
        }

        // 점 표기법이 없는 경우 일반 접근
        if (!path.includes('.')) {
            return obj[path];
        }

        // 점 표기법으로 중첩된 값 접근
        return path.split('.').reduce((current, key) => {
            if (current === null || current === undefined) {
                return undefined;
            }
            return current[key];
        }, obj);
    }

    /**
     * 테이블 헤더를 렌더링합니다.
     * @param {Array} headers - 헤더 배열
     */
    renderTableHeader(headers) {
        if (!this.tableHead) return;

        this.tableHead.innerHTML = '';

        if (headers.length === 0) {
            return;
        }

        const headerRow = document.createElement('tr');
        
        headers.forEach(header => {
            const th = document.createElement('th');
            th.setAttribute('data-column', header);
            th.setAttribute('aria-sort', 'none');
            th.classList.add('sortable', 'column-header');
            
            // 헤더 컨테이너 생성
            const headerContainer = document.createElement('div');
            headerContainer.className = 'header-container';
            
            // 컬럼 이름
            const columnName = document.createElement('div');
            columnName.className = 'column-name';
            columnName.textContent = header;
            
            // 컬럼 컨트롤 버튼
            const columnControls = document.createElement('div');
            columnControls.className = 'column-controls';
            
            // 타입 선택 드롭다운
            const typeSelector = document.createElement('select');
            typeSelector.className = 'type-selector';
            typeSelector.setAttribute('data-column', header);
            
            // 타입 옵션들
            const typeOptions = [
                { value: 'auto', text: '자동' },
                { value: 'string', text: '문자열' },
                { value: 'number', text: '숫자' },
                { value: 'number-time', text: '시간' },
                { value: 'number-hex', text: 'Hex' },
                { value: 'number-binary', text: 'Binary' },
                { value: 'boolean', text: '불린' },
                { value: 'json', text: 'JSON' },
                { value: 'date', text: '날짜' },
                { value: 'raw', text: '원본' }
            ];
            
            typeOptions.forEach(option => {
                const optionElement = document.createElement('option');
                optionElement.value = option.value;
                optionElement.textContent = option.text;
                typeSelector.appendChild(optionElement);
            });
            
            // 현재 설정된 타입 적용
            const currentType = this.columnTypes[header] || 'auto';
            typeSelector.value = currentType;
            
            // 타입 변경 이벤트
            typeSelector.addEventListener('change', (event) => {
                this.changeColumnType(header, event.target.value);
            });
            
            columnControls.appendChild(typeSelector);
            
            headerContainer.appendChild(columnName);
            headerContainer.appendChild(columnControls);
            th.appendChild(headerContainer);
            
            headerRow.appendChild(th);
        });

        this.tableHead.appendChild(headerRow);
    }

    /**
     * 테이블 바디를 렌더링합니다.
     * @param {Array} data - 테이블 데이터
     * @param {Array} headers - 헤더 배열
     */
    renderTableBody(data, headers) {
        if (!this.tableBody) return;

        this.tableBody.innerHTML = '';

        data.forEach((row, index) => {
            const tr = document.createElement('tr');
            tr.setAttribute('data-row-index', index);

            headers.forEach(header => {
                const td = document.createElement('td');
                
                // 셀 데이터 가져오기 (점 표기법 지원)
                const cellData = this.getNestedValue(row, header);
                
                // 저장된 컬럼 타입이 있으면 해당 타입으로 렌더링
                const columnType = this.columnTypes[header] || 'auto';
                if (columnType !== 'auto') {
                    this.renderCellWithType(td, cellData, columnType);
                } else {
                    // 셀 데이터 렌더링 (기본)
                    this.renderCellContent(td, cellData, header);
                }
                
                tr.appendChild(td);
            });

            this.tableBody.appendChild(tr);
        });
    }

    /**
     * 셀 내용을 렌더링합니다.
     * @param {HTMLElement} td - 테이블 셀 요소
     * @param {*} cellData - 셀 데이터
     * @param {string} header - 헤더 이름
     */
    renderCellContent(td, cellData, header) {
        const dataType = this.getDataType(cellData);
        td.setAttribute('data-type', dataType);

        // 셀 컨텐츠 래퍼 생성
        const cellContent = document.createElement('div');
        cellContent.classList.add('cell-content');

        // 툴팁 생성 (긴 텍스트용)
        const tooltip = document.createElement('div');
        tooltip.classList.add('cell-tooltip');
        tooltip.textContent = String(cellData);

        switch (dataType) {
            case 'string':
                cellContent.textContent = cellData;
                break;

            case 'number':
                cellContent.textContent = this.formatNumber(cellData);
                break;

            case 'boolean':
                cellContent.textContent = cellData ? 'true' : 'false';
                break;

            case 'null':
            case 'undefined':
                cellContent.textContent = 'null';
                break;

            case 'object':
                this.renderObjectCell(cellContent, cellData);
                break;

            case 'array':
                this.renderArrayCell(cellContent, cellData);
                break;

            default:
                cellContent.textContent = String(cellData);
        }

        td.appendChild(cellContent);
        td.appendChild(tooltip);
    }

    /**
     * 객체 셀을 렌더링합니다.
     * @param {HTMLElement} container - 컨테이너 요소
     * @param {Object} obj - 객체 데이터
     * @param {number} depth - 중첩 깊이 (기본값: 0)
     */
    renderObjectCell(container, obj, depth = 0) {
        const content = document.createElement('div');
        content.classList.add('nested-content');

        const preview = document.createElement('div');
        preview.textContent = `{${Object.keys(obj).length} properties}`;
        preview.classList.add('text-truncate');

        const expandToggle = document.createElement('span');
        expandToggle.textContent = ' [테이블로 보기]';
        expandToggle.classList.add('expand-toggle');
        expandToggle.addEventListener('click', () => {
            this.toggleObjectTable(content, obj, depth);
        });

        preview.appendChild(expandToggle);
        content.appendChild(preview);
        container.appendChild(content);
    }

    /**
     * 배열 셀을 렌더링합니다.
     * @param {HTMLElement} container - 컨테이너 요소
     * @param {Array} arr - 배열 데이터
     */
    renderArrayCell(container, arr) {
        const content = document.createElement('div');
        content.classList.add('nested-content');

        const preview = document.createElement('div');
        preview.textContent = `[${arr.length} items]`;
        preview.classList.add('text-truncate');

        const expandToggle = document.createElement('span');
        expandToggle.textContent = ' [펼치기]';
        expandToggle.classList.add('expand-toggle');
        expandToggle.addEventListener('click', () => {
            this.toggleArrayExpansion(content, arr);
        });

        preview.appendChild(expandToggle);
        content.appendChild(preview);
        container.appendChild(content);
    }

    /**
     * 객체를 테이블로 표시/숨김을 토글합니다.
     * @param {HTMLElement} content - 컨텐츠 요소
     * @param {Object} obj - 객체 데이터
     */
    toggleObjectTable(content, obj, depth = 0) {
        const isExpanded = content.classList.contains('expanded');
        
        if (isExpanded) {
            // 축소
            content.classList.remove('expanded');
            content.innerHTML = '';
            
            const preview = document.createElement('div');
            preview.textContent = `{${Object.keys(obj).length} properties}`;
            preview.classList.add('text-truncate');
            
            const expandToggle = document.createElement('span');
            expandToggle.textContent = ' [테이블로 보기]';
            expandToggle.classList.add('expand-toggle');
            expandToggle.addEventListener('click', () => {
                this.toggleObjectTable(content, obj, depth);
            });
            
            preview.appendChild(expandToggle);
            content.appendChild(preview);
        } else {
            // 확장 - 재귀적으로 테이블로 표시
            content.classList.add('expanded');
            content.innerHTML = '';
            
            // 중첩 테이블 생성
            const nestedTable = this.createNestedTable(obj, depth + 1);
            content.appendChild(nestedTable);
            
            const collapseToggle = document.createElement('span');
            collapseToggle.textContent = ' [축소]';
            collapseToggle.classList.add('expand-toggle');
            collapseToggle.style.display = 'block';
            collapseToggle.style.marginTop = '8px';
            collapseToggle.addEventListener('click', () => {
                this.toggleObjectTable(content, obj, depth);
            });
            
            content.appendChild(collapseToggle);
        }
    }

    /**
     * 배열 확장/축소를 토글합니다.
     * @param {HTMLElement} content - 컨텐츠 요소
     * @param {Array} arr - 배열 데이터
     */
    toggleArrayExpansion(content, arr) {
        const isExpanded = content.classList.contains('expanded');
        
        if (isExpanded) {
            // 축소
            content.classList.remove('expanded');
            content.innerHTML = '';
            
            const preview = document.createElement('div');
            preview.textContent = `[${arr.length} items]`;
            preview.classList.add('text-truncate');
            
            const expandToggle = document.createElement('span');
            expandToggle.textContent = ' [펼치기]';
            expandToggle.classList.add('expand-toggle');
            expandToggle.addEventListener('click', () => {
                this.toggleArrayExpansion(content, arr);
            });
            
            preview.appendChild(expandToggle);
            content.appendChild(preview);
        } else {
            // 확장
            content.classList.add('expanded');
            content.innerHTML = '';
            
            const details = document.createElement('div');
            details.style.fontFamily = 'Monaco, Menlo, Ubuntu Mono, monospace';
            details.style.fontSize = '12px';
            details.style.whiteSpace = 'pre-wrap';
            details.textContent = JSON.stringify(arr, null, 2);
            
            const collapseToggle = document.createElement('span');
            collapseToggle.textContent = ' [축소]';
            collapseToggle.classList.add('expand-toggle');
            collapseToggle.addEventListener('click', () => {
                this.toggleArrayExpansion(content, arr);
            });
            
            content.appendChild(details);
            content.appendChild(collapseToggle);
        }
    }

    /**
     * 데이터 타입을 확인합니다.
     * @param {*} data - 확인할 데이터
     * @returns {string} 데이터 타입
     */
    getDataType(data) {
        if (data === null) return 'null';
        if (data === undefined) return 'undefined';
        if (Array.isArray(data)) return 'array';
        return typeof data;
    }

    /**
     * 숫자를 포맷합니다.
     * @param {number} num - 포맷할 숫자
     * @returns {string} 포맷된 숫자 문자열
     */
    formatNumber(num) {
        if (Number.isInteger(num)) {
            return num.toLocaleString();
        }
        return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
    }

    /**
     * 테이블 정보를 업데이트합니다.
     * @param {Array} data - 테이블 데이터
     */
    updateTableInfo(data) {
        if (!this.tableInfo) return;

        const rowCount = data.length;
        const columnCount = data.length > 0 ? Object.keys(data[0]).length : 0;

        this.tableInfo.innerHTML = `
            <span class="row-count">${rowCount.toLocaleString()}행</span>
            <span>•</span>
            <span class="column-count">${columnCount}열</span>
        `;
    }

    /**
     * 테이블을 표시합니다.
     */
    showTable() {
        this.hideAllStates();
        if (this.tableWrapper) {
            this.tableWrapper.style.display = 'block';
        }
    }

    /**
     * 빈 상태를 표시합니다.
     */
    showEmptyState() {
        this.hideAllStates();
        if (this.emptyState) {
            this.emptyState.style.display = 'block';
        }
        if (this.tableInfo) {
            this.tableInfo.innerHTML = '';
        }
    }

    /**
     * 에러 상태를 표시합니다.
     * @param {string} message - 에러 메시지
     */
    showError(message) {
        this.hideAllStates();
        if (this.errorState) {
            this.errorState.style.display = 'block';
            const errorMessage = this.errorState.querySelector('#error-message');
            if (errorMessage) {
                errorMessage.textContent = message;
            }
        }
        if (this.tableInfo) {
            this.tableInfo.innerHTML = '';
        }
    }

    /**
     * 로딩 상태를 표시합니다.
     */
    showLoading() {
        this.hideAllStates();
        if (this.loadingState) {
            this.loadingState.style.display = 'block';
        }
    }

    /**
     * 모든 상태를 숨깁니다.
     */
    hideAllStates() {
        const states = [this.emptyState, this.errorState, this.loadingState, this.tableWrapper];
        states.forEach(state => {
            if (state) {
                state.style.display = 'none';
            }
        });
    }

    /**
     * 테이블을 초기화합니다.
     */
    clearTable() {
        if (this.tableHead) {
            this.tableHead.innerHTML = '';
        }
        if (this.tableBody) {
            this.tableBody.innerHTML = '';
        }
        if (this.tableInfo) {
            this.tableInfo.innerHTML = '';
        }
        this.showEmptyState();
    }

    /**
     * 테이블을 정렬합니다.
     * @param {string} column - 정렬할 컬럼
     * @param {string} direction - 정렬 방향 ('asc' 또는 'desc')
     * @param {Array} data - 원본 데이터
     */
    sortTable(column, direction, data) {
        if (!data || data.length === 0) return;

        const sortedData = [...data].sort((a, b) => {
            const aVal = a[column];
            const bVal = b[column];

            // null/undefined 처리
            if (aVal === null || aVal === undefined) return 1;
            if (bVal === null || bVal === undefined) return -1;

            // 숫자 비교
            if (typeof aVal === 'number' && typeof bVal === 'number') {
                return direction === 'asc' ? aVal - bVal : bVal - aVal;
            }

            // 문자열 비교
            const aStr = String(aVal).toLowerCase();
            const bStr = String(bVal).toLowerCase();
            
            if (direction === 'asc') {
                return aStr.localeCompare(bStr);
            } else {
                return bStr.localeCompare(aStr);
            }
        });

        // 헤더 업데이트
        this.updateSortHeaders(column, direction);

        // 테이블 재렌더링
        const headers = this.extractHeaders(sortedData);
        this.renderTableBody(sortedData, headers);
    }

    /**
     * 정렬 헤더를 업데이트합니다.
     * @param {string} column - 정렬된 컬럼
     * @param {string} direction - 정렬 방향
     */
    updateSortHeaders(column, direction) {
        if (!this.tableHead) return;

        const headers = this.tableHead.querySelectorAll('th');
        headers.forEach(header => {
            const headerColumn = header.getAttribute('data-column');
            header.classList.remove('sort-asc', 'sort-desc');
            header.setAttribute('aria-sort', 'none');

            if (headerColumn === column) {
                header.classList.add(direction === 'asc' ? 'sort-asc' : 'sort-desc');
                header.setAttribute('aria-sort', direction === 'asc' ? 'ascending' : 'descending');
            }
        });
    }

    /**
     * 윈도우 리사이즈 이벤트 리스너를 등록합니다.
     */
    attachResizeListener() {
        window.addEventListener('resize', () => {
            // 디바운싱 적용
            clearTimeout(this.resizeTimeout);
            this.resizeTimeout = setTimeout(() => {
                this.adjustTableToWindow();
            }, 150);
        });
    }

    /**
     * 윈도우 크기에 맞춰 테이블을 조정합니다.
     */
    adjustTableToWindow() {
        if (!this.tableWrapper || !this.tableSettings.autoResize) {
            return;
        }

        try {
            const containerWidth = this.tableContainer.offsetWidth;
            const table = this.tableWrapper.querySelector('table');
            
            if (!table) {
                return;
            }

            // 테이블 컨테이너 크기 조정
            this.tableWrapper.style.width = '100%';
            this.tableWrapper.style.overflowX = 'auto';

            // 컬럼 너비 자동 조정
            this.adjustColumnWidths(table, containerWidth);

            // 모바일 대응
            this.handleMobileLayout(containerWidth);

        } catch (error) {
            console.error('테이블 크기 조정 중 오류:', error);
        }
    }

    /**
     * 컬럼 너비를 자동으로 조정합니다.
     * @param {HTMLElement} table - 테이블 요소
     * @param {number} containerWidth - 컨테이너 너비
     */
    adjustColumnWidths(table, containerWidth) {
        const headers = table.querySelectorAll('th');
        
        if (headers.length === 0) {
            return;
        }

        // 각 컬럼의 최적 너비 계산
        const columnWidths = [];
        headers.forEach((header, index) => {
            const cells = table.querySelectorAll(`td:nth-child(${index + 1})`);
            const optimalWidth = this.calculateOptimalColumnWidth(header, cells);
            columnWidths.push(optimalWidth);
        });

        // 총 너비 계산
        const totalWidth = columnWidths.reduce((sum, width) => sum + width, 0);
        const availableWidth = containerWidth - 60; // 스크롤바와 패딩 고려

        // 컨테이너 너비에 맞춰 조정
        let adjustedWidths;
        if (totalWidth <= availableWidth) {
            // 모든 컬럼이 들어갈 수 있는 경우
            adjustedWidths = columnWidths;
        } else {
            // 비례적으로 축소
            const ratio = availableWidth / totalWidth;
            adjustedWidths = columnWidths.map(width => Math.max(
                this.tableSettings.minColumnWidth,
                Math.floor(width * ratio)
            ));
        }

        // 각 컬럼에 너비 적용
        headers.forEach((header, index) => {
            const width = adjustedWidths[index];
            const cells = table.querySelectorAll(`td:nth-child(${index + 1})`);
            
            header.style.width = `${width}px`;
            header.style.minWidth = `${width}px`;
            header.style.maxWidth = `${width}px`;
            
            cells.forEach(cell => {
                cell.style.width = `${width}px`;
                cell.style.minWidth = `${width}px`;
                cell.style.maxWidth = `${width}px`;
            });
        });
    }

    /**
     * 최적의 컬럼 너비를 계산합니다.
     * @param {HTMLElement} header - 헤더 요소
     * @param {NodeList} cells - 셀 요소들
     * @returns {number} 최적 너비
     */
    calculateOptimalColumnWidth(header, cells) {
        // 헤더 너비 계산
        const headerText = this.getTextContent(header);
        const headerWidth = this.calculateTextWidth(headerText) + 40; // 패딩과 컨트롤 여유공간
        
        // 컬럼이 숫자 컬럼인지 확인
        const isNumericColumn = this.isNumericColumn(header, cells);
        
        // 셀들의 최대 너비 계산
        let maxCellWidth = 0;
        const sampleSize = Math.min(cells.length, 10); // 성능을 위해 최대 10개 셀만 확인
        
        for (let i = 0; i < sampleSize; i++) {
            const cell = cells[i];
            const cellText = this.getCellDisplayText(cell);
            
            // 숫자 컬럼인 경우 더 compact한 계산
            let cellWidth;
            if (isNumericColumn) {
                cellWidth = this.calculateNumericTextWidth(cellText) + 12; // 패딩 줄임
            } else {
                cellWidth = this.calculateTextWidth(cellText) + 16; // 패딩 고려
            }
            
            // 특별한 케이스 처리
            if (this.isLongContent(cellText)) {
                // 긴 내용의 경우 최대 너비 제한 (숫자 컬럼은 더 작게)
                const maxWidth = isNumericColumn ? 120 : 300;
                maxCellWidth = Math.max(maxCellWidth, Math.min(cellWidth, maxWidth));
            } else {
                maxCellWidth = Math.max(maxCellWidth, cellWidth);
            }
        }

        // 숫자 컬럼의 경우 최대 너비 제한
        const maxColumnWidth = isNumericColumn ? 120 : this.tableSettings.maxColumnWidth;
        
        // 최종 너비 결정
        const optimalWidth = Math.max(
            this.tableSettings.minColumnWidth,
            Math.min(maxColumnWidth, Math.max(headerWidth, maxCellWidth))
        );

        return optimalWidth;
    }

    /**
     * 요소의 텍스트 내용을 가져옵니다.
     * @param {HTMLElement} element - 요소
     * @returns {string} 텍스트 내용
     */
    getTextContent(element) {
        if (!element) return '';
        
        // 중첩된 요소들도 고려하여 텍스트 추출
        const textContent = element.textContent || element.innerText || '';
        return textContent.trim();
    }

    /**
     * 셀의 표시 텍스트를 가져옵니다.
     * @param {HTMLElement} cell - 셀 요소
     * @returns {string} 표시 텍스트
     */
    getCellDisplayText(cell) {
        if (!cell) return '';
        
        const cellContent = cell.querySelector('.cell-content');
        if (cellContent) {
            return this.getTextContent(cellContent);
        }
        
        return this.getTextContent(cell);
    }

    /**
     * 텍스트의 너비를 계산합니다.
     * @param {string} text - 텍스트
     * @returns {number} 예상 너비 (픽셀)
     */
    calculateTextWidth(text) {
        if (!text) return 0;
        
        // 한글, 영문, 숫자, 특수문자별로 다른 폰트 크기 고려
        let width = 0;
        for (let i = 0; i < text.length; i++) {
            const char = text.charAt(i);
            const code = char.charCodeAt(0);
            
            if (code >= 0xAC00 && code <= 0xD7AF) {
                // 한글
                width += 14;
            } else if (code >= 0x0041 && code <= 0x007A) {
                // 영문 대소문자
                width += 8;
            } else if (code >= 0x0030 && code <= 0x0039) {
                // 숫자
                width += 8;
            } else if (code >= 0x0020 && code <= 0x007F) {
                // 기본 ASCII 특수문자
                width += 8;
            } else {
                // 기타 문자 (유니코드)
                width += 12;
            }
        }
        
        return Math.max(width, 20); // 최소 너비 보장
    }

    /**
     * 긴 내용인지 확인합니다.
     * @param {string} text - 텍스트
     * @returns {boolean} 긴 내용 여부
     */
    isLongContent(text) {
        return text.length > 50 || text.includes('\n') || text.includes('{') || text.includes('[');
    }

    /**
     * 컬럼이 숫자 컬럼인지 확인합니다.
     * @param {HTMLElement} header - 헤더 요소
     * @param {NodeList} cells - 셀 요소들
     * @returns {boolean} 숫자 컬럼 여부
     */
    isNumericColumn(header, cells) {
        // 헤더 이름으로 숫자 컬럼 추정
        const headerText = this.getTextContent(header).toLowerCase();
        const numericKeywords = ['id', 'count', 'number', 'amount', 'price', 'value', 'score', 'rate', 'percent', 'age', 'year', 'month', 'day', 'time', 'timestamp'];
        
        if (numericKeywords.some(keyword => headerText.includes(keyword))) {
            return true;
        }

        // 샘플 셀들의 내용으로 숫자 컬럼 판단
        const sampleSize = Math.min(cells.length, 5);
        let numericCount = 0;
        
        for (let i = 0; i < sampleSize; i++) {
            const cell = cells[i];
            const cellText = this.getCellDisplayText(cell);
            
            // 숫자 또는 숫자 관련 형식인지 확인
            if (this.isNumericValue(cellText)) {
                numericCount++;
            }
        }
        
        // 70% 이상이 숫자면 숫자 컬럼으로 판단
        return (numericCount / sampleSize) >= 0.7;
    }

    /**
     * 값이 숫자 관련인지 확인합니다.
     * @param {string} value - 값
     * @returns {boolean} 숫자 관련 값 여부
     */
    isNumericValue(value) {
        if (!value) return false;
        
        // 숫자만 있는 경우
        if (/^\d+$/.test(value)) return true;
        
        // 소수점이 있는 경우
        if (/^\d+\.\d+$/.test(value)) return true;
        
        // 음수인 경우
        if (/^-\d+(\.\d+)?$/.test(value)) return true;
        
        // 천 단위 구분자가 있는 경우
        if (/^\d{1,3}(,\d{3})*(\.\d+)?$/.test(value)) return true;
        
        // 시간 형식 (HH:MM:SS)
        if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(value)) return true;
        
        // 날짜 형식 (YYYY-MM-DD)
        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return true;
        
        // 퍼센트
        if (/^\d+(\.\d+)?%$/.test(value)) return true;
        
        // 통화
        if (/^\$?\d+(\.\d+)?$/.test(value)) return true;
        
        return false;
    }

    /**
     * 숫자 텍스트의 너비를 계산합니다. (더 compact하게)
     * @param {string} text - 텍스트
     * @returns {number} 예상 너비 (픽셀)
     */
    calculateNumericTextWidth(text) {
        if (!text) return 0;
        
        // 숫자는 더 작은 폰트 크기 사용
        let width = 0;
        for (let i = 0; i < text.length; i++) {
            const char = text.charAt(i);
            const code = char.charCodeAt(0);
            
            if (code >= 0x0030 && code <= 0x0039) {
                // 숫자 (더 작게)
                width += 6;
            } else if (char === '.' || char === ',') {
                // 소수점, 천단위 구분자
                width += 4;
            } else if (char === '-' || char === '+') {
                // 부호
                width += 6;
            } else if (char === '%' || char === '$') {
                // 기호
                width += 6;
            } else if (char === ':') {
                // 시간 구분자
                width += 4;
            } else if (char === '-') {
                // 날짜 구분자
                width += 4;
            } else {
                // 기타 문자
                width += 6;
            }
        }
        
        return Math.max(width, 15); // 최소 너비를 더 작게
    }

    /**
     * 컬럼 너비를 최적화합니다.
     */
    optimizeColumnWidths() {
        const table = this.tableWrapper?.querySelector('table');
        if (!table) return;

        const headers = table.querySelectorAll('th');
        if (headers.length === 0) return;

        // 각 컬럼의 최적 너비 계산 및 적용
        headers.forEach((header, index) => {
            const cells = table.querySelectorAll(`td:nth-child(${index + 1})`);
            const isNumeric = this.isNumericColumn(header, cells);
            const optimalWidth = this.calculateOptimalColumnWidth(header, cells);
            
            // 숫자 컬럼 속성 설정
            if (isNumeric) {
                header.setAttribute('data-numeric', 'true');
                cells.forEach(cell => {
                    cell.setAttribute('data-numeric', 'true');
                });
            }
            
            // 너비 적용
            header.style.width = `${optimalWidth}px`;
            header.style.minWidth = `${optimalWidth}px`;
            
            cells.forEach(cell => {
                cell.style.width = `${optimalWidth}px`;
                cell.style.minWidth = `${optimalWidth}px`;
            });
        });
    }

    /**
     * 모바일 레이아웃을 처리합니다.
     * @param {number} containerWidth - 컨테이너 너비
     */
    handleMobileLayout(containerWidth) {
        const isMobile = containerWidth < 768;
        const table = this.tableWrapper.querySelector('table');
        
        if (!table) {
            return;
        }

        if (isMobile) {
            // 모바일에서는 테이블을 세로 스크롤 가능하게 설정
            table.classList.add('mobile-table');
            this.tableWrapper.style.overflowX = 'auto';
            this.tableWrapper.style.overflowY = 'visible';
        } else {
            // 데스크톱에서는 원래 스타일 유지
            table.classList.remove('mobile-table');
            this.tableWrapper.style.overflowX = 'auto';
            this.tableWrapper.style.overflowY = 'visible';
        }
    }

    /**
     * 테이블에서 검색을 수행합니다.
     * @param {string} searchTerm - 검색어
     * @param {Array} originalData - 원본 데이터
     */
    searchTable(searchTerm, originalData) {
        if (!searchTerm || searchTerm.trim() === '') {
            // 검색어가 없으면 원본 데이터 표시
            this.renderTable(originalData);
            return;
        }

        const filteredData = originalData.filter(row => {
            return Object.values(row).some(value => {
                const stringValue = String(value).toLowerCase();
                return stringValue.includes(searchTerm.toLowerCase());
            });
        });

        if (filteredData.length === 0) {
            this.showNoResults(searchTerm);
        } else {
            this.renderTable(filteredData);
            this.highlightSearchTerm(searchTerm);
        }
    }

    /**
     * 검색 결과가 없을 때 메시지를 표시합니다.
     * @param {string} searchTerm - 검색어
     */
    showNoResults(searchTerm) {
        if (!this.tableContainer) return;

        // 기존 테이블 숨기기
        if (this.tableWrapper) {
            this.tableWrapper.style.display = 'none';
        }

        // 검색 결과 없음 메시지 표시
        const noResultsDiv = document.createElement('div');
        noResultsDiv.className = 'no-results';
        noResultsDiv.innerHTML = `
            <div class="no-results__icon">🔍</div>
            <h3 class="no-results__title">검색 결과가 없습니다</h3>
            <p class="no-results__description">"${searchTerm}"에 대한 검색 결과를 찾을 수 없습니다.</p>
        `;
        noResultsDiv.style.cssText = `
            text-align: center;
            padding: 2rem;
            color: var(--text-secondary);
        `;

        this.tableContainer.appendChild(noResultsDiv);
    }

    /**
     * 검색어를 하이라이트합니다.
     * @param {string} searchTerm - 검색어
     */
    highlightSearchTerm(searchTerm) {
        if (!this.tableBody) return;

        const cells = this.tableBody.querySelectorAll('td');
        cells.forEach(cell => {
            const text = cell.textContent;
            const lowerText = text.toLowerCase();
            const lowerSearchTerm = searchTerm.toLowerCase();

            if (lowerText.includes(lowerSearchTerm)) {
                const regex = new RegExp(`(${searchTerm})`, 'gi');
                const highlightedText = text.replace(regex, '<span class="highlight">$1</span>');
                
                // 하이라이트된 텍스트로 교체
                const cellContent = cell.querySelector('.cell-content');
                if (cellContent) {
                    cellContent.innerHTML = highlightedText;
                }
            }
        });
    }

    /**
     * 셀 값을 복사합니다.
     * @param {*} cellData - 복사할 셀 데이터
     */
    async copyCellValue(cellData) {
        try {
            let copyText;
            
            if (cellData === null || cellData === undefined) {
                copyText = 'null';
            } else if (typeof cellData === 'object') {
                copyText = JSON.stringify(cellData, null, 2);
            } else {
                copyText = String(cellData);
            }

            await navigator.clipboard.writeText(copyText);
            return { success: true, message: '셀 값이 복사되었습니다.' };
        } catch (error) {
            console.error('복사 실패:', error);
            return { success: false, message: '복사에 실패했습니다.' };
        }
    }

    /**
     * 컬럼 데이터를 복사합니다.
     * @param {string} columnName - 컬럼 이름
     * @param {Array} data - 테이블 데이터
     * @param {boolean} includeHeader - 헤더 포함 여부
     */
    async copyColumnData(columnName, data, includeHeader = false) {
        try {
            const columnData = data.map(row => row[columnName]);
            
            let copyText = '';
            if (includeHeader) {
                copyText = columnName + '\n';
            }
            copyText += columnData.map(value => {
                if (value === null || value === undefined) return 'null';
                if (typeof value === 'object') return JSON.stringify(value);
                return String(value);
            }).join('\n');

            await navigator.clipboard.writeText(copyText);
            return { success: true, message: `"${columnName}" 컬럼이 복사되었습니다.` };
        } catch (error) {
            console.error('컬럼 복사 실패:', error);
            return { success: false, message: '컬럼 복사에 실패했습니다.' };
        }
    }

    /**
     * 행 데이터를 복사합니다.
     * @param {Object} rowData - 행 데이터
     * @param {string} format - 복사 형식 ('json' 또는 'keyvalue')
     */
    async copyRowData(rowData, format = 'json') {
        try {
            let copyText;
            
            if (format === 'json') {
                copyText = JSON.stringify(rowData, null, 2);
            } else {
                // key-value 형식
                copyText = Object.entries(rowData)
                    .map(([key, value]) => {
                        const valueStr = value === null || value === undefined ? 'null' : 
                                       typeof value === 'object' ? JSON.stringify(value) : 
                                       String(value);
                        return `${key}: ${valueStr}`;
                    })
                    .join('\n');
            }

            await navigator.clipboard.writeText(copyText);
            return { success: true, message: '행 데이터가 복사되었습니다.' };
        } catch (error) {
            console.error('행 복사 실패:', error);
            return { success: false, message: '행 복사에 실패했습니다.' };
        }
    }

    /**
     * 테이블에 복사 이벤트 리스너를 추가합니다.
     */
    attachCopyListeners() {
        if (!this.tableWrapper) return;

        // 셀 우클릭 이벤트
        this.tableWrapper.addEventListener('contextmenu', (event) => {
            const cell = event.target.closest('td');
            if (!cell) return;

            event.preventDefault();
            this.showCopyContextMenu(event, cell);
        });

        // 키보드 단축키 (Ctrl+C)
        document.addEventListener('keydown', (event) => {
            if (event.ctrlKey && event.key === 'c') {
                const selectedElement = document.activeElement;
                const cell = selectedElement.closest('td');
                
                if (cell) {
                    event.preventDefault();
                    this.handleCellCopy(cell);
                }
            }
        });
    }

    /**
     * 복사 컨텍스트 메뉴를 표시합니다.
     * @param {Event} event - 마우스 이벤트
     * @param {HTMLElement} cell - 셀 요소
     */
    showCopyContextMenu(event, cell) {
        // 기존 메뉴 제거
        this.hideCopyContextMenu();

        const menu = document.createElement('div');
        menu.className = 'copy-context-menu';
        menu.style.cssText = `
            position: fixed;
            left: ${event.clientX}px;
            top: ${event.clientY}px;
            background: white;
            border: 1px solid var(--border-color);
            border-radius: 6px;
            box-shadow: var(--shadow-lg);
            z-index: 1000;
            padding: 4px 0;
            min-width: 120px;
        `;

        // 셀 복사 옵션
        const cellOption = document.createElement('div');
        cellOption.textContent = '셀 복사';
        cellOption.style.cssText = `
            padding: 8px 12px;
            cursor: pointer;
            font-size: 14px;
            transition: background-color 0.2s;
        `;
        cellOption.addEventListener('click', () => {
            this.handleCellCopy(cell);
            this.hideCopyContextMenu();
        });
        cellOption.addEventListener('mouseenter', () => {
            cellOption.style.backgroundColor = 'var(--surface-color)';
        });
        cellOption.addEventListener('mouseleave', () => {
            cellOption.style.backgroundColor = 'transparent';
        });
        menu.appendChild(cellOption);

        // 행 복사 옵션
        const row = cell.closest('tr');
        if (row) {
            const rowOption = document.createElement('div');
            rowOption.textContent = '행 복사';
            rowOption.style.cssText = cellOption.style.cssText;
            rowOption.addEventListener('click', () => {
                this.handleRowCopy(row);
                this.hideCopyContextMenu();
            });
            rowOption.addEventListener('mouseenter', () => {
                rowOption.style.backgroundColor = 'var(--surface-color)';
            });
            rowOption.addEventListener('mouseleave', () => {
                rowOption.style.backgroundColor = 'transparent';
            });
            menu.appendChild(rowOption);
        }

        // 컬럼 복사 옵션
        const columnIndex = Array.from(row.children).indexOf(cell);
        const header = this.tableHead?.querySelector(`th:nth-child(${columnIndex + 1})`);
        if (header) {
            const columnName = header.getAttribute('data-column');
            const columnOption = document.createElement('div');
            columnOption.textContent = `"${columnName}" 컬럼 복사`;
            columnOption.style.cssText = cellOption.style.cssText;
            columnOption.addEventListener('click', () => {
                this.handleColumnCopy(columnName);
                this.hideCopyContextMenu();
            });
            columnOption.addEventListener('mouseenter', () => {
                columnOption.style.backgroundColor = 'var(--surface-color)';
            });
            columnOption.addEventListener('mouseleave', () => {
                columnOption.style.backgroundColor = 'transparent';
            });
            menu.appendChild(columnOption);
        }

        document.body.appendChild(menu);
        
        // 메뉴 외부 클릭 시 숨기기
        setTimeout(() => {
            document.addEventListener('click', this.hideCopyContextMenu, { once: true });
        }, 100);
    }

    /**
     * 복사 컨텍스트 메뉴를 숨깁니다.
     */
    hideCopyContextMenu() {
        const menu = document.querySelector('.copy-context-menu');
        if (menu) {
            menu.remove();
        }
    }

    /**
     * 셀 복사를 처리합니다.
     * @param {HTMLElement} cell - 셀 요소
     */
    async handleCellCopy(cell) {
        const cellContent = cell.querySelector('.cell-content');
        if (!cellContent) return;

        const cellData = this.getCellDataFromElement(cell);
        const result = await this.copyCellValue(cellData);
        
        // 복사 결과 알림
        this.showCopyNotification(result.message, result.success);
    }

    /**
     * 행 복사를 처리합니다.
     * @param {HTMLElement} row - 행 요소
     */
    async handleRowCopy(row) {
        const rowData = this.getRowDataFromElement(row);
        const result = await this.copyRowData(rowData);
        
        this.showCopyNotification(result.message, result.success);
    }

    /**
     * 컬럼 복사를 처리합니다.
     * @param {string} columnName - 컬럼 이름
     */
    async handleColumnCopy(columnName) {
        // 원본 데이터가 필요하므로 메인 애플리케이션에서 호출해야 함
        // 여기서는 기본적인 처리만 수행
        this.showCopyNotification(`"${columnName}" 컬럼 복사 기능을 사용하려면 메인 애플리케이션에서 호출해주세요.`, false);
    }

    /**
     * 셀 요소에서 데이터를 추출합니다.
     * @param {HTMLElement} cell - 셀 요소
     * @returns {*} 셀 데이터
     */
    getCellDataFromElement(cell) {
        // 현재 데이터에서 직접 가져오기 (더 정확함)
        const rowIndex = cell.closest('tr')?.getAttribute('data-row-index');
        const columnIndex = Array.from(cell.closest('tr')?.children || []).indexOf(cell);
        
        if (rowIndex !== null && this.currentData && this.currentData[rowIndex]) {
            const headers = this.tableHead?.querySelectorAll('th');
            if (headers && headers[columnIndex]) {
                const columnName = headers[columnIndex].getAttribute('data-column');
                return this.currentData[rowIndex][columnName];
            }
        }
        
        // 폴백: DOM에서 파싱
        const dataType = cell.getAttribute('data-type');
        const tooltip = cell.querySelector('.cell-tooltip');
        
        if (tooltip) {
            const tooltipText = tooltip.textContent;
            
            switch (dataType) {
                case 'number':
                    return parseFloat(tooltipText) || 0;
                case 'boolean':
                    return tooltipText === 'true';
                case 'null':
                    return null;
                case 'object':
                case 'array':
                    try {
                        return JSON.parse(tooltipText);
                    } catch {
                        return tooltipText;
                    }
                default:
                    return tooltipText;
            }
        }
        
        return null;
    }

    /**
     * 행 요소에서 데이터를 추출합니다.
     * @param {HTMLElement} row - 행 요소
     * @returns {Object} 행 데이터
     */
    getRowDataFromElement(row) {
        const rowData = {};
        const cells = row.querySelectorAll('td');
        const headers = this.tableHead?.querySelectorAll('th');
        
        if (!headers) return rowData;

        cells.forEach((cell, index) => {
            const header = headers[index];
            if (header) {
                const columnName = header.getAttribute('data-column');
                rowData[columnName] = this.getCellDataFromElement(cell);
            }
        });

        return rowData;
    }

    /**
     * 복사 결과 알림을 표시합니다.
     * @param {string} message - 알림 메시지
     * @param {boolean} success - 성공 여부
     */
    showCopyNotification(message, success) {
        // 메인 애플리케이션의 알림 시스템을 사용
        if (window.jsonTableViewer) {
            if (success) {
                window.jsonTableViewer.showSuccess(message);
            } else {
                window.jsonTableViewer.showError(message);
            }
        } else {
            console.log(message);
        }
    }

    /**
     * 중첩된 객체를 위한 테이블을 생성합니다.
     * @param {Object} obj - 객체 데이터
     * @param {number} depth - 중첩 깊이
     * @returns {HTMLElement} 생성된 테이블 요소
     */
    createNestedTable(obj, depth = 0) {
        const nestedTable = document.createElement('table');
        nestedTable.className = 'nested-table';
        nestedTable.style.cssText = `
            width: 100%;
            border-collapse: collapse;
            font-size: ${Math.max(10, 14 - depth)}px;
            margin: 8px 0;
            border: 1px solid var(--border-color);
            border-radius: 4px;
            overflow: hidden;
            background-color: var(--background-color);
        `;
        
        // 깊이에 따른 왼쪽 여백 추가
        nestedTable.style.marginLeft = `${depth * 16}px`;
        
        // 테이블 헤더
        const thead = document.createElement('thead');
        thead.style.backgroundColor = 'var(--surface-color)';
        const headerRow = document.createElement('tr');
        
        const keyHeader = document.createElement('th');
        keyHeader.textContent = 'Key';
        keyHeader.style.cssText = `
            padding: 8px;
            text-align: left;
            font-weight: 600;
            border-bottom: 1px solid var(--border-color);
            min-width: 120px;
        `;
        
        const valueHeader = document.createElement('th');
        valueHeader.textContent = 'Value';
        valueHeader.style.cssText = `
            padding: 8px;
            text-align: left;
            font-weight: 600;
            border-bottom: 1px solid var(--border-color);
            width: 100%;
        `;
        
        headerRow.appendChild(keyHeader);
        headerRow.appendChild(valueHeader);
        thead.appendChild(headerRow);
        nestedTable.appendChild(thead);
        
        // 테이블 바디
        const tbody = document.createElement('tbody');
        Object.entries(obj).forEach(([key, value]) => {
            const row = document.createElement('tr');
            row.style.borderBottom = '1px solid var(--border-color)';
            
            const keyCell = document.createElement('td');
            keyCell.textContent = key;
            keyCell.style.cssText = `
                padding: 8px;
                font-weight: 500;
                background-color: var(--surface-color);
                vertical-align: top;
                border-right: 1px solid var(--border-color);
            `;
            
            const valueCell = document.createElement('td');
            valueCell.style.cssText = `
                padding: 8px;
                vertical-align: top;
                word-break: break-word;
            `;
            
            // 값 타입에 따른 재귀적 렌더링
            this.renderValueInNestedTable(valueCell, value, depth);
            
            row.appendChild(keyCell);
            row.appendChild(valueCell);
            tbody.appendChild(row);
        });
        
        nestedTable.appendChild(tbody);
        return nestedTable;
    }

    /**
     * 중첩 테이블의 값 셀에 값을 렌더링합니다.
     * @param {HTMLElement} cell - 값 셀 요소
     * @param {*} value - 렌더링할 값
     * @param {number} depth - 중첩 깊이
     */
    renderValueInNestedTable(cell, value, depth) {
        const dataType = this.getDataType(value);
        
        switch (dataType) {
            case 'object':
                // 객체인 경우 재귀적으로 테이블로 표시
                if (depth < 5) { // 최대 5단계까지 중첩 허용
                    this.renderObjectCell(cell, value, depth);
                } else {
                    // 너무 깊은 경우 JSON 문자열로 표시
                    cell.textContent = JSON.stringify(value, null, 2);
                    cell.style.fontFamily = 'monospace';
                    cell.style.fontSize = '11px';
                    cell.style.backgroundColor = 'var(--surface-color)';
                    cell.style.padding = '4px';
                    cell.style.borderRadius = '3px';
                }
                break;
                
            case 'array':
                // 배열인 경우 배열 테이블로 표시
                if (depth < 5) {
                    this.renderArrayInNestedTable(cell, value, depth);
                } else {
                    cell.textContent = JSON.stringify(value, null, 2);
                    cell.style.fontFamily = 'monospace';
                    cell.style.fontSize = '11px';
                    cell.style.backgroundColor = 'var(--surface-color)';
                    cell.style.padding = '4px';
                    cell.style.borderRadius = '3px';
                }
                break;
                
            case 'string':
                cell.textContent = value;
                cell.style.wordBreak = 'break-word';
                break;
                
            case 'number':
                cell.textContent = this.formatNumber(value);
                cell.style.textAlign = 'right';
                cell.style.fontFamily = 'monospace';
                break;
                
            case 'boolean':
                cell.textContent = value ? 'true' : 'false';
                cell.style.fontWeight = '600';
                cell.style.color = value ? 'var(--success-color)' : 'var(--error-color)';
                break;
                
            case 'null':
            case 'undefined':
                cell.textContent = 'null';
                cell.style.color = 'var(--text-secondary)';
                cell.style.fontStyle = 'italic';
                break;
                
            default:
                cell.textContent = String(value);
        }
    }

    /**
     * 중첩 테이블에서 배열을 렌더링합니다.
     * @param {HTMLElement} cell - 셀 요소
     * @param {Array} arr - 배열 데이터
     * @param {number} depth - 중첩 깊이
     */
    renderArrayInNestedTable(cell, arr, depth) {
        const content = document.createElement('div');
        content.classList.add('nested-content');

        const preview = document.createElement('div');
        preview.textContent = `[${arr.length} items]`;
        preview.classList.add('text-truncate');

        const expandToggle = document.createElement('span');
        expandToggle.textContent = ' [배열로 보기]';
        expandToggle.classList.add('expand-toggle');
        expandToggle.addEventListener('click', () => {
            this.toggleArrayInNestedTable(content, arr, depth);
        });

        preview.appendChild(expandToggle);
        content.appendChild(preview);
        cell.appendChild(content);
    }

    /**
     * 중첩 테이블에서 배열을 표시/숨김을 토글합니다.
     * @param {HTMLElement} content - 컨텐츠 요소
     * @param {Array} arr - 배열 데이터
     * @param {number} depth - 중첩 깊이
     */
    toggleArrayInNestedTable(content, arr, depth) {
        const isExpanded = content.classList.contains('expanded');
        
        if (isExpanded) {
            // 축소
            content.classList.remove('expanded');
            content.innerHTML = '';
            
            const preview = document.createElement('div');
            preview.textContent = `[${arr.length} items]`;
            preview.classList.add('text-truncate');
            
            const expandToggle = document.createElement('span');
            expandToggle.textContent = ' [배열로 보기]';
            expandToggle.classList.add('expand-toggle');
            expandToggle.addEventListener('click', () => {
                this.toggleArrayInNestedTable(content, arr, depth);
            });
            
            preview.appendChild(expandToggle);
            content.appendChild(preview);
        } else {
            // 확장 - 배열을 테이블로 표시
            content.classList.add('expanded');
            content.innerHTML = '';
            
            const arrayTable = document.createElement('table');
            arrayTable.className = 'array-table';
            arrayTable.style.cssText = `
                width: 100%;
                border-collapse: collapse;
                font-size: ${Math.max(10, 14 - depth)}px;
                margin: 8px 0;
                border: 1px solid var(--border-color);
                border-radius: 4px;
                overflow: hidden;
                background-color: var(--background-color);
            `;
            
            arrayTable.style.marginLeft = `${depth * 16}px`;
            
            // 배열 헤더
            const thead = document.createElement('thead');
            thead.style.backgroundColor = 'var(--surface-color)';
            const headerRow = document.createElement('tr');
            
            const indexHeader = document.createElement('th');
            indexHeader.textContent = 'Index';
            indexHeader.style.cssText = `
                padding: 8px;
                text-align: center;
                font-weight: 600;
                border-bottom: 1px solid var(--border-color);
                width: 60px;
            `;
            
            const valueHeader = document.createElement('th');
            valueHeader.textContent = 'Value';
            valueHeader.style.cssText = `
                padding: 8px;
                text-align: left;
                font-weight: 600;
                border-bottom: 1px solid var(--border-color);
                width: 100%;
            `;
            
            headerRow.appendChild(indexHeader);
            headerRow.appendChild(valueHeader);
            thead.appendChild(headerRow);
            arrayTable.appendChild(thead);
            
            // 배열 바디
            const tbody = document.createElement('tbody');
            arr.forEach((item, index) => {
                const row = document.createElement('tr');
                row.style.borderBottom = '1px solid var(--border-color)';
                
                const indexCell = document.createElement('td');
                indexCell.textContent = index;
                indexCell.style.cssText = `
                    padding: 8px;
                    text-align: center;
                    font-weight: 500;
                    background-color: var(--surface-color);
                    border-right: 1px solid var(--border-color);
                    font-family: monospace;
                `;
                
                const valueCell = document.createElement('td');
                valueCell.style.cssText = `
                    padding: 8px;
                    vertical-align: top;
                    word-break: break-word;
                `;
                
                // 배열 요소를 재귀적으로 렌더링
                this.renderValueInNestedTable(valueCell, item, depth);
                
                row.appendChild(indexCell);
                row.appendChild(valueCell);
                tbody.appendChild(row);
            });
            
            arrayTable.appendChild(tbody);
            content.appendChild(arrayTable);
        }
    }

    /**
     * 컬럼 타입을 변경합니다.
     * @param {string} columnName - 컬럼 이름
     * @param {string} newType - 새로운 타입
     */
    changeColumnType(columnName, newType) {
        // 컬럼 타입 저장
        this.columnTypes[columnName] = newType;
        
        console.log(`컬럼 "${columnName}"의 타입을 "${newType}"로 변경합니다.`);
        console.log('현재 데이터:', this.currentData);
        
        // 헤더의 data-numeric 속성 업데이트
        const header = document.querySelector(`th[data-column="${columnName}"]`);
        const numericTypes = ['number', 'number-time', 'number-hex', 'number-binary'];
        
        if (header) {
            if (numericTypes.includes(newType)) {
                header.setAttribute('data-numeric', 'true');
            } else {
                header.removeAttribute('data-numeric');
            }
        }
        
        // 현재 테이블 데이터가 있으면 해당 컬럼만 다시 렌더링
        if (this.tableBody && this.currentData) {
            this.updateColumnDisplay(columnName);
        } else {
            console.warn('테이블 데이터가 없습니다.');
        }
        
        // 설정 저장 (로컬 스토리지)
        this.saveColumnTypes();
        
        console.log(`컬럼 "${columnName}"의 타입이 "${newType}"로 변경되었습니다.`);
    }

    /**
     * 특정 컬럼의 표시 방식을 업데이트합니다.
     * @param {string} columnName - 컬럼 이름
     */
    updateColumnDisplay(columnName) {
        const rows = this.tableBody.querySelectorAll('tr');
        const columnIndex = this.getColumnIndex(columnName);
        
        console.log(`컬럼 "${columnName}" 업데이트 - 인덱스: ${columnIndex}, 행 수: ${rows.length}`);
        
        if (columnIndex === -1 || !this.currentData) {
            console.warn('컬럼 인덱스를 찾을 수 없거나 데이터가 없습니다.');
            return;
        }
        
        const columnType = this.columnTypes[columnName] || 'auto';
        console.log(`표시 타입: ${columnType}`);
        
        rows.forEach((row, rowIndex) => {
            const cell = row.querySelector(`td:nth-child(${columnIndex + 1})`);
            if (cell && this.currentData[rowIndex]) {
                // 원본 데이터에서 직접 가져오기 (점 표기법 지원)
                const cellData = this.getNestedValue(this.currentData[rowIndex], columnName);
                console.log(`행 ${rowIndex}: 원본 데이터 =`, cellData, `타입: ${typeof cellData}`);
                this.renderCellWithType(cell, cellData, columnType);
            }
        });
    }

    /**
     * 컬럼 인덱스를 가져옵니다.
     * @param {string} columnName - 컬럼 이름
     * @returns {number} 컬럼 인덱스
     */
    getColumnIndex(columnName) {
        const headers = this.tableHead?.querySelectorAll('th');
        if (!headers) return -1;
        
        for (let i = 0; i < headers.length; i++) {
            if (headers[i].getAttribute('data-column') === columnName) {
                return i;
            }
        }
        return -1;
    }

    /**
     * 지정된 타입으로 셀을 렌더링합니다.
     * @param {HTMLElement} cell - 셀 요소
     * @param {*} cellData - 셀 데이터
     * @param {string} displayType - 표시 타입
     */
    renderCellWithType(cell, cellData, displayType) {
        // 기존 컨텐츠 제거
        cell.innerHTML = '';
        
        // 원본 데이터 타입 설정
        const originalDataType = this.getDataType(cellData);
        cell.setAttribute('data-type', originalDataType);
        
        // 숫자 관련 타입인지 확인하여 data-numeric 속성 설정
        const numericTypes = ['number', 'number-time', 'number-hex', 'number-binary'];
        if (numericTypes.includes(displayType)) {
            cell.setAttribute('data-numeric', 'true');
        }
        
        // 셀 컨텐츠 래퍼 생성
        const cellContent = document.createElement('div');
        cellContent.classList.add('cell-content');
        
        // 툴팁 생성 (원본 값 표시)
        const tooltip = document.createElement('div');
        tooltip.classList.add('cell-tooltip');
        tooltip.textContent = typeof cellData === 'object' ? JSON.stringify(cellData) : String(cellData);
        
        // 타입에 따른 렌더링
        switch (displayType) {
            case 'auto':
                this.renderCellContent(cellContent, cellData, '');
                break;
            case 'string':
                cellContent.textContent = String(cellData);
                break;
            case 'number':
                if (typeof cellData === 'number') {
                    cellContent.textContent = this.formatNumber(cellData);
                } else {
                    cellContent.textContent = String(cellData);
                }
                break;
            case 'number-time':
                cellContent.textContent = this.formatAsTime(cellData);
                break;
            case 'number-hex':
                cellContent.textContent = this.formatAsHex(cellData);
                break;
            case 'number-binary':
                cellContent.textContent = this.formatAsBinary(cellData);
                break;
            case 'boolean':
                if (typeof cellData === 'boolean') {
                    cellContent.textContent = cellData ? 'true' : 'false';
                } else {
                    cellContent.textContent = String(cellData);
                }
                break;
            case 'json':
                if (typeof cellData === 'object' && cellData !== null) {
                    this.renderObjectCell(cellContent, cellData);
                } else {
                    cellContent.textContent = JSON.stringify(cellData);
                }
                break;
            case 'date':
                cellContent.textContent = this.formatAsDate(cellData);
                break;
            case 'raw':
                cellContent.textContent = String(cellData);
                break;
            default:
                this.renderCellContent(cellContent, cellData, '');
        }
        
        cell.appendChild(cellContent);
        cell.appendChild(tooltip);
    }

    /**
     * 숫자를 timestamp로 해석하여 날짜 시간으로 포맷팅합니다.
     * @param {*} value - 값
     * @returns {string} 포맷팅된 날짜 시간 문자열
     */
    formatAsTime(value) {
        if (typeof value === 'number') {
            let date;
            
            // Unix 타임스탬프 범위 체크
            if (value >= 0) {
                if (value > 1000000000 && value < 10000000000) {
                    // 초 단위 타임스탬프 (10자리)
                    date = new Date(value * 1000);
                } else if (value > 1000000000000 && value < 10000000000000) {
                    // 밀리초 단위 타임스탬프 (13자리)
                    date = new Date(value);
                } else if (value > 0 && value < 86400) {
                    // 24시간 이내의 초 단위 (예: 3600 = 1시간)
                    const hours = Math.floor(value / 3600);
                    const minutes = Math.floor((value % 3600) / 60);
                    const seconds = Math.floor(value % 60);
                    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                } else {
                    // 기타 숫자 - 현재 시간 기준으로 해석
                    date = new Date(value);
                }
                
                // 유효한 날짜인지 확인
                if (date instanceof Date && !isNaN(date.getTime())) {
                    // 날짜와 시간을 모두 표시
                    const options = {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: false
                    };
                    return date.toLocaleString('ko-KR', options);
                }
            }
            
            // 숫자가 아닌 경우나 변환 실패 시 원본 값 반환
            return String(value);
        }
        
        // 숫자가 아닌 경우 원본 값 반환
        return String(value);
    }

    /**
     * 숫자를 16진수로 포맷팅합니다.
     * @param {*} value - 값
     * @returns {string} 16진수 문자열
     */
    formatAsHex(value) {
        if (typeof value === 'number') {
            return `0x${value.toString(16).toUpperCase()}`;
        }
        return String(value);
    }

    /**
     * 숫자를 2진수로 포맷팅합니다.
     * @param {*} value - 값
     * @returns {string} 2진수 문자열
     */
    formatAsBinary(value) {
        if (typeof value === 'number' && Number.isInteger(value)) {
            return `0b${value.toString(2)}`;
        }
        return String(value);
    }

    /**
     * 값을 날짜로 포맷팅합니다.
     * @param {*} value - 값
     * @returns {string} 포맷팅된 날짜 문자열
     */
    formatAsDate(value) {
        try {
            if (typeof value === 'number') {
                // 숫자를 날짜로 해석
                return new Date(value).toLocaleDateString();
            } else if (typeof value === 'string') {
                // 문자열을 날짜로 해석
                const date = new Date(value);
                if (!isNaN(date.getTime())) {
                    return date.toLocaleDateString();
                }
            }
        } catch (error) {
            console.warn('날짜 변환 실패:', error);
        }
        return String(value);
    }

    /**
     * 컬럼 타입 설정을 저장합니다.
     */
    saveColumnTypes() {
        try {
            localStorage.setItem('jsonTableColumnTypes', JSON.stringify(this.columnTypes));
        } catch (error) {
            console.warn('컬럼 타입 설정 저장 실패:', error);
        }
    }

    /**
     * 컬럼 타입 설정을 로드합니다.
     */
    loadColumnTypes() {
        try {
            const saved = localStorage.getItem('jsonTableColumnTypes');
            if (saved) {
                this.columnTypes = JSON.parse(saved);
            }
        } catch (error) {
            console.warn('컬럼 타입 설정 로드 실패:', error);
        }
    }

    /**
     * 테이블 설정을 업데이트합니다.
     * @param {Object} settings - 새로운 설정
     */
    updateTableSettings(settings) {
        this.tableSettings = { ...this.tableSettings, ...settings };
        
        // 설정이 변경되면 테이블 크기 재조정
        if (this.tableWrapper && this.tableWrapper.style.display !== 'none') {
            setTimeout(() => {
                this.adjustTableToWindow();
            }, 100);
        }
    }
}

// 전역에서 사용할 수 있도록 내보내기
window.TableRenderer = TableRenderer;
