# JIE-ToDo（README_CN）

[![DeepScan grade](https://deepscan.io/api/teams/19632/projects/23101/branches/689684/badge/grade.svg)](https://deepscan.io/dashboard#view=project&tid=19632&pid=23101&bid=689684)

Material Design 设计的优雅美观的纯前端待办清单/倒计时 Web 程序

## 特性

- 纯前端，无需服务器
- 优雅美观的 Material Design 设计（基于 [MDUI](#鸣谢)）
- 轻量纯净，纯手写 HTML
- 支持 PWA 渐进式 Web 应用，且无网络也可使用
- Todo & 倒计时二合一
- 拖动排序、重要性颜色标注、全屏倒计时 等一应俱全

## 演示

![task list](https://user-images.githubusercontent.com/84175239/193414073-c9ab6a57-dc0c-4f30-ae06-08b8c8acaf55.png)
![fullscreen](https://user-images.githubusercontent.com/84175239/193414076-fc38e688-ca60-4d62-a3f3-382a1b4cf8c2.png)

## 使用

- [Vercel](https://jie-todo.vercel.app)

- [Vercel - dev 分支](https://jie-todo-dev.vercel.app)

- [mumisin.icu 镜像](https://xjp.mumisin.icu)

## 待办

- [x] 基本功能
- [x] 拖动排序
- [x] PWA 支持
- [x] 响应式布局
- [x] 导入导出
- [x] 国际化
- [x] 后台通知
- [x] 前台通知
- [ ] 待办成组

## 国际化

国际化尚在进行中，欢迎你的参与

目前完成：

- en-us 100%
- zh-hans 100%
- zh-hant 100%（直接转换）

## 构建

1. 你只需要 [nodejs](https://nodejs.org)、npm 或 yarn（下方命令采用 yarn）

2. 在根目录下执行 `yarn && yarn build` 即可，输出在 `dst` 文件夹下。可使用 `yarn dev` 进行实时调试

## 鸣谢

- [MDUI](https://mdui.org)
- [Countdown.js](http://countdownjs.org)
- [ShortableJS](https://github.com/SortableJS/jquery-sortablejs)
- [Staticfile CDN](https://www.staticfile.org)
- [gulp.js](https://gulpjs.com)
- 以及更多...
