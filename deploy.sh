#!/usr/bin/env sh

set -x  # 这里是为了看错误日志

# 打包路径
distPath="./dist"
# 发布路径文件夹
releasePath='./docs'

# 打包项目
pnpm build

#删除发布目录下的文件
rm -r $releasePath
echo "已删除 ==> $releasePath 目录"
mkdir $releasePath
echo "已新建 ==> $releasePath 目录"

# 复制打包目录内的文件到发布目录
cp -r $distPath/* $releasePath
echo "已复制 $distPath/* ==> $releasePath"

# 进入打包后的文件夹并提交
cd $releasePath
git add -A
git commit -m '自动部署'

# 将打包后的文件推送到指定分支
git push -u origin main
echo "发布成功"