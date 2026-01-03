/**
 * CSV 解析工具类
 * 用于解析游戏数据表
 */
export class CSVParser {
    /**
     * 解析 CSV 文本为对象数组
     * @param csvText CSV 文本内容
     * @param delimiter 分隔符，默认为逗号
     * @returns 解析后的对象数组
     */
    public static parse(csvText: string, delimiter: string = ','): any[] {
        if (!csvText || csvText.trim() === '') {
            return [];
        }

        const lines = csvText.trim().split(/\r?\n/);
        
        if (lines.length < 2) {
            return [];
        }

        // 解析表头
        const headers = this.parseLine(lines[0], delimiter);
        
        const result: any[] = [];

        // 解析数据行
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // 跳过空行和注释行
            if (line === '' || line.startsWith('#') || line.startsWith('//')) {
                continue;
            }

            const values = this.parseLine(line, delimiter);
            const obj: any = {};

            for (let j = 0; j < headers.length; j++) {
                const header = headers[j].trim();
                const value = j < values.length ? values[j].trim() : '';
                
                // 尝试转换数值
                obj[header] = this.parseValue(value);
            }

            result.push(obj);
        }

        return result;
    }

    /**
     * 解析单行 CSV（处理引号内的逗号）
     * @param line 单行文本
     * @param delimiter 分隔符
     * @returns 字段数组
     */
    private static parseLine(line: string, delimiter: string): string[] {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const nextChar = i + 1 < line.length ? line[i + 1] : '';

            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    // 转义的引号 ""
                    current += '"';
                    i++;
                } else {
                    // 切换引号状态
                    inQuotes = !inQuotes;
                }
            } else if (char === delimiter && !inQuotes) {
                // 字段结束
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }

        // 添加最后一个字段
        result.push(current);

        return result;
    }

    /**
     * 解析值（自动类型转换）
     * @param value 字符串值
     * @returns 转换后的值
     */
    private static parseValue(value: string): any {
        // 去除首尾引号
        if (value.startsWith('"') && value.endsWith('"')) {
            value = value.slice(1, -1);
        }

        // 空值
        if (value === '' || value.toLowerCase() === 'null') {
            return '';
        }

        // 布尔值
        if (value.toLowerCase() === 'true') {
            return true;
        }
        if (value.toLowerCase() === 'false') {
            return false;
        }

        // 数值
        if (/^-?\d+$/.test(value)) {
            return parseInt(value, 10);
        }
        if (/^-?\d*\.\d+$/.test(value)) {
            return parseFloat(value);
        }

        // 默认返回字符串
        return value;
    }

    /**
     * 将对象数组转换为 CSV 文本
     * @param data 对象数组
     * @param delimiter 分隔符
     * @returns CSV 文本
     */
    public static stringify(data: any[], delimiter: string = ','): string {
        if (!data || data.length === 0) {
            return '';
        }

        // 获取所有列名
        const headers = Object.keys(data[0]);

        // 生成表头行
        const headerLine = headers.map(h => this.escapeValue(h, delimiter)).join(delimiter);

        // 生成数据行
        const dataLines = data.map(row => {
            return headers.map(h => {
                const value = row[h];
                return this.escapeValue(value !== undefined ? String(value) : '', delimiter);
            }).join(delimiter);
        });

        return [headerLine, ...dataLines].join('\n');
    }

    /**
     * 转义字段值
     * @param value 字段值
     * @param delimiter 分隔符
     * @returns 转义后的值
     */
    private static escapeValue(value: string, delimiter: string): string {
        // 如果包含分隔符、引号或换行，需要用引号包裹
        if (value.includes(delimiter) || value.includes('"') || value.includes('\n')) {
            // 双引号需要转义为两个双引号
            return '"' + value.replace(/"/g, '""') + '"';
        }
        return value;
    }

    /**
     * 根据条件筛选数据
     * @param data 数据数组
     * @param conditions 条件对象
     * @returns 筛选后的数据
     */
    public static filter(data: any[], conditions: { [key: string]: any }): any[] {
        return data.filter(row => {
            for (const key in conditions) {
                if (row[key] !== conditions[key]) {
                    return false;
                }
            }
            return true;
        });
    }

    /**
     * 根据字段值查找单条数据
     * @param data 数据数组
     * @param key 字段名
     * @param value 字段值
     * @returns 找到的数据或 undefined
     */
    public static findByKey(data: any[], key: string, value: any): any | undefined {
        return data.find(row => row[key] === value);
    }

    /**
     * 按字段分组
     * @param data 数据数组
     * @param key 分组字段
     * @returns 分组后的数据
     */
    public static groupBy(data: any[], key: string): { [key: string]: any[] } {
        const result: { [key: string]: any[] } = {};
        
        for (const row of data) {
            const groupKey = String(row[key]);
            if (!result[groupKey]) {
                result[groupKey] = [];
            }
            result[groupKey].push(row);
        }

        return result;
    }
}










