window.onload = function() {
    // load the current style into window
    let newStyle = localStorage.getItem('styleName');

    // set default if first time open
    if (!newStyle) {
        newStyle = "styles.css";
        this.localStorage.setItem('styleName', newStyle);
    }

    let style = document.getElementById("mainStyleSheet");
    style.setAttribute('href', newStyle);
}

function toggleStyleSheet(){
    let stylesheet = document.getElementById("mainStyleSheet");
    let styleName = stylesheet.getAttribute('href');
    let newStyle;

    if (styleName === "styles.css") {
        newStyle = "high_contrast_style.css";
    } else {
        newStyle = "styles.css";
    }
   
    stylesheet.setAttribute('href', newStyle);
    localStorage.setItem('styleName', newStyle);
}