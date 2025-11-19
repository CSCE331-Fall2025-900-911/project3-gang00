function openRestockBox() {
    document.getElementById('restock-modal').style.display = 'flex';
}

function closeRestockBox() {
    document.getElementById('restock-modal').style.display = 'none';
}

async function restockIngredients() {
    try {
        fetch('/manager/restock/update', {
            method: "POST"
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                closeRestockBox();
                window.location.href = "/manager/restock";
            } else {
                alert("Problem restocking inventory: " + data.message);
            }
        })
    } catch (err) {
        console.log(err);
    }
}