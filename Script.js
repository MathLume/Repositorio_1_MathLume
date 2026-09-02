// 1. Selecionar as Telas
const startScreen = document.getElementById('start-screen');
const loginScreen = document.getElementById('login-screen');
const mainScreen = document.getElementById('main-screen');

// 2. Selecionar os Botões de Ação
const btnIniciar = document.getElementById('btn-iniciar');
const btnLoginSubmit = document.getElementById('btn-login-submit');
const btnLogout = document.getElementById('btn-logout');

// 3. Função Genérica para Alternar Telas
function showScreen(screenToShow) {
    // Esconde todas
    startScreen.style.display = 'none';
    loginScreen.style.display = 'none';
    mainScreen.style.display = 'none';

    // Mostra apenas a desejada definindo display como 'flex'
    screenToShow.style.display = 'flex';
}

// 4. Configuração dos Eventos de Clique

// Da Tela Inicial para a Tela de Login
if (btnIniciar) {
    btnIniciar.addEventListener('click', () => {
        showScreen(loginScreen);
    });
}

// Da Tela de Login para a Tela Principal (ao clicar em CONFIRMAR)
if (btnLoginSubmit) {
    btnLoginSubmit.addEventListener('click', () => {
        // Aqui você pode colocar futuramente validações de usuário e senha
        showScreen(mainScreen);
    });
}

// Da Tela Principal para a Tela Inicial (ao clicar em Sair)
if (btnLogout) {
    btnLogout.addEventListener('click', () => {
        showScreen(startScreen);
    });
}

// 5. Inicialização: Garante que o aplicativo comece na Tela Inicial
showScreen(startScreen);
