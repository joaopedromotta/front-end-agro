const API_BASE_URL = "https://agro-guard-euue.onrender.com/v1";

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("formulario-login");
    const errorMessage = document.getElementById("login-error");
    const submitButton = document.getElementById("botao-entrar");

    form.addEventListener("submit", async event => {
        event.preventDefault();
        errorMessage.hidden = true;
        errorMessage.textContent = "";
        submitButton.disabled = true;
        submitButton.textContent = "Entrando...";

        const formData = new FormData(form);

        try {
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: formData.get("email"),
                    password: formData.get("password")
                })
            });
            const responseText = await response.text();
            let result = {};

            if (responseText) {
                try {
                    result = JSON.parse(responseText);
                } catch {
                    throw new Error("O servidor retornou uma resposta inválida.");
                }
            }

            if (!response.ok) {
                const message = response.status === 401
                    ? "E-mail ou senha inválidos. Verifique seus dados e tente novamente."
                    : result.message || `Não foi possível entrar (HTTP ${response.status}).`;
                throw new Error(message);
            }

            if (!result.token || !result.userId) {
                throw new Error("A resposta do servidor não contém os dados de acesso esperados.");
            }

            sessionStorage.setItem("agroGuardToken", result.token);
            sessionStorage.setItem("agroGuardUserId", String(result.userId));
            sessionStorage.setItem("agroGuardName", result.name || "");
            window.location.assign("./index.html");
        } catch (error) {
            errorMessage.textContent = error instanceof TypeError
                ? "Não foi possível conectar ao servidor. Verifique se a API está em execução."
                : error.message;
            errorMessage.hidden = false;
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = "Entrar";
        }
    });
});
