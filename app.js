// app.js

import {
    Viewer, 
    LocaleService, 
    XKTLoaderPlugin, 
    AngleMeasurementsPlugin, 
    AngleMeasurementsMouseControl, 
    DistanceMeasurementsPlugin,
    DistanceMeasurementsMouseControl,
    ContextMenu, 
    PointerLens,
    NavCubePlugin, 
    TreeViewPlugin,
    SectionPlanesPlugin,
    LineSet,         // <--- NOVO: Importa LineSet
    buildGridGeometry // <--- NOVO: Importa buildGridGeometry
} from "https://cdn.jsdelivr.net/npm/@xeokit/xeokit-sdk@latest/dist/xeokit-sdk.min.es.js"; 

let treeView; 
let modelIsolateController; 
let sectionPlanesPlugin; 
let horizontalSectionPlane; 
let horizontalPlaneControl; 
let lastPickedEntity = null; // NOVO: Variável para rastrear a entidade selecionada

// -----------------------------------------------------------------------------
// 1. Configuração do Viewer e Redimensionamento (100% da tela)
// -----------------------------------------------------------------------------

const viewer = new Viewer({

    canvasId: "meuCanvas",
    transparent: false, 
    saoEnabled: true,
    edgesEnabled: true,
    backgroundColor: [0.8, 0.8, 0.8],
    
    // CONFIGURAÇÃO DE LOCALIZAÇÃO (NavCube em Português)
    localeService: new LocaleService({
        messages: {
            "pt": { // Português
                "NavCube": {
                    "front": "Frente",
                    "back": "Trás",
                    "top": "Topo",
                    "bottom": "Baixo",
                    "left": "Esquerda",
                    "right": "Direita"
                }
            }
        },
        locale: "pt" // Define o idioma padrão como Português
    })
});


function onWindowResize() {
    const canvas = viewer.scene.canvas;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

window.addEventListener('resize', onWindowResize);
onWindowResize(); 

// -----------------------------------------------------------------------------
// 2. Carregamento dos Modelos e Ajuste da Câmera
// -----------------------------------------------------------------------------

const xktLoader = new XKTLoaderPlugin(viewer);

let modelsLoadedCount = 0;
const totalModels = 2; 

/**
 * Reseta a visibilidade de todos os objetos e remove qualquer destaque ou raio-x.
 */
function resetModelVisibility() {
    if (modelIsolateController) {
        // Volta a exibir todos os objetos
        modelIsolateController.setObjectsVisible(modelIsolateController.getObjectsIds(), true);
        // Remove X-ray
        modelIsolateController.setObjectsXRayed(modelIsolateController.getObjectsIds(), false);
        // Remove destaque
        modelIsolateController.setObjectsHighlighted(modelIsolateController.getObjectsIds(), false);
        // Centraliza a câmera no modelo inteiro
        viewer.cameraFlight.jumpTo(viewer.scene);
    }
    lastPickedEntity = null; // Garante que a referência de seleção também seja limpa.
    clearSelection(false); // Limpa o estado visual do botão "Limpar Seleção"
}

/**
 * Função NOVO: Cria uma grade no plano do solo (elevação mínima Y).
 */
function createGroundGrid() {
    // Pega o Bounding Box de toda a cena para centralizar e posicionar no solo
    const aabb = viewer.scene.getAABB(); 
    
    // Determina a elevação do solo (o valor Y mínimo do AABB)
    // O xeokit usa a convenção [minX, minY, minZ, maxX, maxY, maxZ]
    const groundY = aabb[1]; 

    // Cria a geometria da grade
    const geometryArrays = buildGridGeometry({
        size: 100, // Tamanho da grade (100x100 metros)
        divisions: 50 // 50 divisões (linhas)
    });

    // Cria o LineSet para renderizar a grade
    new LineSet(viewer.scene, {
        positions: geometryArrays.positions,
        indices: geometryArrays.indices,
        color: [0.5, 0.5, 0.5], // Cor cinza suave
        opacity: 0.8,
        // Move a grade para o centro XZ do modelo e para a elevação correta.
        position: [
            (aabb[0] + aabb[3]) / 2, // Centro X
            groundY,                 // Elevação Y
            (aabb[2] + aabb[5]) / 2  // Centro Z
        ]
    });
    
    console.log("Grade do solo criada.");
}


function adjustCameraOnLoad() {
    modelsLoadedCount++;
    
    if (modelsLoadedCount === totalModels) {
        setTimeout(() => {
            viewer.cameraFlight.jumpTo(viewer.scene);
            console.log("Todos os modelos carregados e câmera ajustada para o zoom correto.");
            setMeasurementMode('none', document.getElementById('btnDeactivate')); 
            setupModelIsolateController();
            createGroundGrid(); // <-- NOVO: Chama a criação da grade
        }, 300);
    }
}

// CARREGAMENTO DOS MODELOS (MANTIDO)
const model1 = xktLoader.load({
    id: "meuModeloBIM",
    src: "assets/meu_modelo.xkt", 
    edges: true
});

model1.on("loaded", adjustCameraOnLoad);
model1.on("error", (err) => {
    console.error("Erro ao carregar meu_modelo.xkt:", err);
    adjustCameraOnLoad(); 
});

const model2 = xktLoader.load({
    id: "meuModeloBIM_02", 
    src: "assets/modelo-02.xkt", 
    edges: true
});

model2.on("loaded", adjustCameraOnLoad);
model2.on("error", (err) => {
    console.error("Erro ao carregar modelo-02.xkt:", err);
    adjustCameraOnLoad(); 
});


// -----------------------------------------------------------------------------
// 3. Plugins de Medição e Função de Troca (MANTIDO)
// -----------------------------------------------------------------------------

const angleMeasurementsPlugin = new AngleMeasurementsPlugin(viewer, { zIndex: 100000 });
const angleMeasurementsMouseControl = new AngleMeasurementsMouseControl(angleMeasurementsPlugin, {
    pointerLens: new PointerLens(viewer), 
    snapping: true 
});
angleMeasurementsMouseControl.deactivate(); 


const distanceMeasurementsPlugin = new DistanceMeasurementsPlugin(viewer, { zIndex: 100000 });
const distanceMeasurementsMouseControl = new DistanceMeasurementsMouseControl(distanceMeasurementsPlugin, {
    pointerLens: new PointerLens(viewer), 
    snapping: true 
});
distanceMeasurementsMouseControl.deactivate(); 

function setMeasurementMode(mode, clickedButton) {
    angleMeasurementsMouseControl.deactivate();
    distanceMeasurementsMouseControl.deactivate();
    document.querySelectorAll('.tool-button').forEach(btn => btn.classList.remove('active'));

    if (mode === 'angle') {
        angleMeasurementsMouseControl.activate();
    } else if (mode === 'distance') {
        distanceMeasurementsMouseControl.activate();
    }
    
    if (clickedButton) {
         clickedButton.classList.add('active');
    }

    angleMeasurementsMouseControl.reset(); 
    distanceMeasurementsMouseControl.reset(); 
    
    // Garante que o modo de seleção seja desativado ao iniciar uma medição
    clearSelection(); 
}

window.setMeasurementMode = setMeasurementMode;

// -----------------------------------------------------------------------------
// 4. Menu de Contexto (Deletar Medição) (MANTIDO)
// -----------------------------------------------------------------------------

const contextMenu = new ContextMenu({
    items: [
        [
            {
                title: "Deletar Medição",
                doAction: function (context) {
                    context.measurement.destroy();
                }
            }
        ]
    ]
});

function setupMeasurementEvents(plugin) {
    plugin.on("contextMenu", (e) => {
        const measurement = e.angleMeasurement || e.distanceMeasurement;
        contextMenu.context = { measurement: measurement };
        contextMenu.show(e.event.clientX, e.event.clientY);
        e.event.preventDefault();
    });

    plugin.on("mouseOver", (e) => {
        (e.angleMeasurement || e.distanceMeasurement).setHighlighted(true);
    });

    plugin.on("mouseLeave", (e) => {
        const measurement = e.angleMeasurement || e.distanceMeasurement;
        if (!contextMenu.shown || contextMenu.context.measurement.id !== measurement.id) {
            measurement.setHighlighted(false);
        }
    });
}

setupMeasurementEvents(angleMeasurementsPlugin);
setupMeasurementEvents(distanceMeasurementsPlugin);

// -----------------------------------------------------------------------------
// 5. Cubo de Navegação (NavCube) (MANTIDO)
// -----------------------------------------------------------------------------

new NavCubePlugin(viewer, {
    canvasId: "myNavCubeCanvas", 
    visible: true,
    size: 150, 
    alignment: "bottomRight", 
    bottomMargin: 20, 
    rightMargin: 20 
});

// -----------------------------------------------------------------------------
// 6. TreeViewPlugin e Lógica de Isolamento (MANTIDO)
// -----------------------------------------------------------------------------

function setupModelIsolateController() {
    
    treeView = new TreeViewPlugin(viewer, {
        containerElement: document.getElementById("treeViewContainer"),
        hierarchy: "containment", 
        autoExpandDepth: 2 
    });

    modelIsolateController = viewer.scene.objects;

    // Ouve o evento de "seleção" no TreeView
    treeView.on("nodeClicked", (event) => {
        const entityId = event.entityId;
        
        // Verifica se há alguma entidade associada ao nó
        if (entityId && viewer.scene.getObjectsInSubtree(entityId).length > 0) {
            
            const subtreeIds = viewer.scene.getObjectsInSubtree(entityId);
            
            // Isola (mostra apenas) a parte do modelo (pavimento, por exemplo) clicada
            modelIsolateController.setObjectsXRayed(modelIsolateController.getObjectsIds(), true); // X-ray em TUDO
            modelIsolateController.setObjectsXRayed(subtreeIds, false); // Tira o X-ray do subconjunto isolado

            modelIsolateController.isolate(subtreeIds); // Isola o subconjunto
            
            viewer.cameraFlight.flyTo({
                aabb: viewer.scene.getAABB(entityId),
                duration: 0.5
            });
            
            clearSelection(); // Limpa a seleção específica quando se usa a TreeView

        } else {
            // Se o usuário clicar em um nó que não contém objetos (como o nó raiz do projeto ou um item folha)
            // Apenas reseta a visibilidade.
            resetModelVisibility(); 
        }
    });
}

/**
 * Alterna a visibilidade do contêiner do TreeView e reseta a visibilidade do modelo se estiver fechando.
 */
function toggleTreeView() {
    const container = document.getElementById('treeViewContainer');
    
    if (container.style.display === 'block') {
        container.style.display = 'none';
        // Ação de "Mostrar Tudo" ao fechar o painel
        resetModelVisibility(); 
    } else {
        container.style.display = 'block';
    }
}

// EXPOR AO ESCOPO GLOBAL para ser chamado pelo 'onclick' do HTML
window.toggleTreeView = toggleTreeView;
window.resetModelVisibility = resetModelVisibility; 

// -----------------------------------------------------------------------------
// 7. Plano de Corte (Section Plane) - VERSÃO ESTÁVEL (MANTIDO)
// -----------------------------------------------------------------------------
// ... setupSectionPlane (função que não é mais usada, mas mantida por segurança) ...

function toggleSectionPlane(button) {
    const scene = viewer.scene;

    // cria o plugin e o plano na primeira vez
    if (!horizontalSectionPlane) {
        sectionPlanesPlugin = new SectionPlanesPlugin(viewer);

        const aabb = scene.getAABB();
        const modelCenterY = (aabb[1] + aabb[4]) / 2;

        horizontalSectionPlane = sectionPlanesPlugin.createSectionPlane({
            id: "horizontalPlane",
            pos: [0, modelCenterY, 0],
            dir: [0, -1, 0],
            active: false
        });

        console.log("Plano de corte criado sob demanda.");
    }

    // --- DESATIVAR ---
    if (horizontalSectionPlane.active) {
        horizontalSectionPlane.active = false;
        scene.sectionPlanes.active = false;

        // destrói o controle, remove listeners e força redraw
        if (horizontalSectionPlane.control) {
            try {
                viewer.input.removeCanvasElement(horizontalSectionPlane.control.canvas);
            } catch (e) {}
            horizontalSectionPlane.control.destroy();
            horizontalSectionPlane.control = null;
        }

        // alguns builds deixam o gizmo em viewer.input._activeCanvasElements
        if (viewer.input && viewer.input._activeCanvasElements) {
            viewer.input._activeCanvasElements.clear?.();
        }

        viewer.scene.render(); // força re-render
        button.classList.remove("active");
        viewer.cameraFlight.flyTo(scene);
        return;
    }

    // --- ATIVAR ---
    const aabb = scene.getAABB();
    const modelCenterY = (aabb[1] + aabb[4]) / 2;

    horizontalSectionPlane.pos = [0, modelCenterY, 0];
    horizontalSectionPlane.dir = [0, -1, 0];
    horizontalSectionPlane.active = true;
    scene.sectionPlanes.active = true;

    // cria novamente o controle
    horizontalSectionPlane.control = sectionPlanesPlugin.showControl(horizontalSectionPlane.id);

    button.classList.add("active");

    viewer.cameraFlight.flyTo({
        aabb: scene.aabb,
        duration: 0.5
    });
}

window.toggleSectionPlane = toggleSectionPlane;

// -----------------------------------------------------------------------------
// 8. Seleção de Entidade (Highlighting) - NOVO (MANTIDO)
// -----------------------------------------------------------------------------

/**
 * Limpa a seleção atual, removendo o destaque da última entidade selecionada
 * e desativando o botão de Limpar visualmente.
 * @param {boolean} [log=true] Se deve logar no console.
 */
function clearSelection(log = true) {
    if (lastPickedEntity) {
        lastPickedEntity.highlighted = false;
        lastPickedEntity = null;
    }
    // Garante que o botão 'Limpar Seleção' também seja desativado visualmente
    const btnClearSelection = document.getElementById('btnClearSelection');
    if (btnClearSelection) {
        btnClearSelection.classList.remove('active');
    }
    if (log) {
        console.log("Seleção limpa.");
    }
}

window.clearSelection = clearSelection; // Expõe a função de limpeza de seleção

/**
 * Evento acionado ao dar duplo-clique em uma entidade.
 * Seleciona (Highlight) a entidade, centraliza a câmera nela, e limpa a seleção anterior.
 */
viewer.cameraControl.on("doublePicked", pickResult => {

    // 1. Limpa a seleção anterior e a referência.
    clearSelection(false); // Limpa sem logar

    if (pickResult.entity) {
        const entity = pickResult.entity;

        // 2. Destaca (Highlight) a nova entidade
        entity.highlighted = true;
        lastPickedEntity = entity; // Armazena a referência

        // 3. Centraliza a câmera nela
        viewer.cameraFlight.flyTo({
            aabb: viewer.scene.getAABB(entity.id),
            duration: 0.5
        });

        console.log(`Entidade selecionada por duplo-clique: ${entity.id}`);
        
        // Ativa o botão de Limpar Seleção (feedback visual)
        const btnClearSelection = document.getElementById('btnClearSelection');
        if (btnClearSelection) {
            btnClearSelection.classList.add('active');
        }

    } else {
        // Se o usuário deu duplo-clique no vazio, apenas informa.
        console.log("Duplo-clique no vazio.");
    }
});
// -----------------------------------------------------------------------------
// 9. Menu de Contexto (Propriedades do Material) - NOVO (MANTIDO)
// -----------------------------------------------------------------------------

// Desabilita o pan com o botão direito (para permitir o menu)
viewer.cameraControl.panRightClick = false;

// Cria o menu de contexto
const materialContextMenu = new ContextMenu({
    enabled: true,
    items: [
        [
            {
                title: "Propriedades do Material",
                doAction: function (context) {
                    const entity = context.entity;
                    if (!entity || !entity.id) {
                        alert("Nenhuma entidade selecionada.");
                        return;
                    }

                    const metaObject = viewer.metaScene.metaObjects[entity.id];
                    if (!metaObject) {
                        alert("Não há informações de metadados disponíveis para este objeto.");
                        return;
                    }

                    let propriedades = `<strong style='color:#4CAF50;'>ID:</strong> ${metaObject.id}<br>`;
                    propriedades += `<strong style='color:#4CAF50;'>Tipo:</strong> ${metaObject.type || "N/A"}<br>`;
                    if (metaObject.name) propriedades += `<strong style='color:#4CAF50;'>Nome:</strong> ${metaObject.name}<br><br>`;

                    // --- 🔍 NOVO: Varre os PropertySets IFC (Psets, Identificação, Geometria, etc.) ---
                    if (metaObject.propertySets && metaObject.propertySets.length > 0) {
                        for (const pset of metaObject.propertySets) {
                            propriedades += `<div style="margin-top:10px;border-top:1px solid #444;padding-top:5px;">`;
                            propriedades += `<strong style='color:#4CAF50;'>${pset.name}</strong><br>`;
                            if (pset.properties && pset.properties.length > 0) {
                                propriedades += "<table style='width:100%;font-size:12px;margin-top:5px;'>";
                                for (const prop of pset.properties) {
                                    const key = prop.name || prop.id;
                                    const val = prop.value !== undefined ? prop.value : "(vazio)";
                                    propriedades += `<tr><td style='width:40%;color:#ccc;'>${key}</td><td style='color:#fff;'>${val}</td></tr>`;
                                }
                                propriedades += "</table>";
                            }
                            propriedades += `</div>`;
                        }
                    } else {
                        propriedades += `<i style='color:gray;'>Nenhum conjunto de propriedades encontrado.</i>`;
                    }

                    // --- Cria ou atualiza o painel flutuante ---
                    let painel = document.getElementById("propertyPanel");
                    if (!painel) {
                        painel = document.createElement("div");
                        painel.id = "propertyPanel";
                        painel.style.position = "fixed";
                        painel.style.right = "20px";
                        painel.style.top = "80px";
                        painel.style.width = "350px";
                        painel.style.maxHeight = "65vh";
                        painel.style.overflowY = "auto";
                        // Esses estilos serão sobrescritos pelo styles.css
                        painel.style.background = "rgba(0,0,0,0.9)";
                        painel.style.color = "white";
                        painel.style.padding = "15px";
                        painel.style.borderRadius = "10px";
                        painel.style.zIndex = 300000;
                        painel.style.fontFamily = "Arial, sans-serif";
                        painel.style.fontSize = "13px";
                        painel.style.boxShadow = "0 4px 10px rgba(0,0,0,0.4)";
                        document.body.appendChild(painel);
                    }

                    painel.innerHTML = `<h3 style='margin-top:0;'>Propriedades IFC</h3>${propriedades}`;
                }

            }
        ]
    ]
});

// Captura o evento de clique direito no canvas
viewer.scene.canvas.canvas.addEventListener('contextmenu', (event) => {
    const canvasPos = [event.pageX, event.pageY];
    const hit = viewer.scene.pick({ canvasPos });

    if (hit && hit.entity && hit.entity.isObject) {
        materialContextMenu.context = { viewer, entity: hit.entity };
        materialContextMenu.show(event.pageX, event.pageY);
    }

    event.preventDefault();
});
