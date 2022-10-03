const task = tasks[parseInt(new URL(location.href)
    .searchParams.get("task"))]

$("#tasktitle").text(`${task.title} (${formatTime(new Date(task.date))})`);
setInterval(() => {
    const [color, countdownStr] = timeLeft(task.date, "long");
    $("#countdown").text(countdownStr).attr("class", `mdui-text-color-${color} mdui-typo-display-3`);
    $("#nowtime").text(formatTime());
}, 80);

// PWA 时没有返回键，点击空白处将显示一个返回按钮，两秒后消失
$(document).on("click", () => {
    $("#back-bt").show();
    setTimeout(() => {
        $("#back-bt").hide();
    }, 2000);
});

$("#fullscreen-bt").on("click", async () => {
    let container = document.documentElement;
    let vendor =
        ('fullscreenEnabled' in document && "requestFullscreen") ||
        (webkit[0] in document && "webkitRequestFullscreen") ||
        (moz[0] in document && "mozRequestFullscreen") ||
        (ms[0] in document && "msRequestFullscreen");
    try {
        container[vendor]();
        await screen.orientation.lock("landscape");
        mdui.snackbar("按 返回键/Esc/F11 退出全屏");
    } catch (e) {
        mdui.snackbar("浏览器似乎不支持全屏");
    }
    $("#fullscreen-bt").addClass('mdui-fab-hide');
});