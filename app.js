// app.js
class MechCatalog {
    constructor() {
        this.mechs = [];
        this.filteredMechs = [];
        this.currentSort = { field: 'name', direction: 'asc' };
        this.isAdmin = false; // По умолчанию не админ
        
        // Инициализируем базу данных
        this.db = new Dexie('BattletechCatalog');
        this.db.version(1).stores({
            mechs: '++id, name, class, chassis, tonnage, cost, hardpoints, total, source, &chassis'
        });
        
        this.init();
    }

    async init() {
        await this.loadFromDatabase();
        this.setupEventListeners();
        this.checkAdminStatus();
        this.updateDisplay();
        this.updateStats();
    }

    // Проверяем, является ли пользователь администратором
    checkAdminStatus() {
        // Админский режим можно активировать через URL параметр
        const urlParams = new URLSearchParams(window.location.search);
        this.isAdmin = urlParams.has('admin');
        
        // Показываем кнопку сброса только админу
        if (this.isAdmin) {
            document.getElementById('resetData').style.display = 'block';
        }
    }

    async loadFromDatabase() {
        try {
            // Пытаемся загрузить из базы данных
            const savedMechs = await this.db.mechs.toArray();
            
            if (savedMechs.length > 0) {
                this.mechs = savedMechs;
                console.log(`Загружено ${savedMechs.length} мехов из базы данных`);
            } else {
                // Если в базе пусто, загружаем начальные данные
                await this.loadInitialData();
            }
        } catch (error) {
            console.error('Ошибка загрузки из базы данных:', error);
            await this.loadInitialData();
        }
        
        this.filteredMechs = [...this.mechs];
    }

    async loadInitialData() {
        try {
            // Пытаемся загрузить начальные данные с GitHub
            const response = await fetch('mechs-data.json');
            if (response.ok) {
                const initialData = await response.json();
                this.mechs = initialData;
                await this.saveToDatabase();
                console.log('Загружены начальные данные с GitHub');
            } else {
                console.warn('Не удалось загрузить начальные данные с GitHub');
                // Создаем пустой массив, если файл не найден
                this.mechs = [];
            }
        } catch (error) {
            console.warn('Ошибка загрузки начальных данных:', error);
            this.mechs = [];
        }
    }

    async saveToDatabase() {
        try {
            await this.db.mechs.clear();
            if (this.mechs.length > 0) {
                await this.db.mechs.bulkPut(this.mechs);
            }
        } catch (error) {
            console.error('Ошибка сохранения в базу данных:', error);
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

        // Сортировка через select
        document.getElementById('sortSelect').addEventListener('change', (e) => {
            this.currentSort.field = e.target.value;
            this.currentSort.direction = 'asc';
            this.sortMechs();
            this.updateDisplay();
            this.updateSortIndicators();
        });

        // Загрузка JSON файлов
        document.getElementById('uploadButton').addEventListener('click', () => {
            document.getElementById('jsonUpload').click();
        });

        document.getElementById('jsonUpload').addEventListener('change', (e) => {
            this.handleFileUpload(e.target.files);
        });

        // Экспорт данных
        document.getElementById('exportData').addEventListener('click', () => {
            this.exportData();
        });

        // Сброс данных (только для админа)
        document.getElementById('resetData').addEventListener('click', () => {
            this.resetData();
        });

        // Сортировка по клику на заголовок таблицы
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
        
        // Обновляем select сортировки
        document.getElementById('sortSelect').value = field;
        
        this.sortMechs();
        this.updateDisplay();
        this.updateSortIndicators();
    }

    updateSortIndicators() {
        document.querySelectorAll('th[data-sort]').forEach(th => {
            th.classList.remove('sort-asc', 'sort-desc');
            if (th.dataset.sort === this.currentSort.field) {
                th.classList.add(`sort-${this.currentSort.direction}`);
            }
        });
    }

    parseMechFromJSON(jsonData) {
        const hardpoints = {
            energy: 0,
            ballistic: 0,
            missile: 0,
            support: 0
        };

        // Анализируем инвентарь для подсчета хардпоинтов
        if (jsonData.inventory) {
            jsonData.inventory.forEach(item => {
                if (item.ComponentDefType === "Weapon") {
                    const weaponId = item.ComponentDefID.toLowerCase();
                    
                    if (weaponId.includes('laser') || weaponId.includes('ppc') || weaponId.includes('flamer')) {
                        hardpoints.energy++;
                    } else if (weaponId.includes('ac') || weaponId.includes('gauss') || weaponId.includes('machinegun')) {
                        hardpoints.ballistic++;
                    } else if (weaponId.includes('lrm') || weaponId.includes('srm') || weaponId.includes('mr') || weaponId.includes('narc')) {
                        hardpoints.missile++;
                    }
                } else if (item.ComponentDefType === "Upgrade" && 
                          !item.ComponentDefID.includes('CASE') && 
                          !item.ComponentDefID.includes('Artemis') &&
                          !item.ComponentDefID.includes('HeatSink') &&
                          !item.ComponentDefID.includes('Engine')) {
                    hardpoints.support++;
                }
            });
        }

        // Определяем класс по тонажу или тегам
        let mechClass = "Medium";
        let tonnage = 50;

        // Пытаемся извлечь тонаж из тегов
        const tonnageMatch = jsonData.MechTags?.items.find(tag => tag.includes('unit_tonnage_'));
        if (tonnageMatch) {
            tonnage = parseInt(tonnageMatch.split('_').pop());
        }

        // Определяем класс по тонажу
        if (tonnage <= 35) mechClass = "Light";
        else if (tonnage <= 55) mechClass = "Medium";
        else if (tonnage <= 75) mechClass = "Heavy";
        else mechClass = "Assault";

        return {
            name: jsonData.Description?.UIName || jsonData.Description?.Name || 'Unknown Mech',
            class: mechClass,
            chassis: jsonData.ChassisID || 'unknown',
            tonnage: tonnage,
            cost: jsonData.Description?.Cost || 0,
            hardpoints: hardpoints,
            total: hardpoints.energy + hardpoints.ballistic + hardpoints.missile + hardpoints.support,
            details: jsonData.Description?.Details || '',
            source: 'uploaded',
            fullData: jsonData
        };
    }

    async handleFileUpload(files) {
        if (files.length === 0) return;

        let loadedCount = 0;
        const errors = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            try {
                const mechData = await this.loadMechFromJSON(file);
                if (mechData) {
                    loadedCount++;
                }
            } catch (error) {
                errors.push(`${file.name}: ${error.message}`);
            }
        }

        await this.saveToDatabase();
        this.filterMechs();
        this.updateStats();

        // Обновляем счетчик файлов
        document.getElementById('fileCount').textContent = `${loadedCount} файлов`;

        // Показываем уведомление
        if (errors.length > 0) {
            this.showNotification(`Загружено ${loadedCount} мехов. Ошибки: ${errors.length}`, 'error');
        } else {
            this.showNotification(`Успешно загружено ${loadedCount} мехов`, 'success');
        }

        // Очищаем input
        document.getElementById('jsonUpload').value = '';
    }

    loadMechFromJSON(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const jsonData = JSON.parse(e.target.result);
                    
                    // Проверяем, что это валидный файл меха
                    if (!jsonData.ChassisID || !jsonData.Description) {
                        reject(new Error('Неверный формат файла меха'));
                        return;
                    }

                    // Проверяем дубликаты
                    const existingIndex = this.mechs.findIndex(mech => 
                        mech.chassis === jsonData.ChassisID
                    );

                    const mechData = this.parseMechFromJSON(jsonData);

                    if (existingIndex !== -1) {
                        // Обновляем существующую запись
                        this.mechs[existingIndex] = mechData;
                    } else {
                        // Добавляем новую запись
                        this.mechs.push(mechData);
                    }

                    resolve(mechData);
                } catch (error) {
                    reject(new Error('Ошибка парсинга JSON'));
                }
            };
            
            reader.onerror = () => reject(new Error('Ошибка чтения файла'));
            reader.readAsText(file);
        });
    }

    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.className = `notification ${type}`;
        notification.classList.remove('hidden');
        
        setTimeout(() => {
            notification.classList.add('hidden');
        }, 4000);
    }

    exportData() {
        const dataStr = JSON.stringify(this.mechs, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = 'mech-catalog-data.json';
        link.click();
        
        this.showNotification('Данные экспортированы в JSON файл', 'success');
    }

    async resetData() {
        if (confirm('Вы уверены, что хотите сбросить все загруженные данные?')) {
            this.mechs = this.mechs.filter(mech => mech.source !== 'uploaded');
            await this.saveToDatabase();
            this.filterMechs();
            this.updateStats();
            this.showNotification('Загруженные данные сброшены', 'success');
        }
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
    }

    sortMechs() {
        const field = this.currentSort.field;
        const direction = this.currentSort.direction;
        
        this.filteredMechs.sort((a, b) => {
            let aVal = a[field];
            let bVal = b[field];
            
            if (field === 'name' || field === 'class') {
                aVal = aVal.toLowerCase();
                bVal = bVal.toLowerCase();
            }
            
            if (aVal < bVal) return direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return direction === 'asc' ? 1 : -1;
            return 0;
        });
    }

    updateDisplay() {
        const tbody = document.getElementById('tableBody');
        tbody.innerHTML = '';

        if (this.filteredMechs.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 40px; color: #888;">
                        🚫 Мехи не найдены. Попробуйте изменить параметры поиска или загрузить JSON файлы.
                    </td>
                </tr>
            `;
            return;
        }

        this.filteredMechs.forEach(mech => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="mech-name">${mech.name}</td>
                <td>${mech.class}</td>
                <td><span class="hardpoint-cell hardpoint-energy">${mech.hardpoints.energy}</span></td>
                <td><span class="hardpoint-cell hardpoint-ballistic">${mech.hardpoints.ballistic}</span></td>
                <td><span class="hardpoint-cell hardpoint-missile">${mech.hardpoints.missile}</span></td>
                <td><span class="hardpoint-cell hardpoint-support">${mech.hardpoints.support}</span></td>
                <td><strong>${mech.total}</strong></td>
            `;
            tbody.appendChild(row);
        });
    }

    updateStats() {
        const classes = { Assault: 0, Heavy: 0, Medium: 0, Light: 0 };
        
        this.mechs.forEach(mech => {
            if (classes.hasOwnProperty(mech.class)) {
                classes[mech.class]++;
            }
        });

        document.getElementById('totalMechs').textContent = this.mechs.length;
        document.getElementById('assaultCount').textContent = classes.Assault;
        document.getElementById('heavyCount').textContent = classes.Heavy;
        document.getElementById('mediumCount').textContent = classes.Medium;
        document.getElementById('lightCount').textContent = classes.Light;
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    window.mechCatalog = new MechCatalog();
});
