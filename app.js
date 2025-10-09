// app.js - Обновленная версия для работы с твоим форматом данных
class MechCatalog {
    constructor() {
        this.mechs = [];
        this.filteredMechs = [];
        this.currentSort = { field: 'name', direction: 'asc' };
        
        this.init();
    }

    async init() {
        await this.loadData();
        this.setupEventListeners();
        this.updateDisplay();
        this.updateStats();
    }

    async loadData() {
        try {
            // Пробуем загрузить расширенные данные
            let response = await fetch('mechs-data-enhanced.json');
            if (!response.ok) {
                // Если нет, загружаем обычные данные
                response = await fetch('mechs-data.json');
            }
            
            if (response.ok) {
                const data = await response.json();
                
                // Обрабатываем оба формата данных
                if (Array.isArray(data)) {
                    // Формат: [{id: "...", name: "...", model: "...", ...}]
                    this.mechs = data;
                } else if (data && data.mechs && Array.isArray(data.mechs)) {
                    // Формат: {mechs: [{...}]}
                    this.mechs = data.mechs;
                } else {
                    console.warn('⚠️ Неизвестный формат данных');
                    this.showError('Неверный формат данных');
                    return;
                }
                
                this.filteredMechs = [...this.mechs];
                console.log('✅ Загружено мехов: ' + this.mechs.length);
                
            } else {
                console.warn('❌ Файлы данных не найдены');
                this.showError('Файлы данных не найдены');
            }
        } catch (error) {
            console.error('💥 Ошибка загрузки:', error);
            this.showError('Ошибка подключения к данным');
        }
    }

    setupEventListeners() {
        // Поиск
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.filterMechs();
        });

        // Фильтр по классу
        document.getElementById('classFilter').addEventListener('change', (e) => {
            this.filterMechs();
        });

        // Сортировка
        document.getElementById('sortSelect').addEventListener('change', (e) => {
            this.currentSort.field = e.target.value;
            this.currentSort.direction = 'asc';
            this.sortMechs();
            this.updateDisplay();
            this.updateSortIndicators();
        });

        // Сортировка по клику на заголовок
        document.querySelectorAll('th[data-sort]').forEach(th => {
            th.addEventListener('click', () => {
                this.handleHeaderSort(th.dataset.sort);
            });
        });
    }

    handleHeaderSort(field) {
        if (this.currentSort.field === field) {
            this.currentSort.direction = this.currentSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            this.currentSort.field = field;
            this.currentSort.direction = 'asc';
        }
        
        document.getElementById('sortSelect').value = field;
        this.sortMechs();
        this.updateDisplay();
        this.updateSortIndicators();
    }

    updateSortIndicators() {
        document.querySelectorAll('th[data-sort]').forEach(th => {
            th.classList.remove('sort-asc', 'sort-desc');
            if (th.dataset.sort === this.currentSort.field) {
                th.classList.add('sort-' + this.currentSort.direction);
            }
        });
    }

    filterMechs() {
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        const classFilter = document.getElementById('classFilter').value;
        
        this.filteredMechs = this.mechs.filter(mech => {
            const matchesSearch = mech.name.toLowerCase().includes(searchTerm) || 
                                 (mech.model && mech.model.toLowerCase().includes(searchTerm));
            const matchesClass = classFilter === 'all' || mech.weightClass === classFilter;
            return matchesSearch && matchesClass;
        });
        
        this.sortMechs();
        this.updateDisplay();
        this.updateStats();
    }

    sortMechs() {
        const field = this.currentSort.field;
        const direction = this.currentSort.direction;
        
        this.filteredMechs.sort((a, b) => {
            let aVal, bVal;
            
            if (field === 'energy' || field === 'ballistic' || field === 'missile' || field === 'support') {
                // Сортировка по хардпоинтам из расширенных данных
                aVal = this.getHardpointValue(a, field);
                bVal = this.getHardpointValue(b, field);
            } else if (field === 'total') {
                // Сортировка по общему количеству хардпоинтов
                aVal = this.getTotalHardpoints(a);
                bVal = this.getTotalHardpoints(b);
            } else if (field === 'weight') {
                // Сортировка по весу
                aVal = a.weight || 0;
                bVal = b.weight || 0;
            } else if (field === 'battleValue') {
                // Сортировка по Battle Value
                aVal = a.battleValue || 0;
                bVal = b.battleValue || 0;
            } else {
                // Сортировка по имени или классу
                aVal = a[field] || a.name || '';
                bVal = b[field] || b.name || '';
                
                if (field === 'name' || field === 'weightClass') {
                    aVal = aVal.toString().toLowerCase();
                    bVal = bVal.toString().toLowerCase();
                }
            }
            
            if (aVal < bVal) return direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return direction === 'asc' ? 1 : -1;
            return 0;
        });
    }

    getHardpointValue(mech, type) {
        // Пробуем получить из расширенных данных
        if (mech.hardpoints && mech.hardpoints[type]) {
            return mech.hardpoints[type];
        }
        // Резерв для старых данных
        return mech[type] || 0;
    }

    getTotalHardpoints(mech) {
        // Суммируем хардпоинты из расширенных данных
        if (mech.hardpoints) {
            const hp = mech.hardpoints;
            return (hp.Energy || 0) + (hp.Ballistic || 0) + (hp.Missile || 0) + (hp.Support || 0) + (hp.AntiPersonnel || 0);
        }
        // Резерв для старых данных
        return (mech.energy || 0) + (mech.ballistic || 0) + (mech.missile || 0) + (mech.support || 0);
    }

    updateDisplay() {
        const tbody = document.getElementById('tableBody');
        tbody.innerHTML = '';

        if (this.filteredMechs.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 40px; color: #888;">
                        🚫 Мехи не найдены. Попробуйте изменить параметры поиска.
                    </td>
                </tr>
            `;
            return;
        }

        this.filteredMechs.forEach(mech => {
            const row = document.createElement('tr');
            row.className = 'clickable-row';
            
            // Создаем ID для ссылки
            const mechId = mech.id || this.generateMechId(mech);
            row.setAttribute('data-mech-id', mechId);
            
            // Добавляем обработчик клика
            row.addEventListener('click', () => {
                this.openMechDetails(mechId);
            });

            const energy = this.getHardpointValue(mech, 'Energy');
            const ballistic = this.getHardpointValue(mech, 'Ballistic');
            const missile = this.getHardpointValue(mech, 'Missile');
            const support = this.getHardpointValue(mech, 'Support') + this.getHardpointValue(mech, 'AntiPersonnel');
            const total = this.getTotalHardpoints(mech);

            // Используем правильные названия полей
            const mechName = mech.name || 'Unknown';
            const mechClass = mech.weightClass || mech.class || 'Unknown';

            row.innerHTML = `
                <td class="mech-name">${mechName}</td>
                <td><span class="class-badge class-${mechClass.toLowerCase()}">${mechClass}</span></td>
                <td><span class="hardpoint-cell hardpoint-energy">${energy}</span></td>
                <td><span class="hardpoint-cell hardpoint-ballistic">${ballistic}</span></td>
                <td><span class="hardpoint-cell hardpoint-missile">${missile}</span></td>
                <td><span class="hardpoint-cell hardpoint-support">${support}</span></td>
                <td><strong class="total-cell">${total}</strong></td>
            `;
            tbody.appendChild(row);
        });
    }

    generateMechId(mech) {
        // Создаем ID из имени и модели
        const name = mech.name || 'unknown';
        const model = mech.model || 'unknown';
        return `${name}-${model}`.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    }

    openMechDetails(mechId) {
        if (mechId && mechId !== 'undefined') {
            window.location.href = `mech.html?id=${mechId}`;
        }
    }

    updateStats() {
        const classes = { Assault: 0, Heavy: 0, Medium: 0, Light: 0 };
        
        this.filteredMechs.forEach(mech => {
            const mechClass = mech.weightClass || mech.class;
            if (mechClass && classes.hasOwnProperty(mechClass)) {
                classes[mechClass]++;
            }
        });

        document.getElementById('totalMechs').textContent = this.filteredMechs.length;
        document.getElementById('assaultCount').textContent = classes.Assault;
        document.getElementById('heavyCount').textContent = classes.Heavy;
        document.getElementById('mediumCount').textContent = classes.Medium;
        document.getElementById('lightCount').textContent = classes.Light;
    }

    showError(message) {
        const tbody = document.getElementById('tableBody');
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 40px; color: #dc3545;">
                    ❌ ${message}
                </td>
            </tr>
        `;
        
        this.showNotification(message, 'error');
    }

    showNotification(message, type) {
        const notification = document.getElementById('notification');
        if (notification) {
            notification.textContent = message;
            notification.className = 'notification ' + type;
            notification.classList.remove('hidden');
            
            setTimeout(() => {
                notification.classList.add('hidden');
            }, 5000);
        }
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    window.mechCatalog = new MechCatalog();
});
