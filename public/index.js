const speakerBtn = document.getElementById("textToSpeechBtn");
const speakerImg = document.getElementById("speakerImg");

let ttsOn = false; // keeps track of whether it's active

speakerBtn.addEventListener("click", () => {
    ttsOn = !ttsOn; // toggle the boolean
    speakerBtn.classList.toggle("toggled", ttsOn);

    if (ttsOn) {
    speakerImg.src = "/speaker.png";
    speakerImg.alt = "Text-to-Speech On";
    } else {
    speakerImg.src = "/Muted.png";
    speakerImg.alt = "Text-to-Speech Off";
    }
});