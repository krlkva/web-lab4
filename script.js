const CITY_SUGGESTIONS = [
    "Москва", "Санкт-Петербург", "Новосибирск", "Екатеринбург", "Казань", 
    "Нижний Новгород", "Челябинск", "Самара", "Омск", "Ростов-на-Дону"
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

// Инициализация
requestGeolocation();

// Обработчики кнопок
addCityBtn.addEventListener('click', () => showAddCityModal(false));
modalCancel.addEventListener('click', () => overlay.classList.add('hidden'));

overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.classList.add('hidden');
});
