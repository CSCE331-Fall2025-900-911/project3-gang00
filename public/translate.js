// This is the frontend file that would get the data from the webpage and transit them to the backend server
// The code need collect all text data and node in the DOM and skip the text that has 'data-i18n-ignor' label
// After deduplicating the text, group it into an array and POST it to the backend in one go.
// Backfill: Rewrite the translated text returned by the backend in the original position according to the order you sent it; update <html lang="…">

// skip the field that would not be translated
const I18N_IGNORE_SELECTOR = 'script,style,code,pre,noscript,[data-i18n-ignore],.no-translate';
const I18N_ATTRS = ['placeholder','title','aria-label','alt'];

// help function
function i18nIsVisible(el) {
    if (!(el instanceof Element)) 
        return true;
    const s = getComputedStyle(el);
    return s && s.display !== 'none' && s.visibility !== 'hidden';
}

// collect the visible text node
function i18nCollectTextNodes(root) {
    const start = root || document.body;
    // Use Treewalker to find the next text node
    const walker = document.createTreeWalker(start, NodeFilter.SHOW_TEXT, {
        acceptNode(n) {
          const p = n.parentElement; // find textnode n's parent element
          if (!p) 
              return NodeFilter.FILTER_REJECT;
          if (p.closest(I18N_IGNORE_SELECTOR)) // reverse search from p to figure out is there any feature that indicate not to translate.
              return NodeFilter.FILTER_REJECT;
          if (!i18nIsVisible(p)) 
              return NodeFilter.FILTER_REJECT;
          const v = (n.nodeValue || '').trim();
          // return NodeFilter.FILTER_ACCEPT if v is not null
          return v ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        }
    });
    const nodes = [];
    let cur;
    // call Treewalker to find next text node.
    while ((cur = walker.nextNode())) 
        nodes.push(cur);
    return nodes;
}

// collect the text in attribute
function i18nCollectAttrNodes(root) {
    const start = root || document.body;
    const els = Array.from(start.querySelectorAll('*:not(' + I18N_IGNORE_SELECTOR + ')'));
    const items = [];
    for (const el of els) {
        if (!i18nIsVisible(el)) 
            continue;
        for (const a of I18N_ATTRS) {
            const v = el.getAttribute(a); // get the corresponding value of the attribute to translate
            if (v && v.trim()) 
                items.push({ el, attr: a, value: v });
        }
    }
    return items;
}

// translate
async function i18nTranslateBatch(texts, target, source, mimeType) {
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
async function runTranslate(targetLang) {
    const target = targetLang || 'zh';

    const textNodes = i18nCollectTextNodes(document.body);
    const attrNodes = i18nCollectAttrNodes(document.body);

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

    for (const n of textNodes) 
        textIdx.push(pushUnique(n.nodeValue.trim()));
    for (const a of attrNodes) 
        attrIdx.push(pushUnique(a.value.trim()));

    if (uniq.length === 0) 
        return;

    const { results, error } = await i18nTranslateBatch(uniq, target); // Post to get the translated result
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

