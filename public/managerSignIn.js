const form = document.getElementById('signin-form');
form.addEventListener('submit', e => {
    e.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    if (form.checkValidity()) {
        console.log("Username: " + username + " Password: " + password);
    } else {
        form.reportValidity();
    }
});
