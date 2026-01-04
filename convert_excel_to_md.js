import XLSX from 'xlsx';
import fs from 'fs';

// 读取 Excel 文件
const workbook = XLSX.readFile('Meta 转化广告调优逻辑- campaign层级.xlsx');

let markdown = '# Meta 转化广告调优逻辑 - Campaign 层级\n\n';

// 遍历所有工作表
workbook.SheetNames.forEach(sheetName => {
    markdown += `## ${sheetName}\n\n`;

    const worksheet = workbook.Sheets[sheetName];

    // 转换为 JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    if (jsonData.length === 0) {
        markdown += '*空表*\n\n';
        return;
    }

    // 获取表头
    const headers = jsonData[0];

    // 创建表格头部
    markdown += '| ' + headers.join(' | ') + ' |\n';
    markdown += '| ' + headers.map(() => '---').join(' | ') + ' |\n';

    // 添加数据行
    for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        // 确保每行的列数与表头一致
        const paddedRow = headers.map((_, idx) => {
            const cell = row[idx];
            return cell !== undefined && cell !== null ? String(cell) : '';
        });
        markdown += '| ' + paddedRow.join(' | ') + ' |\n';
    }

    markdown += '\n';
});

// 输出 Markdown
console.log(markdown);

// 同时保存到文件
fs.writeFileSync('Meta转化广告调优逻辑-campaign层级.md', markdown, 'utf8');
console.error('\n✅ Markdown 文件已保存到: Meta转化广告调优逻辑-campaign层级.md');
