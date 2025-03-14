export interface NavBarItem {
    key?: string;
    label?: string;
    children?: NavBarItem[];
    type?: string;
    onClick?: () => void; // 添加可选的onClick方法
    isCurrentTheme?: boolean; // 修改为布尔值类型，因为computed返回的是布尔值
}