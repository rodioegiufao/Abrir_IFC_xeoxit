// app.js
window.addEventListener("DOMContentLoaded", () => {
    console.log("🚀 Iniciando visualizador xeokit...");

    // 1️⃣ Verificação do SDK
    if (typeof window.xeokit === "undefined") {
        console.error("❌ xeokit SDK não foi carregado! Verifique o link UMD no HTML.");
        return;
    }

    // 2️⃣ Desestruturação do SDK
    const { Viewer, XKTLoaderPlugin } = window.xeokit;

    try {
        // 3️⃣ Cria o viewer principal
        const viewer = new Viewer({
            canvasId: "meuCanvas",
            transparent: true,
            saoEnabled: true,
            edgesEnabled: true,
        });

        // 4️⃣ Configuração inicial da câmera
        viewer.camera.eye = [15, 15, 15];
        viewer.camera.look = [0, 0, 0];
        viewer.camera.up = [0, 1, 0];

        console.log("🧠 Viewer criado com sucesso.");

        // 5️⃣ Cria plugin de carregamento
        const xktLoader = new XKTLoaderPlugin(viewer);

        // 6️⃣ Carrega modelo
        const model = xktLoader.load({
            id: "modeloBIM",
            src: "assets/meu_modelo.xkt",
            edges: true
        });

        model.on("loaded", () => {
            console.log("✅ Modelo carregado com sucesso!");
            viewer.cameraFlight.flyTo(model);
        });

        model.on("error", (err) => {
            console.error("❌ Erro ao carregar modelo XKT:", err);
        });

        // 7️⃣ Interação de clique
        viewer.scene.input.on("mouseclicked", (coords) => {
            const hit = viewer.scene.pick({ canvasPos: coords });
            if (hit && hit.entity) {
                console.log("🟩 Objeto clicado:", hit.entity.id);

                viewer.scene.setObjectsXRayed(viewer.scene.getObjectIds(), true);
                viewer.scene.setObjectsSelected(viewer.scene.getObjectIds(), false);

                hit.entity.xrayed = false;
                hit.entity.selected = true;
            } else {
                viewer.scene.setObjectsXRayed(viewer.scene.getObjectIds(), false);
                viewer.scene.setObjectsSelected(viewer.scene.getObjectIds(), false);
            }
        });

        // 8️⃣ Resize dinâmico
        window.addEventListener("resize", () => viewer.resize());
    } catch (e) {
        console.error("🚨 Erro inesperado na inicialização do viewer:", e);
    }
});
