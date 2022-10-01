var $ = mdui.$;

// 读取保存的 tasks
var tasks = JSON.parse(window.localStorage.getItem("tasks")) || [];

countdown.setLabels(
    ' 毫秒| 秒| 分| 时| 天| 周| 月| 年| 十年| 世纪| 千年',
    ' 毫秒| 秒| 分| 时| 天| 周| 月| 年| 十年| 世纪| 千年',
    ' ',
    ', ',
    '现在');

function timeLeft(endDate, type) {
    const now = new Date().getTime();
    let startWith = "";
    let expired
    let left = endDate - now;
    if (left < 0) {
        if (type === "short") {
            return ["blue", "已经过了"]
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
        return [important, countdown(now, endDate, ~(countdown.SECONDS|countdown.MILLISECONDS|countdown.WEEKS), 2).toString()]
    } else if (type === "long") {
        return [expired || important, startWith + countdown(now, endDate, ~countdown.MILLISECONDS, 0, 3).toString()]
    }
}

function saveTasks() {
    window.localStorage.setItem("tasks", JSON.stringify(tasks));
}

function formatTime(date) {
    if (!date) {
        date = new Date()
    }
    return date.toLocaleString("zh", {hour12: false})
}