function refreshTaskList() {
    const task_list = $("#task-list");
    // 清空任务列表并遍历全部再添加实现刷新
    task_list.find("label").remove();
    // 没有任务就显示提示
    if (!tasks.length) {
        $("#notask").show();
    }
    for (let i = 0; i < tasks.length; i++) {
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
        task_list.append(`<label class="mdui-list-item mdui-col-xs-12 mdui-col-sm-6 mdui-col-md-3 mdui-ripple">
        <div class="mdui-checkbox"><input type="checkbox"${checked}/><i class="mdui-checkbox-icon"></i></div>
        <div class="mdui-list-item-content">
          <div id="list-item-title" class="mdui-list-item-title mdui-list-item-one-line">${tasks[i].title}</div>
          ${date}
        </div>
        <div class="mdui-list-item-title mdui-list-item-one-line mdui-text-color-${color}">${countdown}</div>
      </label>`);
    }

    // 完成或取消完成任务
    $('#task-list input').on('click', (e) => {
        // 得到点击的标题并修改数据
        const click_title = $(e.target).closest(".mdui-list-item").find("#list-item-title").text();
        for (let i = 0; i < tasks.length; i++) {
            if (tasks[i].title === click_title) {
                tasks[i].status = (!tasks[i].status);
                break;
            }
        }
        saveTasks();
    });

}
    // 拖动排序
    Sortable.create(document.getElementById("task-list"), {
        filter: "#menu",
        animation: 150,
        delay: 200,
        onUpdate: function (evt) {
            if (evt.oldIndex < evt.newIndex) {
                // 向下拖动
                for (let i = evt.oldIndex - 1; i < evt.newIndex - 1; i++) {
                    [tasks[i], tasks[i + 1]] = [tasks[i + 1], tasks[i]];
                }
            } else {
                // 向上拖动
                for (let i = evt.oldIndex - 1; i > evt.newIndex - 1; i--) {
                    [tasks[i], tasks[i - 1]] = [tasks[i - 1], tasks[i]];
                }
            }
            saveTasks();
        },
    });

refreshTaskList();


// 长按或右键任务打开菜单
$(document).on("contextmenu", (e) => {
    // 通过 DOM 树分别获取所点击的任务的注入菜单点（所在 list-item）和标题
    const point = $(e.target).closest(".mdui-list-item");
    if (!point.length) {
        return;
    }
    const title = point.find("#list-item-title").text();

    // 通过标题获取任务的索引
    const menu = $("#menu");
    for (let i = 0; i < tasks.length; i++) {
        if (tasks[i].title === title) {
            // 为菜单设置属性，方便后续获取
            menu.attr("task", i);
            // 未设置目标时间的任务不能全屏
            if (!tasks[i].date) {
                menu.find("#menu-full").attr("disabled", true);
            } else {
                menu.find("#menu-full").removeAttr("disabled");
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
function currentMenuTaskIndex() {
    return $("#menu").attr("task");
}

// 菜单的各个功能
$("#menu-full").on("click", () => {
    if (!tasks[currentMenuTaskIndex()].date) {
        mdui.snackbar("未设置目标时间的任务不能全屏");
    } else {
        location.href = `/full?task=${currentMenuTaskIndex()}`
    }
});
const task_dialog = $("#task-dialog");
$("#menu-edit").on("click", () => {
    task_dialog.attr("editing", currentMenuTaskIndex());
    $("#task-title > input").val(tasks[currentMenuTaskIndex()].title);
    $("#task-date > input").val(formatTime(new Date(tasks[currentMenuTaskIndex()].date)));
});
$("#menu-del").on("click", () => {
    const i = currentMenuTaskIndex();
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

// 添加/编辑任务对话框的确定
task_dialog.on('confirm.mdui.dialog', () => {
    const task_title = $("#task-title");
    const task_date = $("#task-date");
    const title = task_title.find("input").val();
    if (title.length < 1) {
        task_title.addClass("mdui-textfield-invalid");
        setTimeout(() => {
            task_title.removeClass("mdui-textfield-invalid");
        }, 1000);
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
        location.href = "/";
    }
});
task_dialog.on('closed.mdui.dialog', () => {
    $("#task-title > input").val("");
    $("#task-date > input").val("");
    task_dialog.removeAttr("editing");
});