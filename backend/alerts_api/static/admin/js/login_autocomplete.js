/* Jazzmin admin login fields ship without autocomplete=; browsers warn and may skip autofill. */
(function () {
  function apply() {
    var username = document.querySelector('input[name="username"]');
    var password = document.querySelector('input[name="password"]');
    if (username && !username.getAttribute("autocomplete")) {
      username.setAttribute("autocomplete", "username");
      if (!username.id) username.id = "id_username";
    }
    if (password && !password.getAttribute("autocomplete")) {
      password.setAttribute("autocomplete", "current-password");
      if (!password.id) password.id = "id_password";
    }
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", apply);
  } else {
    apply();
  }
})();
