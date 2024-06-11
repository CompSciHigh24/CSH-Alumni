const createForm = document.querySelector('#hulk')
// const buttonCreate = document.querySelector('#submitThis')

createForm.addEventListener("submit", (e) => {
  e.preventDefault()

  const itemData = new FormData(createForm)
  const reqBody = Object.fromEntries(itemData.entries())

  console.log(reqBody)
  fetch('/profiles', { 
    method: "POST",
    body: JSON.stringify(reqBody),
    headers: {"Content-Type": "application/json; charset=UTF-8"}
   })
   .then(response => response.json())
   .then(json => {
     console.log(json)
     window.location.href = "/profiles"
   })
  .catch(error => console.error('Error', error))
})

  function openUrl()
    {
     // using replace()
      window.location.replace("/profiles/"); 
  }


// FORM JS ON ACCOUNT INFO
(function () {
'use strict'
const forms = document.querySelectorAll('.requires-validation')
Array.from(forms)
  .forEach(function (form) {
    form.addEventListener('submit', function (event) {
      if (!form.checkValidity()) {
        event.preventDefault()
        event.stopPropagation()
      }

      form.classList.add('was-validated')
    }, false)
  })
})
