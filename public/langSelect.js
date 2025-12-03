import { runTranslate } from "./translate.js";

const translateBtn = document.getElementById("translateBtn");
const langMenu = document.getElementById("langMenu");
const langSel = document.getElementById("langSel");

const saved = localStorage.getItem('preferredLang') || 'en';

langSel.value = saved;
// if the language we selected before is different with English, change to this language
if (saved !== 'en') {
  runTranslate(saved);
}


translateBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    langMenu.classList.toggle("hidden");
});
// In this listener, store the language to our local storge
langSel.addEventListener("change", () => {
    const lang = langSel.value;

    localStorage.setItem('preferredLang', lang);

    runTranslate(lang);
    langMenu.classList.add("hidden");
});

document.addEventListener("click", (e) => {
    if (!langMenu.contains(e.target) && !translateBtn.contains(e.target)) {
        langMenu.classList.add("hidden");
    }
});