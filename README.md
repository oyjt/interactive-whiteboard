# 互动白板

使用`vite`+`vue3`+`typescript`+`fabric`创建的互动白板项目

![](/example/demo.png)

预览地址：[https://icnpath.com/interactive-whiteboard/](https://icnpath.com/interactive-whiteboard/)

## 主要功能
- [x] 撤销重做
- [x] 画布缩放
- [x] 自由绘制
- [x] 形状绘制
- [x] 橡皮擦
- [x] 清空画布
- [x] 动态调整鼠标光标
- [x] PPT预览
- [x] 图片插入
- [x] 图片插入默认居中
- [x] 白板画面实时同步
- [x] 白板传输数据gzip压缩
- [ ] 画笔尺寸调整
- [ ] 画笔颜色选择

## 使用说明

1. 安装依赖
```
pnpm install
``` 

2. 进入`node_modules/fabric`执行下面的命令
```
node build.js modules=ALL exclude=gestures,accessors requirejs minifier=uglifyjs
```

> 温馨提示：执行以上命令，需要全局安装`uglifyjs`，安装命令如下：
>```
>npm install uglifyjs -g
>```

3. 运行项目
```
pnpm dev
```