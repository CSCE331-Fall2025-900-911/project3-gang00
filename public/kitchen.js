let currentOrderId = null;

function openHelpBox() {
    document.getElementById('help-modal').style.display = 'flex';
}

function closeHelpBox() {
    document.getElementById('help-modal').style.display = 'none';
}

function openCompleteBox(order_id) {
    const modal = document.getElementById('complete-modal');
    const title = document.getElementById('complete-modal-title');
    const completeButton = document.getElementById('completeButton');
    const deleteButton = document.getElementById('deleteButton');
 
 
    if (!modal || !title || !completeButton || !deleteButton) {
        console.error("Modal or buttons not found in DOM");
        return;
    }
 
 
    // Show modal and set title
    modal.style.display = 'flex';
    title.textContent = "Order #" + order_id;
 
 
    // COMPLETE handler
    completeButton.onclick = function () {
        fetch("/employee/kitchen/complete-order", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ order_id: order_id })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                window.location.href = "/employee/kitchen";
            } else {
                alert("Failed to complete order: " + (data.message || "Unknown error"));
            }
        })
        .catch(err => {
            console.error("Complete error:", err);
            alert("Error completing order");
        });
    };
 
 
    // DELETE handler — no confirmation box
    deleteButton.onclick = function () {
        fetch("/employee/kitchen/delete-order", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ order_id: order_id })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                window.location.href = "/employee/kitchen";
            } else {
                alert("Failed to delete order: " + (data.message || "Unknown error"));
            }
        })
        .catch(err => {
            console.error("Delete error:", err);
            alert("Error deleting order");
        });
    };
 }
 

function closeCompleteBox() {
    document.getElementById('complete-modal').style.display = 'none';
}