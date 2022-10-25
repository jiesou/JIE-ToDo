var $ = mdui.$;

multiStorage = {
    set: function(key, obj) {
        window.localStorage.setItem(key, JSON.stringify(obj));
        document.cookie = key + '=' + encodeURIComponent(JSON.stringify(obj));
    },
    get: function(key) {
        return [ JSON.parse(window.localStorage.getItem(key)) || [],
          JSON.parse(decodeURIComponent(document.cookie.match(new RegExp(`(?<=${key}=)[^;]+`)))) || [] ];
    }
}
diffCheckWith = {
    get: function(key) {
        const [localStorage, cookies] = multiStorage.get(key);
        const [diffs, mergedData] = MergeData(key, localStorage, cookies);
        if (diffs > 0) {
            multiStorage.set(key, mergedData);
            mdui.snackbar('发现多存储备份冲突，已合并处理');
        }
        return mergedData;
    },
    set: function(key, value) {
        const src = diffCheckWith.get(key);
        const [diffs, mergedData] = MergeData(key, src, value);
        if (diffs > 1) {
            value = mergedData;
            mdui.snackbar('发现脏数据，已合并处理');
        }
        multiStorage.set(key, value);
    }
}

let tasks = diffCheckWith.get("tasks");
function saveTasks() {
    diffCheckWith.set("tasks", tasks);
}
let settings = diffCheckWith.get("settings");
function saveSettings() {
    settings.updateTime = new Date().getTime();
    diffCheckWith.set("settings", settings);
}

function MergeData(datatype, a, b) {
    let diffs = 0;
    let output = a;
    switch(datatype) {
     case 'tasks':
        if (a.length < 1) {
          output = a;
          diffs++;
        } else {
            for (const i in b) {
                const eachB = b[i];
                if (a.every((eachA) => (eachA.title !== eachB.title || eachA.date !== eachB.date))) {
                    output.push(eachB);
                    diffs++;
                }
            }
        }
        break;
     case 'settings':
        if (a.updateTime !== b.updateTime) {
            diffs = 1;
            (b.updateTime > a.updateTime) ? (output = b) : null;
        }
        break;
    }
    return [diffs, output]
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
    const shorter = (screen < 360 ||
        // 位于两种响应式宽度之间时也采用更短的格式 (https://www.mdui.org/docs/grid#responsive)
        (screen > 600 && (screen - 600) < 50) ||
        (screen > 1024 && (screen - 1024) < 200));

    const now = new Date().getTime();
    let startWith = "";
    let expired
    let left = endDate - now;
    if (left < 0) {
        if (type === "short") {
            return ["blue", shorter ? "已过" : "已经过了"]
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
            ~(countdown.SECONDS | countdown.MILLISECONDS | countdown.WEEKS),
            shorter ? 1 : 2).toString()]
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
    // MIUI 浏览器（或者 X5 内核）的 toLocaleString 中间没空格，这里兼容一下
    return date.toLocaleDateString("zh") + ' ' +
        date.toLocaleTimeString("zh", {hour: '2-digit', minute: '2-digit',
        second: hasSeconds ? "2-digit" : undefined});
}
