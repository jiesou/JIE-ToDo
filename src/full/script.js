const task = tasks[parseInt(new URL(location.href)
    .searchParams.get("task"))]

setInterval(() => {
    $("#tasktitle").text(`${task.title} (${FormatTime(new Date(task.date))})`);
    const [color, countdownStr] = TimeLeft(task.date, "long");
    $("#countdown").text(countdownStr).attr("class", `mdui-text-color-${color} mdui-typo-display-3`);
    $("#nowtime").text(FormatTime(new Date(), true));
}, 80);


// PWA 时没有返回键，点击空白处将显示一个返回按钮，两秒后消失
$(document).on("click", () => {
    $("#back-bt").show();
    setTimeout(() => {
        $("#back-bt").hide();
    }, 2000);
});

$("#fullscreen-bt").on("click", async () => {
    const container = document.documentElement;
    const vendor =
        ('fullscreenEnabled' in document && "requestFullscreen") ||
        (webkit[0] in document && "webkitRequestFullscreen") ||
        (moz[0] in document && "mozRequestFullscreen") ||
        (ms[0] in document && "msRequestFullscreen");
    try {
        container[vendor]().then(() =>{
           screen.orientation.lock("landscape").catch(() => {
                window.screen.mozLockOrientation("landscape");
          });
           mdui.snackbar(lang['exit-fullscreen-tip']);
       });
    } catch {
        mdui.snackbar(lang["sth-went-wrong"]);
    } finally {
        $("#fullscreen-bt").addClass('mdui-fab-hide');
    }
});
// const container = document.querySelector(".container");
                // const width = document.body.clientWidth;
                // const height = document.body.clientHeight;
                // // container.width(height)
                // // container.height(width);
                // const angle = screen.orientation.angle;
                // container.style.transform = `rotate(${(angle === 90) ? 0 : angle + 90}deg)`;
                // container.style.height = `100vw`;
                // container.style.width = `100vh`;
                
                // // container.css("right", `100vh`);
                // // container.css("top", `100vh`)
                // // container.css("transform-origin", `left top`);
                // const children = container.children;
                // for (let i = 0; i < children.length; i++) {
                    // const styles = window.getComputedStyle(children[i]);
                    // for (let style in styles) {
                      // console.log(style)    
                    // }
                // }
                
screen.orientation.onchange = () => {
    if (window.screen.orientation.angle === 0) {
        $("#fullscreen-bt").removeClass('mdui-fab-hide');
    }
}

if (new URL(location.href).searchParams.get("autofullscreen") !== null) {
    history.pushState(null, '', GotoPath('/?nofullscreen'));
}
