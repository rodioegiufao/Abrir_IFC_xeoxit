// Verifica se o xeokit foi carregado antes de usar
if (typeof xeokit === 'undefined') {
    console.error('xeokit SDK não foi carregado! Verifique a conexão ou o CDN.');
} else {
    // Desestruturação para pegar as classes necessárias do SDK
    const { Viewer, XKTLoaderPlugin } = xeokit.sdk;

    // 1. Cria a instância principal do Viewer
    const viewer = new Viewer({
        canvasId: "meuCanvas",
        transparent: true,     // Torna o fundo transparente
        saoEnabled: true,      // Efeito de Ambient Occlusion
        edgesEnabled: true     // Exibe as bordas dos objetos
    });

    // Configuração inicial da câmera
    viewer.camera.eye = [10, 10, 10];
    viewer.camera.look = [0, 0, 0];
    viewer.camera.up = [0, 1, 0];

    // 2. Cria o plugin para carregar modelos XKT
    const xktLoader = new XKTLoaderPlugin(viewer);

    // 3. Carrega o modelo
    const model = xktLoader.load({
        id: "meuModeloBIM",
        src: "assets/meu_modelo.xkt"
    });

    // Opcional: Centraliza a câmera no modelo após o carregamento
    model.on("loaded", () => {
        viewer.cameraFlight.flyTo(model.scene);
        console.log("Modelo carregado com sucesso!");
    });

    model.on("error", (err) => {
        console.error("Erro ao carregar modelo:", err);
    });

    // Exemplo de como reagir a um clique (seleção)
    viewer.scene.on("pick", (e) => {
        if (e.entity) {
            console.log("Objeto clicado:", e.entity.id);
            // Remove highlight de objetos anteriores
            viewer.scene.setObjectsHighlighted(viewer.scene.highlightedObjectIds, false);
            // Destaca o novo objeto
            e.entity.highlighted = true;
        }
    });
}