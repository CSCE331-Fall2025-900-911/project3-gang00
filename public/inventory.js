window.addEventListener("load", () => {
  const navHeight = document.getElementById("navbar").offsetHeight;
  document.getElementById("back-btn").style.top = navHeight + "px";
});

const rows = document.querySelectorAll("#myTable tr");
rows.forEach(row => {
  row.addEventListener("click", () => {
    rows.forEach(r => r.classList.remove("selected")); // clear previous
    row.classList.add("selected");                     // highlight clicked
  });
});

let id = null;
function openUpdateBox() {
    const selectedRow = document.querySelector("#myTable tr.selected");
    if (selectedRow) {
        const cells = [...selectedRow.querySelectorAll("td")].map(td => td.textContent);
        id = cells[0];
        document.getElementById('name-update').value = cells[1];
        document.getElementById('quantity-update').value = cells[2];
        document.getElementById('unit-update').value = cells[3];
        document.getElementById('update-modal').style.display = 'flex';
    } else {
        alert("You must select a row of the table before editing!")
    }
}

function closeUpdateBox() {
    document.getElementById('update-modal').style.display = 'none';
}

async function updateIngredient() {
    try {
        const name = document.getElementById('name-update').value;
        const quantity = document.getElementById('quantity-update').value;
        const unit = document.getElementById('unit-update').value;
        
        fetch('/manager/inventory/update', {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ id: id, name: name, quantity: quantity, unit: unit })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                closeUpdateBox();
                window.location.href = "/manager/inventory";
            } else {
                alert("Problem updating inventory: " + data.message);
            }
        })
    } catch (err) {
        console.log(err);
    }
}

function openAddBox() {
    document.getElementById('add-modal').style.display = 'flex';
}

function closeAddBox() {
    document.getElementById('add-modal').style.display = 'none';
}

async function addIngredient() {
    try {
        const name = document.getElementById('name-add').value;
        const quantity = document.getElementById('quantity-add').value;
        const unit = document.getElementById('unit-add').value;
        
        fetch('/manager/inventory/add', {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ name: name, quantity: quantity, unit: unit })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                closeAddBox();
                window.location.href = "/manager/inventory";
            } else {
                alert("Problem adding to inventory: " + data.message);
            }
        })
    } catch (err) {
        console.log(err);
    }
}

const ctx = document.getElementById('inventoryChart').getContext('2d');
const myChart = new Chart(ctx, {
    type: 'bar',
    data: {
        labels: labels,
        datasets: [{
            label: 'Ingredient Quantity',
            data: values,
            borderWidth: 1,
            backgroundColor: '#ffbbbb'
            
        }]
    },
    options: {
        scales: {
            y: {
                beginAtZero: true,
                min: 0
            }
        },
        responsive: false,
        maitainAspectRatio: false
    }
});