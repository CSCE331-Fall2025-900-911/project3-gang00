function goToInventory() {
    window.location.href = "/manager/inventory";
}

function goToRestock() {
    window.location.href = "/manager/restock";
}

function goToEmployees() {
    window.location.href = "/manager/employees";
}

function goToMenu() {
    window.location.href = "/manager/menu";
}

function toggleAccountDropDown() {
    const dropdown = document.getElementById('account-dropdown');
    const isVisible = dropdown.style.display === 'block';
    dropdown.style.display = isVisible ? 'none' : 'block';
}

// Hide dropdown when clicking outside
document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('account-dropdown');
    const trigger = e.target.closest('a[onclick="toggleAccountDropDown()"]');
    if (!trigger && !e.target.closest('#account-dropdown')) {
        dropdown.style.display = 'none';
    }
});

function openLogoutModal() {
    document.getElementById('logout-modal').style.display = 'flex';
}

function closeLogoutModal() {
    document.getElementById('logout-modal').style.display = 'none';
}

async function confirmLogout() {
    //window.location.href = '/employee/logout';
    const res = await fetch('/employee/logout', {method: 'GET'});
    if (res.redirected) {
        window.location.href = res.url;
    }
}