/**
 * Современный, производительный accordion-компонент для списка транскрипций
 * 
 * Функциональность:
 * - По умолчанию показываются первые 4 записи
 * - Остальные записи скрыты в аккордеоне
 * - Плавная анимация открытия/закрытия
 * - Поддержка prefers-reduced-motion
 * - Полная доступность (ARIA)
 */

// Конфигурация
const ACCORDION_CONFIG = {
    visibleItems: 4, // Количество видимых элементов по умолчанию
    animationDuration: 300, // Длительность анимации в миллисекундах
    animationEasing: 'cubic-bezier(0.4, 0, 0.2, 1)' // Easing функция
};

/**
 * Создает структуру HTML с аккордеоном для списка транскрипций
 * @param {Array} items - Массив элементов для отображения
 * @param {Function} renderItem - Функция рендеринга одного элемента
 * @returns {string} HTML строка
 */
function createAccordionHTML(items, renderItem) {
    if (!items || items.length === 0) {
        return '';
    }

    const visibleItems = items.slice(0, ACCORDION_CONFIG.visibleItems);
    const hiddenItems = items.slice(ACCORDION_CONFIG.visibleItems);
    
    // Если элементов меньше или равно видимому количеству, аккордеон не нужен
    if (hiddenItems.length === 0) {
        return items.map(renderItem).join('');
    }

    const visibleHTML = visibleItems.map(renderItem).join('');
    const hiddenHTML = hiddenItems.map(renderItem).join('');
    
    const accordionId = 'transcripts-accordion';
    const buttonId = 'transcripts-accordion-toggle';
    
    return `
        <div class="transcripts-visible-items">
            ${visibleHTML}
        </div>
        <div class="transcripts-accordion" id="${accordionId}">
            <button 
                class="transcripts-accordion-toggle" 
                id="${buttonId}"
                aria-expanded="false"
                aria-controls="${accordionId}-content"
                type="button"
            >
                <span class="accordion-toggle-text">Показать ещё ${hiddenItems.length}</span>
                <span class="accordion-toggle-icon" aria-hidden="true">▼</span>
            </button>
            <div 
                class="transcripts-accordion-content" 
                id="${accordionId}-content"
                aria-hidden="true"
            >
                ${hiddenHTML}
            </div>
        </div>
    `;
}

/**
 * Инициализирует аккордеон после рендеринга
 */
function initAccordion() {
    const toggleButton = document.getElementById('transcripts-accordion-toggle');
    if (!toggleButton) {
        return; // Аккордеон не нужен (элементов <= 4)
    }

    const accordionContent = document.getElementById('transcripts-accordion-content');
    if (!accordionContent) {
        return;
    }

    // Сохраняем высоту контента для анимации
    let isExpanded = false;
    
    // Проверяем, поддерживает ли пользователь уменьшенную анимацию
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    toggleButton.addEventListener('click', () => {
        isExpanded = !isExpanded;
        
        // Обновляем ARIA атрибуты
        toggleButton.setAttribute('aria-expanded', isExpanded.toString());
        accordionContent.setAttribute('aria-hidden', (!isExpanded).toString());
        
        if (prefersReducedMotion) {
            // Без анимации для пользователей с prefers-reduced-motion
            if (isExpanded) {
                accordionContent.style.display = 'flex';
                accordionContent.style.maxHeight = 'none';
                accordionContent.style.opacity = '1';
            } else {
                accordionContent.style.maxHeight = '0';
                accordionContent.style.opacity = '0';
                accordionContent.style.display = 'none';
            }
            toggleButton.classList.toggle('accordion-expanded', isExpanded);
            updateButtonText(toggleButton, isExpanded);
        } else {
            // С анимацией
            if (isExpanded) {
                // Открываем
                // Сначала показываем элемент, убираем display: none если он был установлен
                accordionContent.style.display = 'flex';
                
                // Временно убираем все ограничения чтобы получить реальную высоту
                accordionContent.style.maxHeight = '';
                accordionContent.style.opacity = '';
                
                // Force reflow для применения стилей
                accordionContent.offsetHeight;
                
                // Получаем актуальную высоту контента
                const contentHeight = accordionContent.scrollHeight;
                
                // Устанавливаем начальное состояние для анимации
                accordionContent.style.maxHeight = '0';
                accordionContent.style.opacity = '0';
                
                // Force reflow для запуска анимации
                accordionContent.offsetHeight;
                
                // Запускаем анимацию
                accordionContent.style.maxHeight = `${contentHeight}px`;
                accordionContent.style.opacity = '1';
                toggleButton.classList.add('accordion-expanded');
                updateButtonText(toggleButton, true);
                
                // После завершения анимации убираем фиксированную высоту для адаптивности
                setTimeout(() => {
                    if (accordionContent.style.maxHeight !== '0px') {
                        accordionContent.style.maxHeight = 'none';
                    }
                }, ACCORDION_CONFIG.animationDuration);
            } else {
                // Закрываем - сначала получаем текущую высоту (если элемент виден)
                let currentHeight = 0;
                if (accordionContent.style.display !== 'none') {
                    // Если max-height установлен в 'none', нужно временно получить реальную высоту
                    if (accordionContent.style.maxHeight === 'none' || !accordionContent.style.maxHeight) {
                        accordionContent.style.maxHeight = '';
                        currentHeight = accordionContent.scrollHeight;
                    } else {
                        currentHeight = accordionContent.scrollHeight;
                    }
                }
                
                accordionContent.style.maxHeight = `${currentHeight}px`;
                accordionContent.style.opacity = '1';
                
                // Force reflow
                accordionContent.offsetHeight;
                
                accordionContent.style.maxHeight = '0';
                accordionContent.style.opacity = '0';
                toggleButton.classList.remove('accordion-expanded');
                updateButtonText(toggleButton, false);
                
                // Скрываем элемент после анимации
                setTimeout(() => {
                    accordionContent.style.display = 'none';
                }, ACCORDION_CONFIG.animationDuration);
            }
        }
    });
}

/**
 * Обновляет текст кнопки аккордеона
 */
function updateButtonText(button, isExpanded) {
    const textElement = button.querySelector('.accordion-toggle-text');
    if (!textElement) return;
    
    const accordionContent = document.getElementById('transcripts-accordion-content');
    if (!accordionContent) return;
    
    const hiddenCount = accordionContent.children.length;
    
    if (isExpanded) {
        textElement.textContent = `Скрыть`;
    } else {
        textElement.textContent = `Показать ещё ${hiddenCount}`;
    }
}

/**
 * Экспортируем функции для использования в других модулях
 */
window.createAccordionHTML = createAccordionHTML;
window.initAccordion = initAccordion;

