function closeRemoveBox() {
    document.getElementById('remove-modal').style.display = 'none';
}

let id = null;
function openRemoveBox() {
    const selectedRow = document.querySelector("#myTable tr.selected");
    if (selectedRow) {
        const cells = [...selectedRow.querySelectorAll("td")].map(td => td.textContent);
        id = cells[0]; // save for later if manager does proceed to delete the account


        document.getElementById('modal-id').textContent = 'ID: ' + cells[0];
        document.getElementById('modal-name').textContent = 'Name: ' + cells[1];
        document.getElementById('modal-role').textContent = 'Role: ' + cells[2];
        document.getElementById('modal-username').textContent = 'Username: ' + cells[4];

        document.getElementById('remove-modal').style.display = 'flex';
    } else {    
        alert("You must select a row of the table to remove!")
    }
}

async function removeEmployee() {
    try {
        fetch('/manager/employees/remove', {
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
                window.location.href = "/manager/employees";
            } else {
                alert("Problem removing employee: " + data.message);
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