import { initProperties as initSiteProperties } from "../site/site-events.js";
import { HilbertBall } from "../../default-objects.js";

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

export function initMouseActions(hilbertBallManager) {
    const events = ['mousedown', 'mousemove', 'mouseup', 'click'];
    const handlers = {
        mousedown: (event) => hilbertBallManager.startDragging(event),
        mousemove: (event) => hilbertBallManager.dragSite(event),
        mouseup: () => hilbertBallManager.stopDragging(),
        click: (event) => {
            if (event.shiftKey) {
                hilbertBallManager.selectHilbertBall(event, true);
            } else {
                hilbertBallManager.selectHilbertBall(event);
            }
        }
    };

    events.forEach(eventType => {
        hilbertBallManager.canvas.canvas.addEventListener(eventType, (event) => {
            if (hilbertBallManager.active) handlers[eventType](event);
        });
    });
}

function getChangedHilbertBallProperties() {
    const changedProperties = {};
    const siteColor = document.getElementById('siteColor');
    const siteShowInfo = document.getElementById('siteShowInfo');
    const siteDrawSpokes = document.getElementById('siteDrawSpokes');
    const labelInput = document.getElementById('labelInput');
    const radiusInput = document.getElementById('radiusInput');
    const ballColorInput = document.getElementById('ballColor');
    const ballShowPolarBody = document.getElementById('ballShowPolarBody');
    const ballShowSideLines = document.getElementById('ballShowSideLines');

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
    if (radiusInput.value !== radiusInput.defaultValue) {
        changedProperties.ballRadius = true;
    }
    if (ballColorInput.value !== ballColorInput.defaultValue) {
        changedProperties.boundaryColor = true;
    }
    if (ballShowPolarBody.checked !== ballShowPolarBody.defaultChecked) {
        changedProperties.showPolarBody = true;
    }
    if (ballShowSideLines.checked !== ballShowSideLines.defaultChecked) {
        changedProperties.showSideLines = true;
    }
    
    return changedProperties;
}

function assignHilbertBallProperties(manager) {
    const changedProperties = getChangedHilbertBallProperties();

    manager.canvas.sites.forEach(site => {
        if (site.selected && site instanceof HilbertBall) {
            if (changedProperties.color) {
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
            if (changedProperties.ballRadius) {
                site.setBallRadius(parseFloat(document.getElementById('radiusInput').value));
                document.getElementById('radiusInput').defaultValue = site.ballRadius; // Update default value
            }
            if (changedProperties.boundaryColor) {
                site.setBoundaryColor(document.getElementById('ballColor').value);
                document.getElementById('ballColor').defaultValue = site.boundaryColor; // Update default value
            }
            if (changedProperties.showPolarBody) {
                site.setShowPolarBody(document.getElementById('ballShowPolarBody').checked);
                document.getElementById('ballShowPolarBody').defaultChecked = site.showPolarBody; // Update default value
            }
            if (changedProperties.showSideLines) {
                site.setShowSideLines(document.getElementById('ballShowSideLines').checked);
                document.getElementById('ballShowSideLines').defaultChecked = site.showSideLines; // Update default value
            }
        }
    });

    manager.drawAll();
}

export function initProperties(hilbertBallManager) {
    initSiteProperties(hilbertBallManager);

    const debouncedAssignHilbertBallProperties = debounce(() => assignHilbertBallProperties(hilbertBallManager), 0);

    const radiusSlider = document.getElementById('radius');
    const radiusInput = document.getElementById('radiusInput');
    const ballColorInput = document.getElementById('ballColor');
    const resetIcon = document.getElementById('resetRadius');
    const ballShowPolarBody = document.getElementById('ballShowPolarBody');
    const ballShowSideLines = document.getElementById('ballShowSideLines');

    radiusSlider.addEventListener('input', (event) => {
        radiusInput.value = event.target.value;
        debouncedAssignHilbertBallProperties();
    });

    radiusInput.addEventListener('input', (event) => {
        radiusSlider.value = event.target.value;
        debouncedAssignHilbertBallProperties();
    });

    ballColorInput.addEventListener('input', (event) => {
        debouncedAssignHilbertBallProperties();
    });

    ballShowPolarBody.addEventListener('input', (event) => {
        debouncedAssignHilbertBallProperties();
    });

    ballShowSideLines.addEventListener('input', (event) => {
        debouncedAssignHilbertBallProperties();
    });

    resetIcon.addEventListener('click', () => {
        radiusSlider.value = 1;
        radiusInput.value = 1;
        debouncedAssignHilbertBallProperties();
    });
}

export function initShortcuts(hilbertBallManager) {
    document.addEventListener('keydown', (event) => {
        if (hilbertBallManager.active) {
            if (event.key === 'Delete' || event.key === 'Backspace') {
                hilbertBallManager.removeSite();
            }
        }
    });

    const radiusInput = document.getElementById('radiusInput');
    radiusInput.addEventListener('keydown', function(event) {
        if (event.key === 'Delete' || event.key === 'Backspace' || event.key === 't') {
            event.stopPropagation();
        }
    });
}