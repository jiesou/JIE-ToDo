jQuery = undefined;
var $ = mdui.$;

let settings = {
  multiStorage: window.localStorage.getItem("multiStorage") === 'true'
};

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
settings = { ...settings, ..._diffCheckWith.get("settings") };
function saveSettings() {
    settings.updateTime = new Date().getTime();
    const multiStorage = settings.multiStorage;
    delete settings.multiStorage;
    _diffCheckWith.set("settings", settings);
    // multiStorage 单独存储
    window.localStorage.setItem("multiStorage", multiStorage);
}

function MergeData(datatype, a, b, nowarn) {
    // diffs 供判断是否需要覆盖存储
    let diffs = 0;
    // output 默认为 b
    let output = b || [];
    switch(datatype) {
     case 'tasks':
        // 两个都不存在则初始化，tasks 初始化是 arr
        if ((!a && !b) || ((a && !a.length) && (b && !b.length))) { output = []; break; }
        if (!a || !b || !a.length || !b.length) {
            // 其中一项为空则直接拿另一项替换
            output = (!a || !a.length) ? b : a;
            // 没开 multiStorage 那只有一项也是正常的
            if (settings.multiStorage) {
              diffs++;
              //ThrowError('Index Mismatch');
            }
            break;
        }
        for (const i in output) {
            const eachA = a[i];
            ((!eachA.id || !eachA.updateTime) && (!nowarn)) ? ThrowError('id or updateTime Missing') : null ;
            // 根据 eachA 的 id 在 b 中也找到对应 task 的索引
            const bIndexSameIdAsEachA = 
              output.findIndex((eachB) => (eachA.id === eachB.id));
            // 找不到是 -1
            if (bIndexSameIdAsEachA === -1) {
              output.push(eachA);
              diffs++;
              (!nowarn) ? ThrowError('id Mismatch') : null;
            } else {
              if (eachA.updateTime != b[bIndexSameIdAsEachA].updateTime) {
                output[bIndexSameIdAsEachA] =
                    (eachA.updateTime > b[bIndexSameIdAsEachA].updateTime) ? eachA : b[bIndexSameIdAsEachA];
                diffs++;
                (!nowarn) ? ThrowError('updateTime Mismatch') : null;
              } // else 正常情况
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

function ThrowError(msg) {
    lang.wait.push(() => {
      const outputData = () => {
          SaveFile(`JIE-ToDo_tasks_multiStorage-${FormatTime()}.json`,
            new Blob([JSON.stringify({localStorage: window.localStorage.getItem('tasks') || '[]', 
              cookies: decodeURIComponent(document.cookie.match(new RegExp(`(?<=tasks=)[^;]+`)))})], {
                  type: "text/plain;charset=utf-8"
          }));
      }
      mdui.dialog({
        title: '<i class="mdui-icon material-icons">warning</i> ' + lang['sth-went-wrong'],
        content: msg + ' ' + lang['critical-error-warn'],
        buttons: [
          {
            text: lang['export-processed-des'],
            onClick: () => {
              SaveFile(`JIE-ToDo_tasks-${FormatTime()}.json`,
                new Blob([window.localStorage.getItem("tasks") || '[]'], {
                  type: "text/plain;charset=utf-8"
              }));
            }
          },
          {
            text:  lang['export-multi-storage-des'],
            onClick: outputData
          },
          {
            text: lang['export-and-clear-all-data-des'],
            onClick: () => {
              outputData();
              DeleteAllData();
            }
          }
        ],
        history: false,
        onClosed: () => {
          location.href = GotoPath();
        }
      });
    });
}

function DeleteData(onlyCookies) {
    const keys = document.cookie.match(/[^=]+[^;]+/g) || [];
    for(let i = keys.length; i--;) {
        document.cookie = keys[i] + '=0;max-age=0'
    }
    if (!onlyCookies) {
      window.localStorage.clear();
      location.href = GotoPath();
    }
}

function GenerationId() {
    return Math.random().toString(36).slice(-10) +
      new Date().getTime().toString(32).slice(-4)
}

function GotoPath(path){
    const url = new URL(new URL(location.href).origin + path || '/');
    const nowLang = new URL(location.href).searchParams.get("language")
    nowLang ? url.searchParams.set("language", nowLang) : null;
    return url;
}

function FormatTime(date, hasSeconds) {
    date = date || new Date();
    // MIUI 浏览器（或者 X5 内核）的 toLocaleString 中间没空格，这里兼容一下
    return date.toLocaleDateString("zh") + ' ' +
        date.toLocaleTimeString("zh", {hour: '2-digit', minute: '2-digit',
        second: hasSeconds ? "2-digit" : undefined});
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

// switch (_currentLang) {
  // case 'zh-hans':
    // countdown.setLabels(
      // ' 毫秒| 秒| 分| 时| 天| 周| 月| 年| 十年| 世纪| 千年',
      // ' 毫秒| 秒| 分| 时| 天| 周| 月| 年| 十年| 世纪| 千年',
      // ' ',
      // ', ',
      // '现在');
    // _lang = {
      // passed: '已过',
      // 'already-over': '已经过了'
    // }
    // break;
  // case 'zh-hant':
    // countdown.setLabels(
      // ' 毫秒| 秒| 分| 時| 天| 週| 月| 年| 十年| 世紀| 千年',
      // ' 毫秒| 秒| 分| 時| 天| 週| 月| 年| 十年| 世紀| 千年',
      // ' ',
      // ', ',
      // '現在');
    // _lang = {
      // passed: '已過',
      // 'already-over': '已經過了'
    // }
    // break;
  // default:
    // countdown.setLabels(
    // ' ms| s| min| h| d| week| mo| y| decade| century| millennium',
    // ' ms| s| mins| h| d| weeks| mo| y| decades| centuries| millennia',
    // ' and ',
    // ', ',
    // 'Now');
    // _lang = {
      // passed: 'Passed',
      // 'already-over': 'Already over'
    // }
// }

let _lang = {
    passed: '',
    'already-over': ''
};
lang.wait.push(() => {
  _lang = lang;
  countdown.setLabels(lang['countdown-units'],
    lang['countdown-units-plural'],
    lang['countdown-and'],
    ', ',
    lang['countdown-now']
  );
});

function TimeLeft(endDate, type) {
    if (!(endDate && type)) return ['', ''];
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
            return ["blue", shorter ? _lang.passed : _lang['already-over']]
        } else if (type === "long") {
            expired = "blue";
            startWith = _lang.passed + ' '
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
