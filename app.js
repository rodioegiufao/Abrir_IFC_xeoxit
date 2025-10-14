// Desestruturação para pegar as classes necessárias do SDK
const { Viewer, XKTLoaderPlugin } = xeokit.sdk;

// 1. Cria a instância principal do Viewer
const viewer = new Viewer({
    canvasId: "meuCanvas", // ID do elemento <canvas> no HTML
    saoEnabled: true,      // Efeito de Ambient Occlusion (deixa a cena mais realista)
    edgesEnabled: true     // Exibe as bordas dos objetos
});

// Configuração inicial da câmera
viewer.camera.eye = [10, 10, 10]; // Posição do observador
viewer.camera.look = [0, 0, 0];   // Ponto para onde o observador está olhando
viewer.camera.up = [0, 1, 0];     // Orientação 'para cima'

// 2. Cria o plugin para carregar modelos XKT
const xktLoader = new XKTLoaderPlugin(viewer);

// 3. Carrega o modelo
// Certifique-se de que o caminho 'assets/meu_modelo.xkt' está correto
const model = xktLoader.load({
    id: "meuModeloBIM",
    src: "assets/meu_modelo.xkt" // **Substitua este caminho pelo seu arquivo .XKT**
});

// Opcional: Centraliza a câmera no modelo após o carregamento
model.on("loaded", () => {
    viewer.camera.viewFit(model.scene.boundingSphere.aabb);
    console.log("Modelo carregado com sucesso!");
});

// Exemplo de como reagir a um clique (seleção)
viewer.scene.on("pick", (e) => {
    if (e.entity) {
        console.log("Objeto clicado:", e.entity.id);
        // Exemplo: Destaca (Highlight) o objeto clicado
        e.entity.highlighted = true;
    }
});