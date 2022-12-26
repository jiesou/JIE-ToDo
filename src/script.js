const [refreshTaskList, updateNotification] = (() => {
  // 限制变量作用域
  const task_list = $("#task-list");
  function addSingleTodo(todo, parent, template) {
    // 设置模板的数据来新建项目
    template.find('input[type="checkbox"]').attr('checked', todo.status ? true : null);
    template.find('.mdui-list-item-title').text(todo.title);
    todo.date ? template.find('.mdui-list-item-text').text(FormatTime(new Date(todo.date))) : template.find('.mdui-list-item-text').remove();
    parent.append(template.clone().removeClass('todo-template'));
  }
  
  return [ /*refreshTaskList*/ async (dontUpdateNotification) => {
      // 清空任务列表并遍历全部再添加实现刷新
      task_list.children('label').remove();
      // 没有任务就显示提示
      (tasks.length) ? $("#notask").hide() : $("#notask").show();
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
              todo_group_list.sortable({
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
              // 设置 list 数据
              todo_group_list.children('label').remove();
              task.todos.forEach((todo) => {
                addSingleTodo(todo, todo_group_list, todo_template);
              });
              task_list.append(todo_group_template.clone().removeClass('todo-group-template'));
          }
      });
      // 设置完成勾选框的点击事件
      $('#task-list input').on('click', (e) => {
          // 得到点击的任务索引
          const i = $(e.target).closest(".mdui-list-item").index() - 1;
          tasks[i].status = (!tasks[i].status);
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
          const parent_index = index;
          todo_group_list.children('label').each((sub_index, element) => {
            const [color, countdown] = TimeLeft(tasks[parent_index].todos[sub_index].date, 'short');
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
                  if (tasks[i].status || tasks[i].notify === null) continue;
                  const tag = JSON.stringify({
                    schedule: tasks[i].date - tasks[i].notify,
                    notification: [lang['notification-remind'],{
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

// 待办组右键菜单
$("#task-list .mdui-collapse-item .mdui-list .mdui-list-item").on("contextmenu", (e) => {
    // 通过 DOM 树分别获取所点击的任务的注入菜单点（所在 list-item）和索引
    const point = $(e.target).closest(".mdui-list-item");
    openedMenuTarget = point.index() - 1;
    const menu = $("#todo-group-menu");
    new mdui.Menu(point, menu, {
        "boolean": false,
        "align": "right"
    }).open();
    return false;
});

// 菜单的各个功能
$("#todo-group-menu li:nth-child(2) a").on("click", () => {
    console.log('TODO')
});

((dialog) => {
  let task_title = task_date = task_notify_input = task_notify_enable = false;
  
  dialog.on('open.mdui.dialog', (event) => {
      let title = date = '';
      if (typeof openedMenuTarget === 'number') {
        title = tasks[openedMenuTarget].title;
        task_dialog.children('.mdui-dialog-title').text(lang.prop('edit-todo', title))
        date = tasks[openedMenuTarget].date ? new Date(tasks[openedMenuTarget].date -
          // 这里的 toISOString 会把时区转换为 UTC。但我们只要它的格式，所以把时区偏移掉
          // 偏移量单位为分钟
          // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/getTimezoneOffset
          // 因为中日战争时上海时区被改成 UTC+9 导致 .getTimezoneOffset() 需要一个实例
          // slice 去掉末尾的 Z，否则无法识别
          new Date().getTimezoneOffset() * 60000).toISOString().slice(0, -1) : checked = 'disabled';
        if (tasks[openedMenuTarget].notify !== null) {
          checked = 'checked';
          notify = tasks[openedMenuTarget].notify / 60000;
          task_notify_enable = true;
        }
      } else {
        task_dialog.children('.mdui-dialog-title').text(lang['add-todo'])
        checked = 'disabled';
      }
      task_dialog.children('.mdui-dialog-content').html(`
  <div id="task-title" class="mdui-textfield">
      <label class="mdui-textfield-a">${lang['todo-things']}</label>
      <input type="text" class="mdui-textfield-input" value="${title}">
  </div>
  <div id="task-date" class="mdui-textfield">
      <label class="mdui-textfield-a">${lang['target-time']+lang['optional']}</label>
      <input type="datetime-local" class="mdui-textfield-input" value="${date}">
  </div>
  <label id="task-notify" class="mdui-checkbox">
      <input type="checkbox" ${checked}/>
      <i class="mdui-checkbox-icon"></i>
      <span>${lang['notify-x-minutes-1']}</span>
      <div class="mdui-col-xs-3 mdui-textfield">
          <input class="mdui-textfield-input" type="number" placeholder="0" value="${notify}"/>
      </div>
      ${lang['notify-x-minutes-2']}
  </label>`);
      task_title = task_dialog.find("#task-title > input");
      task_date = task_dialog.find("#task-date > input");
      const task_notify = $("#task-notify");
      task_notify_checkbox = task_notify.find("input[type='checkbox']");
      task_notify_input = task_notify.find("input.mdui-textfield-input")
      task_notify_checkbox.on("click", () => {
          task_notify_enable = !task_notify_enable;
          Notification.requestPermission().then(async notifyPers => {
            if (!('serviceWorker' in navigator) || !('periodicSync' in await navigator.serviceWorker.ready)) {
              mdui.snackbar(lang.prop('notify-not-available', lang['browser-doest-support']));
            } else {
              const periodicPers = await navigator.permissions.query({
                name: 'periodic-background-sync',
              });
              if (notifyPers !== 'granted' || periodicPers.state !== 'granted') {
                mdui.snackbar(lang.prop('notify-not-available', lang['need-installed-and-permission']));
              } else {
                mdui.snackbar(lang['notify-activated']);
              }
            }
          });
      });
      task_date.on("input", () => {
          if (task_date.val() !== '') {
            task_notify_checkbox.removeAttr("disabled")
          // } else if (task_notify_checkbox) {
            // task_notify_checkbox.attr("disabled", true);
            // task_notify_enable = false;
          }
      });
      event._detail.inst.handleUpdate();
  });
  dialog.on('closed.mdui.dialog', () => {
      task_notify_enable = false;
      openedMenuTarget = null;
  });
})($("#todo-group-dialog"));



let openedMenuTarget;
// 单待办菜单
$("#task-list > .mdui-list-item").on("contextmenu", (e) => {
    // 通过 DOM 树分别获取所点击的任务的注入菜单点（所在 list-item）和索引
    const point = $(e.target).closest(".mdui-list-item");
    if (point.parent('.mdui-collapse-item-body').length) return false;
    openedMenuTarget = point.index() - 1;
    const menu = $("#task-menu");
    // 未设置目标时间的任务不能全屏
    $(menu.children().get(0)).attr("disabled", () => (tasks[openedMenuTarget].date) ? null : true);
    new mdui.Menu(point, menu, {
        "boolean": false,
        "align": "right"
    }).open();
    return false;
});
$("#task-menu").on("close.mdui.menu", () => openedMenuTarget = null);


// 菜单的各个功能
$("#task-menu-full").on("click", () => {
    if (!tasks[openedMenuTarget].date) {
        mdui.snackbar(lang['none-time-fullscreen']);
    } else {
        location.href = GotoPath(`/full?task=${openedMenuTarget}`);
    }
});

$("#task-menu-del").on("click", () => {
    const i = openedMenuTarget;
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


const add_task_fabs = $("#add-task-fabs");
add_task_fabs.on("opened.mdui.fab", () => {
  add_task_fabs.children().first().attr("mdui-dialog", "{target: '#task-dialog', history: false}");
});
add_task_fabs.on("closed.mdui.fab", () => {
  add_task_fabs.children().first().removeAttr("mdui-dialog", "{target: '#task-dialog', history: false}");
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
})

// 添加/编辑单个待办对话框各元素
const task_dialog = $("#task-dialog");
let task_title = task_date = task_notify_input = task_notify_enable = false;
// 添加/编辑任务对话框的确定
task_dialog.on('confirm.mdui.dialog', () => {
    const title = task_title.val();
    if (title.length < 1) {
      mdui.snackbar(lang['todo-things-cant-none']);
      return false;
    }
    const newTask = {
      title: title,
      date: new Date(task_date.val()).getTime(),
      notify: (task_notify_enable && task_date.val() !== '') ? (task_notify_input.val()*60000 || 0): null,
      updateTime: new Date().getTime(),
      id: GenerationId()
    }
    // 如果有编辑索引则表示是编辑任务
    if (openedMenuTarget) {
      newTask.status = tasks[openedMenuTarget].status;
      tasks.splice(openedMenuTarget, 1, newTask);
    } else {
      newTask.status = false;
      // 是添加任务则 push 到最后面
      tasks.push(newTask);
    }
    saveTasks();
    refreshTaskList();
});
task_dialog.on('open.mdui.dialog', (event) => {
    let title = date = checked = notify = '';
    if (typeof openedMenuTarget === 'number') {
      title = tasks[openedMenuTarget].title;
      task_dialog.children('.mdui-dialog-title').text(lang.prop('edit-todo', title))
      date = tasks[openedMenuTarget].date ? new Date(tasks[openedMenuTarget].date -
        // 这里的 toISOString 会把时区转换为 UTC。但我们只要它的格式，所以把时区偏移掉
        // 偏移量单位为分钟
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/getTimezoneOffset
        // 因为中日战争时上海时区被改成 UTC+9 导致 .getTimezoneOffset() 需要一个实例
        // slice 去掉末尾的 Z，否则无法识别
        new Date().getTimezoneOffset() * 60000).toISOString().slice(0, -1) : checked = 'disabled';
      if (tasks[openedMenuTarget].notify !== null) {
        checked = 'checked';
        notify = tasks[openedMenuTarget].notify / 60000;
        task_notify_enable = true;
      }
    } else {
      task_dialog.children('.mdui-dialog-title').text(lang['add-todo'])
      checked = 'disabled';
    }
    task_dialog.children('.mdui-dialog-content').html(`
<div id="task-title" class="mdui-textfield">
    <label class="mdui-textfield-a">${lang['todo-things']}</label>
    <input type="text" class="mdui-textfield-input" value="${title}">
</div>
<div id="task-date" class="mdui-textfield">
    <label class="mdui-textfield-a">${lang['target-time']+lang['optional']}</label>
    <input type="datetime-local" class="mdui-textfield-input" value="${date}">
</div>
<label id="task-notify" class="mdui-checkbox">
    <input type="checkbox" ${checked}/>
    <i class="mdui-checkbox-icon"></i>
    <span>${lang['notify-x-minutes-1']}</span>
    <div class="mdui-col-xs-3 mdui-textfield">
        <input class="mdui-textfield-input" type="number" placeholder="0" value="${notify}"/>
    </div>
    ${lang['notify-x-minutes-2']}
</label>`);
    task_title = task_dialog.find("#task-title > input");
    task_date = task_dialog.find("#task-date > input");
    const task_notify = $("#task-notify");
    task_notify_checkbox = task_notify.find("input[type='checkbox']");
    task_notify_input = task_notify.find("input.mdui-textfield-input")
    task_notify_checkbox.on("click", () => {
        task_notify_enable = !task_notify_enable;
        Notification.requestPermission().then(async notifyPers => {
          if (!('serviceWorker' in navigator) || !('periodicSync' in await navigator.serviceWorker.ready)) {
            mdui.snackbar(lang.prop('notify-not-available', lang['browser-doest-support']));
          } else {
            const periodicPers = await navigator.permissions.query({
              name: 'periodic-background-sync',
            });
            if (notifyPers !== 'granted' || periodicPers.state !== 'granted') {
              mdui.snackbar(lang.prop('notify-not-available', lang['need-installed-and-permission']));
            } else {
              mdui.snackbar(lang['notify-activated']);
            }
          }
        });
    });
    task_date.on("input", () => {
        if (task_date.val() !== '') {
          task_notify_checkbox.removeAttr("disabled")
        // } else if (task_notify_checkbox) {
          // task_notify_checkbox.attr("disabled", true);
          // task_notify_enable = false;
        }
    });
    event._detail.inst.handleUpdate();
});
task_dialog.on('closed.mdui.dialog', () => {
    task_notify_enable = false;
    openedMenuTarget = null;
});