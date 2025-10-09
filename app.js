// app.js - Упрощенная версия для каталога мехов
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
            const response = await fetch('mechs-data.json');
            if (response.ok) {
                const data = await response.json();
                
                if (data && data.mechs && Array.isArray(data.mechs)) {
                    this.mechs = data.mechs;
                    this.filteredMechs = [...this.mechs];
                    console.log('✅ Загружено мехов: ' + this.mechs.length);
                } else {
                    console.warn('⚠️ Неверный формат mechs-data.json');
                    this.showError('Ошибка загрузки данных');
                }
            } else {
                console.warn('❌ Файл mechs-data.json не найден');
                this.showError('Файл данных не найден');
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
            const matchesSearch = mech.name.toLowerCase().includes(searchTerm);
            const matchesClass = classFilter === 'all' || mech.class === classFilter;
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
                // Сортировка по хардпоинтам
                aVal = this.getHardpointValue(a, field);
                bVal = this.getHardpointValue(b, field);
            } else if (field === 'total') {
                // Сортировка по общему количеству
                aVal = this.getTotalHardpoints(a);
                bVal = this.getTotalHardpoints(b);
            } else {
                // Сортировка по имени или классу
                aVal = a[field] || '';
                bVal = b[field] || '';
                
                if (field === 'name' || field === 'class') {
                    aVal = aVal.toLowerCase();
                    bVal = bVal.toLowerCase();
                }
            }
            
            if (aVal < bVal) return direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return direction === 'asc' ? 1 : -1;
            return 0;
        });
    }

    getHardpointValue(mech, type) {
        if (mech.hardpoints && mech.hardpoints.used) {
            return mech.hardpoints.used[type] || 0;
        }
        return mech.hardpoints?.[type] || 0;
    }

    getTotalHardpoints(mech) {
        if (mech.hardpoints && mech.hardpoints.used) {
            const used = mech.hardpoints.used;
            return (used.energy || 0) + (used.ballistic || 0) + (used.missile || 0) + (used.support || 0);
        }
        const hp = mech.hardpoints || {};
        return (hp.energy || 0) + (hp.ballistic || 0) + (hp.missile || 0) + (hp.support || 0);
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
            
            const energy = this.getHardpointValue(mech, 'energy');
            const ballistic = this.getHardpointValue(mech, 'ballistic');
            const missile = this.getHardpointValue(mech, 'missile');
            const support = this.getHardpointValue(mech, 'support');
            const total = this.getTotalHardpoints(mech);

            row.innerHTML = `
                <td class="mech-name">${mech.name}</td>
                <td><span class="class-badge class-${mech.class.toLowerCase()}">${mech.class}</span></td>
                <td><span class="hardpoint-cell hardpoint-energy">${energy}</span></td>
                <td><span class="hardpoint-cell hardpoint-ballistic">${ballistic}</span></td>
                <td><span class="hardpoint-cell hardpoint-missile">${missile}</span></td>
                <td><span class="hardpoint-cell hardpoint-support">${support}</span></td>
                <td><strong class="total-cell">${total}</strong></td>
            `;
            tbody.appendChild(row);
        });
    }

    updateStats() {
        const classes = { Assault: 0, Heavy: 0, Medium: 0, Light: 0 };
        
        this.filteredMechs.forEach(mech => {
            if (classes.hasOwnProperty(mech.class)) {
                classes[mech.class]++;
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
