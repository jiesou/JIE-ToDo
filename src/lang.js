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
fetch(`/string/${_currentLang || 'en-us'}.json`).then(async (res) => {
  let lang = await res.json();
  document.title = lang.appname || 'JIE-ToDo';
  // 标题做特殊 fallback
  for(let key in lang){
    let element = document.querySelector(`[data-i18n*='${key}']`)
    if (element) {
      let data = element.getAttribute('data-i18n');
      if (data === key) {
        // 全是 key 不处理
        data = lang[key];
      } else {
        // 含待格式化内容
        data = (element.innerText || data).replace(`{${key}}`, lang[key]);
        // element.innerText 中可能存在替换到一半的内容
      }
      element.innerText = data;
    }
  }
});