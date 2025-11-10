// This is the frontend file that would get the data from the webpage and transit them to the backend server
// The code need collect all text data and node in the DOM and skip the text that has 'data-i18n-ignor' label
// After deduplicating the text, group it into an array and POST it to the backend in one go.
// Backfill: Rewrite the translated text returned by the backend in the original position according to the order you sent it; update <html lang="…">

// skip the field that would not be translated
const IGNORE_SELECTOR = 'script,style,code,pre,noscript,[data-i18n-ignore],.no-translate';
const ATTRS = ['placeholder','title','aria-label','alt'];

let textNodes = []; // store the text that we collect
let attrNodes = []; // store the text that are in the attribute

let inited = false; // turn ture after collect the text at the first time
let originText = []; // store the original english text node content, use this text as the base content to translate
let originAttr = []; // store the original english attribute node text content, use this text as the base content to translate

// help function
function isVisible(el) {
    if (!(el instanceof Element)) 
        return true;
    const s = getComputedStyle(el);
    return s && s.display !== 'none' && s.visibility !== 'hidden';
}

// collect the visible text node, attribute node and store the original text
function collectTextNodes() {
    // Use Treewalker to find the next text node
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
        acceptNode(n) {
          const p = n.parentElement; // find textnode n's parent element
          if (!p) 
              return NodeFilter.FILTER_REJECT;
          if (p.closest(IGNORE_SELECTOR)) // reverse search from p to figure out is there any feature that indicate not to translate.
              return NodeFilter.FILTER_REJECT;
          if (!isVisible(p)) 
              return NodeFilter.FILTER_REJECT;
          const v = (n.nodeValue || '').trim();
          // return NodeFilter.FILTER_ACCEPT if v is not null
          return v ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        }
    });

    let cur;
    // call Treewalker to find next text node.
    while ((cur = walker.nextNode())) {
        textNodes.push(cur);
        originText.push(cur.nodeValue);
    }

    // Collect the text of attribute node
    const els = Array.from(document.body.querySelectorAll('*:not(' + IGNORE_SELECTOR + ')'));
    for (const el of els) {
        if (!isVisible(el)) 
            continue;
        for (const a of ATTRS) {
            const v = el.getAttribute(a); // get the corresponding value of the attribute to translate
            if (v && v.trim()) {
                attrNodes.push({el, attr: a});
                originAttr.push(v);
            }

        }
    }

    inited = true;
}

// translate
async function callAPI(texts, target, source, mimeType) {
    const resp = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({
            texts,
            target: target || 'zh',
            ...(source ? { source } : {}),
            ...(mimeType ? { mimeType } : {})
        })
    });
    return resp.json();
}

// run: traversal, group and translate, backfill
export async function runTranslate(targetLang) {
    const target = targetLang || 'en';

    if(!inited)
        collectTextNodes();

    if(target === 'en'){ // if switch to the base English, then back to the original text
        textNodes.forEach((n, i) => { n.nodeValue = originText[i]; });
        attrNodes.forEach((a, i) => { a.el.setAttribute(a.attr, originAttr[i]); });
        document.documentElement.setAttribute('lang', 'en');
        return ;
    }

    // deduplicate
    const uniq = []; // store the unique text
    const map = new Map(); // store the relation that map the node(text and attribute) and its index
    const textIdx = [];
    const attrIdx = [];

    function pushUnique(s) {
        if (map.has(s)) 
            return map.get(s);
        const i = uniq.push(s) - 1; // get the index that just push into the uniq
        map.set(s, i);
        return i;
    }

    for (const t of originText) 
        textIdx.push(pushUnique(t.trim()));
    for (const a of originAttr) 
        attrIdx.push(pushUnique(a.trim()));

    if (uniq.length === 0) 
        return;

    const { results, error } = await callAPI(uniq, target); // Post to get the translated result
    if (error || !Array.isArray(results)) {
        console.error('translate error:', error || results);
        return;
    }

    // get the translated data and backfill
    textNodes.forEach((n, i) => {
        const t = results[textIdx[i]]; // get the corresponding translated result
        if(t) 
            n.nodeValue = t;
    });
    attrNodes.forEach((a, i) => {
        const t = results[attrIdx[i]];
        if(t) 
          a.el.setAttribute(a.attr, t);
    });

    // Update the disability, then other disability function can work correctly
    document.documentElement.setAttribute('lang', target);
}

// function bindTranslateButton(buttonId, targetLang) {
//     const btn = document.getElementById(buttonId);
//     if (!btn) 
//         return;
//     btn.addEventListener('click', () => runTranslate(targetLang));
// }

