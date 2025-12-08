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
        .then(async data => {
        if (data.success) {
            // now check that their account had permission
            const nextRes = await fetch('/manager/check-credentials');
            const nextData = await nextRes.json();

            if (nextData.success) {
                window.location.href = '/manager';
            } else {
                alert(data.message);
            }
        } else {
            alert("Login failed: " + data.message);
        }
        });
    } else {
        form.reportValidity();
    }
});
