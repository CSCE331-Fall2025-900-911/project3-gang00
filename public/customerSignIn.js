const form = document.getElementById('signin-form');
form.addEventListener('submit', e => {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    if (form.checkValidity()) {
        fetch("/customer-sign-in/attempt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
        })
        .then(res => res.json())
        .then(data => {
        if (data.success) {
            window.location.href = "/"; // GET request to home page
        } else {
            alert("Login failed: " + data.message);
        }
        });
    } else {
        form.reportValidity();
    }
});
const googleButton = document.getElementById('googleButton');
googleButton.addEventListener('click', e => {
    e.preventDefault();

    console.log("Clicked sign in with google")

    // attempt to authorize with google endpoint
    window.location.href = "/google/auth";
});
