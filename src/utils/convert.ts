export default function convertType(type: string) {
    if (type === 'text') {
        return '文本';
    }
    if (type === 'image') {
        return '图片';
    }
    return '未知内容';
}