export default function convertType(type: string) {
    if (type === 'text') {
        return '文本';
    }
    if (type === 'image') {
        return '图片';
    }
    if (type === 'file') {
        return '文件';
    }
    return '未知内容';
}