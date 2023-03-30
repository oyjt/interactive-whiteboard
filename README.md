# 互动白板

使用vite+vue3+typescript+fabric创建的互动白板项目

# 主要功能
- [x] 撤销重做
- [x] 画布缩放
- [x] 自由绘制
- [x] 形状绘制
- [x] 橡皮擦
- [x] 清空画布
- [x] 动态调整鼠标光标
- [x] PPT预览
- [x] 图片插入
- [x] 白板画面实时同步
- [x] 白板传输数据gzip压缩
- [ ] 画笔尺寸调整
- [ ] 画笔颜色选择

## 使用说明

1. 安装依赖
```
pnpm init
``` 

2. 进入`node_modules/fabric`执行下面的命令
```
node build.js modules=ALL exclude=gestures,accessors,erasing requirejs minifier=uglifyjs
```

3. 运行项目
```
pnpm dev
```