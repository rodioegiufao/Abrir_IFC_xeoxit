// app.js
import { Viewer } from "https://cdn.jsdelivr.net/npm/@xeokit/xeokit-sdk@2.6.91/dist/xeokit-sdk.min.js";
import { XKTLoaderPlugin } from "https://cdn.jsdelivr.net/npm/@xeokit/xeokit-sdk@2.6.91/dist/xeokit-sdk.min.js";
import { NavCubePlugin } from "https://cdn.jsdelivr.net/npm/@xeokit/xeokit-sdk@2.6.91/dist/xeokit-sdk.min.js";

window.addEventListener("DOMContentLoaded", () => {
    console.log("🚀 Inicializando visualizador xeokit...");

    // 1️⃣ Cria o Viewer
    const viewer = new Viewer({
        canvasId: "meuCanvas",
        transparent: true,
        saoEnabled: true,
        edgesEnabled: true,
    });

    // 2️⃣ Configuração inicial da câmera
    viewer.camera.eye = [15, 15, 15];
    viewer.camera.look = [0, 0, 0];
    viewer.camera.up = [0, 1, 0];

    console.log("🧠 Viewer criado com sucesso.");

    // 3️⃣ Adiciona o NavCube (mini cubo 3D de orientação)
    new NavCubePlugin(viewer, {
        canvasId: "meuCanvas", // usa o mesmo canvas
        visible: true,
    });

    // 4️⃣ Cria plugin para carregar modelo XKT
    const xktLoader = new XKTLoaderPlugin(viewer);

    // 5️⃣ Carrega o modelo
    const model = xktLoader.load({
        id: "modeloBIM",
        src: "assets/meu_modelo.xkt",
        edges: true,
    });

    // 6️⃣ Callback quando modelo for carregado
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

    // 8️⃣ Ajusta tamanho ao redimensionar janela
    window.addEventListener("resize", () => viewer.resize());
});
