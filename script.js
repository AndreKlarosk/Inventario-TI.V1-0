// script.js (Main Application Logic)

// --- 0. Firebase Configuration and Initialization ---
// ! IMPORTANT: Replace with your Firebase project configuration !
const firebaseConfig = {
    apiKey: "AIzaSyD_KgRuSYh-BJTy-GQYjzG0vYLpS9_n6cU",
    authDomain: "inventario-de-ativos-ti.firebaseapp.com",
    projectId: "inventario-de-ativos-ti",
    storageBucket: "inventario-de-ativos-ti.firebasestorage.app",
    messagingSenderId: "207555484955",
    appId: "1:207555484955:web:bdc65ab761f673ec64c7be",
    measurementId: "G-CW2DXSKBMX"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Global variables for current user and company
let currentUser = null;
let currentCompanyId = null; // This might be the user's UID or a separate company ID
let appAssets = []; // Array to store fetched assets
let appChartInstances = {}; // To store Chart.js instances

// --- 1. DOM Element Caching ---
const DOM = {
    // Main App Container & Auth Container
    appContainer: document.getElementById('appContainer'), // The main container for the logged-in app
    authContainer: document.getElementById('authContainer'), // The main container for auth screens
    loadingOverlay: document.getElementById('loadingOverlay'),

    // Auth Forms
    loginForm: document.getElementById('loginForm'),
    registerForm: document.getElementById('registerForm'),
    companyRegisterForm: document.getElementById('companyRegisterForm'),
    companySelectForm: document.getElementById('companySelectForm'),
    resetPasswordForm: document.getElementById('resetPasswordForm'),

    // Auth Form Elements
    loginEmail: document.getElementById('loginEmail'),
    loginPassword: document.getElementById('loginPassword'),
    loginBtn: document.getElementById('loginBtn'),
    showRegister: document.getElementById('showRegister'),
    showResetPassword: document.getElementById('showResetPassword'),

    registerEmail: document.getElementById('registerEmail'),
    registerPassword: document.getElementById('registerPassword'),
    registerConfirmPassword: document.getElementById('registerConfirmPassword'),
    registerBtn: document.getElementById('registerBtn'),
    showLogin: document.getElementById('showLogin'),

    companyName: document.getElementById('companyName'),
    companyCnpj: document.getElementById('companyCnpj'),
    createCompanyBtn: document.getElementById('createCompanyBtn'),
    showCompanySelection: document.getElementById('showCompanySelection'),
    showCompanyRegisterFromSelection: document.getElementById('showCompanyRegisterFromSelection'),

    companySelect: document.getElementById('companySelect'),
    selectCompanyBtn: document.getElementById('selectCompanyBtn'),

    resetEmail: document.getElementById('resetEmail'),
    resetPasswordBtn: document.getElementById('resetPasswordBtn'),
    showLoginFromReset: document.getElementById('showLoginFromReset'),

    // App Header Elements
    appHeader: document.getElementById('appHeader'),
    companyDisplay: document.getElementById('companyDisplay'),
    toggleDashboardBtn: document.getElementById('toggleDashboardBtn'),
    toggleDashboardText: document.getElementById('toggleDashboardText'),
    addAssetBtn: document.getElementById('addAssetBtn'),
    logoutBtn: document.getElementById('logoutBtn'),

    // Dashboard Elements
    dashboardSection: document.getElementById('dashboardSection'),
    totalAssets: document.getElementById('totalAssets'),
    totalValue: document.getElementById('totalValue'),
    uniqueTypes: document.getElementById('uniqueTypes'),
    uniqueLocations: document.getElementById('uniqueLocations'),
    assetsByTypeChart: document.getElementById('assetsByTypeChart'),
    assetsByLocationChart: document.getElementById('assetsByLocationChart'),

    // Table Elements
    tableSection: document.getElementById('tableSection'),
    searchBar: document.getElementById('searchBar'),
    filterType: document.getElementById('filterType'),
    filterLocation: document.getElementById('filterLocation'),
    assetTableBody: document.getElementById('assetTableBody'),
    pagination: document.getElementById('pagination'),
    prevPageBtn: document.getElementById('prevPageBtn'),
    currentPageSpan: document.getElementById('currentPageSpan'),
    nextPageBtn: document.getElementById('nextPageBtn'),

    // Asset Modal Elements
    assetModal: document.getElementById('assetModal'),
    assetForm: document.getElementById('assetForm'),
    modalTitle: document.getElementById('modalTitle'),
    name: document.getElementById('name'),
    itemTypeSelect: document.getElementById('itemType'), // Renamed to avoid conflict with `itemType` field
    description: document.getElementById('description'),
    value: document.getElementById('value'),
    purchaseDate: document.getElementById('purchaseDate'),
    location: document.getElementById('location'),
    status: document.getElementById('status'),
    dynamicFieldsDiv: document.getElementById('dynamicFields'),
    cancelFormBtn: document.getElementById('cancelFormBtn'),
    closeModalBtn: document.getElementById('closeModalBtn'),
    
    // NEW Asset Form Elements (Added for more detail)
    serialNumber: document.getElementById('serialNumber'),
    responsible: document.getElementById('responsible'),
    invoiceNumber: document.getElementById('invoiceNumber'),
    warrantyEndDate: document.getElementById('warrantyEndDate'),
    addDynamicFieldBtn: document.getElementById('addDynamicFieldBtn'),


    // Asset Details Modal
    assetDetailsModal: document.getElementById('assetDetailsModal'),
    detailsModalTitle: document.getElementById('detailsModalTitle'),
    assetDetailsContent: document.getElementById('assetDetailsContent'),
    editDetailsBtn: document.getElementById('editDetailsBtn'),
    deleteDetailsBtn: document.getElementById('deleteDetailsBtn'),
    closeDetailsModalBtn: document.getElementById('closeDetailsModalBtn'),
    closeDetailsModalBtnTop: document.getElementById('closeDetailsModalBtnTop'),


    // Message Box
    messageBox: document.getElementById('messageBox'),
    messageBoxTitle: document.getElementById('messageBoxTitle'),
    messageBoxContent: document.getElementById('messageBoxContent'),
    messageBoxActions: document.getElementById('messageBoxActions'),

    // Toast Container
    toastContainer: document.getElementById('toastContainer')
};

// --- 2. Utility Functions (Helpers) ---
const Utils = (() => {
    /**
     * Formats a number to Brazilian currency (R$).
     * @param {number} value - The number to format.
     * @returns {string} Formatted currency string.
     */
    const formatCurrency = (value) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    };

    /**
     * Formats a Firestore Timestamp to a readable date string (DD/MM/YYYY).
     * @param {firebase.firestore.Timestamp} timestamp - The Firestore Timestamp object.
     * @returns {string} Formatted date string or empty string if invalid.
     */
    const formatDate = (timestamp) => {
        if (!timestamp || !timestamp.toDate) return '';
        const date = timestamp.toDate();
        return date.toLocaleDateString('pt-BR');
    };

    /**
     * Formats a date object or string to YYYY-MM-DD for input[type="date"].
     * @param {Date | firebase.firestore.Timestamp | string} dateInput
     * @returns {string} Formatted date string (YYYY-MM-DD) or empty string.
     */
    const formatToInputDate = (dateInput) => {
        let date;
        if (dateInput instanceof firebase.firestore.Timestamp) {
            date = dateInput.toDate();
        } else if (dateInput instanceof Date) {
            date = dateInput;
        } else if (typeof dateInput === 'string') {
            date = new Date(dateInput); // Try to parse string
        } else {
            return '';
        }

        if (isNaN(date.getTime())) return ''; // Check for invalid date

        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    };


    return {
        formatCurrency,
        formatDate,
        formatToInputDate
    };
})();

// --- 3. UI Service (Handles all UI manipulations) ---
const UIService = (() => {
    let currentToastTimeout = null;
    let isDashboardVisible = false; // State to track which layout is visible - MOVED HERE

    /**
     * Toggles the visibility of a DOM element.
     * @param {HTMLElement} element - The DOM element to toggle.
     * @param {boolean} show - True to show, false to hide.
     */
    const toggleVisibility = (element, show) => {
        if (element) {
            element.classList.toggle('hidden', !show);
        }
    };

    /**
     * Shows or hides the loading overlay.
     * @param {boolean} show - True to show, false to hide.
     */
    const showLoading = (show) => {
        toggleVisibility(DOM.loadingOverlay, show);
    };

    /**
     * Hides all primary app content sections (auth, appContainer).
     */
    const hideAllAppSections = () => {
        toggleVisibility(DOM.appContainer, false);
        toggleVisibility(DOM.authContainer, false);
        // Hide all auth forms specifically
        toggleVisibility(DOM.loginForm, false);
        toggleVisibility(DOM.registerForm, false);
        toggleVisibility(DOM.companyRegisterForm, false);
        toggleVisibility(DOM.companySelectForm, false);
        toggleVisibility(DOM.resetPasswordForm, false);
    };

    /**
     * Shows a specific authentication form.
     * @param {HTMLElement} formElement - The form to show.
     */
    const showAuthForm = (formElement) => {
        hideAllAppSections();
        toggleVisibility(DOM.authContainer, true);
        toggleVisibility(formElement, true);
    };

    /**
     * Displays a toast notification.
     * @param {string} message - The message to display.
     * @param {'success'|'error'|'info'} type - Type of toast.
     */
    const showToast = (message, type = 'info') => {
        if (!DOM.toastContainer) return;

        // Clear previous timeout if it exists
        if (currentToastTimeout) {
            clearTimeout(currentToastTimeout);
        }

        const toast = document.createElement('div');
        toast.className = `p-4 rounded-lg shadow-md text-white flex items-center space-x-3 transform transition-all duration-300 ease-out translate-x-full opacity-0`;

        let bgColorClass = '';
        let iconClass = '';
        switch (type) {
            case 'success':
                bgColorClass = 'bg-green-500';
                iconClass = 'fas fa-check-circle';
                break;
            case 'error':
                bgColorClass = 'bg-red-500';
                iconClass = 'fas fa-times-circle';
                break;
            case 'info':
            default:
                bgColorClass = 'bg-blue-500';
                iconClass = 'fas fa-info-circle';
                break;
        }

        toast.classList.add(bgColorClass);
        toast.innerHTML = `<i class="${iconClass} text-xl"></i><span>${message}</span>`;

        DOM.toastContainer.appendChild(toast);

        // Animate in
        setTimeout(() => {
            toast.classList.remove('translate-x-full', 'opacity-0');
            toast.classList.add('translate-x-0', 'opacity-100');
        }, 10); // Small delay for animation to work

        // Animate out and remove
        currentToastTimeout = setTimeout(() => {
            toast.classList.remove('translate-x-0', 'opacity-100');
            toast.classList.add('translate-x-full', 'opacity-0');
            toast.addEventListener('transitionend', () => toast.remove());
        }, 3000);
    };

    /**
     * Displays a custom message box with actions.
     * @param {string} title - The title of the message box.
     * @param {string} message - The content message.
     * @param {Array<{text: string, style: string, onClick: Function}>} actions - Array of action buttons.
     */
    const showMessageBox = (title, message, actions = []) => {
        if (!DOM.messageBox || !DOM.messageBoxTitle || !DOM.messageBoxContent || !DOM.messageBoxActions) return;

        DOM.messageBoxTitle.textContent = title;
        DOM.messageBoxContent.textContent = message;
        DOM.messageBoxActions.innerHTML = ''; // Clear previous actions

        actions.forEach(action => {
            const button = document.createElement('button');
            button.textContent = action.text;
            button.className = action.style; // e.g., 'app-btn-primary', 'app-btn-danger'
            button.onclick = () => {
                action.onClick();
                closeMessageBox();
            };
            DOM.messageBoxActions.appendChild(button);
        });
        toggleVisibility(DOM.messageBox, true);
    };

    /**
     * Closes the message box.
     */
    const closeMessageBox = () => {
        toggleVisibility(DOM.messageBox, false);
    };

    /**
     * Opens the asset add/edit modal.
     * @param {Object} [assetData=null] - Pre-fill form with asset data for editing.
     */
    const openAssetModal = (assetData = null) => {
        if (!DOM.assetModal || !DOM.assetForm || !DOM.modalTitle) return;

        ValidationService.clearValidationErrors(DOM.assetForm); // Clear errors when opening
        DOM.assetForm.reset(); // Clear previous form data
        DOM.assetForm.dataset.editingId = assetData ? assetData.id : '';
        DOM.modalTitle.textContent = assetData ? 'Editar Ativo' : 'Adicionar Novo Ativo';

        // Clear dynamic fields
        if (DOM.dynamicFieldsDiv) {
            DOM.dynamicFieldsDiv.innerHTML = '';
        }

        if (assetData) {
            // Populate common fields
            if (DOM.name) DOM.name.value = assetData.name || '';
            if (DOM.itemTypeSelect) DOM.itemTypeSelect.value = assetData.itemType || '';
            if (DOM.value) DOM.value.value = assetData.value ? parseFloat(assetData.value).toFixed(2) : '';
            if (DOM.purchaseDate) DOM.purchaseDate.value = assetData.purchaseDate ? Utils.formatToInputDate(assetData.purchaseDate) : '';
            if (DOM.location) DOM.location.value = assetData.location || '';
            if (DOM.status) DOM.status.value = assetData.status || '';
            if (DOM.description) DOM.description.value = assetData.description || '';

            // Populate NEW common fields
            if (DOM.serialNumber) DOM.serialNumber.value = assetData.serialNumber || '';
            if (DOM.responsible) DOM.responsible.value = assetData.responsible || '';
            if (DOM.invoiceNumber) DOM.invoiceNumber.value = assetData.invoiceNumber || '';
            if (DOM.warrantyEndDate) DOM.warrantyEndDate.value = assetData.warrantyEndDate ? Utils.formatToInputDate(assetData.warrantyEndDate) : '';

            // Populate dynamic fields
            if (assetData.dynamicFields && typeof assetData.dynamicFields === 'object') {
                for (const fieldName in assetData.dynamicFields) {
                    createDynamicFieldInput(fieldName, assetData.dynamicFields[fieldName]);
                }
            }
        }
        toggleVisibility(DOM.assetModal, true);
    };

    /**
     * Closes all modals.
     */
    const closeModals = () => {
        toggleVisibility(DOM.assetModal, false);
        toggleVisibility(DOM.assetDetailsModal, false);
        closeMessageBox(); // Also close message box
    };

    /**
     * Creates a dynamic field input pair (label and input) in the asset form.
     * @param {string} fieldName - The name for the dynamic field.
     * @param {string} fieldValue - The initial value for the dynamic field.
     */
    const createDynamicFieldInput = (fieldName = '', fieldValue = '') => {
        if (!DOM.dynamicFieldsDiv) return;

        const fieldWrapper = document.createElement('div');
        fieldWrapper.className = 'dynamic-field flex items-center space-x-2';

        const inputName = document.createElement('input');
        inputName.type = 'text';
        inputName.placeholder = 'Nome do Campo (ex: RAM)';
        inputName.className = 'app-input flex-1';
        inputName.name = `dynamicFieldName[${Date.now()}]`; // Unique name
        inputName.value = fieldName;

        const inputValue = document.createElement('input');
        inputValue.type = 'text';
        inputValue.placeholder = 'Valor (ex: 16GB)';
        inputValue.className = 'app-input flex-1';
        inputValue.name = `dynamicFields[${fieldName || Date.now()}]`; // Use fieldName as key if provided
        inputValue.value = fieldValue;

        // Update inputValue name if inputName changes for consistency
        inputName.addEventListener('input', () => {
            inputValue.name = `dynamicFields[${inputName.value}]`;
        });

        const removeButton = document.createElement('button');
        removeButton.type = 'button';
        removeButton.className = 'app-btn-danger text-sm px-3 py-2';
        removeButton.innerHTML = '<i class="fas fa-times"></i>';
        removeButton.onclick = () => fieldWrapper.remove();

        fieldWrapper.appendChild(inputName);
        fieldWrapper.appendChild(inputValue);
        fieldWrapper.appendChild(removeButton);
        DOM.dynamicFieldsDiv.appendChild(fieldWrapper);
    };


    /**
     * Renders or updates a Chart.js chart.
     * @param {string} canvasId - The ID of the canvas element.
     * @param {string} type - Chart type (e.g., 'bar', 'pie').
     * @param {Object} data - Chart data.
     * @param {Object} options - Chart options.
     */
    const renderChart = (canvasId, type, data, options) => {
        const ctx = document.getElementById(canvasId);
        if (ctx) {
            // Destroy existing chart instance if it exists
            if (appChartInstances[canvasId]) {
                appChartInstances[canvasId].destroy();
            }
            appChartInstances[canvasId] = new Chart(ctx, {
                type: type,
                data: data,
                options: options
            });
        } else {
            console.warn(`Canvas element with ID '${canvasId}' not found for chart rendering.`);
        }
    };


    /**
     * Updates the dashboard statistics and charts based on provided assets.
     * @param {Array<Object>} assets - Assets to use for dashboard calculations.
     */
    const updateDashboard = (assets) => {
        if (!DOM.totalAssets || !DOM.totalValue || !DOM.uniqueTypes || !DOM.uniqueLocations || !DOM.assetsByTypeChart || !DOM.assetsByLocationChart) {
            console.warn("Dashboard elements not found.");
            return;
        }

        const totalAssets = assets.length;
        const totalValue = assets.reduce((sum, asset) => sum + (asset.value || 0), 0);

        const assetTypes = {};
        const assetLocations = {};

        assets.forEach(asset => {
            assetTypes[asset.itemType] = (assetTypes[asset.itemType] || 0) + 1;
            assetLocations[asset.location] = (assetLocations[asset.location] || 0) + 1;
        });

        const uniqueTypes = Object.keys(assetTypes).length;
        const uniqueLocations = Object.keys(assetLocations).length;

        // Update dashboard cards
        DOM.totalAssets.textContent = totalAssets;
        DOM.totalValue.textContent = Utils.formatCurrency(totalValue);
        DOM.uniqueTypes.textContent = uniqueTypes;
        DOM.uniqueLocations.textContent = uniqueLocations;

        // Prepare chart data
        const typeLabels = Object.keys(assetTypes);
        const typeData = Object.values(assetTypes);
        const locationLabels = Object.keys(assetLocations);
        const locationData = Object.values(assetLocations);

        const commonChartOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed !== null) {
                                label += context.parsed;
                            }
                            return label;
                        }
                    }
                }
            }
        };

        // Assets by Type Chart
        UIService.renderChart('assetsByTypeChart', 'pie', {
            labels: typeLabels,
            datasets: [{
                data: typeData,
                backgroundColor: [
                    '#4299E1', '#667EEA', '#805AD5', '#D53F8C', '#DD6B20',
                    '#38B2AC', '#48BB78', '#ECC94B', '#ED8936', '#9F7AEA'
                ],
                hoverOffset: 4
            }]
        }, commonChartOptions);

        // Assets by Location Chart
        UIService.renderChart('assetsByLocationChart', 'bar', {
            labels: locationLabels,
            datasets: [{
                label: 'Número de Ativos',
                data: locationData,
                backgroundColor: '#4299E1',
                borderColor: '#2B6CB0',
                borderWidth: 1
            }]
        }, {
            ...commonChartOptions,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0 // Ensure integer ticks for count
                    }
                }
            }
        });
    };

    /**
     * Renders the asset table with pagination and filters.
     * @param {Array<Object>} assets - Assets to display.
     * @param {number} currentPage - Current page number.
     * @param {number} assetsPerPage - Number of assets per page.
     * @param {string} searchTerm - Current search term.
     * @param {string} filterTypeValue - Current type filter.
     * @param {string} filterLocationValue - Current location filter.
     */
    const updateAssetsAndRender = (assets, currentPage = 1, assetsPerPage = 10, searchTerm = '', filterTypeValue = '', filterLocationValue = '') => {
        if (!DOM.assetTableBody || !DOM.currentPageSpan || !DOM.prevPageBtn || !DOM.nextPageBtn || !DOM.filterLocation) return;

        let filteredAssets = assets;

        // Apply search
        if (searchTerm) {
            const lowerCaseSearchTerm = searchTerm.toLowerCase();
            filteredAssets = filteredAssets.filter(asset =>
                asset.name.toLowerCase().includes(lowerCaseSearchTerm) ||
                (asset.itemType && asset.itemType.toLowerCase().includes(lowerCaseSearchTerm)) ||
                (asset.location && asset.location.toLowerCase().includes(lowerCaseSearchTerm))
            );
        }

        // Apply type filter
        if (filterTypeValue) {
            filteredAssets = filteredAssets.filter(asset => asset.itemType === filterTypeValue);
        }

        // Apply location filter
        if (filterLocationValue) {
            filteredAssets = filteredAssets.filter(asset => asset.location === filterLocationValue);
        }

        // Update location filter options dynamically
        const uniqueLocations = [...new Set(assets.map(asset => asset.location))].sort();
        DOM.filterLocation.innerHTML = '<option value="">Todas as Localizações</option>';
        uniqueLocations.forEach(location => {
            const option = document.createElement('option');
            option.value = location;
            option.textContent = location;
            DOM.filterLocation.appendChild(option);
        });
        DOM.filterLocation.value = filterLocationValue; // Restore selected filter

        // Pagination logic
        const totalPages = Math.ceil(filteredAssets.length / assetsPerPage);
        const start = (currentPage - 1) * assetsPerPage;
        const end = start + assetsPerPage;
        const assetsToDisplay = filteredAssets.slice(start, end);

        DOM.assetTableBody.innerHTML = ''; // Clear existing rows

        if (assetsToDisplay.length === 0) {
            DOM.assetTableBody.innerHTML = `<tr><td colspan="6" class="py-4 px-6 text-center text-gray-500">Nenhum ativo encontrado.</td></tr>`;
        } else {
            assetsToDisplay.forEach(asset => {
                const row = document.createElement('tr');
                row.className = 'bg-white border-b hover:bg-gray-50';
                row.innerHTML = `
                    <td class="py-4 px-6 font-medium text-gray-900 whitespace-nowrap">${asset.name}</td>
                    <td class="py-4 px-6">${asset.itemType}</td>
                    <td class="py-4 px-6">${Utils.formatCurrency(asset.value)}</td>
                    <td class="py-4 px-6">${asset.location}</td>
                    <td class="py-4 px-6">
                        <span class="px-2 py-1 rounded-full text-xs font-semibold ${
                            asset.status === 'Em Uso' ? 'bg-green-100 text-green-800' :
                            asset.status === 'Em Manutenção' ? 'bg-yellow-100 text-yellow-800' :
                            asset.status === 'Armazenado' ? 'bg-blue-100 text-blue-800' :
                            asset.status === 'Desativado' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                        }">${asset.status}</span>
                    </td>
                    <td class="py-4 px-6 text-center">
                        <button class="app-btn-secondary text-sm py-1 px-3 edit-asset-btn" data-id="${asset.id}" title="Editar Ativo"><i class="fas fa-edit"></i></button>
                        <button class="app-btn-secondary text-sm py-1 px-3 view-asset-btn ml-2" data-id="${asset.id}" title="Ver Detalhes"><i class="fas fa-eye"></i></button>
                        <button class="app-btn-danger text-sm py-1 px-3 delete-asset-btn ml-2" data-id="${asset.id}" title="Excluir Ativo"><i class="fas fa-trash-alt"></i></button>
                    </td>
                `;
                DOM.assetTableBody.appendChild(row);
            });

            // Add event listeners for edit and delete buttons after rendering
            DOM.assetTableBody.querySelectorAll('.edit-asset-btn').forEach(button => {
                button.addEventListener('click', (e) => {
                    App.editAsset(e.currentTarget.dataset.id);
                });
            });
            DOM.assetTableBody.querySelectorAll('.view-asset-btn').forEach(button => {
                button.addEventListener('click', (e) => {
                    App.showAssetDetails(e.currentTarget.dataset.id);
                });
            });
            DOM.assetTableBody.querySelectorAll('.delete-asset-btn').forEach(button => {
                button.addEventListener('click', (e) => {
                    App.deleteAssetAndRefresh(e.currentTarget.dataset.id);
                });
            });
        }

        // Update pagination controls
        DOM.currentPageSpan.textContent = `Página ${currentPage} de ${totalPages}`;
        DOM.prevPageBtn.disabled = currentPage === 1;
        DOM.nextPageBtn.disabled = currentPage === totalPages;
    };

    /**
     * Toggles the visibility of the dashboard and table sections.
     * This function now manages its internal isDashboardVisible state.
     */
    const toggleDashboardLayout = () => {
        isDashboardVisible = !isDashboardVisible; // Toggle the internal state
        if (DOM.dashboardSection && DOM.tableSection) {
            DOM.dashboardSection.classList.toggle('hidden', !isDashboardVisible);
            DOM.tableSection.classList.toggle('hidden', isDashboardVisible);

            // Update button text
            if (DOM.toggleDashboardText) {
                DOM.toggleDashboardText.textContent = isDashboardVisible ? 'Ver Tabela' : 'Ver Dashboard';
            }

            // If showing dashboard, ensure it's updated with current data
            if (isDashboardVisible) {
                updateDashboard(appAssets); // Certifique-se que appAssets está disponível e atualizado
            }
        } else {
            console.error("Dashboard or table sections not found. Cannot toggle layout.");
        }
    };


    return {
        toggleVisibility,
        showLoading,
        hideAllAppSections,
        showAuthForm,
        showToast,
        showMessageBox,
        closeMessageBox,
        openAssetModal,
        closeModals,
        createDynamicFieldInput,
        updateAssetsAndRender,
        toggleDashboardLayout, // Now directly callable to toggle
        updateDashboard,
        renderChart
    };
})();

// --- 4. Authentication Management Service ---
const AuthManagement = (() => {
    /**
     * Handles user registration.
     */
    const registerUser = async (e) => {
        e.preventDefault();
        const email = DOM.registerEmail.value;
        const password = DOM.registerPassword.value;
        const confirmPassword = DOM.registerConfirmPassword.value;

        if (password !== confirmPassword) {
            UIService.showToast("As senhas não coincidem.", "error");
            return;
        }

        UIService.showLoading(true);
        try {
            await auth.createUserWithEmailAndPassword(email, password);
            UIService.showToast("Cadastro realizado com sucesso! Registre sua empresa.", "success");
            UIService.showAuthForm(DOM.companyRegisterForm); // Move to company registration
        } catch (error) {
    console.warn("Erro no registro:", error);
    if (error.code === 'auth/email-already-in-use') {
        UIService.showToast("Este e-mail já está em uso. Tente fazer login ou use outro e-mail.", "error");
    } else {
        UIService.showToast("Erro no registro: " + error.message, "error");
    }
}
    };

    /**
     * Handles user login.
     */
    const loginUser = async (e) => {
        e.preventDefault();
        const email = DOM.loginEmail.value;
        const password = DOM.loginPassword.value;

        UIService.showLoading(true);
        try {
            await auth.signInWithEmailAndPassword(email, password);
            UIService.showToast("Login realizado com sucesso!", "success");
            // Auth listener handles the next step (company selection/app display)
        } catch (error) {
            console.error("Erro no login:", error);
            UIService.showToast("Erro no login: " + error.message, "error");
        } finally {
            UIService.showLoading(false);
        }
    };

    /**
     * Handles password reset.
     */
    const resetPassword = async (e) => {
        e.preventDefault();
        const email = DOM.resetEmail.value;

        UIService.showLoading(true);
        try {
            await auth.sendPasswordResetEmail(email);
            UIService.showToast("Link de redefinição de senha enviado para seu e-mail!", "success");
            UIService.showAuthForm(DOM.loginForm); // Go back to login
        } catch (error) {
            console.error("Erro ao redefinir senha:", error);
            UIService.showToast("Erro ao redefinir senha: " + error.message, "error");
        } finally {
            UIService.showLoading(false);
        }
    };

    /**
     * Handles user logout.
     */
    const logoutUser = async () => {
        UIService.showLoading(true);
        try {
            await auth.signOut();
            UIService.showToast("Você foi desconectado.", "info");
            currentCompanyId = null; // Clear company ID on logout
            appAssets = []; // Clear assets
            UIService.hideAllAppSections();
            UIService.showAuthForm(DOM.loginForm); // Show login form
        } catch (error) {
            console.error("Erro ao fazer logout:", error);
            UIService.showToast("Erro ao fazer logout: " + error.message, "error");
        } finally {
            UIService.showLoading(false);
        }
    };

    /**
     * Creates a new company document in Firestore and assigns the current user as owner.
     */
    const createCompany = async (e) => {
        e.preventDefault();
        const companyName = DOM.companyName.value.trim();
        const companyCnpj = DOM.companyCnpj.value.trim();

        if (!companyName) {
            UIService.showToast("O nome da empresa é obrigatório.", "error");
            return;
        }

        UIService.showLoading(true);
        try {
            const newCompanyRef = await db.collection('companies').add({
                name: companyName,
                cnpj: companyCnpj,
                ownerId: currentUser.uid,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            await db.collection('users').doc(currentUser.uid).update({
                companyIds: firebase.firestore.FieldValue.arrayUnion(newCompanyRef.id)
            });

            currentCompanyId = newCompanyRef.id;
            UIService.showToast("Empresa registrada com sucesso!", "success");
            App.initAppContent(); // Initialize app content
            UIService.toggleVisibility(DOM.appContainer, true);
            UIService.toggleVisibility(DOM.authContainer, false);
        } catch (error) {
            console.error("Erro ao registrar empresa:", error);
            UIService.showToast("Erro ao registrar empresa: " + error.message, "error");
        } finally {
            UIService.showLoading(false);
        }
    };

    /**
     * Populates the company selection dropdown.
     */
    const populateCompanySelect = async (companyIds) => {
        if (!DOM.companySelect) return;

        DOM.companySelect.innerHTML = '<option value="">Selecione uma empresa</option>';
        if (companyIds.length === 0) {
            UIService.showToast("Você não tem empresas associadas. Registre uma nova.", "info");
            UIService.showAuthForm(DOM.companyRegisterForm);
            return;
        }

        try {
            const companiesSnapshot = await db.collection('companies').where(firebase.firestore.FieldPath.documentId(), 'in', companyIds).get();
            if (companiesSnapshot.empty) {
                UIService.showToast("Nenhuma empresa encontrada para seus IDs.", "error");
                UIService.showAuthForm(DOM.companyRegisterForm);
                return;
            }
            companiesSnapshot.forEach(doc => {
                const option = document.createElement('option');
                option.value = doc.id;
                option.textContent = doc.data().name;
                DOM.companySelect.appendChild(option);
            });
            UIService.showAuthForm(DOM.companySelectForm);
        } catch (error) {
            console.error("Erro ao carregar empresas:", error);
            UIService.showToast("Erro ao carregar empresas: " + error.message, "error");
            UIService.showAuthForm(DOM.loginForm); // Fallback to login
        }
    };

    /**
     * Handles selection of an existing company.
     */
    const selectCompany = async (e) => {
        e.preventDefault();
        const selectedCompanyId = DOM.companySelect.value;
        if (!selectedCompanyId) {
            UIService.showToast("Por favor, selecione uma empresa.", "error");
            return;
        }
        currentCompanyId = selectedCompanyId;
        UIService.showLoading(true);
        try {
            const companyDoc = await db.collection('companies').doc(currentCompanyId).get();
            if (companyDoc.exists) {
                DOM.companyDisplay.textContent = companyDoc.data().name;
                UIService.showToast(`Acessando inventário de "${companyDoc.data().name}"`, "success");
                App.initAppContent();
                UIService.toggleVisibility(DOM.appContainer, true);
                UIService.toggleVisibility(DOM.authContainer, false);
            } else {
                UIService.showToast("Empresa selecionada não encontrada.", "error");
                await logoutUser(); // Force re-auth if company not found
            }
        } catch (error) {
            console.error("Erro ao selecionar empresa:", error);
            UIService.showToast("Erro ao selecionar empresa: " + error.message, "error");
            await logoutUser();
        } finally {
            UIService.showLoading(false);
        }
    };


    /**
     * Sets up authentication state listener.
     */
    const setupAuthListener = () => {
        auth.onAuthStateChanged(async (user) => {
            UIService.showLoading(true);
            if (user) {
                currentUser = user;
                // Check if user has associated companies
                const userDoc = await db.collection('users').doc(currentUser.uid).get();
                if (userDoc.exists && userDoc.data().companyIds && userDoc.data().companyIds.length > 0) {
                    const companyIds = userDoc.data().companyIds;
                    // If user has only one company, automatically select it
                    if (companyIds.length === 1) {
                        currentCompanyId = companyIds[0];
                        const companyDoc = await db.collection('companies').doc(currentCompanyId).get();
                        if (companyDoc.exists) {
                            DOM.companyDisplay.textContent = companyDoc.data().name;
                            App.initAppContent();
                            UIService.toggleVisibility(DOM.appContainer, true);
                            UIService.toggleVisibility(DOM.authContainer, false);
                        } else {
                            // Company document might have been deleted, clean up user's companyIds
                            await db.collection('users').doc(currentUser.uid).update({
                                companyIds: firebase.firestore.FieldValue.arrayRemove(currentCompanyId)
                            });
                            UIService.showToast("Empresa anterior não encontrada. Por favor, selecione ou registre uma nova.", "error");
                            populateCompanySelect([]); // Re-populate, which will lead to company register
                        }
                    } else {
                        // User has multiple companies, let them choose
                        populateCompanySelect(companyIds);
                        UIService.toggleVisibility(DOM.appContainer, false);
                        UIService.toggleVisibility(DOM.authContainer, true);
                        UIService.showAuthForm(DOM.companySelectForm);
                    }
                } else {
                    // No company associated, prompt to register one
                    UIService.showAuthForm(DOM.companyRegisterForm);
                }
            } else {
                currentUser = null;
                currentCompanyId = null;
                UIService.hideAllAppSections();
                UIService.showAuthForm(DOM.loginForm); // Default to login
            }
            UIService.showLoading(false);
        });
    };

    /**
     * Sets up event listeners for authentication forms.
     */
    const setupAuthEventListeners = () => {
        // Login Form
        if (DOM.loginForm) {
            DOM.loginForm.addEventListener('submit', loginUser);
            DOM.showRegister.addEventListener('click', (e) => { e.preventDefault(); UIService.showAuthForm(DOM.registerForm); });
            DOM.showResetPassword.addEventListener('click', (e) => { e.preventDefault(); UIService.showAuthForm(DOM.resetPasswordForm); });
        }

        // Register Form
        if (DOM.registerForm) {
            DOM.registerForm.addEventListener('submit', registerUser);
            DOM.showLogin.addEventListener('click', (e) => { e.preventDefault(); UIService.showAuthForm(DOM.loginForm); });
        }

        // Company Register Form
        if (DOM.companyRegisterForm) {
            DOM.companyRegisterForm.addEventListener('submit', createCompany);
            DOM.showCompanySelection.addEventListener('click', async (e) => {
                e.preventDefault();
                if (currentUser) {
                    const userDoc = await db.collection('users').doc(currentUser.uid).get();
                    if (userDoc.exists && userDoc.data().companyIds) {
                        populateCompanySelect(userDoc.data().companyIds);
                    } else {
                        UIService.showToast("Nenhuma empresa associada para selecionar. Por favor, registre uma.", "info");
                    }
                }
            });
        }

        // Company Select Form
        if (DOM.companySelectForm) {
            DOM.companySelectForm.addEventListener('submit', selectCompany);
            DOM.showCompanyRegisterFromSelection.addEventListener('click', (e) => { e.preventDefault(); UIService.showAuthForm(DOM.companyRegisterForm); });
        }

        // Reset Password Form
        if (DOM.resetPasswordForm) {
            DOM.resetPasswordForm.addEventListener('submit', resetPassword);
            DOM.showLoginFromReset.addEventListener('click', (e) => { e.preventDefault(); UIService.showAuthForm(DOM.loginForm); });
        }

        // Logout Button (in main app header)
        if (DOM.logoutBtn) {
            DOM.logoutBtn.addEventListener('click', logoutUser);
        }
    };

    return {
        setupAuthListener,
        setupAuthEventListeners,
        logoutUser, // Expose logout for other parts if needed
        loginUser
    };
})();

// --- 5. Asset Service (Handles all Firebase Firestore operations for assets) ---
const AssetService = (() => {
    /**
     * Helper to get form data.
     * @returns {Object} Asset data from the form.
     */
    const getAssetFormData = () => {
        const id = DOM.assetForm.dataset.editingId;
        const dynamicFields = {};
        // Iterate through dynamic field wrappers
        DOM.dynamicFieldsDiv.querySelectorAll('.dynamic-field').forEach(fieldWrapper => {
            const nameInput = fieldWrapper.querySelector('input[name^="dynamicFieldName"]');
            const valueInput = fieldWrapper.querySelector('input[name^="dynamicFields"]');
            if (nameInput && nameInput.value && valueInput && valueInput.value) {
                dynamicFields[nameInput.value] = valueInput.value;
            }
        });

        const purchaseDateValue = DOM.purchaseDate.value;
        const warrantyEndDateValue = DOM.warrantyEndDate.value;

        return {
            id: id || '',
            name: DOM.name.value,
            itemType: DOM.itemTypeSelect.value,
            description: DOM.description.value,
            value: parseFloat(DOM.value.value),
            purchaseDate: purchaseDateValue ? firebase.firestore.Timestamp.fromDate(new Date(purchaseDateValue + 'T12:00:00')) : null, // Add time to avoid timezone issues
            location: DOM.location.value,
            status: DOM.status.value,
            serialNumber: DOM.serialNumber.value,
            responsible: DOM.responsible.value,
            invoiceNumber: DOM.invoiceNumber.value,
            warrantyEndDate: warrantyEndDateValue ? firebase.firestore.Timestamp.fromDate(new Date(warrantyEndDateValue + 'T12:00:00')) : null,
            dynamicFields: dynamicFields,
            timestamp: firebase.firestore.FieldValue.serverTimestamp() // Update timestamp on save
        };
    };

    /**
     * Saves an asset (add or update).
     */
    const saveAsset = async (e) => {
        e.preventDefault(); // Prevent default form submission

        ValidationService.clearValidationErrors(DOM.assetForm); // Limpa erros antes de validar novamente

        const formData = getAssetFormData();
        if (!ValidationService.validateAssetForm(formData)) { // Chama a nova função de validação
            UIService.showToast("Por favor, corrija os erros no formulário.", "error");
            return; // Interrompe se a validação falhar
        }

        UIService.showLoading(true);
        try {
            const assetRef = db.collection('companies').doc(currentCompanyId).collection('assets');
            if (formData.id) {
                // Update existing asset
                await assetRef.doc(formData.id).update(formData);
                UIService.showToast('Ativo atualizado com sucesso!', 'success');
            } else {
                // Add new asset
                const newAssetRef = await assetRef.add(formData);
                UIService.showToast('Ativo adicionado com sucesso!', 'success');
            }
            UIService.closeModals();
            await fetchAllAssets(); // Refresh asset list and dashboard
        } catch (error) {
            console.error('Error saving asset:', error);
            UIService.showToast('Erro ao salvar ativo: ' + error.message, 'error');
        } finally {
            UIService.showLoading(false);
        }
    };

    /**
     * Fetches all assets for the current company from Firestore.
     */
    const fetchAllAssets = async () => {
        if (!currentCompanyId) {
            appAssets = [];
            UIService.updateAssetsAndRender(appAssets);
            return;
        }

        UIService.showLoading(true);
        try {
            const snapshot = await db.collection('companies').doc(currentCompanyId).collection('assets').orderBy('timestamp', 'desc').get();
            appAssets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            UIService.updateAssetsAndRender(appAssets); // Initial render
            UIService.updateDashboard(appAssets); // Update dashboard after fetching
        } catch (error) {
            console.error("Error fetching assets:", error);
            UIService.showToast("Erro ao carregar ativos: " + error.message, "error");
            appAssets = []; // Clear assets on error
            UIService.updateAssetsAndRender(appAssets); // Render empty table
        } finally {
            UIService.showLoading(false);
        }
    };

    /**
     * Deletes an asset by ID.
     * @param {string} assetId - The ID of the asset to delete.
     */
    const deleteAsset = async (assetId) => {
        if (!currentCompanyId || !assetId) return;

        UIService.showLoading(true);
        try {
            await db.collection('companies').doc(currentCompanyId).collection('assets').doc(assetId).delete();
            UIService.showToast('Ativo excluído com sucesso!', 'success');
            await fetchAllAssets(); // Refresh assets
        } catch (error) {
            console.error("Error deleting asset:", error);
            UIService.showToast("Erro ao excluir ativo: " + error.message, "error");
        } finally {
            UIService.showLoading(false);
        }
    };

    return {
        saveAsset,
        fetchAllAssets,
        deleteAsset,
        getAssetFormData // Expose for App module
    };
})();

// --- 6. App Module (Main application flow and coordination) ---
const App = (() => {
    let currentPage = 1;
    const assetsPerPage = 10;
    let currentSearchTerm = '';
    let currentFilterType = '';
    let currentFilterLocation = '';

    /**
     * Refreshes the asset table and dashboard with current filters.
     */
    const refreshAssetsView = () => {
        const filtered = appAssets.filter(asset => {
            const matchesSearch = currentSearchTerm ?
                asset.name.toLowerCase().includes(currentSearchTerm.toLowerCase()) ||
                (asset.itemType && asset.itemType.toLowerCase().includes(currentSearchTerm.toLowerCase())) ||
                (asset.location && asset.location.toLowerCase().includes(currentSearchTerm.toLowerCase())) : true;

            const matchesType = currentFilterType ? asset.itemType === currentFilterType : true;
            const matchesLocation = currentFilterLocation ? asset.location === currentFilterLocation : true;

            return matchesSearch && matchesType && matchesLocation;
        });

        UIService.updateAssetsAndRender(appAssets, currentPage, assetsPerPage, currentSearchTerm, currentFilterType, currentFilterLocation);
        UIService.updateDashboard(appAssets); // Ensure dashboard is updated even on table filter/search
    };

    /**
     * Handles editing an asset.
     * @param {string} id - The ID of the asset to edit.
     */
    const editAsset = (id) => {
        const asset = appAssets.find(a => a.id === id);
        if (asset) {
            UIService.openAssetModal(asset);
        } else {
            UIService.showToast("Ativo não encontrado para edição.", "error");
        }
    };

    /**
     * Displays details of an asset in a modal.
     * @param {string} id - The ID of the asset to show details for.
     */
    const showAssetDetails = (id) => {
        const asset = appAssets.find(a => a.id === id);
        if (!asset) {
            UIService.showToast("Ativo não encontrado.", "error");
            return;
        }

        if (!DOM.assetDetailsModal || !DOM.assetDetailsContent || !DOM.detailsModalTitle) return;

        DOM.detailsModalTitle.textContent = `Detalhes de ${asset.name}`;
        DOM.assetDetailsContent.innerHTML = `
            <p><strong>Nome:</strong> ${asset.name}</p>
            <p><strong>Tipo:</strong> ${asset.itemType}</p>
            <p><strong>Valor:</strong> ${Utils.formatCurrency(asset.value)}</p>
            <p><strong>Data de Aquisição:</strong> ${Utils.formatDate(asset.purchaseDate)}</p>
            <p><strong>Localização:</strong> ${asset.location}</p>
            <p><strong>Status:</strong> ${asset.status}</p>
            <p><strong>Descrição:</strong> ${asset.description || 'N/A'}</p>
            <p><strong>Número de Série:</strong> ${asset.serialNumber || 'N/A'}</p>
            <p><strong>Responsável:</strong> ${asset.responsible || 'N/A'}</p>
            <p><strong>Número da Nota Fiscal:</strong> ${asset.invoiceNumber || 'N/A'}</p>
            <p><strong>Fim da Garantia:</strong> ${asset.warrantyEndDate ? Utils.formatDate(asset.warrantyEndDate) : 'N/A'}</p>
            ${asset.dynamicFields ? Object.entries(asset.dynamicFields).map(([key, value]) => `<p><strong>${key}:</strong> ${value}</p>`).join('') : ''}
            <p class="text-xs text-gray-500 mt-2">Última atualização: ${asset.timestamp ? Utils.formatDate(asset.timestamp) : 'N/A'}</p>
        `;

        // Set data-id on the modal for edit/delete actions
        DOM.assetDetailsModal.dataset.assetId = id;

        // Attach event listeners for edit/delete within details modal
        if (DOM.editDetailsBtn) {
            DOM.editDetailsBtn.onclick = () => {
                UIService.closeModals(); // Close details modal first
                editAsset(id);
            };
        }
        if (DOM.deleteDetailsBtn) {
            DOM.deleteDetailsBtn.onclick = () => {
                UIService.closeModals(); // Close details modal first
                deleteAssetAndRefresh(id);
            };
        }

        UIService.toggleVisibility(DOM.assetDetailsModal, true);
    };

    /**
     * Confirms and deletes an asset, then refreshes the view.
     * @param {string} id - The ID of the asset to delete.
     */
    const deleteAssetAndRefresh = (id) => {
        UIService.showMessageBox(
            'Confirmar Exclusão',
            'Tem certeza de que deseja excluir este ativo? Esta ação não pode ser desfeita.',
            [
                {
                    text: 'Cancelar',
                    style: 'app-btn-secondary',
                    onClick: () => UIService.closeMessageBox()
                },
                {
                    text: 'Excluir',
                    style: 'app-btn-danger',
                    onClick: async () => {
                        await AssetService.deleteAsset(id);
                    }
                }
            ]
        );
    };

    /**
     * Initializes all main app event listeners.
     */
    const initEventListeners = () => {
        // Add Asset Button
        if (DOM.addAssetBtn) {
            DOM.addAssetBtn.addEventListener('click', () => UIService.openAssetModal());
        }

        // Asset Form Buttons
        if (DOM.assetForm) {
            DOM.assetForm.addEventListener('submit', AssetService.saveAsset);
        }
        if (DOM.cancelFormBtn) {
            DOM.cancelFormBtn.addEventListener('click', UIService.closeModals);
        }
        if (DOM.closeModalBtn) {
            DOM.closeModalBtn.addEventListener('click', UIService.closeModals);
        }
        if (DOM.closeDetailsModalBtn) {
            DOM.closeDetailsModalBtn.addEventListener('click', UIService.closeModals);
        }
        if (DOM.closeDetailsModalBtnTop) {
            DOM.closeDetailsModalBtnTop.addEventListener('click', UIService.closeModals);
        }

        // Search and Filter
        if (DOM.searchBar) {
            DOM.searchBar.addEventListener('input', (e) => {
                currentSearchTerm = e.target.value;
                currentPage = 1; // Reset page on search
                refreshAssetsView();
            });
        }
        if (DOM.filterType) {
            DOM.filterType.addEventListener('change', (e) => {
                currentFilterType = e.target.value;
                currentPage = 1; // Reset page on filter change
                refreshAssetsView();
            });
        }
        if (DOM.filterLocation) {
            DOM.filterLocation.addEventListener('change', (e) => {
                currentFilterLocation = e.target.value;
                currentPage = 1; // Reset page on filter change
                refreshAssetsView();
            });
        }

        // Pagination
        if (DOM.prevPageBtn) {
            DOM.prevPageBtn.addEventListener('click', () => {
                if (currentPage > 1) {
                    currentPage--;
                    refreshAssetsView();
                }
            });
        }
        if (DOM.nextPageBtn) {
            DOM.nextPageBtn.addEventListener('click', () => {
                const totalPages = Math.ceil(appAssets.filter(asset => { // Re-filter to get actual total pages for current search/filters
                    const matchesSearch = currentSearchTerm ?
                        asset.name.toLowerCase().includes(currentSearchTerm.toLowerCase()) ||
                        (asset.itemType && asset.itemType.toLowerCase().includes(currentSearchTerm.toLowerCase())) ||
                        (asset.location && asset.location.toLowerCase().includes(currentSearchTerm.toLowerCase())) : true;
                    const matchesType = currentFilterType ? asset.itemType === currentFilterType : true;
                    const matchesLocation = currentFilterLocation ? asset.location === currentFilterLocation : true;
                    return matchesSearch && matchesType && matchesLocation;
                }).length / assetsPerPage);

                if (currentPage < totalPages) {
                    currentPage++;
                    refreshAssetsView();
                }
            });
        }

        // Toggle Dashboard button
        if (DOM.toggleDashboardBtn) {
            DOM.toggleDashboardBtn.addEventListener('click', () => {
                UIService.toggleDashboardLayout(); // Call the UI Service method directly
            });
        }

        // Listener for the "Add Dynamic Field" button in the asset modal
        if (DOM.addDynamicFieldBtn) {
            DOM.addDynamicFieldBtn.addEventListener('click', () => {
                UIService.createDynamicFieldInput(); // Creates an empty field for the user to fill name and value
            });
        }
    };

    /**
     * Initializes application content (fetches assets, sets up listeners for app elements).
     * This is called AFTER successful authentication and company selection.
     */
    const initAppContent = async () => {
        try {
            await AssetService.fetchAllAssets();
            initEventListeners(); // Set up other listeners
            // The initial state of the dashboard/table is controlled by CSS 'hidden' and then JS toggles.
            // If you want it to always start on table view by default.
            // No need to pass 'isDashboardVisible' here anymore, UIService.toggleDashboardLayout manages it.
            UIService.toggleDashboardLayout(); // Call once to set initial state to table view (assuming default is false)
        } catch (error) {
            console.error("Error initializing app content:", error);
            UIService.showToast("Falha ao carregar conteúdo do aplicativo.", "error");
        }
    };

    /**
     * Initializes the entire application.
     */
    const init = async () => {
        AuthManagement.setupAuthEventListeners(); // Setup auth form listeners early
        AuthManagement.setupAuthListener(); // Start listening for auth state changes
        // initEventListeners and renderApp will be called by AuthManagement.onAuthStateChanged
        // once a user is authenticated and the app screen is visible.
    };

    // Public API for the App module
    return {
        init,
        renderApp: UIService.updateAssetsAndRender, // Expose for re-rendering from other parts (e.g., after DB ops)
        editAsset,
        showAssetDetails,
        deleteAssetAndRefresh,
        initAppContent // Expose initAppContent
    };
})();

// --- 7. Validation Service (NEW MODULE) ---
const ValidationService = (() => {
    /**
     * Mostra uma mensagem de erro abaixo de um campo e aplica estilo de erro.
     * @param {HTMLElement} inputElement - O elemento input/select.
     * @param {string} message - A mensagem de erro.
     */
    const showValidationError = (inputElement, message) => {
        if (!inputElement) return;
        inputElement.classList.add('border-red-500', 'ring-red-200'); // Adiciona borda vermelha
        let errorMessageElement = inputElement.nextElementSibling;
        if (!errorMessageElement || !errorMessageElement.classList.contains('error-message')) {
            errorMessageElement = document.createElement('p');
            errorMessageElement.className = 'error-message';
            inputElement.parentNode.insertBefore(errorMessageElement, inputElement.nextElementSibling);
        }
        errorMessageElement.textContent = message;
    };

    /**
     * Limpa todas as mensagens de erro e estilos de validação de um formulário.
     * @param {HTMLFormElement} formElement - O formulário a ser limpo.
     */
    const clearValidationErrors = (formElement) => {
        if (!formElement) return;
        formElement.querySelectorAll('.app-input, .app-select').forEach(input => {
            input.classList.remove('border-red-500', 'ring-red-200');
            const errorMessageElement = input.nextElementSibling;
            if (errorMessageElement && errorMessageElement.classList.contains('error-message')) {
                errorMessageElement.remove();
            }
        });
    };

    /**
     * Valida os dados do formulário de ativos.
     * @param {Object} formData - Os dados do formulário a serem validados.
     * @returns {boolean} True se a validação for bem-sucedida, false caso contrário.
     */
    const validateAssetForm = (formData) => {
        let isValid = true;

        if (!formData.name || formData.name.length < 3) {
            showValidationError(DOM.name, 'O nome do ativo é obrigatório e deve ter pelo menos 3 caracteres.');
            isValid = false;
        }
        if (!formData.itemType) {
            showValidationError(DOM.itemTypeSelect, 'Selecione um tipo de ativo.');
            isValid = false;
        }
        if (isNaN(formData.value) || formData.value <= 0) {
            showValidationError(DOM.value, 'O valor deve ser um número positivo.');
            isValid = false;
        }
        if (!formData.purchaseDate) {
            showValidationError(DOM.purchaseDate, 'A data de aquisição é obrigatória.');
            isValid = false;
        } else {
            const purchaseDateObj = new Date(formData.purchaseDate.toDate());
            if (purchaseDateObj > new Date()) {
                showValidationError(DOM.purchaseDate, 'A data de aquisição não pode ser futura.');
                isValid = false;
            }
        }
        if (!formData.location || formData.location.length < 2) {
            showValidationError(DOM.location, 'A localização é obrigatória e deve ter pelo menos 2 caracteres.');
            isValid = false;
        }
        if (!formData.status) {
            showValidationError(DOM.status, 'Selecione um status.');
            isValid = false;
        }

        // Example optional validation for new fields:
        // if (formData.serialNumber && formData.serialNumber.length < 5) {
        //     showValidationError(DOM.serialNumber, 'Número de série deve ter pelo menos 5 caracteres.');
        //     isValid = false;
        // }

        return isValid;
    };

    return {
        showValidationError,
        clearValidationErrors,
        validateAssetForm
    };
})();

// --- 8. Initialize Application on Window Load ---
window.onload = App.init;
// --- 9. Register Service Worker for PWA ---
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js')
      .then(reg => console.log('✅ Service Worker registrado!', reg))
      .catch(err => console.error('❌ Erro ao registrar Service Worker:', err));
  });
}
