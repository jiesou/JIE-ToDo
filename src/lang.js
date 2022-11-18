let _currentLang = {
	en: 'en-us',
	zh: 'zh-hans',
	'zh-cn': 'zh-hans',
	'zh-hk': 'zh-hant',
	'zh-tw': 'zh-hant',
	'zh-sg': 'zh-hans',
}[(new URL(location.href).searchParams.get("language") || navigator.language)
  .toLowerCase()];
  // 忽略大小写
  // 语言 fallback 在下方
var lang = {};
(async () => {
    const res = await fetch(`/string/${_currentLang || 'en-us'}.json`);
    lang = await res.json();
    replaceData = (data, key, callback) => {
      callback(data.replace(`{${key}}`, lang[key]))
    }
    
    document.title = lang['appname'];
    // 特殊文本处理
    
    for(let key in lang){
      let elements = document.querySelectorAll(`[data-i18n*='${key}']`)
      if (elements.length < 1) continue
      
      elements.forEach((element) => {
        let data = element.getAttribute('data-i18n');
        let attr = element.getAttribute('data-i18n-attr');
        if (data === key) {
          // 完全等于 key 则不处理，也不格式化
          element.innerText = lang[key];
        } else if (attr) {
          // 指定了替换的参数（默认含待格式化内容
          replaceData(element.getAttribute(attr) || data, key, (text) => {
            element.setAttribute(attr, text);
          });
        } else {
          // 默认 innerText 中含待格式化内容
          replaceData(element.innerText || data, key, (text) => {
            element.innerText = text;
          });
        }
      });
    }
})();
lang.prop = function(key, defaultValue) {
  const args = arguments;
  return lang[key].replace(/\{(\d+)\}/g, function(_, index){
    return args[index.valueOf()];
  });
}
