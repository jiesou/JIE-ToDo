const task_list = $("#task-list");
async function refreshTaskList(dontUpdateNotification) {
    // 清空任务列表并遍历全部再添加实现刷新
    task_list.find("label").remove();
    // 没有任务就显示提示
    if (!tasks.length) {
        $("#notask").show();
    } else {
        $("#notask").hide();
    }
    for (let i in tasks) {
        if (!tasks[i]) {
            // 占长度但为 null 的任务的可能是各种玄学 bug 产生的错误数据，删去
            tasks.splice(i, 1);
            saveTasks();
        }
        let checked = ""
        if (tasks[i].status) {
            checked = " checked";
        }

        const date = (tasks[i].date) ? `<div class="mdui-list-item-text mdui-list-item-one-line">${FormatTime(new Date(tasks[i].date))}</div>` : '';
        const [color, countdown] = TimeLeft(tasks[i].date, 'short');
        // 响应式表格 https://www.mdui.org/docs/grid#responsive
        task_list.append(`<label class="mdui-list-item mdui-col-xs-12 mdui-col-sm-6 mdui-col-md-3 mdui-ripple">
        <div class="mdui-checkbox">
            <input type="checkbox"${checked}/><i class="mdui-checkbox-icon"></i>
        </div>
        <div class="mdui-list-item-content">
          <div id="list-item-title" class="mdui-list-item-title mdui-list-item-one-line">${tasks[i].title}</div>
          ${date}
        </div>
        <div class="mdui-list-item-title mdui-list-item-one-line mdui-text-color-${color}">${countdown}</div>
      </label>`);
    }

    // 完成或取消完成任务
    $('#task-list input').on('click', (e) => {
        // 得到点击的任务索引
        const i = $(e.target).closest(".mdui-list-item").index() - 1;
        tasks[i].status = (!tasks[i].status);
        saveTasks();
    });

    (!dontUpdateNotification) ? updateNotification() : null;
}
async function updateNotification() {
  navigator.permissions.query({
    name: 'periodic-background-sync',
  }).then((permissionStatus) => {
    mdui.snackbar(permissionStatus.state)
    if (permissionStatus.state !== 'granted') {
      // mdui.snackbar(lang['allow-notification-pls']);
      // return false;
    }
    navigator.serviceWorker.ready.then(registration => {
        for (let i in tasks) {
            if (tasks[i].status || tasks[i].notify === null) {
              continue;
            }
            const tag = JSON.stringify({
              type: "scheduleNotification",
              schedule: tasks[i].date - tasks[i].notify,
              notification: [lang['notification-remind'],{
                  tag: tasks[i].id,
                  body: lang.prop('time-to-sth', tasks[i].title),
                  icon: './img/favicon/icon-512.png'
                }]
            });
            registration.periodicSync.getTags().then((tags) => {
              if (!tags.includes(tag)) registration.periodicSync.register(tag, {
                  minInterval: 60 * 1000,
              });
            });
        }
      });
  });
}

refreshTaskList(true);

lang.wait.push(updateNotification);

// 拖动排序
$('#task-list').sortable({
    filter: "#task-menu",
    animation: 150,
    delay: 100,
    onUpdate: function (evt) {
        // 重新排序
        tasks.splice(evt.newIndex - 1, 0, tasks.splice(evt.oldIndex - 1, 1)[0]);
        saveTasks();
    }
});

// 长按或右键任务打开菜单
$(document).on("contextmenu", (e) => {
    // 通过 DOM 树分别获取所点击的任务的注入菜单点（所在 list-item）和索引
    const point = $(e.target).closest(".mdui-list-item");
    const i = point.index() - 1;
    const menu = $("#task-menu");
    // 为菜单设置属性，方便后续获取
    menu.attr("task", i);
    // 未设置目标时间的任务不能全屏
    if (!tasks[i].date) {
        menu.find("#task-menu-full").attr("disabled", true);
    } else {
        menu.find("#task-menu-full").removeAttr("disabled");
    }
    new mdui.Menu(point, menu, {
        "boolean": false,
        "align": "right"
    }).open();
    return false;
});

// 被打开菜单的任务的索引
function currentTaskMenuTaskIndex() {
    return $("#task-menu").attr("task");
}

// 菜单的各个功能
$("#task-menu-full").on("click", () => {
    if (!tasks[currentTaskMenuTaskIndex()].date) {
        mdui.snackbar(lang['none-time-fullscreen']);
    } else {
        location.href = GotoPath(`/full?task=${currentTaskMenuTaskIndex()}`);
    }
});
let editingIndex;
$("#task-menu-edit").on("click", () => {
    editingIndex = currentTaskMenuTaskIndex();
});

$("#task-menu-del").on("click", () => {
    const i = currentTaskMenuTaskIndex();
    const back = tasks[i];
    tasks.splice(i, 1);
    refreshTaskList();
    saveTasks();
    mdui.snackbar({
        message: lang.prop('deleted-sth', back.title),
        buttonText: lang.undo,
        onButtonClick: function () {
            tasks.splice(i, 0, back);
            refreshTaskList();
            saveTasks();
        }
    });
});

// 设置各项功能
const fullscreen_on_start_settings_bt = $("#auto-fullscreen-settings-bt")
if (settings.autoFullscreen) {
    if (new URL(location.href).searchParams.get("nofullscreen") === null) {
        if (tasks[0] && tasks[0].date) {
            location.href = GotoPath('/full?task=0&autofullscreen');
        }
    }
    fullscreen_on_start_settings_bt.attr("checked", true);
}
fullscreen_on_start_settings_bt.on("click", () => {
    settings.autoFullscreen = !settings.autoFullscreen;
    saveSettings();
});
const multi_storage_settings_bt = $("#multi-storage-settings-bt")
settings.multiStorage ? multi_storage_settings_bt.attr("checked", true) : null;
multi_storage_settings_bt.on("click", () => {
    DeleteData(true);
    // 防止另一存储源遗留多余占用并导致数据混乱
    settings.multiStorage = !settings.multiStorage;
    saveSettings();
})

$("#export-settings-bt").on("click", () => {
    SaveFile(`JIE-ToDo_tasks-${FormatTime()}.json`,
      new Blob([window.localStorage.getItem("tasks") || '[]'], {
        type: "text/plain;charset=utf-8"
    }));
});

$("#import-merge-settings-bt").on("click", () => {
    ReadFile((data) => {
        const back = [ ...tasks ];
        let count = 0;
        if (!tasks.length) {
            tasks = JSON.parse(data);
            count = tasks.length;
        } else {
            [count, tasks] = MergeData("tasks", JSON.parse(data), tasks, true);
        }
        refreshTaskList();
        saveTasks();
        mdui.snackbar({
            message: lang.prop('merge-imported-many', count),
            buttonText: lang.undo,
            onButtonClick: function () {
                tasks = back;
                refreshTaskList();
                saveTasks();
            }
        });
    });
});
$("#import-override-settings-bt").on("click", () => {
    ReadFile((data) => {
        const importFunc = () => {
            const back = [ ...tasks ];
            tasks = JSON.parse(data);
            refreshTaskList();
            saveTasks();
            mdui.snackbar({
                message: lang.prop('override-imported-many', tasks.length),
                buttonText: lang.undo,
                onButtonClick: function () {
                    tasks = back;
                    refreshTaskList();
                    saveTasks();
                }
            });
        }
        if (tasks.length) {
            mdui.snackbar({
                message: lang['override-import-warn'],
                buttonText: lang.confirm,
                timeout: 0,
                onButtonClick: importFunc
            });
        } else {
            importFunc();
        }
    });
});

$("#clear-data-settings-bt").on("click", () => {
    mdui.snackbar({
      message: lang['clear-all-data-warn'],
      buttonText: lang.confirm,
      onButtonClick: DeleteData
    });
});

let task_notify_enable = false;
let task_notify;
let task_notify_checkbox;
let task_notify_input;
lang.wait.push(() => {
  task_notify = $("#task-notify");
  task_notify_checkbox = task_notify.find("input[type='checkbox']");
  task_notify_input = task_notify.find("input.mdui-textfield-input")
  task_notify_checkbox.on("click", () => {
      task_notify_enable = !task_notify_enable;
      Notification.requestPermission().then(async notifyPers => {
        const periodicPers = await navigator.permissions.query({
          name: 'periodic-background-sync',
        }).state;
        if (notifyPers !== 'granted' || periodicPers !== 'granted') {
          mdui.snackbar(lang['allow-notification-pls']);
        }
      });
  });
});
const task_dialog = $("#task-dialog");
const task_title = $("#task-title > input");
const task_date = $("#task-date > input");
// task_date.on("input propertychange change", () => {
    // console.log(task_date.val())
    // if (task_date.val() !== '') {
      // task_notify_checkbox.removeAttr("disabled")
    // } else if (task_notify_checkbox) {
      // task_notify_checkbox.attr("disabled", true);
      // task_notify_checkbox.clone().appendTo(task_notify);
      // task_notify_checkbox.remove();
      // task_notify_checkbox = task_notify.find("input[type='checkbox']");
      // task_notify_enable = false;
      // task_notify_checkbox.mutation();
    // }
// });
// 添加/编辑任务对话框的确定
task_dialog.on('confirm.mdui.dialog', () => {
    const title = task_title.val();
    if (title.length < 1) {
        mdui.snackbar(lang['todo-things-cant-none']);
    } else {
        const newTask = {
            title: title,
            date: new Date(task_date.val()).getTime(),
            notify: (task_notify_enable || true) ? (task_notify_input.val()*60000 || 0): null,
            updateTime: new Date().getTime(),
            id: GenerationId()
        }
        // 如果有编辑索引则表示是编辑任务
        if (editingIndex) {
            newTask.status = tasks[editingIndex].status;
            tasks.splice(editingIndex, 1, newTask);
        } else {
            newTask.status = false;
            // 是添加任务则 push 到最后面
            tasks.push(newTask);
        }
        saveTasks();
        refreshTaskList();
    }
});
task_dialog.on('open.mdui.dialog', () => {
    if (editingIndex) {
      task_title.val(tasks[editingIndex].title);
      task_date.val(tasks[editingIndex].date ? new Date(tasks[editingIndex].date -
          // 这里的 toISOString 会把时区转换为 UTC。但我们只要它的格式，所以把时区偏移掉
          // 偏移量单位为分钟
          // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/getTimezoneOffset
          // 因为中日战争时上海时区被改成 UTC+9 导致 .getTimezoneOffset() 需要一个实例
          // slice 去掉末尾的 Z，否则无法识别
          new Date().getTimezoneOffset() * 60000).toISOString().slice(0, -1) : undefined);
      (tasks[editingIndex].notify !== null) ? task_notify_checkbox.attr("checked", true) : null;
      task_notify_input.val((tasks[editingIndex].notify === null) ? "" : tasks[editingIndex].notify / 60000);
    }
});
task_dialog.on('closed.mdui.dialog', () => {
    task_title.val("");
    task_date.val("");
    // task_notify_enable = false;
    task_notify.removeAttr("checked");
    task_notify_input.val("");
    // task_notify_checkbox.attr("disabled", true);
    editingIndex = null;
});