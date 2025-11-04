const form = document.getElementById('signin-form');
form.addEventListener('submit', e => {
    e.preventDefault();

    const fullname = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    if (form.checkValidity()) {
        fetch("/customer-sign-up/attempt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullname, email, password })
        })
        .then(res => res.json())
        .then(data => {
        if (data.success) {
            alert("Account successfully created!");
        } else {
            if (data.message != null) {
                alert("Account creation failed: " + data.message);
            } else {
                alert("Account creation failed");
            }
        }
        });
    } else {
        form.reportValidity();
    }
});
const googleButton = document.getElementById('googleButton');
googleButton.addEventListener('click', e => {
    e.preventDefault();

    // attempt to authorize with google endpoint
    fetch("/google/auth", { method: "GET" });
});