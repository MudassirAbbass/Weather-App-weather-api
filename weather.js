const RAPIDAPI_KEY = "405f5478dfmshf1698bdfefa7e39p15754ejsn1d1f8e5cf48c";
const RAPIDAPI_HOST = "weather-by-api-ninjas.p.rapidapi.com";

let currentUnit = 'metric';
let currentWeatherData = null;
let selectedDayIndex = 0;

function handleSearchTypeChange() {
  const type = document.getElementById('search-type').value;
  const input = document.getElementById('search-input');
  if (type === 'city') input.placeholder = 'e.g. Islamabad';
  if (type === 'zip') input.placeholder = 'e.g. 44000';
  if (type === 'coords') input.placeholder = 'lat, lon (e.g. 33.68,73.05)';
}

function setUnit(unit) {
  if (currentUnit === unit) return;
  currentUnit = unit;
  document.getElementById('unit-c').className = unit === 'metric' ? 'active' : '';
  document.getElementById('unit-f').className = unit === 'imperial' ? 'active' : '';
  if (currentWeatherData) {
    updateUI(currentWeatherData);
  }
}

function showError(msg) {
  alert(msg);
  document.getElementById('weather-display').classList.add('d-none');
}

function convertTemp(tempInC) {
  if (currentUnit === 'imperial') {
    return Math.round((tempInC * 9) / 5 + 32);
  }
  return Math.round(tempInC);
}

//these links are online SVG icons for weather conditions
function buildIconUrl(condition) {
  const value = (condition || '').toLowerCase();
  const svg = value.includes('clear')
    ? '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4.5"></circle><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="M4.93 4.93l1.41 1.41"></path><path d="M17.66 17.66l1.41 1.41"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="M4.93 19.07l1.41-1.41"></path><path d="M17.66 6.34l1.41-1.41"></path></svg>'
    : value.includes('rain')
      ? '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 16.5A3.5 3.5 0 0 1 3.5 13h0A3.5 3.5 0 0 1 7 9.5"></path><path d="M17 16.5A3.5 3.5 0 0 1 13.5 13h0A3.5 3.5 0 0 1 17 9.5"></path><path d="M9 20l-1 2"></path><path d="M15 20l-1 2"></path><path d="M12 4a4.5 4.5 0 0 0-4.5 4.5"></path><path d="M12 4a4.5 4.5 0 0 1 4.5 4.5"></path></svg>'
      : value.includes('snow')
        ? '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#dbeafe" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v3"></path><path d="M12 18v3"></path><path d="M4.22 7.22l2.12 2.12"></path><path d="M17.66 17.66l2.12 2.12"></path><path d="M3 12h3"></path><path d="M18 12h3"></path><path d="M4.22 16.78l2.12-2.12"></path><path d="M17.66 6.34l2.12-2.12"></path><path d="M8 14a4 4 0 1 1 8 0"></path></svg>'
        : '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#93c5fd" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 16.5A4.5 4.5 0 0 0 13.5 12h-.5A5.5 5.5 0 1 0 6 16.5"></path><path d="M12 8a4 4 0 0 0-4 4"></path><path d="M12 5a7 7 0 0 1 7 7"></path></svg>';

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function normalizeWeatherData(raw, cityName) {
  if (raw && raw.current !== undefined) {
    const daily = (raw.daily?.time || []).map((time, index) => ({
      label: new Date(time).toLocaleDateString('en-US', { weekday: 'short' }),
      tempMin: raw.daily.temperature_2m_min?.[index],
      tempMax: raw.daily.temperature_2m_max?.[index],
      weather: raw.daily.weather_code?.[index] ? describeWeatherCode(raw.daily.weather_code[index]) : 'Clouds'
    }));

    return {
      cityName: cityName || 'Unknown',
      weather: describeWeatherCode(raw.current.weather_code),
      temp: raw.current.temperature_2m,
      pressure: raw.current.pressure_msl,
      humidity: raw.current.relative_humidity_2m,
      wind_speed: raw.current.wind_speed_10m,
      min_temp: daily[0]?.tempMin ?? raw.current.temperature_2m - 3,
      max_temp: daily[0]?.tempMax ?? raw.current.temperature_2m + 3,
      daily
    };
  }

  return {
    cityName: cityName || raw?.city || 'Unknown',
    weather: raw?.weather || 'Clouds',
    temp: raw?.temp ?? 25,
    pressure: raw?.pressure ?? 1000,
    humidity: raw?.humidity ?? 50,
    wind_speed: raw?.wind_speed ?? 2.5,
    min_temp: raw?.min_temp ?? 20,
    max_temp: raw?.max_temp ?? 30,
    daily: raw?.daily || []
  };
}

function describeWeatherCode(code) {
  if (code === 0) return 'Clear';
  if (code <= 3) return 'Clouds';
  if (code <= 5) return 'Rain';
  if (code <= 7) return 'Snow';
  return 'Clouds';
}

async function fetchRapidWeather(query, searchType) {
  let url = `https://${RAPIDAPI_HOST}/v1/weather?`;

  if (searchType === 'city') {
    url += `city=${encodeURIComponent(query)}`;
  } else if (searchType === 'zip') {
    url += `zip=${encodeURIComponent(query)}`;
  } else {
    const parts = query.split(',');
    if (parts.length !== 2) throw new Error('Invalid coordinates');
    url += `lat=${parts[0].trim()}&lon=${parts[1].trim()}`;
  }

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'x-rapidapi-key': RAPIDAPI_KEY,
      'x-rapidapi-host': RAPIDAPI_HOST,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) throw new Error(`RapidAPI error ${response.status}`);
  return response.json();
}

async function fetchGeoCoordinates(query, searchType) {
  if (searchType === 'coords') {
    const parts = query.split(',');
    if (parts.length !== 2) throw new Error('Invalid coordinates');
    return { name: 'Selected location', latitude: Number(parts[0].trim()), longitude: Number(parts[1].trim()) };
  }

  const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`);
  if (!response.ok) throw new Error('Location lookup failed');
  const data = await response.json();
  const first = data.results && data.results[0];
  if (!first) throw new Error('Location not found');
  return { name: first.name, latitude: first.latitude, longitude: first.longitude };
}

async function fetchOpenMeteo(latitude, longitude) {
  const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,pressure_msl,wind_speed_10m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=5`);
  if (!response.ok) throw new Error('Open-Meteo request failed');
  return response.json();
}

async function fetchWeather() {
  const searchVal = document.getElementById('search-input').value.trim() || 'Islamabad';
  const searchType = document.getElementById('search-type').value;

  document.getElementById('weather-display').classList.add('d-none');

  try {
    const rapidData = await fetchRapidWeather(searchVal, searchType);
    currentWeatherData = normalizeWeatherData(rapidData, searchVal);
    updateUI(currentWeatherData, searchVal);
    document.getElementById('weather-display').classList.remove('d-none');
  } catch (rapidError) {
    try {
      const location = await fetchGeoCoordinates(searchVal, searchType);
      const openData = await fetchOpenMeteo(location.latitude, location.longitude);
      currentWeatherData = normalizeWeatherData(openData, location.name);
      updateUI(currentWeatherData, location.name);
      document.getElementById('weather-display').classList.remove('d-none');
    } catch (fallbackError) {
      console.error(fallbackError);
      showError('Weather data could not be loaded. Please try a valid city, zip code, or coordinates.');
    }
  }
}

function updateUI(data, cityName) {
  const queryName = cityName || document.getElementById('search-input').value || 'Islamabad';
  document.getElementById('city-title').textContent = queryName.charAt(0).toUpperCase() + queryName.slice(1);

  const activeDay = data.daily && data.daily[selectedDayIndex] ? data.daily[selectedDayIndex] : null;
  const dayLabel = activeDay?.label || new Date(Date.now() + selectedDayIndex * 86400000).toLocaleDateString('en-US', { weekday: 'long' });
  const weatherText = activeDay?.weather || data.weather || 'Clouds';
  const tempValue = activeDay?.tempMax ?? data.max_temp ?? data.temp;

  document.getElementById('selected-day-text').textContent = dayLabel;
  document.getElementById('selected-weather-desc').textContent = `Condition: ${weatherText}`;
  document.getElementById('main-temp').textContent = convertTemp(tempValue);
  document.getElementById('meta-pressure').textContent = activeDay?.pressure ?? data.pressure ?? '1000';
  document.getElementById('meta-humidity').textContent = activeDay?.humidity ?? data.humidity ?? '50';
  document.getElementById('meta-wind').textContent = activeDay?.wind ?? data.wind_speed ?? '2.5';
  document.getElementById('main-icon').src = buildIconUrl(weatherText);
  document.getElementById('main-icon').alt = weatherText;

  renderDayCards(data);
}

function renderDayCards(data) {
  const container = document.getElementById('days-container');
  container.innerHTML = '';

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayIdx = new Date().getDay();
  const forecastDays = (data.daily && data.daily.length ? data.daily : Array.from({ length: 5 }, (_, i) => ({
    label: days[(todayIdx + i) % 7],
    tempMin: data.min_temp - 2 + i,
    tempMax: data.max_temp + 1 + i,
    weather: data.weather || 'Clouds'
  }))).slice(0, 5);

  forecastDays.forEach((item, i) => {
    const dayName = item.label || days[(todayIdx + i) % 7];
    const maxT = convertTemp(item.tempMax ?? data.max_temp ?? data.temp);
    const minT = convertTemp(item.tempMin ?? data.min_temp ?? data.temp - 3);

    const col = document.createElement('div');
    col.className = 'col';
    col.innerHTML = `
      <div class="day-card ${i === selectedDayIndex ? 'selected' : ''}" data-index="${i}">
        <div class="card-day">${dayName}</div>
        <img src="${buildIconUrl(item.weather || data.weather || 'Clouds')}" alt="${item.weather || data.weather || 'Clouds'}">
        <div class="card-temp"><strong>${maxT}°</strong> ${minT}°</div>
      </div>
    `;
    col.querySelector('.day-card').addEventListener('click', () => {
      selectedDayIndex = i;
      updateUI(data, document.getElementById('search-input').value || 'Islamabad');
    });
    container.appendChild(col);
  });
}

window.addEventListener('DOMContentLoaded', () => {
  handleSearchTypeChange();
  fetchWeather();
});