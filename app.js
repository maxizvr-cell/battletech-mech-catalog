// app.js
class MechCatalog {
    constructor() {
        this.mechs = [];
        this.filteredMechs = [];
        this.currentSort = { field: 'name', direction: 'asc' };
        this.init();
    }

    init() {
        this.loadFromLocalStorage();
        this.setupEventListeners();
        this.updateDisplay();
        this.updateStats();
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
            this.sortMechs();
            this.updateDisplay();
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

        // Сброс данных
        document.getElementById('resetData').addEventListener('click', () => {
            this.resetData();
        });

        // Сортировка по клику на заголовок
        document.querySelectorAll('th[data-sort]').forEach(th => {
            th.addEventListener('click', () => {
                this.handleHeaderSort(th.dataset.sort);
            });
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

        this.saveToLocalStorage();
        this.updateDisplay();
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
        
        setTimeout(() => {
            notification.classList.add('hidden');
        }, 4000);
    }

    saveToLocalStorage() {
        try {
            // Сохраняем только необходимые данные, чтобы не превысить лимит
            const storageData = this.mechs.map(mech => ({
                name: mech.name,
                class: mech.class,
                chassis: mech.chassis,
                tonnage: mech.tonnage,
                cost: mech.cost,
                hardpoints: mech.hardpoints,
                total: mech.total,
                source: mech.source
            }));
            
            localStorage.setItem('mechCatalogData', JSON.stringify(storageData));
        } catch (error) {
            console.warn('Не удалось сохранить данные в localStorage:', error);
        }
    }

    loadFromLocalStorage() {
        try {
            const savedData = localStorage.getItem('mechCatalogData');
            if (savedData) {
                const parsedData = JSON.parse(savedData);
                this.mechs = parsedData;
            }
        } catch (error) {
            console.warn('Не удалось загрузить данные из localStorage:', error);
        }
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

    resetData() {
        if (confirm('Вы уверены, что хотите сбросить все загруженные данные?')) {
            this.mechs = this.mechs.filter(mech => mech.source !== 'uploaded');
            localStorage.removeItem('mechCatalogData');
            this.updateDisplay();
            this.updateStats();
            this.showNotification('Данные сброшены', 'success');
        }
    }

    // Существующие методы фильтрации, сортировки и отображения...
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
            
            if (field === 'name') {
                aVal = aVal.toLowerCase();
                bVal = bVal.toLowerCase();
            }
            
            if (aVal < bVal) return direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return direction === 'asc' ? 1 : -1;
            return 0;
        });
    }

    handleHeaderSort(field) {
        if (this.currentSort.field === field) {
            this.currentSort.direction = this.currentSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            this.currentSort.field = field;
            this.currentSort.direction = 'asc';
        }
        
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

    updateDisplay() {
        const tbody = document.getElementById('tableBody');
        tbody.innerHTML = '';

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
