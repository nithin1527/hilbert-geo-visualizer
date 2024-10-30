import { ConvexPolygon, HilbertBall, Site, Point, SelectableSegment } from "../../default-objects.js";

export function isAnyModalOpen() {
    const modals = [
        document.getElementById("modal"),
        document.getElementById("restoreModal"),
        document.getElementById("fileNameModal"),
        document.getElementById("uploadJsonModal")
    ];
    return modals.some(modal => modal && modal.style.display === "block");
}

function getCurrentState(canvas, hilbertDistanceManager) {
    function removeCircularReferences(obj, seen = new WeakSet()) {
        if (obj !== null && typeof obj === "object") {
            if (seen.has(obj)) {
                return;
            }
            seen.add(obj);
            if (Array.isArray(obj)) {
                return obj.map(item => removeCircularReferences(item, seen));
            } else {
                const newObj = {};
                for (const key in obj) {
                    if (obj.hasOwnProperty(key)) {
                        newObj[key] = removeCircularReferences(obj[key], seen);
                    }
                }
                return newObj;
            }
        }
        return obj;
    }

    const state = {
        polygon: canvas.polygon,
        sites: canvas.sites.map(site => {
            const siteState = {
                x: site.x,
                y: site.y,
                color: site.color,
                label: site.label,
                drawSpokes: site.drawSpokes,
                showInfo: site.showInfo,
                selected: site.selected,
                
            };
            if (site instanceof HilbertBall) {
                siteState.ballRadius = site.ballRadius;
                siteState.boundaryColor = site.boundaryColor;
                console.log(siteState);
            }
            return siteState;
        }),
        segments: canvas.segments.map(segment => ({
            point1: { x: segment.point1.x, y: segment.point1.y },
            point2: { x: segment.point2.x, y: segment.point2.y },
            color: segment.color,
            selected: segment.selected
        })),
        savedDistances: hilbertDistanceManager.savedDistances
    };

    return removeCircularReferences(state);
}

function showModal(element) {
    element.style.display = "block";
    setTimeout(() => {
        element.style.opacity = "1";
    }, 10);
}

function hideModal(element) {
    element.style.opacity = 0;
    setTimeout(() => {
        element.style.display = "none";
    }, 400);
}

function handleDownloadButton(canvas, hilbertDistanceManager, modal, jsonContent) {
    const currentState = getCurrentState(canvas, hilbertDistanceManager);
    jsonContent.textContent = JSON.stringify(currentState, null, 2);
    showModal(modal);
}

function handleConfirmDownloadButton(canvas, hilbertDistanceManager, fileNameInput, fileNameModal) {
    const currentState = getCurrentState(canvas, hilbertDistanceManager);
    const jsonString = JSON.stringify(currentState, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const fileName = fileNameInput.value.trim() || 'state';
    a.download = `${fileName}.json`;
    a.click();
    URL.revokeObjectURL(url);
    hideModal(fileNameModal);
}

function handleUploadJsonFileInput(event, restoreJsonInput) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            restoreJsonInput.value = event.target.result;
        };
        reader.readAsText(file);
    }
}

function recreateConvexPolygon(json) {
    const vertices = json.vertices.map(vertex => new Point(vertex.x, vertex.y, vertex.color, vertex.radius, vertex.showInfo));
    document.getElementById('polygonShowInfo').checked = json.showInfo;
    document.getElementById('polygonColor').value = json.color;
    return new ConvexPolygon(vertices, json.color, json.penWidth, json.showInfo, json.showVertices, json.vertexRadius);
}

function recreateSite(json, polygon) {
    return new Site(json.x, json.y, polygon, json.color, json.drawSpokes, json.showInfo, json.selected, json.label);
}

function recreateHilbertBall(json, polygon) {
    const newSite = recreateSite(json, polygon);
    const newBall = new HilbertBall(newSite);
    newBall.setBallRadius(json.ballRadius);
    newBall.setBoundaryColor(json.boundaryColor);
    return newBall;
}

function recreateSelectableSegment(json) {
    const point1 = new Point(json.point1.x, json.point1.y);
    const point2 = new Point(json.point2.x, json.point2.y);
    return new SelectableSegment(point1, point2, json.color, json.selected);
}

function handleRestoreStateButton(restoreJsonInput, canvas, hilbertDistanceManager, managers, restoreModal) {
    const jsonInput = restoreJsonInput.value;
    try {
        const parsedJson = JSON.parse(jsonInput);

        if (parsedJson.polygon) {
            canvas.polygon = recreateConvexPolygon(parsedJson.polygon);
        }

        if (parsedJson.sites) {
            canvas.sites = parsedJson.sites.map(site => {
                if (site.hasOwnProperty('ballRadius')) {
                    return recreateHilbertBall(site, canvas.polygon);
                } else {
                    return recreateSite(site, canvas.polygon);
                }
            });
        }

        if (parsedJson.segments) {
            canvas.segments = parsedJson.segments.map(segment => recreateSelectableSegment(segment));
        }

        if (parsedJson.savedDistances) {
            hilbertDistanceManager.savedDistances = parsedJson.savedDistances;
            hilbertDistanceManager.updateSavedDistancesList();
        }

        canvas.drawAll();

        hideModal(restoreModal);
        restoreJsonInput.value = '';

    } catch (error) {
        console.log(error);
        alert('Invalid JSON. Please check your input and try again.');
    }
}

function addModalEventListeners(modal, restoreModal, fileNameModal, uploadJsonModal, closeButtons, fileNameCloseButton) {
    closeButtons.forEach(button => {
        button.addEventListener("click", () => {
            hideModal(modal);
            hideModal(restoreModal);
            hideModal(fileNameModal);
            hideModal(uploadJsonModal);
        });
    });

    fileNameCloseButton.addEventListener("click", () => {
        hideModal(fileNameModal);
    });

    window.addEventListener("click", (event) => {
        if (event.target == modal) {
            hideModal(modal);
        } else if (event.target == restoreModal) {
            hideModal(restoreModal);
        } else if (event.target == fileNameModal) {
            hideModal(fileNameModal);
        }
    });
}

export function initializeJsonHandlers(canvas, hilbertDistanceManager, managers) {
    const modal = document.getElementById("modal");
    const restoreModal = document.getElementById("restoreModal");
    const uploadJsonModal = document.getElementById("uploadJsonModal");
    const downloadButton = document.getElementById("downloadButton");
    const openRestoreModalButton = document.getElementById("openRestoreModalButton");
    const uploadJsonButton = document.getElementById("uploadJsonButton");
    const closeButtons = document.querySelectorAll(".close-button, .file-close-button");
    const copyButton = document.getElementById('copyButton');
    const downloadJsonFileButton = document.getElementById('downloadJsonFileButton');
    const jsonContent = document.getElementById('jsonContent');
    const restoreJsonInput = document.getElementById('restoreJsonInput');
    const restoreStateButton = document.getElementById('restoreStateButton');
    const fileNameModal = document.getElementById("fileNameModal");
    const fileNameInput = document.getElementById('fileNameInput');
    const confirmDownloadButton = document.getElementById('confirmDownloadButton');
    const fileNameCloseButton = document.getElementById('fileNameCloseButton');
    const uploadJsonFileInput = document.getElementById('uploadJsonFileInput');

    downloadButton.addEventListener("click", () => handleDownloadButton(canvas, hilbertDistanceManager, modal, jsonContent));
    downloadJsonFileButton.addEventListener('click', () => {
        fileNameModal.style.zIndex = parseInt(modal.style.zIndex, 10) + 1;
        showModal(fileNameModal);
    });
    confirmDownloadButton.addEventListener('click', () => handleConfirmDownloadButton(canvas, hilbertDistanceManager, fileNameInput, fileNameModal));
    openRestoreModalButton.addEventListener("click", () => showModal(restoreModal));
    uploadJsonButton.addEventListener('click', () => uploadJsonFileInput.click());
    uploadJsonFileInput.addEventListener('change', (event) => handleUploadJsonFileInput(event, restoreJsonInput));
    addModalEventListeners(modal, restoreModal, fileNameModal, uploadJsonModal, closeButtons, fileNameCloseButton);
    copyButton.addEventListener('click', () => {
        const textArea = document.createElement('textarea');
        textArea.value = jsonContent.textContent;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);

        const originalIcon = copyButton.innerHTML;
        copyButton.innerHTML = '<i class="fas fa-check"></i>';
        setTimeout(() => {
            copyButton.innerHTML = originalIcon;
        }, 2000);
    });
    restoreStateButton.addEventListener('click', () => handleRestoreStateButton(restoreJsonInput, canvas, hilbertDistanceManager, managers, restoreModal));
}