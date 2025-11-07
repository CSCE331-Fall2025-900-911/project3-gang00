import { runTranslate } from "./translate.js";

const translateBtn = document.getElementById("translateBtn");
const langMenu = document.getElementById("langMenu");
const langSel = document.getElementById("langSel");

translateBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    langMenu.classList.toggle("hidden");
});

langSel.addEventListener("change", () => {
    runTranslate(langSel.value);
    langMenu.classList.add("hidden");
});

document.addEventListener("click", (e) => {
    if (!langMenu.contains(e.target) && !translateBtn.contains(e.target)) {
        langMenu.classList.add("hidden");
    }
});