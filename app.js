// app.js

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
        saoEnabled: true,      // Efeito de Ambient Occlusion (deixa 3D mais bonito)
        edgesEnabled: true     // Exibe as bordas dos objetos
    });

    // Configuração inicial da câmera
    viewer.camera.eye = [10, 10, 10];
    viewer.camera.look = [0, 0, 0];
    viewer.camera.up = [0, 1, 0];

    // 2. Cria o plugin para carregar modelos XKT
    const xktLoader = new XKTLoaderPlugin(viewer);

    // 3. Carrega o modelo XKT da pasta assets/
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
    
    // Se o seu modelo for muito grande, você pode usar um carregador com worker:
    /*
    const xktLoader = new XKTLoaderPlugin(viewer, {
        workerPool: new xeokit.WorkerPool() // Habilita processamento multi-thread
    });
    */

    // Exemplo de como reagir a um clique (seleção)
    viewer.on("mouseClicked", (e) => {
        const hit = viewer.scene.pick({
            canvasPos: e.canvasPos
        });

        if (hit && hit.entity) {
            console.log("Objeto clicado:", hit.entity.id);
            // Seleciona o objeto e volta o resto
            viewer.scene.setObjectsXRayed(viewer.scene.getObjectIds(), true);
            hit.entity.xrayed = false;
            hit.entity.selected = true;
        } else {
            // Limpa a seleção se clicar no vazio
            viewer.scene.setObjectsXRayed(viewer.scene.getObjectIds(), false);
            viewer.scene.setObjectsSelected(viewer.scene.getObjectIds(), false);
        }
    });
}