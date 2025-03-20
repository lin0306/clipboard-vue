import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { aliases, mdi } from 'vuetify/iconsets/mdi'

// 导入必要的Sass样式和变量
import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css' // 确保你已安装了 @mdi/font
import { useTheme } from '../themes/ThemeContext.ts';
// 获取主题颜色
const { themeColors } = useTheme();

export default createVuetify({
    components,
    directives,
    icons: {
        defaultSet: 'mdi',
        aliases,
        sets: {
            mdi,
        },
    },
    theme: {
        defaultTheme: 'myCustomTheme',
        themes: {
            myCustomTheme: {
                colors: {
                    primary: themeColors.secondary, // 自定义主要颜色
                },
            },
        },
    },
})