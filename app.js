// app.js (полностью исправленная версия)
class MechCatalog {
    constructor() {
        this.mechs = [];
        this.filteredMechs = [];
        this.currentSort = { field: 'name', direction: 'asc' };
        this.isAdmin = false;
        
        this.init();
    }

    async init() {
        await this.loadFromStorage();
        this.setupEventListeners();
        this.checkAdminStatus();
        this.updateDisplay();
        this.updateStats();
    }

    async loadFromStorage() {
        async loadFromStorage() {
    try {
        // 🔧 ПРИНУДИТЕЛЬНО ИГНОРИРУЕМ LOCALSTORAGE
        console.log('🔄 Принудительная загрузка свежих данных...');
        localStorage.removeItem('mechCatalogData'); // На всякий случай очищаем
        await this.loadInitialData();
        return;
        
    } catch (error) {
        console.error('Ошибка загрузки:', error);
        await this.loadInitialData();
    }
}

    async loadInitialData() {
        try {
            const response = await fetch('mechs-data.json');
            if (response.ok) {
                const data = await response.json();
                
                if (data && data.mechs && Array.isArray(data.mechs)) {
                    this.mechs = data.mechs;
                    this.filteredMechs = [...this.mechs];
                    this.saveToStorage();
                    console.log('✅ Загружены начальные данные: ' + this.mechs.length + ' мехов');
                } else {
                    console.warn('⚠️ Неверный формат mechs-data.json, начинаем с пустой базы');
                    this.mechs = [];
                    this.filteredMechs = [];
                }
            } else {
                console.warn('❌ Файл mechs-data.json не найден, начинаем с пустой базы');
                this.mechs = [];
                this.filteredMechs = [];
            }
        } catch (error) {
            console.error('💥 Ошибка загрузки начальных данных:', error);
            this.mechs = [];
            this.filteredMechs = [];
        }
    }

    saveToStorage() {
        try {
            localStorage.setItem('mechCatalogData', JSON.stringify(this.mechs));
            console.log('Сохранено ' + this.mechs.length + ' мехов в localStorage');
        } catch (error) {
            console.error('Ошибка сохранения в localStorage:', error);
        }
    }

    setupEventListeners() {
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.filterMechs();
        });

        document.getElementById('classFilter').addEventListener('change', (e) => {
            this.filterMechs();
        });

        document.getElementById('sortSelect').addEventListener('change', (e) => {
            this.currentSort.field = e.target.value;
            this.currentSort.direction = 'asc';
            this.sortMechs();
            this.updateDisplay();
            this.updateSortIndicators();
        });

        document.getElementById('uploadButton').addEventListener('click', () => {
            document.getElementById('jsonUpload').click();
        });

        document.getElementById('jsonUpload').addEventListener('change', (e) => {
            this.handleFileUpload(e.target.files);
        });

        document.getElementById('exportData').addEventListener('click', () => {
            this.exportData();
        });

        document.getElementById('resetData').addEventListener('click', () => {
            this.resetData();
        });

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

    parseMechFromJSON(jsonData) {
        let hardpoints = {
            energy: 0,
            ballistic: 0,
            missile: 0,
            support: 0
        };

        if (jsonData.hardpoints && jsonData.hardpoints.used) {
            const used = jsonData.hardpoints.used;
            hardpoints = {
                energy: used.energy || 0,
                ballistic: used.ballistic || 0,
                missile: used.missile || 0,
                support: used.support || 0
            };
        } else if (jsonData.inventory) {
            jsonData.inventory.forEach(item => {
                if (item.ComponentDefType === "Weapon") {
                    const weaponId = item.ComponentDefID.toLowerCase();
                    
                    if (weaponId.includes('laser') || weaponId.includes('ppc') || weaponId.includes('flamer') || 
                        weaponId.includes('plasma') || weaponId.includes('pulse')) {
                        hardpoints.energy++;
                    } else if (weaponId.includes('ac') || weaponId.includes('gauss') || weaponId.includes('machinegun') ||
                              weaponId.includes('lbx') || weaponId.includes('ultra')) {
                        hardpoints.ballistic++;
                    } else if (weaponId.includes('lrm') || weaponId.includes('srm') || weaponId.includes('mr') || 
                              weaponId.includes('narc') || weaponId.includes('streak') || weaponId.includes('atm')) {
                        hardpoints.missile++;
                    }
                }
            });
        }

        let mechClass = "Medium";
        let tonnage = 50;

        if (jsonData.class) {
            mechClass = jsonData.class;
        } else if (jsonData.tonnage) {
            tonnage = jsonData.tonnage;
            if (tonnage <= 35) mechClass = "Light";
            else if (tonnage <= 55) mechClass = "Medium";
            else if (tonnage <= 75) mechClass = "Heavy";
            else mechClass = "Assault";
        } else {
            const mechTags = jsonData.MechTags || {};
            const tags = mechTags.items || [];
            const tonnageMatch = tags.find(tag => tag.includes('unit_tonnage_'));
            if (tonnageMatch) {
                tonnage = parseInt(tonnageMatch.split('_').pop());
                if (tonnage <= 35) mechClass = "Light";
                else if (tonnage <= 55) mechClass = "Medium";
                else if (tonnage <= 75) mechClass = "Heavy";
                else mechClass = "Assault";
            }
        }

        const description = jsonData.Description || {};
        return {
            name: description.UIName || description.Name || 'Unknown Mech',
            class: mechClass,
            chassis: jsonData.ChassisID || 'unknown',
            tonnage: tonnage,
            cost: description.Cost || 0,
            hardpoints: hardpoints,
            total: hardpoints.energy + hardpoints.ballistic + hardpoints.missile + hardpoints.support,
            details: description.Details || '',
            source: 'uploaded'
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
                    const existingIndex = this.mechs.findIndex(mech => mech.chassis === mechData.chassis);
                    if (existingIndex !== -1) {
                        this.mechs[existingIndex] = mechData;
                        console.log('Обновлен мех: ' + mechData.name);
                    } else {
                        this.mechs.push(mechData);
                        console.log('Добавлен мех: ' + mechData.name);
                    }
                    loadedCount++;
                }
            } catch (error) {
                errors.push(file.name + ': ' + error.message);
                console.error('Ошибка загрузки файла:', file.name, error);
            }
        }

        if (loadedCount > 0) {
            this.filteredMechs = [...this.mechs];
            this.saveToStorage();
            this.updateDisplay();
            this.updateStats();
        }

        document.getElementById('fileCount').textContent = this.mechs.length + ' мехов';

        if (errors.length > 0) {
            this.showNotification('Загружено ' + loadedCount + ' мехов. Ошибки: ' + errors.length, 'error');
        } else {
            this.showNotification('Успешно загружено ' + loadedCount + ' мехов', 'success');
        }

        document.getElementById('jsonUpload').value = '';
    }

    loadMechFromJSON(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const jsonData = JSON.parse(e.target.result);
                    
                    if (!jsonData.ChassisID || !jsonData.Description) {
                        reject(new Error('Неверный формат файла меха'));
                        return;
                    }

                    const mechData = this.parseMechFromJSON(jsonData);
                    resolve(mechData);
                } catch (error) {
                    reject(new Error('Ошибка парсинга JSON'));
                }
            };
            
            reader.onerror = () => reject(new Error('Ошибка чтения файла'));
            reader.readAsText(file);
        });
    }

    showNotification(message, type) {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.className = 'notification ' + type;
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
            this.saveToStorage();
            this.filterMechs();
            this.updateStats();
            this.showNotification('Загруженные данные сброшены', 'success');
        }
    }

    checkAdminStatus() {
        const urlParams = new URLSearchParams(window.location.search);
        this.isAdmin = urlParams.has('admin');
        
        if (this.isAdmin) {
            document.getElementById('resetData').style.display = 'block';
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
            let aVal, bVal;
            
            if (field === 'energy' || field === 'ballistic' || field === 'missile' || field === 'support') {
                aVal = a.hardpoints[field] || 0;
                bVal = b.hardpoints[field] || 0;
            } else if (field === 'total') {
                aVal = a.total || 0;
                bVal = b.total || 0;
            } else {
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
            
            let energy = 0, ballistic = 0, missile = 0, support = 0;
            
            if (mech.hardpoints && mech.hardpoints.used) {
                const used = mech.hardpoints.used;
                energy = used.energy || 0;
                ballistic = used.ballistic || 0;
                missile = used.missile || 0;
                support = used.support || 0;
            } else {
                const hp = mech.hardpoints || {};
                energy = hp.energy || 0;
                ballistic = hp.ballistic || 0;
                missile = hp.missile || 0;
                support = hp.support || 0;
            }
            
            const total = energy + ballistic + missile + support;

            row.innerHTML = `
                <td class="mech-name">${mech.name}</td>
                <td>${mech.class}</td>
                <td><span class="hardpoint-cell hardpoint-energy">${energy}</span></td>
                <td><span class="hardpoint-cell hardpoint-ballistic">${ballistic}</span></td>
                <td><span class="hardpoint-cell hardpoint-missile">${missile}</span></td>
                <td><span class="hardpoint-cell hardpoint-support">${support}</span></td>
                <td><strong>${total}</strong></td>
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

document.addEventListener('DOMContentLoaded', () => {
    window.mechCatalog = new MechCatalog();
});
