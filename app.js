// Состояние приложения
const appState = {
    currentSection: 'home',
    currentItem: null,
    completed: {
        anatomy: new Set(),
        techniques: new Set(),
        cases: new Set(),
        quizzes: new Set()
    },
    data: {
        anatomy: [],
        techniques: [],
        cases: [],
        quizzes: []
    },
    currentQuiz: null,
    quizAnswer: null,
    quizResult: null
};

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    initServiceWorker();
    loadCompletedItems();
    loadData();
    setupNavigation();
    setupInstallButton();
    updateStats();
});

// Регистрация Service Worker
function initServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/service-worker.js')
            .then(reg => console.log('Service Worker зарегистрирован', reg))
            .catch(err => console.log('Ошибка регистрации Service Worker', err));
    }
}

// Загрузка данных
async function loadData() {
    try {
        appState.data.anatomy = await fetchData('data/anatomy.json');
        appState.data.techniques = await fetchData('data/techniques.json');
        appState.data.cases = await fetchData('data/cases.json');
        appState.data.quizzes = await fetchData('data/quizzes.json');
        
        renderSection(appState.currentSection);
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
    }
}

async function fetchData(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Ошибка загрузки ${url}`);
    }
    return await response.json();
}

// Навигация
function setupNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const section = btn.dataset.section;
            switchSection(section);
        });
    });
}

function switchSection(section) {
    // Обновляем активную кнопку навигации
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.section === section);
    });

    // Скрываем все секции
    document.querySelectorAll('.content-section').forEach(sec => {
        sec.classList.remove('active');
    });

    // Показываем выбранную секцию
    const targetSection = document.getElementById(section);
    if (targetSection) {
        targetSection.classList.add('active');
        appState.currentSection = section;
        appState.currentItem = null;
        renderSection(section);
    }
}

// Рендеринг секций
function renderSection(section) {
    switch (section) {
        case 'home':
            updateStats();
            break;
        case 'anatomy':
            renderList('anatomy', appState.data.anatomy);
            break;
        case 'techniques':
            renderList('techniques', appState.data.techniques);
            break;
        case 'cases':
            renderList('cases', appState.data.cases);
            break;
        case 'quizzes':
            renderQuizList();
            break;
    }
}

// Рендеринг списков
function renderList(type, items) {
    const listContainer = document.getElementById(`${type}List`);
    const detailContainer = document.getElementById(`${type}Detail`);
    const backBtn = document.getElementById(`${type}Back`);

    if (!items || items.length === 0) {
        listContainer.innerHTML = '<p>Загрузка данных...</p>';
        return;
    }

    // Показываем список, скрываем детали
    listContainer.style.display = 'grid';
    detailContainer.style.display = 'none';
    backBtn.style.display = 'none';

    listContainer.innerHTML = items.map(item => {
        const isCompleted = appState.completed[type].has(item.id);
        return `
            <div class="item-card ${isCompleted ? 'completed' : ''}" data-id="${item.id}">
                <h3>${item.title}</h3>
                <p>${item.description || ''}</p>
                <div class="item-meta">
                    <button class="complete-btn ${isCompleted ? 'completed' : ''}" 
                            onclick="toggleComplete('${type}', ${item.id}, event)">
                        ${isCompleted ? 'Пройдено ✓' : 'Отметить как пройденное'}
                    </button>
                </div>
            </div>
        `;
    }).join('');

    // Добавляем обработчики клика
    listContainer.querySelectorAll('.item-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (!e.target.classList.contains('complete-btn')) {
                const id = parseInt(card.dataset.id);
                showDetail(type, id);
            }
        });
    });
}

// Показ детальной информации
function showDetail(type, id) {
    const item = appState.data[type].find(item => item.id === id);
    if (!item) return;

    appState.currentItem = { type, id };
    const listContainer = document.getElementById(`${type}List`);
    const detailContainer = document.getElementById(`${type}Detail`);
    const backBtn = document.getElementById(`${type}Back`);

    listContainer.style.display = 'none';
    detailContainer.style.display = 'block';
    backBtn.style.display = 'block';

    let html = '';

    switch (type) {
        case 'anatomy':
            html = `
                <h2>${item.title}</h2>
                <p class="detail-description">${item.description}</p>
                ${item.image ? `<img src="${item.image}" alt="${item.title}">` : ''}
                <div class="detail-content">${item.content}</div>
                <button class="complete-btn ${appState.completed[type].has(id) ? 'completed' : ''}" 
                        onclick="toggleComplete('${type}', ${id}, event)">
                    ${appState.completed[type].has(id) ? 'Пройдено ✓' : 'Отметить как пройденное'}
                </button>
            `;
            break;

        case 'techniques':
            html = `
                <h2>${item.title}</h2>
                <p class="detail-description">${item.description}</p>
                <div class="detail-content">
                    <div class="steps-list">
                        <h3>Пошаговое описание:</h3>
                        <ol>
                            ${item.steps.map(step => `<li>${step}</li>`).join('')}
                        </ol>
                    </div>
                    <div class="technique-info">
                        <div class="info-box">
                            <h4>Показания:</h4>
                            <p>${item.indications}</p>
                        </div>
                        <div class="info-box">
                            <h4>Противопоказания:</h4>
                            <p>${item.contraindications}</p>
                        </div>
                    </div>
                </div>
                <button class="complete-btn ${appState.completed[type].has(id) ? 'completed' : ''}" 
                        onclick="toggleComplete('${type}', ${id}, event)">
                    ${appState.completed[type].has(id) ? 'Пройдено ✓' : 'Отметить как пройденное'}
                </button>
            `;
            break;

        case 'cases':
            html = `
                <h2>${item.title}</h2>
                <div class="case-info">
                    <h3>Пациент:</h3>
                    <p>${item.patient}</p>
                </div>
                <div class="case-info">
                    <h3>Жалобы:</h3>
                    <p>${item.complaints}</p>
                </div>
                <div class="case-info">
                    <h3>Обследование:</h3>
                    <p>${item.examination}</p>
                </div>
                <div class="case-info">
                    <h3>Диагноз:</h3>
                    <p>${item.diagnosis}</p>
                </div>
                <div class="case-info">
                    <h3>Лечение:</h3>
                    <p>${item.treatment}</p>
                </div>
                <div class="case-info">
                    <h3>Результат:</h3>
                    <p>${item.outcome}</p>
                </div>
                <button class="complete-btn ${appState.completed[type].has(id) ? 'completed' : ''}" 
                        onclick="toggleComplete('${type}', ${id}, event)">
                    ${appState.completed[type].has(id) ? 'Пройдено ✓' : 'Отметить как пройденное'}
                </button>
            `;
            break;
    }

    detailContainer.innerHTML = html;
}

// Обработка кнопки "Назад"
document.querySelectorAll('.back-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const section = appState.currentSection;
        renderList(section, appState.data[section]);
    });
});

// Рендеринг списка тестов
function renderQuizList() {
    const listContainer = document.getElementById('quizzesList');
    const detailContainer = document.getElementById('quizDetail');
    const backBtn = document.getElementById('quizzesBack');

    listContainer.style.display = 'grid';
    detailContainer.style.display = 'none';
    backBtn.style.display = 'none';

    if (!appState.data.quizzes || appState.data.quizzes.length === 0) {
        listContainer.innerHTML = '<p>Загрузка данных...</p>';
        return;
    }

    listContainer.innerHTML = appState.data.quizzes.map(quiz => {
        const isCompleted = appState.completed.quizzes.has(quiz.id);
        return `
            <div class="item-card ${isCompleted ? 'completed' : ''}" data-id="${quiz.id}">
                <h3>Тест ${quiz.id}</h3>
                <p>${quiz.question}</p>
                <div class="item-meta">
                    <button class="complete-btn ${isCompleted ? 'completed' : ''}" 
                            onclick="toggleComplete('quizzes', ${quiz.id}, event)">
                        ${isCompleted ? 'Пройдено ✓' : 'Отметить как пройденное'}
                    </button>
                </div>
            </div>
        `;
    }).join('');

    listContainer.querySelectorAll('.item-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (!e.target.classList.contains('complete-btn')) {
                const id = parseInt(card.dataset.id);
                showQuiz(id);
            }
        });
    });
}

// Показ теста
function showQuiz(id) {
    const quiz = appState.data.quizzes.find(q => q.id === id);
    if (!quiz) return;

    appState.currentQuiz = quiz;
    appState.quizAnswer = null;
    appState.quizResult = null;

    const listContainer = document.getElementById('quizzesList');
    const detailContainer = document.getElementById('quizDetail');
    const backBtn = document.getElementById('quizzesBack');

    listContainer.style.display = 'none';
    detailContainer.style.display = 'block';
    backBtn.style.display = 'block';

    const html = `
        <div class="quiz-container">
            <div class="quiz-question">
                <h3>${quiz.question}</h3>
                <ul class="quiz-options">
                    ${quiz.options.map((option, index) => `
                        <li class="quiz-option" data-index="${index}" onclick="selectAnswer(${index})">
                            ${option}
                        </li>
                    `).join('')}
                </ul>
            </div>
            <div class="quiz-actions">
                <button class="quiz-btn primary" id="checkAnswerBtn" onclick="checkAnswer()" disabled>
                    Проверить ответ
                </button>
            </div>
            <div id="quizResult" class="quiz-result" style="display: none;"></div>
        </div>
    `;

    detailContainer.innerHTML = html;
}

// Выбор ответа
function selectAnswer(index) {
    if (appState.quizResult) return; // Нельзя менять после проверки

    appState.quizAnswer = index;
    const options = document.querySelectorAll('.quiz-option');
    options.forEach((opt, i) => {
        opt.classList.toggle('selected', i === index);
    });
    document.getElementById('checkAnswerBtn').disabled = false;
}

// Проверка ответа
function checkAnswer() {
    if (appState.quizAnswer === null || !appState.currentQuiz) return;

    const quiz = appState.currentQuiz;
    const isCorrect = appState.quizAnswer === quiz.correct;
    appState.quizResult = { isCorrect, explanation: quiz.explanation };

    const options = document.querySelectorAll('.quiz-option');
    options.forEach((opt, index) => {
        opt.style.pointerEvents = 'none';
        if (index === quiz.correct) {
            opt.classList.add('correct');
        } else if (index === appState.quizAnswer && !isCorrect) {
            opt.classList.add('incorrect');
        }
    });

    document.getElementById('checkAnswerBtn').disabled = true;

    const resultDiv = document.getElementById('quizResult');
    resultDiv.style.display = 'block';
    resultDiv.innerHTML = `
        <h3 style="color: ${isCorrect ? 'var(--success-color)' : 'var(--accent-color)'}">
            ${isCorrect ? 'Правильно! ✓' : 'Неправильно ✗'}
        </h3>
        <div class="quiz-explanation">
            <h4>Объяснение:</h4>
            <p>${quiz.explanation}</p>
        </div>
        <button class="complete-btn" style="margin-top: 1rem;" onclick="toggleComplete('quizzes', ${quiz.id}, event)">
            ${appState.completed.quizzes.has(quiz.id) ? 'Пройдено ✓' : 'Отметить тест как пройденный'}
        </button>
    `;

    // Если ответ правильный, автоматически отмечаем как пройденный
    if (isCorrect) {
        appState.completed.quizzes.add(quiz.id);
        saveCompletedItems();
        updateStats();
    }
}

// Переключение статуса "Пройдено"
function toggleComplete(type, id, event) {
    if (event) {
        event.stopPropagation();
    }

    if (appState.completed[type].has(id)) {
        appState.completed[type].delete(id);
    } else {
        appState.completed[type].add(id);
    }

    saveCompletedItems();
    updateStats();

    // Обновляем текущий вид
    if (appState.currentItem && appState.currentItem.type === type && appState.currentItem.id === id) {
        showDetail(type, id);
    } else {
        renderSection(type);
    }
}

// Сохранение и загрузка прогресса
function saveCompletedItems() {
    const data = {};
    Object.keys(appState.completed).forEach(key => {
        data[key] = Array.from(appState.completed[key]);
    });
    localStorage.setItem('osteopathAppProgress', JSON.stringify(data));
}

function loadCompletedItems() {
    const saved = localStorage.getItem('osteopathAppProgress');
    if (saved) {
        try {
            const data = JSON.parse(saved);
            Object.keys(data).forEach(key => {
                appState.completed[key] = new Set(data[key]);
            });
        } catch (e) {
            console.error('Ошибка загрузки прогресса:', e);
        }
    }
}

// Обновление статистики
function updateStats() {
    document.getElementById('anatomyCompleted').textContent = appState.completed.anatomy.size;
    document.getElementById('techniquesCompleted').textContent = appState.completed.techniques.size;
    document.getElementById('casesCompleted').textContent = appState.completed.cases.size;
    document.getElementById('quizzesCompleted').textContent = appState.completed.quizzes.size;
}

// PWA: Кнопка установки
function setupInstallButton() {
    let deferredPrompt;
    const installBtn = document.getElementById('installBtn');

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        installBtn.style.display = 'block';
    });

    installBtn.addEventListener('click', async () => {
        if (!deferredPrompt) return;

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        
        if (outcome === 'accepted') {
            console.log('Приложение установлено');
        }
        
        deferredPrompt = null;
        installBtn.style.display = 'none';
    });

    window.addEventListener('appinstalled', () => {
        installBtn.style.display = 'none';
        deferredPrompt = null;
    });
}

// Экспорт функций для глобального доступа
window.selectAnswer = selectAnswer;
window.checkAnswer = checkAnswer;
window.toggleComplete = toggleComplete;
