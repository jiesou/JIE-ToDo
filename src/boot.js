var $ = mdui.$;
// var $ = jQuery;

let settings = {};
settings.multiStorage = window.localStorage.getItem("multiStorage");

let _storage = (settings.multiStorage) ? {
    set: function(key, obj) {
        window.localStorage.setItem(key, JSON.stringify(obj));
        document.cookie = key + '=' + encodeURIComponent(JSON.stringify(obj)) + ';max-age=10000000000';
    },
    get: function(key) {
        return [ JSON.parse(window.localStorage.getItem(key)),
          JSON.parse(decodeURIComponent(document.cookie.match(new RegExp(`(?<=${key}=)[^;]+`)))) ];
    }
} : {
    set: function(key, obj) {
        window.localStorage.setItem(key, JSON.stringify(obj));
    },
    get: function(key) {
        return [ JSON.parse(window.localStorage.getItem(key)) ];
    }
};

let _diffCheckWith = {
    get: function(key) {
        const [localStorage, cookies] = _storage.get(key);
        const [diffs, mergedData] = MergeData(key, localStorage, cookies);
        if (diffs > 0) {
            _storage.set(key, mergedData);
            // 发现多存储备份冲突，合并处理
        }
        return mergedData;
    },
    set: function(key, value) {
        _storage.set(key, value);
    }
}

let tasks = _diffCheckWith.get("tasks");
function saveTasks() {
    _diffCheckWith.set("tasks", tasks);
}
settings = { multiStorage: settings.multiStorage === 'true', ..._diffCheckWith.get("settings") };
function saveSettings() {
    settings.updateTime = new Date().getTime();
    const multiStorage = settings.multiStorage;
    delete settings.multiStorage;
    _diffCheckWith.set("settings", settings);
    // multiStorage 单独存储
    window.localStorage.setItem("multiStorage", multiStorage);
}

function MergeData(datatype, a, b) {
    let diffs = 0;
    // output 默认为 b
    let output = b || [];
    switch(datatype) {
     case 'tasks':
        // 两个都不存在则初始化，tasks 初始化是 arr
        if (!a && !b) { output = []; break; }
        if (!a || !b) {
            // 其中一项为空则直接拿另一项替换
            output = a || b;
            // 没开 multiStorage 那只有一项也是正常的
            diffs = (settings.multiStorage) ? 1 : 0;
            break;
        }
        for (const i in output) {
            const eachA = a[i];
            (!eachA.id || !eachA.updateTime) ? ThrowCorrupted('id 或 updateTime 属性丢失') : null ;
            // 根据 eachA 的 id 在 b 中也找到对应 task 的索引
            const bIndexSameIdAsEachA = 
              output.findIndex((eachB) => (eachA.id === eachB.id));
            // 找不到是 -1
            if (bIndexSameIdAsEachA === -1) {
              output.push(eachA);
              diffs++;
            } else {
              if (eachA.updateTime > b[bIndexSameIdAsEachA].updateTime) {
                output.push(eachA);
                diffs++;
                ThrowCorrupted('存在时间不匹配项目（已自动修复）');
              } // else 正常情况 或 b 新
            }
        }
        break;
     case 'settings':
        // settings 初始化是 obj
        if (!a && !b) { output = {}; break; }
        if (!a || !b) {
            output = a || b;
            diffs = (settings.multiStorage) ? 1 : 0;
            break;
        }
        // 此处只有两项直接照时间替换
        if (a.updateTime !== b.updateTime) {
            diffs = 1;
            (a.updateTime > b.updateTime) ? (output = a) : null;
        }
        break;
    }
    return [diffs, output]
}

function ThrowCorrupted(msg) {
    const outputData = () => {
        SaveFile(`JIE-ToDo_tasks_multiStorage-${FormatTime()}.json`,
          new Blob([JSON.stringify({localStorage: window.localStorage.getItem('tasks') || '[]', 
            cookies: decodeURIComponent(document.cookie.match(new RegExp(`(?<=tasks=)[^;]+`)))})], {
                type: "text/plain;charset=utf-8"
        }));
    }
    mdui.dialog({
      title: '<i class="mdui-icon material-icons">warning</i> 数据遭致命损坏！',
      content: msg + ' 您也可点击空白处关闭警示来继续使用，下方展示建议操作',
      buttons: [
        {
          text: '导出多存储源数据（无法直接重新导入）',
          onClick: outputData
        },
        {
          text: '导出并清除全部数据以恢复原样',
          onClick: () => {
            outputData();
            DeleteAllData();
          }
        }
      ]
    });
}

function DeleteAllData() {
    window.localStorage.clear();
    const keys = document.cookie.match(/[^=]+[^;]+/g) || [];
    for(let i = keys.length; i--;) {
        document.cookie = keys[i] + '=0;max-age=0'
    }
    window.location = '/';
}

function GenerationId() {
    return Math.random().toString(36).slice(-10) +
      new Date().getTime().toString(32).slice(-4)
}

function ReadFile(func) {
    // tks https://stackoverflow.com/a/50782106
    const fileInput = document.createElement("input")
    fileInput.type = 'file'
    fileInput.style.display = 'none'
    fileInput.onchange = (e) => {
        const file = e.target.files[0]
        if (!file) {
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            const data = e.target.result
            func(data);
            document.body.removeChild(fileInput);
        }
        reader.readAsText(file);
    }
    document.body.appendChild(fileInput);
    fileInput.click();
}
function SaveFile(filename, blob) {
// tks https://stackoverflow.com/a/30832210
    if (window.navigator.msSaveOrOpenBlob) // IE10+
        window.navigator.msSaveOrOpenBlob(blob, filename);
    else { // Others
        const a = document.createElement("a"),
            url = URL.createObjectURL(blob);
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(function () {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }, 0);
    }
}

countdown.setLabels(
    ' 毫秒| 秒| 分| 时| 天| 周| 月| 年| 十年| 世纪| 千年',
    ' 毫秒| 秒| 分| 时| 天| 周| 月| 年| 十年| 世纪| 千年',
    ' ',
    ', ',
    '现在');

function TimeLeft(endDate, type) {
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

function FormatTime(date, hasSeconds) {
    date = date || new Date();
    // MIUI 浏览器（或者 X5 内核）的 toLocaleString 中间没空格，这里兼容一下
    return date.toLocaleDateString("zh") + ' ' +
        date.toLocaleTimeString("zh", {hour: '2-digit', minute: '2-digit',
        second: hasSeconds ? "2-digit" : undefined});
}
