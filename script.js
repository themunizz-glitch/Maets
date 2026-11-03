document.addEventListener('DOMContentLoaded', () => {
    const chave = 'maets_carrinho';
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

        catalogo.set(nome, { nome, preco });
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

    const topo = document.querySelector('.top');
    const abrir = document.createElement('button');
    abrir.type = 'button';
    abrir.className = 'abrir-carrinho';
    abrir.setAttribute('aria-label', 'Abrir carrinho');
    topo.appendChild(abrir);

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
            const adicionado = carrinho.includes(nome);
            botao.disabled = adicionado;
            botao.textContent = adicionado ? '✓ No carrinho' : catalogo.get(nome).preco === 0 ? 'Adicionar grátis' : 'Adicionar ao carrinho';
        });
    }

    function adicionar(nome) {
        if (carrinho.includes(nome)) return;
        carrinho.push(nome);
        salvar();
        renderizar();
        abrirPainel();
    }

    function abrirPainel() {
        camada.hidden = false;
        document.body.classList.add('carrinho-aberto');
        camada.querySelector('.fechar-carrinho').focus();
    }

    function fecharPainel() {
        camada.hidden = true;
        document.body.classList.remove('carrinho-aberto');
        abrir.focus();
    }

    abrir.addEventListener('click', abrirPainel);
    camada.querySelector('.fechar-carrinho').addEventListener('click', fecharPainel);
    camada.addEventListener('click', (evento) => {
        if (evento.target === camada) fecharPainel();
    });
    document.addEventListener('keydown', (evento) => {
        if (evento.key === 'Escape' && !camada.hidden) fecharPainel();
    });
    limpar.addEventListener('click', () => {
        carrinho = [];
        salvar();
        renderizar();
    });
    finalizar.addEventListener('click', () => {
    });

    renderizar();
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

    const nomes = [...document.querySelectorAll('.jogo strong')].map(s => s.textContent.trim());
    document.getElementById('perfil-jogos').textContent = new Set(nomes).size;
});
