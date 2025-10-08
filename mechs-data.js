// mechs-data.js - оставьте исходные данные, но добавьте проверку
if (typeof window.mechCatalog === 'undefined') {
    // Если каталог еще не инициализирован, создаем базовые данные
    const initialMechs = [
        // ... ваши исходные 472 меха ...
    ];
    
    // Сохраняем в localStorage при первой загрузке
    localStorage.setItem('mechCatalogInitialData', JSON.stringify(initialMechs));
}
