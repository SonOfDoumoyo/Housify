let viewPass = document.querySelectorAll('.password-container')


console.log(viewPass)

let viewing = false
function viewPassword(index){
    
    viewing = !viewing
    console.log(viewPass[index])
    let textInput = viewPass[index].firstElementChild.nextElementSibling
    if(viewing){
        textInput.type = 'text'
    }
    else{
        textInput.type = 'password'
    }
}

function displayErrorMessage(textInput,message){
    textInput.parentElement.classList.remove('success')
    textInput.parentElement.classList.add('error')
    let errorMessage = textInput.parentElement.nextElementSibling
    errorMessage.textContent = message
    errorMessage.classList.add('show')
}

function displaySuccess(textInput){
    let errorMessage = textInput.parentElement.nextElementSibling
    textInput.parentElement.classList.remove('error')
    textInput.parentElement.classList.add('success')
    errorMessage.classList.remove('show')
}

function checkValidity(e){
    let textInput = e.target
    console.log(textInput)
    if(textInput.value.length < 8){
        displayErrorMessage(textInput,'Password must be above 8 characters')
    }
    else if (!/[A-Z]+/.test(textInput.value)){
        displayErrorMessage(textInput,'Password Must contain capital letters')
    }
    else if(!/\W+/.test(textInput.value)){
        displayErrorMessage(textInput,'Password must contain one or more special characters')
    }
    else if(!/\d+/.test(textInput.value)){
        displayErrorMessage(textInput,'Password must contain a number')
    }
    else{
        displaySuccess(textInput)
    }

}

function checkMatch(new_password,e){
    let textInput = e.target
    if(textInput.value !== new_password.value){
        displayErrorMessage(textInput,"Passwords don't match")
    }
    else{
        displaySuccess(textInput)
    }

}

const new_password = viewPass[0].lastElementChild

viewPass[0].firstElementChild.addEventListener('click',()=>viewPassword(0))
viewPass[1].firstElementChild.addEventListener('click',()=>viewPassword(1))
new_password.addEventListener('input',(e)=>checkValidity(e))
viewPass[1].lastElementChild.addEventListener('input',(e)=>checkMatch(new_password,e))