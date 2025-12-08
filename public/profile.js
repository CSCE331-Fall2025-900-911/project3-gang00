document.addEventListener('DOMContentLoaded', () => {
  const pointsCounter = document.querySelector('[data-points-counter]');
  if (pointsCounter) {
    const target = Number(pointsCounter.textContent) || 0;
    const duration = 700;
    const step = (timestamp, startTime) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const currentValue = Math.floor(progress * target);
      pointsCounter.textContent = currentValue.toLocaleString();
      if (progress < 1) {
        requestAnimationFrame((time) => step(time, startTime));
      } else {
        pointsCounter.textContent = target.toLocaleString();
      }
    };
    requestAnimationFrame(step);
  }

  const progressEl = document.querySelector('.points-progress');
  if (progressEl) {
    const bar = progressEl.querySelector('.points-progress__bar');
    const target = progressEl.dataset.progress;
    if (bar && target) {
      bar.style.width = `${target}%`;
      bar.setAttribute('aria-valuenow', target);
    }
  }
});
