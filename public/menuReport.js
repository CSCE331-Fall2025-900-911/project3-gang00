let id = null;

let productIngredients = [];

function openAddBox() {
    document.getElementById('add-modal').style.display = 'flex';
    productIngredients = [];
    document.getElementById('ingredientText').innerText = "No ingredients selected.";
}

async function addProduct() {
    try {
        const name = document.getElementById('name-add').value;
        const price = document.getElementById('price-add').value;
        const category = document.getElementById('myDropdown-add').value;
        
        fetch('/manager/menu/add', {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ name: name, price: price, category: category, productIngredients: productIngredients })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                closeAddBox();
                window.location.href = "/manager/menu";
            } else {
                alert("Problem adding item to menu: " + data.message);
            }
        })
    } catch (err) {
        console.log(err);
    }
}

function closeAddBox() {
    document.getElementById('add-modal').style.display = 'none';
    productIngredients = [];
    document.getElementById('ingredientText').innerText = "No ingredients selected.";
}

function openRemoveBox() {
    const selectedRow = document.querySelector("#myTable tr.selected");
    if (selectedRow) {
        const cells = [...selectedRow.querySelectorAll("td")].map(td => td.textContent);
        id = cells[0];
        document.getElementById('modal-id').textContent = 'ID: ' + cells[0];
        document.getElementById('modal-name').textContent = 'Name: ' + cells[1];
        document.getElementById('modal-price').textContent = 'Price: ' + cells[2];
        document.getElementById('modal-category').textContent = 'Category: ' + cells[3];
        document.getElementById('remove-modal').style.display = 'flex';
    } else {    
        alert("You must select a row of the table to remove!")
    }
}

function closeRemoveBox() {
    document.getElementById('remove-modal').style.display = 'none';
}

async function removeProduct() {
    try {
        fetch('/manager/menu/remove', {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ id: id })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                closeRemoveBox();
                window.location.href = "/manager/menu";
            } else {
                alert("Problem removing product: " + data.message);
            }
        });
    } catch (err) {
        console.log(err);
    }
}

const rows = document.querySelectorAll("#myTable tr");
rows.forEach(row => {
  row.addEventListener("click", () => {
    rows.forEach(r => r.classList.remove("selected")); // clear previous
    row.classList.add("selected");                     // highlight clicked
  });
});

async function addProductIngredient() {
    const ingredient = document.getElementById('ingredient_select').value;
    const amount = document.getElementById('amount').value;

    let ingredient_id = 0;

    try {
        const res = await fetch('/manager/getIngredientID', {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ ingredient: ingredient })
        });

        const data = await res.json();
        
        if (data.success) {
            ingredient_id = data.value;
            console.log(ingredient_id);
        } else {
            alert("Problem adding ingredient: " + data.message);
        }
    } catch (err) {
        console.log(err);
    }

    const ingredientString = "Name: " + ingredient + " | Amount: " + amount + "\n";

    console.log(ingredient_id);
    productIngredients.push({ingredient_id, amount});
    if (document.getElementById('ingredientText').innerText === "No ingredients selected.") {
        document.getElementById('ingredientText').innerText = ingredientString;
    } else {
        document.getElementById('ingredientText').innerText = document.getElementById('ingredientText').innerText + ingredientString;
    }
}