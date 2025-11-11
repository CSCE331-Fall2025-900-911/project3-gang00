document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('textToSpeechBtn');
  const img = document.getElementById('speakerImg');

  if (!btn || !img) return;

  // Check browser support
  if (!('speechSynthesis' in window)) {
    btn.disabled = true;
    img.alt = 'Text to speech not supported';
    return;
  }

  let speaking = false;
  let utterance = null;

  function getText() {
    const main = document.querySelector('main');
    const text = (main || document.body).innerText || '';
    return text.trim().replace(/\s+/g, ' ');
  }

  function reset() {
    speaking = false;
    img.src = '/Muted.png';
    btn.classList.remove('toggled');
  }

  btn.addEventListener('click', () => {
    if (speaking) {
      window.speechSynthesis.cancel();
      reset();
      return;
    }

    const text = getText();
    if (!text) return;

    utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;

    utterance.onstart = () => {
      speaking = true;
      img.src = '/speaker.png';
      btn.classList.add('toggled');
    };

    utterance.onend = reset;
    utterance.onerror = reset;

    window.speechSynthesis.speak(utterance);
  });
});
