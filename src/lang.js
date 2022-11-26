let _currentLang = {
	zh: 'zh-hans',
	'zh-cn': 'zh-hans',
	'zh-hk': 'zh-hant',
	'zh-tw': 'zh-hant',
	'zh-sg': 'zh-hans',
}[(new URL(location.href).searchParams.get("language") || navigator.language)
  .toLowerCase()] || 'en-us';
document.querySelector(':root').setAttribute('lang', _currentLang);
  // 忽略大小写
var lang = {
  init: async function() {
    const res = await fetch(`/string/${_currentLang}.json`);
    lang = {...this, ...await res.json()};
    
    lang['appname'] ? document.title = lang['appname'] : null;
    // 特殊文本处理
    
    replaceData = (data, key, callback) => {
      callback(data.replace(`{${key}}`, lang[key]))
    }
    for(let key in lang){
      let elements = document.querySelectorAll(`[data-i18n*='${key}']`)
      if (elements.length < 1) continue
      
      elements.forEach((element) => {
        let data = element.getAttribute('data-i18n');
        let attr = element.getAttribute('data-i18n-attr');
        if (data === key) {
          // 完全等于 key 则不处理，也不格式化
          element.innerHTML += lang[key];
        } else if (attr) {
          if (attr === '[INNER]') {
            replaceData(element.innerHTML, key, (text) => {
              element.innerHTML = text;
            });
          } else {
            // 指定了替换的参数（默认含待格式化内容
            replaceData(element.getAttribute(attr) || data, key, (text) => {
              element.setAttribute(attr, text);
            });
          }
        } else if(data.indexOf('{') !== -1) {
          // 默认含待格式化内容
          replaceData(element.innerHTML || data, key, (text) => {
            element.innerHTML = text;
          });
        }
      });
    }
  },
  wait: [],
  prop: function(key, defaultValue) {
    const args = arguments;
    return lang[key].replace(/\{(\d+)\}/g, function(_, index){
      return args[index.valueOf()];
    });
  }
}
lang.init().then(() => {
  for (const index in lang.wait) {
    lang.wait[index]();
    // 执行等待列表中的函数
  }
});
