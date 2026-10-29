//Reproduz o efeito sonoro dos cliques no site.
function somBotao() {
    let audio = document.getElementById("botoes");
    audio.currentTime = 0.23;
    audio.play();
}
//Executa a contagem regressiva antes do início do minigame.
function contagemR() {
    stopLob();
    let audio = document.getElementById("contagem");
    audio.currentTime = 0.05;
    audio.play();
    setTimeout(() => {
        audio.pause()
        audio.currentTime = 0;
        temaGamer();
    }, 2500);
}
//Inicia a música de fundo do lobby em loop.
function musicaLobby(){
    let audio = document.getElementById("lobby");
    audio.currentTime = 0.1;
    audio.play();
    audio.loop = true;
}
//Pausa a música de fundo do lobby.
function stopLob(){
    let audio = document.getElementById("lobby");
    audio.pause();
}
//Inicia a música de fundo durante o minigame.
function temaGamer(){
    setTimeout(() => {
       let audio2 = document.getElementById("temaGame");
        audio2.currentTime = 0;
        audio2.volume = 0.3;
        audio2.play();
        audio2.loop = true; 
    }, 2500);
}
//Pausa a música de fundo do minigame.
function stopGame(){
    let audio = document.getElementById("temaGame");
    audio.pause();
}