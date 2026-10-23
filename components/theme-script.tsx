/**
 * Runs synchronously in <head>, before first paint, so the saved theme and
 * text size are applied without a flash. Only non-sensitive display
 * preferences are kept in localStorage.
 */
const script = `(function(){try{
var d=document.documentElement,s=localStorage;
var t=s.getItem("theme");if(t!=="light"&&t!=="dark")t="system";
var m=window.matchMedia("(prefers-color-scheme: dark)");
var apply=function(){var p=s.getItem("theme");if(p!=="light"&&p!=="dark")p=m.matches?"dark":"light";d.setAttribute("data-theme",p);};
apply();d.setAttribute("data-theme-pref",t);
if(m.addEventListener)m.addEventListener("change",apply);
var z=s.getItem("textSize");if(z==="sm"||z==="md"||z==="lg"||z==="xl")d.setAttribute("data-text-size",z);
}catch(e){}})();`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
