import { Bisector, HilbertBall, MiddleSector, Point, Site } from "../../default-objects.js";
import { drawHilbertMinimumEnclosingRadiusBall, hilbertDistance, createScatterPlot, findHilbertCircumCenter, drawBisectorsOfHilbertCircumcenter } from "../../default-functions.js";
import { SiteManager } from "./site.js";
import { isAnyModalOpen } from "../scripts/scripts-json-events.js";
import { hilbertMidpoint } from "../../default-functions.js";
import { BisectorManager } from "../bisector/bisector.js";

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

export function initMouseActions(siteManager) {
    const events = ['mousedown', 'mousemove', 'mouseup', 'click'];
    const handlers = {
        mousedown: (event) => {
            if (event.shiftKey) {
                siteManager.startDragSelect(event);
            } else {
                siteManager.startDragging(event);
            }
        },
        mousemove: (event) => {
            if (siteManager.isDragSelecting) {
                siteManager.updateDragSelect(event);
            } else {
                siteManager.dragSite(event);
                if (siteManager.hilbertDistanceManager.active) {
                    siteManager.hilbertDistanceManager.updateSavedDistances();
                }
            }
        },
        mouseup: (event) => {
            if (siteManager.isDragSelecting) {
                siteManager.endDragSelect(event);
            } else {
                siteManager.stopDragging();
            }
        },
        click: (event) => {
            const { x, y } = siteManager.canvas.getMousePos(event);
            const point = new Point(x, y);
            if (siteManager.active) {
                if (event.shiftKey) {
                    siteManager.selectSite(event, true);
                } else {
                    siteManager.selectSite(event);
                    siteManager.selectSegment(point);
                }
            }
        },
    };

    events.forEach(eventType => {
        siteManager.canvas.canvas.addEventListener(eventType, (event) => {
            if (siteManager.active) {
                handlers[eventType](event);
            }
        });
    });

    document.addEventListener('keydown', (event) => {
        if (!isAnyModalOpen()) {
            if (siteManager.active && (event.key === 'Delete' || event.key === 'Backspace')) {
                siteManager.removeSelectedSegment();
            }
        }
    });
}

function getChangedProperties() {
    const changedProperties = {};
    const siteColor = document.getElementById('siteColor');
    const siteShowInfo = document.getElementById('siteShowInfo');
    const siteDrawSpokes = document.getElementById('siteDrawSpokes');
    const labelInput = document.getElementById('labelInput');

    if (siteColor.value !== siteColor.defaultValue) {
        changedProperties.color = true;
    }
    if (siteShowInfo.checked !== siteShowInfo.defaultChecked) {
        changedProperties.showInfo = true;
    }
    if (siteDrawSpokes.checked !== siteDrawSpokes.defaultChecked) {
        changedProperties.drawSpokes = true;
    }
    if (labelInput.value !== labelInput.defaultValue) {
        changedProperties.label = true;
    }
    return changedProperties;
}

function updateSiteProperties(manager) {
    const changedProperties = getChangedProperties();
    const selectedSites = manager.canvas.sites.filter(site => site.selected);

    if (selectedSites.length === 1) {
        const site = selectedSites[0];
        site.color = document.getElementById('siteColor').value;
        site.showInfo = document.getElementById('siteShowInfo').checked;
        site.drawSpokes = document.getElementById('siteDrawSpokes').checked;
        site.label = document.getElementById('labelInput').value;
    } else if (selectedSites.length > 1) {

        manager.canvas.sites.forEach(site => {
            if (site.selected) {
                if (changedProperties.color && document.getElementById('siteColor').value !== '') {
                    site.color = document.getElementById('siteColor').value;
                    document.getElementById('siteColor').defaultValue = site.color; // Update default value
                }
                if (changedProperties.showInfo) {
                    site.showInfo = document.getElementById('siteShowInfo').checked;
                    document.getElementById('siteShowInfo').defaultChecked = site.showInfo; // Update default value
                }
                if (changedProperties.drawSpokes) {
                    site.drawSpokes = document.getElementById('siteDrawSpokes').checked;
                    document.getElementById('siteDrawSpokes').defaultChecked = site.drawSpokes; // Update default value
                }
                if (changedProperties.label) {
                    site.label = document.getElementById('labelInput').value;
                    document.getElementById('labelInput').defaultValue = site.label; // Update default value
                }
            }
        });
    }

    manager.canvas.drawAll();
}

export function initProperties(siteManager) {
    const debouncedUpdateSiteProperties = debounce(() => updateSiteProperties(siteManager), 0);
    document.getElementById('siteColor').addEventListener('input', debouncedUpdateSiteProperties);
    document.getElementById('siteShowInfo').addEventListener('change', debouncedUpdateSiteProperties);
    document.getElementById('siteDrawSpokes').addEventListener('change', debouncedUpdateSiteProperties);
    document.getElementById('labelInput').addEventListener('input', debouncedUpdateSiteProperties);
    document.getElementById('labelInput').addEventListener('blur', debouncedUpdateSiteProperties);
}

export function initShortcuts(siteManager) {
  document.addEventListener('keydown', (event) => {
    if (siteManager.active && (event.key === 'Delete' || event.key === 'Backspace')) {
      siteManager.removeSite();
    }
  });
}

export function initLabelInput() {
    const labelInput = document.getElementById('labelInput');
    labelInput.addEventListener('input', function() {
        this.style.width = (this.value.length + 1) + 'ch';
    });

    labelInput.style.width = (labelInput.placeholder.length + 1) + 'ch';

    labelInput.addEventListener('keydown', function(event) {
        if (event.key === 'Delete' || event.key === 'Backspace' || event.key === 't') {
            event.stopPropagation();
        }
    });
}

export function initContextMenu(siteManager) {

    const contextMenu = document.getElementById('contextMenu');
    const calculateHilbertDistanceItem = document.getElementById('calculateHilbertDistance');
    const saveHilbertDistanceItem = document.getElementById('saveHilbertDistance');
    const drawSegmentItem = document.getElementById('drawSegment');
    const drawBisector = document.getElementById('drawBisector');
    const drawZRegion = document.getElementById('drawZRegion');
    const calcPerimBall = document.getElementById('calcPerimBall');
    const calcLengthOfSegment = document.getElementById('calcLengthOfSegment');

    const drawHilbertCircumcenter = document.getElementById('drawHilbertCircumcenter');
    const drawHilbertCircumcenterBisectors = document.getElementById('drawHilbertCircumcenterBisectors');
    const drawHMERB = document.getElementById('drawMERB');

    // Hide context menu on any click
    document.addEventListener('click', () => {
        contextMenu.style.display = 'none';
    });

    siteManager.canvas.canvas.addEventListener('contextmenu', (event) => {
        if (siteManager.checkThreeSitesSelected()) {

            event.preventDefault();
            const { clientX: mouseX, clientY: mouseY } = event;
            contextMenu.style.top = `${mouseY}px`;
            contextMenu.style.left = `${mouseX}px`;
            contextMenu.style.display = 'block';

            drawSegmentItem.style.display = 'none';
            drawBisector.style.display = 'none';
            drawZRegion.style.display = 'none';
            calcPerimBall.style.display = 'none';
            calcLengthOfSegment.style.display = 'none';
            saveHilbertDistanceItem.style.display = 'none';
            calculateHilbertDistanceItem.style.display = 'none';
            drawHMERB.style.display = 'none';
            
            drawHilbertCircumcenter.style.display = 'block';
            drawHilbertCircumcenterBisectors.style.display = 'block';

        } else if (siteManager.checkTwoSitesSelected()) {

            event.preventDefault();
            const { clientX: mouseX, clientY: mouseY } = event;
            contextMenu.style.top = `${mouseY}px`;
            contextMenu.style.left = `${mouseX}px`;
            contextMenu.style.display = 'block';

            if (siteManager.canvas.activeManager === 'HilbertDistanceManager') {
                saveHilbertDistanceItem.style.display = 'block';
                calculateHilbertDistanceItem.style.display = 'block';
            } else {
                calculateHilbertDistanceItem.style.display = 'block';
                saveHilbertDistanceItem.style.display = 'none';
            }

            drawSegmentItem.style.display = 'block';
            drawBisector.style.display = 'block';
            drawZRegion.style.display = 'block';
            calcPerimBall.style.display = 'none';
            calcLengthOfSegment.style.display = 'none';
            drawHilbertCircumcenter.style.display = 'none';
            drawHilbertCircumcenterBisectors.style.display = 'none';
            drawHMERB.style.display = 'none';

        } else if (siteManager.checkOneSiteSelected()) {

            const site = siteManager.getSiteSelected();
            if (site instanceof HilbertBall) {
                event.preventDefault();
                const { clientX: mouseX, clientY: mouseY } = event;
                contextMenu.style.top = `${mouseY}px`;
                contextMenu.style.left = `${mouseX}px`;
                contextMenu.style.display = 'block';

                calcPerimBall.style.display = 'block';
                calculateHilbertDistanceItem.style.display = 'none';
                saveHilbertDistanceItem.style.display = 'none';
                drawSegmentItem.style.display = 'none';
                drawBisector.style.display = 'none';
                calcLengthOfSegment.style.display = 'none';
                drawZRegion.style.display = 'none';
                drawHilbertCircumcenter.style.display = 'none';
                drawHilbertCircumcenterBisectors.style.display = 'none';
                drawHMERB.style.display = 'none';
            }
            
        } else if (siteManager.checkOneSegmentSelected()) {
            event.preventDefault();
            const { clientX: mouseX, clientY: mouseY } = event;
            contextMenu.style.top = `${mouseY}px`;
            contextMenu.style.left = `${mouseX}px`;
            contextMenu.style.display = 'block';

            calcPerimBall.style.display = 'none';
            calculateHilbertDistanceItem.style.display = 'none';
            saveHilbertDistanceItem.style.display = 'none';
            drawSegmentItem.style.display = 'none';
            drawBisector.style.display = 'none';
            calcLengthOfSegment.style.display = 'block';
            drawZRegion.style.display = 'none';
            drawHilbertCircumcenter.style.display = 'none';
            drawHilbertCircumcenterBisectors.style.display = 'none';
            drawHMERB.style.display = 'none';

        } else if (siteManager.checkAnySelected()) {
            event.preventDefault();
            const { clientX: mouseX, clientY: mouseY } = event;
            contextMenu.style.top = `${mouseY}px`;
            contextMenu.style.left = `${mouseX}px`;
            contextMenu.style.display = 'block';

            calcPerimBall.style.display = 'none';
            calculateHilbertDistanceItem.style.display = 'none';
            saveHilbertDistanceItem.style.display = 'none';
            drawSegmentItem.style.display = 'none';
            drawBisector.style.display = 'none';
            calcLengthOfSegment.style.display = 'none';
            drawZRegion.style.display = 'none';
            drawHilbertCircumcenter.style.display = 'none';
            drawHilbertCircumcenterBisectors.style.display = 'none';
            drawHMERB.style.display = 'block';
        } else {
            contextMenu.style.display = 'none';
        }
    });

    if (!calculateHilbertDistanceItem.dataset.initialized) {

        calcLengthOfSegment.addEventListener('click', () => {
            const segment = siteManager.getSelectedSegment();
            console.log("Length:", hilbertDistance(segment.start, segment.end, siteManager.canvas.polygon));
        });

        calculateHilbertDistanceItem.addEventListener('click', () => {
            console.log('Calculate Hilbert Distance selected');
            console.log(siteManager.getSelectedSites());
            const selectedSites = siteManager.getSelectedSites();

            if (selectedSites.length === 2) {
                siteManager.hilbertDistanceManager.onTwoSitesSelected(selectedSites);
            }
            contextMenu.style.display = 'none';
        });

        calcPerimBall.addEventListener('click', () => {

            const ball = siteManager.getSiteSelected();

            if (ball && ball instanceof HilbertBall) {
                let perim = ball.computePerimeter_(siteManager.canvas.polygon);
                console.log('Perimeter: ', perim);

                let maxL = ball.calculateMaximumSideLength(siteManager.canvas.polygon);
                console.log('Maximum Side Length: ', maxL);
            }

            contextMenu.style.display = 'none';
        });

        saveHilbertDistanceItem.addEventListener('click', () => {
            console.log('Save Hilbert Distance selected');
            const selectedSites = siteManager.getSelectedSites();
            if (selectedSites.length === 2) {
                siteManager.hilbertDistanceManager.addSavedDistance(selectedSites);
            }
            contextMenu.style.display = 'none';
        });

        drawSegmentItem.addEventListener('click', () => {
            console.log('Draw Segment selected');
            siteManager.drawSegment();
            contextMenu.style.display = 'none';
        });

        drawBisector.addEventListener('click', () => {
            console.log('Draw Bisector Selected');
            const selectedSites = siteManager.getSelectedSites();
            siteManager.hilbertDistanceManager.ensureLabels(selectedSites);
            if (selectedSites.length === 2) {
                siteManager.bisectorManager.createBisector(selectedSites[0], selectedSites[1]);
            }
            contextMenu.style.display = 'none';
        });

        drawZRegion.addEventListener('click', () => {
            console.log('Draw ZRegion Selected');
            const selectedSites = siteManager.getSelectedSites();
            siteManager.hilbertDistanceManager.ensureLabels(selectedSites);
            if (selectedSites.length === 2) {
                siteManager.zRegionManager.createZRegion(selectedSites[0], selectedSites[1]);
            }
            contextMenu.style.display = 'none';
        });

        drawHilbertCircumcenter.addEventListener('click', () => {
            const selectedSites = siteManager.getSelectedSites();
            siteManager.hilbertDistanceManager.ensureLabels(selectedSites);
            if (selectedSites.length === 3) {
                let circumcenter;
                let attempts = 0;
                const maxAttempts = 10;
                const adjustmentAmount = 0.1;
        
                while (!circumcenter && attempts < maxAttempts) {
                    try {
                        circumcenter = findHilbertCircumCenter(
                            selectedSites[0], 
                            selectedSites[1], 
                            selectedSites[2], 
                            siteManager.canvas.polygon
                        );
                    } catch (error) {
                        // Move the points slightly and try again
                        selectedSites.forEach(site => {
                            site.x += (Math.random() - 0.5) * adjustmentAmount;
                            site.y += (Math.random() - 0.5) * adjustmentAmount;
                        });
                        attempts++;
                    }
                }
        
                if (circumcenter) {
                    circumcenter.drawWithRing(siteManager.canvas.ctx);
                } else {
                    console.error("Failed to find a valid Hilbert circumcenter after multiple attempts");
                }
            }
            contextMenu.style.display = 'none';
        });

        drawHilbertCircumcenterBisectors.addEventListener('click', () => {
            const selectedSites = siteManager.getSelectedSites();
            siteManager.hilbertDistanceManager.ensureLabels(selectedSites);
            if (selectedSites.length === 3) {
                let circumcenter;

                try {
                    circumcenter = findHilbertCircumCenter(
                        selectedSites[0], 
                        selectedSites[1], 
                        selectedSites[2], 
                        siteManager.canvas.polygon
                    );
                } catch (error) {
                    selectedSites.forEach(site => {
                        site.x += (Math.random() - 0.5) * adjustmentAmount;
                        site.y += (Math.random() - 0.5) * adjustmentAmount;
                    });
                    circumcenter = findHilbertCircumCenter(
                        selectedSites[0], 
                        selectedSites[1], 
                        selectedSites[2], 
                        siteManager.canvas.polygon
                    );
                }
        
                if (circumcenter) {
                    circumcenter.drawWithRing(siteManager.canvas.ctx);
                } else {
                    console.error("Failed to find a valid Hilbert circumcenter after multiple attempts");
                }

                drawBisectorsOfHilbertCircumcenter(
                    selectedSites[0], 
                    selectedSites[1], 
                    selectedSites[2], 
                    siteManager.canvas.polygon, 
                    siteManager.canvas.ctx
                );
            }
            contextMenu.style.display = 'none';
        });

        drawHMERB.addEventListener('click', () => {
            const selectedSites = siteManager.getSelectedSites();
            siteManager.hilbertDistanceManager.ensureLabels(selectedSites);
            if (selectedSites.length > 1) {
                drawHilbertMinimumEnclosingRadiusBall(selectedSites, siteManager.canvas.polygon, siteManager.canvas.ctx);
            }
            contextMenu.style.display = 'none';
        });

        calculateHilbertDistanceItem.dataset.initialized = true;
        saveHilbertDistanceItem.dataset.initialized = true;
        drawSegmentItem.dataset.initialized = true;
        drawBisector.dataset.initialized = true;
        calcPerimBall.dataset.initialized = true;
        drawZRegion.dataset.initialized = true;
        drawHilbertCircumcenter.initialized = true;
        drawHilbertCircumcenterBisectors.initialized = true;
    }
}