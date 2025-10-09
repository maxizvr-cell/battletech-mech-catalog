// mech-details.js - Логика детальной страницы меха

class MechDetails {
    constructor() {
        this.mechData = null;
        this.loadMechData();
    }
    
    async loadMechData() {
        try {
            // Получаем ID меха из URL
            const urlParams = new URLSearchParams(window.location.search);
            const mechId = urlParams.get('id');
            
            if (!mechId) {
                this.showError('ID меха не указан в URL');
                return;
            }
            
            // Загружаем расширенные данные
            const response = await fetch('mechs-data-enhanced.json');
            if (!response.ok) {
                throw new Error('Не удалось загрузить данные мехов');
            }
            
            const allMechs = await response.json();
            this.mechData = allMechs.find(mech => mech.id === mechId);
            
            if (this.mechData) {
                this.renderDetails();
            } else {
                this.showError(`МЕХ С ID "${mechId}" НЕ НАЙДЕН`);
            }
            
        } catch (error) {
            console.error('Ошибка загрузки данных:', error);
            this.showError('Ошибка загрузки данных меха');
        }
    }
    
    showError(message) {
        document.getElementById('mech-title').textContent = message;
        // Скрываем все секции
        document.querySelectorAll('.mech-details section').forEach(section => {
            section.style.display = 'none';
        });
    }
    
    renderDetails() {
        document.getElementById('mech-title').textContent = 
            `${this.mechData.name} ${this.mechData.model}`;
        
        this.renderBasicInfo();
        this.renderHardpoints();
        this.renderTechSpecs();
        this.renderArmor();
    }
    
    renderBasicInfo() {
        const grid = document.getElementById('basic-info-grid');
        
        const basicInfo = [
            { label: 'Модель', value: this.mechData.model || '—' },
            { label: 'Тоннаж', value: `${this.mechData.weight} tons` },
            { label: 'Класс', value: this.mechData.weightClass, cssClass: `weight-${this.mechData.weightClass?.toLowerCase()}` },
            { label: 'Battle Value', value: this.mechData.battleValue || '—' },
            { label: 'Год выпуска', value: this.mechData.year || '—' },
            { label: 'Стоимость', value: this.mechData.cost ? `${this.formatCost(this.mechData.cost)} C-Bills` : '—' },
            { label: 'Производитель', value: this.mechData.manufacturer || '—' },
            { label: 'Источник', value: this.mechData.source || '—' }
        ];
        
        grid.innerHTML = basicInfo.map(info => `
            <div class="info-item">
                <span class="info-label">${info.label}</span>
                <span class="info-value ${info.cssClass || ''}">${info.value}</span>
            </div>
        `).join('');
    }
    
    renderHardpoints() {
        const container = document.getElementById('hardpoints-container');
        
        if (!this.mechData.hardpoints || Object.keys(this.mechData.hardpoints).length === 0) {
            container.innerHTML = '<p>Данные о хардпоинтах отсутствуют</p>';
            return;
        }
        
        const hardpointTypes = {
            'Ballistic': { icon: '🔫', label: 'БАЛЛИСТИКА', color: 'ballistic' },
            'Energy': { icon: '⚡', label: 'ЭНЕРГИЯ', color: 'energy' },
            'Missile': { icon: '🚀', label: 'РАКЕТЫ', color: 'missile' },
            'AntiPersonnel': { icon: '🔪', label: 'ПЕХОТА', color: 'antipersonnel' }
        };
        
        container.innerHTML = Object.entries(this.mechData.hardpoints)
            .map(([type, count]) => {
                const config = hardpointTypes[type];
                if (!config) return '';
                
                const maxSlots = 8; // Максимальное количество слотов для отображения
                const slotsHTML = this.generateSlotsHTML(count, maxSlots, config.color);
                
                return `
                    <div class="hardpoint-row">
                        <span class="hardpoint-icon">${config.icon}</span>
                        <span class="hardpoint-label">${config.label}:</span>
                        <div class="hardpoint-slots">${slotsHTML}</div>
                        <span class="hardpoint-count">${count}/${maxSlots}</span>
                    </div>
                `;
            })
            .join('');
    }
    
    generateSlotsHTML(filledSlots, maxSlots, colorClass) {
        let slotsHTML = '';
        
        for (let i = 0; i < maxSlots; i++) {
            const slotType = i < filledSlots ? colorClass : 'empty';
            slotsHTML += `<div class="slot ${slotType}" title="${i < filledSlots ? 'Занят' : 'Свободен'}"></div>`;
        }
        
        return slotsHTML;
    }
    
    renderTechSpecs() {
        const grid = document.getElementById('tech-specs-grid');
        
        if (!this.mechData.techSpecs) {
            grid.innerHTML = '<p>Технические характеристики отсутствуют</p>';
            return;
        }
        
        const specs = this.mechData.techSpecs;
        const techInfo = [
            { label: 'Движение (Walk/Run/Jump)', value: `${specs.movement?.walk || 0}/${specs.movement?.run || 0}/${specs.movement?.jump || 0}` },
            { label: 'Макс. броня', value: specs.armor?.max || 0 },
            { label: 'Тип брони', value: specs.armor?.type || 'Standard' },
            { label: 'Структура', value: specs.structure || 'Standard' },
            { label: 'Двигатель', value: `${specs.engine?.rating || 0} ${specs.engine?.type || 'Fusion'}` },
            { label: 'Теплоотводы', value: specs.heatSinks || 0 }
        ];
        
        grid.innerHTML = techInfo.map(info => `
            <div class="spec-item">
                <span class="spec-label">${info.label}</span>
                <span class="spec-value">${info.value}</span>
            </div>
        `).join('');
    }
    
    renderArmor() {
        const grid = document.getElementById('armor-grid');
        
        if (!this.mechData.locations || Object.keys(this.mechData.locations).length === 0) {
            grid.innerHTML = '<p>Данные о броне отсутствуют</p>';
            return;
        }
        
        const locationNames = {
            'head': 'Голова',
            'leftarm': 'Л. Рука', 
            'rightarm': 'П. Рука',
            'lefttorso': 'Л. Торс',
            'righttorso': 'П. Торс',
            'centertorso': 'Ц. Торс',
            'leftleg': 'Л. Нога',
            'rightleg': 'П. Нога'
        };
        
        grid.innerHTML = Object.entries(this.mechData.locations)
            .map(([location, data]) => {
                const locationName = locationNames[location] || location;
                const armorValue = data.armor || 0;
                const rearArmor = data.rearArmor || 0;
                
                let armorText = `${armorValue}`;
                if (rearArmor > 0) {
                    armorText += ` (+${rearArmor} сзади)`;
                }
                
                return `
                    <div class="armor-location">
                        <span class="location-name">${locationName}</span>
                        <span class="armor-value">${armorText}</span>
                    </div>
                `;
            })
            .join('');
    }
    
    formatCost(cost) {
        if (!cost) return '0';
        return cost.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }
}

// Запускаем при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    new MechDetails();
});
