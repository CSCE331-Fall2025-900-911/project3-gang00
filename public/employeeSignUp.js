const form = document.getElementById('signin-form');
form.addEventListener('submit', e => {
    e.preventDefault();

    const role = form.elements['role'].value;
    const fullname = document.getElementById('name').value;
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    if (form.checkValidity()) {
        // console.log("Name: " + fullname + " Username: " + username + " Password: " + password + " Role: " + role);
        fetch("/employee-sign-up/attempt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullname, role, username, password })
        })
        .then(res => res.json())
        .then(data => {
        if (data.success) {
            // window.location.href = "/employee"; // GET request to employee page
            alert("Account successfully created!")
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
