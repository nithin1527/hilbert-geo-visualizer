import { Canvas } from "../canvas/canvas.js";
import { SiteManager } from "../site/site.js";
import { HilbertBallManager } from "../hilbert-ball/hilbert-ball.js";
import { BisectorManager } from "../bisector/bisector.js";
import { HilbertDistanceManager } from "../hilbert-distance/hilbert-distance.js";
import { 
    initializeDropdowns, 
    initializeAddSiteListener, 
    initializeInsertSiteListeners, 
    initCollapsibleAnimation,
} from "./scripts-events.js";
import { initializeJsonHandlers, isAnyModalOpen } from "./scripts-json-events.js";
import { ZRegionManager } from "../z-region/z-region.js";

// Create and initialize the Canvas object
let canvasElement = document.getElementById('canvas');
let canvas = new Canvas(canvasElement);

let hilbertDistanceManager = new HilbertDistanceManager(canvas);
let bisectorManager = new BisectorManager(canvas);
let zRegionManager = new ZRegionManager(canvas);
let siteManager = new SiteManager(canvas, hilbertDistanceManager, bisectorManager, zRegionManager);

canvas.setHilbertDistanceManager(hilbertDistanceManager);
bisectorManager.setSiteManager(siteManager);
zRegionManager.setSiteManager(siteManager);

let managers = [
    new HilbertBallManager(canvas, hilbertDistanceManager, bisectorManager, zRegionManager),
    siteManager,
    hilbertDistanceManager,
    bisectorManager,
    zRegionManager
];

document.addEventListener('DOMContentLoaded', () => {
    initializeDropdowns(managers, canvas.mode, canvas);
    initCollapsibleAnimation();
    initializeAddSiteListener(canvasElement, managers, canvas);
    initializeInsertSiteListeners(managers);
    initializeJsonHandlers(canvas, hilbertDistanceManager, managers);
});