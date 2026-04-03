// Инициализация Telegram Web App
const tg = window.Telegram.WebApp;
tg.ready();
tg.expand(); // Разворачиваем на весь экран

// Элементы DOM
const typeSelect = document.getElementById('typeSelect');
const titleInput = document.getElementById('titleInput');
const descInput = document.getElementById('descInput');
const dateInput = document.getElementById('dateInput');
const submitBtn = document.getElementById('submitBtn');
const contentList = document.getElementById('contentList');
const tabBtns = document.querySelectorAll('.tab-btn');

let currentTab = 'events';

// Функция для отправки данных в бота
function sendToBot(action, data) {
    return new Promise((resolve, reject) => {
        const requestId = Date.now();
        
        // Сохраняем обработчик
        window.pendingRequest = { requestId, resolve, reject };
        
        // Отправляем данные в бот
        tg.sendData(JSON.stringify({
            action: action,
            data: data,
            requestId: requestId
        }));
        
        // Таймаут на случай ошибки
        setTimeout(() => {
            if (window.pendingRequest) {
                reject(new Error('Timeout'));
                window.pendingRequest = null;
            }
        }, 10000);
    });
}

// Функция для загрузки списка
async function loadItems(type) {
    contentList.innerHTML = '<div class="loading">Загрузка...</div>';
    
    try {
        const response = await sendToBot('get_items', { type: type });
        displayItems(response.items);
    } catch (error) {
        contentList.innerHTML = '<div class="loading">Ошибка загрузки 😢</div>';
        console.error(error);
    }
}

// Функция отображения элементов
function displayItems(items) {
    if (!items || items.length === 0) {
        contentList.innerHTML = '<div class="loading">Пока ничего нет ✨<br>Добавьте первый элемент через форму выше!</div>';
        return;
    }
    
    const typeMap = {
        'event': { name: 'Мероприятие', class: 'type-event', emoji: '🎉' },
        'contest': { name: 'Конкурс', class: 'type-contest', emoji: '🏆' },
        'design': { name: 'Дизайн', class: 'type-design', emoji: '🎨' }
    };
    
    let html = '';
    items.forEach(item => {
        const typeInfo = typeMap[item.type] || typeMap.event;
        html += `
            <div class="event-card">
                <span class="type-badge ${typeInfo.class}">${typeInfo.emoji} ${typeInfo.name}</span>
                <h4>${escapeHtml(item.title)}</h4>
                <p>${escapeHtml(item.description.substring(0, 150))}${item.description.length > 150 ? '...' : ''}</p>
                ${item.date ? `<div class="date">📅 ${escapeHtml(item.date)}</div>` : ''}
                <div class="date">🆔 ID: ${item.id}</div>
            </div>
        `;
    });
    
    contentList.innerHTML = html;
}

// Функция для экранирования HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Обработка отправки формы
submitBtn.addEventListener('click', async () => {
    const typeMap = {
        'event': 'мероприятие',
        'contest': 'конкурс',
        'design': 'дизайн'
    };
    
    const data = {
        type: typeMap[typeSelect.value],
        title: titleInput.value.trim(),
        description: descInput.value.trim(),
        date: dateInput.value.trim()
    };
    
    if (!data.title || !data.description) {
        tg.showPopup({
            title: 'Ошибка',
            message: 'Заполните название и описание!',
            buttons: [{ type: 'ok' }]
        });
        return;
    }
    
    submitBtn.disabled = true;
    submitBtn.textContent = 'Добавление...';
    
    try {
        await sendToBot('add_item', data);
        
        // Очищаем форму
        titleInput.value = '';
        descInput.value = '';
        dateInput.value = '';
        
        // Показываем уведомление
        tg.showPopup({
            title: 'Успех!',
            message: 'Запись успешно добавлена ✅',
            buttons: [{ type: 'ok' }]
        });
        
        // Обновляем список
        loadItems(currentTab);
        
        // Вибрация (если поддерживается)
        if (tg.HapticFeedback) {
            tg.HapticFeedback.notificationOccurred('success');
        }
        
    } catch (error) {
        tg.showPopup({
            title: 'Ошибка',
            message: 'Не удалось добавить запись 😢',
            buttons: [{ type: 'ok' }]
        });
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '📝 Добавить';
    }
});

// Переключение вкладок
tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentTab = btn.dataset.tab;
        loadItems(currentTab);
    });
});

// Загружаем начальные данные
loadItems('events');

// Настройка темы Telegram
if (tg.colorScheme === 'dark') {
    document.body.classList.add('dark');
}

// Основная кнопка Telegram
tg.MainButton.setText('Закрыть');
tg.MainButton.onClick(() => tg.close());
tg.MainButton.show();