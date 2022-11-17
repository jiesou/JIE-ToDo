let _language = (new URL(location.href).searchParams.get("language") || navigator.language)
    .toLowerCase();
let _langMap = {
	en: 'en-us',
	zh: 'zh-hans',
	'zh-cn': 'zh-hans',
	'zh-hk': 'zh-hant',
	'zh-tw': 'zh-hant',
	'zh-sg': 'zh-hans',
}
fetch(`/string/${_langMap[_language] || 'en-us'}.json`).then(async (res) => {
  let lang = await res.json();
  document.title = lang.appname || 'JIE-ToDo';
  for(let key in lang){
    let element = document.querySelector(`[data-i18n='${key}']`)
    element ? element.innerText = lang[key] : null;
  }
});