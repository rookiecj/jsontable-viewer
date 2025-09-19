/**
 * JSON 파싱 및 검증 모듈
 * JSON 데이터를 파싱하고 유효성을 검사하는 기능을 제공합니다.
 */

class JSONParser {
    constructor() {
        this.sampleData = this.createSampleData();
    }

    /**
     * JSON 문자열을 파싱하고 유효성을 검사합니다.
     * @param {string} jsonString - 파싱할 JSON 문자열
     * @returns {Object} 파싱 결과 객체
     */
    parseJSON(jsonString) {
        const result = {
            success: false,
            data: null,
            error: null,
            type: null,
            rowCount: 0,
            columnCount: 0
        };

        try {
            // 빈 문자열 체크
            if (!jsonString || jsonString.trim() === '') {
                result.error = 'JSON 데이터가 입력되지 않았습니다.';
                return result;
            }

            // JSON 파싱
            const parsedData = JSON.parse(jsonString);
            result.success = true;
            result.data = parsedData;
            result.type = this.getDataType(parsedData);

            // 테이블 데이터 추출 및 통계 계산
            const tableData = this.extractTableData(parsedData);
            result.data = tableData;
            result.rowCount = tableData.length;
            result.columnCount = tableData.length > 0 ? Object.keys(tableData[0]).length : 0;

            return result;

        } catch (error) {
            result.error = this.formatErrorMessage(error);
            return result;
        }
    }

    /**
     * 데이터 타입을 확인합니다.
     * @param {*} data - 확인할 데이터
     * @returns {string} 데이터 타입
     */
    getDataType(data) {
        if (Array.isArray(data)) {
            return 'array';
        } else if (data === null) {
            return 'null';
        } else if (typeof data === 'object') {
            return 'object';
        } else {
            return typeof data;
        }
    }

    /**
     * 다양한 JSON 구조에서 테이블 데이터를 추출합니다.
     * @param {*} data - 원본 데이터
     * @returns {Array} 테이블 데이터 배열
     */
    extractTableData(data) {
        // 배열인 경우
        if (Array.isArray(data)) {
            if (data.length === 0) {
                return [];
            }

            // 객체 배열인 경우
            if (typeof data[0] === 'object' && data[0] !== null && !Array.isArray(data[0])) {
                return data;
            }

            // 배열의 배열인 경우
            if (Array.isArray(data[0])) {
                // 첫 번째 배열의 길이를 기준으로 컬럼 생성
                const maxLength = Math.max(...data.map(arr => arr.length));
                return data.map((arr, rowIndex) => {
                    const row = { _rowIndex: rowIndex };
                    for (let i = 0; i < maxLength; i++) {
                        row[`column_${i}`] = arr[i] !== undefined ? arr[i] : null;
                    }
                    return row;
                });
            }

            // 원시 값 배열인 경우
            return data.map((item, index) => ({
                index: index,
                value: item
            }));
        }

        // 객체인 경우
        if (typeof data === 'object' && data !== null) {
            // 객체의 값이 배열인 경우 (예: {"users": [...]})
            const arrayValues = Object.values(data).filter(Array.isArray);
            if (arrayValues.length > 0) {
                // 가장 긴 배열을 찾아서 사용
                const longestArray = arrayValues.reduce((longest, current) => 
                    current.length > longest.length ? current : longest
                );
                
                if (longestArray.length > 0) {
                    // 배열의 첫 번째 요소가 객체인 경우 (일반적인 테이블 데이터)
                    if (typeof longestArray[0] === 'object' && longestArray[0] !== null && !Array.isArray(longestArray[0])) {
                        return longestArray;
                    }
                    
                    // 배열의 첫 번째 요소가 원시 값인 경우
                    if (typeof longestArray[0] !== 'object') {
                        return longestArray.map((item, index) => ({
                            index: index,
                            value: item
                        }));
                    }
                }
            }

            // 중첩된 객체 구조인지 확인
            const hasNestedObjects = Object.values(data).some(value => 
                typeof value === 'object' && value !== null && !Array.isArray(value)
            );

            if (hasNestedObjects) {
                // 중첩된 객체인 경우 평면화
                return this.flattenObjectToTable(data);
            }

            // 일반 객체인 경우 키-값 쌍으로 변환
            return Object.entries(data).map(([key, value]) => ({
                key: key,
                value: value
            }));
        }

        // 원시 값인 경우
        return [{
            value: data
        }];
    }

    /**
     * 중첩된 객체를 테이블 형태로 평면화합니다.
     * @param {Object} obj - 평면화할 객체
     * @returns {Array} 테이블 데이터 배열
     */
    flattenObjectToTable(obj) {
        const flattened = {};
        
        const flatten = (current, prefix = '') => {
            Object.keys(current).forEach(key => {
                const newKey = prefix ? `${prefix}.${key}` : key;
                const value = current[key];
                
                if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                    flatten(value, newKey);
                } else {
                    flattened[newKey] = value;
                }
            });
        };
        
        flatten(obj);
        
        return [flattened];
    }

    /**
     * 에러 메시지를 사용자 친화적으로 포맷합니다.
     * @param {Error} error - 원본 에러 객체
     * @returns {string} 포맷된 에러 메시지
     */
    formatErrorMessage(error) {
        const message = error.message;

        if (message.includes('Unexpected token')) {
            return 'JSON 형식이 올바르지 않습니다. 문법 오류를 확인해주세요.';
        }

        if (message.includes('Unexpected end of JSON input')) {
            return 'JSON 데이터가 완전하지 않습니다. 닫는 괄호나 따옴표를 확인해주세요.';
        }

        if (message.includes('Unexpected string')) {
            return '문자열 형식이 올바르지 않습니다. 따옴표를 확인해주세요.';
        }

        if (message.includes('Unexpected number')) {
            return '숫자 형식이 올바르지 않습니다.';
        }

        if (message.includes('Unexpected identifier')) {
            return '예약어나 잘못된 식별자가 사용되었습니다.';
        }

        return `JSON 파싱 오류: ${message}`;
    }

    /**
     * 샘플 JSON 데이터를 생성합니다.
     * @returns {Object} 샘플 데이터 객체
     */
    createSampleData() {
        return {
            // 단순 배열
            simpleArray: [
                {"name": "John Doe", "age": 30, "city": "Seoul", "active": true},
                {"name": "Jane Smith", "age": 25, "city": "Busan", "active": false},
                {"name": "Bob Johnson", "age": 35, "city": "Incheon", "active": true},
                {"name": "Alice Brown", "age": 28, "city": "Daegu", "active": true}
            ],

            // 중첩된 객체 배열
            nestedArray: [
                {
                    "id": 1,
                    "name": "Product A",
                    "price": 29.99,
                    "category": {
                        "id": 1,
                        "name": "Electronics"
                    },
                    "tags": ["new", "popular", "sale"],
                    "inventory": {
                        "stock": 100,
                        "warehouse": "Seoul"
                    }
                },
                {
                    "id": 2,
                    "name": "Product B",
                    "price": 49.99,
                    "category": {
                        "id": 2,
                        "name": "Clothing"
                    },
                    "tags": ["fashion", "trendy"],
                    "inventory": {
                        "stock": 50,
                        "warehouse": "Busan"
                    }
                }
            ],

            // 객체 형태의 데이터
            objectData: {
                "users": [
                    {"id": 1, "name": "Admin", "role": "administrator", "lastLogin": "2024-01-15"},
                    {"id": 2, "name": "User1", "role": "user", "lastLogin": "2024-01-14"},
                    {"id": 3, "name": "User2", "role": "user", "lastLogin": "2024-01-13"}
                ],
                "settings": {
                    "theme": "dark",
                    "language": "ko",
                    "notifications": true
                }
            },

            // 다양한 데이터 타입
            mixedTypes: [
                {"string": "Hello World", "number": 42, "boolean": true, "null": null},
                {"string": "안녕하세요", "number": 3.14, "boolean": false, "array": [1, 2, 3]},
                {"string": "Test", "number": -100, "boolean": true, "object": {"key": "value"}}
            ],

            // 빈 데이터
            emptyData: [],

            // 단일 객체
            singleObject: {
                "title": "Sample Document",
                "content": "This is a sample document content.",
                "author": "John Doe",
                "created": "2024-01-15T10:30:00Z",
                "published": true
            }
        };
    }

    /**
     * 샘플 데이터를 가져옵니다.
     * @param {string} type - 샘플 데이터 타입
     * @returns {string} JSON 문자열
     */
    getSampleData(type = 'simpleArray') {
        if (this.sampleData[type]) {
            return JSON.stringify(this.sampleData[type], null, 2);
        }
        return JSON.stringify(this.sampleData.simpleArray, null, 2);
    }

    /**
     * 사용 가능한 샘플 데이터 타입 목록을 반환합니다.
     * @returns {Array} 샘플 데이터 타입 배열
     */
    getSampleDataTypes() {
        return Object.keys(this.sampleData).map(key => ({
            key: key,
            name: this.getSampleDataName(key),
            description: this.getSampleDataDescription(key)
        }));
    }

    /**
     * 샘플 데이터 타입의 표시 이름을 반환합니다.
     * @param {string} type - 샘플 데이터 타입
     * @returns {string} 표시 이름
     */
    getSampleDataName(type) {
        const names = {
            simpleArray: '단순 배열',
            nestedArray: '중첩된 객체 배열',
            objectData: '객체 형태 데이터',
            mixedTypes: '다양한 데이터 타입',
            emptyData: '빈 데이터',
            singleObject: '단일 객체'
        };
        return names[type] || type;
    }

    /**
     * 샘플 데이터 타입의 설명을 반환합니다.
     * @param {string} type - 샘플 데이터 타입
     * @returns {string} 설명
     */
    getSampleDataDescription(type) {
        const descriptions = {
            simpleArray: '기본적인 객체 배열 형태의 데이터',
            nestedArray: '중첩된 객체와 배열을 포함한 복잡한 데이터',
            objectData: '객체 내부에 배열이 포함된 형태의 데이터',
            mixedTypes: '문자열, 숫자, 불린, null 등 다양한 타입의 데이터',
            emptyData: '빈 배열 데이터',
            singleObject: '단일 객체 데이터'
        };
        return descriptions[type] || '샘플 데이터';
    }

    /**
     * JSON 문자열의 유효성을 빠르게 검사합니다.
     * @param {string} jsonString - 검사할 JSON 문자열
     * @returns {boolean} 유효성 여부
     */
    isValidJSON(jsonString) {
        try {
            JSON.parse(jsonString);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * JSON 문자열을 예쁘게 포맷합니다.
     * @param {string} jsonString - 포맷할 JSON 문자열
     * @param {number} indent - 들여쓰기 공백 수
     * @returns {string} 포맷된 JSON 문자열
     */
    formatJSON(jsonString, indent = 2) {
        try {
            const parsed = JSON.parse(jsonString);
            return JSON.stringify(parsed, null, indent);
        } catch (error) {
            return jsonString;
        }
    }
}

// 전역에서 사용할 수 있도록 내보내기
window.JSONParser = JSONParser;
