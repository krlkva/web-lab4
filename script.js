const API_KEY = '2b1010f3c55a48be81c103758262402'; // Публичный тестовый ключ
const BASE_URL = 'https://api.weatherapi.com/v1/forecast.json';

const CITY_SUGGESTIONS = [
    "Москва", "Санкт-Петербург", "Новосибирск", "Екатеринбург", "Казань", 
    "Нижний Новгород", "Челябинск", "Самара", "Омск", "Ростов-на-Дону",
    "Уфа", "Красноярск", "Воронеж", "Пермь", "Волгоград", "Краснодар",
    "Саратов", "Тюмень", "Тольятти", "Ижевск", "Барнаул", "Ульяновск",
    "Владивосток", "Сочи", "Калининград", "Ярославль", "Рязань"
];

let mainCity = 'Текущее местоположение';
let mainCoords = null;

// DOM элементы
const overlay = document.getElementById('overlay');
const cityInput = document.getElementById('cityInput');
const suggestionsBox = document.getElementById('suggestionsBox');
const inputError = document.getElementById('inputError');
const modalCancel = document.getElementById('modalCancel');
const modalConfirm = document.getElementById('modalConfirm');
const addCityBtn = document.getElementById('addCityBtn');
const currentCityDisplay = document.getElementById('currentCityDisplay');
const globalMessage = document.getElementById('globalMessage');

function showMessage(msg) {
    globalMessage.textContent = msg;
    globalMessage.style.padding = '12px 18px';
    setTimeout(() => {
        globalMessage.textContent = '';
        globalMessage.style.padding = '8px 16px';
    }, 3000);
}

// Модальное окно
function showAddCityModal(isMainCity = false) {
    overlay.classList.remove('hidden');
    cityInput.value = '';
    inputError.textContent = '';
    document.getElementById('modalTitle').textContent = 
        isMainCity ? '✎ Добавить основной город' : '✎ Добавить город';
    
    const handler = function() {
        const val = this.value.trim().toLowerCase();
        if (!val) {
            suggestionsBox.style.display = 'none';
            return;
        }
        
        const filtered = CITY_SUGGESTIONS
            .filter(c => c.toLowerCase().includes(val))
            .slice(0, 6);
        
        if (filtered.length) {
            suggestionsBox.style.display = 'block';
            suggestionsBox.innerHTML = filtered.map(c => 
                `<div data-suggest="${c}">${c}</div>`
            ).join('');
            
            document.querySelectorAll('[data-suggest]').forEach(el => {
                el.addEventListener('click', function() {
                    cityInput.value = this.dataset.suggest;
                    suggestionsBox.style.display = 'none';
                    inputError.textContent = '';
                });
            });
        } else {
            suggestionsBox.style.display = 'none';
        }
    };
    
    cityInput.addEventListener('input', handler);
    
    modalConfirm.onclick = () => {
        const selected = cityInput.value.trim();
        if (!selected) {
            inputError.textContent = 'Введите название города';
            return;
        }
        
        const normalized = CITY_SUGGESTIONS.find(
            s => s.toLowerCase() === selected.toLowerCase()
        );
        
        if (!normalized) {
            inputError.textContent = 'Пожалуйста, выберите город из списка';
            return;
        }
        
        overlay.classList.add('hidden');
        cityInput.removeEventListener('input', handler);
        
        if (isMainCity) {
            mainCity = normalized;
            mainCoords = null;
            currentCityDisplay.textContent = mainCity;
            showMessage(`Основной город: ${mainCity}`);
        } else {
            alert(`Добавлен город: ${normalized}`);
        }
    };
}

// Геолокация
function requestGeolocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                mainCoords = {
                    lat: pos.coords.latitude,
                    lon: pos.coords.longitude
                };
                mainCity = 'Текущее местоположение';
                currentCityDisplay.textContent = mainCity;
                showMessage('✅ Геолокация получена');
                console.log('Координаты:', mainCoords);
            },
            (err) => {
                console.log('Геолокация отклонена');
                showMessage('Добавьте город вручную');
                showAddCityModal(true);
            }
        );
    } else {
        showAddCityModal(true);
    }
}

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
            <div class="highlight-label"> Visibility</div>
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

let additionalCities = [];

// Добавить функцию отрисовки чипсов
function renderCityChips() {
    const container = document.getElementById('cityChipsContainer');
    const cityCount = document.getElementById('cityCount');
    
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
                <small>${condition}</small>
                <span class="remove-btn" data-remove="${city}">✕</span>
            </div>
        `;
    });
    
    if (additionalCities.length === 0) {
        html = '<div style="color:#7c8fa1;">Нет добавленных городов</div>';
    }
    
    container.innerHTML = html;
    cityCount.textContent = additionalCities.length + ' / 5';
    
    // Обработчики удаления
    document.querySelectorAll('.remove-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const cityToRemove = btn.dataset.remove;
            additionalCities = additionalCities.filter(c => c !== cityToRemove);
            forecastsCache.delete(cityToRemove);
            renderCityChips();
        });
    });
}

// Обновить modalConfirm
modalConfirm.onclick = async () => {
    const selected = cityInput.value.trim();
    if (!selected) {
        inputError.textContent = 'Введите название города';
        return;
    }
    
    const normalized = CITY_SUGGESTIONS.find(
        s => s.toLowerCase() === selected.toLowerCase()
    );
    
    if (!normalized) {
        inputError.textContent = 'Пожалуйста, выберите город из списка';
        return;
    }
    
    const isMain = document.getElementById('modalTitle').textContent.includes('основной');
    
    if (!isMain && additionalCities.includes(normalized)) {
        inputError.textContent = 'Этот город уже добавлен';
        return;
    }
    
    if (isMain && mainCity === normalized) {
        inputError.textContent = 'Это уже основной город';
        return;
    }
    
    overlay.classList.add('hidden');
    
    if (isMain) {
        mainCity = normalized;
        mainCoords = null;
        currentCityDisplay.textContent = mainCity;
        await refreshMainWeather();
    } else {
        additionalCities.push(normalized);
        try {
            const data = await fetchWeatherForCity(normalized);
            forecastsCache.set(normalized, data);
        } catch (e) {
            console.warn('Не удалось загрузить', normalized);
        }
        renderCityChips();
    }
};

// Обновить refreshMainWeather для загрузки доп городов
async function refreshAllWeather() {
    await refreshMainWeather();
    
    for (const city of additionalCities) {
        try {
            const data = await fetchWeatherForCity(city);
            forecastsCache.set(city, data);
        } catch (e) {
            console.warn(`Не удалось загрузить ${city}`);
        }
    }
    renderCityChips();
}

// Обновить requestGeolocation
function requestGeolocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                mainCoords = {
                    lat: pos.coords.latitude,
                    lon: pos.coords.longitude
                };
                mainCity = 'Текущее местоположение';
                currentCityDisplay.textContent = 'Определение...';
                await refreshAllWeather();
            },
            (err) => {
                showMessage('Добавьте город вручную');
                showAddCityModal(true);
            }
        );
    } else {
        showAddCityModal(true);
    }
}

// Обновить кнопку обновления
document.getElementById('refreshBtn').addEventListener('click', refreshAllWeather);

// Инициализация
requestGeolocation();

// Обработчики кнопок
addCityBtn.addEventListener('click', () => showAddCityModal(false));
modalCancel.addEventListener('click', () => overlay.classList.add('hidden'));

overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.classList.add('hidden');
});
