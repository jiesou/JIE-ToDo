var $ = mdui.$;

let tasks = JSON.parse(window.localStorage.getItem("tasks")) || [];
function saveTasks() {
    window.localStorage.setItem("tasks", JSON.stringify(tasks));
}

let settings = JSON.parse(window.localStorage.getItem("settings")) || {};
function saveSettings() {
    window.localStorage.setItem("settings", JSON.stringify(settings));
}

countdown.setLabels(
    ' 毫秒| 秒| 分| 时| 天| 周| 月| 年| 十年| 世纪| 千年',
    ' 毫秒| 秒| 分| 时| 天| 周| 月| 年| 十年| 世纪| 千年',
    ' ',
    ', ',
    '现在');


function timeLeft(endDate, type) {
    const screen = document.body.clientWidth;

    // 特别窄的屏幕用更短的格式
    const moreShort = (screen < 360 ||
        // 位于两种响应式宽度之间时也采用更短的格式 (https://www.mdui.org/docs/grid#responsive)
        (screen > 600 && (screen - 600) < 50) ||
        (screen > 1024 && (screen - 1024) < 200));

    const now = new Date().getTime();
    let startWith = "";
    let expired
    let left = endDate - now;
    if (left < 0) {
        if (type === "short") {
            return ["blue", moreShort ? "已过" : "已经过了"]
        } else if (type === "long") {
            expired = "blue";
            startWith = "过了 "
        }
    }
    let important;
    if (left <= 60000) {
        // 1m
        important = "red"
    } else if (left <= 3600000) {
        // 1h
        important = "orange"
    } else if (left <= 43200000) {
        // 12h
        important = "yellow"
    } else if (left >= 259200000) {
        // >3d
        important = "green"
    } else {
        important = "theme-text"
    }
    if (type === "short") {
        return [important, countdown(now, endDate,
            ~(countdown.SECONDS | countdown.MILLISECONDS | countdown.WEEKS), moreShort ? 1 : 2).toString()]
    } else if (type === "long") {
        return [expired || important, startWith + countdown(now, endDate,
            // 根据不同设备宽度，调整长倒计时的单位种类
            screen < 1024 ? countdown.DEFAULTS : ~(countdown.MILLISECONDS),
            // 根据不同设备宽度，调整长倒计时的单位数量
            Math.floor(screen / 180), 1).toString()]
    }
}

function formatTime(date, hasSeconds) {
    date = date || new Date();
    return date.toLocaleString("zh", {hour12: false,
        year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
        second: hasSeconds ? "2-digit" : undefined});
}
