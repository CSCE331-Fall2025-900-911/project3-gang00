const form = document.getElementById('signin-form');
form.addEventListener('submit', e => {
    e.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    if (form.checkValidity()) {
        fetch("/employee-sign-in/attempt", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ username: username, password: password })
        })
        .then(res => res.json())
        .then(data => {
        if (data.success) {
            window.location.href = "/employee"; // GET request to employee page
        } else {
            alert("Login failed: " + data.message);
        }
        });
    } else {
        form.reportValidity();
    }
});
