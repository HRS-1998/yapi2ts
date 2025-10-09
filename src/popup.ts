import { createApp } from 'vue';
import App from './components/App.vue';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import * as ElementPlusIconsVue from '@element-plus/icons-vue';

// 创建Vue应用实例
const app = createApp(App);

// 注册element-plus
app.use(ElementPlus);

// 注册element-plus图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component);
}

// 将应用挂载到DOM元素上
app.mount('#app');

// 导出app供其他地方使用（如果需要）
export default app;