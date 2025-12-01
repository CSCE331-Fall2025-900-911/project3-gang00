function openHelpBox() {
    document.getElementById('help-modal').style.display = 'flex';
}

function closeHelpBox() {
    document.getElementById('help-modal').style.display = 'none';
}

function openCompleteBox(order_id) {
    document.getElementById('complete-modal').style.display = 'flex';
    document.getElementById('complete-modal-title').textContent = "Complete Order #" + order_id;

    const completeButton = document.getElementById('completeButton')
    
    if (completeButton) {
        completeButton.addEventListener("click", function() {
            fetch("/employee/kitchen/complete-order", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ order_id })
            })
            .then(res => res.json())
            .then(data => {
            if (data.success) {
                window.location.href = "/employee/kitchen"; // GET request to home page
            } else {
                alert("Failed to complete order: " + data.message);
            }
            });
        });
    }
}

function closeCompleteBox() {
    document.getElementById('complete-modal').style.display = 'none';
}