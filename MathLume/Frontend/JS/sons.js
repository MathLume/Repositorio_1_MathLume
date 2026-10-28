function somBotao() {
    let audio = document.getElementById("botoes");
    audio.currentTime = 0.23;
    audio.play();
}

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

function musicaLobby(){
    let audio = document.getElementById("lobby");
    audio.currentTime = 0.1;
    audio.play();
    audio.loop = true;

}

function stopLob(){
    let audio = document.getElementById("lobby");
    audio.pause();

}

function temaGamer(){
    setTimeout(() => {
       let audio2 = document.getElementById("temaGame");
        audio2.currentTime = 0;
        audio2.play();
        audio2.loop = true; 
    }, 2500);
}

function stopGame(){
    let audio = document.getElementById("temaGame");
    audio.pause();
}

function startLobby(){
    let audio = document.getElementById("lobby");
    audio.play();
}