const form = document.getElementById('search-form');
const input = document.getElementById('city-input');
const resultSection = document.getElementById('result');
const messageBox = document.getElementById('message');
const langToggle = document.getElementById('lang-toggle');

const el = {
  city: document.getElementById('city-name'),
  date: document.getElementById('date-label'),
  icon: document.getElementById('icon'),
  temp: document.getElementById('temp'),
  feels: document.getElementById('feels'),
  wind: document.getElementById('wind'),
  humidity: document.getElementById('humidity'),
  precip: document.getElementById('precip'),
  summary: document.getElementById('summary'),
  title: document.getElementById('title'),
  subtitle: document.getElementById('subtitle'),
  hint: document.getElementById('hint'),
  labels: {
    temp: document.getElementById('label-temp'),
    feels: document.getElementById('label-feels'),
    wind: document.getElementById('label-wind'),
    humidity: document.getElementById('label-humidity'),
    precip: document.getElementById('label-precip'),
  },
  footer: document.getElementById('footer-note'),
  searchBtn: document.getElementById('search-btn'),
};

const WEATHER_DESCRIPTIONS_RU = new Map([
  [[0], 'Ясно'],
  [[1], 'Преимущественно ясно'],
  [[2], 'Переменная облачность'],
  [[3], 'Пасмурно'],
  [[45, 48], 'Туман'],
  [[51, 53, 55], 'Морось'],
  [[56, 57], 'Ледяная морось'],
  [[61, 63, 65], 'Дождь'],
  [[66, 67], 'Ледяной дождь'],
  [[71, 73, 75], 'Снегопад'],
  [[77], 'Снежные зерна'],
  [[80, 81, 82], 'Ливневый дождь'],
  [[85, 86], 'Ливневый снег'],
  [[95], 'Гроза'],
  [[96, 99], 'Гроза с градом'],
].flatMap(([codes, text]) => codes.map((c) => [c, text])));

const WEATHER_DESCRIPTIONS_EN = new Map([
  [[0], 'Clear'],
  [[1], 'Mainly clear'],
  [[2], 'Partly cloudy'],
  [[3], 'Overcast'],
  [[45, 48], 'Fog'],
  [[51, 53, 55], 'Drizzle'],
  [[56, 57], 'Freezing drizzle'],
  [[61, 63, 65], 'Rain'],
  [[66, 67], 'Freezing rain'],
  [[71, 73, 75], 'Snowfall'],
  [[77], 'Snow grains'],
  [[80, 81, 82], 'Rain showers'],
  [[85, 86], 'Snow showers'],
  [[95], 'Thunderstorm'],
  [[96, 99], 'Thunderstorm with hail'],
].flatMap(([codes, text]) => codes.map((c) => [c, text])));

const I18N = {
  ru: {
    ui: {
      title: 'Погода сегодня',
      subtitle: 'Введите город и получите прогноз на текущий день',
      placeholder: 'Например: Москва, Санкт-Петербург, Минск',
      ariaCity: 'Название города',
      find: 'Найти',
      hint: 'Совет: можно вводить на русском или латиницей',
      footer: 'Данные: Open‑Meteo (без API‑ключа). Время и единицы измерения адаптируются под ваш часовой пояс.',
      labels: {
        temp: 'Температура',
        feels: 'Ощущается как',
        wind: 'Ветер',
        humidity: 'Влажность',
        precip: 'Осадки',
      },
      loading: 'Загрузка…',
      errors: {
        empty: 'Пожалуйста, введите название города.',
        notFound: 'Город не найден',
        generic: 'Не удалось получить данные. Попробуйте позже.',
      },
    },
    weather: WEATHER_DESCRIPTIONS_RU,
    dateLocale: 'ru-RU',
  },
  en: {
    ui: {
      title: 'Weather today',
      subtitle: 'Enter a city to get today’s forecast',
      placeholder: 'E.g.: Moscow, Saint Petersburg, Minsk',
      ariaCity: 'City name',
      find: 'Search',
      hint: 'Tip: you can type in English or Russian',
      footer: 'Data: Open‑Meteo (no API key). Time and units adapt to your timezone.',
      labels: {
        temp: 'Temperature',
        feels: 'Feels like',
        wind: 'Wind',
        humidity: 'Humidity',
        precip: 'Precipitation',
      },
      loading: 'Loading…',
      errors: {
        empty: 'Please enter a city name.',
        notFound: 'City not found',
        generic: 'Could not fetch data. Please try later.',
      },
    },
    weather: WEATHER_DESCRIPTIONS_EN,
    dateLocale: 'en-US',
  }
};

let currentLang = (typeof localStorage !== 'undefined' && localStorage.getItem('lang')) || 'ru';
document.documentElement.setAttribute('lang', currentLang);

function codeToIcon(code, isDay) {
  // Simple, readable icon mapping (emoji for wide compatibility)
  if ([0].includes(code)) return isDay ? '☀️' : '🌙';
  if ([1, 2].includes(code)) return isDay ? '🌤️' : '🌥️';
  if ([3].includes(code)) return '☁️';
  if ([45, 48].includes(code)) return '🌫️';
  if ([51, 53, 55].includes(code)) return '🌦️';
  if ([61, 63, 65, 80, 81, 82].includes(code)) return '🌧️';
  if ([71, 73, 75, 85, 86, 77].includes(code)) return '🌨️';
  if ([95, 96, 99].includes(code)) return '⛈️';
  if ([56, 57, 66, 67].includes(code)) return '🌧️';
  return '⛅';
}

function formatDateLocalized(date) {
  const locale = I18N[currentLang].dateLocale;
  return new Intl.DateTimeFormat(locale, {
    weekday: 'long', day: 'numeric', month: 'long'
  }).format(date).replace(/^(.)/, (m) => m.toUpperCase());
}

function showMessage(text) {
  messageBox.textContent = text;
  messageBox.classList.remove('hidden');
}
function clearMessage() {
  messageBox.textContent = '';
  messageBox.classList.add('hidden');
}

function setLoading(loading) {
  const btn = document.getElementById('search-btn');
  if (loading) {
    btn.disabled = true;
    btn.dataset.original = btn.textContent;
    btn.textContent = I18N[currentLang].ui.loading;
  } else {
    btn.disabled = false;
    if (btn.dataset.original) btn.textContent = btn.dataset.original;
  }
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function geocodeCity(city) {
  const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
  url.searchParams.set('name', city);
  url.searchParams.set('count', '1');
  url.searchParams.set('language', 'ru');
  url.searchParams.set('format', 'json');
  const data = await fetchJson(url.toString());
  if (!data || !data.results || data.results.length === 0) {
    throw new Error(I18N[currentLang].ui.errors.notFound);
  }
  const r = data.results[0];
  return {
    displayName: `${r.name}${r.country ? ', ' + r.country : ''}`,
    latitude: r.latitude,
    longitude: r.longitude,
    timezone: r.timezone,
  };
}

async function getCurrentWeather(lat, lon, tz) {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', String(lat));
  url.searchParams.set('longitude', String(lon));
  url.searchParams.set('current', [
    'temperature_2m',
    'apparent_temperature',
    'is_day',
    'precipitation',
    'weather_code',
    'wind_speed_10m',
    'relative_humidity_2m',
  ].join(','));
  url.searchParams.set('timezone', tz || 'auto');

  const data = await fetchJson(url.toString());
  if (!data || !data.current) throw new Error('Нет данных погоды');
  return data.current;
}

function renderWeather(city, current) {
  const now = new Date();
  const code = current.weather_code;
  const isDay = current.is_day === 1;

  el.city.textContent = city.displayName;
  el.date.textContent = formatDateLocalized(now);
  el.icon.textContent = codeToIcon(code, isDay);

  const t = Math.round(current.temperature_2m);
  const feels = Math.round(current.apparent_temperature);
  const wind = Math.round(current.wind_speed_10m);
  const humidity = Math.round(current.relative_humidity_2m);
  const precip = current.precipitation; // mm

  el.temp.textContent = `${t}°C`;
  el.feels.textContent = `${feels}°C`;
  el.wind.textContent = `${wind} м/с`;
  el.humidity.textContent = `${humidity}%`;
  el.precip.textContent = `${precip.toFixed(1)} мм`;

  const desc = I18N[currentLang].weather.get(code) || (currentLang === 'ru' ? 'Погодные условия' : 'Weather conditions');
  const precipText = currentLang === 'ru'
    ? (precip > 0 ? `, осадки: ${precip.toFixed(1)} мм` : '')
    : (precip > 0 ? `, precipitation: ${precip.toFixed(1)} mm` : '');
  el.summary.textContent = `${desc}${precipText}.`;

  resultSection.classList.remove('hidden');
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearMessage();

  const city = input.value.trim();
  if (!city) {
    showMessage(I18N[currentLang].ui.errors.empty);
    return;
  }

  setLoading(true);
  try {
    const geo = await geocodeCity(city);
    const current = await getCurrentWeather(geo.latitude, geo.longitude, geo.timezone);
    renderWeather(geo, current);
  } catch (err) {
    console.error(err);
    showMessage(typeof err?.message === 'string' ? err.message : I18N[currentLang].ui.errors.generic);
    resultSection.classList.add('hidden');
  } finally {
    setLoading(false);
  }
});

function applyLanguage(lang) {
  currentLang = lang;
  localStorage.setItem('lang', lang);
  document.documentElement.setAttribute('lang', lang);

  const t = I18N[lang];
  el.title.textContent = t.ui.title;
  el.subtitle.textContent = t.ui.subtitle;
  input.placeholder = t.ui.placeholder;
  input.setAttribute('aria-label', t.ui.ariaCity);
  el.searchBtn.textContent = t.ui.find;
  el.hint.textContent = t.ui.hint;
  el.labels.temp.textContent = t.ui.labels.temp;
  el.labels.feels.textContent = t.ui.labels.feels;
  el.labels.wind.textContent = t.ui.labels.wind;
  el.labels.humidity.textContent = t.ui.labels.humidity;
  el.labels.precip.textContent = t.ui.labels.precip;
  el.footer.textContent = t.ui.footer;
  langToggle.textContent = lang === 'ru' ? 'EN' : 'RU';
}

langToggle.addEventListener('click', () => {
  applyLanguage(currentLang === 'ru' ? 'en' : 'ru');
});

// Initialize language on load
applyLanguage(currentLang);


