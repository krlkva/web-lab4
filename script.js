const API_KEY = '2b1010f3c55a48be81c103758262402'; 
const BASE_URL = 'https://api.weatherapi.com/v1/forecast.json';

const CITY_SUGGESTIONS = [
    "Москва", "Санкт-Петербург", "Новосибирск", "Екатеринбург", "Казань", 
    "Нижний Новгород", "Челябинск", "Самара", "Омск", "Ростов-на-Дону",
    "Уфа", "Красноярск", "Воронеж", "Пермь", "Волгоград", "Краснодар",
    "Саратов", "Тюмень", "Тольятти", "Ижевск", "Барнаул", "Ульяновск",
    "Владивосток", "Сочи", "Калининград", "Ярославль", "Рязань"
];

// Состояние приложения
let mainCity = 'Текущее местоположение';
let mainCoords = null;
let additionalCities = [];
let forecastsCache = new Map();

// ---------- DOM элементы ----------
const refreshBtn = document.getElementById('refreshBtn');
const addCityBtn = document.getElementById('addCityBtn');
const currentCityDisplay = document.getElementById('currentCityDisplay');
const weatherForecastContainer = document.getElementById('weatherForecastContainer');
const highlightsContainer = document.getElementById('highlightsContainer');
const loadingIndicator = document.getElementById('loadingIndicator');
const globalMessage = document.getElementById('globalMessage');
const cityChipsContainer = document.getElementById('cityChipsContainer');
const overlay = document.getElementById('overlay');
const modalTitle = document.getElementById('modalTitle');
const cityInput = document.getElementById('cityInput');
const suggestionsBox = document.getElementById('suggestionsBox');
const inputError = document.getElementById('inputError');
const modalCancel = document.getElementById('modalCancel');
const modalConfirm = document.getElementById('modalConfirm');
const cityCount = document.getElementById('cityCount');

let activeModalResolve = null;

function showMessage(msg, isError = false) {
    globalMessage.textContent = msg;
    globalMessage.style.color = isError ? '#b02d26' : '#1e3b5c';
    globalMessage.style.backgroundColor = isError ? '#ffeae8' : '#e3f0ff';
    globalMessage.style.padding = '12px 18px';
    globalMessage.style.borderRadius = '40px';
    if (msg) setTimeout(() => { 
        if (globalMessage.textContent === msg) {
            globalMessage.textContent = ''; 
            globalMessage.style.padding = '8px 16px';
        }
    }, 5000);
}

function setLoading(loading) {
    loadingIndicator.style.display = loading ? 'flex' : 'none';
}

// работа с localStorage
const STORAGE_KEY = 'weather_app_data';
function saveToStorage() {
    const data = {
        mainCity: mainCity,
        mainCoords: mainCoords,
        additionalCities: additionalCities,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadFromStorage() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    try {
        const data = JSON.parse(raw);
        if (data.mainCity) mainCity = data.mainCity;
        if (data.mainCoords) mainCoords = data.mainCoords;
        if (Array.isArray(data.additionalCities)) additionalCities = data.additionalCities;
        return true;
    } catch (e) { 
        return false; 
    }
}

// запрос к WeatherAPI
async function fetchWeatherForCity(cityNameOrCoords) {
    let query;
    
    if (typeof cityNameOrCoords === 'string') {
        query = cityNameOrCoords;
    } else if (cityNameOrCoords?.lat && cityNameOrCoords?.lon) {
        query = `${cityNameOrCoords.lat},${cityNameOrCoords.lon}`;
    } else {
        throw new Error('Невалидный запрос');
    }

    const url = `${BASE_URL}?key=${API_KEY}&q=${encodeURIComponent(query)}&days=3&lang=ru&aqi=yes`;
    
    try {
        const resp = await fetch(url);
        if (!resp.ok) {
            if (resp.status === 400) throw new Error('Город не найден');
            throw new Error(`Ошибка API: ${resp.status}`);
        }
        const data = await resp.json();
        return data;
    } catch (error) {
        console.error('Fetch error:', error);
        throw error;
    }
}

// обновление всей погоды 
async function refreshAllWeather() {
    setLoading(true);
    weatherForecastContainer.innerHTML = '<div style="text-align:center; padding:30px;">⏳ Загрузка прогноза...</div>';
    highlightsContainer.innerHTML = '';
    
    try {
        // Загрузка для основного города
        if (mainCoords || (mainCity && mainCity !== 'Текущее местоположение')) {
            try {
                const query = mainCoords || mainCity;
                const data = await fetchWeatherForCity(query);
                
                forecastsCache.set('main', data);
                renderMainWeather(data);
                
                // Обновляем название города
                if (data.location) {
                    mainCity = data.location.name;
                    currentCityDisplay.textContent = mainCity;
                }
                showMessage(`Данные обновлены`, false);
            } catch (e) {
                console.error('Ошибка основного города:', e);
                showMessage(`Ошибка: ${e.message}`, true);
                weatherForecastContainer.innerHTML = `<div style="text-align:center; padding:30px; color:#b02d26;"> Не удалось загрузить прогноз<br><small>${e.message}</small></div>`;
                forecastsCache.delete('main');
            }
        } else {
            weatherForecastContainer.innerHTML = '<div style="text-align:center; padding:30px;">Добавьте город для просмотра погоды</div>';
        }

        // Загрузка для дополнительных городов
        for (const city of additionalCities) {
            try {
                const data = await fetchWeatherForCity(city);
                forecastsCache.set(city, data);
            } catch (e) {
                console.warn(`Не удалось загрузить ${city}:`, e);
                forecastsCache.delete(city);
            }
        }
        
        renderCityChips();
        saveToStorage();
        
    } catch (error) {
        console.error('Общая ошибка:', error);
        showMessage('Ошибка при загрузке данных', true);
    } finally {
        setLoading(false);
    }
}

//  отрисовка основной погоды
function renderMainWeather(data) {
    if (!data || !data.forecast) return;
    
    const forecast = data.forecast.forecastday;
    const current = data.current;
    const location = data.location;

    // Дни (сегодня + 2)
    let daysHtml = '<div class="days-grid">';
    forecast.forEach((day, index) => {
        const date = new Date(day.date);
        const dayName = index === 0 ? 'Сегодня' : 
                       index === 1 ? 'Завтра' : 
                       date.toLocaleDateString('ru-RU', { weekday: 'short' });
        
        daysHtml += `
            <div class="day-card">
                <div class="day-name">${dayName}</div>
                <div class="temp-high">${Math.round(day.day.maxtemp_c)}°</div>
                <div class="temp-low">${Math.round(day.day.mintemp_c)}°</div>
                <div class="condition-icon">${day.day.condition.text}</div>
            </div>
        `;
    });
    daysHtml += '</div>';
    weatherForecastContainer.innerHTML = daysHtml;

    highlightsContainer.innerHTML = `
        <div class="highlight-item">
            <div class="highlight-label">UV Index</div>
            <div class="highlight-value">${current.uv}</div>
        </div>
        <div class="highlight-item">
            <div class="highlight-label">Wind</div>
            <div class="highlight-value">${Math.round(current.wind_kph)} <span class="highlight-unit">km/h</span></div>
            <div>${current.wind_dir}</div>
        </div>
        <div class="highlight-item">
            <div class="highlight-label">Sunrise & Sunset</div>
            <div class="highlight-value">${forecast[0].astro.sunrise}</div>
            <div class="sub">↓ ${forecast[0].astro.sunset}</div>
            <div class="sub">+2m22s</div>
        </div>
        <div class="highlight-item">
            <div class="highlight-label">Clouds</div>
            <div class="highlight-value">${current.cloud}%</div>
            <div class="sub">🌧️ ${forecast[0].day.daily_chance_of_rain}%</div>
        </div>
        <div class="highlight-item">
            <div class="highlight-label">Humidity</div>
            <div class="highlight-value">${current.humidity}%</div>
        </div>
        <div class="highlight-item">
            <div class="highlight-label">Visibility</div>
            <div class="highlight-value">${current.vis_km} km</div>
        </div>
        <div class="highlight-item">
            <div class="highlight-label">Air Quality</div>
            <div class="air-quality-row">
                <span class="highlight-value">${current.air_quality?.['us-epa-index'] || 2}</span>
                <span class="badge">${getAirQualityText(current.air_quality?.['us-epa-index'] || 2)}</span>
            </div>
        </div>
    `;
}

function getAirQualityText(index) {
    const levels = ['Хорошее', 'Среднее', 'Плохое', 'Опасное', 'Очень опасное'];
    return levels[index-1] || 'Среднее';
}

// Отрисовка дополнительных городов
function renderCityChips() {
    let html = '';
    additionalCities.forEach(city => {
        const cached = forecastsCache.get(city);
        let temp = '?';
        let condition = '';
        
        if (cached && cached.current) {
            temp = Math.round(cached.current.temp_c) + '°';
            condition = cached.current.condition.text;
        }
        
        html += `
            <div class="city-chip" data-city="${city}">
                <span>${city} ${temp}</span>
                <small style="opacity:0.7; margin-left:4px;">${condition}</small>
                <span class="remove-btn" data-remove="${city}">✕</span>
            </div>
        `;
    });
    
    if (additionalCities.length === 0) {
        html = '<div style="color:#7c8fa1; padding:8px 0;">Нет добавленных городов</div>';
    }
    
    cityChipsContainer.innerHTML = html;
    cityCount.textContent = additionalCities.length + ' / 5';

    // Обработчики на удаление
    document.querySelectorAll('.remove-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const cityToRemove = btn.dataset.remove;
            additionalCities = additionalCities.filter(c => c !== cityToRemove);
            forecastsCache.delete(cityToRemove);
            saveToStorage();
            renderCityChips();
        });
    });
    
    document.querySelectorAll('.city-chip').forEach(chip => {
        chip.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-btn')) return;
            const city = chip.dataset.city;
            const cityData = forecastsCache.get(city);
            if (cityData) {
                mainCity = city;
                mainCoords = null;
                renderMainWeather(cityData);
                currentCityDisplay.textContent = city;
                saveToStorage();
            }
        });
    });
}

// добавления города 
function showAddCityModal(existingValue = '', isMainCity = false) {
    overlay.classList.remove('hidden');
    cityInput.value = existingValue;
    inputError.textContent = '';
    suggestionsBox.innerHTML = '';
    cityInput.focus();

    modalTitle.textContent = isMainCity ? 'Добавить основной город' : 'Добавить город';

    return new Promise((resolve) => {
        activeModalResolve = resolve;

        const handlerSuggest = () => {
            const val = cityInput.value.trim().toLowerCase();
            if (!val) { 
                suggestionsBox.style.display = 'none'; 
                return; 
            }
            const filtered = CITY_SUGGESTIONS
                .filter(c => c.toLowerCase().includes(val))
                .slice(0, 6);
            
            if (filtered.length) {
                suggestionsBox.style.display = 'block';
                suggestionsBox.innerHTML = filtered.map(c => `<div data-suggest="${c}">${c}</div>`).join('');
                
                document.querySelectorAll('[data-suggest]').forEach(el => {
                    el.addEventListener('click', () => {
                        cityInput.value = el.dataset.suggest;
                        suggestionsBox.style.display = 'none';
                        inputError.textContent = '';
                    });
                });
            } else {
                suggestionsBox.style.display = 'none';
            }
        };

        cityInput.addEventListener('input', handlerSuggest);
        cityInput.addEventListener('blur', () => {
            setTimeout(() => {
                suggestionsBox.style.display = 'none';
            }, 200);
        });

        const closeModal = (result) => {
            overlay.classList.add('hidden');
            cityInput.removeEventListener('input', handlerSuggest);
            activeModalResolve = null;
            resolve(result);
        };

        modalCancel.onclick = () => closeModal(null);
        
        modalConfirm.onclick = () => {
            const selected = cityInput.value.trim();
            if (!selected) {
                inputError.textContent = 'Введите название города';
                return;
            }
            
            const normalized = CITY_SUGGESTIONS.find(s => s.toLowerCase() === selected.toLowerCase());
            
            if (!normalized) {
                inputError.textContent = 'Пожалуйста, выберите город из списка';
                return;
            }

            if (!isMainCity && additionalCities.includes(normalized)) {
                inputError.textContent = 'Этот город уже добавлен';
                return;
            }

            if (isMainCity && mainCity === normalized) {
                inputError.textContent = 'Это уже основной город';
                return;
            }

            closeModal(normalized);
        };
    });
}

async function initApp() {
    const fromStorage = loadFromStorage();
    
    if (fromStorage && (mainCoords || (mainCity && mainCity !== 'Текущее местоположение'))) {
        // Есть сохранённые данные
        currentCityDisplay.textContent = mainCity;
        await refreshAllWeather();
    } else {
        // Запрос геолокации
        if (navigator.geolocation) {
            setLoading(true);
            navigator.geolocation.getCurrentPosition(
                async (pos) => {
                    mainCoords = { 
                        lat: pos.coords.latitude, 
                        lon: pos.coords.longitude 
                    };
                    mainCity = 'Текущее местоположение';
                    currentCityDisplay.textContent = 'Определение...';
                    saveToStorage();
                    await refreshAllWeather();
                },
                async (err) => {
                    console.log('Геолокация отклонена');
                    showMessage('Добавьте город вручную', false);
                    setLoading(false);
                    await handleNoGeo();
                }
            );
        } else {
            await handleNoGeo();
        }
    }
}

async function handleNoGeo() {
    const city = await showAddCityModal('', true);
    if (city) {
        mainCity = city;
        mainCoords = null;
        currentCityDisplay.textContent = city;
        saveToStorage();
        await refreshAllWeather();
    } else {
        weatherForecastContainer.innerHTML = '<div style="text-align:center; padding:30px;">🏙️ Добавьте город для просмотра погоды</div>';
    }
}

//  события 
refreshBtn.addEventListener('click', () => {
    refreshAllWeather();
});

addCityBtn.addEventListener('click', async () => {
    if (additionalCities.length >= 5) {
        alert('Максимум 5 дополнительных городов');
        return;
    }
    const newCity = await showAddCityModal('', false);
    if (newCity) {
        additionalCities.push(newCity);
        saveToStorage();
        await refreshAllWeather();
    }
});


overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
        overlay.classList.add('hidden');
        if (activeModalResolve) activeModalResolve(null);
    }
});

// Старт приложения
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});
