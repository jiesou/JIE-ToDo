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
            console.log("Error: task is null");
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
            date = `<div class="mdui-list-item-text mdui-list-item-one-line">${formatTime(new Date(tasks[i].date))}</div>`
            const left = timeLeft(tasks[i].date, "short");
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
    // 通过 DOM 树分别获取所点击的任务的注入菜单点（所在 list-item）和标题
    const point = $(e.target).closest(".mdui-list-item");
    if (!point.length) {
        return;
    }
    const title = point.find("#list-item-title").text();

    // 通过标题获取任务的索引
    const menu = $("#task-menu");
    for (let i = 0; i < tasks.length; i++) {
        if (tasks[i].title === title) {
            // 为菜单设置属性，方便后续获取
            menu.attr("task", i);
            // 未设置目标时间的任务不能全屏
            if (!tasks[i].date) {
                menu.find("#task-menu-full").attr("disabled", true);
            } else {
                menu.find("#task-menu-full").removeAttr("disabled");
            }
            break;
        }
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
        mdui.snackbar("未设置目标时间的任务不能全屏");
    } else {
        location.href = `/full?task=${currentTaskMenuTaskIndex()}`
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
        message: `已删除 ${back.title}`,
        buttonText: '撤销',
        onButtonClick: function () {
            tasks.splice(i, 0, back);
            refreshTaskList();
            saveTasks();
        }
    });
});

// 设置各项功能
$("settings-dialog").on('open.mdui.dialog', () => {
    if (settings.fullscreenOnStart) {
        $("#fullscreen-on-start-settings-bt").attr("checked", true);
    }
});

$("#export-settings-bt").on("click", () => {
    const data = window.localStorage.getItem("tasks") || "[]";
    const filename = `JIE-ToDo_tasks-${formatTime()}.json`;
    const blob = new Blob([data], {
        type: "text/plain;charset=utf-8"
    });
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
});

function readFile(func) {
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

$("#import-merge-settings-bt").on("click", () => {
    readFile((data) => {
        JSON.parse(data).forEach((task) => {
            if (tasks.every((t) => t.title !== task.title)) {
                tasks.push(task);
            }
        });
        refreshTaskList();
        saveTasks();
        mdui.snackbar("合并导入成功");
    });
});
$("#import-replace-settings-bt").on("click", () => {
    readFile((data) => {
        const importFunc = () => {
            tasks = JSON.parse(data);
            refreshTaskList();
            saveTasks();
            mdui.snackbar("覆盖导入成功");
        }
        if (tasks.length) {
            mdui.snackbar({
                message: '覆盖导入将会清空当前已存在的待办！',
                buttonText: '确定',
                timeout: 0,
                onButtonClick: importFunc
            });
        } else {
            importFunc();
        }
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
            "title": title,
            "date": new Date(task_date.find("input").val()).getTime()
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