# JIE-ToDo

[![DeepScan grade](https://deepscan.io/api/teams/19632/projects/23101/branches/689684/badge/grade.svg)](https://deepscan.io/dashboard#view=project&tid=19632&pid=23101&bid=689684) [中文](/README_CN.md)

Material Design's elegant and beautiful pure front-end Todo-List & Countdown web application

## Features

- Pure front-end, no server required
- Designed by legant and beautiful Material Design (based on [MDUI](#Thanks))
- Lightweight and clean, pure handwritten HTML
- Supports PWA (Progressive Web Apps) and can works without internet
- Todo-List & Countdown two in one
- Drag-and-drop sorting, importance color markers, full-screen countdown, and more

## Demo

![task list](https://user-images.githubusercontent.com/84175239/193414073-c9ab6a57-dc0c-4f30-ae06-08b8c8acaf55.png)
![fullscreen](https://user-images.githubusercontent.com/84175239/193414076-fc38e688-ca60-4d62-a3f3-382a1b4cf8c2.png)

## Usage

- [Vercel](https://jie-todo.vercel.app)

- [Vercel - dev branch](https://jie-todo-dev.vercel.app)

- [mumisin.icu Mirror (for Chinese users)](https://xjp.mumisin.icu)

## Todo

- [x] Basic functions
- [x] Drag-and-drop sorting
- [x] PWA support
- [x] Responsive layout
- [x] Import and export
- [x] I18n
- [x] Background notification
- [x] Foreground notification
- [ ] Todos group

## I18n

I18n is still in progress, you are welcome to participate

Currently completed:

- en-us 100%
- zh-hans 100%
- zh-hant 100% (direct conversion)

## Build

1. You only need [nodejs](https://nodejs.org), npm or yarn (yarn is used in the demo below)

2. Just run `yarn && yarn build` in the root directory and the output will be in the `dst` folder. You can use `yarn dev` to develop in real time

## Thanks

- [MDUI](https://mdui.org)
- [Countdown.js](http://countdownjs.org)
- [ShortableJS](https://github.com/SortableJS/jquery-sortablejs)
- [Staticfile CDN](https://www.staticfile.org)
- [gulp.js](https://gulpjs.com)
- and more...
