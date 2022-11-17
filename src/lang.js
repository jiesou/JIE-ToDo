let _language = new URL(location.href).searchParams.get("language") || navigator.language;
fetch(`/string/${_language}.json`).then(async (res) => {
  let lang = await res.json();
  document.title = lang.appname || 'JIE-ToDo';
  for(let key in lang){
    let element = document.querySelector(`[data-i18n='${key}']`)
    element ? element.innerText = lang[key] : null;
  }
});