const btn = document.getElementById('weatherBtn');
const panel = document.getElementById('weatherPanel');
const wxCity = document.getElementById('wxCity');
const wxTemp = document.getElementById('wxTemp');
const wxCond = document.getElementById('wxCond');
const wxDrink = document.getElementById('wxDrink');
const wxIcon = document.getElementById('wxIcon');

let loaded = false;

  function togglePanel(show) {
    const willShow = show ?? (panel.style.display === 'none');
    panel.style.display = willShow ? 'block' : 'none';
    btn.setAttribute('aria-expanded', String(willShow));
  }

  async function loadKioskInfo() {
    try {
      const r = await fetch('/api/kiosk-info');
      const data = await r.json();

      if (!data?.ok) throw new Error('bad response');

      wxCity.textContent = data.city ?? 'Local';
      wxTemp.textContent = (data.tempC != null) ? `${Math.round(data.tempC)}°C` : '—';
      wxCond.textContent = data.condition ? (data.condition[0].toUpperCase() + data.condition.slice(1)) : '—';
      wxDrink.textContent = data.recommendation ?? 'Classic Milk Tea';

      // Optional OpenWeather icon
      if (data.icon) {
        wxIcon.innerHTML = `<img alt="" src="https://openweathermap.org/img/wn/${data.icon}@2x.png" style="width:40px;height:40px;">`;
      } else {
        wxIcon.innerHTML = '';
      }

      loaded = true;
    } catch (e) {
      wxCity.textContent = '—';
      wxTemp.textContent = '—';
      wxCond.textContent = 'Unavailable';
      wxDrink.textContent = 'Classic Milk Tea';
      loaded = true;
    }
  }

  // Open/close on button click; fetch on first open
  btn?.addEventListener('click', async () => {
    const opening = panel.style.display === 'none';
    togglePanel(opening);
    if (opening && !loaded) await loadKioskInfo();
  });

  // Click outside to close
  document.addEventListener('click', (e) => {
    if (!panel.contains(e.target) && !btn.contains(e.target)) {
      togglePanel(false);
    }
  });

  // Start hidden
  togglePanel(false);