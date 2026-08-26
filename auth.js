const loginForm = document.getElementById("loginForm");

const loginMessage = document.getElementById("loginMessage");

const loginText = document.getElementById("loginText");

const loginLoader = document.getElementById("loginLoader");

const togglePassword = document.getElementById("togglePassword");

const passwordInput = document.getElementById("password");


togglePassword.addEventListener("click", () => {

  if (passwordInput.type === "password") {

    passwordInput.type = "text";

    togglePassword.textContent = "Hide";

  } else {

    passwordInput.type = "password";

    togglePassword.textContent = "Show";

  }

});


async function checkExistingSession() {

  const {
    data: { session }
  } = await supabaseClient.auth.getSession();

  if (session) {

    window.location.href = "dashboard.html";

  }

}


checkExistingSession();


loginForm.addEventListener("submit", async (event) => {

  event.preventDefault();

  const email =
    document.getElementById("email").value.trim();

  const password =
    document.getElementById("password").value;


  loginMessage.textContent = "";

  loginText.classList.add("hidden");

  loginLoader.classList.remove("hidden");


  const { error } =
    await supabaseClient.auth.signInWithPassword({
      email,
      password
    });


  if (error) {

    loginMessage.textContent =
      error.message;

    loginMessage.className =
      "message error";

    loginText.classList.remove("hidden");

    loginLoader.classList.add("hidden");

    return;

  }


  window.location.href = "dashboard.html";

});
