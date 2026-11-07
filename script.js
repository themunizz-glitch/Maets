document.addEventListener('DOMContentLoaded', () => {
    const chave = 'maets_carrinho';
    const chaveBiblioteca = 'maets_biblioteca';
    const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
    const jogos = Array.from(document.querySelectorAll('.jogo'));
    const catalogo = new Map();

    jogos.forEach((cartao) => {
        const nome = cartao.querySelector('strong')?.textContent.trim();
        const precoTexto = cartao.querySelector('span')?.textContent.trim() || '';
        if (!nome) return;
        const gratuito = /gratuito/i.test(precoTexto);
        const preco = gratuito ? 0 : Number(precoTexto.replace(/[^\d,]/g, '').replace(',', '.'));
        if (!Number.isFinite(preco)) return;

        const imagem = cartao.querySelector('img')?.getAttribute('src') || '';
        catalogo.set(nome, { nome, preco, imagem });
        const botao = document.createElement('button');
        botao.type = 'button';
        botao.className = 'adicionar-carrinho';
        botao.textContent = gratuito ? 'Adicionar grátis' : 'Adicionar ao carrinho';
        botao.setAttribute('aria-label', `Adicionar ${nome} ao carrinho`);
        botao.addEventListener('click', (evento) => {
            evento.preventDefault();
            adicionar(nome);
        });
        cartao.appendChild(botao);
    });

    function carregar() {
        try {
            const salvo = JSON.parse(localStorage.getItem(chave) || '[]');
            if (!Array.isArray(salvo)) return [];
            return [...new Set(salvo.filter(nome => typeof nome === 'string' && catalogo.has(nome)))];
        } catch {
            return [];
        }
    }

    let carrinho = carregar();
    function carregarBiblioteca() {
        try {
            const dados = JSON.parse(localStorage.getItem(chaveBiblioteca) || '[]');
            return Array.isArray(dados) ? [...new Set(dados.filter(nome => typeof nome === 'string' && catalogo.has(nome)))] : [];
        } catch { return []; }
    }
    let biblioteca = carregarBiblioteca();
    carrinho = carrinho.filter(nome => !biblioteca.includes(nome));


    const topo = document.querySelector('.top');
    const abrir = document.createElement('button');
    abrir.type = 'button';
    abrir.className = 'abrir-carrinho';
    abrir.setAttribute('aria-label', 'Abrir carrinho');
    topo.appendChild(abrir);
    const abrirBiblioteca = document.createElement('button');
    abrirBiblioteca.type = 'button';
    abrirBiblioteca.className = 'abrir-biblioteca';
    topo.appendChild(abrirBiblioteca);
    const linkBiblioteca = document.createElement('a');
    linkBiblioteca.href = '#biblioteca';
    linkBiblioteca.textContent = 'Minha biblioteca';
    document.querySelector('.menu')?.appendChild(linkBiblioteca);
    linkBiblioteca.addEventListener('click', evento => { evento.preventDefault(); mostrarBiblioteca(); });


    const camada = document.createElement('div');
    camada.className = 'carrinho-camada';
    camada.hidden = true;
    camada.innerHTML = `
        <section class="carrinho-painel" role="dialog" aria-modal="true" aria-labelledby="carrinho-titulo">
            <div class="carrinho-cabecalho">
                <h2 id="carrinho-titulo">Meu carrinho</h2>
                <button type="button" class="fechar-carrinho" aria-label="Fechar carrinho">✕</button>
            </div>
            <div class="carrinho-itens"></div>
            <div class="carrinho-rodape">
                <p>Total: <strong class="carrinho-total">R$ 0,00</strong></p>
                <button type="button" class="limpar-carrinho">Esvaziar carrinho</button>
                <button type="button" class="finalizar-carrinho">Finalizar compra</button>
            </div>
        </section>`;
    document.body.appendChild(camada);

    const lista = camada.querySelector('.carrinho-itens');
    const total = camada.querySelector('.carrinho-total');
    const finalizar = camada.querySelector('.finalizar-carrinho');
    const limpar = camada.querySelector('.limpar-carrinho');

    // Telas adicionais: pagamento demonstrativo e biblioteca de jogos adquiridos.
    const pagamento = document.createElement('div');
    pagamento.className = 'maets-modal';
    pagamento.hidden = true;
    pagamento.innerHTML = `
        <section class="maets-dialog maets-checkout" role="dialog" aria-modal="true" aria-labelledby="pagamento-titulo">
            <div class="maets-modal-topo"><h2 id="pagamento-titulo">Finalizar compra</h2><button class="maets-fechar" type="button" aria-label="Fechar pagamento">✕</button></div>
            <p class="maets-aviso">Pagamento fictício para demonstração. Nenhum valor será cobrado e nenhum dado bancário será solicitado.</p>
            <div class="maets-resumo"></div>
            <div class="maets-total">Total <strong class="pagamento-total"></strong></div>
            <fieldset class="maets-metodos"><legend>Escolha um método fictício</legend>
                <label><input type="radio" name="metodo-demonstracao" value="Pix simulado" checked> Pix simulado</label>
                <label><input type="radio" name="metodo-demonstracao" value="Cartão de teste"> Cartão de teste</label>
                <label><input type="radio" name="metodo-demonstracao" value="Boleto simulado"> Boleto simulado</label>
            </fieldset>
            <p class="maets-erro" role="alert" hidden></p>
            <div class="maets-acoes"><button class="maets-voltar" type="button">Voltar ao carrinho</button><button class="maets-confirmar" type="button">Simular pagamento</button></div>
        </section>`;
    document.body.appendChild(pagamento);

    const telaBiblioteca = document.createElement('div');
    telaBiblioteca.className = 'maets-biblioteca';
    telaBiblioteca.hidden = true;
    telaBiblioteca.innerHTML = `<section class="maets-biblioteca-pagina" role="dialog" aria-modal="true" aria-labelledby="biblioteca-titulo">
        <header class="maets-biblioteca-topo"><div><p class="maets-sobretitulo">MAETS / JOGOS</p><h2 id="biblioteca-titulo">Minha biblioteca</h2><p class="biblioteca-contagem"></p></div><button class="biblioteca-fechar" type="button">✕ Voltar à loja</button></header>
        <div class="biblioteca-grade"></div>
        <p class="maets-jogar-aviso" role="status" hidden></p>
    </section>`;
    document.body.appendChild(telaBiblioteca);
    const erroPagamento = pagamento.querySelector('.maets-erro');
    const resumoPagamento = pagamento.querySelector('.maets-resumo');
    const gradeBiblioteca = telaBiblioteca.querySelector('.biblioteca-grade');
    let origemCheckout = [];

    function guardarBiblioteca() {
        try { localStorage.setItem(chaveBiblioteca, JSON.stringify(biblioteca)); }
        catch (erro) { console.warn('Não foi possível salvar a biblioteca:', erro); }
    }
    function bloquearRolagem() {
        document.body.classList.toggle('carrinho-aberto', !camada.hidden || !pagamento.hidden || !telaBiblioteca.hidden);
    }
    function fecharPagamento() {
        pagamento.hidden = true;
        bloquearRolagem();
    }
    function abrirPagamento() {
        if (!carrinho.length) return;
        origemCheckout = [...carrinho];
        resumoPagamento.replaceChildren();
        let soma = 0;
        origemCheckout.forEach(nome => {
            const jogo = catalogo.get(nome);
            soma += jogo.preco;
            const linha = document.createElement('div');
            linha.className = 'maets-resumo-item';
            const titulo = document.createElement('span');
            titulo.textContent = nome;
            const valor = document.createElement('strong');
            valor.textContent = moeda.format(jogo.preco);
            linha.append(titulo, valor);
            resumoPagamento.appendChild(linha);
        });
        pagamento.querySelector('.pagamento-total').textContent = moeda.format(soma);
        pagamento.querySelector('input[name="metodo-demonstracao"]').checked = true;
        erroPagamento.hidden = true;
        camada.hidden = true;
        pagamento.hidden = false;
        bloquearRolagem();
        pagamento.querySelector('.maets-fechar').focus();
    }
    function renderizarBiblioteca() {
        abrirBiblioteca.textContent = `Biblioteca (${biblioteca.length})`;
        telaBiblioteca.querySelector('.biblioteca-contagem').textContent = `${biblioteca.length} jogo(s) adquirido(s) nesta demonstração`;
        document.getElementById('perfil-jogos').textContent = biblioteca.length;
        gradeBiblioteca.replaceChildren();
        if (!biblioteca.length) {
            const vazio = document.createElement('div');
            vazio.className = 'biblioteca-vazia';
            vazio.innerHTML = '<h3>Sua biblioteca está vazia</h3><p>Adicione jogos ao carrinho e finalize uma compra fictícia para encontrá-los aqui.</p>';
            gradeBiblioteca.appendChild(vazio);
            return;
        }
        biblioteca.forEach(nome => {
            const jogo = catalogo.get(nome);
            if (!jogo) return;
            const card = document.createElement('article');
            card.className = 'biblioteca-card';
            const img = document.createElement('img');
            img.src = jogo.imagem;
            img.alt = `Capa de ${nome}`;
            const info = document.createElement('div');
            info.className = 'biblioteca-card-info';
            const titulo = document.createElement('strong');
            titulo.textContent = nome;
            const status = document.createElement('span');
            status.textContent = '✓ Já adquirido';
            const jogar = document.createElement('button');
            jogar.type = 'button';
            jogar.textContent = '▶ Jogar';
            jogar.addEventListener('click', () => {
                const aviso = telaBiblioteca.querySelector('.maets-jogar-aviso');
                aviso.textContent = `${nome} está na sua biblioteca. A execução do jogo não está disponível nesta demonstração.`;
                aviso.hidden = false;
            });
            info.append(titulo, status, jogar);
            card.append(img, info);
            gradeBiblioteca.appendChild(card);
        });
    }
    function mostrarBiblioteca() {
        camada.hidden = true;
        pagamento.hidden = true;
        telaBiblioteca.hidden = false;
        telaBiblioteca.querySelector('.maets-jogar-aviso').hidden = true;
        renderizarBiblioteca();
        bloquearRolagem();
        telaBiblioteca.querySelector('.biblioteca-fechar').focus();
    }
    function fecharBiblioteca() {
        telaBiblioteca.hidden = true;
        bloquearRolagem();
        abrirBiblioteca.focus();
    }
    abrirBiblioteca.addEventListener('click', mostrarBiblioteca);
    telaBiblioteca.querySelector('.biblioteca-fechar').addEventListener('click', fecharBiblioteca);
    pagamento.querySelector('.maets-fechar').addEventListener('click', fecharPagamento);
    pagamento.querySelector('.maets-voltar').addEventListener('click', () => { fecharPagamento(); abrirPainel(); });
    pagamento.addEventListener('click', evento => { if (evento.target === pagamento) fecharPagamento(); });
    pagamento.querySelector('.maets-confirmar').addEventListener('click', () => {
        if (!origemCheckout.length || origemCheckout.some(nome => !carrinho.includes(nome))) {
            erroPagamento.textContent = 'O carrinho mudou. Volte ao carrinho e confira os itens.';
            erroPagamento.hidden = false;
            return;
        }
        // Transação apenas local, sem banco, gateway ou processamento financeiro.
        origemCheckout.forEach(nome => { if (!biblioteca.includes(nome)) biblioteca.push(nome); });
        carrinho = carrinho.filter(nome => !origemCheckout.includes(nome));
        guardarBiblioteca();
        salvar();
        renderizar();
        renderizarBiblioteca();
        fecharPagamento();
        mostrarBiblioteca();
        telaBiblioteca.querySelector('.maets-jogar-aviso').textContent = '✓ Pagamento de demonstração aprovado! Os jogos foram adicionados à sua biblioteca.';
        telaBiblioteca.querySelector('.maets-jogar-aviso').hidden = false;
    });


    function salvar() {
        try { localStorage.setItem(chave, JSON.stringify(carrinho)); }
        catch (erro) { console.warn('Não foi possível salvar o carrinho:', erro); }
    }

    function renderizar() {
        abrir.textContent = `Carrinho (${carrinho.length})`;
        lista.replaceChildren();
        if (!carrinho.length) {
            const vazio = document.createElement('p');
            vazio.className = 'carrinho-vazio';
            vazio.textContent = 'Seu carrinho está vazio.';
            lista.appendChild(vazio);
        }
        let soma = 0;
        carrinho.forEach((nome) => {
            const jogo = catalogo.get(nome);
            soma += jogo.preco;
            const item = document.createElement('div');
            item.className = 'carrinho-item';
            const detalhes = document.createElement('div');
            const titulo = document.createElement('strong');
            titulo.textContent = nome;
            const preco = document.createElement('span');
            preco.textContent = jogo.preco === 0 ? 'Gratuito' : moeda.format(jogo.preco);
            detalhes.append(titulo, preco);
            const remover = document.createElement('button');
            remover.type = 'button';
            remover.textContent = 'Remover';
            remover.setAttribute('aria-label', `Remover ${nome}`);
            remover.addEventListener('click', () => {
                carrinho = carrinho.filter(item => item !== nome);
                salvar();
                renderizar();
            });
            item.append(detalhes, remover);
            lista.appendChild(item);
        });
        total.textContent = moeda.format(soma);
        finalizar.disabled = carrinho.length === 0;
        limpar.disabled = carrinho.length === 0;
        jogos.forEach((cartao) => {
            const nome = cartao.querySelector('strong')?.textContent.trim();
            const botao = cartao.querySelector('.adicionar-carrinho');
            if (!botao) return;
            const adquirido = biblioteca.includes(nome);
            const adicionado = carrinho.includes(nome);
            botao.disabled = adquirido || adicionado;
            botao.textContent = adquirido ? '✓ Já adquirido' : adicionado ? '✓ No carrinho' : catalogo.get(nome).preco === 0 ? 'Adicionar grátis' : 'Adicionar ao carrinho';
        });
    }

    function adicionar(nome) {
        if (carrinho.includes(nome) || biblioteca.includes(nome)) return;
        carrinho.push(nome);
        salvar();
        renderizar();
        abrirPainel();
    }

    function abrirPainel() {
        camada.hidden = false;
        bloquearRolagem();
        camada.querySelector('.fechar-carrinho').focus();
    }

    function fecharPainel() {
        camada.hidden = true;
        bloquearRolagem();
        abrir.focus();
    }

    abrir.addEventListener('click', abrirPainel);
    camada.querySelector('.fechar-carrinho').addEventListener('click', fecharPainel);
    camada.addEventListener('click', (evento) => {
        if (evento.target === camada) fecharPainel();
    });
    document.addEventListener('keydown', (evento) => {
        if (evento.key === 'Escape') {
            if (!pagamento.hidden) fecharPagamento();
            else if (!telaBiblioteca.hidden) fecharBiblioteca();
            else if (!camada.hidden) fecharPainel();
        }
    });
    limpar.addEventListener('click', () => {
        carrinho = [];
        salvar();
        renderizar();
    });
    finalizar.addEventListener('click', abrirPagamento);

    renderizar();
    renderizarBiblioteca();
});

document.addEventListener('DOMContentLoaded', () => {

    const area = document.querySelector('.main');
    document.querySelectorAll('.menu a[href^="#"]').forEach((link) => {
        link.addEventListener('click', (evento) => {
            evento.preventDefault();
            const alvo = document.getElementById(link.getAttribute('href').slice(1));
            if (!alvo) return;
            const rolavel = getComputedStyle(area).overflowY === 'auto';
            const visivel = rolavel ? area.clientHeight : window.innerHeight;
            alvo.scrollIntoView({ behavior: 'smooth', block: alvo.offsetHeight < visivel ? 'center' : 'start' });
        });
    });

    const carrossel = document.querySelector('.carrossel');
    if (carrossel) {
        const INTERVALO = 4000;
        const slides = [...carrossel.querySelectorAll('.slide')];
        const pontos = carrossel.querySelector('.carrossel-pontos');
        let atual = 0;
        let timer;

        function ir(i) {
            atual = (i + slides.length) % slides.length;
            slides.forEach((s, n) => s.classList.toggle('ativo', n === atual));
            [...pontos.children].forEach((p, n) => p.classList.toggle('ativo', n === atual));
            iniciar();
        }

        function iniciar() {
            clearTimeout(timer);
            timer = setTimeout(() => ir(atual + 1), INTERVALO);
        }

        slides.forEach((_, i) => {
            const ponto = document.createElement('button');
            ponto.type = 'button';
            ponto.setAttribute('aria-label', `Ir para a imagem ${i + 1}`);
            ponto.addEventListener('click', () => ir(i));
            pontos.appendChild(ponto);
        });

        carrossel.querySelector('.carrossel-anterior').addEventListener('click', () => ir(atual - 1));
        carrossel.querySelector('.carrossel-proximo').addEventListener('click', () => ir(atual + 1));
        carrossel.addEventListener('mouseenter', () => clearTimeout(timer));
        carrossel.addEventListener('mouseleave', iniciar);
        ir(0);
    }

    const perfil = document.querySelector('.profile');
    const dados = document.getElementById('perfil-dados');
    const statusPerfil = perfil.querySelector('span');

    function alternarPerfil() {
        dados.hidden = !dados.hidden;
        perfil.setAttribute('aria-expanded', String(!dados.hidden));
    }

    function atualizarStatus() {
        const online = navigator.onLine;
        statusPerfil.textContent = online ? '● Online' : '● Offline';
        perfil.classList.toggle('offline', !online);
        document.getElementById('perfil-status').textContent = online ? 'Online' : 'Offline';
    }

    perfil.addEventListener('click', alternarPerfil);
    perfil.addEventListener('keydown', (evento) => {
        if (evento.key === 'Enter' || evento.key === ' ') {
            evento.preventDefault();
            alternarPerfil();
        }
    });
    window.addEventListener('online', atualizarStatus);
    window.addEventListener('offline', atualizarStatus);
    atualizarStatus();
});
