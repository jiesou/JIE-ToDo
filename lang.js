let lang;(t=>{document.querySelector(":root").setAttribute("lang",t),lang={init:async function(){const a=await fetch(`/string/${t}.json`);lang={...this,...await a.json()},lang.appname&&(document.title=lang.appname),replaceData=(t,a,n)=>n(t.replace(`{${a}}`,lang[a]));for(const t in lang){let a=document.querySelectorAll(`[data-i18n*='${t}']`);a.length<1||a.forEach((a=>{let n=a.getAttribute("data-i18n"),e=a.getAttribute("data-i18n-attr");n===t?a.innerHTML+=lang[t]:e?"[INNER]"===e?replaceData(a.innerHTML,t,(t=>{a.innerHTML=t})):replaceData(a.getAttribute(e)||n,t,(t=>{a.setAttribute(e,t)})):-1!==n.indexOf("{")&&replaceData(a.innerHTML||n,t,(t=>{a.innerHTML=t}))}))}},wait:[],prop:function(t,a){const n=arguments;return lang[t].replace(/\{(\d+)\}/g,(function(t,a){return n[a.valueOf()]}))}},lang.init().then((()=>lang.wait.forEach((t=>t()))))})({zh:"zh-hans","zh-cn":"zh-hans","zh-hk":"zh-hant","zh-tw":"zh-hant","zh-sg":"zh-hans"}[(new URL(location.href).searchParams.get("language")||navigator.language).toLowerCase()]||"en-us");