const [refreshTaskList, updateNotification] = (() => {
    // 限制变量作用域
    const task_list = $("#task-list");

    function addSingleTodo(todo, parent, template) {
        // 设置模板的数据来新建项目
        template.find('input[type="checkbox"]').attr('checked', todo.status ? true : null);
        template.find('.mdui-list-item-title').text(todo.title);
        if (todo.date) {
            template.find('.mdui-list-item-title').next().replaceWith(`<div class="mdui-list-item-text mdui-list-item-one-line">${FormatTime(new Date(todo.date))}</div>`);
        } else {
            template.find('.mdui-list-item-title').next().replaceWith('<span/>')
        }
        parent.append(template.clone().removeClass('todo-template'));
    }

    return [ /*refreshTaskList*/ async (dontUpdateNotification) => {
        // 清空任务列表并遍历全部再添加实现刷新
        task_list.children('label').remove();
        // 没有任务就显示提示
        ((notask) => (tasks.length) ? notask.hide() : notask.show())($("#notask"));
        // 待办组总成模板
        const todo_group_template = $('.todo-group-template');
        // 单待办模板
        const todo_template = $('.todo-template');
        tasks.forEach((task, index) => {
            if (!task) {
                // 占长度但为 null 的任务的可能是各种玄学 bug 产生的错误数据，删去
                tasks.splice(index, 1);
                saveTasks();
                return;
            }

            if (!task.todos) {
                addSingleTodo(task, task_list, todo_template);
            } else {
                // 是待办组
                // 设置模板的数据来新建项目
                todo_group_template.find('.mdui-list-item-content').text(task.title);
                // 从待办组总成中截出 list 部分（不包括 header 标题）
                const todo_group_list = todo_group_template.find('.mdui-list');
                // 设置 list 数据
                todo_group_list.children('label').remove();
                task.todos.forEach((todo) => {
                    addSingleTodo(todo, todo_group_list, todo_template);
                });
                task_list.append(todo_group_template.clone().removeClass('todo-group-template'));
                // 设置拖动排序
                task_list.last().find('.mdui-list').sortable({
                    group: {
                        name: "todo-group",
                        put: "todo-root"
                    },
                    filter: "#todo-group-menu",
                    preventOnFilter: false,
                    animation: 150,
                    delay: 100,
                    fallbackOnBody: true,
                    swapThreshold: 0.65,
                    onAdd: function (evt) {
                        // 有待办拖入
                        console.log('add', evt)
                        tasks[index].todos.splice(evt.newIndex - 1, 0, tasks.splice(evt.oldIndex - 1, 1)[0]);
                        saveTasks();
                    },
                    onRemove: function (evt) {
                        // 有待办拖出
                        console.log('remove', evt)
                        tasks.splice(evt.newIndex - 1, 0, tasks[index].todos.splice(evt.oldIndex - 1, 1)[0]);
                        saveTasks();
                        console.log(tasks)
                    },
                    onUpdate: function (evt) {
                        // 重新排序
                        console.log('update', evt)
                        tasks[index].todos.splice(evt.newIndex - 1, 0, tasks[index].todos.splice(evt.oldIndex - 1, 1)[0]);
                        saveTasks();
                    }
                });
            }
        });
        // 设置完成勾选框的点击事件
        $('#task-list input').on('click', (e) => {
            // 得到点击的任务元素
            const item = $(e.target).closest(".mdui-list-item");
            let task;
            if (item.parent("#task-list").length) {
                // 父元素直接是根列表，说明不是待办组
                const root_index = item.index("#task-list > label");
                task = tasks[root_index];
            } else {
                const todo_group = item.closest(".mdui-collapse-item");
                const root_index = todo_group.index("#task-list > label");
                // 通过已获取的 root_index 即待办组相对于根列表的索引，来获取这个待办组，并获取其子列表中的 label
                // 这里用了 nth-of-type，+1 只是 CSS 选择器下标的转换，不用作跳过非任务元素
                const sub_index = item.index(`#task-list > label:nth-of-type(${root_index + 1}) .mdui-list > label`);
                task = tasks[root_index].todos[sub_index];
            }
            task.status = (!task.status);
            saveTasks();
        });
        (!dontUpdateNotification) ? updateNotification() : null;
    }, /*updateNotification*/ async () => {
        // 渲染任务旁的短倒计时
        task_list.children('label').each((index, element) => {
            element = $(element);
            const todo_group_list = element.children('.mdui-list');
            if (todo_group_list.length) {
                // 是待办组
                const root_index = index;
                todo_group_list.children('label').each((sub_index, element) => {
                    const [color, countdown] = TimeLeft(tasks[root_index].todos[sub_index].date, 'short');
                    $(element).find('#task-countdown').replaceWith(`<div class="mdui-list-item-title mdui-list-item-one-line mdui-text-color-${color}">${countdown}</div>`);
                });
            } else {
                const [color, countdown] = TimeLeft(tasks[index].date, 'short');
                element.find('#task-countdown').replaceWith(`<div class="mdui-list-item-title mdui-list-item-one-line mdui-text-color-${color}">${countdown}</div>`);
            }
        });

        // 更新前后台通知
        const registration = await navigator.serviceWorker.ready;
        if (!('periodicSync' in registration)) return false;
        navigator.permissions.query({
            name: 'periodic-background-sync',
        }).then((permissionStatus) => {
            const usePeriodicSync = permissionStatus.state === 'granted';
            navigator.serviceWorker.ready.then(registration => {
                registration.periodicSync.getTags().then((tags) => {
                    tags.forEach((tag) => registration.periodicSync.unregister(tag));
                    settings.foregroundNotify = [];
                    for (let i in tasks) {
                        if (tasks[i].status || typeof tasks[i].notify !== 'number') continue;
                        const tag = JSON.stringify({
                            schedule: tasks[i].date - tasks[i].notify,
                            notification: [lang['notification-remind'], {
                                tag: tasks[i].id,
                                body: lang.prop('time-to-sth', tasks[i].title),
                                icon: './img/favicon/icon-512.png'
                            }]
                        });
                        settings.foregroundNotify.push(tag);
                        if (usePeriodicSync) registration.periodicSync.register(tag, {
                            minInterval: 60 * 1000,
                        });
                    }
                    saveSettings();
                });
            });
        });
    }];
})();

refreshTaskList(true);
lang.wait.push(updateNotification);

// 拖动排序
$('#task-list').sortable({
    group: {
        name: "todo-root",
        put: "todo-group"
    },
    filter: "#task-menu",
    animation: 150,
    delay: 100,
    fallbackOnBody: true,
    swapThreshold: 0.65,
    onUpdate: function (evt) {
        // 重新排序
        tasks.splice(evt.newIndex - 1, 0, tasks.splice(evt.oldIndex - 1, 1)[0]);
        saveTasks();
    }
});

// // 待办组右键菜单
// $("#task-list .mdui-collapse-item .mdui-list .mdui-list-item").on("contextmenu", (e) => {
// // 通过 DOM 树分别获取所点击的任务的注入菜单点（所在 list-item）和索引
// const point = $(e.target).closest(".mdui-list-item");
// openedMenuTarget = point.index() - 1;
// const menu = $("#todo-group-menu");
// new mdui.Menu(point, menu, {
// "boolean": false,
// "align": "right"
// }).open();
// return false;
// });

// 菜单的各个功能
$("#todo-group-menu li:nth-child(2) a").on("click", () => {
    console.log('TODO')
});


// 单待办菜单
$("#task-list > .mdui-list-item").on("contextmenu", (event) => {
    // 通过 DOM 树分别获取所点击的任务的注入菜单点（所在 list-item）和索引
    const point = $(event.target).closest(".mdui-list-item");
    if (point.parent('.mdui-collapse-item-body').length) return false;
    const menuTarget = point.index() - 1;
    const menu = $("#task-menu");
    // 未设置目标时间的任务不能全屏
    $(menu.children().get(0)).attr("disabled", () => (tasks[menuTarget].date) ? null : true);
    new mdui.Menu(point, menu, {
        "boolean": false,
        "align": "right"
    }).open();

    // 菜单的各个功能
    $("#task-menu-full").on("click", () => {
        if (!tasks[menuTarget].date) {
            mdui.snackbar(lang['none-time-fullscreen']);
        } else {
            location.href = GotoPath(`/full?task=${menuTarget}`);
        }
    });

    // 设置 待办对话框 为编辑功能
    $("#todo-dialog").off().on('open.mdui.dialog', (event) => onTodoDialogOpen(event, menuTarget));

    $("#task-menu-del").on("click", () => {
        const i = menuTarget;
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
    return false;
});

// 添加/编辑 待办 对话框

// 关闭长按菜单时恢复原对话框功能（添加待办而不是编辑待办）
$("#task-menu").on("close.mdui.menu", () => {
    $("#todo-dialog").off().on('open.mdui.dialog', (event) => onTodoDialogOpen(event));
}).trigger('close.mdui.menu');
// 同时初始化默认对话框功能

function onTodoDialogOpen(event, menuTarget) {
    const dialog = event._detail.inst.$element;
    const template = $('.todo-dialog-content-template')

    // 设置当前对话框应设置的数据
    let nowTask;
    if (typeof menuTarget === 'number') {
        // 对话框标题
        dialog.children('.mdui-dialog-title').text(lang.prop('edit-todo', tasks[menuTarget].title));
        nowTask = tasks[menuTarget]
    } else {
        dialog.children('.mdui-dialog-title').text(lang['add-todo']);
        nowTask = {
            title: '',
            date: null,
            notify: null,
        }
    }

    // 填充该待办的数据
    // 初始化模板内元素
    const [title, date, notify_checkbox, notify_input] = [
        template.find('input[type="text"]'),
        template.find('input[type="datetime-local"]'),
        template.find('input[type="checkbox"]'),
        template.find('input[type="number"]')];

    //title
    title.val(nowTask.title);
    if (nowTask.date) {
        // date
        date.val(new Date(nowTask.date -
            // 这里的 toISOString 会把时区转换为 UTC。但我们只要它的格式，所以把时区偏移掉
            // 偏移量单位为分钟
            // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/getTimezoneOffset
            // 因为中日战争时上海时区被改成 UTC+9 导致 .getTimezoneOffset() 需要一个实例
            // slice 去掉末尾的 Z，否则无法识别
            new Date().getTimezoneOffset() * 60000).toISOString().slice(0, -1));
    } else {
        // 没有 date 就先禁用 notify 的 checkbox
        notify_checkbox.attr('disabled', true);
    }

    let task_notify_enable;
    if (nowTask.notify !== null) {
        // 有 notify 就勾上 checkbox
        notify_checkbox.attr('checked', true);
        // notify 具体值（这里单位是分钟）
        notify_input.val(nowTask.notify / 60000);
        task_notify_enable = true;
    }
    // 提醒我 checkbox 切换
    notify_checkbox.on("click", () => {
        task_notify_enable = !task_notify_enable;
        // 获取通知权限
        Notification.requestPermission().then(async notifyPers => {
            // 测试浏览器环境
            if (!('serviceWorker' in navigator) || !('periodicSync' in await navigator.serviceWorker.ready)) {
                // 不支持后台同步
                mdui.snackbar(lang.prop('notify-not-available', lang['browser-doest-support']));
            } else {
                // 获取后台同步权限
                const periodicPers = await navigator.permissions.query({
                    name: 'periodic-background-sync',
                });
                if (notifyPers !== 'granted' || periodicPers.state !== 'granted') {
                    mdui.snackbar(lang.prop('notify-not-available', lang['need-installed-and-permission']));
                } else {
                    // 可用！！
                    mdui.snackbar(lang['notify-activated']);
                }
            }
        });
    });
    // 用户设置了目标时间
    date.on("input", () => {
        if (date.val() !== '') {
            // 允许勾选 提醒我
            dialog.find("input[type='checkbox']").removeAttr("disabled")
        }
    });

    // 确定按钮
    dialog.off().on('confirm.mdui.dialog', () => {
        // 如果有编辑索引则表示是编辑任务

        // 初始化模板内元素
        const [title, date, notify_input] = [
            dialog.find('input[type="text"]'),
            dialog.find('input[type="datetime-local"]'),
            dialog.find('input[type="number"]')];

        const newTitle = title.val();
        if (newTitle.length < 1) {
            mdui.snackbar(lang['todo-things-cant-none']);
            return false;
        }
        const newTask = {
            title: newTitle,
            date: new Date(date.val()).getTime(),
            notify: (task_notify_enable && date.val() !== '') ? (notify_input.val() * 60000 || 0) : null,
            updateTime: new Date().getTime(),
            id: GenerationId()
        }
        if (typeof menuTarget === 'number') {
            newTask.status = nowTask.status;
            tasks.splice(menuTarget, 1, newTask);
        } else {
            newTask.status = false;
            // 是添加任务则 push 到最后面
            tasks.push(newTask);
        }
        saveTasks();
        refreshTaskList();
    });

    // 填充对话框 content
    dialog.children('.mdui-dialog-content').replaceWith(template.clone().removeClass('todo-dialog-content-template'));
    // 刷新对话框高度
    event._detail.inst.handleUpdate();
}


const add_task_fabs = $("#add-task-fabs");
add_task_fabs.on("opened.mdui.fab", () => {
    add_task_fabs.children().first().attr("mdui-dialog", "{target: '#todo-dialog', history: false}");
});
add_task_fabs.on("closed.mdui.fab", () => {
    add_task_fabs.children().first().removeAttr("mdui-dialog", "{target: '#todo-dialog', history: false}");
});

$("#add-todo-group").on("click", () => {
    const newTodoGroup = {
        title: lang['todo-group'],
        todos: [],
        updateTime: new Date().getTime(),
        id: GenerationId()
    }
    tasks.push(newTodoGroup);
    saveTasks();
    refreshTaskList();
});



// 设置各项功能
((dialog) => {
    /* auto-fullscreen */
    const auto_fullscreen = dialog.find(".auto-fullscreen")
    if (settings.autoFullscreen) {
        if (new URL(location.href).searchParams.get("nofullscreen") === null) {
            if (tasks[0] && tasks[0].date) {
                location.href = GotoPath('/full?task=0&autofullscreen');
            }
        }
        auto_fullscreen.attr("checked", true);
    }
    auto_fullscreen.on("click", () => {
        settings.autoFullscreen = !settings.autoFullscreen;
        saveSettings();
    });

    /* multi-storage */
    const multi_storage = $(".multi-storage")
    if (settings.multiStorage) multi_storage.attr("checked", true);
    multi_storage.on("click", () => {
        DeleteData(true);
        // 防止另一存储源遗留多余占用并导致数据混乱
        settings.multiStorage = !settings.multiStorage;
        saveSettings();
    });

    /* import-export-actions */
    ((actions) => {
        /* export-settings */
        actions.eq(0).on("click", () => {
            SaveFile(`JIE-ToDo_tasks-${FormatTime()}.json`,
                new Blob([window.localStorage.getItem("tasks") || '[]'], {
                    type: "text/plain;charset=utf-8"
                }));
        });

        /* import-merge */
        actions.eq(1).on("click", () => {
            ReadFile((data) => {
                const back = [...tasks];
                let count;
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

        /* import-override */
        actions.eq(2).on("click", () => {
            ReadFile((data) => {
                const importFunc = () => {
                    const back = [...tasks];
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
    })(dialog.find(".import-export-actions").children());

    /* clear-data */
    dialog.find(".clear-data").on("click", () => {
        mdui.snackbar({
            message: lang['clear-all-data-warn'],
            buttonText: lang.confirm,
            onButtonClick: DeleteData
        });
    });
})($("#settings-dialog"));
