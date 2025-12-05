const form = document.getElementById('signin-form');
form.addEventListener('submit', e => {
    e.preventDefault();

    const role = form.elements['role'].value;
    if (form.checkValidity()) {
        switch (role) {
            case "Customer":
                window.location.href = "/kiosk";
                break;
            case "Employee":
                window.location.href = "/employee";
                break;
            case "Manager":
                window.location.href = "/manager";
                break;
            default:
                break;
        }
    } else {
        form.reportValidity();
    }
});
