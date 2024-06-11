console.log('Running')
const deleteForm = document.querySelector("button");

deleteForm.addEventListener("click", (event)=>{
  event.preventDefault();

  console.log("Button clicked")

  console.log(deleteForm.name)
  fetch('/items/' + deleteForm.name, {
    method: "DELETE",
    headers: {"Content-type": "application/json; charset=UTF-8"}
  })
  .then(()=>{
    window.location.href = "/items/";
  })
})
function openUrl()
  {
    window.location.replace("items/:name")
  }


const formation = document.querySelector("#update")
const updateForm = document.querySelector("#updateButton");

updateForm.addEventListener("click", (event)=>{
  event.preventDefault();

  const itemData = new FormData(formation)
  const reqBody = Object.fromEntries(itemData)

  fetch('/items/' + updateForm.name, {
    method: "PATCH",  
    body: JSON.stringify(reqBody),
    headers: {"Content-type": "application/json; charset=UTF-8"}
  })
  .then(()=>{
    window.location.href = "/items/";
  })
})
function openUrl()
  {
    window.location.replace("items/:name")
  }