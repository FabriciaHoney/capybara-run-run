// Inicializa o contexto
kaboom();
document.documentElement.style.overflow = 'hidden';

// Carrega os sprites


loadSprite("tabelinha", "sprites/tabelinha.png"); // Substitua pelo caminho correto da imagem
loadSprite("banherinha", "sprites/banherinha.png");
loadSprite("ups", "sprites/ups.png");
loadSprite("subfundo", "sprites/subfundo.png");
loadSprite("fundo", "sprites/fundo2.png");
loadSprite("chao2", "sprites/chao2.png");
loadSprite("dino", "sprites/SLICY1.png", {
    sliceX: 4,
    sliceY: 1,
    anims: {
        run: {
            from: 1,
            to: 2,
            loop: true,
            speed: 7
        },
        pulo: 3
    }
});
loadSprite("runrun", "sprites/runrun.png"); // Carregar o sprite da imagem de pausa

// Função utilitária para o efeito de girar
function spin(speed = 1200) {
    let girando = false;
    return {
        require: ["rotate"],
        update() {
            if (!girando) return;
            this.angle -= speed * dt();
            if (this.angle <= -360) {
                girando = false;
                this.angle = 0;
            }
        },
        spin() {
            girando = true;
        }
    };
}

// Cena do jogo
scene("game", () => {
    let pausado = false; // Variável para rastrear o estado de pausa
    let intervaloGeracaoObstaculos; // Variável para controlar o intervalo de geração de obstáculos
    let estadoJogador = {}; // Objeto para armazenar o estado do jogador quando pausado
    let obstaculos = []; // Array para rastrear os obstáculos
    let telaPausa; // Variável para armazenar a imagem de pausa
    const DISTANCIA_MINIMA = 150; // Distância mínima entre árvores
    let ultimaPosicaoX = width(); // Inicia a última posição X fora da tela


    //===================================
    let desfoque;

    function alternarPausa() {
        pausado = !pausado;

        if (pausado) {
            // Pausar a geração de obstáculos
            clearInterval(intervaloGeracaoObstaculos);

  

            // Salvar o estado do jogador
            estadoJogador = {
                pos: { x: player.pos.x, y: player.pos.y },
                vel: { x: player.vel.x, y: player.vel.y },
                animacao: player.currentAnim
            };

            // Pausar jogador e obstáculos
            player.paused = true;
            obstaculos.forEach(obstaculo => obstaculo.paused = true);

            // Remover objetos antigos se existirem
            if (telaPausa) {
                telaPausa.destroy();
                telaPausa = null;
            }
            if (desfoque) {
                desfoque.destroy();
                desfoque = null;
            }

            // Exibir a imagem de pausa com animação "easeInOutBack"
            telaPausa = add([
                sprite("runrun"),
                scale(0.7),
                anchor("center"),
                pos(width() / 2, - 300), // Começa fora da tela (topo)
                z(10)
            ]);

            // Adicionar o efeito de desfoque
            desfoque = add([
                rect(width(), height()), // Cobre toda a tela
                pos(0, 0),
                color(0, 0, 0), // Cor preta, mas pode ser ajustada
                opacity(0), // Inicialmente invisível
                z(9) // Fica atrás da imagem runrun
            ]);

            // Animação para a imagem e o desfoque aparecerem
            tween(
                telaPausa.pos.y,
                height() / 2, // Posição central
                1, // Duração de 1 segundo
                (value) => telaPausa.pos.y = value,
                easings.easeInOutBack
            );

            tween(
                desfoque.opacity,
                0.5, // Opacidade máxima
                1, // Duração de 1 segundo
                (value) => desfoque.opacity = value
            );
        } else {
            // Retomar a geração de obstáculos
            iniciarGeracaoObstaculos();

            // Restaurar o estado do jogador
            if (estadoJogador) {
                player.pos = vec2(estadoJogador.pos.x, estadoJogador.pos.y);
                player.vel = vec2(estadoJogador.vel.x, estadoJogador.vel.y);
                player.play(estadoJogador.animacao || "run");
            }

            // Retomar jogador e obstáculos
            player.paused = false;
            obstaculos.forEach(obstaculo => obstaculo.paused = false);

            // Animação para a imagem e o desfoque desaparecerem
            if (telaPausa) {
                tween(
                    telaPausa.pos.y,
                    height() - 1000, // Faz com que a imagem suba para fora da tela (acima)
                    1, // Duração de 1 segundo
                    (value) => telaPausa.pos.y = value,
                    easings.easeInOutBack,
                    () => {
                        // Limpeza após a animação de saída
                        if (telaPausa) {
                            telaPausa.destroy();
                            telaPausa = null;
                        }
                        if (desfoque) {
                            desfoque.destroy();
                            desfoque = null;
                        }
                    }
                );

                tween(
                    desfoque.opacity,
                    0, // Opacidade mínima
                    1, // Duração de 1 segundo
                    (value) => desfoque.opacity = value
                );
            }




            //===================================


        }
    }

    // Entrada do teclado para pausar e retomar o jogo
    onKeyPress("p", alternarPausa);

    const ALTURA_DO_CHAO = 48;
    const FORCA_DO_PULO = 700;
    const VELOCIDADE = 480;
    const VELOCIDADE_SCROLL_FUNDO = 100;
    const VELOCIDADE_SCROLL_CHAO = 350;

    // Configurar a gravidade
    setGravity(1600);

    // Configuração do fundo
    const fundo1 = add([sprite("fundo", { width: width(), height: height() }), pos(0, 0), z(-2), "fundo"]);
    const fundo2 = add([sprite("fundo", { width: width(), height: height() }), pos(width(), 0), z(-2), "fundo"]);

    // Função para mover o fundo
    function moverFundo() {
        if (pausado) return; // Pular a atualização se estiver pausado

        fundo1.move(-VELOCIDADE_SCROLL_FUNDO, 0);
        fundo2.move(-VELOCIDADE_SCROLL_FUNDO, 0);

        if (fundo1.pos.x <= -width()) {
            fundo1.pos.x = fundo2.pos.x + width();
        }
        if (fundo2.pos.x <= -width()) {
            fundo2.pos.x = fundo1.pos.x + width();
        }
    }

    // Configuração do chão
    const chao2_1 = add([sprite("chao2", { width: width(), height: ALTURA_DO_CHAO }), pos(0, height() - ALTURA_DO_CHAO), z(1), "chao2"]);
    const chao2_2 = add([sprite("chao2", { width: width(), height: ALTURA_DO_CHAO }), pos(width(), height() - ALTURA_DO_CHAO), z(1), "chao2"]);

    // Função para mover o chão
    function moverChao2() {
        if (pausado) return; // Pular a atualização se estiver pausado

        chao2_1.move(-VELOCIDADE_SCROLL_CHAO, 0);
        chao2_2.move(-VELOCIDADE_SCROLL_CHAO, 0);

        if (chao2_1.pos.x <= -width()) {
            chao2_1.pos.x = chao2_2.pos.x + width();
        }
        if (chao2_2.pos.x <= -width()) {
            chao2_2.pos.x = chao2_1.pos.x + width();
        }
    }

    // Função de atualização para mover fundo e chão
    onUpdate(() => {
        if (!pausado) {
            moverFundo();
            moverChao2();
        }
    });

    // Configuração do jogador
    const player = add([sprite("dino"), area(), anchor("center"), pos(180, 450), body({ jumpForce: FORCA_DO_PULO }), doubleJump(), rotate(0), spin(), scale(0.3)]);
    player.play("run");

    // Função de pulo
    function pular() {
        if (player.isGrounded() && !pausado) {
            player.jump(FORCA_DO_PULO);
            player.play("pulo");
        }
    }

    // Lidar com a entrada de pulo
    onKeyPress("space", pular);
    onClick(pular);

    // Lidar com o pulo duplo
    player.onDoubleJump(() => {
        if (!pausado) player.spin();
    });
    onKeyPress("space", () => {
        if (!pausado) player.doubleJump();
    });

    // Configuração do chão
    add([rect(width(), ALTURA_DO_CHAO), outline(4), pos(0, height()), anchor("botleft"), area(), body({ isStatic: true })]);

    // Atualizar animação do jogador com base no estado
    player.onGround(() => {
        if (!isKeyDown("space") && !pausado) {
            player.play("run");
        } else {
            player.play("pulo");
        }
    });

    function gerarArvore() {
        if (pausado) return; // Pular a geração se pausado

        // Calcular a nova posição X para a árvore
        const novaPosicaoX = ultimaPosicaoX + DISTANCIA_MINIMA + rand(5, 15); // Adiciona uma variação aleatória

        // Gerar a árvore com a imagem 'banherinha'
        const arvore = add([sprite("banherinha"), // Usar o sprite da imagem
        area({ scale: 0.5 }),
        scale(0.4),
        pos(novaPosicaoX, height() - ALTURA_DO_CHAO), // Posição da árvore       
        anchor("bot"), // Âncora na parte inferior esquerda
        move(LEFT, VELOCIDADE),// Movimento para a esquerda
     
            "tree" // Tag para identificação
        ]);
        // Atualizar a última posição X para a próxima árvore
        ultimaPosicaoX = novaPosicaoX;
        obstaculos.push(arvore); // Adicionar árvore ao array de obstáculos
    }

    // Iniciar a geração de árvores em intervalos
    function iniciarGeracaoObstaculos() {
        intervaloGeracaoObstaculos = setInterval(() => {
            gerarArvore();
        }, rand(2500, 3500)); // Ajuste este intervalo conforme necessário
    }

    iniciarGeracaoObstaculos();

    // Lidar com colisão
    player.onCollide("tree", () => {
        if (!pausado) {
            go("lose", score);
            addKaboom(player.pos);
        }
    });

    let score = 0;
    let scoreLabel; // Variável para armazenar a referência ao texto
    
    // Carrega a fonte personalizada "ExtraDays"
    loadFont("ExtraDays", "sprites/lemonmilky.ttf");
    
    // Tabelinha
    const tabelinha = add([
        sprite("tabelinha"),
        pos(24, 1), // Ajuste a posição conforme necessário
        scale(0.3), // Ajuste a escala conforme necessário
        z(8) // Define a camada para garantir que esteja atrás do texto
    ]);
    
    // Função para criar ou atualizar o texto da pontuação
    function atualizarPontuacao() {
        // Remove o texto antigo se ele existir
        if (scoreLabel) {
            destroy(scoreLabel);
        }
    
        // Adiciona o texto principal com a fonte personalizada e cor laranja
        scoreLabel = add([
            text(score, {
                size: 28, // Ajuste o tamanho conforme necessário
                font: "ExtraDays" // Fonte personalizada
            }),
            pos(175, 35), // Posição do texto
            color(255, 255, 255), // Cor laranja
            z(10) // Camada para garantir que o texto fique sobre a imagem
        ]);
    }
    
    // Inicializa o texto com a pontuação inicial
    atualizarPontuacao();
    
    // Atualiza a pontuação a cada frame
    onUpdate(() => {
        if (!pausado) {
            score++;
            atualizarPontuacao(); // Atualiza a pontuação
        }
    });
    









});



// Cena de perda
scene("lose", (score) => {
    // Exibir a imagem "ups" no centro da tela
    add([
        sprite("subfundo"),
        pos(width() / 2, height() / 2), // Centralizado
        scale(3), // Ajuste a escala conforme necessário
        anchor("center"),
    z(25),])

        
    add([
        sprite("ups"),
        pos(width() / 2, height() / 2), // Centralizado
        scale(1), // Ajuste a escala conforme necessário
        anchor("center"),
        z(26),
    ]);

    // Exibir o score no canto superior direito
    add([
        text(score, {
            size: 60, // Ajuste o tamanho conforme necessário
        }),
        pos(width() - 100, 30), // Posição no canto superior direito
        anchor("topright"),
        z(27)
    ]);

    // Pressionar "enter" ou clicar para reiniciar o jogo
    onKeyPress("enter", () => go("game"));
    onClick(() => go("game"));
});


// Iniciar a cena do jogo
go("game");