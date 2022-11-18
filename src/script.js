function refreshTaskList() {
    const task_list = $("#task-list");
    // 清空任务列表并遍历全部再添加实现刷新
    task_list.find("label").remove();
    // 没有任务就显示提示
    if (!tasks.length) {
        $("#notask").show();
    } else {
        $("#notask").hide();
    }
    for (let i = 0; i < tasks.length; i++) {
        if (!tasks[i]) {
            // 占长度但为 null 的任务的可能是各种玄学 bug 产生的错误数据，删去
            tasks.splice(i, 1);
            saveTasks();
        }
        let checked = ""
        if (tasks[i].status) {
            checked = " checked";
        }

        let date = ""
        let countdown = ""
        let color = ""
        if (tasks[i].date) {
            date = `<div class="mdui-list-item-text mdui-list-item-one-line">${FormatTime(new Date(tasks[i].date))}</div>`
            const left = TimeLeft(tasks[i].date, "short");
            color = left[0];
            countdown = left[1];
            // 回传的是两个参数，一个颜色一个倒计时字符串
        }
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
}

refreshTaskList();

// 拖动排序
Sortable.create(document.getElementById("task-list"), {
    filter: "#task-menu",
    animation: 150,
    delay: 100,
    onUpdate: function (evt) {
        // 重新排序
        tasks.splice(evt.newIndex - 1, 0, tasks.splice(evt.oldIndex - 1, 1)[0]);
        saveTasks();
    },
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
const task_dialog = $("#task-dialog");
$("#task-menu-edit").on("click", () => {
    task_dialog.attr("editing", currentTaskMenuTaskIndex());
    $("#task-title > input").val(tasks[currentTaskMenuTaskIndex()].title);
    $("#task-date > input").val(tasks[currentTaskMenuTaskIndex()].date ? new Date(tasks[currentTaskMenuTaskIndex()].date -
        // 这里的 toISOString 会把时区转换为 UTC。但我们只要它的格式，所以把时区偏移掉
        // 偏移量单位为分钟
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/getTimezoneOffset
        // 因为中日战争时上海时区被改成 UTC+9 导致 .getTimezoneOffset() 需要一个实例
        // slice 去掉末尾的 Z，否则无法识别
        new Date().getTimezoneOffset() * 60000).toISOString().slice(0, -1) : undefined);
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
if (settings.fullscreenOnStart) {
    if (new URL(location.href).searchParams.get("nofullscreen") === null) {
        if (!tasks[0] || !tasks[0].date) {
            mdui.snackbar(lang.prop('auto-fullscreen-failed', lang['none-time-fullscreen']));
        } else {
            location.href = GotoPath('/full?task=0&autofullscreen');
        }
    }
    fullscreen_on_start_settings_bt.attr("checked", true);
}
fullscreen_on_start_settings_bt.on("click", () => {
    settings.fullscreenOnStart = !settings.fullscreenOnStart;
    saveSettings();
});
const multi_storage_settings_bt = $("#multi-storage-settings-bt")
multi_storage_settings_bt.attr("checked", settings.multiStorage ? true : undefined);
multi_storage_settings_bt.on("click", () => {
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
        if (tasks.length === []) {
            tasks = JSON.parse(data);
            count = tasks.length;
        } else {
            [count, tasks] = MergeData("tasks", JSON.parse(data), tasks);
        }
        refreshTaskList();
        saveTasks();
        mdui.snackbar({
            message: `已合并导入 ${count} 条`,
            buttonText: lang.undo,
            onButtonClick: function () {
                tasks = back;
                refreshTaskList();
                saveTasks();
            }
        });
    });
});
$("#import-replace-settings-bt").on("click", () => {
    ReadFile((data) => {
        const importFunc = () => {
            const back = [ ...tasks ];
            tasks = JSON.parse(data);
            refreshTaskList();
            saveTasks();
            mdui.snackbar({
                message: `已覆盖导入 ${tasks.length} 条`,
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
                message: '覆盖导入将会清空当前已存在的待办！',
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
      message: '所有数据都将永远失去！（真的很久）',
      buttonText: lang.confirm,
      onButtonClick: DeleteAllData
    });
});

// 添加/编辑任务对话框的确定
task_dialog.on('confirm.mdui.dialog', () => {
    const task_title = $("#task-title");
    const task_date = $("#task-date");
    const title = task_title.find("input").val();
    if (title.length < 1) {
        mdui.snackbar("事项名不能为空");
    } else {
        let editingIndex = task_dialog.attr("editing");
        const newTask = {
            title: title,
            date: new Date(task_date.find("input").val()).getTime(),
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
task_dialog.on('closed.mdui.dialog', () => {
    $("#task-title > input").val("");
    $("#task-date > input").val("");
    task_dialog.removeAttr("editing");
});